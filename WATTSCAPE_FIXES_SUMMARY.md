# WattScape — Phase 2 fixes and implementation summary

**Date:** 2026-11-22  
**Status:** Source remediation completed for the independently implementable items listed below; all backend runtime tests remain pending because Maven/PostgreSQL/Keycloak are unavailable here.  
**File note:** The source package did not contain the originally named fixes summary. This is a newly created replacement from the source snapshot and task brief.

## Changes made

### P1 — Security

| Issue | Implementation | Files |
|---|---|---|
| Password grant enabled on SPA | Disabled Direct Access Grants on `wattscape-local`; retained Code + PKCE S256; dedicated local `wattscape-local-smoke` client for existing Python tests only; added loopback/realm checks and explicit isolated-realm confirmation to updater. | `backend/keycloak/wattscape-local-realm.json`; `backend/keycloak/configure-local-realm.py`; `backend/scripts/verify-local-oidc.py`; `backend/scripts/verify-phase4-smoke.py`; `backend/keycloak/test_realm_configs.py`; `docs/PHASE4-LOCAL-SMOKE-TEST.md` |
| Production brute-force configuration absent | Added Keycloak 26.8.2-compatible temporary lockout settings to production template; no permanent lockout. | `deploy/keycloak/wattscape-production-realm.template.json`; `docs/KEYCLOAK-PRODUCTION-REALM.md` |
| Production realm missing | Added separate placeholder template: HTTPS origin placeholders, strict redirects, external SSL, no SPA password/implicit/service-account grants, audience mapper, SMTP placeholders. | `deploy/keycloak/wattscape-production-realm.template.json`; `docs/KEYCLOAK-PRODUCTION-REALM.md` |
| Provider configuration safety | Scripts require matching explicit target realm, validate provider read-back and callback. Apple script forwards target confirmation and stores the generated JWT only in ignored env file. | `backend/keycloak/configure-identity-provider.py`; `backend/keycloak/renew-apple-client-secret.py`; `docs/GOOGLE-OAUTH-SETUP.md`; `docs/APPLE-SIGN-IN-SETUP.md` |
| Audience enforcement review | Preserved configurable Spring Boot native audiences setting and Keycloak access token audience mapper; documented exact mapper contract and runtime test gap. | `backend/src/main/resources/application.yml` (preserved); `backend/keycloak/wattscape-local-realm.json`; production realm template; `WATTSCAPE_AUTHENTICATION_GUIDE.md` |
| 401/403 error paths | Added explicit MVC mappings for Spring authentication/authorization exceptions; SecurityFilterChain handlers remain. | `backend/src/main/java/com/wattscape/common/GlobalExceptionHandler.java`; `backend/src/test/java/com/wattscape/common/GlobalExceptionHandlerTest.java` |

### P1 — Membership / authorization

No membership revoke/deactivate API was added. Code inspection confirmed that protected tenant paths already validate active membership. Adding a revoke endpoint safely requires owner decisions first. The member entity's `status` field and invitation revocation remain distinct concepts.

### P2 — Data and performance

| Issue | Implementation | Files |
|---|---|---|
| Retention purge not present | No purge job added; retention scope and legal holds are undefined. | No destructive changes; decision documented in `WATTSCAPE_REMAINING_ISSUES.md`. |
| Telemetry latest multi-metric index | Additive V6 index `(organization_id, site_id, observed_at DESC)` matches the latest cross-metric site query; V5 unchanged. | `backend/src/main/resources/db/migration/V6__telemetry_site_latest_index.sql` |
| Analytics totals from 10,000-row truncation | Bounded 2,000-row pagination, repeatable-read snapshot, stable observedAt/id sort, all selected samples included, incomplete pagination fails closed. | `backend/src/main/java/com/wattscape/analytics/EnergyAnalyticsService.java`; `backend/src/main/java/com/wattscape/telemetry/TelemetryPointRepository.java`; `backend/src/test/java/com/wattscape/analytics/EnergyAnalyticsServiceTest.java` |

### P2 — Work-order integrity

