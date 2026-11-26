# WattScape Phase 4 — Mac Local Acceptance Runbook

**Prepared:** 2026-11-25  
**Source of truth:** `~/Documents/Codex/2026-11-21/files-mentioned-by-the-user-wattscape/work/release-candidate/WattScape-Phase4-100-Score-Final-Source`

This runbook is for the owner to execute in **Mac Terminal**. The checks were not run by the authoring environment. Do not replace this source with an older ZIP. Keep local secrets, passwords, cookies, access tokens, private keys, and full `Authorization` headers out of terminal transcripts, screenshots, logs, and chat.

## 0. Confirm the working tree and tools

These commands are read-only except that `bun install` in the next section will populate local dependencies.

```bash
cd "$HOME/Documents/Codex/2026-11-21/files-mentioned-by-the-user-wattscape/work/release-candidate/WattScape-Phase4-100-Score-Final-Source"
pwd
test -f playwright.config.ts && test -f backend/pom.xml && test -f backend/src/test/java/com/wattscape/identity/SignedJwtSecurityIntegrationTest.java && echo "PASS: expected release-candidate files found"
bun --version
java -version
mvn -version
docker compose version
```

Do not run `cat`, `env`, `printenv`, `docker inspect` without a redacted format, or commands that dump `.env` contents.

## 1. Run Playwright E2E

The project currently defines 10 Playwright tests. They cover the synthetic demo UI, including the new mobile/tablet navigation check. This suite **does not** contact Keycloak, the API, SMTP, or AI; it is not the connected OIDC acceptance suite.

First confirm port 4173 is free. This is read-only; no output means no listener was found:

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

If a listener appears, identify it without killing it. Choose another free port and use the `E2E_PORT` command below; Playwright is configured to reuse an existing server locally, so never let it silently reuse an unknown service.

Prepare dependencies and Chromium. `bun install` writes only local dependency files; Chromium installation writes to the local Playwright browser cache. Run the install command only if Chromium is not already installed:

```bash
bun install --frozen-lockfile
bunx playwright install chromium
```

Run from the source root:

```bash
bun run e2e
```

If using a checked-free alternate port, for example 4174:

```bash
E2E_PORT=4174 bun run e2e
```

The script builds `dist/`, starts Vite Preview on loopback, and writes `e2e-report/` and `e2e-results/`. These are generated artifacts. PASS requires Playwright to start and report all 10 tests passed. A `listen EPERM`/port error before browser launch is **BLOCKED**, not an E2E test pass. A browser launch failure is also not a passed assertion suite.

## 2. Diagnose Docker safely and identify port 55432

All commands in this section are read-only. Do not run `chmod`, `chown`, `sudo`, Docker socket exposure commands, `docker compose up/down`, or volume cleanup as a diagnostic.

```bash
docker context show
docker context ls
docker context inspect "$(docker context show)" --format '{{json .Endpoints.docker.Host}}'
docker info --format 'Docker server={{.ServerVersion}}'
ls -l "$HOME/.docker/run/docker.sock"
docker ps --filter publish=55432 --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}'
```

If `docker info` says permission denied, record that exact error and stop Docker-backed testing in that terminal. Open Docker Desktop normally and retry from Mac Terminal. If it still fails, ask the owner/operator to resolve the Docker Desktop context/socket issue; do not change socket permissions or broaden privileges.

The `docker ps` command must identify **exactly one** container publishing port 55432. Copy only that container ID into `CID` below. If none or more than one appears, stop and resolve the identity ambiguity first.

```bash
CID='<paste-the-single-container-id-from-docker-ps>'
docker inspect --format 'name={{.Name}} image={{.Config.Image}} compose_project={{index .Config.Labels "com.docker.compose.project"}} compose_service={{index .Config.Labels "com.docker.compose.service"}} mounts={{range .Mounts}}{{.Type}}:{{if .Name}}{{.Name}}{{else}}bind{{end}}->{{.Destination}};{{end}}' "$CID"
docker port "$CID" 5432/tcp
```

Confirm the image, Compose project/service labels, mount name/type, and intended QA ownership with your local service inventory. `docker port` must show the intended loopback mapping to host port `55432`. Do not proceed merely because the container is named `postgres`.

