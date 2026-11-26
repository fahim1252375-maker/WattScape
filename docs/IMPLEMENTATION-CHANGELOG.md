# Implementation changelog

## Phase 3.1 — Authentication, registration and organization onboarding

- Replaced demo credential/persona controls on the entry page with an OIDC sign-in and registration experience; kept the synthetic demo as a separate entry.
- Added email `login_hint`, Keycloak `prompt=create`, and provider `kc_idp_hint` while retaining Authorization Code + PKCE.
- Enabled local Keycloak email verification, password reset, duplicate-email protection, password policy and MEMBER default role; added local Mailpit SMTP and a custom terms/privacy theme. Phase 3.2 enabled the built-in Terms action and required the registration execution, then read both settings back.
- Added trusted-identity organization creation and verified-email invitation acceptance, hashed single-use invitations with a 72-hour expiry, a Flyway migration and local onboarding UI.
- Tenant resolution verifies active membership for the signed issuer + subject and validates selected organizations against membership on every tenant request. Ambiguous identities without explicit selection are denied.
- Added server-returned social provider availability. Google/Apple remain disabled until separately configured in Keycloak and explicitly enabled on the API.
- Added onboarding unit coverage, updated frontend workspace mocks, and documented local setup and social provider prerequisites.


## Phase 3.2 — Authentication and enterprise readiness foundation

- Added a repeatable, non-destructive Keycloak Admin REST configuration script and corrected the imported required-action alias for Keycloak 26.8.2. Terms acceptance is configured as REQUIRED in the registration flow; no real signup/consent is claimed.
- Added Google broker setup and Apple OIDC broker setup/key-renewal tooling. Provider credentials were not supplied; both remain disabled pending external setup and real login tests.
- Added Spring Mail templates, SMTP environment configuration, Mailpit Compose integration, and a database-backed five-per-hour invitation limiter. API responses omit the raw token; tests cover send/failure and invitation lifecycle checks.
- Added multi-membership listing/selection and organization-specific frontend context. `X-Organization-Id` is a selector only; every tenant API operation checks issuer/subject active membership and reads role from the database.
- Added account settings surface linking to Keycloak account management, verified-email display, active organization roles, and invitation accept/create UI.
- Added setup guides and a status matrix. Production email outbox/retries, legal policy review, provider credentials/domains, and real-world E2E remain external or future work.

## Phase 4 implementation update — 2026-11-21

The source tree now includes an initial implementation of the previously missing Phase 4 backend capabilities:

- **4B — Spatial twin:** floor-plan metadata and revisioning, room/asset GeoJSON geometry linked to the exact plan revision, version history, retirement, tenant/site/floor checks, optimistic concurrency, and geometry validation.
- **4C — Telemetry:** HTTPS device registration with one-time device secrets (only hashes are persisted), revocation, authenticated ingestion, bounded batches, metric/unit allowlists, event idempotency, quality flags, and tenant-scoped reads.
- **4D — Work orders:** persisted work-order lifecycle, role/assignee authorization, active-organization membership validation, and append-only event history.
- **4E — Analytics:** day-level energy/water aggregates and sampled power statistics from persisted telemetry, effective-dated tariff/emissions factors, and explicit caveats for incomplete/mixed data.
- **4F — AI gateway:** opt-in, server-side provider integration with HTTPS configuration, bounded timeouts/rate limiting, minimal context, metadata-only usage logging, and advisory-only results.
- **Operations:** Phase 4 Live workspace UI, API documentation, CI workflow, and a local PostgreSQL backup helper.

These are source-level implementations, not a production release. The current authoring environment did not have Maven, Bun, Docker, a local PostgreSQL service, or Maven Central connectivity. Java compilation, Testcontainers, frontend dependency-backed type-check/test/build, live API verification, and provider/device end-to-end tests remain to be run on a fully provisioned development machine. Production deployment, secrets management, operational monitoring, external device protocols, and real AI-provider credentials are not configured by this change.