| Issue | Implementation | Files |
|---|---|---|
| No due-date clear semantics | `clearDueAt=true` means explicit null; missing field preserves; timestamp sets/updates; conflicting set+clear rejected. | `backend/src/main/java/com/wattscape/workorder/WorkOrder.java`; `WorkOrderDtos.java`; `WorkOrderService.java`; `src/services/backendApiClient.ts`; `src/views/LivePhase4Operations.tsx`; `backend/src/test/java/com/wattscape/workorder/WorkOrderDueDateTest.java` |
| Auditor can be assigned | Backend checks active same-org membership and rejects `Auditor/Read Only` on create/update; UI filters same role. | `backend/src/main/java/com/wattscape/workorder/WorkOrderService.java`; `src/views/LivePhase4Operations.tsx`; `backend/src/test/java/com/wattscape/workorder/WorkOrderServiceTest.java` |

### P2 — Invitation delivery and templates

| Issue | Implementation | Files |
|---|---|---|
| Email sent before transaction commit | Publish ephemeral event inside transaction; `@TransactionalEventListener(AFTER_COMMIT)` dispatches only after successful commit; delivery failure does not invalidate invitation. | `backend/src/main/java/com/wattscape/organization/OnboardingService.java`; `InvitationEmailRequested.java`; `InvitationEmailDispatcher.java`; `backend/src/test/java/com/wattscape/organization/InvitationEmailDispatcherTest.java`; invitation service tests |
| Fragile sequential placeholder substitution | One-pass matcher; quote replacement strings; HTML context escaping; constant subject; adversarial token/name regression test. | `backend/src/main/java/com/wattscape/organization/InvitationEmailService.java`; `backend/src/test/java/com/wattscape/organization/InvitationEmailServiceTest.java` |
| Invite acceptance UX | Existing manual token entry preserved; token is not moved to URL/localStorage. | Existing frontend flow preserved. |

### P2 — AI privacy

- Provider info endpoint returns host/model/enabled state only after role and site authorization.
- External prompt omits site name and organization/user IDs; it sends aggregate measurements, counts, caveats, task and user question.
- AI UI discloses outbound categories and warns that the free-text question is sent to the provider and provider retention is governed by its own terms.
- Owner privacy/contract/legal approval remains necessary.

Files: `AiGatewayService.java`, `AiDtos.java`, `AiGatewayController.java`, `src/services/backendApiClient.ts`, `src/views/LivePhase4Operations.tsx`, `docs/SECURITY-PRODUCTION-READINESS.md`.

### Frontend lint regression

- `AuthScreen` now reads the redirect guard ref only in effects/handlers, not render; dependencies use destructured OIDC fields/functions.
- `LivePhase4Operations` includes `canUseAi` in the effect dependency list.
- Existing 11 unrelated lint warnings were not mass-suppressed or rewritten in this pass.

Files: `src/views/EntryAndPortfolioScreens.tsx`, `src/views/LivePhase4Operations.tsx`.

## Tests added (not yet executed here)

- `EnergyAnalyticsServiceTest`: 10,005 matching measurements; expects all included and six bounded page calls.
- `WorkOrderDueDateTest`: omitted preserve / explicit clear / date replacement.
- `WorkOrderServiceTest`: Auditor rejection on create and direct update API.
- `InvitationEmailDispatcherTest`: AFTER_COMMIT metadata, successful dispatch and delivery-failure isolation.
- `InvitationEmailServiceTest`: placeholder-collision and HTML escaping cases.
- `GlobalExceptionHandlerTest`: 401, 403 and safe generic 500.
- `backend/keycloak/test_realm_configs.py`: local browser grant profile, smoke client separation, strict production redirect/origin and brute-force settings.

## Verification and known limits

The owner's earlier Mac run had TypeScript typecheck pass, but lint failed at 13 warnings against a threshold of 11; because `bun run check` chains lint before tests/build, those steps did not run. That run preceded this remediation's additional work-order/AI UI changes and is not evidence for this final package. Re-run `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build` on the owner Mac.

Static verification completed here: five Keycloak realm configuration unit tests passed; all changed Python scripts compiled; local and production realm JSON parsed; Keycloak theme JS passed `node --check`; and six changed TypeScript/TSX files transpiled without syntax diagnostics. No Maven tests, PostgreSQL/Flyway migration, EXPLAIN, Keycloak Admin REST call, browser OIDC, SMTP end-to-end, provider login or production deployment was performed here. The production decision remains NO-GO.
