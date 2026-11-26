# WattScape — Production Deployment Blueprint (configuration readiness)

**Status: configuration readiness only. Nothing in this repository deploys, provisions, or contacts a production service.**
Every host, domain, secret, and provider below is a placeholder that the owner must supply and authorise.

## 1. Architecture

| Component | Recommended host (owner choice) | Config source in repo |
|---|---|---|
| Frontend (static SPA) | Vercel (primary) or Netlify (alternate) | `vercel.json`, `netlify.toml`, `public/_headers`, `public/_redirects`, `.env.production.example` |
| Backend API (Spring Boot 21, Docker) | Render (Docker web service) or any container host | `backend/Dockerfile`, `backend/.env.production.example` |
| Identity (Keycloak 26.x, OIDC) | Separate container service with managed PostgreSQL | `deploy/keycloak/Dockerfile`, `deploy/keycloak/docker-compose.production.example.yml` |
| Database | Managed PostgreSQL 17 with TLS | Flyway migrations in `backend/src/main/resources/db/migration` |
| Transactional email | Owner-selected SMTP provider (authenticated, TLS) | `SMTP_*` variables only |

Use one hostname per public surface, for example `app.example.com` (frontend), `api.example.com` (API), `identity.example.com` (Keycloak). These are examples, not allocated names.

## 2. Frontend (Vercel primary, Netlify alternate)

