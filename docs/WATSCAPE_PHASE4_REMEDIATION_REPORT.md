# WattScape Phase 4 — Remediation and Readiness Report (Historical Snapshot)

> This report records the state immediately after the original remediation. The independent audit addendum at `docs/PHASE4-INDEPENDENT-AUDIT.md` records later verified changes and current status; older statements below are historical where superseded.

**Date:** 2026-11-21
**Branch / commit:** not available (source delivered as a ZIP snapshot; no `.git` directory)
**Agent / environment:** Claude, Linux sandbox (Ubuntu 24.04, Node 22.23.5, Bun 1.4.5, Chromium 153 via cached Playwright browser, PostgreSQL 16.15, OpenJDK 21 JRE with `jdk.compiler` module, no Docker, no Maven)
**Source snapshot:** `WattScape-Phase4-Current-Source.zip` (199 files). Pristine baseline retained for diffing.

## Executive summary

- **Development status:** Remediation applied to the frontend toolchain, quality gates, E2E tests, production templates, backup/restore tooling and one backend authorisation hardening. Backend changes are syntax-checked only.
- **Frontend verification status:** PASS on the clean copy: frozen install, typecheck (app and E2E), lint (zero errors, 13-warning ratchet), 34 unit and domain tests, production build, and a `bun audit` run.
- **Backend verification status:** BLOCKED. Maven, javac compilation against Spring, Docker/Testcontainers, the local OIDC check and the Phase 4 smoke script could not run in this environment.
- **Browser E2E status:** PASS for 9 demo-mode and no-identity-provider tests against the production build. Connected-mode (live API, role/tenant UI, error and empty states) NOT RUN.
- **Production configuration status:** Readiness templates and documentation written. Nothing provisioned. Keycloak production compose not validated (Docker unavailable).
- **Monitoring / backup / restore status:** Restore drill executed on a real PostgreSQL 16 scratch cluster with real migration SQL (Flyway itself not run). Metrics endpoint not implemented.
- **Production deployment:** NOT PERFORMED.
- **Overall release recommendation: NO-GO** (see readiness scores).

## 1. TypeScript / Drei root cause

- **Reproduction command:** `bun run typecheck` (`tsc --noEmit`), `cwd` = project root, bounded with a 300 s watcher. Plus diagnostic fixtures under a temporary `tsconfig` extending the project config.
- **Compiler versions tested:** TypeScript 7.0.2 (project pin, `^7.0.2`, locked) and TypeScript 6.0.3 (diagnostic only, installed outside the project).
- **Observed behaviour:**
  - Official typecheck on the baseline: exit 1 in 2.0 s. Output: four `TS2591` errors. This is a real failure, not a timeout.
  - Drei-only fixture (`import { OrbitControls } from '@react-three/drei'`): exit 0 in 0.88 s (970 files resolved).
  - Fiber-only and Three-only fixtures: exit 0 in under 0.7 s.
  - Whole `BuildingTwin3D.tsx` plus domain/context files: exit 1 in 1.2 s (only the four `TS2591`).
  - TypeScript 6.0.3 reports the same four errors (exit 2 by its error convention) and is slower on this machine.
  - With `skipLibCheck` disabled as a diagnostic, `src/` produced zero errors. Two declaration conflicts remain inside `node_modules/three-stdlib` (`SVGLoader.d.ts` TS2430, `TGALoader.d.ts` TS2416), against `@types/three@0.187.0`.
- **Actual root cause (of the failing gate):** `tsconfig.json` sets `types: ["vite/client"]`, so `node:test` and `node:assert` are not typed for `src/domain/calculations.test.ts` and `src/domain/validation.test.ts`.
- **Root cause of the reported hang:** **UNRESOLVED / NOT REPRODUCED.** No hang occurred on Linux with TypeScript 7.0.2 and Drei 10.7.9. The owner's timeout may be platform-specific (macOS arm64 native compiler binary) or caused by an earlier tsconfig. This must be re-checked on the owner's Mac.
- **Fix applied:** file-scoped `/// <reference types="node" />` in the two test files. Global types were not widened, so browser code cannot silently use Node globals. Dependencies were not changed for TypeScript or 3D packages.
- **Evidence:** `bun run typecheck` exit 0 (1.7 s before lint cleanup; exit 0 again in the clean copy at 5.1 s, including `tsconfig.e2e.json`).
- **3D functionality preserved and how verified:** no 3D source was changed. Playwright tests mount the canvas under SwiftShader, drive OrbitControls (drag and wheel) with no page errors, and check the viewport resize path. The fallback text path is also asserted. The 3D chunk remains lazy-loaded.

