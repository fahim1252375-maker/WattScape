# Phase 4 — Mac Local Acceptance Update (2026-11-25)

This document supersedes the **runtime status** in the earlier `PHASE4-FINAL-COMPLETION-REPORT.md` for checks newly completed on 2026-11-25. It does not erase the historical record or claim production readiness.

## New owner-provided evidence

### Database migration

- Backup SHA-256 matched the recorded expected checksum before migration.
- Correct PostgreSQL container and `127.0.0.1:55432` port mapping were checked.
- Flyway validated six migrations.
- V6 `telemetry_site_latest_index` was the only pending migration.
- Flyway applied one migration from schema version 5 to version 6.
- Flyway history recorded V6 as successful and the physical index definition was verified.

### Backend startup

- Candidate JAR included the V6 migration resource.
- Keycloak discovery returned HTTP 200.
- Candidate API connected to `localhost:55432/wattscape` (PostgreSQL 17.6).
- Startup validated six migrations and reported schema version 6, with no migration pending.
- Spring Boot and Tomcat started on port `8082`.
- `GET /actuator/health` returned HTTP 200 with `status=UP` and liveness/readiness groups.
- Unauthenticated `GET /api/v1/me` returned HTTP 401, which is the expected unauthenticated behavior.

### Frontend and sign-in redirect

- Vite started on port `3000`.
- Sign-in initially returned Keycloak `Invalid parameter: redirect_uri` when using `127.0.0.1`.
- The owner switched the browser origin to `http://localhost:3000` and reported that the sign-in action then worked.
- This resolves the observed host/origin mismatch for the local redirect. This record does not independently verify a post-login access token, the authenticated `/api/v1/me` response, or tenant-scoped CRUD workflows.

## Prior owner-provided tests (not rerun as part of this update)

- Playwright: 10/10 passed.
- Backend Maven `clean verify`: 68 tests, 0 failures, 0 errors, 1 skipped.
- Signed JWT integration: 6/6 passed.
- Tenant isolation integration: 10/10 passed.
- Telemetry security integration: 10/10 passed.

## Still not established

- Authenticated browser-to-API acceptance after successful login.
- ADMIN/MEMBER real-token role checks and cross-tenant denial on this running instance.
- Site/floor/room/asset, telemetry, work-order and analytics workflows against populated approved QA data. Earlier read-only inspection found zero site rows and zero telemetry rows; no synthetic QA data has been inserted under this update.
- Clean dependency audit; an earlier attempt failed because npm registry DNS resolution was unavailable.
- Production hosting, domain/TLS, production identity, SMTP, secrets, managed database/PITR, monitoring, incident response, legal/privacy approvals, Google/Apple provider setup, and independent load/security assessments.

## Acceptance decision

**Local stack startup: PASS.**  
**Local end-to-end acceptance: PARTIAL / NOT YET COMPLETE.**  
**Public production launch: NO-GO.**

All runtime results above are transcribed from owner-provided Mac terminal output. The packaging environment did not connect to the owner's Mac or services.
