#!/usr/bin/env python3
"""Run safe, tenant-scoped Phase 4 API and PostgreSQL smoke checks locally.

The script reads backend/.env without printing credentials or access tokens.
It creates clearly labelled synthetic records in the supplied local site:
  * one test room + active spatial mapping
  * one telemetry device + two readings (the device is revoked afterwards)
  * one completed work order
  * one effective-dated synthetic energy factor

No production AI provider request is made unless WATSCAPE_SMOKE_ALLOW_AI=true.
A local PostgreSQL backup is created before any writes.
"""
from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / "backend" / ".env"
UUID_RE = re.compile(r"^[0-9a-fA-F-]{36}$")


def load_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise SystemExit("STOP: backend/.env is missing. Run backend/scripts/create-local-env.sh first.")
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("'\"")
    return values


ENV = load_env(ENV_FILE)
ISSUER = ENV.get("JWT_ISSUER_URI", "").rstrip("/")
SMOKE_CLIENT_ID = ENV.get("WATSCAPE_SMOKE_CLIENT_ID", "wattscape-local-smoke")
API_BASE = f"http://localhost:{ENV.get('PORT', '8080')}"
FRONTEND_BASE = os.environ.get("WATSCAPE_FRONTEND_URL", "http://localhost:3000")
_issuer_parts = urllib.parse.urlparse(ISSUER)
if _issuer_parts.hostname not in {"localhost", "127.0.0.1", "::1"} or _issuer_parts.path != "/realms/wattscape-local":
    raise SystemExit("STOP: this password-grant smoke script is restricted to the local wattscape-local realm")


def require_uuid(value: str, label: str) -> str:
    if not UUID_RE.match(value):
        raise SystemExit(f"STOP: {label} must be a UUID.")
    return value


def get_response(url: str, method: str = "GET", headers: dict[str, str] | None = None,
                 payload: dict[str, Any] | None = None) -> tuple[int, bytes]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request_headers = {"Accept": "application/json", **(headers or {})}
    if payload is not None:
        request_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read()
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError(f"Could not reach {url.split('/')[2]}: {type(exc).__name__}") from exc


def decode_json(body: bytes, label: str) -> Any:
    try:
        return json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise RuntimeError(f"{label}: response was not valid JSON") from exc


def api(method: str, path: str, access_token: str | None = None,
        payload: dict[str, Any] | None = None) -> tuple[int, bytes]:
    headers = {"Authorization": f"Bearer {access_token}"} if access_token else {}
    return get_response(API_BASE + path, method, headers, payload)


def expect(label: str, actual: int, expected: int) -> None:
    if actual != expected:
        raise RuntimeError(f"FAIL {label}: expected HTTP {expected}, received HTTP {actual}")
    print(f"PASS {label}: HTTP {actual}")


def get_token(username: str, password: str) -> str:
    form = urllib.parse.urlencode({
        "grant_type": "password",
        "client_id": SMOKE_CLIENT_ID,
        "username": username,
        "password": password,
    }).encode("utf-8")
    # Form requests need form-encoded bytes rather than JSON.
    request = urllib.request.Request(
        ISSUER + "/protocol/openid-connect/token",
        data=form,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            status, body = response.status, response.read()
    except urllib.error.HTTPError as exc:
        status, body = exc.code, exc.read()
    if status != 200:
        raise RuntimeError(f"FAIL OIDC login for configured local account {username}: HTTP {status}; credentials were not printed")
    token_data = decode_json(body, "OIDC token")
    access_token = token_data.get("access_token")
    if not isinstance(access_token, str) or access_token.count(".") != 2:
        raise RuntimeError(f"FAIL OIDC login for {username}: no JWT access token returned")
    payload_part = access_token.split(".")[1]
    payload_part += "=" * (-len(payload_part) % 4)
    claims = decode_json(base64.urlsafe_b64decode(payload_part), "JWT claims")
    audiences = claims.get("aud", [])
    if isinstance(audiences, str):
        audiences = [audiences]
    if claims.get("iss") != ISSUER or ENV.get("JWT_AUDIENCE") not in audiences:
        raise RuntimeError(f"FAIL OIDC claims precheck for {username}: issuer/audience mismatch")
    org_claim = ENV.get("JWT_ORGANIZATION_CLAIM", "organization_id")
    if not claims.get(org_claim):
        raise RuntimeError(f"FAIL OIDC claims precheck for {username}: organization claim missing")
    print(f"PASS OIDC token acquired and claims checked for {username}; token not printed or saved")
    return access_token


def docker_psql(sql: str) -> str:
    user = ENV.get("POSTGRES_USER", "wattscape")
    database = ENV.get("POSTGRES_DB", "wattscape")
    command = [
        "docker", "compose", "--env-file", "backend/.env", "exec", "-T", "postgres",
        "psql", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database, "-At", "-c", sql,
    ]
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True, check=False)
    if result.returncode != 0:
        raise RuntimeError("PostgreSQL readback failed. Confirm Docker Compose and PostgreSQL are running.")
    return result.stdout.strip()


