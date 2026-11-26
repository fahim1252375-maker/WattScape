# WattScape — Phase 2 identified-issues resolution audit

**Prepared:** 2026-11-22  
**Scope:** Source-level implementation and verification preparation for the issues enumerated in the owner's Phase 2 remediation brief.  
**Baseline:** `/mnt/data/WattScape-Phase2-Remediation-Pristine` (225-file source copy); work performed in a separate working copy. No Git repository was present.  
**Important source limitation:** The four specifically named documents supplied by the owner (`WATTSCAPE_COMPLETE_AUDIT.md`, `WATTSCAPE_FIXES_SUMMARY.md`, `WATTSCAPE_AUTHENTICATION_GUIDE.md`, and `WATTSCAPE_REMAINING_ISSUES.md`) were not present in the received source tree or retrievable project files. This file and the three companion files are newly created source-based replacements, not updates to unseen originals. Existing source documentation and the owner's issue brief were used as the evidence boundary.

## Executive outcome

This is a **partial engineering remediation**, not a production certification. Several implementable defects have been changed in source and regression tests have been added. Static checks that can run in this environment have been executed: five Python realm-template tests pass; Python scripts compile; both realm JSON files parse; theme JavaScript passes Node syntax validation; and six changed TypeScript/TSX files pass TypeScript transpile syntax checks. This is not a full semantic TypeScript check. Maven, Bun, Docker, PostgreSQL, Keycloak and a browser are not installed/available in this execution environment; consequently backend tests, Flyway execution, EXPLAIN, final frontend typecheck/lint/tests/build and connected OIDC/provider journeys cannot be claimed as passed.

| Workstream | Final status | Evidence / constraint |
|---|---|---|
| SPA password-grant separation | **IMPLEMENTED IN SOURCE — ISOLATED REALM VERIFICATION NOT RUN** | Browser client is Code + PKCE S256 with Direct Access Grants and implicit disabled. Legacy scripts target a distinct local-only smoke client. Five static configuration tests pass; live Keycloak was not changed in this pass. |
| Production brute-force controls | **IMPLEMENTED IN TEMPLATE — NOT DEPLOYED** | Keycloak 26.8.2 production template enables temporary lockouts and incremental delays; no production realm exists in this environment. |
| Production realm template | **IMPLEMENTED — PLACEHOLDERS ONLY** | Strict exact-origin placeholders, external SSL, PKCE, no password/implicit/service-account flow, audience mapping and SMTP placeholders. No production hostname/issuer/credentials invented. |
| Google / Apple | **CONFIGURATION-READY — NOT ACTIVE** | Existing scripts hardened for explicit target realm and read-back. Actual provider credentials and Apple verified domain unavailable. |
| JWT audience | **CONFIGURED IN SOURCE — RUNTIME TOKEN TEST NOT RUN** | Spring Boot 3.5.16 `audiences` property reads `JWT_AUDIENCE`; issuer/JWKS configuration remains. Keycloak audience mapper remains access-token-only. Existing integration tests mock the decoder. |
| Membership deactivation/revocation | **BLOCKED — PRODUCT POLICY REQUIRED** | Active-membership checks already gate protected tenant resources. No endpoint added because owner/role/reversibility/audit rules are undefined. |
| Automated telemetry retention | **BLOCKED — RETENTION POLICY REQUIRED** | `organizations.retention_days` alone does not define which telemetry and records are deletable or legal-hold rules. No purge job added. |
| Telemetry scan index | **IMPLEMENTED — DB VALIDATION NOT RUN** | Additive V6 B-tree index `(organization_id, site_id, observed_at DESC)` matches the actual all-metric latest-by-site query. V5 metric-specific indexes are preserved. |
| Analytics completeness | **IMPLEMENTED IN SOURCE — TEST NOT RUN** | 2,000-row bounded pagination and complete totals replace the 10,000-row partial-total behavior. A 10,005-point regression test was added. |
| Work-order due-date clearing | **IMPLEMENTED IN SOURCE — TEST NOT RUN** | Explicit `clearDueAt`; omitted `dueAt` preserves existing value; conflict payload rejected. UI set/update/clear controls added. |
| Auditor assignment | **IMPLEMENTED IN SOURCE — TEST NOT RUN** | Backend create/update rejects `Auditor/Read Only`; UI selector filters role. |
| Invitation commit/email | **IMPLEMENTED IN SOURCE — TEST NOT RUN** | After-commit event listener and failure isolation; not a durable outbox and no guaranteed retry/deduplication. |
| Invitation templates | **IMPLEMENTED IN SOURCE — TEST NOT RUN** | Single-pass placeholder substitution, HTML escaping and constant subject. |
| Invitation acceptance UI | **EXISTING FLOW PRESERVED** | Manual one-time token input remains; no token in URL or persistent storage was introduced. |
| AI privacy disclosure | **IMPLEMENTED IN SOURCE — PROVIDER APPROVAL PENDING** | Prompt excludes site name and organization identifiers; UI names configured provider host/model and explains transmitted aggregates and user question. Provider may retain/process under its own terms. |
| Authorization / tenant isolation | **EXISTING DESIGN PRESERVED; TARGETED FIXES ADDED** | `TenantContext` queries active memberships; `SiteService.requireSite` gates site-scoped services. Room listing/creation inspected. No broad auth rewrite. |
| Error status handling | **IMPLEMENTED IN SOURCE — TEST NOT RUN** | MVC exception advice explicitly maps authentication to 401 and access denial to 403; existing filter-level handlers retained. |
| Frontend lint regression | **FIX APPLIED IN SOURCE — MAC RE-RUN REQUIRED** | Removed AuthScreen ref read during render and corrected effect dependencies; `canUseAi` added to LivePhase4Operations dependency list. |

