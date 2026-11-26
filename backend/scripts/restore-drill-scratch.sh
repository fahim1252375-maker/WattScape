#!/usr/bin/env bash
# Non-destructive restore drill for WattScape PostgreSQL dumps (pg_dump --format=custom).
#
# Restores a dump into a NEW, uniquely named scratch database on a scratch PostgreSQL
# server, then verifies schema migrations and basic record readability.
#
# Safety rules enforced by this script:
#   * The target server must be named explicitly (SCRATCH_PG_HOST/SCRATCH_PG_PORT) and
#     SCRATCH_PG_CONFIRM must equal I_CONFIRM_SCRATCH_SERVER.
#   * The target database name is always generated here (wattscape_restore_drill_<UTC>)
#     and must not already exist; the script never drops, truncates or overwrites a database.
#   * The active database name (ACTIVE_DB_NAME, default "wattscape") is refused.
#   * SCRATCH_PG_STAMP may set a deterministic drill name and is validated as UTC timestamp text.
#   * Passwords are read from PGPASSWORD in the environment and never printed.
#
# Usage:
#   SCRATCH_PG_HOST=127.0.0.1 SCRATCH_PG_PORT=55432 SCRATCH_PG_USER=postgres \
#   SCRATCH_PG_CONFIRM=I_CONFIRM_SCRATCH_SERVER PGPASSWORD=... \
#     backend/scripts/restore-drill-scratch.sh backups/wattscape-<UTC>.dump
set -euo pipefail

DUMP="${1:?usage: restore-drill-scratch.sh <dump-file>}"
: "${SCRATCH_PG_HOST:?set SCRATCH_PG_HOST to a scratch server, never the active database host}"
: "${SCRATCH_PG_PORT:?set SCRATCH_PG_PORT}"
: "${SCRATCH_PG_USER:?set SCRATCH_PG_USER}"
if [[ "${SCRATCH_PG_CONFIRM:-}" != "I_CONFIRM_SCRATCH_SERVER" ]]; then
  echo "Refusing: set SCRATCH_PG_CONFIRM=I_CONFIRM_SCRATCH_SERVER to confirm the target is a disposable scratch server." >&2
  exit 1
fi
[[ -r "$DUMP" ]] || { echo "Cannot read dump file: $DUMP" >&2; exit 1; }
for tool in pg_restore psql; do
  command -v "$tool" >/dev/null 2>&1 || { echo "Required tool not found: $tool" >&2; exit 1; }
done

ACTIVE_DB_NAME="${ACTIVE_DB_NAME:-wattscape}"
STAMP="${SCRATCH_PG_STAMP:-$(date -u +%Y%m%dT%H%M%SZ)}"
if [[ ! "$STAMP" =~ ^[0-9]{8}T[0-9]{6}Z$ ]]; then
  echo "Refusing: SCRATCH_PG_STAMP must be a UTC timestamp in YYYYMMDDTHHMMSSZ format." >&2
  exit 1
fi
TARGET_DB="wattscape_restore_drill_${STAMP}"
if [[ "$TARGET_DB" == "$ACTIVE_DB_NAME" ]]; then
  echo "Refusing: generated database name collides with the active database." >&2
  exit 1
fi

# Optional integrity check against the sidecar digest (matched by file name only).
SIDECAR="${DUMP}.sha256"
if [[ -r "$SIDECAR" ]]; then
  EXPECTED="$(awk '{print $1}' "$SIDECAR")"
  if command -v sha256sum >/dev/null 2>&1; then ACTUAL="$(sha256sum "$DUMP" | awk '{print $1}')"; else ACTUAL="$(shasum -a 256 "$DUMP" | awk '{print $1}')"; fi
  if [[ "$EXPECTED" != "$ACTUAL" ]]; then
    echo "SHA-256 mismatch for dump; refusing to restore." >&2
    exit 1
  fi
  echo "SHA-256 verified against sidecar."
else
  echo "No sidecar digest found; integrity check skipped (record this in the drill report)."
fi

export PGHOST="$SCRATCH_PG_HOST" PGPORT="$SCRATCH_PG_PORT" PGUSER="$SCRATCH_PG_USER"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d postgres)

EXISTS="$("${PSQL[@]}" -tA -c "SELECT 1 FROM pg_database WHERE datname = '${TARGET_DB}'")"
if [[ -n "$EXISTS" ]]; then
  echo "Refusing: database ${TARGET_DB} already exists." >&2
  exit 1
fi
"${PSQL[@]}" -c "CREATE DATABASE \"${TARGET_DB}\""
echo "Created scratch database: ${TARGET_DB} on ${SCRATCH_PG_HOST}:${SCRATCH_PG_PORT}"

pg_restore --no-owner --no-privileges --exit-on-error --dbname="$TARGET_DB" "$DUMP"
echo "pg_restore completed."

VERIFY=(psql -X -v ON_ERROR_STOP=1 -tA -d "$TARGET_DB")
echo "--- schema migrations (Flyway success rows):"
"${VERIFY[@]}" -c "SELECT count(*) FROM flyway_schema_history WHERE success"
echo "--- latest migration:"
"${VERIFY[@]}" -c "SELECT version, description FROM flyway_schema_history WHERE success ORDER BY installed_rank DESC LIMIT 1"
echo "--- record readability (row counts; values are synthetic in drills):"
for table in organizations sites buildings floors rooms assets telemetry_points work_orders; do
  if "${VERIFY[@]}" -c "SELECT to_regclass('public.${table}') IS NOT NULL" | grep -q t; then
    echo "${table}: $("${VERIFY[@]}" -c "SELECT count(*) FROM ${table}")"
  else
    echo "${table}: table not present in this dump"
  fi
done

echo "Drill complete. Scratch database retained for inspection: ${TARGET_DB}"
echo "Drop it manually on the scratch server once the drill report is filed. This script never drops databases."