def db_expect(label: str, sql: str, expected: str = "1") -> None:
    actual = docker_psql(sql)
    if actual != expected:
        raise RuntimeError(f"FAIL PostgreSQL {label}: expected {expected}, got {actual or '<empty>'}")
    print(f"PASS PostgreSQL persistence: {label}")


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python3 backend/scripts/verify-phase4-smoke.py <SITE_UUID> <FLOOR_UUID>")
        return 2

    site_id = require_uuid(sys.argv[1], "SITE_UUID")
    floor_id = require_uuid(sys.argv[2], "FLOOR_UUID")
    if not ISSUER:
        raise SystemExit("STOP: JWT_ISSUER_URI is missing from backend/.env")
    issuer_host = urllib.parse.urlparse(ISSUER).hostname
    if issuer_host not in {"localhost", "127.0.0.1", "::1"} or "/realms/wattscape-local" not in ISSUER:
        raise SystemExit("STOP: this smoke test only supports the local wattscape-local Keycloak realm")

    admin_user = ENV.get("WATSCAPE_ADMIN_USERNAME", "")
    admin_password = ENV.get("WATSCAPE_ADMIN_PASSWORD", "")
    member_user = ENV.get("WATSCAPE_MEMBER_USERNAME", "")
    member_password = ENV.get("WATSCAPE_MEMBER_PASSWORD", "")
    if not all((admin_user, admin_password, member_user, member_password)):
        raise SystemExit("STOP: local ADMIN/MEMBER credentials are not configured in backend/.env")

    admin = get_token(admin_user, admin_password)
    member = get_token(member_user, member_password)
    other_admin = get_token("local-other-admin", admin_password)

    status, body = get_response(API_BASE + "/actuator/health/readiness")
    expect("Spring readiness", status, 200)
    readiness = decode_json(body, "Spring readiness")
    if readiness.get("status") != "UP":
        raise RuntimeError("FAIL Spring readiness payload is not UP")

    status, body = api("GET", "/api/v1/sites", admin)
    expect("Authorized site list", status, 200)
    available_sites = decode_json(body, "Site list")
    selected_site = next((item for item in available_sites if item.get("id") == site_id), None)
    if not selected_site or selected_site.get("name") != "Local Runtime Verification":
        raise RuntimeError("STOP: target site is not the known 'Local Runtime Verification' QA site; no writes attempted")
    print("PASS write-safety guard: target is Local Runtime Verification QA site")

    # Frontend server availability is a transport check, not a browser/OIDC E2E test.
    try:
        status, _ = get_response(FRONTEND_BASE)
        expect("Frontend server responds (HTTP shell only)", status, 200)
    except RuntimeError:
        print("WARN frontend dev server is not reachable; backend/API checks will continue")

    floor_base = f"/api/v1/sites/{site_id}/floors/{floor_id}"
    status, body = api("GET", floor_base + "/plan", admin)
    expect("Active floor plan available", status, 200)
    plan = decode_json(body, "Floor plan")
    if plan.get("floorId") != floor_id or plan.get("active") is not True:
        raise RuntimeError("FAIL floor plan does not match the requested floor or is not active")

    # Back up before the script creates any QA records.
    backup = subprocess.run(["bash", "backend/scripts/backup-local-postgres.sh"], cwd=ROOT,
                            text=True, capture_output=True, check=False)
    if backup.returncode != 0:
        print(backup.stderr.strip() or backup.stdout.strip())
        raise SystemExit("STOP: Database backup did not complete; no smoke-test writes were attempted.")
    print("PASS pre-test local PostgreSQL backup created (backup remains local; encrypt before off-device storage)")

    run_id = uuid.uuid4().hex[:10]
    room_code = "QA" + run_id.upper()
    room_payload = {
        "floorId": floor_id,
        "code": room_code,
        "name": f"Synthetic QA Room {run_id}",
        "zoneType": "office",
        "areaSqm": 12.0,
    }
    status, body = api("POST", f"/api/v1/sites/{site_id}/rooms", admin, room_payload)
    expect("Synthetic QA room create", status, 201)
    room = decode_json(body, "Room create")
    room_id = require_uuid(room.get("id", ""), "created room id")
    if room.get("floorId") != floor_id or room.get("code") != room_code:
        raise RuntimeError("FAIL created room does not match the requested floor/code")
    status, body = api("GET", f"/api/v1/sites/{site_id}/rooms", admin)
    expect("Room list readback", status, 200)
    if not any(item.get("id") == room_id for item in decode_json(body, "Room list")):
        raise RuntimeError("FAIL created room is absent from API readback")

    geometry = {"type": "Polygon", "coordinates": [[[0, 0], [4, 0], [4, 3], [0, 3], [0, 0]]]}
    spatial_path = floor_base + f"/spatial-elements/room/{room_id}"
    spatial_payload = {"geometry": geometry, "positionX": 2, "positionY": 1.5,
                       "positionZ": 0, "rotationDegrees": 0, "expectedVersion": 0}
    status, body = api("PUT", spatial_path, admin, spatial_payload)
    expect("Spatial element create", status, 200)
    spatial = decode_json(body, "Spatial create")
    spatial_id = require_uuid(spatial.get("id", ""), "spatial element id")
    if spatial.get("roomId") != room_id or spatial.get("planRevision") != plan.get("revision") or spatial.get("version") != 1:
        raise RuntimeError("FAIL spatial element link/revision/version does not match")
    status, body = api("GET", floor_base + "/spatial-elements", admin)
    expect("Spatial element list readback", status, 200)
    if not any(item.get("id") == spatial_id for item in decode_json(body, "Spatial list")):
        raise RuntimeError("FAIL created spatial element is absent from API readback")
    status, body = api("GET", floor_base + f"/spatial-elements/{spatial_id}/versions", admin)
    expect("Spatial version history", status, 200)
    versions = decode_json(body, "Spatial history")
    if not any(item.get("version") == 1 and item.get("action") == "created" for item in versions):
        raise RuntimeError("FAIL spatial creation snapshot is missing")
    stale_payload = {**spatial_payload, "expectedVersion": 0}
    status, _ = api("PUT", spatial_path, admin, stale_payload)
    expect("Spatial optimistic-lock stale version rejection", status, 409)
    status, _ = api("PUT", spatial_path, member, {**spatial_payload, "expectedVersion": 1})
    expect("MEMBER cannot write spatial geometry", status, 403)
    status, _ = api("GET", floor_base + "/spatial-elements", other_admin)
    expect("Cross-tenant spatial read hidden", status, 404)
    db_expect("spatial element + immutable creation version", f"SELECT count(*) FROM spatial_elements WHERE id='{spatial_id}' AND site_id='{site_id}' AND floor_id='{floor_id}' AND lifecycle_state='active' AND version=1;\n".strip())
    db_expect("spatial element version snapshot", f"SELECT count(*) FROM spatial_element_versions WHERE spatial_element_id='{spatial_id}' AND version=1 AND action='created';")

    # Register a synthetic HTTPS device; its one-time secret is kept only in memory.
    external_id = "QA-" + run_id.upper()
    status, body = api("POST", f"/api/v1/sites/{site_id}/telemetry/devices", admin,
                       {"externalId": external_id, "displayName": f"Synthetic QA Device {run_id}", "protocol": "HTTPS"})
    expect("Telemetry device registration", status, 201)
    device = decode_json(body, "Device registration")
    device_id = require_uuid(device.get("id", ""), "device id")
    device_secret = device.get("ingestSecret")
    if not isinstance(device_secret, str) or len(device_secret) < 32:
        raise RuntimeError("FAIL device registration did not return a one-time device credential")

    observed_at = datetime.now(timezone.utc)
    observed_iso = observed_at.isoformat(timespec="microseconds").replace("+00:00", "Z")
    energy_event = "QA-ENERGY-" + run_id.upper()
    power_event = "QA-POWER-" + run_id.upper()
    measurements = [
        {"metricKey": "energy_kwh", "value": 1.25, "unit": "kWh", "quality": "good", "observedAt": observed_iso, "eventId": energy_event},
        {"metricKey": "power_kw", "value": 0.8, "unit": "kW", "quality": "good", "observedAt": observed_iso, "eventId": power_event},
    ]
    ingest_path = API_BASE + f"/api/v1/telemetry/ingest/{device_id}"
    device_headers = {"Authorization": f"Device {device_secret}"}
    status, body = get_response(ingest_path, "POST", device_headers, {"measurements": measurements})
    expect("Telemetry batch ingestion", status, 200)
    ingest = decode_json(body, "Telemetry ingest")
    if ingest.get("accepted") != 2 or ingest.get("duplicates") != 0:
        raise RuntimeError("FAIL first telemetry batch did not accept exactly two measurements")
    status, body = get_response(ingest_path, "POST", device_headers, {"measurements": measurements})
    expect("Telemetry idempotent retry", status, 200)
    duplicate = decode_json(body, "Telemetry idempotent retry")
    if duplicate.get("accepted") != 0 or duplicate.get("duplicates") != 2:
        raise RuntimeError("FAIL duplicate telemetry retry was not idempotently rejected")
    query = urllib.parse.urlencode({
        "metricKey": "energy_kwh",
        "from": (observed_at - timedelta(minutes=2)).isoformat().replace("+00:00", "Z"),
        "to": (observed_at + timedelta(minutes=2)).isoformat().replace("+00:00", "Z"),
        "limit": "100",
    })
    status, body = api("GET", f"/api/v1/sites/{site_id}/telemetry?{query}", admin)
    expect("Telemetry history API readback", status, 200)
    history = decode_json(body, "Telemetry history")
    if not any(point.get("deviceId") == device_id and point.get("metricKey") == "energy_kwh" for point in history):
        raise RuntimeError("FAIL ingested telemetry is absent from history API")
    status, _ = api("POST", f"/api/v1/sites/{site_id}/telemetry/devices/{device_id}/revoke", admin)
    expect("Telemetry device revocation", status, 204)
    status, _ = get_response(ingest_path, "POST", device_headers, {"measurements": measurements})
    expect("Revoked device credential rejected", status, 401)
    status, body = api("GET", f"/api/v1/sites/{site_id}/telemetry/devices", admin)
    expect("Telemetry device list readback", status, 200)
    listed_devices = decode_json(body, "Telemetry devices")
    if not any(item.get("id") == device_id and item.get("status") == "revoked" for item in listed_devices):
        raise RuntimeError("FAIL revoked device is not shown as revoked")
    db_expect("telemetry device revoked", f"SELECT count(*) FROM telemetry_devices WHERE id='{device_id}' AND site_id='{site_id}' AND status='revoked';")
    db_expect("two idempotent telemetry points persisted", f"SELECT count(*) FROM telemetry_points WHERE device_id='{device_id}' AND source_event_id IN ('{energy_event}','{power_event}');", "2")

    # Apply synthetic site factors only to the local verification site.
    effective_from = (observed_at - timedelta(minutes=2)).isoformat(timespec="microseconds").replace("+00:00", "Z")
    factor_payload = {"effectiveFrom": effective_from, "currency": "USD", "electricityCostPerKwh": 0.01,
                      "gridEmissionsKgPerKwh": 0.4, "waterCostPerM3": 0.5}
    status, body = api("POST", f"/api/v1/sites/{site_id}/analytics/energy/factors", admin, factor_payload)
    expect("Energy factor creation", status, 201)
    factor = decode_json(body, "Energy factor")
    if factor.get("currency") != "USD":
        raise RuntimeError("FAIL effective energy factor did not persist the expected currency")
    summary_query = urllib.parse.urlencode({
        "from": (observed_at - timedelta(minutes=2)).isoformat().replace("+00:00", "Z"),
        "to": (observed_at + timedelta(minutes=2)).isoformat().replace("+00:00", "Z"),
    })
    status, body = api("GET", f"/api/v1/sites/{site_id}/analytics/energy?{summary_query}", admin)
    expect("Energy analytics summary", status, 200)
    summary = decode_json(body, "Energy summary")
    if summary.get("energySamples", 0) < 1 or summary.get("energyKwh", 0) < 1.25:
        raise RuntimeError("FAIL analytics summary did not include the synthetic energy measurement")
    if summary.get("electricityCost") is None or summary.get("estimatedEmissionsKg") is None:
        raise RuntimeError("FAIL analytics tariff/emissions values are unavailable for the synthetic sample")
    print("PASS Energy analytics includes the synthetic interval sample and effective cost/emissions factors")
    status, _ = api("POST", f"/api/v1/sites/{site_id}/analytics/energy/factors", member, factor_payload)
    expect("MEMBER cannot change energy factors", status, 403)
    db_expect("effective-dated energy factor", f"SELECT count(*) FROM energy_factors WHERE site_id='{site_id}' AND effective_from='{effective_from}'::timestamptz AND currency='USD';")

    # Work-order lifecycle and append-only event history.
    order_title = f"Synthetic QA work order {run_id}"
    status, body = api("POST", f"/api/v1/sites/{site_id}/work-orders", admin,
                       {"title": order_title, "description": "Automated local Phase 4 smoke-test record; synthetic only.", "priority": "high"})
    expect("Work order create", status, 201)
    order = decode_json(body, "Work order create")
    order_id = require_uuid(order.get("id", ""), "work order id")
    order_version = int(order.get("version", 0))
    if order.get("status") != "open" or order_version < 1:
        raise RuntimeError("FAIL work order did not start in open state")
    for next_status in ("triaged", "in_progress", "completed"):
        status, body = api("PATCH", f"/api/v1/sites/{site_id}/work-orders/{order_id}", admin,
                           {"expectedVersion": order_version, "status": next_status})
        expect(f"Work order transition to {next_status}", status, 200)
        order = decode_json(body, "Work order update")
        order_version = int(order.get("version", 0))
        if order.get("status") != next_status:
            raise RuntimeError(f"FAIL work order did not transition to {next_status}")
    status, body = api("GET", f"/api/v1/sites/{site_id}/work-orders/{order_id}", admin)
    expect("Work order readback", status, 200)
    if decode_json(body, "Work order readback").get("status") != "completed":
        raise RuntimeError("FAIL completed work order is not visible on readback")
    status, body = api("GET", f"/api/v1/sites/{site_id}/work-orders/{order_id}/events", admin)
    expect("Work order event history", status, 200)
    events = decode_json(body, "Work order events")
    if len(events) < 4:
        raise RuntimeError("FAIL work order append-only lifecycle history is incomplete")
    status, _ = api("PATCH", f"/api/v1/sites/{site_id}/work-orders/{order_id}", admin,
                    {"expectedVersion": 1, "priority": "urgent"})
    expect("Work order optimistic-lock stale version rejection", status, 409)
    status, _ = api("POST", f"/api/v1/sites/{site_id}/work-orders", member,
                    {"title": f"Should be forbidden {run_id}", "priority": "low"})
    expect("MEMBER cannot create work orders", status, 403)
    status, _ = api("GET", f"/api/v1/sites/{site_id}/work-orders", other_admin)
    expect("Cross-tenant work-order list hidden", status, 404)
    db_expect("completed work order persisted", f"SELECT count(*) FROM work_orders WHERE id='{order_id}' AND site_id='{site_id}' AND status='completed' AND version>=4;")
    db_expect("work-order events persisted", f"SELECT count(*) FROM work_order_events WHERE work_order_id='{order_id}';", "4")

    # AI: verify disabled behaviour without contacting a provider, unless explicitly opted in.
    ai_payload = {"task": "energy_review", "question": "Review the synthetic local QA measurements."}
    ai_enabled = ENV.get("AI_ENABLED", "false").lower() == "true" and bool(ENV.get("AI_API_KEY", "").strip())
    allow_paid_ai = os.environ.get("WATSCAPE_SMOKE_ALLOW_AI", "").lower() == "true"
    ai_sql = ""
    if ai_enabled and not allow_paid_ai:
        print("SKIP live AI provider call: AI is configured and WATSCAPE_SMOKE_ALLOW_AI is not true (avoids an unapproved billable request)")
    elif ai_enabled and allow_paid_ai:
        status, body = api("POST", f"/api/v1/sites/{site_id}/ai/insights", admin, ai_payload)
        expect("Opt-in live AI insight request", status, 200)
        insight = decode_json(body, "AI insight")
        if not insight.get("insight"):
            raise RuntimeError("FAIL AI provider returned an empty insight")
        ai_sql = f"SELECT count(*) FROM ai_usage_events WHERE site_id='{site_id}' AND outcome='success' AND task='energy_review' AND created_at >= now() - interval '10 minutes';"
        db_expect("successful AI usage audit event", ai_sql)
    else:
        status, _ = api("POST", f"/api/v1/sites/{site_id}/ai/insights", admin, ai_payload)
        expect("AI disabled guard (no external provider call)", status, 503)
        ai_sql = f"SELECT count(*) FROM ai_usage_events WHERE site_id='{site_id}' AND outcome='disabled' AND task='energy_review' AND created_at >= now() - interval '10 minutes';"
        db_expect("AI disabled-attempt usage event", ai_sql)

    status, _ = api("GET", f"/api/v1/sites/{site_id}/telemetry/devices", other_admin)
    expect("Cross-tenant telemetry device list hidden", status, 404)
    status, _ = api("GET", f"/api/v1/sites/{site_id}/analytics/energy?{summary_query}", other_admin)
    expect("Cross-tenant analytics hidden", status, 404)
    status, _ = api("GET", floor_base + "/plan", other_admin)
    expect("Cross-tenant floor-plan hidden", status, 404)

    # Release-readiness checks that can be performed without a production account.
    compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    workflow_path = ROOT / ".github/workflows/ci.yml"
    workflow_exists = workflow_path.is_file()
    workflow_text = workflow_path.read_text(encoding="utf-8") if workflow_exists else ""
    backup_script_exists = (ROOT / "backend/scripts/backup-local-postgres.sh").is_file()
    loopback_bound = compose.count('"127.0.0.1:') >= 4
    ci_commands_present = all(command in workflow_text for command in (
        "mvn --batch-mode --no-transfer-progress verify",
        "bun install --frozen-lockfile", "bun run lint", "bun run test", "bun run build"))
    if workflow_exists and ci_commands_present:
        print("PASS CI workflow contains backend verify and frontend typecheck/test/build jobs (workflow run status still requires GitHub Actions)")
    elif workflow_exists:
        print("WARN CI workflow exists but one or more expected checks need review")
    if backup_script_exists:
        print("PASS local PostgreSQL backup helper exists")
    if loopback_bound:
        print("PASS local Compose services bind to loopback addresses")
    if 'start-dev' in compose:
        print("BLOCKED production: Keycloak Compose uses start-dev; replace with production Keycloak deployment settings")
    print("BLOCKED production: no production domain, TLS ingress, managed database/identity/secrets, production SMTP, monitoring, restore drill or deployed environment was supplied")
    print("NOTE: this is an API/DB smoke test, not a browser-driven E2E or penetration test")
    print("NOTE: synthetic QA room/mapping, telemetry points, completed work order and energy factor are intentionally retained on the local verification site")
    print("PHASE 4 LOCAL SMOKE TEST: PASSED (AI provider call may be skipped unless explicitly opted in)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError, KeyError, ValueError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
