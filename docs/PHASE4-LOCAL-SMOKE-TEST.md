# WattScape Phase 4 — Local API and Database Smoke Test

This test is intended for the **local development environment only**. It was run on the user’s Mac on 2026-11-21 and reported `PHASE 4 LOCAL SMOKE TEST: PASSED`. See [the execution report](PHASE4-EXECUTION-REPORT-2026-11-21.md) for the reported checks and remaining release gates. It uses the configured `local-admin`, `local-member`, and `local-other-admin` Keycloak accounts and the existing `Local Runtime Verification` site. It refuses to create test records on any other site.

## Run

From the WattScape project root on the Mac, with Docker Desktop, PostgreSQL, Keycloak, the API, and (optionally) the Vite frontend already running:

```bash
python3 backend/scripts/verify-phase4-smoke.py \
  6b29e1bd-d56f-400c-8bf8-b07855605d82 \
  d2bbac2b-cc66-4371-88ca-0c6b02c64598
```

The script reads local credentials from `backend/.env`; **do not paste that file, passwords, JWTs, or device credentials into chat**. `WATSCAPE_SMOKE_CLIENT_ID` may override the default only for an isolated local test realm. Tokens and the one-time telemetry device secret remain in process memory and are not printed or saved.

Before its first write, the script runs `backend/scripts/backup-local-postgres.sh`. The backup is stored locally with restrictive permissions. It is not encrypted; do not upload or store it off-device until encrypted with an approved key.

## What is tested

1. API readiness and the configured QA site's identity.
2. Existing active floor plan belongs to the supplied floor.
3. Creation and API/database persistence of a clearly named synthetic room and a GeoJSON room polygon; spatial version history; stale-version conflict; MEMBER write denial; cross-tenant read concealment.
4. HTTPS telemetry device registration, two measurement ingestion, duplicate-event idempotency, history readback, revocation, rejected post-revocation ingestion, and database persistence.
5. Effective-dated synthetic energy factors and a telemetry-backed analytics summary; MEMBER factor-write denial; database persistence.
6. Work-order creation, `open → triaged → in_progress → completed` lifecycle, history, stale-version conflict, MEMBER write denial, cross-tenant read concealment, and database persistence.
7. AI disabled guard and usage-event persistence when AI is disabled. If a provider is configured, a live external AI call is skipped unless `WATSCAPE_SMOKE_ALLOW_AI=true` is explicitly set in the shell. Such a request may incur provider charges and sends the site's aggregate operational context and question to the configured provider.
8. Static release-readiness observations: CI workflow commands, local backup helper and loopback-only Compose bindings. The script does not deploy infrastructure or certify production readiness.

## Persistent synthetic records

The script intentionally retains its clearly labelled test room and active spatial mapping, telemetry points, completed work order, and effective-dated energy factor on `Local Runtime Verification` so the Live Phase 4 UI has persisted records to display. The test telemetry device is revoked after ingestion. Re-running the script creates another uniquely identified synthetic set.

## Limits

- A Vite HTTP 200 check only confirms the frontend shell is served; it is not a browser-driven OIDC journey or full UI end-to-end test.
- A disabled AI response is not proof of a live external model integration. A live model request requires explicit opt-in and a valid provider configuration.
- The production checks are static. Actual production deployment, TLS, managed identity/database/secrets, production SMTP, monitoring, encrypted off-site backups, restore drill, load testing and penetration testing remain separate release work.

## OIDC client separation

The smoke script obtains synthetic-user tokens with the password grant. It now targets the separate local-only `wattscape-local-smoke` client (`WATSCAPE_SMOKE_CLIENT_ID` can override the default). The browser SPA client `wattscape-local` remains Authorization Code + PKCE S256 only, with Direct Access Grants disabled. The smoke client has no redirect URIs or web origins, is present only in the local realm template, and is excluded from the production realm template.

Do not provision this client into the currently shared local Keycloak instance. Use a dedicated disposable Keycloak environment with synthetic users/data. The local realm updater now requires `--confirm-isolated-local-realm wattscape-local`; do not run it against the existing shared Phase 1 stack merely to make this smoke script pass. OAuth security best practice does not recommend password grants for end-user authentication; this is retained only as a constrained legacy smoke-test mechanism.