- `vercel.json` is the Vercel source of truth: `bun install --frozen-lockfile`, `bun run build`, `dist`, SPA rewrite to `/index.html`, and security headers. Vercel does not read `public/_headers`.
- Netlify reads `netlify.toml` for build settings and `public/_headers` / `public/_redirects` for headers and SPA fallback. Netlify does not read `vercel.json`. Keep the two header sets in sync when either changes.
- Required build-time variables (set in the host's project environment, never committed):
  - `VITE_WATSCAPE_API_BASE_URL` — HTTPS API origin, no path, no credentials.
  - `VITE_OIDC_AUTHORITY` — HTTPS realm issuer URL, e.g. `https://identity.example.com/realms/wattscape`.
  - `VITE_OIDC_CLIENT_ID` — public browser client id.
- `VITE_*` values are public and inlined into the JavaScript bundle. Never place a secret in any `VITE_*` variable.
- Runtime guards (already in code and covered by unit and E2E tests): production never falls back to `localhost`; non-HTTPS remote API or identity origins are rejected; a missing value shows a deployment-configuration message.
- HSTS is intentionally **not** set yet. Add `Strict-Transport-Security` only after HTTPS is verified end to end on the final domain, because HSTS is hard to undo.
- A Content-Security-Policy is **not** yet defined. It needs a test pass against the 3D renderer, fonts, and OIDC redirects before enforcement.

## 3. Backend API (Render or container host)

- Build: `backend/Dockerfile` (Java 21, non-root runtime, read-only root filesystem is compatible with `/tmp` as tmpfs in local compose; equivalent on the host).
- Health checks: liveness `GET /actuator/health/liveness`; readiness `GET /actuator/health/readiness` (includes the database). Health details are hidden (`show-details: never`), so responses do not expose database URLs, versions, or stack traces.
- Required environment variable **names** are listed in `backend/.env.production.example`. The key ones:
  - `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DB_POOL_SIZE`
  - `JWT_ISSUER_URI` (must exactly equal the token `iss`), `JWT_JWK_SET_URI`, `JWT_AUDIENCE`, `JWT_ORGANIZATION_CLAIM`
  - `CORS_ALLOWED_ORIGINS` (exact HTTPS frontend origin list, no wildcards), `APP_PUBLIC_URL`
  - `SMTP_*`, `AI_ENABLED` (keep `false` until provider data handling is approved)
- Trusted proxy: `server.forward-headers-strategy: framework` is set. Configure the host to overwrite `X-Forwarded-*` so client IPs cannot be spoofed.
- API documentation at `/api-docs` and `/swagger-ui.html` requires the `ADMIN` realm role. Keep these paths off public ingress where possible; verify the admin-only access policy and decide whether to disable documentation entirely in production.

## 4. Identity — production Keycloak (replaces the local `start-dev` service)

The local `docker-compose.yml` uses `start-dev`, an embedded development database, and HTTP. **That configuration must not be used in production.** The production example follows the Keycloak 26 documented path:

1. Build the optimized image once: `deploy/keycloak/Dockerfile` runs `kc.sh build` with `KC_DB=postgres`, health and metrics enabled.
2. Start with `start --optimized` (no `start-dev`, no `--import-realm` of the local realm).
3. Edge TLS termination at the managed proxy: `KC_HOSTNAME=https://identity.example.com`, `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded`. The proxy must overwrite `X-Forwarded-*`. Keycloak must not be reachable from the public internet except through that proxy. If the platform instead offers TLS re-encryption or passthrough, choose the matching mode from the Keycloak reverse-proxy guide; `--proxy-headers` must not be combined with passthrough.
4. Database: dedicated Keycloak database and role on managed PostgreSQL with `sslmode=require`. Do not share the WattScape application role.
5. Admin bootstrap: set `KC_BOOTSTRAP_ADMIN_USERNAME/PASSWORD` for the first boot only. Create a named administrator with MFA, then remove both variables and redeploy.
6. Realm `wattscape` (production, not the local realm):
   - Browser client for the frontend: public client, Authorization Code flow with PKCE (S256), direct access grants (password grant) **disabled**.
   - Exact redirect URIs, e.g. `https://app.example.com/*` with the exact callback path used by `AuthProvider`. No wildcard hosts.
   - Web origins: `https://app.example.com` only.
   - Audience mapped to `wattscape-api`; `realm_access.roles` containing `ADMIN` / `MEMBER`; organization claim (`organization_id`) mapped to the value the API reads (`JWT_ORGANIZATION_CLAIM`).
   - Token and session lifetimes set by the owner; signing-key rotation documented in the runbook owner section.
   - Keycloak SMTP configured in the **realm's Email settings** (see §6), not in the API environment.
7. Verify with the production issuer: unauthenticated API calls return 401; the issuer and JWKS endpoint are reachable over HTTPS; the API accepts only tokens with the configured audience.

The local realm file `backend/keycloak/wattscape-local-realm.json` contains development placeholders and local-only clients. It must not be imported into production.

## 5. Managed PostgreSQL

- Enforce TLS (`sslmode=require` or stricter) and restrict network access to the API and Keycloak egress addresses only.
- Two least-privilege roles: an application role (DML on WattScape schema) and a migration role (DDL). The migration role should be used only by the deployment job. Do not use the superuser or the `postgres` role.
- Flyway runs at API startup (`spring.flyway.enabled: true`). Before every deploy: take a backup, confirm the target is the intended environment, and review pending migrations. Rollback is restore-based (see §8); down-migrations are not provided.
- Pool limits: `DB_POOL_SIZE` (default 12). Size `max_connections` on the managed instance to cover API instances × pool size + Keycloak pool + admin sessions, with headroom.
- Backups, retention, encryption, and restore drills are covered in `docs/OPERATIONS-RUNBOOK.md`.

## 6. Email (SMTP)

- Use a transactional SMTP provider with an authenticated submission endpoint (`SMTP_HOST`, `SMTP_PORT=587`, `SMTP_AUTH=true`, `SMTP_STARTTLS=true`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`).
- Mailpit is local development only and must never be configured in production.
- Set SPF, DKIM, and DMARC for the sender domain before enabling invitations.
- Keycloak mail (verification, password reset) is configured in the production realm's Email settings with the same provider, using placeholders in the owner's secret store.
- Nothing in this repository sends real email. Delivery testing is an owner action.

## 7. Secrets

- Store secrets only in each provider's secret store or protected environment settings: `DATABASE_PASSWORD`, `SMTP_PASSWORD`, `AI_API_KEY` (if enabled), `KC_DB_PASSWORD`, `KC_BOOTSTRAP_ADMIN_PASSWORD` (first boot only).
- Rotate on any suspected exposure; record rotation in the change log.
- Never commit a populated `.env*` file. `.gitignore` excludes `.env*` except the `.example` templates.
- Telemetry device ingest secrets are shown once at creation and stored hashed; they are not retrievable afterwards by design.

## 8. Deployment order, verification, and rollback

Deploy in this order, verifying each step before the next:

1. **Managed PostgreSQL** provisioned with TLS, network allowlist, roles, and a verified backup.
2. **Keycloak** (production image, production realm, client, redirect and web origins, mail). Verify the OIDC discovery document and JWKS over HTTPS.
3. **Backend API** with the production variables. Verify `/actuator/health/readiness` returns 200 and `/actuator/health/liveness` returns 200. Verify an unauthenticated call to `/api/v1/me` returns 401.
4. **Frontend** production build with the three `VITE_*` values. Verify the built page calls only the production API origin (browser network log), and that no `localhost` request occurs.
5. **DNS and TLS**: point hostnames at the platform, confirm certificates are valid and auto-renewing, then confirm the HTTP-to-HTTPS redirect.
6. **Smoke test** with a dedicated test organisation and test users created by the owner, not real customer data.

**Rollback:**
- Frontend: redeploy the previous successful deployment in Vercel or Netlify (instant).
- API: redeploy the previous image tag. If the failed release applied a migration, restore the pre-deploy database backup into a scratch database, verify, then cut over under owner approval. Forward-only migrations mean rollback of the schema is a restore, not a script.
- Keycloak: redeploy the previous image; realm configuration changes are reverted from the exported realm JSON taken before the change.

## 9. DNS / TLS / headers checklist

- [ ] Hostnames chosen and owned by the owner (`app`, `api`, `identity` under the owner's domain).
- [ ] TLS certificates issued and auto-renewed on each platform.
- [ ] HTTP redirects to HTTPS; HSTS added only after the above is verified.
- [ ] Frontend security headers present in the host (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`).
- [ ] CORS origins in `CORS_ALLOWED_ORIGINS` exactly match the frontend origin.
- [ ] Keycloak redirect URIs and web origins contain only production origins.
- [ ] CSRF: the API is stateless bearer-token and does not use cookies, so CSRF protection is disabled by design (`SecurityConfig`). Any future cookie-based session must re-evaluate this.

## 10. Owner actions still required (names only; never send values in chat)

- Choose and provision hosts (Vercel or Netlify, Render or other, managed PostgreSQL, Keycloak host, SMTP provider).
- Own the domains and DNS; approve TLS and HSTS timing.
- Create the production realm, client, admins (with MFA), and role/organization claim mappings.
- Populate secrets in each provider's secret store: `DATABASE_*`, `SMTP_*`, `KC_DB_*`, `KC_BOOTSTRAP_ADMIN_*` (first boot), `AI_API_KEY` if AI is enabled.
- Approve AI provider data handling before setting `AI_ENABLED=true`.
- Authorise any real deployment; this blueprint does not authorise one.
