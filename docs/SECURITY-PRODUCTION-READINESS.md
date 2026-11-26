# Security and readiness status — Phase 4A

**Latest validation:** 2026-11-21. This is a local development security report, not a production-readiness attestation. Local PostgreSQL and Keycloak volumes were retained.

## Acceptance results

| Requirement | Result | Evidence / limit |
|---|---|---|
| OIDC Authorization Code + PKCE | PASS | Frontend authorization request uses PKCE S256. Live local OIDC verifier passed issuer/JWKS and token checks. New-user browser callback is separately BLOCKED pending user signup. |
| JWT issuer and audience validation | PASS | Resource server validates signed Keycloak tokens; local OIDC verifier passed real token, audience/issuer precheck, and secured endpoint checks. |
| 401 unauthenticated behavior | PASS | Live `GET /api/v1/me` returned 401. |
| ADMIN/MEMBER role enforcement | PASS | Live ADMIN request 200; MEMBER read 200; MEMBER write 403. |
| Server-derived tenant scope | PASS | Runtime cross-tenant twin lookup returned 404; database-backed membership selection tests passed. |
| Mandatory Terms configuration | PASS | Realm action is enabled and required in registration flow. |
| User Terms acceptance | BLOCKED | The actual Keycloak page still has the checkbox unchecked. The user must decide and submit personally. |
| Registration and email verification | BLOCKED | No account created, no verification message followed, and no browser callback completed. No success is claimed. |
| Default new-user role | PASS (configuration) | Default role composite contains MEMBER and excludes ADMIN. A new-user token cannot be inspected until registration completes; actual role result is NOT TESTED. |
| Duplicate email rejection | PASS (configuration); NOT TESTED (live attempt) | Keycloak setting `duplicateEmailsAllowed=false`; no duplicate signup was submitted. |
| Invitation token response handling | PASS | Ordinary create response excludes token; tests verify SHA-256 hash storage and single-use/email-bound acceptance. API log statements do not include token content. |
| Invitation revocation | PASS | The identified exposed disposable invite was revoked via authenticated tenant-scoped endpoint; HTTP 204 and PostgreSQL `revoked_at` readback confirmed. No token/hash field was selected. |
| Revocation tenant authorization | PASS | Integration tests confirm cross-organization revoke returns 404 and revoked code cannot be accepted. |
| Invitation role, expiry, wrong-email and reuse rules | PASS (automated); NOT TESTED (new user live journey) | Lifecycle tests cover Technician role assignment, expiry, verified-email match, wrong email, revocation, and reuse. The user’s real verified identity is not available yet. |
| Local SMTP and message rendering | PASS | Actual `InvitationEmailService` sent a nonfunctional preview over Mailpit SMTP. Mailpit rendered HTML with inline logo, role, expiration, fallback code, plain-text part, and token-free CTA. |
| SMTP failure handling | PASS | Unit test injects a mail failure and verifies a generic API-safe error without SMTP detail or token. |
| Public SMTP deliverability | NOT TESTED | No production SMTP service, DNS, sender domain, SPF/DKIM/DMARC, or bounce service was configured. |
| Google and Apple provider availability | PASS (disabled) | Provider endpoint reports false for both and UI controls remain disabled. Real provider login is NOT TESTED; no credentials were fabricated. |
| Frontend secret exposure | PASS (previous bundle scan) | Previous successful bundle scan found no Google/Apple secret names. The latest production build attempt failed, so no new bundle scan is claimed. |
| Invitation revocation audit event | NOT IMPLEMENTED | The invitation row has a persisted `revoked_at` value, but a separate audit event for the revocation action is not currently written. |
| CSRF/CORS, rate limits, API validation, error detail | NOT TESTED (full security assessment) | Existing security/configuration tests provide partial coverage; this run was not a comprehensive penetration or configuration audit. |
| Production TLS, proxy, managed secrets, managed identity, backups/restore, monitoring, CI/CD, rollback | BLOCKED | No production domain, production identity, infrastructure, secret service, SMTP provider, or restore environment was supplied or deployed. |

## Current quality checks

