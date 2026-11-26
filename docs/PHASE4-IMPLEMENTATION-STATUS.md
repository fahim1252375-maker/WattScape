# WattScape Phase 4 — implementation status

**Source review date:** 2026-11-21  
**Source baseline:** `WattScape-Phase4-Latest-Source.zip` supplied in this conversation.  
**Implementation update:** additive Phase 4 backend/frontend source changes are included in this archive.  
**Verification environment:** this execution environment has Java 21 and Node 22, but no Maven, Bun, Docker, installed Node dependencies, or reachable Maven Central. The added Java and frontend tests have not been executed here. Do not treat this report as a runtime verification certificate.

## Phase status

| Area | Source status | Current capability / remaining boundary |
|---|---|---|
| 4A — Authentication and onboarding | PARTIALLY IMPLEMENTED | OIDC Authorization Code + PKCE, organization onboarding, invitation creation/acceptance/revocation and tenant membership checks are in source. A real Keycloak signup, consent, password submission, email verification, browser callback and invitation acceptance still require the user to perform and verify the account flow. The earlier exposed disposable invitation was revoked; do not reuse it. |
| 4B — Persistent 3D spatial twin | PARTIALLY IMPLEMENTED | New Flyway V5 persists floor-plan coordinate metadata/revisions, GeoJSON room polygons and asset points linked to the exact floor-plan revision, positions, rotations and immutable version snapshots. Live UI supports creating plan revisions and placing/updating/retiring spatial records. It is not a CAD/BIM upload, mesh store, photogrammetry pipeline, full 3D editor, renderer or collision engine. Coordinates use a local Cartesian frame. |
| 4C — Telemetry and IoT | PARTIALLY IMPLEMENTED | New device registry, one-time generated device credential (SHA-256 hash stored), credential-authenticated HTTPS batch ingestion, metric/unit/quality/timestamp validation, idempotency key handling, revocation, read history/latest endpoints and UI are included. MQTT, Modbus and BACnet adapters, edge provisioning, broker infrastructure and production gateway rate limiting are not implemented. |
| 4D — Maintenance and work orders | PARTIALLY IMPLEMENTED | New tenant-scoped work-order schema/API, role-aware assignment, transition validation, optimistic locking and append-only event history are included. Live UI supports create, assign/unassign (for assignment-capable roles) and status changes. Scheduling, technician push notifications, SLA timers, parts inventory, external CMMS sync and offline workflows are not implemented. |
| 4E — Energy analytics | PARTIALLY IMPLEMENTED | Server aggregates accepted `energy_kwh`, `water_m3` and sampled `power_kw` telemetry over up to 90 days. Time-effective site tariff/emissions factors are applied per reading; mixed currencies or incomplete factor coverage suppress monetary totals rather than combining incompatible estimates. The current implementation pages all matching records and no longer truncates the aggregate at 10,000 points. This is not a utility-bill reconciliation system, tariff feed, carbon registry, savings baseline or forecast. `energy_kwh` is treated as interval consumption, not a cumulative meter register. |
| 4F — Server-side AI gateway | PARTIALLY IMPLEMENTED | OpenAI-compatible server-side insight gateway for energy/maintenance reviews is included, disabled by default, with an environment-only API key, HTTPS endpoint validation, connect/read timeouts, a database-counted per-actor request cap (not an atomic distributed quota) and usage metadata audit. It sends a minimized 30-day site-level aggregate telemetry summary, sample count, caveats, open-work-order count, selected task and submitted question to the configured provider. The full site name and organization/user identifiers are excluded; user-entered question text is forwarded as submitted and may itself contain identifying information. The UI discloses the provider host/model and warns users not to submit confidential or personal data. Provider-side retention/processing depends on that provider's terms; no privacy or non-retention guarantee is claimed. Prompts and outputs are not persisted by WattScape. No provider key was supplied, so no live AI call was run. Results are advisory only. |
| 4G — Production operations | PARTIALLY IMPLEMENTED / NOT DEPLOYED | A CI workflow for Java 21/Maven and Bun typecheck/tests/build, plus a local PostgreSQL backup helper and deployment hardening runbook, are included. No production domain, TLS, managed Keycloak/identity, secret manager, authenticated SMTP service, managed database, encrypted off-site backup, restore drill, alerting, load test, CI execution, or production deployment was performed. |

