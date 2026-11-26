#!/bin/sh
set -eu

PROJECT_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/backend/.env"
TEMPLATE="$PROJECT_ROOT/backend/.env.example"

if [ -e "$ENV_FILE" ]; then
  echo "Refusing to overwrite existing backend/.env. Keep existing local credentials intact."
  exit 1
fi
if ! command -v openssl >/dev/null 2>&1; then
  echo "OpenSSL is required to generate local-only passwords." >&2
  exit 1
fi

umask 077
DB_SECRET="$(openssl rand -hex 24)"
KC_SECRET="$(openssl rand -hex 24)"
ADMIN_SECRET="$(openssl rand -hex 24)"
MEMBER_SECRET="$(openssl rand -hex 24)"

python3 - "$TEMPLATE" "$ENV_FILE" "$DB_SECRET" "$KC_SECRET" "$ADMIN_SECRET" "$MEMBER_SECRET" <<'PY'
from pathlib import Path
import sys

source, destination, db, keycloak, admin, member = sys.argv[1:]
text = Path(source).read_text()
text = text.replace("POSTGRES_PASSWORD=generate-local-secret", f"POSTGRES_PASSWORD={db}")
text = text.replace("DATABASE_PASSWORD=generate-local-secret", f"DATABASE_PASSWORD={db}")
text = text.replace("KC_BOOTSTRAP_ADMIN_PASSWORD=generate-local-secret", f"KC_BOOTSTRAP_ADMIN_PASSWORD={keycloak}")
text = text.replace("WATSCAPE_ADMIN_PASSWORD=generate-local-secret", f"WATSCAPE_ADMIN_PASSWORD={admin}")
text = text.replace("WATSCAPE_MEMBER_PASSWORD=generate-local-secret", f"WATSCAPE_MEMBER_PASSWORD={member}")
Path(destination).write_text(text)
PY
chmod 600 "$ENV_FILE"
echo "Created backend/.env with unique local-only secrets (permissions 600). Values were not printed."
