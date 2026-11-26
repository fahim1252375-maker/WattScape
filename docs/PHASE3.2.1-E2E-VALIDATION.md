# WattScape Phase 3.2.1 / Phase 4A E2E validation

**Latest run:** 2026-11-21  
**Environment:** Local Apple Silicon Mac; Java 21.0.13.1; PostgreSQL 17.6; Keycloak 26.8.2; Docker Compose; frontend `http://localhost:3000`; Mailpit `http://localhost:8025` (SMTP `127.0.0.1:1025`).  
**Scope:** Non-destructive local acceptance and security handoff. PostgreSQL and Keycloak named volumes were retained. No accounts, organizations, invitations, or rows were deleted.

## Acceptance matrix

| Requirement | Result | Evidence / limit |
|---|---|---|
| Docker Compose configuration | PASS | `docker compose --env-file backend/.env config --quiet` exited 0. Only the API container was rebuilt/restarted; Postgres and Keycloak volumes remained attached. |
| Local Keycloak discovery and issuer/JWKS | PASS | Discovery returned HTTP 200; verifier confirmed issuer and JWKS metadata. |
| Unauthenticated API behavior | PASS | `GET /api/v1/me` returned HTTP 401. |
| ADMIN and MEMBER authorization | PASS | Real local signed tokens: ADMIN access 200; MEMBER read 200; MEMBER write 403. |
| Tenant isolation | PASS | Runtime verifier cross-tenant twin access returned 404; own-tenant access returned 200. Testcontainers also verified tenant selector membership checks. |
| Existing test organizations and memberships | PASS | Two Phase 3.2.1 organizations remain in the persistent database, with server-assigned Owner membership; active organization switching was previously verified by real API. |
| Browser reached actual Keycloak registration | PASS | Actual WattScape OIDC link opened Keycloak Register using Authorization Code + PKCE S256 and `http://localhost:3000/auth/callback`. |
| Keycloak registration configuration | PASS | Read-only realm inspection: self-registration allowed, email verification enabled, duplicate emails disallowed, MEMBER default role, SMTP directed to Mailpit, required Terms execution configured. |
| Mandatory Terms acceptance | BLOCKED | Current registration page still shows the required checkbox unchecked. The user must review the local notice and personally accept before submitting. |
| Disposable test account creation | BLOCKED | Registration has not been submitted. No password was entered by Codex. |
| Duplicate registration attempt | NOT TESTED | Realm configuration disallows duplicate email; no duplicate signup was submitted. |
| Verification email and email verification | BLOCKED | The Keycloak verification message for `ws-e2e-8bcefdc66700@example.test` has not been followed. Configuration alone is not treated as successful verification. |
| Authorization Code + PKCE callback | BLOCKED | No browser registration or login callback has completed. |
| New account `/api/v1/me` profile | BLOCKED | No new authenticated test session exists. |
| New account has no ADMIN privilege | NOT TESTED | Realm default-role readback shows MEMBER and no ADMIN in default composites; a token from the not-yet-created test account cannot be inspected. |
| Test-user organization onboarding and owner persistence | BLOCKED | Existing code requires verified email. This disposable identity has not yet completed verification or created an organization. Existing real API testing created two separate E2E organizations with server-assigned Owner rows. |
| Old exposed invitation revocation | PASS | `POST /api/v1/organizations/current/invitations/33b406d2-30c9-4142-961a-b2d5a9b67351/revoke` with local ADMIN identity and Organization A selector returned HTTP 204. Read-only DB readback confirmed the exact `ws-e2e-8bcefdc66700@example.test` / Organization A / Technician row has status `revoked` and non-null `revoked_at`. Token/hash columns were not queried. |
| Exposed invitation token invalidation | PASS | The API revocation timestamp is persisted and acceptance checks exclude revoked invitations. Testcontainers endpoint test confirms a revoked code is rejected. The old Mailpit message is retained but its code is invalid; do not use it. |
| Replacement invitation creation | BLOCKED | Deliberately not created before the test identity is registered and verified, as requested. |
| Invitation response token omission/hash-at-rest/log safety | PASS | Existing API contract returns only delivery state, recipient, role, and expiry. Lifecycle tests verify token hash storage; live database query/readback avoided token/hash columns. API logs are not used to expose token material. |
| Actual previous invitation API send | PASS | Earlier local API request returned HTTP 200 and Mailpit received the WattScape invitation. That invitation is now revoked. |
| New email HTML/plain-text template | PASS | Automated MIME test checks responsive table markup, WattScape embedded PNG mark, escaped values, organization/role, UTC expiry, fallback code, plain-text alternative, and a CTA whose URL has no bearer code. |
| SMTP send and Mailpit inbox arrival for updated template | PASS | Explicit Mailpit smoke test invoked the actual `InvitationEmailService` over local SMTP `127.0.0.1:1025`. The received email is labeled “Phase 4A Mailpit Preview (non-invitation)” and uses a clearly invalid preview code; it created no invitation row. |
| Mailpit HTML rendering and CTA behavior | PASS | Actual Mailpit HTML view rendered the brand mark, organization/role, expiration, fallback code, and Open WattScape link. Link target was `http://localhost:3000/` with no token or query. |
| Production SMTP deliverability | NOT TESTED | No production SMTP provider is configured. Public delivery is not claimed. |
| SMTP failure response | PASS | Unit test injects a send failure and verifies a generic service error with no token or SMTP detail. |
| Verified matching-email invitation acceptance | BLOCKED | Requires the user to complete registration and verification, then requires a fresh invite. |
| Wrong-email invitation rejection | PASS | Previous real API redemption attempt with a different local MEMBER identity returned HTTP 404. Automated tests also reject wrong verified email. |
| Technician membership assignment and persistence | PASS (automated) | Lifecycle test accepts a valid invite and verifies persisted Technician membership; Testcontainers covers tenant-scoped revoke and membership preservation. Live acceptance by the new user is BLOCKED. |
| Single-use/reused invitation | PASS (automated); NOT TESTED (live) | Lifecycle tests reject reuse. No real test-user invite has been accepted and retried. |
| Expired invitation | PASS (automated); NOT TESTED (live) | Lifecycle tests reject expiry. No live record was aged or modified. |
| Keycloak email settings and legal copy | PASS (configuration) | Email verification and required Terms are configured. The displayed terms remain local development text, not production legal policy. |
| Google and Apple status | PASS | Provider endpoint reports both disabled; frontend buttons are disabled. No credentials were fabricated. |
| Google and Apple callback documentation | PASS | Google: `http://localhost:8081/realms/wattscape-local/broker/google/endpoint`; Apple: `http://localhost:8081/realms/wattscape-local/broker/apple/endpoint`. |
| Provider secrets in frontend bundle | PASS (previous bundle scan) | Prior production bundle scan found no provider secret names. The latest production build failed and generated no current bundle. |
| Frontend lint/typecheck | PASS | `bun run lint` exited 0 in the latest combined run. |
| Frontend unit tests | FAIL | `bun run test` hit Vitest startup `TypeError: pico is not a function`. Runner-mode retry reported `URL.install is not a function` for four jsdom workers; no tests ran in this recheck. |
| Frontend production build | FAIL | One attempt failed in Tailwind enhanced-resolve (`TypeError: Hook is not a constructor`); retry entered Vite transform and stalled without completing. The existing `dist` files are from the previous run and are not evidence of a current build. |
| Backend `mvn test` | PASS | Java 21; 30 tests, 0 failures, 0 errors, 0 skipped; PostgreSQL Testcontainers ran. |
| Backend `mvn verify` | PASS | Java 21; 30 passed, 0 failures/errors, and 1 environment-gated Mailpit test skipped; executable JAR packaged. |
| Mailpit SMTP smoke test | PASS | `WATSCAPE_MAILPIT_SMOKE=true mvn -Dtest=InvitationEmailMailpitSmokeTest test`: 1 passed, 0 failures. |
| Full local OIDC/API verification | PASS | `backend/scripts/verify-local-oidc.py`: 20 discovery, readiness, 401, role, tenant, and persistence checks passed; tokens were not printed or stored. |

