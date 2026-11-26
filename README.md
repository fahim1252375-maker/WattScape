# WattScape — Intelligent 3D Resource Twin

WattScape includes the original React 19 demo frontend and a Java 21 / Spring Boot API. The current frontend demo mode remains available independently; the backend connected-mode client is not a substitute for the existing demo workflows.

## Frontend demo

Prerequisites: Node.js 24 and Bun 1.4 or compatible. From the project root:

```sh
bun install --frozen-lockfile
test -f .env.local || cp .env.example .env.local
bun run dev
```

The app is served at `http://localhost:3000`. Synthetic fixtures are clearly marked as demo data. Do not put a Gemini or other secret into browser code.

## Live API Mode

The access screen offers two explicit paths: **Enter Demo Mode** keeps the existing synthetic workspace and 3D modules; **Continue to Live API Mode** redirects to the local Keycloak realm using OIDC Authorization Code + PKCE (S256). There is no password form in WattScape. Use the local identity configured in ignored `backend/.env` at Keycloak. Sign-out clears the browser OIDC session through the provider and returns to Demo Mode.

The public Vite settings are in `.env.example`: `VITE_WATSCAPE_API_BASE_URL`, `VITE_OIDC_AUTHORITY`, and `VITE_OIDC_CLIENT_ID`. Vite variables are embedded in browser assets and must contain only public origins/identifiers; never put passwords, client secrets, API keys, or tokens in any `VITE_` value. Callback URLs and Keycloak client settings are documented in [frontend integration](docs/FRONTEND-INTEGRATION.md).

Live mode includes API-backed identity, organization, site hierarchy, rooms, assets, and a Phase 4 Operations area for persisted spatial metadata/GeoJSON, HTTPS telemetry devices and readings, work orders, energy analytics, and an optional server-side AI gateway. These Phase 4 capabilities are implemented in source but require the Mac verification steps below before treating them as runtime-verified. Role checks and tenant scoping are enforced by the backend. Unsupported capabilities remain clearly outside the live API; no live API error silently substitutes synthetic demo data.

Run the frontend checks from the project root:

```sh
bun run lint
bun run test
bun run build
```

## Local backend and Keycloak on Apple Silicon Mac

This Compose setup is for local development only. It runs PostgreSQL, Keycloak in development mode, and the API. Keycloak issues real signed OIDC/JWT tokens from local development users. It is not a production identity deployment.

### 1. Select Java 21 and make Maven visible in this Terminal