- Backend Java 21 `mvn test`: **30 passed**, 0 failures/errors/skips.
- Backend Java 21 `mvn verify`: **30 passed**, 0 failures/errors, 1 environment-gated Mailpit smoke test skipped; Spring Boot JAR packaged.
- Separate `WATSCAPE_MAILPIT_SMOKE=true mvn -Dtest=InvitationEmailMailpitSmokeTest test`: **1 passed**.
- `docker compose --env-file backend/.env config --quiet`: passed.
- `backend/scripts/verify-local-oidc.py`: **20 checks passed**, including discovery, readiness, Swagger, 401, ADMIN/MEMBER authorization, tenant isolation, and persisted readback. Tokens were not printed or stored.
- `bun run lint`: passed.
- `bun run test`: **failed before tests ran**. Vitest reported `TypeError: pico is not a function`; runner-mode retry failed jsdom workers with `TypeError: URL.install is not a function`.
- `bun run build`: **failed**. Initial run reported `TypeError: Hook is not a constructor` from Tailwind’s resolver; retry entered Vite transformation and stalled. Existing `dist` is from an earlier run and is not current verification.

Maven emitted a non-blocking HTTP 401 while checking Flyway community repository metadata, but dependency resolution and verification succeeded. Mockito/JDK dynamic-agent and Spring reflective-final-field warnings were non-fatal.

## Local-only limits and remaining security work

Never use the local bootstrap identities, password-grant verification client, Keycloak `start-dev` mode, HTTP localhost URLs, or Mailpit in production. Replace local terms/privacy copy with approved legal text. Before production, configure TLS/domain, managed identity and secrets, authenticated encrypted SMTP, domain reputation and bounce handling, abuse controls, backup/restore testing, monitoring, CI/CD, migration rollback procedure, and independent security/load testing. The synchronous mail send still has no durable outbox/retry workflow.

The exposed disposable invitation remains in PostgreSQL with `revoked_at` set; its old Mailpit message is retained, but the code is invalid. No replacement invitation is created until the test user finishes registration and verifies that email. See [Phase 4 implementation status](PHASE4-IMPLEMENTATION-STATUS.md) and [E2E validation](PHASE3.2.1-E2E-VALIDATION.md).


## Phase 4 implementation update — 2026-11-21

The updated source adds the following server-side controls; they are **source-level changes awaiting local verification**, not a security certification:

- Spatial element and work-order writes use both application-visible `expectedVersion` checks and database optimistic-lock columns to prevent silent lost updates.
- Spatial version snapshots, work-order events, and AI usage events have database triggers that reject update/delete operations.
- Spatial mappings are tenant/site/floor-bound by composite foreign keys. Retiring a mapping preserves history and permits a later active mapping for the same source room/asset.
- Device credentials are generated with `SecureRandom`, returned only at registration, SHA-256 hashed at rest, compared in constant time, and revocable. Ingestion accepts a maximum 250 readings per request; only the device-authenticated ingestion route is exempt from the JWT bearer requirement.
- Telemetry values have metric/unit allowlists, quality validation, a one-year past / five-minute future event-time window, and per-device event-ID uniqueness. Production edge/gateway rate limiting is still required.
- Work-order status transitions are explicit, assignment requires an active organization member, and Technicians may update only orders assigned to their subject. Database optimistic locking protects concurrent updates.
- Analytics uses only good-quality readings and effective-dated site factors. It now processes the full selected interval in bounded pages (2,000 rows per query), so energy/water/power aggregates are not truncated at 10,000 rows; monetary and emissions calculations remain suppressed when factor coverage is incomplete or currencies differ.
- AI is disabled by default, secrets remain server-side, non-local endpoints require HTTPS, requests have connect/read timeouts, and prompt/output text is not persisted. A configured external provider receives site-level 30-day aggregate energy/water/power readings, measurement counts, caveats, open work-order count, selected task and submitted question. Full site names, organization identifiers and user identity are excluded from generated context; user-entered question text is forwarded as submitted. The UI now discloses the provider host/model and warns that provider retention terms are external.
- GitHub Actions workflow and local database backup helper are included, but neither has been executed in this environment. Backups are not encrypted by the helper; encrypt with an approved KMS/key before off-device retention.

### Remaining release blockers

