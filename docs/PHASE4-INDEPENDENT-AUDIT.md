# WattScape Phase 4 — Engineering Completion Report

**Audit date:** 2026-11-22 (Asia/Dhaka)  
**Decision:** **NO-GO for production release**  
**Evidence score:** **66/100**. The score is an evidence-based engineering-readiness score, not a claim of completion. A score of 100 is not warranted while browser, connected workflow, provider, hosted CI, and production-readiness gates remain open.

## Executive summary

I verified the supplied audited source and patch hashes, extracted a clean copy of the complete audited source, reran frontend/backend checks sequentially on this Mac, added measured route-level code splitting, prepared monitoring templates, added a source-hygiene check to CI, and completed a genuine isolated Flyway-managed PostgreSQL dump/restore drill.

The main entry bundle dropped from **646.60 kB / 166.43 kB gzip** to **366.86 kB / 110.23 kB gzip** (43.3% smaller raw; 33.8% smaller gzip). The 3D twin remains a separate lazy-loaded chunk at **1,020.73 kB / 279.46 kB gzip**, so the build-size warning remains. The full Maven verification passed **39 tests, 0 failures, 0 errors, 1 skipped**. The real scratch restore test covered two synthetic tenants, checksum validation, Flyway validation, unchanged source data, and four safety refusals.

Playwright still cannot run assertions in this Mac environment: the cached Chromium process failed macOS `bootstrap_check_in` with permission denied and SIGTRAP. Connected-mode browser workflows are also not implemented. There is no live OIDC/Phase 4 smoke evidence, GitHub-hosted CI result, provider monitoring deployment, real DNS/TLS/managed identity/database/SMTP setup, production-size load test, or penetration test.

## Source and authority

The supplied audited baseline hash was independently recomputed as `6335e50ed12c2f8f13657476a1036ad84156bbe58a7055bee1fcd9127660c11f`. The supplied incremental-patch archive hash was independently recomputed as `a6436da591213be6b583831c1246969089ce5d5eb43d375fff94913a04b5d9b4`. Both matched the user-provided values.

The full audited source is the baseline. The previous patch applies to a different corrected-source base and was not reapplied. Older remediation and execution reports were treated as historical where they conflict with the source's independent audit. The attached Mac guide was available and reviewed. Embedded instructions were not treated as permission to restart the machine, mutate the running stack, deploy, or change persistent data.

The original source ZIP contained 211 files. The completion source contains 217 files after adding the scratch restore integration test, source hygiene scanner, four monitoring template files, and updated audit documentation. Generated `node_modules`, `dist`, Maven `target`, Playwright results/traces, populated environment files, and local browser caches are excluded from the final source archive.

## Weighted readiness scorecard

| Category | Score | Acceptance criteria and actual evidence | Remaining defects / owner action |
|---|---:|---|---|
| Product implementation and functionality | 8/10 | Phase 4 spatial, telemetry, energy analytics, work-order and AI-disabled paths exist in source; unit/domain tests pass; backend API tests pass. | No connected end-to-end customer workflow proof; OIDC, device lifecycle and operations against an approved live-like environment remain owner gates. |
| Frontend correctness and performance | 9/12 | Frozen install, app and E2E TypeScript, lint, 23 Vitest + 11 domain tests, build, and dependency audit passed. Route-level lazy loading reduced the main entry by 43.3% raw / 33.8% gzip; 3D remains independently lazy-loaded. | 11 accepted lint warnings; 1,020.73 kB 3D chunk warning; full browser UX, keyboard/accessibility, visual and performance-budget evaluation not completed. |
| Backend correctness and tests | 11/12 | Maven `verify`: 39 tests, 0 failures/errors, 1 opt-in Mailpit skip; tenant integration uses random-port Testcontainers PostgreSQL 17.6; Flyway V1–V5 applied. | No live provider integration; Maven printed a non-fatal 401 while probing private Flyway repository metadata, although the build succeeded using resolved dependencies. |
| Authentication and tenant security | 11/14 | Security tests cover roleless GET/POST/PUT/PATCH/DELETE denial, MEMBER/Admin restrictions, membership checks, cross-tenant isolation, ADMIN-only metrics and docs. CORS remains allow-list based; JWT API is stateless. | Local OIDC script not run; no live role mapping/JWKS/browser callback test or penetration test. Monitoring's current ADMIN token is privileged; isolate and protect it. |
| Browser E2E and connected workflows | 2/12 | Nine demo/configuration/3D scenarios are defined and E2E TypeScript passes. A real Playwright attempt ran, but all 9 stopped at browser launch before test bodies. | Browser launch blocked by macOS permission denial/SIGTRAP. Connected authentication, tenancy and Phase 4 operational workflows are not implemented as browser tests. Run on supported CI/runner and add workflows. |
| Monitoring and observability | 4/8 | Prometheus registry and HTTP histogram enabled; `/actuator/prometheus` is ADMIN-only and tested. Provider-neutral scrape, alert and Grafana dashboard templates added. YAML/JSON parse checks passed. | No live scraper/dashboard/alert receiver. No per-device telemetry lag, work-order outcome, SMTP failure counter or AI cost instrumentation. Provider and private network/credential rotation are owner actions. |
| Backup, restore and disaster recovery | 7/10 | Genuine test in tmpfs-backed Testcontainers PostgreSQL 17.6: real Flyway V1–V5 migration, custom `pg_dump` archive, actual restore helper, SHA-256, restored Flyway validation, tenant record/count comparison, unchanged source; negative guards for missing confirmation, wrong checksum, existing target, active DB-name collision passed. | The local backup script's Docker Compose wrapper was not run against the running owner stack. Managed PITR, off-site encryption, production-sized recovery time and disaster environment remain unverified. |
| Production configuration and infrastructure | 5/10 | Vercel/Netlify and Keycloak/backend/PostgreSQL/SMTP templates exist; local and production Keycloak Compose configs parsed without starting services. HSTS is not enabled without a confirmed HTTPS domain. | No provider, DNS, TLS, managed DB/IdP/SMTP, secret store, real support email or production environment is provisioned. Owner must supply and approve values. |
| CI/CD and supply-chain security | 5/7 | Workflow syntax parsed. CI defines frozen install, app/E2E types, lint, frontend tests/build, Maven and Playwright; dependency audit and source-hygiene steps added. | GitHub-hosted run and branch protection not observed; container/image scanning and third-party security review not run. Owner must inspect first Actions result and enforce required checks. |
| Documentation and operations | 4/5 | Current audit reconciles historical claims; runbook distinguishes templates from live monitoring and historical emulated restore evidence from the genuine current drill; Mac commands and release checklist supplied. | Provider-specific operating values, measured production SLOs/RPO/RTO, alert routing and restore ownership require owner decisions. |
| **Total** | **66/100** | | |

