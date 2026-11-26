# WattScape Phase 4 — Source, Repository and Production Readiness Audit

**Audit date:** 2026-11-26  
**Repository reviewed:** `fahim1252375-maker/WattScape`  
**Reviewed branch/commit:** `main` / `a5c33760bb5fc50d21a13f9e69a9f2113ba50f3e`  
**Decision:** **NO-GO for full production acceptance**. Source integrity and CI pass; hosted backend, managed database, production identity, email delivery, and connected user workflows are not deployed or verified.

## 1. Executive decision

The Phase 4 source is present in GitHub and the supplied archive checksum is verified. The current `main` branch passes all three GitHub Actions jobs: backend Maven verification, frontend checks/build, and synthetic demo-mode Playwright E2E.

That evidence is enough to say the repository has a repeatable green CI run. It is **not** enough to claim that a complete production system is online. There is no deployed Spring API, production PostgreSQL, production Keycloak realm, authenticated SMTP provider, approved production domain, or verified end-to-end sign-in/email/tenant workflow in the connected provider accounts at this audit point.

No database was connected to, reset, modified, or migrated. No paid resource, DNS name, custom domain, subscription, public/private visibility setting, or secret value was changed.

## 2. Source integrity and reconciliation

### Archive verification

- Archive: `WattScape-Phase4-Latest-Full-Source-2026-11-26-123914.zip`
- Expected SHA-256: `bda8c767fe0b291cdfcecd66c920afd31b3a82dae9641b2bcd8e4294fd97b319`
- Independently computed SHA-256 from the GitHub-hosted archive bytes: **exact match**.
- ZIP payload: 778,237 bytes; 256 manifest-listed source files; the ZIP also contains its own `ZIP-MANIFEST.txt` file.
- Manifest-listed source bytes: 2,102,880. ZIP file entries including the manifest itself: 2,119,212 bytes. Every manifest-listed path and file size matched the ZIP central directory.
- ZIP root directory: `WattScape-Phase4-Demo-Source/`. The archive filename says “Full-Source”; the internal folder uses “Demo-Source”.

### Current Git tree

The source archive is present in repository history in commit `4beb6f9a2a254eebbbb5149f3f90f046c57d208e`. The current `main` source is derived from that archive and later repository maintenance. The archive contains two generated Playwright outputs that are absent from current `main`:

- `e2e-report/index.html`
- `e2e-results/.last-run.json`

The current `main` has the later test-only SMTP health-indicator configuration in `TenantIsolationIntegrationTest`. It disables the mail health contributor only for that test class; production mail health monitoring is not disabled by this change.

The repository is already **public**. This audit did not change its visibility. The user prompt's “do not make public” safeguard was not actioned as a visibility change because the repository was public before this audit. Keep that status under explicit owner review.

## 3. Architecture verified in source

| Layer | Source-level finding |
|---|---|
| Frontend | React 19 / TypeScript / Vite 8 SPA, built with Bun 1.4.5 to `dist/`; development server port 3000. |
| Operating modes | Demo and Live modes are separate. Demo mode is the default and uses synthetic fixtures. Live mode requires explicit HTTPS API and OIDC configuration. |
| Authentication | Keycloak OIDC Authorization Code + PKCE (S256); callback paths `/auth/callback` and `/auth/silent-callback`. No frontend password grant flow. |
| API | Java 21 / Spring Boot 3.5.x / Maven; Dockerfile exposes port 8080 and runs a non-root user. Runtime port is controlled by `PORT`. |
| Persistence | PostgreSQL with Flyway V1–V6; Hibernate `ddl-auto: validate`. Flyway is enabled at API startup. |
| Authorization | Stateless Spring Security resource server, JWT issuer/audience validation, realm role mapping, exact CORS allowlist, and service-level organization membership checks. |
| Tenant context | `X-Organization-Id` is only a selector; `TenantContext` validates active membership by issuer + subject before selecting the organization. Service/repository queries are organization/site scoped. |
| Phase 4 domains | Spatial/floor-plan mappings, telemetry devices and readings, work orders/events, energy analytics, audit events, and optional AI insights exist in source. |
| Email | Backend invitation emails use Spring Mail. Keycloak verification/reset emails require realm SMTP configuration. Mailpit is local-only. |
| Operations | Actuator liveness/readiness and Prometheus endpoints exist; Prometheus and API docs are ADMIN protected. Monitoring templates are not a running monitoring service. |

See [Architecture](ARCHITECTURE.md), [API documentation](API.md), and [production deployment blueprint](PRODUCTION-DEPLOYMENT-BLUEPRINT.md).

## 4. CI evidence — GitHub Actions

Verified latest `main` run for commit `a5c33760bb5fc50d21a13f9e69a9f2113ba50f3e`: **3 jobs completed successfully**.

