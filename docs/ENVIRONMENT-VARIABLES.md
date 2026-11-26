# WattScape Environment Variable Reference

This file documents variable **names and purpose**, not credentials. Populate secrets only in the relevant provider's protected environment/secret store. Never paste secret values into issues, pull requests, frontend variables, or chat.

## Frontend — Vercel project build environment

| Variable | Required for Live mode | Purpose / safe value |
|---|---:|---|
| `VITE_WATSCAPE_API_BASE_URL` | Yes | HTTPS API origin, e.g. `https://api.example.com`; no credentials, path, query, or fragment. |
| `VITE_OIDC_AUTHORITY` | Yes | HTTPS production Keycloak realm issuer, e.g. `https://identity.example.com/realms/wattscape`. |
| `VITE_OIDC_CLIENT_ID` | Yes | Public browser client ID, e.g. `wattscape-web`; not a client secret. |

**All `VITE_*` values are public.** Vite inlines them into the built JavaScript. Never put passwords, client secrets, tokens, signing keys, or private API keys in these variables.

With these variables absent, the app can run in its synthetic Demo mode. That is not a connected production deployment.

## Spring Boot API — Railway service variables

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Private-network JDBC URL for the WattScape PostgreSQL database, including TLS settings required by the provider. |
| `DATABASE_USERNAME` | Yes | Least-privilege application database role. |
| `DATABASE_PASSWORD` | Yes | Secret for the application database role. |
| `DB_POOL_SIZE` | Recommended | Hikari connection pool size; default in source is 12. Set based on DB connection limits and number of API replicas. |
| `JWT_ISSUER_URI` | Yes | Exact HTTPS `iss` URL of the production Keycloak realm. |
| `JWT_JWK_SET_URI` | Recommended | HTTPS realm JWKS endpoint. Keep its keys/realm aligned with the issuer. |
| `JWT_AUDIENCE` | Yes | Expected API audience; source default is `wattscape-api`. |
| `JWT_ORGANIZATION_CLAIM` | Yes | Claim used for the organization identifier; source default is `organization_id`. |
| `CORS_ALLOWED_ORIGINS` | Yes | Exact comma-separated HTTPS frontend origin(s); no wildcard. |
| `PORT` | Platform | Bind port supplied by Railway; application default is 8080. |
| `APP_PUBLIC_URL` | Yes | Canonical HTTPS frontend origin used in invitation links. |
| `SMTP_HOST` | Yes for invitations | Authenticated transactional SMTP host. |
| `SMTP_PORT` | Yes for invitations | Provider submission port; commonly 587 with STARTTLS. |
| `SMTP_USERNAME` | Yes for invitations | SMTP username stored as a secret where appropriate. |
| `SMTP_PASSWORD` | Yes for invitations | SMTP password/token; secret store only. |
| `SMTP_AUTH` | Yes for invitations | Enable SMTP authentication; production should be `true`. |
| `SMTP_STARTTLS` | Yes for invitations | Enable STARTTLS; production submission should use TLS. |
| `SMTP_FROM` | Yes for invitations | Verified sender address on the approved sender domain. |
| `GOOGLE_IDP_ENABLED` | No | Keep `false` until Google is configured in Keycloak with approved client credentials and callbacks. |
| `APPLE_IDP_ENABLED` | No | Keep `false` until Apple is configured in Keycloak with approved credentials and callbacks. |
| `AI_ENABLED` | No | Keep `false` until provider data handling and user disclosure have been approved. |
| `AI_BASE_URL` | If AI enabled | HTTPS base URL of the approved AI service. |
| `AI_API_KEY` | If AI enabled | Provider secret; secret store only. |
| `AI_MODEL` | If AI enabled | Model identifier accepted by the configured provider. |

The application currently starts with Flyway enabled and JPA `ddl-auto: validate`. Do not deploy a new API image against an existing database until the pending migration set and a verified backup have been reviewed.

## Keycloak service — separate Railway service

These variables belong to the Keycloak container, not the Vite frontend or Spring API:

| Variable | Purpose |
|---|---|
| `KC_HOSTNAME` | Public HTTPS Keycloak origin, matching the realm issuer hostname. |
| `KC_HTTP_ENABLED` | `true` only when TLS terminates at a trusted edge proxy and the Keycloak service is private. |
| `KC_PROXY_HEADERS` | `xforwarded` only when the proxy overwrites forwarded headers and is trusted. |
| `KC_DB` | `postgres` for production. |
| `KC_DB_URL` | Private JDBC URL for a dedicated Keycloak database; use TLS. |
| `KC_DB_USERNAME` | Separate least-privilege Keycloak database role. |
| `KC_DB_PASSWORD` | Secret for the Keycloak database role. |
| `KC_HEALTH_ENABLED` | Enable private health endpoints. |
| `KC_METRICS_ENABLED` | Enable metrics only on private monitoring ingress. |
| `KC_BOOTSTRAP_ADMIN_USERNAME` | First-boot administrator name; remove after creating a named MFA-protected administrator. |
| `KC_BOOTSTRAP_ADMIN_PASSWORD` | First-boot secret; remove after bootstrap and rotate if exposed. |

Do not use the local Compose Keycloak configuration in production. It uses `start-dev` and an embedded development database.

## Production realm template substitutions

The JSON template under `deploy/keycloak/wattscape-production-realm.template.json` expects these deployment-time values:

- `WATSCAPE_PRODUCTION_REALM` — production realm name (the backend issuer must match it).
- `WATSCAPE_FRONTEND_ORIGIN` — exact HTTPS browser origin, used in redirect URIs and web origins.
- `WATSCAPE_API_AUDIENCE` — audience expected by the API.
- `WATSCAPE_SMTP_HOST`, `WATSCAPE_SMTP_PORT`, `WATSCAPE_SMTP_FROM`, `WATSCAPE_SMTP_USERNAME`, `WATSCAPE_SMTP_PASSWORD` — Keycloak verification/reset SMTP settings.

Keep Keycloak bootstrap variables separate from realm SMTP variables. Do not commit an interpolated realm export containing secrets.

## Local development

Root `.env.example` contains public frontend development values. `backend/.env.example` is a local-only backend template. Generate local credentials with the documented script; do not copy local demo/bootstrap credentials to Railway.

See [backend setup](BACKEND-SETUP.md), [Keycloak production realm guide](KEYCLOAK-PRODUCTION-REALM.md), and [production deployment blueprint](PRODUCTION-DEPLOYMENT-BLUEPRINT.md).