The checked-in root `docker-compose.yml` currently maps its `postgres` service to `127.0.0.1:5432` and attaches a persistent named volume `wattscape-postgres`. The host-run Phase 4 notes describe a separate database on 55432. Those facts mean the root Compose `postgres` service must not be assumed to be that Phase 4 database.

The next commands read Compose state and issue **SELECT-only** database queries. They do not print environment values or modify rows. Compare the IDs manually; do not run the smoke script unless the IDs match exactly and you independently confirm the QA database/project identity.

```bash
COMPOSE_POSTGRES_CID="$(docker compose --env-file backend/.env ps -q postgres)"
printf '55432 container: %s\nCompose postgres service: %s\n' "$CID" "$COMPOSE_POSTGRES_CID"
```

If the output is empty, contains multiple IDs, or differs from `$CID`, **STOP**. Do not run `verify-phase4-smoke.py` or its backup helper. The checked-in smoke and backup scripts run `docker compose ... exec postgres` from the project root; they follow that Compose project, not whichever database URL the host-run API may be using.

Only after identity is independently confirmed, inspect the selected database with read-only SQL:

```bash
docker exec -i "$CID" sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' <<'SQL'
select current_database(), current_user, current_setting('server_version_num');
select version, success from flyway_schema_history order by installed_rank;
select id, name, code from sites where code = 'LOCAL-RUNTIME-01';
SQL
```

Confirm the database name is the intended Phase 4 QA database, migrations V1–V6 are successful, and any `LOCAL-RUNTIME-01` row is the synthetic QA verification site. If the query fails, values do not match, or ownership is unclear, stop. Do not reset, truncate, restore over, or drop anything.

## 3. Run focused signed-JWT tests, fail closed on skips

These tests use a disposable Testcontainers PostgreSQL 17.6 instance and ephemeral test RSA keys. They do not connect to the host database on port 55432. The class uses `@Testcontainers(disabledWithoutDocker = true)`, so it can report skipped tests if Docker is unavailable; the report gate below prevents treating that as PASS.

From the source root, run the focused suite:

```bash
mvn -f backend/pom.xml --batch-mode --no-transfer-progress -Dtest=SignedJwtSecurityIntegrationTest clean test
```

Require all six tests to execute with no skips:

```bash
JWT_REPORT='backend/target/surefire-reports/com.wattscape.identity.SignedJwtSecurityIntegrationTest.txt'
grep -E '^Tests run: 6, Failures: 0, Errors: 0, Skipped: 0([, ]|$)' "$JWT_REPORT"
```

Only continue if Maven succeeds **and** that report line matches. If the report says `Skipped: 6`, Docker/Testcontainers was not available to the test JVM; mark the result BLOCKED and fix Docker Desktop access from Mac Terminal. Do not use `-DskipTests`, `-Dtest=...` exclusions, or claim the cryptographic tests passed from compilation alone.

## 4. Run the full backend verification

After the focused gate passes:

```bash
mvn -f backend/pom.xml --batch-mode --no-transfer-progress clean verify
```

This cleans and rebuilds only `backend/target/`, runs unit and integration tests, and packages the backend JAR. It does not deploy the JAR or connect the integration suite to the host Phase 4 DB. Testcontainers creates disposable containers. The optional Mailpit smoke test may remain skipped if its opt-in environment is not configured.