## 2. Frontend checks

Clean copy, fresh frozen install. Durations are wall clock from the watcher script.

| Check | Exact command | Exit code | Duration | Status | Notes |
|---|---|---:|---:|---|---|
| Frozen install | `bun install --frozen-lockfile` | 0 | 5 s | PASS | 270 packages |
| Typecheck | `bun run typecheck` (`tsc --noEmit && tsc -p tsconfig.e2e.json`) | 0 | 5.1 s | PASS | Baseline was exit 1 (4× TS2591) |
| Lint | `bun run lint` (`oxlint --react-plugin --max-warnings 13 src`) | 0 | 1.0 s | PASS (ratchet) | Baseline 58 warnings; now 13 warnings, 0 errors |
| Unit tests | `bun run test` (Vitest part) | 0 | 11.2 s (both suites) | PASS | 23 tests, 5 files |
| Domain tests | `bun run test` (Node runner part) | 0 | (included above) | PASS | 11 tests, 0 failures |
| Production build | `bun run build` | 0 | 6.1 s | PASS | Warning: 3D chunk 1,020.69 kB (279 kB gzip), lazy-loaded |
| Dependency audit | `bun audit` | 0 | 0.5 s | PASS | No vulnerabilities across 367 packages, against the advisory database available at run time |

Build output sanity: a scan of `dist/` found no `GEMINI`, `AI_API_KEY`, `KC_DB_PASSWORD`, `SMTP_PASSWORD`, `DATABASE_PASSWORD`, or private-key strings. The bundle contains one `localhost:8080` string, which is the development constant in `src/config/runtimeConfig.ts` gated by `import.meta.env.DEV`. The E2E run confirmed no runtime localhost call from a production-style build.

### Lint ratchet detail (13 remaining warnings, all accepted and documented in `docs/FRONTEND-QUALITY-GATES.md`)

- 7 × `react(set-state-in-effect)` — React Compiler advisory.
- 2 × `react(immutability)` — three.js scene mutation inside `useEffect` in `BuildingTwin3D.tsx`; intended pattern.
- 1 × `react(refs)`, 1 × `react(purity)`.
- 2 × `react-hooks(exhaustive-deps)` in `LiveWorkspaceScreen.tsx` — deliberately not changed: the dependency is auth-object identity and cannot be exercised here without a live identity provider.

## 3. Browser E2E

- **Browser / version:** Chromium 153.0.8010.12 (cached `/opt/pw-browsers/chromium-1243`) driven by `@playwright/test` 1.65.1 via `executablePath`.
- **Viewports:** desktop 1280×720 (Desktop Chrome preset), plus a 900×800 → 1400×900 resize during the 3D test.
- **Command:** `bun run e2e` (`playwright test`) against `bun run build && vite preview --port 4173`. Exit 0, 121 s, 9 passed.
- **Scenarios (all PASS):**
  - Landing page renders with no `pageerror`.
  - "Explore Interactive 3D Twin" opens the demo twin with the primary navigation rail.
  - Six core screens (Org Workspace, Multi-Resource Monitor, Maintenance Center, Analytics & Reporting, Security & Governance, Settings) render without the error boundary and make no `/api/v1/` request.
  - Live mode without OIDC configuration shows "OIDC configuration is missing", disables "Continue with Keycloak", and can return to demo.
  - No localhost API request from a build without configuration.
  - 3D twin mounts a WebGL canvas (software GL) or recoverable fallback; OrbitControls drag and wheel produce no page errors; resize keeps the twin mounted.
