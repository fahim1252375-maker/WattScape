#!/usr/bin/env python3
"""Safely configure an existing local WattScape Keycloak realm in place.

This script does not import/replace the realm, reset users, rotate passwords,
change organizations, or modify database state. It only updates the named
realm/client UI and OIDC-flow settings plus the existing required registration
terms execution. Prefer passing the existing Keycloak stack's backend/.env.
"""
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def read_env(path: Path) -> dict[str, str]:
    if not path.is_file():
        raise SystemExit(f"Environment file not found: {path}")
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.lstrip().startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def main() -> None:
    default_env = Path(__file__).resolve().parents[1] / ".env"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--env-file", type=Path, default=default_env,
                        help="existing Keycloak stack backend/.env (never printed)")
    parser.add_argument("--keycloak-url", default=None,
                        help="override KEYCLOAK_ADMIN_URL; local development only")
    parser.add_argument("--confirm-isolated-local-realm", choices=("wattscape-local",), required=True,
                        help="confirm the target is a dedicated, isolated local Keycloak realm (never a shared realm)")
    args = parser.parse_args()

    values = read_env(args.env_file.expanduser())
    base = (args.keycloak_url or values.get("KEYCLOAK_ADMIN_URL", "http://localhost:8081")).rstrip("/")
    parsed = urllib.parse.urlparse(base)
    if parsed.scheme != "https" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise SystemExit("Refusing to send administrator credentials to a non-local HTTP Keycloak URL; use HTTPS.")
    realm = values.get("KEYCLOAK_REALM", "wattscape-local")
    if realm != "wattscape-local" or args.confirm_isolated_local_realm != realm:
        raise SystemExit("Refusing to run: the env file and explicit confirmation must both target wattscape-local.")
    if parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise SystemExit("Refusing to run the local realm updater against a non-local Keycloak host.")
    username = values.get("KC_BOOTSTRAP_ADMIN_USERNAME", "")
    password = values.get("KC_BOOTSTRAP_ADMIN_PASSWORD", "")
    if not username or not password or "generate-local-secret" in password or "REPLACE_WITH_SECRET" in password:
        raise SystemExit("The selected env file must contain the existing Keycloak admin username/password. Values are never printed.")

    credentials = urllib.parse.urlencode({
        "grant_type": "password", "client_id": "admin-cli",
        "username": username, "password": password,
    }).encode()
    token_request = urllib.request.Request(
        base + "/realms/master/protocol/openid-connect/token", data=credentials,
        headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(token_request, timeout=20) as response:
            token = json.loads(response.read())["access_token"]
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Keycloak admin authentication failed (HTTP {error.code}); verify the selected env file and realm admin account.") from None

    root = "/admin/realms/" + urllib.parse.quote(realm, safe="")
    headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}

    def call(path: str, method: str = "GET", payload=None):
        body = None if payload is None else json.dumps(payload).encode()
        request = urllib.request.Request(base + path, data=body, headers=headers, method=method)
        with urllib.request.urlopen(request, timeout=20) as response:
            content = response.read()
            return response.status, content

    # Preflight the existing required-action and registration execution before
    # writing any realm/client configuration, avoiding a partial update when
    # this local Keycloak lacks the expected terms flow.
    actions_path = root + "/authentication/required-actions"
    _, raw = call(actions_path)
    action = next((item for item in json.loads(raw) if item.get("alias") == "TERMS_AND_CONDITIONS"), None)
    if action is None:
        raise SystemExit("The Keycloak Terms and Conditions required action is missing; no realm/client settings were changed.")
    executions_path = root + "/authentication/flows/registration/executions"
    _, raw = call(executions_path)
    execution = next((item for item in json.loads(raw) if item.get("providerId") == "registration-terms-and-conditions"), None)
    if execution is None:
        raise SystemExit("The registration Terms execution is missing; no realm/client settings were changed.")

    # Update the existing realm representation in place. Preserve every other
    # realm setting, user, credential, role, mapper, and organization attribute.
    _, raw = call(root)
    representation = json.loads(raw)
    representation.update({
        "displayName": "WattScape",
        "displayNameHtml": "<strong>WattScape</strong>",
        "registrationAllowed": True,
        "registrationEmailAsUsername": True,
        "loginWithEmailAllowed": True,
        "editUsernameAllowed": False,
        "resetPasswordAllowed": True,
        "rememberMe": True,
        "verifyEmail": True,
        "duplicateEmailsAllowed": False,
        "passwordPolicy": "length(12) and digits(1) and upperCase(1) and lowerCase(1) and specialChars(1)",
        "loginTheme": "wattscape-brand",
    })
    representation["smtpServer"] = {
        "host": values.get("KC_EMAIL_HOST", "mailpit"),
        "port": values.get("KC_EMAIL_PORT", "1025"),
        "from": values.get("SMTP_FROM", "no-reply@wattscape.local"),
        "fromDisplayName": "WattScape",
        "ssl": "false", "starttls": "false", "auth": "false",
    }
    call(root, "PUT", representation)

    # Keep the existing public client, callback routes, origins, and protocol
    # mappers. Enforce Authorization Code + PKCE only; disable the legacy
    # Resource Owner Password Credentials (Direct Access Grants) flow.
    _, raw = call(root + "/clients?clientId=" + urllib.parse.quote("wattscape-local", safe=""))
    clients = json.loads(raw)
    client = next((item for item in clients if item.get("clientId") == "wattscape-local"), None)
    if client is None:
        raise SystemExit("The expected wattscape-local OIDC client was not found; no client was created.")
    client["name"] = "WattScape Web"
    client["publicClient"] = True
    client["standardFlowEnabled"] = True
    client["implicitFlowEnabled"] = False
    client["directAccessGrantsEnabled"] = False
    client["serviceAccountsEnabled"] = False
    client.setdefault("attributes", {})["pkce.code.challenge.method"] = "S256"
    redirect_uris = list(client.get("redirectUris") or [])
    for uri in ("http://localhost:3000/auth/callback", "http://localhost:3000/auth/silent-callback"):
        if uri not in redirect_uris:
            redirect_uris.append(uri)
    client["redirectUris"] = redirect_uris
    origins = list(client.get("webOrigins") or [])
    if "http://localhost:3000" not in origins:
        origins.append("http://localhost:3000")
    client["webOrigins"] = origins
    client_id = client["id"]
    call(root + "/clients/" + urllib.parse.quote(client_id, safe=""), "PUT", client)

    # The existing local API smoke scripts use the OAuth password grant to obtain
    # tokens for synthetic ADMIN/MEMBER accounts. Keep that legacy test-only flow
    # on a separate local client; it is never part of the production realm or SPA.
    smoke_client_id = "wattscape-local-smoke"
    _, raw = call(root + "/clients?clientId=" + urllib.parse.quote(smoke_client_id, safe=""))
    smoke_matches = json.loads(raw)
    smoke_client = next((item for item in smoke_matches if item.get("clientId") == smoke_client_id), None)
    if smoke_client is None:
        smoke_client = {"clientId": smoke_client_id, "enabled": True, "protocol": "openid-connect"}
    smoke_client.update({
        "name": "WattScape Local Smoke Test Only",
        "description": "LOCAL ONLY. Used by repository smoke scripts; never configure this client in production.",
        "enabled": True,
        "protocol": "openid-connect",
        "publicClient": True,
        "standardFlowEnabled": False,
        "directAccessGrantsEnabled": True,
        "implicitFlowEnabled": False,
        "serviceAccountsEnabled": False,
        "redirectUris": [],
        "webOrigins": [],
        "fullScopeAllowed": True,
    })
    if smoke_matches:
        call(root + "/clients/" + urllib.parse.quote(smoke_client["id"], safe=""), "PUT", smoke_client)
    else:
        call(root + "/clients", "POST", smoke_client)

    # Make the existing Terms and Conditions acceptance part of registration.
    action.update({"enabled": True, "defaultAction": False})
    call(actions_path + "/TERMS_AND_CONDITIONS", "PUT", action)
    execution["requirement"] = "REQUIRED"
    call(executions_path, "PUT", execution)

    # Preserve the existing default MEMBER assignment. Do not change ADMIN users.
    roles = root + "/roles"
    _, raw = call(roles + "/MEMBER")
    member = json.loads(raw)
    _, raw = call(roles + "/default-roles-" + urllib.parse.quote(realm, safe="") + "/composites")
    composites = json.loads(raw)
    if not any(item.get("name") == "MEMBER" for item in composites):
        call(roles + "/default-roles-" + urllib.parse.quote(realm, safe="") + "/composites", "POST",
             [{"id": member["id"], "name": "MEMBER", "clientRole": False}])

    # Verify persisted display/theme, account recovery, email login and PKCE.
    _, raw = call(root)
    verified_realm = json.loads(raw)
    _, raw = call(root + "/clients/" + urllib.parse.quote(client_id, safe=""))
    verified_client = json.loads(raw)
    required_ok = (
        verified_realm.get("displayName") == "WattScape"
        and verified_realm.get("loginTheme") == "wattscape-brand"
        and verified_realm.get("registrationAllowed") is True
        and verified_realm.get("resetPasswordAllowed") is True
        and verified_realm.get("verifyEmail") is True
        and verified_realm.get("rememberMe") is True
        and verified_client.get("standardFlowEnabled") is True
        and verified_client.get("directAccessGrantsEnabled") is False
        and verified_client.get("implicitFlowEnabled") is False
        and verified_client.get("attributes", {}).get("pkce.code.challenge.method") == "S256"
    )
    _, raw = call(root + "/clients?clientId=" + urllib.parse.quote(smoke_client_id, safe=""))
    verified_smoke_matches = json.loads(raw)
    verified_smoke = next((item for item in verified_smoke_matches if item.get("clientId") == smoke_client_id), None)
    smoke_ok = bool(verified_smoke) and (
        verified_smoke.get("enabled") is True
        and verified_smoke.get("standardFlowEnabled") is False
        and verified_smoke.get("directAccessGrantsEnabled") is True
        and verified_smoke.get("implicitFlowEnabled") is False
        and not verified_smoke.get("redirectUris")
        and not verified_smoke.get("webOrigins")
    )
    if not required_ok or not smoke_ok:
        raise SystemExit("Keycloak did not persist all expected browser and local smoke-test client settings. Review the realm/client manually.")

    print("WattScape local realm updated and verified.")
    print("Theme: wattscape-brand | Realm display: WattScape | email login: enabled | registration: enabled | reset: enabled | email verification: required")
    print("Browser OIDC client: Authorization Code + PKCE S256 | Direct Access Grants: disabled | implicit flow: disabled")
    print("Separate local smoke client: Direct Access Grants enabled for local API smoke scripts only; no redirects or web origins")
    print("Existing users, credentials, organization claims, role assignments, and persistent Keycloak data were not replaced.")
    print("End-to-end login, registration, verification email, reset email and social brokers must still be browser-tested.")


if __name__ == "__main__":
    main()
