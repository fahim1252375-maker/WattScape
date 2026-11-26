> **Historical status notice (2026-11-25):** This report records the earlier pre-migration/pre-startup snapshot. Its statements that V6 was unapplied and the host API was absent were superseded by owner-provided Mac evidence recorded in [PHASE4-MAC-LOCAL-ACCEPTANCE-UPDATE-2026-11-25.md](PHASE4-MAC-LOCAL-ACCEPTANCE-UPDATE-2026-11-25.md) and [the latest release status](../LATEST-RELEASE-STATUS.md). The current decision remains local acceptance partial and production NO-GO.

# WattScape Phase 4 — Final Completion and Local Acceptance Report

**Prepared:** 2026-11-25 (Asia/Dhaka)  
**Candidate:** `~/Documents/Codex/2026-11-21/files-mentioned-by-the-user-wattscape/work/release-candidate/WattScape-Phase4-100-Score-Final-Source`  
**Production decision:** **NO-GO**

## Executive result

The release candidate has substantial implementation and owner-reported test evidence, but the remaining live acceptance is not complete. In particular, the host-run Phase 4 API on port 8082 is currently reported absent; the database reported on 55432 has only V1–V5 and is a different container from the root Compose PostgreSQL service; and the root Compose smoke/backup scripts target that Compose service rather than selecting a database by `DATABASE_URL`. Do not run those scripts or start the API with Flyway enabled until the database identity, backup, and owner approval gates in [the remaining commands](PHASE4-LOCAL-REMAINING-COMMANDS.md) are satisfied.

This report does not assert local Mac tests were rerun by this authoring environment. Owner-terminal results below are explicitly attributed to the owner. The attached “Final Completion & Local Acceptance Sprint” text was not present at its supplied filesystem path in this session; this report follows the task details carried in the conversation and inspected candidate source.

## Evidence and status matrix

Evidence provenance: **Source inspection** means checked-in code/configuration was read. **Owner-provided terminal evidence** means the output was supplied in conversation, not independently rerun here. **This session** means the command was actually executed in the current environment.

| Gate | Status | Evidence and provenance |
|---|---|---|
| Frontend typecheck, lint, unit/domain tests, build | PASS (owner-provided) | Owner reported typecheck PASS, lint with 0 warnings, Vitest 31 and Node domain tests 11. Not rerun in this session. |
| Playwright UI E2E | PASS (owner-provided; disconnected UI scope) | Owner reported 10/10 on Mac. The current runbook describes these as synthetic demo-UI tests, not connected OIDC/API acceptance. |
| Maven `clean verify` | PASS (owner-provided) | Owner reported 68 tests, 0 failures, 0 errors, 1 optional Mailpit skip; Signed JWT 6/6, Tenant Isolation 10/10, Telemetry 10/10, Scratch Restore 1/1. Not rerun here. |
| Docker/Testcontainers-backed focused runs | PASS (owner-provided) | Same owner evidence above. These use disposable test containers; they do not prove the host database on 55432 is safe/current. |
| Bun dependency audit | BLOCKED | This session ran `bun audit --audit-level=low`; exit 1: `DNSResolveFailed` contacting `registry.npmjs.org`. No vulnerability-free conclusion can be drawn from this retry. |
| Candidate V1–V6 migrations | PASS in source; V6 NOT APPLIED to reported runtime DB | **Source inspection:** migrations V1–V6 exist; Flyway is enabled on normal Spring startup. V6 adds `ix_telemetry_site_latest` on `(organization_id, site_id, observed_at DESC)`. **Owner-provided runtime evidence:** reported 55432 DB is V1–V5, no V6. |
| Host-run API on 8082 | BLOCKED / NOT RUN in this session | Owner reported no listener on 8082. No current-session localhost health check was performed. Root Compose publishes API 8080 and sets `PORT=8080`; Maven verification packages/tests but does not start a host API. |
| Keycloak discovery on 8081 | PASS (owner-provided discovery only) | Owner reported HTTP 200 at discovery. This does not prove the actual realm/client/claims or API token acceptance. |
| Real Keycloak-to-frontend-to-API acceptance | NOT RUN / BLOCKED | No end-to-end browser evidence was provided for callback, signed token acceptance by the Phase 4 API, audience/role/organization mapping, or tenant-scoped workflow on the candidate runtime. |
| Database on 55432 identity and backup | BLOCKED pending owner confirmation | Owner reported container ID `271b39750e669f52c58baa299a78678ffe8a729cafda47ebc55f6c30228f5722`, V1–V5, no `LOCAL-RUNTIME-01`, zero sites, and a persistent volume. The exact volume identity and independent backup verification are not yet evidenced here. |
| Phase 4 smoke script | NOT RUN | Inspected script is write-capable; it writes synthetic records, uses password-grant Keycloak tokens, creates a backup through `docker compose ... exec postgres`, and intentionally retains data. The running 55432 container was reported different from root Compose PostgreSQL. |
| Production provider/operations gates | NOT RUN / BLOCKED | Provider-managed backups/PITR and offsite restore, production identity, SMTP delivery, live monitoring/alerting, hosting/DNS/TLS/secrets/deployment, load/accessibility, and independent security assessment remain unverified. |

## Why the runtime stopped at V1–V5 and why 8082 is absent

### Facts established from source

