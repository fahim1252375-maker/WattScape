# WattScape — Professional source update

**Revision:** 2026-11-21  
**Base:** WattScape Phase 4 Updated Source

## What changed

- The existing multi-screen WattScape product and Phase 4 API implementation were preserved.
- Frontend API/identity configuration is now deployment-aware: localhost HTTP is allowed only in Vite development; deployed builds require explicit HTTPS service origins and do not default to the end user's localhost.
- Added unit coverage for those URL/security rules.
- Added a React error boundary with a user-safe reload/recovery screen.
- Added branded SVG favicon, web manifest, improved metadata and robots.txt.
- Added Vercel/Netlify SPA fallback and baseline response-header configuration.
- Replaced the Vite ESM `__dirname` assumption with an `import.meta.url`-derived project path.
- Renamed the package to `wattscape`, set the project version to 1.0.0, declared Bun 1.4.5 / Node 22.14+ and added `bun run check`.
- Bundled the successful local Phase 4 API/database smoke-test script and the latest verification report.
- Added a production deployment architecture guide and a placeholder-only production environment variable template.

## Verification

Passed in the isolated packaging environment:

- Runtime configuration TypeScript module compilation.
- Eleven runtime API/identity URL validation assertions.
- TypeScript/TSX syntax transpilation for all 37 source files.
- Python syntax compilation for `backend/scripts/verify-phase4-smoke.py`.
- JSON/TOML configuration parsing.
- ZIP integrity checks for full source and update patch archives.

The full application dependency-backed `bun run lint`, `bun run test`, and `bun run build` were not run in this isolated environment because Bun dependencies are not installed here. Run `bun run check` on the Mac after applying the patch.

## Current readiness estimate

- **Product/source development:** approximately **82/100**.
- **Production launch readiness:** approximately **55/100**.

These are engineering estimates, not automated scores. The local API/database smoke test passed, and `localhost:3000` later returned HTTP 200. Production deployment, Keycloak production identity, real SMTP delivery, managed databases/secrets, browser E2E, executed CI, monitoring, restore drill and independent security/load testing remain open.

## Important email note

The local Keycloak realm sends verification mail to Mailpit. This is intentionally a development sink and cannot deliver to an iCloud inbox. Production email must be configured separately in Keycloak Realm Settings → Email and in Spring Boot's SMTP environment, using a verified sender domain and TLS. The deployment guide explains both paths.
