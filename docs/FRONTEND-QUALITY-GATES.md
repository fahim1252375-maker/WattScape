# WattScape frontend quality gates

Run from the repository root with Bun 1.4.5 (`.bun-version`).

| Gate | Command | Meaning |
|---|---|---|
| Install | `bun install --frozen-lockfile` | Reproduces `bun.lock` exactly; fails if the lock is out of date |
| Typecheck | `bun run typecheck` | `tsc --noEmit` for `src/` plus `tsconfig.e2e.json` for `e2e/` and `playwright.config.ts` |
| Lint | `bun run lint` | `oxlint --react-plugin --max-warnings 13 src`. Zero errors required; warnings may not exceed the ratchet (13) |
| Unit and domain tests | `bun run test` | Vitest (`src/auth`, `src/config`, `src/context`, `src/services`, `src/views`) plus Node test runner for `src/domain` |
| Production build | `bun run build` | `vite build`; the 3D view is a lazily loaded chunk |
| E2E | `bun run e2e` | Playwright against the production preview with synthetic demo fixtures; no backend |
| All local gates | `bun run check` | typecheck, lint, test, build (E2E run separately) |

## Known and accepted items (documented, not hidden)

- **`skipLibCheck: true`** is set in `tsconfig.json`. With it disabled as a diagnostic, `src/` has zero errors. The only errors are two declaration conflicts inside `node_modules/three-stdlib` (`SVGLoader.d.ts`, `TGALoader.d.ts`) against `@types/three@0.187.0`. `three-stdlib@2.36.1` is the latest published release, so this is an upstream conflict. Remove `skipLibCheck` only after upstream fixes it.
- The current lint ratchet is **11 warnings** (tightened from 13 after fixing two render-time advisories). Remaining sites: `BuildingTwin3D.tsx` has two intentional imperative Three.js scene updates in effects; `LiveWorkspaceScreen.tsx` has one ref getter that the API client calls later, two loading/reset transitions before async requests, and two hook dependency suggestions where individual auth fields/functions are listed; `LivePhase4Operations.tsx` has four dependent selection/status transitions around API refresh. These are left without suppressions because they synchronize with Three.js or API state. Revisit the dependency warnings with connected OIDC tests before changing them; raising the 11-warning ratchet requires a documented reason.
- **Drei / TypeScript 7 hang**: not reproduced on Linux with TypeScript 7.0.2. The Drei-only and full `BuildingTwin3D.tsx` probes each finished in about one second. The owner-reported timeout may be platform-specific (macOS arm64 native compiler) and should be re-checked with `bun run typecheck` and `time` on that machine.
- Build warning: the 3D chunk is about 1 MB minified (279 KB gzip). It is already lazy-loaded from `TwinViewerScreen` and `EntryAndPortfolioScreens`, so the warning is informational.
