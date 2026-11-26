# WattScape — Operations Runbook (monitoring, logging, backup, restore)

Scope: operational readiness for the Phase 4 backend. Items marked **OWNER** need a provider or decision that is not present in this repository.

## 1. Health and readiness (implemented)

- `GET /actuator/health/liveness` — process is alive (no dependency check). Use for restart decisions.
- `GET /actuator/health/readiness` — includes the database. Use for traffic routing.
- `health`, `info` and `prometheus` are exposed. Health details are hidden (`management.endpoint.health.show-details: never`); Prometheus requires the `ADMIN` realm role. Probe responses do not reveal database URLs, stack traces, versions, or identifiers.
- Error responses do not include messages or stack traces (`server.error.include-message: never`, `include-stacktrace: never`); the API returns RFC 7807 problem details with a `requestId`.

## 2. Logging and redaction (reviewed)

- The application logs a request ID (`X-Request-Id`, validated against `[A-Za-z0-9._-]{1,80}`) in MDC on every request.
- A review of every log statement in `backend/src/main/java` found two statements. Both log the request ID and the exception **type only**. Neither logs Authorization headers, cookies, tokens, passwords, telemetry ingest secrets, email addresses, or request bodies.
- Structured logs use the logstash console format (`logging.structured.format.console: logstash`).
- Rule for future code: do not log request headers, bodies, tokens, email addresses, or device secrets. Log identifiers and exception types.

## 3. Monitoring

Implemented now:
- Health probes above (suitable for platform health checks and uptime monitors).
- Structured logs with request IDs for correlation.
- Audit events persisted in `audit_events` (authorisation outcomes and key mutations).
- Prometheus scrape endpoint at `/actuator/prometheus`; access requires the `ADMIN` realm role. Health/info remain public with health details hidden.
- Spring Boot request metrics expose route-template HTTP latency and status codes; Micrometer JVM and Hikari pool meters are available. Telemetry ingestion is visible through HTTP request metrics, not per-device labels.

Templates now exist under `deploy/monitoring/`: Prometheus scrape config, alert rules and a Grafana dashboard template. These are examples only; no scraper, dashboard, alert receiver, or provider has been provisioned. The scrape template uses a protected bearer-token file and private HTTPS endpoint. The token must be rotated out of band and granted `ADMIN` by the current endpoint policy. That identity is highly privileged; keep it isolated and do not expose `/actuator/prometheus` publicly.

Not yet implemented — **OWNER decision and engineering follow-up:**
- Select a provider, set retention/alert receivers, provision the private scrape route and validate the dashboard against real series.
- Readiness probing needs a private blackbox/platform health probe; it is not inferred from Prometheus scrape success.
- No per-device telemetry lag, work-order outcome, SMTP failure counter, or AI cost metric currently exists. Add low-cardinality instrumentation before alerting on these signals; do not label metrics with tenant, user, device, or work-order identifiers.

## 4. Backup

- Helper: `backend/scripts/backup-local-postgres.sh` (local Docker Compose). It writes a `pg_dump --format=custom` file with `umask 077`, `chmod 600`, an atomic temp-file publish, refuses to overwrite, refuses empty output, and writes a SHA-256 sidecar that names the file only (no absolute paths).
- The script never prints credentials and never modifies source data.
- **Production backups:** use managed PostgreSQL point-in-time recovery plus a periodic logical dump (`pg_dump --format=custom`) taken from a read-only role, copied off the database provider. **OWNER:** choose the provider and retention.
- Encrypt dumps before off-device storage (the helper prints this reminder). Store encryption keys separately from dumps.

## 5. Restore drill (current evidence)

`backend/scripts/restore-drill-scratch.sh` restores a dump into a **new, generated** scratch database on an explicitly named scratch server. It:
- requires `SCRATCH_PG_CONFIRM=I_CONFIRM_SCRATCH_SERVER`;
- verifies the SHA-256 sidecar and refuses on mismatch;
- refuses if the generated name equals the active database name;
- refuses to create over an existing database;
- never drops, truncates, or overwrites a database;
- verifies Flyway history, the latest migration, and per-table record readability.

Historical PostgreSQL 16.15 evidence used an emulated Flyway history table and does not qualify as Flyway restore evidence.

Fresh independent drill on 2026-11-22 (Mac ARM64; Testcontainers PostgreSQL 17.6 with its data directory on tmpfs):
- Flyway actually migrated the scratch source through V1–V5; two synthetic organizations and two tenant-owned sites were inserted.
- A custom-format PostgreSQL dump was created using the production helper's `pg_dump --format=custom` flags, SHA-256 hashed, and passed to the actual `restore-drill-scratch.sh`.
- The restore helper completed into a separately generated database. Flyway itself validated all five restored migrations; versions, row counts, representative tenant rows, and unchanged source snapshot matched.
- Negative tests passed: missing confirmation, checksum mismatch, pre-existing target name, and active database name collision were refused. No drop, truncate, or persistent database operation was run.
- The drill took 2.5 seconds in this tiny synthetic scratch cluster. This is not a production-sized RTO measurement.
- Limitation: the backup helper's Docker Compose wrapper was not run against the owner's already-running local stack. Dump creation used the same `pg_dump` command against the isolated Testcontainer. Managed-provider PITR, encryption/off-site storage, and production-size restore remain unverified.

## 6. Recovery objectives (assumptions, not measured commitments)

| Objective | Proposed target (OWNER to confirm) | Basis |
|---|---|---|
| RPO (data loss tolerance) | ≤ 15 minutes with managed PITR enabled; ≤ 24 hours if only nightly dumps | Managed PITR cadence and dump schedule |
| RTO (time to restore service) | ≤ 4 hours for a full database restore plus redeploy | Restore duration of the drill scales with data size; measure on production-sized data before committing |

Measure actual restore time on production-sized data before publishing these targets.

## 7. Retention, encryption, access

- Retention: owner decides (proposed: 30 daily, 12 monthly dumps; PITR window per provider).
- Encryption: at rest on the provider; dump files encrypted with a key held outside the dump store.
- Access: backup storage restricted to the restore owner and deployment role; access logged by the provider.
- Restore owner: **OWNER** names one accountable person and a deputy.

## 8. Incident escalation (outline)

1. Detect: readiness failing, 5xx spike, or customer report.
2. Triage: check readiness and logs for the request ID; do not paste tokens or secrets into tickets.
3. Contain: roll back the frontend or API image (see deployment blueprint §8). Pause telemetry ingest if the device secret is suspected compromised, by revoking the device.
4. Restore if data is damaged: restore to scratch first, verify with the drill script, then cut over under owner approval.
5. Communicate and record the incident and the decision timeline.

## 9. Owner actions still required

- Select the monitoring/alerting provider and wire the alert set above.
- Confirm the ADMIN-only Prometheus endpoint from the deployed network path and configure a private scrape target.
- Configure managed PostgreSQL PITR and off-provider dump storage with encryption.
- Run the backup helper wrapper against a dedicated scratch Compose project and repeat restore on the selected managed PostgreSQL provider; file the report.
- Confirm RPO/RTO and name the restore owner and deputy.