1. Run `bun install --frozen-lockfile`, `bun run lint`, `bun run test`, and `bun run build` on the Mac.
2. Run `mvn -Dtest=SpatialGeometryValidatorTest test` and `mvn verify` with Docker Desktop running. Confirm Flyway V5, Hibernate schema validation, all JPA repository methods, and Testcontainers behavior.
3. Exercise the Live Phase 4 UI with real role-specific test accounts: Owner/Admin, Facilities Operator, Technician, and read-only member. Verify cross-tenant 404 and role-specific 403 outcomes for each write family.
4. Test a telemetry device end-to-end using a disposable device secret held outside the browser; verify ingestion, duplicate event handling, revocation and rejection after revocation.
5. Verify cost/emissions calculations against known interval fixtures, including factor changes mid-period, missing factors, multiple currencies and result truncation.
6. Have an administrator enable AI only after approving provider data handling; run an explicit test and inspect provider usage logs. Keep secrets in a managed secret store.
7. Complete the user-controlled Keycloak signup/terms/email verification flow in 4A.
8. Before production, add managed identity, HTTPS/reverse proxy, managed PostgreSQL, encrypted offsite backup and a restore drill, production SMTP with SPF/DKIM/DMARC, runtime metrics/error monitoring, WAF/rate limits, secret rotation, load/penetration tests, release/rollback runbooks and a real deployment. The local Keycloak `start-dev` service and Mailpit must not be exposed publicly.

Do not describe WattScape as production-ready until these blockers are closed and independently verified.


### Phase 2 issue-resolution delta (2026-11-22)

- Production realm template: `deploy/keycloak/wattscape-production-realm.template.json`; it is placeholder-only, uses exact HTTPS origin placeholders, PKCE S256 and Keycloak temporary brute-force controls. It was not imported or deployed.
- Local password-grant compatibility: `wattscape-local` SPA client remains password-grant free. A separate `wattscape-local-smoke` test client exists only in the local import template. The local updater requires an explicit isolated-target confirmation. Existing shared Keycloak infrastructure must not be changed for this work.
- Membership deactivation remains blocked pending owner policy (role allowed to revoke, owner safeguards, reversible status, historical/audit semantics). Existing API access checks already require active membership through `TenantContext`.
- Telemetry retention/purge remains blocked pending an approved per-organization data retention policy and legal-hold/audit exclusion rules. The `retention_days` schema value is not sufficient by itself to define what telemetry is deletable.
- V5 retains `ix_telemetry_site_metric_time (organization_id, site_id, metric_key, observed_at DESC)` for metric-specific history. The latest telemetry endpoint filters organization/site and orders across all metric keys by `observed_at DESC`, so an additive V6 index `ix_telemetry_site_latest (organization_id, site_id, observed_at DESC)` was added for that actual query shape. The migration and EXPLAIN remain NOT RUN against PostgreSQL.
- Work orders now support explicit due-date clearing with `clearDueAt`; Auditor/Read Only is rejected as an assignee by backend validation.
- Invitation email dispatch is an after-commit listener; delivery errors are logged without invalidating a committed invitation. It is not a durable outbox and automatic retry is not guaranteed.


### Phase 2 remediation update — 2026-11-22

- The SPA client remains Code + PKCE S256 with Direct Access Grants and implicit flow disabled. Python local smoke tests now use a separate `wattscape-local-smoke` client in the local template only; do not provision it into the existing shared local Keycloak or production.
- A production-only Keycloak realm template now includes temporary brute-force controls and exact HTTPS origin placeholders. It has not been rendered/imported/deployed.
- Analytics now aggregates every matching record in 2,000-row pages; a 10,005-point regression test is present but not executed here. V6 adds the site/time index for the latest cross-metric query; PostgreSQL/Flyway/EXPLAIN remain unverified.
- Work-order updates distinguish omitted due date, explicit `clearDueAt`, and a new due timestamp. Auditor/Read Only assignees are rejected server-side.
- Invitation email is dispatched after commit. Email failure does not undo a committed invitation, but a durable outbox/retry/deduplication mechanism is not present.
- AI prompt minimization removes site name and organization/user identifiers; the UI discloses the external provider and the submitted aggregate/question categories. Owner privacy/contract approval remains required.
- Membership revocation and telemetry retention deletion remain blocked pending owner policy. Existing active-membership checks continue to protect tenant-scoped requests.