Recheck the fresh report produced by this `clean verify` (do not reuse the focused run's earlier report):

```bash
grep -E '^Tests run: 6, Failures: 0, Errors: 0, Skipped: 0([, ]|$)' \
  backend/target/surefire-reports/com.wattscape.identity.SignedJwtSecurityIntegrationTest.txt
```

Require `BUILD SUCCESS`, six JWT tests, zero failures/errors, and zero skips in that class report. Also review the Surefire summaries for TenantIsolation, ScratchRestore, and Telemetry integration tests; with Docker available they must not be silently skipped. Record any optional Mailpit skip separately.

## 5. Verify Keycloak and the Phase 4 API without exposing tokens

These checks are read-only. Expected local Phase 4 values from the host-runtime guide are Keycloak `8081`, API `8082`, and realm `wattscape-local`.

```bash
curl -fsS -o /dev/null -w 'Keycloak discovery HTTP %{http_code}\n' \
  http://localhost:8081/realms/wattscape-local/.well-known/openid-configuration
curl -fsS http://localhost:8081/realms/wattscape-local/.well-known/openid-configuration \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("issuer="+d["issuer"]); print("jwks_uri="+d["jwks_uri"])'
curl -fsS -o /dev/null -w 'API readiness HTTP %{http_code}\n' \
  http://localhost:8082/actuator/health/readiness
curl -sS -o /dev/null -w 'Unauthenticated /api/v1/me HTTP %{http_code}\n' \
  http://localhost:8082/api/v1/me
```

Expected results: discovery HTTP 200; issuer exactly `http://localhost:8081/realms/wattscape-local`; API readiness HTTP 200 with status UP (body intentionally discarded); unauthenticated `/api/v1/me` HTTP 401. The discovery output contains public issuer/JWKS metadata, not credentials. Do not use `curl -v`, dump response headers, or request token endpoints in this handoff.

The local runtime guide identifies the currently reported Keycloak at 8081 as shared Phase 1 infrastructure. Do not import/update a realm, create clients/users, change credentials, or edit persistent Keycloak data for this acceptance run. If the existing realm/client has not already been confirmed as the intended local test configuration with synthetic identities, mark real OIDC acceptance BLOCKED and arrange a separately isolated disposable IdP first.

## 6. Perform real browser login and tenant/workflow acceptance

Only use already-provisioned synthetic test identities. The frontend uses Authorization Code + PKCE. Do not use production accounts, password-grant smoke scripts, real customer records, or copy tokens/cookies from browser developer tools.

In a separate Mac Terminal tab, start the frontend with the confirmed local public configuration:

```bash
cd "$HOME/Documents/Codex/2026-11-21/files-mentioned-by-the-user-wattscape/work/release-candidate/WattScape-Phase4-100-Score-Final-Source"
VITE_WATSCAPE_API_BASE_URL=http://localhost:8082 \
VITE_OIDC_AUTHORITY=http://localhost:8081/realms/wattscape-local \
VITE_OIDC_CLIENT_ID=wattscape-local \
bun run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

These are public browser configuration values, not secrets. Do not put secrets in `VITE_*` values. In the browser, run this sequence:

1. Open `http://localhost:3000`, select Live API Mode, and complete the Keycloak login using the approved synthetic account. Confirm the callback returns to WattScape.
2. Confirm the Live API identity and organization load. In Network tools, inspect only request URL origin/path and status. Verify API calls target port `8082`; do not reveal request/response headers, cookies, token bodies, or screenshots containing credentials.
3. With a synthetic ADMIN, verify allowed reads and—only on the confirmed synthetic QA database—one clearly labelled synthetic write per intended workflow. Confirm the UI reports success only after the API responds.
4. With a synthetic MEMBER, verify permitted reads and that protected write attempts return/communicate HTTP 403. Verify an unauthenticated protected API request returns 401.
5. Use two synthetic tenants. Confirm the account for Tenant A sees only Tenant A records; request a Tenant B resource from Tenant A and verify access is denied/hidden (expected 403/404 according to endpoint contract). Then sign in as Tenant B's synthetic ADMIN and verify its own tenant-scoped data.
6. Exercise the intended Phase 4 UI workflows—spatial/floor-plan, telemetry history/latest, work-order lifecycle, analytics, and AI-disabled guard—only with synthetic QA data. Do not opt into a live AI provider request. A telemetry device registration reveals a one-time secret: do not copy it to screenshots/logs; if credential-handling cannot be kept private, skip that operation and mark it NOT RUN.
7. Sign out. Confirm protected access is no longer available. For expiry behavior, use an approved short-lived synthetic test session or wait for the synthetic session to expire; do not alter persistent Keycloak settings to force expiry.

Any workflow that writes data requires the target database gate in section 2 to have passed. If it has not, do read-only checks only and mark writes NOT RUN.

## 7. Retry dependency audit after network recovery

This is read-only with respect to source/lockfiles; it contacts the npm advisory service. Run after DNS and outbound network access are restored:

```bash
cd "$HOME/Documents/Codex/2026-11-21/files-mentioned-by-the-user-wattscape/work/release-candidate/WattScape-Phase4-100-Score-Final-Source"
bun audit --audit-level=low
```

Record the actual exit status and advisory count. If it returns `DNSResolveFailed` or another network error, mark BLOCKED/unknown vulnerabilities. Do not run `bun audit fix`, `bun update`, or automatic upgrades as part of this check.

## 8. Strict gate for `verify-phase4-smoke.py`

**Default decision for the current checked-in Compose setup: DO NOT RUN.** The script is write-capable, creates a local database dump, writes synthetic room/spatial/telemetry/factor/work-order/AI-usage records, and intentionally retains them. It obtains local Keycloak tokens. Its backup helper also uses `docker compose ... exec postgres`. Neither script selects the host's 55432 database based on the API URL.

Run it only if every condition below is independently proven and the owner accepts the retained synthetic rows and unencrypted local backup:

- Exactly one intended Phase 4 QA PostgreSQL container publishes loopback `55432`.
- Image, Compose project/service labels, volume/mount ownership, database name, migration history, and synthetic QA site identity have been confirmed read-only.
- `docker compose --env-file backend/.env ps -q postgres` returns exactly the same container ID as the container publishing 55432. The root Compose definition currently maps PostgreSQL to host `5432` and a persistent named volume; if the ID differs or is uncertain, the gate FAILS and the script stays NOT RUN.
- Local API port configuration is privately confirmed as `8082`; Keycloak is the intended synthetic local realm; all configured accounts are synthetic. Do not print or share `.env` values.
- The QA database is backed up by a verified method to a known local path with adequate space. The script's default `backups/` dump is unencrypted, sensitive, and retained; protect it and do not upload it.
- AI remains disabled or `WATSCAPE_SMOKE_ALLOW_AI` is not set to `true`. Never permit a billable/external AI request during this runbook.

If—and only if—all gates pass, first review the script and use the existing synthetic `Local Runtime Verification` site/floor UUIDs from the owner's private QA notes. The actual invocation is write-capable:

```bash
python3 backend/scripts/verify-phase4-smoke.py '<SYNTHETIC_QA_SITE_UUID>' '<SYNTHETIC_QA_FLOOR_UUID>'
```

Do not use IDs copied from historical reports unless they have been independently confirmed to identify the current disposable QA database. The script's own pre-write backup does not replace the container-ID gate. If any condition fails or cannot be proven, record `NOT RUN — BLOCKED by database/Compose target identity`; do not attempt a “quick” run.

## 9. Evidence and decision checklist

Use these definitions in the final record:

- **PASS:** command/test reached its intended assertions, completed successfully, and the fresh output/report proves it.
- **FAIL:** the assertion or command ran and reported a defect/failure.
- **BLOCKED:** an environmental prerequisite prevented the intended test from starting or completing (for example, Docker socket permission, port bind `EPERM`, or DNS failure). Do not describe this as a passing test.
- **NOT RUN:** intentionally not executed, including any write-capable check whose target/data-safety gate did not pass.

Record the following without including secrets:

- E2E command, port, Playwright summary (expected 10 tests), exit code, and whether the browser/assertions started.
- Docker context/server check, single container ID (short ID is sufficient), image/project/service identity, `docker port` output, Compose service ID comparison, DB name, and successful Flyway V1–V6 query result. Do not record database passwords or row contents unrelated to the synthetic QA site.
- Focused JWT Maven command and its fresh Surefire line: exactly 6 run, 0 failures, 0 errors, 0 skipped.
- Full `clean verify` result and fresh class reports for Signed JWT, Tenant Isolation, Scratch Restore, and Telemetry. List optional Mailpit skip separately.
- Keycloak discovery issuer/JWKS public URLs, HTTP statuses for readiness and unauthenticated API, and confirmation that browser API requests target `8082`; never include token or cookie values.
- Synthetic ADMIN/MEMBER and tenant/workflow outcomes, each marked PASS/FAIL/BLOCKED/NOT RUN. Record whether any write occurred and its synthetic target.
- Audit exit status/advisory count or network error.
- Smoke script decision. If not run, say why. If run after every gate, record its summary and retained synthetic rows/backup location without including credentials.
- Keep production readiness **NO-GO** until the provider, infrastructure, monitoring, backups, security, and deployment gates are separately verified.

No step in this runbook deploys the application, provisions cloud resources, changes DNS, modifies Docker permissions, resets databases/volumes, or changes Keycloak/Mailpit data.