## Added API surface

All authenticated endpoints derive organization scope from the verified JWT identity and an active membership. `X-Organization-Id` is only a selected-organization selector; the backend validates membership before use.

| Method | Path | Capability |
|---|---|---|
| GET / POST | `/api/v1/sites/{siteId}/floors/{floorId}/plan` | Read current floor-plan revision / create a new metadata revision (Owner/Admin/Site Admin). |
| GET | `/api/v1/sites/{siteId}/floors/{floorId}/spatial-elements` | List active floor geometry. |
| PUT | `/api/v1/sites/{siteId}/floors/{floorId}/spatial-elements/{entityType}/{entityId}` | Create/update a room Polygon/MultiPolygon or asset Point; expected version required for updates. |
| GET | `/api/v1/sites/{siteId}/floors/{floorId}/spatial-elements/{elementId}/versions` | Read immutable version history. |
| DELETE | `/api/v1/sites/{siteId}/floors/{floorId}/spatial-elements/{elementId}` | Retire spatial mapping (Owner/Admin/Site Admin); does not delete source room/asset. |
| GET / POST | `/api/v1/sites/{siteId}/telemetry/devices` | List devices / register HTTPS device (Owner/Admin/Site Admin). Registration returns the raw credential once. |
| POST | `/api/v1/sites/{siteId}/telemetry/devices/{deviceId}/revoke` | Revoke a device credential. |
| POST | `/api/v1/telemetry/ingest/{deviceId}` | Ingest up to 250 readings with `Authorization: Device <secret>`; this specific route is public to the JWT filter but authenticates the device credential in the service. |
| GET | `/api/v1/sites/{siteId}/telemetry/latest` | Read latest measurements. |
| GET | `/api/v1/sites/{siteId}/telemetry?metricKey=...&from=...&to=...` | Read metric history for up to 90 days. |
| GET / POST | `/api/v1/sites/{siteId}/work-orders` | List/create persisted work orders. |
| GET / PATCH | `/api/v1/sites/{siteId}/work-orders/{workOrderId}` | Read/update work order with optimistic version check. |
| GET | `/api/v1/sites/{siteId}/work-orders/{workOrderId}/events` | Read append-only work-order history. |
| GET | `/api/v1/organizations/current/members` | List minimal active member options for assignment; Owner/Admin/Site Admin/Facilities Operator. |
| GET | `/api/v1/sites/{siteId}/analytics/energy?from=...&to=...` | Read telemetry-backed summary and daily aggregates (up to 90 days). |
| POST | `/api/v1/sites/{siteId}/analytics/energy/factors` | Record effective-dated site tariffs/emissions factors (Owner/Admin/Energy Analyst). |
| POST | `/api/v1/sites/{siteId}/ai/insights` | Generate an advisory insight through server-configured OpenAI-compatible provider. |

### Telemetry contract

Supported metric keys and exact units are: `energy_kwh` (`kWh`), `power_kw` (`kW`), `water_m3` (`m3`), `water_flow_lpm` (`L/min`), `temperature_c` (`°C`), `humidity_pct` (`%`), `voltage_v` (`V`), `current_a` (`A`), `co2_ppm` (`ppm`) and `occupancy_count` (`people`). Every reading has `observedAt`; optional `eventId` is unique per device and supports idempotent retries. The service accepts measurements up to 365 days old and no more than 5 minutes in the future. Bad/uncertain quality is retained but excluded from energy analytics; the sample count reflects only good-quality points used in the calculation.

## Configuration

The backend reads only server-side environment variables:

