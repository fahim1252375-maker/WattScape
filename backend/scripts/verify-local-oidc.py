#!/usr/bin/env python3
"""Acquire real Keycloak-signed local tokens and exercise the running API without printing tokens."""
from pathlib import Path
import base64
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / "backend" / ".env"
if not ENV_FILE.is_file():
    raise SystemExit("backend/.env is missing; run backend/scripts/create-local-env.sh first")
ENV = {}
for line in ENV_FILE.read_text().splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        key, value = line.split("=", 1)
        ENV[key] = value
ISSUER = ENV["JWT_ISSUER_URI"].rstrip("/")
SMOKE_CLIENT_ID = ENV.get("WATSCAPE_SMOKE_CLIENT_ID", "wattscape-local-smoke")
API = "http://localhost:" + ENV.get("PORT", "8080")
REALM = ISSUER.rsplit("/realms/", 1)[-1]
if urllib.parse.urlparse(ISSUER).hostname not in {"localhost", "127.0.0.1", "::1"} or REALM != "wattscape-local":
    raise SystemExit("STOP: this OIDC smoke test only supports the local wattscape-local Keycloak realm")


def get_json(url, headers=None, data=None):
    request = urllib.request.Request(url, headers=headers or {}, data=data)
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return response.status, response.headers, response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.headers, exc.read()


def expect_status(label, actual, expected):
    if actual != expected:
        raise SystemExit(f"FAIL {label}: expected HTTP {expected}, got {actual}")
    print(f"PASS {label}: HTTP {actual}")


status, _, body = get_json(ISSUER + "/.well-known/openid-configuration")
expect_status("OIDC discovery", status, 200)
discovery = json.loads(body)
if discovery.get("issuer") != ISSUER:
    raise SystemExit(f"FAIL discovery issuer mismatch: {discovery.get('issuer')}")
if not discovery.get("jwks_uri", "").endswith("/protocol/openid-connect/certs"):
    raise SystemExit("FAIL discovery did not publish a Keycloak JWKS URI")
print("PASS OIDC issuer and JWKS metadata")


def token(username, password):
    form = urllib.parse.urlencode({"grant_type": "password", "client_id": SMOKE_CLIENT_ID, "username": username, "password": password}).encode()
    status, _, body = get_json(ISSUER + "/protocol/openid-connect/token", {"Content-Type": "application/x-www-form-urlencoded"}, form)
    if status != 200:
        try:
            detail = json.loads(body).get("error_description", "token endpoint rejected request")
        except (ValueError, AttributeError):
            detail = "token endpoint rejected request"
        raise SystemExit(f"FAIL OIDC token for {username}: HTTP {status}: {detail}")
    expect_status(f"OIDC token for {username}", status, 200)
    token_data = json.loads(body)
    access_token = token_data["access_token"]
    payload = access_token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload))
    audiences = claims.get("aud", [])
    if isinstance(audiences, str):
        audiences = [audiences]
    if claims.get("iss") != ISSUER or ENV["JWT_AUDIENCE"] not in audiences:
        raise SystemExit(f"FAIL issuer/audience claim validation precheck for {username}")
    if not claims.get(ENV["JWT_ORGANIZATION_CLAIM"], ""):
        raise SystemExit(f"FAIL missing organization claim for {username}")
    return access_token


def api(method, path, access_token=None, obj=None):
    headers = {"Accept": "application/json"}
    data = None
    if obj is not None:
        data = json.dumps(obj).encode()
        headers["Content-Type"] = "application/json"
    if access_token:
        headers["Authorization"] = "Bearer " + access_token
    return get_json(API + path, headers, data)

status, _, body = api("GET", "/actuator/health/readiness")
expect_status("Spring readiness", status, 200)
if json.loads(body).get("status") != "UP":
    raise SystemExit("FAIL Spring readiness is not UP")
status, _, _ = api("GET", "/swagger-ui/index.html")
if status not in (200, 302):
    raise SystemExit(f"FAIL Swagger UI: HTTP {status}")
print(f"PASS Swagger UI: HTTP {status}")
status, _, _ = api("GET", "/api/v1/me")
expect_status("Unauthenticated API", status, 401)

admin = token(ENV["WATSCAPE_ADMIN_USERNAME"], ENV["WATSCAPE_ADMIN_PASSWORD"])
member = token(ENV["WATSCAPE_MEMBER_USERNAME"], ENV["WATSCAPE_MEMBER_PASSWORD"])
other = token("local-other-admin", ENV["WATSCAPE_ADMIN_PASSWORD"])
for label, jwt_value in (("ADMIN identity", admin), ("MEMBER identity", member), ("other-tenant ADMIN", other)):
    payload = jwt_value.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    claims = json.loads(base64.urlsafe_b64decode(payload))
    print(f"PASS {label} signed token has role(s): {','.join(claims.get('realm_access', {}).get('roles', []))}")

status, _, body = api("GET", "/api/v1/me", admin)
expect_status("ADMIN secured API", status, 200)
admin_me = json.loads(body)
status, _, _ = api("GET", "/api/v1/me", member)
expect_status("MEMBER read access", status, 200)

status, _, _ = api("POST", "/api/v1/sites", member, {"name":"Forbidden Member Site","code":"FORBIDDEN","timeZone":"UTC"})
expect_status("MEMBER write denied", status, 403)

cross_tenant_site = "/api/v1/sites/40000000-0000-4000-8000-000000000001/twin"
status, _, _ = api("GET", cross_tenant_site, admin)
expect_status("Cross-tenant site hidden", status, 404)
status, _, _ = api("GET", cross_tenant_site, other)
expect_status("Other tenant may read own site", status, 200)

status, _, body = api("GET", "/api/v1/sites", admin)
expect_status("ADMIN site persistence read", status, 200)
sites = json.loads(body)
code = "LOCAL-RUNTIME-01"
if not any(site["code"] == code for site in sites):
    status, _, body = api("POST", "/api/v1/sites", admin, {"name":"Local Runtime Verification","code":code,"timeZone":"UTC","areaSqm":100,"initialBuildingName":"Runtime Building"})
    expect_status("ADMIN persisted site write", status, 201)
else:
    print("PASS ADMIN persisted site write: existing local verification row reused")
status, _, body = api("GET", "/api/v1/sites", admin)
expect_status("Persisted site readback", status, 200)
if not any(site["code"] == code for site in json.loads(body)):
    raise SystemExit("FAIL created site not found on subsequent database read")
print(f"PASS tenant claim maps to active membership for subject {admin_me['subject']}")
print("Local OIDC/API checks completed. Access tokens were not printed or saved.")
