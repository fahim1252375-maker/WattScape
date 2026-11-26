# WattScape Phase 4 — Local Host Runtime and Connected Acceptance

This guide describes the **host-run local development topology** used for the Phase 4 release-candidate checks. It is not a production deployment guide.

## Local service map

| Component | Local address | Notes |
|---|---|---|
| Phase 4 API (JAR on the Mac) | `http://localhost:8082` | New release-candidate backend |
| Phase 4 PostgreSQL | `localhost:55432` | Separate Phase 4 container/database; do not point it at the Phase 1 database |
| Local Keycloak realm | `http://localhost:8081/realms/wattscape-local` | In the reported setup this is the already-running Phase 1 Keycloak container; it is shared local infrastructure, not an isolated IdP |
| Mailpit SMTP | `localhost:1025` | In the reported setup this is the already-running Mailpit container |
| Frontend Vite dev server | `http://localhost:3000` | `bun run dev` uses port 3000 |

The older Phase 1 stack also owns PostgreSQL `5432`, Keycloak `8081`, API `8080`, and Mailpit `1025`. Do not run the Phase 4 root Compose stack with its default published ports while those services are running. Do not run `docker compose down -v`, `docker volume prune`, or any database reset command.

## Start the frontend against Phase 4

The application reads `VITE_WATSCAPE_API_BASE_URL`, not `VITE_API_BASE_URL`. The generic development fallback is `http://localhost:8080`, which can reach the older Phase 1 API. For this host-run Phase 4 API, start Vite with the API and OIDC values explicitly set:

```bash
VITE_WATSCAPE_API_BASE_URL=http://localhost:8082 \
VITE_OIDC_AUTHORITY=http://localhost:8081/realms/wattscape-local \
VITE_OIDC_CLIENT_ID=wattscape-local \
bun run dev
```

These `VITE_*` values are public browser configuration, not secrets. Never put a client secret, API key, database password, or private key in a `VITE_*` variable.

The root `.env.example` retains `http://localhost:8080` as its generic Compose/dev default. Do not change that generic default just to suit the host-run Phase 4 topology; explicitly override it for Phase 4 as shown above.

## Keycloak client redirect configuration

The checked-in local realm template configures the `wattscape-local` public client with Authorization Code flow, PKCE S256, and these local redirect/origin values:

- `http://localhost:3000/auth/callback`
- `http://localhost:3000/auth/silent-callback`
- Web origin: `http://localhost:3000`
- Post-logout redirect: `http://localhost:3000/`

This is evidence about the **realm import template only**. It does not prove that a running persistent Keycloak realm has exactly the same client settings. Verify the actual running client in Keycloak before diagnosing an OIDC callback failure. Never broaden redirects to `*` or use wildcard origins as a workaround.

## Local backend environment differences

A backend running inside Docker Compose normally uses Docker service names such as `postgres` and `mailpit`. A Java process running directly on the Mac must use published host ports instead. For the reported Phase 4 setup the host-run values are:

```text
DATABASE_URL=jdbc:postgresql://localhost:55432/wattscape
JWT_ISSUER_URI=http://localhost:8081/realms/wattscape-local
JWT_JWK_SET_URI=http://localhost:8081/realms/wattscape-local/protocol/openid-connect/certs
SMTP_HOST=localhost
SMTP_PORT=1025
PORT=8082
```

Keep actual credentials in the ignored `backend/.env` file. Do not upload or commit it. The checked-in `backend/.env.example` is a Docker/local template; it intentionally uses Docker service names and generated-secret placeholders. Do not copy its placeholders as actual passwords.

## Safe connected acceptance sequence

1. Confirm the Phase 4 API is responding: `curl -i http://localhost:8082/actuator/health`.
2. Confirm OIDC discovery: `curl -fsS http://localhost:8081/realms/wattscape-local/.well-known/openid-configuration`. The returned `issuer` must exactly match the backend `JWT_ISSUER_URI` and frontend authority.
3. Start Vite with the explicit environment variables above.
4. In browser developer tools, confirm frontend API requests target port `8082`, not `8080`. Do not copy access tokens, cookies, or Authorization headers into logs or chat.
5. Perform login using synthetic local test identities only. Verify ADMIN and MEMBER behavior, logout, expired-session handling, and tenant denial. A successful Keycloak page load alone is not proof that the API accepted the signed token.
6. Check the backend response for an authenticated identity endpoint and a tenant-scoped read. Verify a cross-tenant resource request is denied/hidden. Use only synthetic Phase 4 data.
7. If testing invitation email, send only to a controlled test mailbox and verify the message in Mailpit at `http://localhost:8025`.

## Existing OIDC smoke script is write-capable

`backend/scripts/verify-local-oidc.py` obtains real Keycloak-signed development tokens through the separate `wattscape-local-smoke` password-grant client and exercises API authorization. The owner’s currently shared Keycloak instance was updated earlier for the browser OIDC client, but this new smoke-only client was deliberately not added to that shared realm. The script will therefore fail token acquisition until used with a dedicated disposable Keycloak realm that contains `wattscape-local-smoke`. It also creates a site with code `LOCAL-RUNTIME-01` if that site does not already exist. It is therefore **not read-only**. Run it only after verifying that `backend/.env` points to the isolated Phase 4 database on port `55432`, that `PORT=8082`, and that the test users are synthetic. It should not be run against the Phase 1 database or a customer environment. Before running it, replace the sample `generate-local-secret` values for `WATSCAPE_ADMIN_PASSWORD` and `WATSCAPE_MEMBER_PASSWORD` with the matching synthetic users’ local Keycloak passwords; the script also requests a token for `local-other-admin` using the admin password. Do not share those values. It does not perform a full browser OIDC redirect/callback test.

## Evidence boundaries

A successful local Maven test run, HTTP 200 health check, Keycloak discovery response, or Vite page load is not by itself production readiness. Production still requires an isolated real OIDC browser-to-API test, provider-managed backup/PITR and restore rehearsal, verified production SMTP, deployed monitoring/alert delivery, TLS/secret management, hosted CI, load/accessibility checks, and an appropriate security assessment.
