# WattScape API v1

Base path: `/api/v1`. Authenticated application routes require a valid bearer access token from the configured OIDC issuer. Health and OpenAPI routes are public. The resource server validates JWT signature, issuer and configured audience. Data access additionally requires an active `organization_users` membership matching the verified issuer, subject and selected organization. A supplied `X-Organization-Id` header is only a selector; the API verifies membership server-side.

## Existing identity and resource routes

| Method | Path | Access and behavior |
|---|---|---|
| GET | `/api/v1/me` | Active member identity and role for selected organization. |
| GET | `/api/v1/organizations/current` | Current organization DTO. |
| GET | `/api/v1/organizations/memberships` | Memberships of the authenticated subject. |
| GET | `/api/v1/organizations/current/members` | Minimal active member options for assignment; Owner/Admin/Site Admin/Facilities Operator. |
| POST | `/api/v1/organizations/active` | Select a membership after backend validation. |
| POST | `/api/v1/organizations/current/invitations` | Owner/Admin creates allowed invitation and sends email; never returns the invite code. |
| POST | `/api/v1/organizations/current/invitations/{invitationId}/revoke` | Owner/Admin revokes a pending invite in the active organization; returns 204. |
| POST | `/api/v1/onboarding/invitations/accept` | Verified matching-email identity accepts a single-use invitation code. |
| GET / POST | `/api/v1/sites` | List sites / Owner/Admin/Site Admin create a site, default building, Ground floor and twin graph records. |
| GET | `/api/v1/sites/{siteId}/twin` | Site-scoped buildings, floors, rooms, assets, twin nodes and edges. |
| GET / POST | `/api/v1/sites/{siteId}/rooms` | List/create rooms. Create: Owner/Admin/Site Admin/Facilities Operator. |
| GET / POST | `/api/v1/sites/{siteId}/assets` | List/create assets. Create: Owner/Admin/Site Admin/Facilities Operator. |

## Spatial twin routes (Phase 4B)

| Method | Path | Access and behavior |
|---|---|---|
| GET | `/api/v1/sites/{siteId}/floors/{floorId}/plan` | Read the active floor-plan metadata revision. |
| POST | `/api/v1/sites/{siteId}/floors/{floorId}/plan` | Owner/Admin/Site Admin creates a new revision; previous revision is deactivated, not deleted. |
| GET | `/api/v1/sites/{siteId}/floors/{floorId}/spatial-elements` | List active room/asset spatial mappings. |
| PUT | `/api/v1/sites/{siteId}/floors/{floorId}/spatial-elements/{entityType}/{entityId}` | Create/update room or asset mapping. Entity type must be `room` or `asset`. Room geometry is GeoJSON `Polygon`/`MultiPolygon`; asset geometry is `Point`. Facilities Operator may edit. |
| GET | `/api/v1/sites/{siteId}/floors/{floorId}/spatial-elements/{elementId}/versions` | Read immutable version snapshots. |
| DELETE | `/api/v1/sites/{siteId}/floors/{floorId}/spatial-elements/{elementId}` | Owner/Admin/Site Admin retires mapping; the room/asset source row is preserved. |

`PUT` accepts `expectedVersion: 0` when creating a new mapping. Updates must include the current positive `expectedVersion`; stale versions return 409. The database uses a separate optimistic lock column to prevent lost updates. Spatial coordinates are in the floor's local Cartesian unit/frame. The current release does not accept CAD/BIM drawing files or store/render 3D meshes.

## Telemetry routes (Phase 4C)

| Method | Path | Access and behavior |
|---|---|---|
| GET / POST | `/api/v1/sites/{siteId}/telemetry/devices` | List devices / Owner/Admin/Site Admin registers an HTTPS device. Raw device secret is returned once only. |
| POST | `/api/v1/sites/{siteId}/telemetry/devices/{deviceId}/revoke` | Owner/Admin/Site Admin revokes device credentials; returns 204. |
| POST | `/api/v1/telemetry/ingest/{deviceId}` | Device-authenticated batch ingestion; up to 250 measurements. |
| GET | `/api/v1/sites/{siteId}/telemetry/latest?limit=100` | Latest site telemetry, maximum 500 rows. |
| GET | `/api/v1/sites/{siteId}/telemetry?metricKey=energy_kwh&from=...&to=...&limit=500` | Metric history for at most 90 days, maximum 1,000 rows. |

Ingestion uses `Authorization: Device <one-time-secret>`. Only a SHA-256 hash is stored. Do not send this secret to the browser, commit it, or place it in a frontend environment variable. HTTPS is the only implemented protocol. MQTT, Modbus and BACnet are not connected despite future protocol values in the schema.

Allowed metric/unit pairs: `energy_kwh` / `kWh`; `power_kw` / `kW`; `water_m3` / `m3`; `water_flow_lpm` / `L/min`; `temperature_c` / `°C`; `humidity_pct` / `%`; `voltage_v` / `V`; `current_a` / `A`; `co2_ppm` / `ppm`; `occupancy_count` / `people`. Each reading requires an ISO-8601 `observedAt`; an optional `eventId` makes retries idempotent per device. Future timestamps beyond five minutes and data older than one year are rejected. Bad/uncertain samples are retained but not used by energy analytics.