## Explicit issue classification

| Required class | Findings / disposition |
|---|---|
| **Already implemented; awaiting verification** | Existing `AssetController`; JWT issuer/JWKS/audience configuration and Keycloak audience/organization claim mappers; active membership lookup and site-scoped tenant checks; OIDC Code + PKCE callback lifecycle; provider status defaults disabled; existing invitation token hashing/one-time acceptance; append-only audit event design. These were inspected and preserved, not duplicated. Signed-token, live tenant, browser and provider runtime checks remain open. |
| **Confirmed defects requiring implementation** | SPA Direct Access Grants exposure (separated); all-metric telemetry latest-query index (V6 added); analytics 10,000-point partial totals (bounded full scan added); due-date null/omitted ambiguity (explicit `clearDueAt` added); Auditor assignment (backend validation and UI filtering added); invitation-before-commit and fragile template substitution (after-commit listener and one-pass escaped rendering added); MVC 401/403/500 handling (explicit mapping added). Regression tests were added for these source changes. |
| **Security improvements** | Production realm template with exact-origin placeholders, PKCE-only browser client, external SSL requirement and temporary brute-force lockout values; separate local smoke client; safer provider provisioning/read-back; active-membership validation preserved; AI prompt minimization and data-sharing disclosure. These are source/configuration improvements, not live certification. |
| **Incomplete integrations** | Google/Apple brokers remain unconfigured without credentials; AI provider has no supplied key and no real request was made; production SMTP, hosted identity, production domains/DNS/TLS, managed database/secret store and deployment remain unconfigured. |
| **Product-policy decisions requiring owner input** | Membership revocation authority/owner safeguards/reversibility/audit policy; telemetry data classes, legal holds, cutoff and purge cadence; external AI provider/DPA/retention/data residency/opt-in and approved disclosure; approved Terms/Privacy content; Google/Apple credentials and target domain; production hosting/domain/issuer/SMTP/database choices. Exact questions are in `WATTSCAPE_REMAINING_ISSUES.md`. |
| **Environment-dependent verification** | Final Bun typecheck/lint/tests/build; Maven compile/tests/Testcontainers; disposable PostgreSQL Flyway V6 application and EXPLAIN; live Keycloak Admin/API/actual OIDC browser flow; Mailpit invitation, verification and reset; social login; API signed-token audience/issuer/expiry negative tests; E2E/accessibility checks. |
| **Cannot safely resolve in this pass** | No membership-revocation endpoint without an approved role/owner policy; no telemetry purge without an authoritative retention policy; no bulk rewrite of existing Auditor work-order assignments without a read-only inventory and approved remediation; no mutation of the shared local Keycloak or existing databases; no production deploy or credential provisioning. |

## Findings and implementation detail

### P1 — Authentication and identity

