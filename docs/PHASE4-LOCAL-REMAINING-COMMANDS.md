# WattScape Phase 4 — Owner Mac Remaining Commands

Run from **Mac Terminal**, using the existing release candidate. These commands are instructions for the owner; they were not executed as Mac acceptance in the authoring session. Keep command output redacted. Never run `docker compose down -v`, Docker prune commands, database reset/restore-over commands, or commands that print `.env`, tokens, cookies, passwords, private keys, or authorization headers.

## 1. Confirm candidate and tools

Read-only checks:

```bash
cd "$HOME/Documents/Codex/2026-11-21/files-mentioned-by-the-user-wattscape/work/release-candidate/WattScape-Phase4-100-Score-Final-Source"
pwd
test -f backend/pom.xml && test -f playwright.config.ts && echo 'PASS: release-candidate files found'
bun --version
java -version
mvn -version
docker compose version
```

Use this directory only. Do not extract or copy an older source archive over it.

## 2. Re-run browser tests

The current local Playwright suite has 10 UI tests. It does not prove connected Keycloak/API behavior. Confirm the configured preview port is not owned by an unknown process; this is read-only:

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

If dependencies or Chromium are absent, these commands modify only this checkout’s generated dependencies/browser cache:

```bash
bun install --frozen-lockfile
bunx playwright install chromium
```

Run the suite:

```bash
bun run e2e
```

Require an actual Playwright summary of 10 passed, 0 failed and exit 0. If startup fails before assertions (for example a bind `EPERM`), record BLOCKED, not PASS. The run creates/replaces generated `dist/`, `e2e-report/` and `e2e-results/` outputs; it does not write the database.

## 3. Re-run cryptographic and backend verification

Testcontainers must be available to Maven. These tests use disposable PostgreSQL containers, not the owner’s 55432 database. Focused signed-JWT gate:

```bash
mvn -f backend/pom.xml --batch-mode --no-transfer-progress -Dtest=SignedJwtSecurityIntegrationTest clean test
grep -E '^Tests run: 6, Failures: 0, Errors: 0, Skipped: 0([, ]|$)' \
  backend/target/surefire-reports/com.wattscape.identity.SignedJwtSecurityIntegrationTest.txt
```

Only if all six tests executed with zero skips, run the full verification:

```bash
mvn -f backend/pom.xml --batch-mode --no-transfer-progress clean verify
```

Require the fresh Maven output to say `BUILD SUCCESS`. Inspect the fresh Surefire report summaries for Signed JWT (6), Tenant Isolation, Telemetry, and Scratch Restore; each Docker-backed class must have run with zero failures/errors/skips. Record the optional Mailpit skip separately. Maven `clean verify` changes only `backend/target/` and disposable Testcontainers state; it does not start the host API or migrate the persistent 55432 database.

## 4. Diagnose Docker and identify the database on 55432

The following Docker context and container queries are read-only. Do not alter socket permissions or expose the Docker socket:

```bash
docker context show
docker context ls
docker info --format 'Docker server={{.ServerVersion}}'
ls -l "$HOME/.docker/run/docker.sock"
docker ps --filter publish=55432 --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}'
```

If Docker returns a socket permission error, record its exact text and stop Docker-backed work in that terminal. Open Docker Desktop normally and retry. Do not run `chmod`, `chown`, `sudo`, or any socket-exposure command.

There must be exactly one container publishing 55432. Compare its ID to the owner-observed ID `271b39750e669f52c58baa299a78678ffe8a729cafda47ebc55f6c30228f5722`; treat it as current only if `docker ps` confirms it. Then inspect only non-secret identity fields:

```bash
CID='<paste-confirmed-container-id>'
docker inspect --format 'name={{.Name}} image={{.Config.Image}} project={{index .Config.Labels "com.docker.compose.project"}} service={{index .Config.Labels "com.docker.compose.service"}} mounts={{range .Mounts}}{{.Type}}:{{if .Name}}{{.Name}}{{else}}bind{{end}}->{{.Destination}};{{end}}' "$CID"
docker port "$CID" 5432/tcp
```

Confirm image, project, service, mount/volume name, and loopback mapping to host `55432` against the owner's local service inventory. The owner-reported full container ID and V1–V5 history are not a substitute for current confirmation.

The root `docker-compose.yml` is a different topology: PostgreSQL binds host `5432` with named volume `wattscape-postgres`; its API binds host `8080`. Compare the Compose service ID without dumping resolved configuration or environment values:

```bash
COMPOSE_POSTGRES_CID="$(docker compose --env-file backend/.env ps -q postgres)"
printf '55432 container: %s\nRoot Compose postgres: %s\n' "$CID" "$COMPOSE_POSTGRES_CID"
```

If the IDs differ, Compose returns no ID, or the intended project/database is uncertain, do not use either checked-in Compose helper. Current owner evidence says these containers differ.

If—and only if—the container is independently confirmed as the intended QA database, run read-only SQL directly against that container. This prints the database identity, Flyway versions/status, and only a site count (not customer rows):

```bash
docker exec -i "$CID" sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' <<'SQL'
select current_database(), current_user, current_setting('server_version_num');
select version, success from flyway_schema_history order by installed_rank;
select count(*) from sites;
select count(*) from sites where code = 'LOCAL-RUNTIME-01';
SQL
```

The owner reported V1–V5, zero sites, and no `LOCAL-RUNTIME-01`. If the current read-only results differ, stop and update the database identity assessment before any write.

## 5. Make a protected backup before any persistent change

This creates a local custom-format dump and checksum; the database operation is a read-only `pg_dump`. It does **not** encrypt the dump. Keep it private on this Mac; do not upload or commit it. Run only after confirming `$CID` is the exact target from Step 4:

```bash
set -eu
umask 077
BACKUP_DIR="$HOME/Documents/Codex/2026-11-21/files-mentioned-by-the-user-wattscape/work/backups"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/wattscape-phase4-55432-pre-v6-$(date -u +%Y%m%dT%H%M%SZ).dump"
test ! -e "$BACKUP_FILE"
docker exec "$CID" sh -c 'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom' > "$BACKUP_FILE"
test -s "$BACKUP_FILE"
pg_restore --list "$BACKUP_FILE" >/dev/null
chmod 600 "$BACKUP_FILE"
shasum -a 256 "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
chmod 600 "$BACKUP_FILE.sha256"
printf 'Backup archive verified; path: %s\n' "$BACKUP_FILE"
```

Do not use `backend/scripts/backup-local-postgres.sh` for this target unless root Compose `postgres` has independently been proven to be the same container/database. That helper always runs `docker compose ... exec postgres`, which is the root Compose service; it does not follow `DATABASE_URL`.

### Mandatory stop and approval

After identity and backup are reviewed, **stop before any database write**. The specific proposed first write is Flyway V6 on the confirmed 55432 database. Source V6 is additive:

```sql
CREATE INDEX ix_telemetry_site_latest
ON telemetry_points (organization_id, site_id, observed_at DESC);
```

Applying it via normal candidate API startup changes the persistent database schema. Do not start with Flyway enabled until the owner has reviewed the container ID, project/service, persistent volume, database name, successful backup verification, and explicitly approved this migration. Synthetic organization/site/floor/workflow provisioning is a separate persistent write and needs its own approval/target plan.

## 6. Candidate API readiness, only after the database gate

The root Compose API is port 8080; it is not the host candidate API. The candidate host runtime uses `PORT=8082`, `DATABASE_URL=jdbc:postgresql://localhost:55432/wattscape`, and the `wattscape-local` issuer/JWKS URLs. Keep actual database credentials in the owner's private ignored `backend/.env`; never print or paste them.

After migration approval and verified backup, the owner may start the host JAR in a terminal. This source command reads the private file without printing it and overrides only host-local routing. Confirm the artifact is the intended candidate first:

```bash
cd "$HOME/Documents/Codex/2026-11-21/files-mentioned-by-the-user-wattscape/work/release-candidate/WattScape-Phase4-100-Score-Final-Source"
set -a
. backend/.env
set +a
export DATABASE_URL='jdbc:postgresql://localhost:55432/wattscape'
export PORT=8082
export SERVER_ADDRESS=127.0.0.1
export JWT_ISSUER_URI='http://localhost:8081/realms/wattscape-local'
export JWT_JWK_SET_URI='http://localhost:8081/realms/wattscape-local/protocol/openid-connect/certs'
export SPRING_FLYWAY_ENABLED=true
export SPRING_FLYWAY_VALIDATE_ON_MIGRATE=true
java -jar backend/target/wattscape-backend-1.0.0-SNAPSHOT.jar
```

This normal start may apply pending migrations. Do not run it until the stop/approval gate above is satisfied. Do not expose the API beyond loopback for local acceptance. Stop it with Ctrl-C after checks; do not kill an unidentified process.

After it starts, read-only HTTP checks (response bodies discarded except public OIDC metadata below):