## Execution environment and sequential evidence

Execution occurred in the actual attached Mac shell (Darwin ARM64), not Linux: macOS 27.0, Node 24.21.0, Bun 1.4.5, Temurin Java 21.0.13.1, Maven 3.10.1, Docker Desktop 29.9.3 / Compose 5.7.0. Testcontainers used PostgreSQL 17.6 with random host ports. Docker's read-only inventory showed the owner's WattScape containers were already running; no commands were sent to their Compose project or persistent database/volumes.

Exact start/end times, duration, exit code, command, and sanitized output for the final sequential gate pass are in the evidence archive and in `sequential-gates.md` included there.

Final sequence results (2026-11-22, Asia/Dhaka):

- `bun install --frozen-lockfile` — PASS, exit 0.
- `bun run typecheck` (app plus E2E TypeScript) — PASS, exit 0.
- `bun run lint` — PASS, exit 0, 11 warnings, zero errors.
- `bun run test` — PASS, 23 Vitest and 11 Node domain tests.
- `bun run build` — PASS, 2,246 modules; main entry 366.86 kB / 110.23 kB gzip; lazy 3D chunk 1,020.73 kB / 279.46 kB gzip.
- `bun audit --audit-level=low` — PASS, no advisories in 367 packages.
- `python3 tools/verify-source-hygiene.py .` — PASS, high-confidence credential-file/pattern scan of 217 source files. This is a repository hygiene scanner, not a commercial penetration or secret-scanning assessment.
- Workflow, Compose, Prometheus/alert YAML and Grafana JSON parsing — PASS. Local and production example Compose configs rendered with placeholder/example values; no service started.
- `bun run e2e` — BLOCKED, exit 1. All 9 scenarios failed before assertions. Cached Playwright Chromium logged `bootstrap_check_in ... Permission denied (1100)` and SIGTRAP. A separate fresh run initially reported the locked browser executable missing; the installer stalled without output and was interrupted. Do not interpret this as 9 application assertion failures.
- Maven `verify` with Mockito agent — PASS, 39 tests, 0 failures, 0 errors, 1 opt-in Mailpit skip. This included the scratch restore drill and ten tenant isolation integration tests.

## Genuine scratch restore evidence

The restore test is source-controlled at `backend/src/test/java/com/wattscape/site/ScratchRestoreDrillIntegrationTest.java`. It uses an isolated PostgreSQL 17.6 Testcontainer with its data directory on tmpfs; it does not connect to the already-running owner stack. Flyway migrated a scratch source through all five SQL migrations. Two synthetic tenants and sites were inserted. A custom-format dump was made with the same `pg_dump --format=custom` options as the backup helper, SHA-256 computed, and fed to `backend/scripts/restore-drill-scratch.sh`. The helper restored into a new database. Flyway validated the restored history; counts and representative rows matched; both tenant partitions remained present; source snapshot was unchanged. The scratch drill took 2.1 seconds in the latest final run (tiny test data only).

