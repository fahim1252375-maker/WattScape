# Phase 4 final implementation sprint — 2026-11-25

## Scope and evidence provenance

This report records work performed in the isolated release-candidate source tree. Commands below were run from that tree unless noted. Results previously supplied by the owner remain labeled as historical owner evidence; they are not presented as new local runs.

## Source changes

- Removed all 11 frontend lint warnings by deriving the selected floor/target from current data, moving resets to user actions, extracting the active-organization ref access into a stable hook, and encapsulating React Three Fiber scene changes in effect-only helpers.
- Preserved Live Phase 4 mutation success messages while refreshed data loads. The prior data-loading effect cleared them immediately after a successful mutation.
- Clear site-scoped twin/room/asset data when the user changes site, and show an explicit site-selection state instead of briefly displaying the previous selection's data.
- Added keyboard behavior to the live site dialog: initial focus, Tab/Shift+Tab containment, Escape close, and focus restoration.
- Split Three.js core and React Three Fiber/Drei dependencies into named build chunks. The 3D component is already lazy-loaded on the 3D view.
- Added frontend regression coverage for mutation feedback and dialog keyboard behavior, plus a Playwright responsive navigation/overflow check.

No backend code, migrations, security policy, identity-provider records, local database, runtime services, or Docker data were changed.

### Changed-file manifest

- `src/components/twin/BuildingTwin3D.tsx`
- `src/views/LiveWorkspaceScreen.tsx`
- `src/views/LivePhase4Operations.tsx`
- `src/views/LiveWorkspaceScreen.test.tsx`
- `src/views/LivePhase4Operations.test.tsx` (new)
- `e2e/boot-and-navigation.spec.ts`
- `vite.config.ts`
- `docs/PHASE4-FINAL-SPRINT-2026-11-25.md` (this report)
- `docs/PHASE4-LOCAL-DEMO-VERIFICATION-GUIDE.md` (safe owner procedure)

## Verification performed

| Command | Result |
|---|---|
| `bun run typecheck` | PASS, exit 0 |
| `bun run lint` | PASS, exit 0, 0 warnings (was 11 before this sprint) |
| `bun run test` | PASS, 7 Vitest files / 31 tests; 11 Node domain tests passed; 0 failures |
| `bun run build` | PASS, exit 0; frontend entry 363.56 kB / 109.02 kB gzip; `BuildingTwin3D` 84.75 kB / 32.00 kB gzip; `react-three` 202.40 kB / 63.76 kB gzip; `three-core` 744.89 kB / 188.30 kB gzip |
| `bun run e2e` | BLOCKED before browser/test assertions: Vite preview failed to bind `127.0.0.1:4173` with `listen EPERM` |
| `E2E_PORT=4174 bun run e2e` | BLOCKED at the same pre-test stage with `listen EPERM` on `127.0.0.1:4174` |
| `bun audit --audit-level=low` | BLOCKED: registry endpoint failed DNS resolution (`DNSResolveFailed`) |
| `docker info --format 'Server={{.ServerVersion}}'` | BLOCKED: permission denied connecting to `~/.docker/run/docker.sock`; no permission changes were attempted |
| `docker compose version` | PASS, Docker Compose v5.7.0 is installed |
| `mvn -f backend/pom.xml --batch-mode --no-transfer-progress clean verify` | FAIL in this environment: Mockito/Byte Buddy self-attach could not initialize; 27 test errors. Maven compilation succeeded before Surefire |
| `mvn -f backend/pom.xml --batch-mode --no-transfer-progress -DargLine=-javaagent:$HOME/.m2/repository/net/bytebuddy/byte-buddy-agent/1.17.8/byte-buddy-agent-1.17.8.jar clean verify` (the local `$HOME` path was expanded for execution) | PASS, BUILD SUCCESS, 68 tests, 0 failures, 0 errors, 29 skipped. Docker/Testcontainers could not connect to the Docker socket; signed-JWT, telemetry, tenant-isolation, and restore integration tests were skipped. The Mailpit smoke test was also skipped. This is not full backend integration verification. |

The owner previously supplied terminal evidence (historical, not rerun here) of 68 backend tests with 0 failures/errors and 1 skipped, including six signed-JWT integration tests passing. The current local run could not reproduce those Docker-backed results.

## Bundle comparison

Before this sprint, the production build reported a single lazy 3D chunk at 1,020.73 kB / 279.46 kB gzip. After code splitting, `BuildingTwin3D` is 84.75 kB, React Three Fiber/Drei are in a 202.40 kB chunk, and Three core is in a 744.89 kB chunk. The split supports independent caching and keeps the component chunk small, but does **not** reduce the total 3D transfer; the measured combined output is slightly larger. Vite continues to warn that `three-core` exceeds the 500 kB threshold. No transfer-size reduction is claimed.

## Manual and production gates

- Real Keycloak browser login through the frontend into the Phase 4 API: NOT VERIFIED.
- Connected Phase 4 workflows against the local API: NOT VERIFIED.
- Responsive browser assertions: NOT RUN because local preview binding is blocked before Playwright starts.
- Accessibility: focused dialog keyboard behavior is regression-tested; no formal WCAG audit or certification was performed.
- Dependency vulnerabilities: unknown; audit was blocked by DNS. No dependency upgrades were attempted.
- Phase 4 database smoke script: NOT RUN. It is write-capable and the Compose database target was not independently identified; Docker API access was unavailable.
- Provider-managed backups/PITR, offsite restore, live alert delivery, deployment configuration, DNS/TLS, secret provisioning, load testing, and independent security assessment: NOT VERIFIED.

Demo source packaging is a source handoff only. It does not represent a deployment, connected-identity demo, or production release. Production remains **NO-GO** until the required owner/provider and connected acceptance gates are completed.