1. **Public browser client had Direct Access Grants enabled.** The local SPA client now has `directAccessGrantsEnabled=false`, `standardFlowEnabled=true`, `implicitFlowEnabled=false`, and PKCE S256. Production template uses the same secure browser profile. The existing Python smoke scripts genuinely use password grant, so they now target a distinct `wattscape-local-smoke` client with no redirect URIs or web origins; that client exists only in local realm template/configuration and is absent from production. It must not be installed into the owner's currently shared Keycloak simply to make old scripts pass. OAuth security best practice discourages the password grant; the exception is only a constrained local test harness.
2. **Brute-force protection was not explicitly configured for production.** A separate production realm template uses temporary rather than permanent lockout: failure factor 5, multiple strategy, 60-second wait increments, 900-second maximum wait, quick-login minimum 60 seconds and 12-hour observation window. These are operational starting values, not an approved final fraud policy. No live Keycloak was changed.
3. **No complete production realm template existed.** Added a placeholder-only production template and deployment notes. Redirects/web origins are exact frontend-origin placeholders; there are no wildcard shortcuts. `sslRequired=external`; the trusted HTTPS reverse proxy still needs owner/deployment configuration.
4. **Google/Apple brokers were not configured.** Scripts now require explicit `--confirm-target-realm`, validate local/admin URLs and credentials, validate provider configuration read-back, and print the public callback. Apple renewal forwards explicit realm confirmation. No credentials were supplied, so no broker was configured and no provider is claimed functional.
5. **JWT audience enforcement.** Current application configuration uses Spring Boot's native `spring.security.oauth2.resourceserver.jwt.audiences: ${JWT_AUDIENCE:wattscape-api}` and retains `issuer-uri`/JWKS settings. Realm templates keep an access-token audience mapper for the configured audience; ID-token inclusion is false. No custom `JwtDecoderConfig` or `AudienceValidator` source exists in this received snapshot. Existing integration tests replace the decoder with mocks, so signed-token rejection of missing/wrong audience, issuer and expiry is **not runtime-proven** here.

### P1 — Membership and authorization

6. `organization_users.status` supports active/invited/revoked. `TenantContext.requireMembership` and membership selection filter `status='active'`; `SiteService.requireSite` is used by site-scoped APIs. The room list requires a site and therefore active membership; room creation additionally requires an allowed write role and verifies the floor belongs to the organization/site. A new membership-revocation endpoint was **not** added because product rules are not defined: permitted revoker roles, owner-to-owner behavior, last-owner protection, reversibility and historical/audit retention must be decided first.
7. The general security filter maps unauthenticated requests to 401 and authenticated role denials to 403. URL role matchers do not replace service-level authorization: `TenantContext.requireRole` and per-site ownership checks remain in service paths. The global MVC handler now also maps Spring `AuthenticationException` and `AccessDeniedException` to 401/403 and preserves safe generic 500 output. No full security penetration test was run.

### P2 — Telemetry, retention and analytics

8. `organizations.retention_days` exists, but the source documentation does not define which data classes it governs, deletion cutoff semantics, legal hold, export/backup policy or audit retention. The Operations Runbook retention proposal concerns backup files, not telemetry. Automated deletion was not implemented; deleting telemetry under an assumed policy would be unsafe.
9. The latest telemetry endpoint filters only by organization and site, then sorts across all metric keys by `observed_at DESC` with a row limit. V5's `ix_telemetry_site_metric_time` begins with `metric_key`, so it does not directly support that query shape. Added V6 index `ix_telemetry_site_latest` on `(organization_id, site_id, observed_at DESC)`. The existing V5 metric-leading index remains for metric-specific history. Migration and EXPLAIN remain NOT RUN against PostgreSQL.
10. Analytics previously loaded up to 10,000 measurements while deriving energy/water/power totals and daily results from that truncated subset. It now obtains a count, processes all matching rows in 2,000-row batches in a repeatable-read transaction, orders deterministically by observed time and id, and throws rather than returning an incomplete aggregate if pagination unexpectedly ends early. Existing quality filtering, effective-dated factor semantics, missing-factor caveats and mixed-currency suppression are retained. The DTO's `truncated` flag remains for compatibility and is false when full aggregates are returned. Added test covers 10,005 readings; it has not been executed here.

