# WattScape Phase 4 — Remaining Work Update

This update is based on the previously uploaded `WattScape-Phase4-Audited-Final-Source(3).zip` plus the latest user-provided `TelemetrySecurityIntegrationTest.java` file.

## Included changes

1. Adds the current TelemetrySecurityIntegrationTest to the source tree (it was not present in the earlier uploaded source ZIP).
2. Extends telemetry integration coverage with tests for invalid metrics/units/values/timestamps, read-only member restrictions on device registration/revocation, and PostgreSQL cross-organization ownership constraints.
3. Adds an explicit runtime-config test for the Phase 4 host-run API port `8082`.
4. Adds `docs/PHASE4-HOST-RUNTIME.md` with the correct frontend variable, safe host-run topology, local OIDC acceptance sequence, and write-capability warning for the existing OIDC smoke script.
5. Clarifies in `.env.example` that `8080` remains the generic Compose/dev default and host-run Phase 4 should override `VITE_WATSCAPE_API_BASE_URL` to `8082`.

## Important limitations

- No production application/service code or database migration was changed.
- No real `.env`, password, token, or private key is included.
- The new/expanded tests have **not been executed in this environment** because Maven/Bun and project dependencies are unavailable here. Run focused telemetry tests, full Maven verification, and frontend checks from the isolated local workspace before applying this update as a release candidate.
- This does not close real OIDC, provider backup/PITR, SMTP delivery, monitoring, hosting/TLS, load, accessibility, or penetration-test gates. Production readiness remains NO-GO.

## Applying to an existing workspace

Back up the current workspace first. Then copy the paths in this update over the matching paths in the existing release-candidate folder, preserving the local `backend/.env` file (it is not part of this archive). Review the changes before running tests. Do not replace the whole active workspace while its backend or database is running.
