# Changed Files — WattScape Phase 4 Candidate (2026-11-26)

- `README.md` — disambiguates root Compose PostgreSQL/API ports (5432/8080) from the separate Phase 4 runtime (55432/8082); corrects outdated V5-only migration references to V1–V6.
- `docs/RELEASE-CANDIDATE-ACCEPTANCE-2026-11-26.md` — records source checksum, commands and outcomes, source review, remaining acceptance gates, and release decisions.
- `docs/RELEASE-CANDIDATE-CHANGED-FILES-2026-11-26.md` — this manifest.

No application source or test logic changed. The isolated environment blocked npm advisory DNS, Playwright preview socket binding, and Maven Central DNS; these blockers and the required owner-side checks are documented in the acceptance report.