- **Artifacts/traces:** Playwright traces and screenshots are written only on failure to `e2e-results/` (gitignored). None were produced on the passing run.
- **Known gaps (NOT RUN):**
  - Connected-mode flows: live Phase 4 UI (floor plan / spatial versioning, telemetry, energy analytics, work orders, AI-disabled guard), role and tenant UI restrictions, API failure, empty and loading states. These need a mocked API and a synthetic authenticated session; they were not written.
  - Error-boundary rendering path is not triggered by any test.
  - The E2E suite used only the software renderer (SwiftShader). The owner's real GPU path is not covered.
  - No Firefox or WebKit run.

## 4. Production configuration

- **Frontend hosting config:** Vercel is the primary target (`vercel.json`: `bun install --frozen-lockfile`, SPA rewrite, security headers). Netlify (`netlify.toml` plus `public/_headers` and `public/_redirects`) is the alternate. Each host reads only its own header source; they are documented as needing to stay in sync. Environment variable names are in `.env.production.example`. The `.env.example` file was cleaned of stale AI Studio entries.
- **Backend hosting config:** Dockerfile unchanged. `backend/.env.production.example` already listed names only. Health probes are `/actuator/health/liveness` and `/actuator/health/readiness`, with details hidden. Hosting provider not chosen; no deployment.
- **Keycloak:** Production example added: `deploy/keycloak/Dockerfile` (build with `KC_DB=postgres`, then `start --optimized`) and `docker-compose.production.example.yml` (edge TLS: `KC_HOSTNAME`, `KC_HTTP_ENABLED=true`, `KC_PROXY_HEADERS=xforwarded`, managed-DB URL with `sslmode=require`, no published public port, bootstrap admin marked first-boot only). Option names were verified against Keycloak 26 documentation. `docker compose config` was not run (Docker unavailable). The local `start-dev` compose stays for local development only; existing docs already prohibit `start-dev` in production.
- **SMTP:** Variable names and placeholders only (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS`, `SMTP_FROM`). Keycloak SMTP is configured in the production realm. Mailpit is documented as local-only. No mail was sent.
- **Managed database:** Requirements documented in the blueprint: TLS, dedicated application and migration roles, pool sizing against `DB_POOL_SIZE`, network allowlist, restore-based rollback.
- **TLS / domain:** Blueprint checklist. HSTS deliberately not added (requires verified HTTPS on the final domain). CSP not defined (needs a test pass against the 3D renderer and OIDC redirects). CSRF: the API is stateless bearer-token; no cookies are issued, so CSRF is disabled by design, to be re-evaluated if cookies are added.
- **Public-surface fix:** An 82 KB internal product specification that was served from `public/assets/aistudio/` was moved to `docs/archive/`. Verified unreferenced.
- **Secrets / variables still required (names only):** `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DB_POOL_SIZE`, `JWT_ISSUER_URI`, `JWT_JWK_SET_URI`, `JWT_AUDIENCE`, `JWT_ORGANIZATION_CLAIM`, `CORS_ALLOWED_ORIGINS`, `APP_PUBLIC_URL`, `SMTP_*`, `AI_ENABLED`, `AI_API_KEY` (only if enabled), `KC_HOSTNAME`, `KC_DB_URL`, `KC_DB_USERNAME`, `KC_DB_PASSWORD`, `KC_BOOTSTRAP_ADMIN_USERNAME`, `KC_BOOTSTRAP_ADMIN_PASSWORD` (first boot only), frontend `VITE_WATSCAPE_API_BASE_URL`, `VITE_OIDC_AUTHORITY`, `VITE_OIDC_CLIENT_ID`.
- **Deployment / rollback instructions:** `docs/PRODUCTION-DEPLOYMENT-BLUEPRINT.md` §8.

## 5. Monitoring / backup / restore

- **Health / readiness:** Implemented as before (liveness, readiness including DB, details hidden, problem-detail errors without stack traces). Verified by source review; not exercised over HTTP (no running API).
- **Logging / redaction:** Reviewed all `log.*` statements in `backend/src/main/java`: two statements, each logging request ID and exception type only. No tokens, Authorization headers, cookies, passwords, ingest secrets, emails or bodies are logged. Documented as a standing rule.
- **Metrics / alerting:** NOT DONE. `spring-boot-starter-actuator` is present but no Prometheus registry is on the classpath, and only `health` and `info` are exposed. Adding `micrometer-registry-prometheus` needs a Maven build. Alert set is documented in provider-neutral terms.
- **Backup command / process:** `backend/scripts/backup-local-postgres.sh` (existing) hardened: the SHA-256 sidecar now records file names only, not absolute developer paths. Syntax-checked (`bash -n`). Not executed (needs Docker Compose).
- **Restore drill environment:** Isolated PostgreSQL 16.15 cluster (`initdb` in a sandbox directory, port 55432, scram-sha-256). Not the owner's local database, no Docker volumes touched.
- **Restore verification evidence:**
  - Source database built by applying `V1` to `V5` migration SQL with `ON_ERROR_STOP=1`. All five exit 0.
  - Synthetic records: 2 organisations, 2 sites, 2 buildings, 2 floors, 2 rooms, 2 assets, 2 telemetry devices, 2 telemetry points, 2 work orders (names prefixed "Drill"; placeholder secret hash).
  - `pg_dump --format=custom` plus SHA-256 sidecar.
  - Negative 1: restore without `SCRATCH_PG_CONFIRM` → refused, exit 1, no database created.
  - Negative 2: tampered dump → SHA-256 mismatch, exit 1, no database created.
  - Positive: `restore-drill-scratch.sh` exit 0 in 1 s. Flyway history shows 5 successful migrations, latest `phase4_spatial_telemetry_work_orders_analytics_ai`. Per-table counts match the source for all eight checked tables. A tenant-scoped join returned one work order per tenant.
  - Source database still present and unchanged.
  - **Limitation:** Flyway was not executed (no Maven/Java build dependencies). `flyway_schema_history` was emulated with the same column layout. The drill must be repeated against a Flyway-managed restore on an owner-approved scratch instance.
- **RPO / RTO assumptions:** Stated as proposals requiring owner confirmation in `docs/OPERATIONS-RUNBOOK.md` §6 (proposed RPO ≤ 15 min with PITR; RTO ≤ 4 h, to be measured on production-sized data).

## 6. Final audit

- **Changed files** (vs pristine baseline, excluding generated and dependency folders): see the table in §6a below.
- **Tests passed:** Vitest 23/23; Node domain 11/11; Playwright 9/9; restore drill positive and both negative cases; Java syntax-only check of `SecurityConfig.java` (0 parse errors; a broken control file was caught).
- **Tests failed:** none in the final run. Earlier baseline failures (4× TS2591) were fixed.
- **Blocked / not run / timed out:**
  - BLOCKED — backend Maven build and `mvn verify`, Testcontainers PostgreSQL tests, `KeycloakRoleMappingTest` and the rest of the Java suite: no Maven, no Docker, Maven Central not on allowlist, JDK lacks `javac` as a launcher.
  - BLOCKED — `backend/scripts/verify-local-oidc.py` and `verify-phase4-smoke.py`: need Docker-hosted Keycloak and API.
  - BLOCKED — `docker compose config` on the local and production compose files: no Docker.
  - BLOCKED — compile-level verification of the `SecurityConfig.java` change (Spring types unavailable). Only a syntax-level check passed.
  - BLOCKED — the owner's macOS arm64 Drei/TypeScript hang: not reproducible here.
  - NOT RUN — connected-mode Playwright tests (see §3).
  - NOT RUN — `.github/workflows/ci.yml` (YAML parses; not executed on GitHub).
  - NOT RUN — `backup-local-postgres.sh` end to end (needs Docker Compose).
  - NOT RUN — Keycloak image build (`deploy/keycloak/Dockerfile`).
  - NOT DONE — metrics endpoint.
  - NOT PERFORMED — any deployment, DNS, certificate, SMTP send, secret rotation, or production resource change (by design).
  - NO TIMEOUTS occurred in the final runs. The only timeout-style observation was the owner's report, not reproduced.
- **Security / privacy review:**
  - Authorisation: found that `PUT`, `PATCH` and `DELETE` on `/api/v1/**` had no URL-level role rule (only `authenticated()`). Services already enforce `requireRole` / `requireActiveMember`, so exposure was defence-in-depth. Fixed by adding matchers that mirror the existing GET/POST rule. Behaviour change: an authenticated user without `ADMIN` or `MEMBER` realm role can no longer call these methods. Verify with an integration test before merging.
  - Tenant isolation: unchanged. The restore drill's tenant-scoped join confirms the data model separates organisations; the isolation tests (`TenantIsolationIntegrationTest`) were not run.
  - CORS: explicit origin list from configuration, credentials disabled, no wildcard. Unchanged.
  - CSRF: disabled because the API is stateless bearer-token; no cookies. Unchanged.
  - Secrets: no secrets in the patch. The restore drill's scratch password was generated locally, stored in a mode-600 file outside the source tree, and is not part of any deliverable. The scratch cluster should be stopped.
  - Logging: reviewed, no leaks found; no code change required.
  - Public exposure: internal spec moved out of `public/`.
  - Health: details hidden; no leakage found.
  - Dependencies: `bun audit` clean at run time; unused `@google/genai` removed to reduce surface.
  - At this report snapshot, `/api-docs` and `/swagger-ui.html` were public. The independent audit later restricted them to the ADMIN realm role; owner may still choose to disable them entirely.
- **Residual risks:**
  1. Backend changes (SecurityConfig) not compiled or tested.
  2. Connected-mode UI untested; live role/tenant behaviour not verified in the browser.
  3. Owner-reported Drei/TS hang not reproduced; may recur on macOS.
  4. Flyway-managed restore not executed; RPO/RTO unmeasured.
  5. No metrics endpoint; no alerts configured.
  6. Keycloak production image and compose unvalidated; realm not created.
  7. Three-stdlib declaration conflicts masked by `skipLibCheck`.
  8. Lint ratchet of 13 warnings, including two hook dependency warnings.
  9. No CSP; HSTS intentionally absent.
- **Owner actions required:** see §6b.

### 6a. Changed files and rationale

| File | Change | Rationale |
|---|---|---|
| `tsconfig.e2e.json` | new | Type-checks Playwright sources, which the app tsconfig excludes |
| `playwright.config.ts`, `e2e/*.ts` | new | Browser E2E against the production preview with synthetic fixtures |
| `src/domain/calculations.test.ts`, `src/domain/validation.test.ts` | edited | File-scoped Node typings fix TS2591 without widening global types |
| 10 files in `src/views/` (`AnalyticsAndAiScreens`, `ConnectAndAdminScreens`, `EntryAndPortfolioScreens`, `LivePhase4Operations`, `LiveWorkspaceScreen`, `MonitoringAndQualityScreens`, `SimulationAndImpactScreens`, `TwinManagementScreens`, `TwinViewerScreen`, `WorkAndCollabScreens`) | edited | Removed unused imports and three unused `useMemo`/setter declarations; no runtime behaviour change |
| `package.json`, `bun.lock` | edited | Added `oxlint@1.94.0`, `@playwright/test@1.65.1`; removed unused `@google/genai`; new scripts `typecheck`, `lint`, `check`, `e2e` |
| `.gitignore` | edited | Ignore Playwright output |
| `.env.example` | edited | Removed stale AI Studio entries; local VITE values only |
| `.env.production.example` | new | Frontend production variable names with placeholders |
| `.github/workflows/ci.yml` | edited | Real typecheck, lint, test, build gates; separate E2E job |
| `backend/src/main/java/com/wattscape/config/SecurityConfig.java` | edited | URL-level role rules for PUT, PATCH, DELETE under `/api/v1/**` |
| `backend/scripts/backup-local-postgres.sh` | edited | SHA-256 sidecar uses file names only |
| `backend/scripts/restore-drill-scratch.sh` | new | Non-destructive restore into a generated scratch database with safety checks |
| `deploy/keycloak/Dockerfile`, `deploy/keycloak/docker-compose.production.example.yml` | new | Production Keycloak example (placeholders only) |
| `docs/PRODUCTION-DEPLOYMENT-BLUEPRINT.md`, `docs/OPERATIONS-RUNBOOK.md`, `docs/FRONTEND-QUALITY-GATES.md` | new | Deployment, operations and quality-gate documentation |
| `docs/WATSCAPE_PHASE4_REMEDIATION_REPORT.md` | new | This report |
| `docs/archive/product-spec-paste-2026-11-20.md` | moved from `public/assets/aistudio/Paste_…` | Removed internal document from the public web root |

Excluded from the deliverables: `node_modules/`, `dist/`, `e2e-results/`, `e2e-report/`, `backups/` (gitignored; contained developer absolute paths in checksum files; left untouched in the owner's original tree), all `.env` files (only `.example` and `.production.example` templates are included), the restore-drill cluster and its password file.

### 6b. Owner actions required (names only; no values in chat)

1. Decide hosts: frontend (Vercel or Netlify), API (Render or equivalent), identity (Keycloak container host), managed PostgreSQL, SMTP provider.
2. Own domains and DNS; approve TLS and HSTS timing.
3. Create the production Keycloak realm, public PKCE client, redirect URIs, web origins, role and organisation claim mappings, and named MFA administrators.
4. Populate secrets in each provider's secret store using the names in §4. Rotate any credential that has ever appeared in a chat or file.
5. Run locally on the Mac: `bun install --frozen-lockfile && bun run check`, `bunx playwright install chromium && bun run e2e`, `cd backend && mvn --batch-mode verify` (Docker running), `docker compose config`.
6. Re-run `bun run typecheck` with `time` on the Mac to confirm whether the reported Drei hang persists.
7. Add integration tests for the new PUT/PATCH/DELETE role rules (role-less user gets 403; member can mutate own tenant).
8. Run the restore drill against a Flyway-managed scratch instance and measure restore time for RTO.
9. Name the restore owner and deputy; confirm RPO/RTO targets.
10. Decide whether to disable `/api-docs` and `/swagger-ui.html` entirely in production; they are ADMIN-only in the audited source.

## Readiness scores

**Rubric (ordinal, evidence-based, not measured percentages):**
- 0 — absent.
- 1 — designed or documented only.
- 2 — implemented but not verified in this environment, or verified only partially.
- 3 — implemented and partially verified; material gaps remain.
- 4 — implemented and verified here, with named gaps that do not block release.
- 5 — verified in the target environment across all relevant gates.

| Area | Score | Evidence basis |
|---|---:|---|
| Development completeness | 3 | Phase 4 functionality retained; remediation applied; no new product features; one authorisation hardening not compiled |
| Frontend quality gates | 4 | Frozen install, typecheck, lint (ratchet), 34 unit/domain tests, build and audit all pass on a clean copy; 13 accepted warnings |
| Backend quality gates | 2 | Only syntax-level verification of the one changed Java file; no compile, no tests, no Testcontainers |
| E2E coverage | 2 | 9 passing tests, demo-mode and no-IdP only; connected Phase 4 and tenant UI flows absent |
| Production infrastructure readiness | 2 | Templates and documents written; no provider, domain, realm or secret exists; compose unvalidated |
| Operational readiness | 3 | Restore drill executed on real PostgreSQL with real migrations (Flyway emulated); no metrics or alerts; RPO/RTO unmeasured |

**Overall release recommendation: NO-GO.** Critical gates still open: backend compile and tests unverified; connected-mode behaviour unverified; production identity not provisioned; no alerting; Flyway-managed restore not proven; Drei/TypeScript hang unresolved on the owner's platform.

## Deliverables

- Corrected source ZIP: `WattScape-Phase4-Corrected-Source.zip`
- Patch ZIP: `WattScape-Phase4-Remediation-Patch.zip` (unified diff against `WattScape-Phase4-Current-Source.zip`, `patch -p1`)
- SHA-256: `WattScape-Phase4-Remediation.sha256`
- Report path (inside the source): `docs/WATSCAPE_PHASE4_REMEDIATION_REPORT.md`
- Apply / rollback guide: `README-APPLY-ROLLBACK.md`