### P2 — Work orders and invitations

11. `PATCH` now distinguishes omitted `dueAt` (preserve), supplied timestamp (set/update), and `clearDueAt=true` (explicit null). Sending both set and clear is a validation error. Frontend includes create due date, update control and clear action.
12. Auditor/Read Only is excluded from assignment UI and rejected by the service for both create and update API paths. New assignment requires an active member found by member ID + current organization, so cross-organization IDs are rejected. Added service tests cover active Technician allow, Auditor deny and cross-organization deny (not executed here). Existing persisted work orders were not queried or rewritten; inventory any legacy Auditor assignment in an isolated database before deciding whether to reassign/clear them. No existing assignment data was destructively changed.
13. Invitation email event dispatch now occurs at `TransactionPhase.AFTER_COMMIT`, so a rolled-back create transaction does not send an invitation. Delivery failures are logged without token/email and do not imply rollback of a committed invitation. This is not a transactional outbox; process crash after commit, retry and deduplication remain operational limitations.
14. Invitation templates now use one-pass placeholder replacement and HTML escape user-controlled variables. This prevents a name like `${role}` from triggering a second placeholder replacement. Subject is constant. Invitation token remains hashed in the database and manual-entry UI is unchanged.

### P2 — AI data sharing

15. The external AI prompt no longer contains the full site name, organization identifier or user identifier. It still sends the selected task, user-entered question, 30-day aggregate energy/water/power values, sample count, caveats and open-work-order count to the configured provider. The UI names provider host/model when available and explicitly warns that the question is forwarded. It does not claim anonymity, non-retention or confidentiality. Owner approval, provider contract/retention review and policy/legal disclosure remain required before real organizational use.

### Preserved Phase 2 work

- `AssetController`, JWT audience application property, existing Keycloak audience/organization claim mappers, Google/Apple brand icons and authentication wording were preserved.
- OIDC client architecture remains Authorization Code + PKCE; no React password submission was added.
- Tenant context and site access service checks were preserved.
- Local theme branding already applied by the owner to their existing shared Keycloak according to their terminal output; no running realm was changed during this remediation.

## Verification state

| Check | Result | Notes |
|---|---|---|
| Owner's earlier Mac `tsc --noEmit` and `tsc -p tsconfig.e2e.json` | **PASS for the pre-remediation auth patch only** | This preceded the current work-order/AI UI changes; rerun against final archive. |
| Owner's earlier Mac oxlint | **FAIL** | 13 warnings vs maximum 11; no lint errors. Two warnings came from the auth screen change and were fixed in this source. Current Mac lint has not been rerun. |
| Owner's earlier `bun run check` tests/build | **NOT RUN in that run** | Lint stopped the chain before tests/build. |
| Python realm config unit tests | **PASS** | `python3 -m unittest backend/keycloak/test_realm_configs.py -v`: 5 tests passed. |
| Python compile / JSON / Node theme JS syntax | **PASS** | Changed Python scripts compiled; local + production realm JSON parsed; `node --check` passed for theme JavaScript. |
| TypeScript/TSX transpile syntax | **PASS — SYNTAX ONLY** | Six changed frontend/test files transpile without syntax diagnostics using installed TypeScript; no project semantic typecheck or dependency resolution was possible here. |
| Maven compile/unit/integration/security | **NOT RUN** | Maven and project dependencies unavailable. |
| Flyway V6 validation/apply | **NOT RUN** | No PostgreSQL/Flyway runtime here. |
| EXPLAIN / EXPLAIN ANALYZE | **NOT RUN** | PostgreSQL not available. |
| Browser OIDC / email / reset | **NOT RUN** | Keycloak/browser unavailable in this environment. |
| Google / Apple broker | **BLOCKED** | External credentials and verified domain unavailable. |
| Production deployment | **NOT RUN / NO-GO** | No deployment requested or performed. |

## Release decision

**NO-GO for production.** This package is an implementation candidate with static and owner-side checks still required. Outstanding blockers include isolated Keycloak OIDC/browser tests, real JWT audience/issuer/expiry verification, Maven/Testcontainers suite, Flyway/PostgreSQL migration and query-plan checks, provider credentials, approved retention and membership policies, AI data-sharing approval, production DNS/TLS/SMTP/secret store and deployment operations.
