# WattScape backend setup

## Prerequisites

- Java 21 or newer
- Maven 3.6.3 or newer
- Docker Engine with Docker Compose plugin for PostgreSQL/container workflows
- Local Compose includes a development-only Keycloak OIDC issuer; other environments require an OIDC provider that issues signed JWTs with an `organization_id` UUID claim and audience `wattscape-api`

The backend is a resource server. It does not implement an identity provider or issue tokens. An administrator must provision organizations and map the OIDC issuer + subject into `organization_users` before a user can call the API.

## Local containers

From the project root:

1. Create a local-only env file using `./backend/scripts/create-local-env.sh`; it generates unique passwords and refuses to overwrite an existing file.
2. Start with `docker compose --env-file backend/.env up -d --build`. The Keycloak realm is imported on first startup.
3. Seed local membership rows after the API migrations complete: `docker compose --env-file backend/.env exec -T postgres psql -U wattscape -d wattscape < backend/scripts/seed-local-organization.sql`.
4. Check `http://localhost:8080/actuator/health` and `http://localhost:8080/actuator/health/readiness`.
5. Open `http://localhost:8080/swagger-ui.html` using an ADMIN realm role; unauthenticated and MEMBER requests are denied.

Compose exposes PostgreSQL on 127.0.0.1:5432, Keycloak on 127.0.0.1:8081, and the API on 127.0.0.1:8080. Flyway creates schema at API startup. The local seed script is explicit and must not be run against production. The realm uses only generated local credentials and is not a production IdP configuration.

To stop the local stack while preserving database data, use `docker compose --env-file backend/.env down` (without `-v`). Never use `down -v`, volume prune, or system prune for this project.

## Provision initial organization membership

Generate a UUID, then run the provision script with psql variables against the initialized database. Use the exact `iss` and `sub` values from the provider's verified access token. Do not use an email address as the subject unless the provider guarantees it is stable.

`psql "$DATABASE_URL" -v org_id='UUID' -v org_name='Organization' -v legal_name='Organization LLC' -v issuer='https://idp.example/issuer' -v subject='provider-subject' -v email='admin@example.com' -v display_name='Admin' -f backend/scripts/provision-organization.sql`

For a production environment, provision through a controlled administrative workflow and secret manager; keep the application database role separate from migration ownership and grant only required CRUD privileges. The bootstrap SQL is for controlled initial setup and is not exposed as an API.

## Maven commands

From `backend/`:

- `mvn test` runs unit, repository, and PostgreSQL-backed integration tests (the latter require Docker).
- `mvn verify` performs the test and packaging lifecycle.
- `mvn spring-boot:run` starts the API when PostgreSQL and JWT issuer environment variables are set.

## Configuration

Configuration uses environment variables, with names and local defaults documented in `backend/.env.example`. The Compose local profile uses `JWT_ISSUER_URI=http://localhost:8081/realms/wattscape-local` and an internal JWKS endpoint for Docker-to-Docker traffic. When running the API directly on macOS, export variables from `backend/.env`; use the host JWKS URL from that file and override `DATABASE_URL` to `jdbc:postgresql://localhost:5432/wattscape`. Production must set its real issuer, JWK discovery/JWKS configuration, audience, organization claim, CORS origins, and secrets per environment. Never commit `.env`, provider secrets, passwords, signing keys, or access tokens.

## Operational notes

- `ddl-auto=validate`; Flyway owns schema evolution.
- Health endpoint detail is hidden. Readiness includes PostgreSQL connectivity; liveness reports process state.
- Set trusted proxy headers only behind a configured reverse proxy. Terminate TLS at the production ingress.
- Schedule encrypted PostgreSQL backups and regularly rehearse restore and migration rollback procedures before production adoption.
- The container runs as a non-root user and has a read-only filesystem apart from `/tmp` in Compose.