| Job / check | Result | Evidence |
|---|---|---|
| Backend Java 21 / Maven / Testcontainers | **PASS** | `BUILD SUCCESS`; 68 tests, 0 failures, 0 errors, 1 skipped. |
| Frontend frozen dependency install | **PASS** | `bun install --frozen-lockfile`. |
| Source hygiene | **PASS** | `python3 tools/verify-source-hygiene.py .`. The scanner is pattern-based, not a full secret-scanning or penetration tool. |
| Dependency advisory audit | **PASS** | `bun audit --audit-level=low`: no vulnerabilities found in 367 packages. |
| TypeScript | **PASS** | App and E2E TypeScript checks completed. |
| Lint | **PASS** | Oxlint: 0 warnings, 0 errors in the CI run. |
| Frontend tests | **PASS** | 7 Vitest files plus 11 Node domain tests completed successfully. |
| Production build | **PASS** | Vite transformed 2,246 modules and built successfully. It emitted a large-chunk advisory for the 3D bundle. |
| Playwright | **PASS** | 10/10 synthetic demo/configuration/3D E2E tests passed on GitHub's Ubuntu runner. |

**Coverage boundary:** the current Playwright suite does not complete a live Keycloak browser login, production OIDC callback, authenticated hosted API request, real mailbox verification, or full tenant/role workflow in a deployed environment. The Mailpit Maven smoke test is intentionally skipped unless its test environment is enabled; the CI pass does not prove public email delivery.

The workflow uses `actions/checkout@v4` and `actions/setup-java@v4`; GitHub emitted Node 20 deprecation notices. Upgrade these actions in a separately tested maintenance change.

## 5. Security and data-safety review

### Controls present in source

- API requests are stateless bearer-token requests; the backend validates token issuer/signature and audience.
- The organization selector is checked against active membership keyed on token issuer and subject.
- CORS is restricted to an explicit origin allowlist and does not allow credentials.
- Health details are hidden; Prometheus and API docs are ADMIN protected.
- Demo mode is the default and is separate from live API mode.
- The telemetry device credential is generated with `SecureRandom`, returned at registration, hashed in storage, and compared using a constant-time comparison.
- Telemetry validates metric/unit pairs, value/time bounds and event identifiers; database uniqueness supports duplicate-event handling.
- Keycloak production template enables email verification, blocks duplicate emails, has brute-force protection and sets MEMBER as the default realm role. The actual production realm is not deployed.
- API error responses avoid leaking exception messages/stack traces.
- The source scanner and dependency audit both pass in CI, within their documented limits.

### Findings and production hardening still required

1. **Invitation revocation is not written to the audit-event stream.** `OnboardingService.revokeInvitation` updates the invitation status but does not persist a corresponding `AuditEvent`. Add an audit record and test cross-tenant denial/audit evidence before treating invitation administration as fully auditable.
2. **Invitation delivery is not a durable outbox.** `InvitationEmailDispatcher` handles the event after transaction commit and logs send failures; it does not persist retry state or guarantee delivery. The invitation may remain committed even if SMTP is unavailable. Add an outbox/retry workflow or an owner-operated retry path before relying on it for production onboarding.
3. **Telemetry ingest needs edge abuse controls.** The JWT filter permits the ingest route because it uses a per-device credential. That credential is checked in service code, but there is no complete infrastructure rate-limit/WAF policy in the repository. Set per-IP/device rate limits and request-size limits at the production edge.
4. **AI must remain disabled by default.** When enabled, the service sends selected site-level aggregates and the operator's question to the configured external provider. Obtain explicit product/privacy approval and disclose provider/data handling before setting `AI_ENABLED=true`.
5. **HSTS and CSP are intentionally not enforced yet.** Add HSTS only after the final HTTPS domain and redirects are verified. Design and test CSP against WebGL assets, fonts, API calls, and OIDC redirects before enforcement.
6. **Source hygiene is not a comprehensive secret scanner.** It detects selected file extensions and high-confidence patterns, but skips generated E2E report directories and cannot prove that every credential-like value is absent. Keep GitHub secret scanning/push protection enabled where available and review archive/report outputs before sharing.
7. **Public repository status predates this audit.** The current repository was already public. No visibility setting was changed. The owner should decide whether to keep it public after reviewing history and generated artifacts.
8. **No independent penetration/load test was run.** Automated tests and code review are not substitutes for security testing against an isolated production-like environment.

## 6. Database and migration safety

- Source includes Flyway migrations V1–V6 and enables Flyway on application startup.
- JPA uses `ddl-auto: validate`; Hibernate does not auto-create/update the production schema.
- A source scan of V1–V6 found no `DROP`, `TRUNCATE`, or `DELETE FROM` statements. This is a text-level check, not a claim that migrations are universally risk-free.
- Migrations are forward-only; the documented rollback strategy is restore/redeploy, not down-migration.
- The repository contains a scratch PostgreSQL restore-drill integration test. The latest CI test run passed it.
- **No owner-local database, Railway database, or production database was connected to. No Flyway migration was executed against an owner database. No local Docker volume was touched.**

Before a live API is pointed at a database, provision a new isolated managed database or identify the intended target, set up a tested backup/PITR path, review pending migrations, and obtain explicit approval.

## 7. Hosting and provider account status

### Vercel

- Connected Vercel team: `minhazfahim442-8685`
- Account/team plan reported by the connector: **Hobby**
- Existing projects in that team: **0**
- No project, deployment, environment variable, custom domain, or DNS record was changed during this audit.

