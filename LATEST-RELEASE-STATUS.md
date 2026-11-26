# WattScape Phase 4 — Latest Release Status

**Status date:** 2026-11-25 (Asia/Dhaka)  
**Release package:** `WattScape-Phase4-Local-Acceptance-Source-2026-11-25-04.zip`

## Decision

- **Local development stack:** Started successfully on the owner's Mac, based on owner-provided terminal output.
- **Local application acceptance:** Partially verified; remaining authenticated API and tenant-scoped workflow evidence is still required.
- **Public production launch:** **NO-GO**. Production infrastructure, identity, SMTP, secrets, monitoring, backups/PITR, privacy/legal approvals, and independent security/load checks are not established.

## Latest owner-provided Mac evidence

| Check | Result | Evidence scope |
|---|---|---|
| Frontend Playwright | 10/10 passed | Earlier owner-provided Mac run; not rerun for this package |
| Backend Maven `clean verify` | 68 tests, 0 failures, 0 errors, 1 skipped | Earlier owner-provided Mac run; not rerun for this package |
| Signed JWT integration | 6/6 passed | Earlier owner-provided Mac run |
| Tenant isolation integration | 10/10 passed | Earlier owner-provided Mac run |
| Telemetry security integration | 10/10 passed | Earlier owner-provided Mac run |
| Backup checksum | PASS | Owner-provided command output |
| Flyway V6 | PASS; one migration applied, schema now v6 | Owner-provided live Flyway output against `localhost:55432/wattscape` |
| API startup | PASS; Tomcat on 8082, Spring Boot started | Owner-provided startup log |
| API health | HTTP 200, `status=UP` | Owner-provided curl output |
| Unauthenticated `GET /api/v1/me` | HTTP 401 | Owner-provided curl output; expected security behavior |
| Keycloak discovery | HTTP 200 | Owner-provided curl output |
| Frontend dev server | Vite ready on port 3000 | Owner-provided Vite output |
| Sign-in redirect URI issue | Resolved after opening the frontend with `http://localhost:3000` instead of `127.0.0.1` | Owner reported the sign-in action works; post-login token-to-API acceptance is not independently evidenced in this record |
| Bun dependency audit | BLOCKED by npm registry DNS resolution | Earlier owner-provided audit result; not a clean audit |

These are explicitly owner-provided results. The packaging environment did not connect to the owner's Mac, Docker daemon, Keycloak, API, or PostgreSQL.

## Database and local runtime

- Target database: `wattscape` on PostgreSQL 17.6 at host port `55432`.
- Flyway migration V6 (`ix_telemetry_site_latest`) was applied successfully after backup checksum and container/port preflight checks.
- The API started on port `8082` and logged Flyway schema version `6`, with no migration pending.
- Keycloak discovery responded on port `8081`.
- Frontend Vite dev server was started on port `3000`.
- The local database inspection before V6 showed no site rows and no telemetry rows. No synthetic QA data provisioning or write-capable smoke script is claimed as completed.
- The database backup is kept separately on the owner's Mac. It is intentionally not included in this source archive.

## Remaining local acceptance gates

1. Complete a real browser login and capture evidence that the authenticated `GET /api/v1/me` returns the expected user/organization context (do not share tokens).
2. Confirm the browser's protected application routes and network calls use API `localhost:8082`, not the older API on `8080`.
3. Verify tenant membership and role authorization with approved test identities; verify cross-tenant access is denied.
4. Exercise site/floor/room/asset, telemetry, work-order and analytics workflows using approved test data. The persistent database was previously observed with zero site rows; synthetic data requires separate owner approval.
5. Retry dependency audit when registry DNS/network access is available.

## Public production blockers

- No approved production frontend/API domain, DNS, TLS/reverse proxy, or hosting deployment has been evidenced.
- No production Keycloak realm/client, signing-key operations, MFA/admin policy, or external identity provider credentials have been deployed/verified.
- No production SMTP provider, sender-domain authentication (SPF/DKIM/DMARC), bounce handling, or real mailbox delivery has been verified.
- No managed production PostgreSQL, encrypted offsite backup, PITR, independent restore drill, or production secret manager has been established.
- Production monitoring, alerting, WAF/rate limits, load/penetration testing, incident response, rollback and operational ownership remain unverified.
- Approved legal Terms/Privacy content, data-retention rules, membership revocation policy, and AI provider privacy/opt-in decisions remain required.
- Google and Apple sign-in remain disabled/not configured until approved provider credentials and verified HTTPS callback domains are available.

Do not describe this build as 100% production complete. It is a successfully started **local development stack** with additional local acceptance still pending.