```bash
curl -fsS -o /dev/null -w 'Keycloak discovery HTTP %{http_code}\n' \
  'http://localhost:8081/realms/wattscape-local/.well-known/openid-configuration'
curl -fsS 'http://localhost:8081/realms/wattscape-local/.well-known/openid-configuration' \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("issuer="+d["issuer"]); print("jwks_uri="+d["jwks_uri"])'
curl -fsS -o /dev/null -w 'API readiness HTTP %{http_code}\n' \
  'http://localhost:8082/actuator/health/readiness'
curl -sS -o /dev/null -w 'Unauthenticated protected API HTTP %{http_code}\n' \
  'http://localhost:8082/api/v1/me'
```

Expected discovery/readiness status is 200; issuer must exactly match the API configuration; unauthenticated `/api/v1/me` should return 401. Never use `curl -v`, print authorization headers, call a token endpoint in shell, or inspect browser storage for tokens.

## 7. Connected Keycloak and synthetic workflow acceptance

The owner-reported Keycloak on 8081 is shared Phase 1 infrastructure. Do not edit/import its realm, create clients/users, change passwords/settings, or use its persistent volume for these checks. If the actual test realm/client is not already approved as synthetic and local-only, mark real OIDC acceptance BLOCKED; create a separately isolated disposable IdP outside this production-readiness sprint.

Only after database target approval, backup, migration, API readiness, and approved synthetic test data are confirmed, start Vite with the exact API base variable read by the application:

```bash
VITE_WATSCAPE_API_BASE_URL=http://localhost:8082 \
VITE_OIDC_AUTHORITY=http://localhost:8081/realms/wattscape-local \
VITE_OIDC_CLIENT_ID=wattscape-local \
bun run dev -- --host 127.0.0.1 --port 3000 --strictPort
```

In the browser, use only approved synthetic identities and verify the actual callback, identity/organization load, API requests to port 8082, logout, ADMIN/MEMBER authorization, cross-tenant denial, expiry, and intended spatial/floor-plan, telemetry, work-order, analytics, and AI-disabled behavior. Inspect only request URL and status; never copy token/cookie/header values. Any write must target the approved synthetic QA database and be labelled. Do not enable a live AI provider.

The scripts `backend/scripts/verify-local-oidc.py` and `backend/scripts/verify-phase4-smoke.py` are not substitutes for browser PKCE acceptance. They are write-capable and use local password-grant credentials; do not run them against the shared realm or unconfirmed database.

## 8. Strict gate for `verify-phase4-smoke.py`

Default: **DO NOT RUN**. Its source confirms it obtains password-grant tokens, writes room/spatial/telemetry/factor/work-order/AI-usage data, revokes a test device, and checks rows by invoking root Compose PostgreSQL. Its companion backup helper uses the same Compose service. It can retain rows and a local custom-format dump.

It stays NOT RUN unless all are independently confirmed: (1) the container publishing 55432 is the intended disposable Phase 4 QA database; (2) current ID, image, Compose project/service, persistent mount, DB name, and migration state are reviewed; (3) root Compose `ps -q postgres` returns exactly that same container ID; (4) the local realm and every account are synthetic; (5) the current site/floor IDs are confirmed in that database; (6) a separate verified backup exists; and (7) AI provider calls remain disabled. If any check is uncertain or fails, do not execute it. Current owner evidence reports root Compose PostgreSQL differs from the 55432 DB, so this gate currently fails.

## 9. Retry dependency audit after DNS recovery

Read-only against dependencies; contacts npm registry:

```bash
bun audit --audit-level=low
```

Record actual exit code and advisory count. A DNS/network error is BLOCKED/unknown. Do not run `bun audit fix` or upgrade packages as part of this gate.

## 10. Evidence checklist

- **PASS:** the intended command/test reached its assertions and fresh output/report proves success.
- **FAIL:** it ran and reported a failed assertion or command error.
- **BLOCKED:** a prerequisite such as Docker socket, port binding, or DNS prevented the intended check.
- **NOT RUN:** intentionally not executed, including a write-capable operation whose target/approval gate is unmet.

Record actual command, exit status, timestamp, test report line, Playwright assertion summary, Docker container identity/port/project/service/mount, DB name and Flyway history, backup verification (path/checksum kept private), Keycloak public issuer/JWKS and HTTP statuses, browser API origin/status, each synthetic workflow result, any write and its approved target, and audit result. Omit all credentials, tokens, cookies, private keys, environment values, and customer data.

Production stays **NO-GO** until real connected authentication, production provider/infrastructure, backups/PITR/restore, alert delivery, hosting/DNS/TLS/secrets, deployment, load/accessibility, and security gates have independent evidence.