The bundled macOS JDK and Homebrew locations are:

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
export PATH="/opt/homebrew/bin:$JAVA_HOME/bin:$PATH"
java -version
javac -version
mvn -version
```

Check that Java and `javac` report version 21 and Maven reports 3.10.x. If Maven is not installed, install it through Homebrew with `brew install maven`, then repeat the checks.

### 2. Start Docker Desktop and check it is ready

```sh
open -a Docker
```

Wait for Docker Desktop to finish starting, then run:

```sh
docker info
docker compose version
```

### 3. Generate ignored local credentials

From the project root:

```sh
./backend/scripts/create-local-env.sh
```

This creates `backend/.env` once with random, local-only passwords and mode `600`. It refuses to overwrite an existing file. The `.env` is ignored; do not commit or share it. The checked-in `backend/.env.example` contains placeholders only.

### 4. Validate and start the local services

**Topology check:** this root Compose file creates/uses its own PostgreSQL volume and publishes PostgreSQL on `5432` and API on `8080`. The previously used Phase 4 host runtime is separately documented on PostgreSQL `55432` and API `8082`. Do not start this Compose stack as a way to resume or verify that Phase 4 runtime, and do not point it at the existing Phase 4 database. If you need the Phase 4 host topology, follow [the host runtime guide](docs/PHASE4-HOST-RUNTIME.md) and [Mac acceptance runbook](docs/MAC-LOCAL-ACCEPTANCE-RUNBOOK.md) instead. Starting Compose here may create a separate local database and identity-provider store.

```sh
docker compose --env-file backend/.env config --quiet
docker compose --env-file backend/.env up -d --build
```

The PostgreSQL named volume remains `wattscape-postgres`. The Keycloak dev-file store uses a separate `wattscape-keycloak-data` volume. Both published ports bind to loopback: PostgreSQL `127.0.0.1:5432`, Keycloak `127.0.0.1:8081`, API `127.0.0.1:8080`. Keycloak imports the realm on first startup. It may take a minute to become ready:

```sh
docker compose --env-file backend/.env ps
docker compose --env-file backend/.env logs --tail=80 keycloak api
```

### 5. Seed the matching local tenant memberships

After PostgreSQL migrations have completed, from the project root:

```sh
docker compose --env-file backend/.env exec -T postgres psql -U wattscape -d wattscape < backend/scripts/seed-local-organization.sql
```

This idempotent script inserts the local ADMIN/MEMBER memberships and a second tenant/site used for isolation checks. It does not delete or update existing rows. Its issuer and fixed local subject IDs match the imported realm. Do not run this seed into a production database.

### 6. Create a local database backup before applying Phase 4 migrations

The source contains migrations V1–V6. Back up the local Compose database before applying pending migrations; this does not back up or target the separate Phase 4 database on port 55432:

```sh
./backend/scripts/backup-local-postgres.sh
```

The script writes a mode-600 custom-format dump under the ignored `backups/` folder and prints the path. Treat the dump as sensitive data and encrypt it before moving it off this Mac. Never commit or attach the dump to a chat.

### 7. Run backend and real-token checks

```sh
cd backend
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
export PATH="/opt/homebrew/bin:$JAVA_HOME/bin:$PATH"
mvn test
mvn verify
cd ..
./backend/scripts/verify-local-oidc.py
```

The verification script requests access tokens from Keycloak using the separate local-only `wattscape-local-smoke` client and synthetic local credentials, but never prints or saves the tokens. It checks discovery/JWKS metadata, audience and organization claims, 401 unauthenticated behavior, ADMIN access, MEMBER read access and write denial, database membership, cross-tenant isolation, Swagger, readiness, and persisted site readback. It is write-capable and requires a dedicated disposable Keycloak realm plus an isolated Phase 4 test database; it is not compatible with the owner’s currently shared Keycloak until that separate test client is provisioned there, which this remediation deliberately avoids.

### Local token users

- `WATSCAPE_ADMIN_USERNAME` receives the Keycloak `ADMIN` role and an `Organization Owner` database membership.
- `WATSCAPE_MEMBER_USERNAME` receives `MEMBER` and an `Auditor/Read Only` database membership.
- `local-other-admin` receives `ADMIN` in a separate organization for tenant-isolation checks.

Passwords are generated in `backend/.env`; they are not in source control. The browser client `wattscape-local` uses Authorization Code + PKCE S256 and has Direct Access Grants disabled. The legacy password-grant smoke scripts target a separate `wattscape-local-smoke` client that exists only in an isolated local test realm; it is not part of the production realm template. Never enable that smoke client or password grant in a production realm.

### Stop without deleting data

```sh
docker compose --env-file backend/.env down
```

This stops containers and preserves both named volumes. Do not add `-v` if you want to keep the database or Keycloak realm. The imported realm is applied when the realm does not already exist; edits to the JSON file do not overwrite an existing realm.

More details: [backend setup](docs/BACKEND-SETUP.md), [Keycloak local configuration](docs/KEYCLOAK-LOCAL.md), and [API documentation](docs/API.md).


## Professional deployment preparation

WattScape is packaged as a static React frontend plus a separately hosted Spring Boot API and production identity provider. The frontend can be hosted on Vercel or Netlify; the API can be deployed as a Docker web service (for example, on Render). Production identity and data storage must use managed, HTTPS-enabled services.

Before creating a frontend deployment, configure these **public build-time values** in the hosting dashboard and rebuild:

```dotenv
VITE_WATSCAPE_API_BASE_URL=https://api.example.com
VITE_OIDC_AUTHORITY=https://identity.example.com/realms/wattscape
VITE_OIDC_CLIENT_ID=wattscape-web
```

These `VITE_` values are embedded in browser assets. They may contain public origins and a public client ID only—never SMTP credentials, database passwords, client secrets, API keys or access tokens. The application now rejects a remote HTTP API/identity origin and no longer silently falls back to `localhost` in production builds.

See [Professional deployment readiness](docs/DEPLOYMENT-READINESS.md) for the recommended Vercel/Netlify + Render architecture, production Keycloak configuration, SMTP separation and release gates. `vercel.json`, `netlify.toml`, and the public `_redirects` / `_headers` files prepare the SPA hosting layer.

The current Compose file is a **local development stack only**: it runs Keycloak in `start-dev` mode and sends verification/invitation email to Mailpit. Mailpit does not deliver those messages to external iCloud/Gmail/Outlook inboxes. Do not deploy the local Compose realm or Mailpit settings as production services.

## Phase 2 verification status

Verified on 2026-11-21 with the local Apple Silicon Mac setup:

- `docker compose --env-file backend/.env config --quiet` passed.
- `mvn test` and `mvn verify` passed; 9 tests, 0 failures, 0 errors, 0 skipped. PostgreSQL repository/API tests used Testcontainers.
- Compose startup succeeded for PostgreSQL 17.6, Keycloak 26.8.2, and the Java 21 API image. `/actuator/health` and `/actuator/health/readiness` both returned `UP`.
- `backend/scripts/verify-local-oidc.py` passed discovery and JWKS checks, signed token acquisition, 401 unauthenticated response, ADMIN access, MEMBER read/403 write behavior, cross-tenant 404/own-tenant access, and persisted API write/readback.

For this Phase 4 update, also run the `SpatialGeometryValidatorTest` and the full `mvn verify`; the exact sequence is in [Phase 4 status](docs/PHASE4-IMPLEMENTATION-STATUS.md).

These checks cover the local development stack only. Keycloak runs in `start-dev` mode with its development database, the browser SPA client uses Authorization Code + PKCE S256 with Direct Access Grants disabled; a separate local-only smoke client is reserved for legacy scripted checks, and all local endpoints use HTTP on loopback. The realm import uses `IGNORE_EXISTING`; editing the JSON does not update an already imported realm. Apply subsequent realm edits with Keycloak administration or a separate disposable local Keycloak data volume. This setup is not a production identity deployment.

## Phase 3 frontend integration status

Verified on 2026-11-21:

- The previous local source revision passed `bun run lint`, `bun run test` (18 Vitest tests plus 11 Node tests), and `bun run build`. The build reported a native-config `__dirname` warning and a large 3D chunk-size advisory.
- The current professional-packaging update replaces the Vite config's `__dirname` usage, adds five runtime-configuration regression tests, and adds browser error recovery and static-host routing/security configuration. Re-run `bun run check` on the Mac to verify this exact revision; these full dependency-backed checks were not run in the isolated packaging environment.
- Backend `mvn test` and `mvn verify` were rerun and passed with 9 tests, no failures/errors/skips.
- Browser check confirmed Live Mode redirected to the local Keycloak realm with the configured client, callback URI, Authorization Code response, and PKCE S256 challenge. The local credential form was left untouched, so a full interactive browser callback was not claimed as verified. OIDC callback/logout helpers are covered by automated tests.

The Live workspace exposes the newly added Phase 4 endpoints through the Phase 4 Operations area. They are not a deployed service and must be verified on the Mac against the intended database after its migration state is confirmed. The current spatial editor stores GeoJSON rather than CAD/BIM meshes; telemetry ingestion supports HTTPS only; analytics requires real interval meter readings and explicitly configured factors; AI is disabled by default. Refer to [API](docs/API.md), [Phase 4 implementation status](docs/PHASE4-IMPLEMENTATION-STATUS.md), and [security readiness](docs/SECURITY-PRODUCTION-READINESS.md).
# Phase 3.1 authentication and onboarding

See [Phase 3.1 Auth & Organization Onboarding](docs/PHASE3.1-AUTH-ONBOARDING.md) for the local Keycloak account setup, Mailpit, organization creation/invitations, and Google/Apple provider configuration status.

## Phase 3.2 security and verification

Feature status, exact limits, and verification evidence are in [Security and production-readiness](docs/SECURITY-PRODUCTION-READINESS.md). This development stack is not a production deployment.

Setup references: [Keycloak](docs/KEYCLOAK-SETUP.md), [Google OAuth](docs/GOOGLE-OAUTH-SETUP.md), [Apple Sign-In](docs/APPLE-SIGN-IN-SETUP.md), [SMTP/Mailpit](docs/SMTP-SETUP.md), [multi-organization tenant scope](docs/MULTI-ORGANIZATION.md), and [implementation changelog](docs/IMPLEMENTATION-CHANGELOG.md).

## WattScape sign-in, registration and recovery

See [WATTSCAPE_AUTHENTICATION_SETUP.md](WATTSCAPE_AUTHENTICATION_SETUP.md).


## Phase 2 identified-issues remediation — 2026-11-22

A source-level remediation package now addresses the identified analytics 10,000-row truncation, work-order due-date clearing and Auditor assignment, invitation after-commit delivery, invitation template substitution, AI data minimization/disclosure, Keycloak grant separation, production realm placeholders/brute-force defaults, and explicit API authentication/authorization error responses. An additive V6 index supports the latest site-wide telemetry query. Membership deactivation and automated telemetry purging remain blocked pending owner policy.

Read the [complete remediation audit](WATTSCAPE_COMPLETE_AUDIT.md), [fixes summary](WATTSCAPE_FIXES_SUMMARY.md), [authentication guide](WATTSCAPE_AUTHENTICATION_GUIDE.md), and [remaining owner decisions](WATTSCAPE_REMAINING_ISSUES.md). These are new source-based documents because the exact four prior deliverables named in the remediation brief were not present in this source snapshot. The final remediation tests still require execution on the owner Mac and isolated backend/Keycloak/PostgreSQL environment; production remains NO-GO.