The Vite app can be deployed as a static preview in Demo mode without secrets. That would not be a full-stack production deployment. Live mode requires the API and Keycloak hostnames first.

### Railway

- Railway authentication is registered, but the account context reported `workspace: null`.
- Existing Railway projects: **0**
- No Railway project, database, volume, API service, Keycloak service, domain, variable, or deployment was created.

Railway documentation describes a one-time trial-credit grant for new trial accounts; it is not a guarantee of permanently free hosting. Confirm the account's plan, usage limits, and billing controls in the Railway dashboard before provisioning anything. See [Railway pricing plans](https://docs.railway.com/pricing/plans) and [trial information](https://docs.railway.com/pricing/free-plan).

### Deployment target topology

Once a workspace and approved billing/usage limit exist, the recommended topology is:

- Vercel static frontend (Hobby preview or production only after acceptance)
- Railway Spring Boot API service built from `backend/Dockerfile`
- Railway PostgreSQL with persistent storage/backups; isolate application and Keycloak databases/roles
- Separate Railway Keycloak service using `deploy/keycloak/Dockerfile` and the production Postgres database
- SMTP provider for both Keycloak verification/reset email and backend invitation messages
- Private service-to-database networking; public HTTPS only for frontend, API and Keycloak

No provider cost, persistent volume behavior, PITR guarantee, or plan limit is represented as verified for this account.

## 8. Required production environment variables

See [Environment variable reference](ENVIRONMENT-VARIABLES.md) and `backend/.env.production.example`. The key frontend names are:

- `VITE_WATSCAPE_API_BASE_URL`
- `VITE_OIDC_AUTHORITY`
- `VITE_OIDC_CLIENT_ID`

The backend needs `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `JWT_ISSUER_URI`, `JWT_JWK_SET_URI`, `JWT_AUDIENCE`, `JWT_ORGANIZATION_CLAIM`, `CORS_ALLOWED_ORIGINS`, `APP_PUBLIC_URL`, `SMTP_*`, and `PORT`. Keycloak requires its own `KC_*` database/hostname/proxy/bootstrap variables and realm SMTP values. Configure secret values only in each provider's secret store.

## 9. Acceptance matrix

| Acceptance gate | Status | Reason |
|---|---|---|
| Archive SHA-256 | **PASS** | Exact expected digest verified from archive bytes. |
| Manifest and file inventory | **PASS** | All manifest-listed source paths and sizes matched ZIP directory entries. |
| Current source reconciliation | **PASS** | Main is derived from the archive; generated E2E report outputs were not kept in main, and the test-only CI fix is documented. |
| Frontend install/typecheck/lint/tests/build | **PASS** | Latest GitHub Actions frontend job green. |
| Dependency audit | **PASS** | No advisories found in 367 packages in the latest run. |
| Backend Maven/Testcontainers | **PASS** | 68 tests, 0 failures/errors, 1 environment-gated skip; build successful. |
| Synthetic demo Playwright | **PASS** | 10/10 tests passed on GitHub Actions. |
| Docker image build | **NOT VERIFIED** | CI runs Maven verify, not a production Docker image build. |
| Production API readiness | **BLOCKED** | No API service or production database deployed. |
| Keycloak OIDC discovery / browser login | **BLOCKED** | No production Keycloak realm/hostname deployed. |
| Registration / email verification / password reset | **BLOCKED** | No production SMTP or mailbox verification run. |
| Authenticated API and tenant workflows in hosted environment | **NOT VERIFIED** | No hosted API or production identities. |
| Logout/session/callback in production browser | **NOT VERIFIED** | No production IdP/client configured. |
| Production CORS/TLS/redirect/DNS | **BLOCKED** | No approved hostnames or DNS records. |
| Managed DB backup/PITR and production restore | **BLOCKED** | No Railway workspace/database provisioned. |
| Security penetration/load test | **NOT VERIFIED** | No independent assessment run. |

## 10. Next steps and approval gates

1. Review this PR and decide whether the already-public repository should remain public. Do not add a license without an explicit license decision.
2. Create/activate a Railway workspace and confirm the selected plan and maximum acceptable monthly usage/credit limit. Do not upgrade or attach paid billing until approved.
3. Choose and confirm owned production hostnames (app, API, identity) and the SMTP sender domain/provider. Do not buy a domain or provider plan as part of this PR.
4. Provision a disposable/new PostgreSQL instance with backup support and private networking. Keep the owner's local database untouched.
5. Deploy Keycloak production first, then API, then Vercel with the exact production origin/issuer values. Configure exact CORS, OIDC redirect URIs, JWKS and audience.
6. Run the live acceptance matrix with synthetic accounts and approved synthetic data: register, verify email, login/callback, `/api/v1/me`, organization selection, role boundaries, cross-tenant denial, telemetry, work orders, analytics, logout, reset password, and email delivery.
7. Resolve the invitation audit/outbox findings, add edge rate limits and review AI data handling before accepting production traffic.

**Final status: production NO-GO.** A green GitHub CI run is verified; full-stack production acceptance is not.