## Work orders (Phase 4D)

| Method | Path | Access and behavior |
|---|---|---|
| GET / POST | `/api/v1/sites/{siteId}/work-orders` | List up to 500 newest work orders / create work order. |
| GET / PATCH | `/api/v1/sites/{siteId}/work-orders/{workOrderId}` | Read/update one order. Updates require `expectedVersion`; stale writes return 409. |
| GET | `/api/v1/sites/{siteId}/work-orders/{workOrderId}/events` | Read append-only status/assignment history. |

Priorities: `low`, `medium`, `high`, `urgent`. Statuses/transitions: `open` → `triaged` or `cancelled`; `triaged` → `in_progress`, `blocked`, or `cancelled`; `in_progress` → `blocked`, `completed`, `triaged`, or `cancelled`; `blocked` → `in_progress` or `cancelled`; `completed` and `cancelled` are terminal. Owner/Admin/Site Admin/Facilities Operator may create, assign and manage orders. Auditor/Read Only memberships are not eligible assignees; the API enforces this rule. Technicians may create self-assigned orders and update only orders assigned to their verified subject; they cannot assign work to other members. Notifications, SLAs and third-party CMMS integrations are outside this release.

## Energy analytics (Phase 4E)

| Method | Path | Access and behavior |
|---|---|---|
| GET | `/api/v1/sites/{siteId}/analytics/energy?from=...&to=...` | Aggregate up to 90 days of good-quality interval energy, water and sampled power readings. |
| POST | `/api/v1/sites/{siteId}/analytics/energy/factors` | Owner/Admin/Energy & Sustainability Analyst stores site factors with `effectiveFrom`, ISO currency, electricity cost per kWh, grid emissions kg per kWh and water cost per m³. |

Effective-dated factors are applied at each reading's timestamp. Monetary totals are suppressed if a reading lacks an applicable factor or mixed currencies would otherwise be summed. Emissions are likewise suppressed if effective emissions factors are missing. Matching telemetry is aggregated in bounded pages across the complete requested period; see the completeness note below. Average power is the average of sampled `power_kw` readings, not a time-weighted average. `energy_kwh` is treated as interval consumption; cumulative meter registers must be converted to deltas before ingestion.

## AI insight gateway (Phase 4F)

| Method | Path | Access and behavior |
|---|---|---|
| POST | `/api/v1/sites/{siteId}/ai/insights` | Owner/Admin/Energy & Sustainability Analyst/Facilities Operator requests an `energy_review` or `maintenance_review`. |

Configuration is server-side only: `AI_ENABLED` (default `false`), `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`. The endpoint must use HTTPS; HTTP is permitted only on localhost development. The service checks a per-actor rolling 20-request/hour limit and uses 5-second connect/20-second read timeouts. The counter is database-backed but the check is not an atomic distributed quota under concurrent requests; enforce a gateway/provider quota before production. The configured provider receives the selected task, the user's question, a minimized 30-day site-level aggregate telemetry summary, sample count, caveats and open work-order count. Full site name, organization ID, user ID, device secrets, OIDC tokens and passwords are excluded from the generated prompt. User-entered question text is forwarded as submitted and may itself contain identifying information; the UI warns users not to include confidential or personal data. Provider-side processing/retention follows the configured provider's terms and is not guaranteed to be ephemeral. Prompt and response content are not saved; only provider/model/task/outcome/token-count/latency metadata is persisted. AI results are advisory and do not trigger equipment actions. External provider calls are not verified until an administrator configures an approved key and conducts a controlled test.

## Errors and API discovery

Errors use RFC 9457-style `application/problem+json` responses. Validation errors include an `errors` object keyed by request field; responses include `requestId` when available. Cross-tenant resources are reported as 404. OpenAPI UI is `/swagger-ui.html`; JSON is `/api-docs`. Both require an ADMIN realm role; unauthenticated and non-ADMIN requests are denied by the API security filter.

### Work-order partial update fields

`PATCH /api/v1/sites/{siteId}/work-orders/{workOrderId}` requires `expectedVersion`. Omitted `dueAt` preserves the existing value. A non-null ISO-8601 `dueAt` sets/replaces it. Set `clearDueAt: true` to explicitly clear it; supplying both `dueAt` and `clearDueAt: true` is rejected with 400. The `Auditor/Read Only` role cannot be selected as an assignee; the backend rejects direct API attempts as well as the UI filtering.

### Analytics completeness

The 90-day analytics endpoint scans matching telemetry in bounded pages of 2,000 rows and computes totals and daily aggregates across the complete selected period. It no longer stops at 10,000 rows or labels a complete aggregate as truncated. Cost/emissions caveats, mixed-currency suppression and quality filtering remain unchanged. The result's `truncated` flag remains for contract compatibility and is `false` for this full-range calculation; any future detail-only truncation must be represented separately.