Refusal checks passed for missing confirmation, wrong checksum, existing target name, and active database-name collision. The test's disposable container lifecycle removed its temporary scratch service. No owner database, Docker Compose project, or persistent volume was targeted. The local backup helper's Compose wrapper itself still needs a separate run against a dedicated scratch Compose project; no production-like recovery claim is made.

## Security and operations findings

- Prometheus endpoint and API docs remain `ADMIN`-only; health/info are public with health details hidden. Authorization tests passed.
- HTTP request histograms are enabled to support p95 queries. Monitoring templates are configuration examples, not live alerts. A Prometheus service account with ADMIN role is highly privileged under the current policy; keep its token file in a secret manager, rotate it, and restrict scrape traffic to a private HTTPS route.
- The health probes, structured request IDs, tenant-scoped repository checks, invitation/device protections, CORS allow-list, and stateless bearer API were reviewed. Automated tests are not a penetration test.
- HSTS remains absent until a real HTTPS domain is confirmed. CSP remains unenforced pending browser validation for WebGL and OIDC redirects.
- The placeholder `support@wattscape.example` and all production variables require owner replacement/approval.
- `verify-local-oidc.py` and `verify-phase4-smoke.py` were inspected but not run. The extracted source has no populated `backend/.env`; the scripts require real local identities and the smoke script writes records. Do not point them at the existing persistent stack. Use a dedicated disposable environment.

## Release gates and owner actions

1. Run all 9 current E2E scenarios on the supported Ubuntu GitHub runner or another supported browser runner; save the actual report. Then implement and run connected OIDC/role/tenant/spatial/telemetry/work-order browser workflows with synthetic fixtures.
2. Run the local backup wrapper against its own scratch Compose project and validate the provider-selected managed PostgreSQL PITR/off-site encrypted backup path. Measure restore time at representative data volume and set owner-approved RPO/RTO.
3. Provision a disposable OIDC/SMTP-like integration environment and run the inspected local OIDC and Phase 4 smoke scripts without production identities/data.
4. Choose the monitoring provider, deploy private scrape/auth, wire alert receivers, and add missing telemetry/work-order/SMTP/AI metrics before alerting on them.
5. Replace support/config placeholders; provision approved DNS/TLS, IdP, managed DB, SMTP, secret store and private routing. Validate CSP before enforcement and add HSTS only after HTTPS verification.
6. Observe a real GitHub Actions run, enable branch protection/required checks, and choose a container/image scanner. Review results before release.
7. Decide whether to accept the remaining lint warnings and 1,020.73 kB lazy 3D chunk; preserve the 3D twin and measure on actual target hardware.

Until these gates are closed, keep the release **NO-GO**. No production deploy or live service mutation was performed.

## Category command map

These are the exact commands relevant to each score category; run from a fresh source root unless noted. The final sequential execution record is in `WattScape-Phase4-E2E-and-Restore-Evidence.zip`.

| Category | Commands actually run or required to reproduce |
|---|---|
| Product implementation and functionality | `bun run test`; `cd backend && mvn --batch-mode --no-transfer-progress -DargLine=-javaagent:<resolved-mockito-core.jar> verify` |
| Frontend correctness and performance | `bun install --frozen-lockfile`; `bun run typecheck`; `bun run lint`; `bun run test`; `bun run build`; `bun audit --audit-level=low` |
| Backend correctness and tests | `cd backend && mvn --batch-mode --no-transfer-progress -DargLine=-javaagent:<resolved-mockito-core.jar> verify` |
| Authentication and tenant security | Same Maven `verify` command (includes authorization and tenant isolation integration tests); `python3 backend/scripts/verify-local-oidc.py` and `python3 backend/scripts/verify-phase4-smoke.py` were inspected but **NOT RUN** |
| Browser E2E and connected workflows | `bun run e2e` — attempted, BLOCKED at browser launch; connected workflow tests are not implemented |
| Monitoring and observability | YAML/JSON parser checks for `deploy/monitoring/*.yml.example` and `*.json.example`; Maven `verify` for endpoint access tests. No live provider command was run. |
| Backup, restore and disaster recovery | Included in Maven `verify`; the test runs the source-controlled `ScratchRestoreDrillIntegrationTest` against tmpfs Testcontainers. Provider PITR and backup Compose wrapper were NOT RUN. |
| Production configuration and infrastructure | `docker compose -f docker-compose.yml config --quiet`; `docker compose -f deploy/keycloak/docker-compose.production.example.yml config --quiet`; no service start/deploy. |
| CI/CD and supply-chain security | `bun audit --audit-level=low`; `python3 tools/verify-source-hygiene.py .`; workflow YAML parsed locally. GitHub-hosted CI was NOT RUN. |
| Documentation and operational readiness | Manual source/runbook and archive review; no automated pass is claimed. |

`<resolved-mockito-core.jar>` means the absolute path to the Mockito Core agent JAR resolved in the local Maven cache; the actual invocation used the version recorded in the evidence log. No external credentials or live production services were used.