```dotenv
AI_ENABLED=false
AI_BASE_URL=https://api.openai.com
AI_API_KEY=
AI_MODEL=gpt-4o-mini
```

Keep AI disabled until the organization approves provider data handling and the API key is held by a production secret manager. Never place the provider key in a `VITE_` variable, browser storage, source control or a prompt. The AI endpoint accepts HTTPS; HTTP is allowed only for localhost development.

## Verification status of this update

- Source/package/configuration files were inspected and changed.
- The standalone spatial GeoJSON validator regression tests and frontend API-contract test were added.
- SQL migration consistency, Java compilation, Spring context startup, JPA repository derivation, Testcontainers migrations, frontend TypeScript, Vitest, and Vite build have **not** been run in this environment. The blocker is missing Maven/Bun/Docker and unreachable Maven Central, not evidence that the checks pass.
- The new GitHub Actions workflow is included but has not run; CI status is NOT VERIFIED.
- The migration is additive (`V5`) and does not instruct the operator to delete PostgreSQL volumes or reset existing data. Back up the local database before applying it.

## Local verification on the Mac

From the project root:

```sh
bun install --frozen-lockfile
bun run lint
bun run test
bun run build

cd backend
mvn -Dtest=SpatialGeometryValidatorTest test
mvn verify
cd ..
docker compose --env-file backend/.env config --quiet
docker compose --env-file backend/.env up -d --build
docker compose --env-file backend/.env ps
```

Confirm Flyway V5 is applied in the API startup logs and run the existing local OIDC verifier. Keep the original local volumes; do not use `docker compose down -v`.

## Local Phase 4 smoke-test result — 2026-11-21

The user ran `backend/scripts/verify-phase4-smoke.py` on the local Mac and reported `PHASE 4 LOCAL SMOKE TEST: PASSED`. Reported checks include:

- OIDC tokens acquired and issuer/audience/organization claims checked for local-admin, local-member and local-other-admin without printing/saving tokens.
- API readiness and authorized QA-site guard.
- Existing active floor plan readback and pre-test local PostgreSQL backup.
- Synthetic QA room creation/list readback; spatial element create/list/version history; stale update rejected with 409; MEMBER geometry write denied with 403; cross-tenant spatial read concealed with 404; spatial element and immutable version persistence confirmed.
- Telemetry device registration, two-point batch ingestion, idempotent retry, history readback, device revocation, revoked credential rejected with 401, and PostgreSQL persistence confirmed.
- Effective-dated energy factor creation, analytics summary with the synthetic interval and configured cost/emissions factors, MEMBER write denial and PostgreSQL persistence confirmed.
- Work-order creation and `open → triaged → in_progress → completed` transitions; readback, event history, stale version rejection, MEMBER create denial, cross-tenant list concealment and PostgreSQL persistence confirmed.
- AI disabled guard returned 503 without an external provider call; disabled-attempt usage event persisted.
- Static checks found CI workflow configuration, local backup helper and loopback-only Compose bindings.

The first smoke-test run logged that the frontend dev server was not reachable. The user subsequently ran `curl -I http://localhost:3000` and received HTTP 200. This confirms the frontend HTTP shell is now reachable, but not a complete browser-driven sign-in or end-to-end user journey. The user's current screenshot shows Keycloak's email verification step; their local realm routes verification mail to Mailpit, not the user's external iCloud inbox.

The smoke test intentionally retains its labelled synthetic QA room/mapping, telemetry readings, completed work order and energy factor on the local verification site. The test device is revoked. A local PostgreSQL backup was created before test writes.

**Still not verified:** live AI provider execution, complete browser OIDC sign-up/verification/login and all live UI flows, GitHub Actions run status, production SMTP delivery to real inboxes, deployed production identity/API/database, encrypted off-device backups and restore drill, monitoring, load/penetration testing and production deployment. The local Keycloak `start-dev` + Mailpit configuration remains development-only.
