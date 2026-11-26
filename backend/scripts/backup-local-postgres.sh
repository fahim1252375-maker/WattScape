#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
ENV_FILE="${WATSCAPE_ENV_FILE:-backend/.env}"
if [[ ! -r "$ENV_FILE" ]]; then
  echo "Cannot read $ENV_FILE. Create the local environment first." >&2
  exit 1
fi

BACKUP_DIR="${WATSCAPE_BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="${WATSCAPE_BACKUP_FILE:-$BACKUP_DIR/wattscape-$STAMP.dump}"
if [[ -e "$BACKUP_FILE" ]]; then
  echo "Refusing to overwrite existing backup: $BACKUP_FILE" >&2
  exit 1
fi

umask 077
TMP_FILE="$BACKUP_FILE.tmp"
trap 'rm -f "$TMP_FILE"' EXIT

docker compose --env-file "$ENV_FILE" exec -T postgres sh -c \
  'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom' > "$TMP_FILE"
if [[ ! -s "$TMP_FILE" ]]; then
  echo "Database backup is empty; refusing to publish it." >&2
  exit 1
fi
mv "$TMP_FILE" "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"
# Record the digest against the bare file name so the checksum file does not embed
# absolute local paths (which reveal the workstation user and directory layout).
if command -v shasum >/dev/null 2>&1 || command -v sha256sum >/dev/null 2>&1; then
  BACKUP_DIR_ABS="$(cd "$(dirname "$BACKUP_FILE")" && pwd)"
  BACKUP_NAME="$(basename "$BACKUP_FILE")"
  if command -v sha256sum >/dev/null 2>&1; then
    (cd "$BACKUP_DIR_ABS" && sha256sum "$BACKUP_NAME") > "$BACKUP_FILE.sha256"
  else
    (cd "$BACKUP_DIR_ABS" && shasum -a 256 "$BACKUP_NAME") > "$BACKUP_FILE.sha256"
  fi
  chmod 600 "$BACKUP_FILE.sha256"
fi
trap - EXIT
printf 'Local PostgreSQL backup created: %s\n' "$BACKUP_FILE"
printf 'Protect this file as sensitive data. Encrypt it before off-device storage.\n'
