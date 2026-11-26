# WattScape — Remaining issues, owner decisions and verification gates

**Date:** 2026-11-22  
**Source note:** The named original remaining-issues file was not present in the received source package. This is a newly created replacement, not an update to an unseen file.

## Decisions requiring the owner

### 1. Membership deactivation / revocation — BLOCKED

Engineering verified that active membership is already checked on protected tenant/site requests. A revocation endpoint is intentionally not added until these exact decisions are answered:

1. Which organization roles may deactivate another member? (Owner only, Owner/Admin, or a narrower policy?)
2. May an Owner deactivate another Owner? If yes, what approval/transfer flow is required?
3. Must every organization retain at least one active Owner? If yes, must ownership transfer happen before deactivation?
4. Is deactivation reversible? Who may reactivate, and does it require a new invitation/verified email?
5. Should the membership row be retained with `status='revoked'` and timestamp/actor/reason, and which audit fields are mandatory?
6. What should happen to outstanding invitations for the same email/identity and existing API sessions? Membership is checked at request time, but token revocation/session invalidation policy should be explicit.

Minimum approval needed: answers to the six questions above. No data migration or endpoint is safe to implement without them.

### 2. Telemetry retention policy — BLOCKED

`organizations.retention_days` exists, but no authoritative telemetry deletion policy was found. Backup-file retention in the operations runbook is not telemetry retention. Please specify:

1. Does the configured value apply only to telemetry points, or also device state, work orders, analytics aggregates, invitation records or audit events?
2. Is cutoff `observed_at < now - retention_days`, based on `received_at`, or another legal/business timestamp?
3. Should poor-quality readings, raw device metadata and rollups be treated identically?
4. Are there legal holds, incident holds, customer export windows or regulatory minimums?
5. Must deletion be hard delete, partition detach, or a reversible tombstone? What audit evidence must remain?
6. What is the approved purge cadence and maximum batch size/lock duration?

Minimum approval needed: data categories, cutoff semantics, legal-hold exclusions, deletion model and cadence. Until then, no purge/scheduled delete will run.

### 3. External AI data sharing — OWNER / PRIVACY REVIEW REQUIRED

Current minimized prompt includes: selected AI task, optional user question, a 30-day aggregate of energy/water/power measurements, sample count, analytics caveats and count of open work orders. It excludes full site name, organization ID, user ID, device secrets and credentials. The user's free-text question is forwarded as entered. Provider may process/retain data under its own terms; no anonymity/no-retention promise is made.

Required owner input:

1. Which provider and exact tenant/account/endpoint is approved for production?
2. Has its DPA/contract, data residency, logging, retention and model-training setting been reviewed?
3. Is organization-level opt-in required before the AI panel or API can be enabled?
4. Who can grant/revoke consent, and what happens to cached insights/usage logs after withdrawal?
5. What privacy notice and consent wording are approved?

Minimum approval: provider identity + contractual retention/data-use assessment + explicit opt-in policy + approved disclosure text. Keep `AI_ENABLED=false` until approved.

### 4. Google credentials — BLOCKED

Required: Google OAuth Web Client ID and Client Secret; approved Keycloak public issuer URL; exact callback URI; approval to test with a synthetic account. Do not send secrets through chat or commit them. Store only in a protected server-side environment/secret store.

### 5. Apple credentials and domain — BLOCKED

Required: Services ID, Team ID, Key ID, `.p8` file stored outside repository, verified HTTPS domain/return URL, approved Keycloak public issuer and test Apple account. Client-secret JWT must be renewed ahead of its 150-day expiry. Do not send private keys/JWTs in chat.

### 6. Production domains / infrastructure — BLOCKED

Required: approved frontend origin, API origin, identity issuer/realm, TLS proxy topology, DNS ownership, database provider, SMTP provider/sender domain and secret manager. These values are placeholders in the production template; no domain or deployment URL has been invented.

### 7. Production legal/terms content — BLOCKED

The local Terms & Conditions theme text is development copy. Provide counsel-approved Terms, Privacy Notice, consent capture requirements, effective versioning and retention requirements before registration is enabled in production.

## Engineering and verification items still open

| Item | Status | Next action |
|---|---|---|
| Production realm / brute-force settings | **TEMPLATE READY; NOT DEPLOYED** | Render approved environment placeholders; test on dedicated production-like Keycloak 26.8.2. |
| Local smoke-only client | **SOURCE READY; NOT ADDED TO SHARED INSTANCE** | Provision only in a dedicated disposable local realm; do not change the existing shared Keycloak. |
| Google / Apple login | **NOT CONFIGURED / NOT TESTED** | Wait for credentials and approved target realm; complete broker journey. |
| JWT issuer/audience/expiry verification | **NOT RUN WITH REAL TOKENS** | Obtain synthetic signed access tokens from isolated Keycloak; exercise valid/invalid audience, issuer, expiry and signature against API. |
| Frontend typecheck/lint/unit/build after final patch | **NOT RUN AFTER THIS REMEDIATION** | On owner Mac, run the individual commands shown below and capture all outcomes. |
| Backend Maven compile/unit/integration tests | **NOT RUN** | Run `cd backend && mvn verify` with Docker/Testcontainers available. |
| V6 migration validation | **NOT RUN** | Apply to a disposable PostgreSQL instance via Flyway; confirm no changes to owner/shared databases. |
| Telemetry EXPLAIN/ANALYZE | **NOT RUN** | Use representative synthetic QA data and compare the `latest` site query plan before/after; confirm V6 index usage. |
| 10,005-row analytics regression | **TEST ADDED, NOT RUN** | Execute `EnergyAnalyticsServiceTest`; verify totals and query count. |
| Work-order tests | **TESTS ADDED, NOT RUN** | Execute due-date and service tests; exercise direct API Auditor assignment rejection. |
| Invitation post-commit failure behavior | **TESTS ADDED, NOT RUN** | Execute dispatcher and service tests; later consider durable outbox/retry if delivery SLA requires it. |
| AI provider disclosure | **SOURCE IMPLEMENTED, NO PROVIDER LIVE** | Review wording with privacy owner; provider and retention approval remains. |
| Browser E2E and accessibility | **NOT RUN** | Verify OIDC, real forms, reset/verify mail, role matrix, mobile/keyboard/focus behavior. |
| Production deployment | **NOT RUN / NO-GO** | No deployment, DNS, remote resource mutation or production secret creation was performed. |

## Commands for the owner Mac after applying the remediation patch

Run from the WattScape project root:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Do not rely only on `bun run check` for diagnosis because it stops at the first failing command. If lint remains above the configured warning threshold, send the full output rather than increasing the threshold or suppressing warnings.

Backend, from `backend/`:

```bash
mvn verify
```

Database acceptance should use a dedicated disposable PostgreSQL database only. Do not run against the existing Phase 1 database, the shared local Keycloak database, or any organization data. The Flyway V6 and EXPLAIN checks remain unverified until performed on isolated QA infrastructure.

## Release decision

**Production: NO-GO.** Keep real-user onboarding, provider buttons and external AI disabled until approvals and connected verification close the blockers. No production deployment or destructive database/Keycloak operation is authorized by this handoff.