- `backend/src/main/resources/application.yml` sets `spring.flyway.enabled: true`; Spring Boot applies pending migrations during normal application startup.
- The same configuration defaults the API to port 8080 (`PORT` overrides it) and PostgreSQL to `localhost:5432` unless `DATABASE_URL` overrides it.
- `docker-compose.yml` publishes root Compose PostgreSQL on `127.0.0.1:5432` with the persistent named volume `wattscape-postgres`; its API service explicitly sets `PORT=8080` and publishes `127.0.0.1:8080`.
- `docs/PHASE4-HOST-RUNTIME.md` documents a separate host-run candidate arrangement using PostgreSQL port 55432 and API port 8082. That guide identifies the local Keycloak on 8081 as shared infrastructure; it is not an isolated IdP.
- Maven `verify` does not start the host-run API. The candidate JAR exists in the workspace, but its existence alone is not proof that the candidate process is running or that it reached the intended database.
- The checked-in root Compose smoke and backup helpers execute `docker compose ... exec postgres`. They follow the root Compose project/service, not the database implied by a host API URL.

### Runtime evidence and limits

Owner-provided runtime observations say the database publishing 55432 is container `271b39750e669f52c58baa299a78678ffe8a729cafda47ebc55f6c30228f5722`, has successful migrations only through V5, and differs from the root Compose `postgres` container (reported `created`, not running). Owner also reported the root project as `wattscape-phase4-100-score-final-source`, the running older Phase 1 services on 5432/8080/8081, and no candidate API listener on 8082.

These observations explain the likely operational discrepancy: the API process that would apply V6 is absent, while the root Compose API would use port 8080 and root Compose PostgreSQL on 5432. **The exact historical reason** a prior migration/start attempt stopped at V5 cannot be established without that process's startup logs and Docker event/log evidence. No such logs were inspected in this session. Do not infer a Flyway defect from the non-fatal repository-metadata HTTP 401 seen in older owner evidence; the owner reported Maven verification succeeded.

## Database recovery plan and approval boundary

No database command that writes persistent state was run. V6 is a small additive index migration, but applying it still changes the persistent database schema. After the owner independently confirms the container, Compose project/service, volume, database name, and a verified custom-format backup, the proposed operation is: **start this candidate JAR against the confirmed container/database on host port 55432, with Flyway validation enabled, so Flyway can apply V6 only**. Expected DDL is `CREATE INDEX ix_telemetry_site_latest ON telemetry_points (organization_id, site_id, observed_at DESC)`. No reset, table rewrite, delete, or down migration is proposed. The API startup would also expose application endpoints; keep it bound to loopback and do not perform application writes until a separate synthetic QA-data plan is approved.

The recovery plan is reviewable, but the actual migration and synthetic provisioning have not been performed. Owner authorization is still required before either persistent action. Site/floor/work-order acceptance would require additional synthetic rows and a separately approved target/data plan. Do not run `seed-local-organization.sql` against the shared realm/database: it has fixed local identities and data. Do not use `provision-organization.sql` until its exact issuer/subject and destination are reviewed.

## Remaining findings by priority

### P0 — Release blocking

- Candidate API is not reported running on 8082, and no connected frontend-to-candidate API journey is evidenced.
- Persistent database target identity, volume identity, and verified backup are not independently established in this report; V6 remains unapplied per owner evidence.
- Do not execute `verify-phase4-smoke.py`: it targets root Compose PostgreSQL, while the reported 55432 database is a different container. It writes retained data and obtains local Keycloak password-grant tokens.

### P1 — Required before broader release acceptance

- Real signed Keycloak login and logout through the actual frontend and candidate API, including exact issuer, audience, realm roles, organization claim, membership, ADMIN/MEMBER permissions, cross-tenant denial, and session expiry.
- Synthetic database/site/floor data and Phase 4 spatial, telemetry, work-order, analytics, and AI-disabled workflow acceptance against the candidate API.
- Production identity-provider configuration, SMTP delivery, database backup/PITR and offsite restore, live alert delivery, deployment/secret/TLS controls, and load/accessibility/security assessment.

### P2 — Supply chain and product follow-through

- Retry `bun audit --audit-level=low` after DNS/network recovery. Current retry is blocked; do not call it clean.
- Reassess the Three.js lazy chunk warning from a fresh build on the owner Mac. Earlier source/audit notes report a large separate 3D chunk; no new build was run here.
- Confirm CI has completed on the release-candidate revision and required checks are enforced; local Maven success is not hosted CI evidence.

### P3 — Evidence housekeeping

- Capture fresh, redacted test summaries with provenance and exit codes. Do not include `.env` values, bearer tokens, cookies, passwords, keys, DB row dumps, or unredacted diagnostics.
- The prior verified ZIP remains untouched. A new uniquely named documentation-inclusive archive is created separately as described in the handoff instructions.

## Safe next-stage order

1. Follow [PHASE4-LOCAL-REMAINING-COMMANDS.md](PHASE4-LOCAL-REMAINING-COMMANDS.md) to inspect Docker target identity and database state with read-only commands.
2. Make and verify a protected direct-container dump of the exact 55432 database. Do not use the Compose helper unless the service/container identity is proven identical.
3. Stop for owner approval before applying V6 or creating any synthetic persistent data.
4. After approval and migration, start the API bound to loopback on 8082; verify readiness and unauthenticated 401 without sending writes.
5. Run browser login and tenant/workflow acceptance only with isolated synthetic identity and QA data. The currently documented shared Keycloak must not be modified for this task.
6. Retry dependency audit after DNS recovery; capture actual output.
7. Keep production **NO-GO** until all production gates listed above have independent evidence.

