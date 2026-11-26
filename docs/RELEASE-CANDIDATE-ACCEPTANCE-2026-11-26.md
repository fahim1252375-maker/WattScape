# WattScape Phase 4 — Isolated Release Candidate Acceptance

**Candidate date:** 2026-11-26 (Asia/Dhaka)  
**Source input:** `WattScape-Phase4-Local-Acceptance-Source-2026-11-25-04 (1).zip`  
**Input SHA-256:** `926d311236f47ebb7522cb44fd22b37b852381f8b26d18e9d5e93fc43c0d289c`

## Executive status

| Gate | Status | Evidence |
|---|---|---|
| Local demo source/build | **GO for build; NO-GO for full local demo sign-off** | Typecheck, 42 frontend tests, lint, build, and source hygiene passed. Playwright demo E2E was blocked by sandbox loopback bind denial. |
| Live OIDC/API integration | **NOT VERIFIED** | No owner Mac runtime, browser callback, Keycloak, API, or persistent database was accessed. |
| Staging | **NO-GO** | No staging deployment or external infrastructure was configured or verified. |
| Production | **NO-GO** | Production identity, managed database/backups, approved domains/TLS, SMTP, monitoring, operational and legal gates remain unverified. |

The uploaded source archive was verified before extraction: expected digest matched and `unzip -tq` reported no errors. Checks below ran against the extracted copy. The supplied pre-live checker was inspected but not executed; it hard-codes an owner Mac path and exits on non-Darwin.

## Check evidence

Commands ran from the extracted project root unless noted. Dependency install used the supplied lockfile. No command contacted or wrote to the owner's persistent database.

| Command | Result | Evidence |
|---|---|---|
| `bun install --frozen-lockfile` | **PASS** | Bun 1.4.5; 271 packages installed. |
| `bun run typecheck` | **PASS** | `tsc --noEmit && tsc -p tsconfig.e2e.json` completed with no diagnostics (exit 0). |
| `bun run test` | **PASS** | 7 Vitest files / 31 tests and 11 Node tests passed; 42 total, zero failures. |
| `bun run lint` | **PASS** | Oxlint completed with no diagnostics (exit 0). |
| `bun audit --audit-level=low` | **BLOCKED** | npm advisory endpoint DNS resolution failed (`registry.npmjs.org`). This is not a clean audit. |
| `bun run build` | **PASS** | Vite production build completed; advisory that some chunks exceed 500 kB. |
| `CI=1 E2E_PORT=4175 bun run e2e` | **BLOCKED** | Playwright preview server could not bind `127.0.0.1:4175` (`EPERM` in this isolated environment). No browser tests ran. Existing suite is synthetic demo coverage, not live integration. |
| `mvn -Dmaven.repo.local=/private/tmp/wattscape-m2-isolated -f backend/pom.xml --batch-mode --no-transfer-progress clean verify` | **BLOCKED** | Maven Central DNS failed resolving Spring Boot parent POM 3.5.16 before compilation. Isolated repository used; owner's Maven cache was not modified. |
| `python3 tools/verify-source-hygiene.py` | **PASS** | 254 files scanned. |

## Code-level review findings

- Backend security configuration requires authenticated role-bearing access for API routes; telemetry ingest is exempt from bearer JWT at the route layer but requires a separate device credential in `TelemetryService`.
- Tenant selection is checked against active membership keyed by token issuer and subject. Repository/service access is organization-scoped in inspected implementations. Integration tests exist for signed JWT, tenant isolation, and telemetry security, but this run could not execute them.
- Source tests cover invalid issuer/audience/time claims, foreign tenant membership, device credential rejection, idempotency, role behavior, and data validation. Presence of tests is not a passing execution result.
- Root Compose maps PostgreSQL/API to ports 5432/8080 and creates its own named database volume; the documented host Phase 4 runtime is distinct (55432/8082). README now calls out that distinction and removes stale V5-pending language.
- V6 migration exists in source. The supplied historical status reports that V1–V6 were applied on the owner's database; this environment did not independently verify that fact.

## Prioritized issue register

| Priority | Finding | Evidence / impact | Action |
|---|---|---|---|
| P0 release gate | Live identity and tenant workflows lack fresh evidence | No Mac runtime or QA identity provider available here; demo E2E is not live OIDC | Run isolated Mac acceptance runbook with synthetic identities and sanitized status-only evidence. |
| P1 release gate | Backend and browser integration suites not freshly verified | Maven Central DNS and local socket bind restrictions | Rerun Maven with network and Testcontainers available; rerun E2E where loopback browser preview is permitted. |
| P1 release gate | Dependency advisory scan unavailable | npm security endpoint DNS failure | Rerun `bun audit --audit-level=low` with registry access. |
| P2 maintainability | Production bundle has large chunks | Vite reports chunks over 500 kB; build succeeds | Consider targeted lazy-loading/code splitting in a separate performance task; not an acceptance security defect. |
| P2 documentation | README contained stale migration and topology guidance | Source README contradicted V6 source/current Phase 4 topology distinction | Corrected README and added this candidate evidence record. |

## Changed-file manifest

- `README.md` — clarified that root Compose is a distinct 5432/8080 topology, and corrected stale V5 migration references to V1–V6.
- `docs/RELEASE-CANDIDATE-ACCEPTANCE-2026-11-26.md` — this run-specific evidence, findings, gates, and safe next actions.
- `docs/RELEASE-CANDIDATE-CHANGED-FILES-2026-11-26.md` — concise manifest for this candidate.

No Java, TypeScript, migration, or authentication logic changed: review identified no independently reproducible code defect that could responsibly be fixed without executable backend/browser verification. No tests were weakened, skipped, or replaced.

## Remaining gates and safe next actions

1. On the owner's Mac, confirm the intended working tree and runtime identity using the existing [Mac local acceptance runbook](MAC-LOCAL-ACCEPTANCE-RUNBOOK.md). Do not start root Compose to resume the Phase 4 55432/8082 runtime.
2. Rerun frontend checks, including Playwright, when local preview binding is available; rerun Bun audit when npm registry DNS works.
3. Run Maven `clean verify` with Docker/Testcontainers available and inspect test totals, failures, errors, and skips. Keep Maven's local repository isolated if the normal cache is locked.
4. Independently verify the browser OIDC callback, `/api/v1/me`, port 8082 API targeting, logout, expired/unauthenticated behavior, ADMIN/MEMBER boundaries, and cross-organization denial with synthetic test identities and disposable data. Never share tokens, cookies, headers, `.env`, or passwords.
5. Keep staging/production NO-GO until their approved external infrastructure and operational/security gates are evidenced.

## Release decision

- Local demo sign-off: **NO-GO** until demo Playwright executes successfully.
- Live integration: **NO-GO / NOT VERIFIED**.
- Staging: **NO-GO**.
- Production: **NO-GO**.