Maven emitted a non-blocking HTTP 401 while checking Flyway community repository metadata; dependencies were resolved and verification passed. Non-fatal Mockito/JDK dynamic-agent and reflective-final-field warnings remain. Frontend dependency/runtime inconsistencies are described above; no frontend source workaround was made.

## Finish the interactive Phase 4A flow

The browser tab remains on Keycloak’s actual Register form for `ws-e2e-8bcefdc66700@example.test`. To complete the acceptance journey:

1. Review the visible local Terms and Privacy notice. Check the required agreement and submit Register only if you personally accept it.
2. Enter and confirm a test-only password yourself if Keycloak prompts; do not reuse an existing password.
3. In [Mailpit](http://localhost:8025), follow the Keycloak email-verification message for that address. The prior WattScape invitation in Mailpit has been revoked; do not use its code.
4. Return to WattScape, then verify `/api/v1/me`, the signed role claims, email verification, and callback session.
5. Create an organization through onboarding and verify server-assigned Owner membership.
6. Only after the identity is verified, generate a replacement invitation to this same email. Accept it, verify Technician membership and tenant isolation, then retry and confirm single-use rejection.

Until these user actions occur, registration, verification, callback, new-user role, onboarding, correct-email acceptance, and live single-use checks remain incomplete. The exposed invite remains revoked and retained; no replacement was sent.
