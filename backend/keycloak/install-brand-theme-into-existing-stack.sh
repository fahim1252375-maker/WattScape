#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /absolute/path/to/existing-wattscape-project" >&2
  exit 2
fi

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_THEME="$SOURCE_ROOT/backend/keycloak/themes/wattscape-brand"
TARGET_ROOT="$1"
TARGET_THEME="$TARGET_ROOT/backend/keycloak/themes/wattscape-brand"

if [[ ! -f "$TARGET_ROOT/docker-compose.yml" ]]; then
  echo "ERROR: target is not the existing WattScape Compose project: $TARGET_ROOT" >&2
  exit 1
fi
if [[ ! -d "$TARGET_ROOT/backend/keycloak/themes" ]]; then
  echo "ERROR: expected Keycloak theme bind-mount directory is missing: $TARGET_ROOT/backend/keycloak/themes" >&2
  exit 1
fi
if [[ ! -f "$SOURCE_THEME/login/theme.properties" ]]; then
  echo "ERROR: source branded theme is incomplete: $SOURCE_THEME" >&2
  exit 1
fi

mkdir -p "$TARGET_THEME"
if [[ -d "$TARGET_THEME" ]] && [[ -n "$(find "$TARGET_THEME" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  backup="$TARGET_THEME.backup.$(date +%Y%m%d-%H%M%S)"
  cp -R "$TARGET_THEME" "$backup"
  echo "Existing branded theme backed up to: $backup"
fi
cp -R "$SOURCE_THEME/." "$TARGET_THEME/"

echo "WattScape branded Keycloak theme copied successfully."
echo "No container, realm, database, volume, user, or secret was changed by this installer."
echo "Realm configuration is intentionally NOT changed by this installer."
echo "Do not run a realm updater against the existing/shared Keycloak stack."
echo "For a dedicated disposable Keycloak with synthetic data only, follow docs/KEYCLOAK-SETUP.md and confirm the target before any realm update."
echo "For UI rollback, select the previous login theme (wattscape or keycloak.v2) in the Keycloak Realm Themes settings."
