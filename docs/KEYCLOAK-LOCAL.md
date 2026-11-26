# Local Keycloak identity provider

## Scope

`backend/keycloak/wattscape-local-realm.json` defines the `wattscape-local` realm. Compose pins the official Keycloak container to 26.8.2, imports this realm, binds the admin/user-facing server only to localhost, and stores the local Keycloak dev-file database in `wattscape-keycloak-data`. Keycloak `start-dev` and the embedded dev-file database are strictly local-development choices.

The realm has real OIDC discovery and signing keys, a public `wattscape-local` client, an ADMIN and MEMBER realm role, and three local users. It includes an audience protocol mapper for `wattscape-api` and a user-attribute mapper that adds each user's `organization_id` to access tokens. Spring Boot verifies signature against Keycloak's JWKS, exact issuer, and `wattscape-api` audience. The API then matches the signed organization ID plus issuer/subject against an active database membership. Tenant IDs supplied by frontend request bodies are never used for scope.

## Local-only accounts

The realm import resolves its password and organization placeholders from environment variables passed through ignored `backend/.env`. Generate that file with `backend/scripts/create-local-env.sh`; the script refuses to overwrite an existing file and never prints generated passwords. The local realm is not a production authentication configuration. In particular, the local client enables direct grants solely for repeatable command-line development checks. Production frontends should use OIDC Authorization Code + PKCE and a production Keycloak/IdP deployment.

The local admin account is assigned realm role ADMIN and database role Organization Owner. The read-only account gets MEMBER and Auditor/Read Only. The separate local-other-admin identity is assigned ADMIN but scoped to the second local organization. `backend/scripts/seed-local-organization.sql` idempotently adds the corresponding memberships and a site for tenant-isolation checks.

## Network URLs and issuer

The external token issuer is `http://localhost:8081/realms/wattscape-local`, which is the issuer written into tokens and used by Spring's issuer validator. Dockerized API traffic retrieves signing keys over the Compose network at `http://keycloak:8080/realms/wattscape-local/protocol/openid-connect/certs`; the host-run API uses the localhost JWK URL from `.env`. This separates public issuer validation from the API container's internal JWKS route without changing token issuer validation.

Discovery is available at `http://localhost:8081/realms/wattscape-local/.well-known/openid-configuration`. The admin console is at `http://localhost:8081/admin/` and the bootstrap administrator secret is the local-only `KC_BOOTSTRAP_ADMIN_PASSWORD` in `backend/.env`.


## Branded login and password recovery

The current local authentication experience uses the `wattscape-brand` Keycloak login theme and Authorization Code + PKCE only. Selecting Sign In from React redirects directly to Keycloak; the hosted identity page owns login, registration, reset and email verification. Follow the current [authentication setup guide](../WATTSCAPE_AUTHENTICATION_SETUP.md) to install the theme into the existing Keycloak mount and update the persistent realm safely.


## Smoke-test password-grant isolation

The SPA client `wattscape-local` keeps Direct Access Grants disabled. Repository smoke scripts now use a separate `wattscape-local-smoke` client because they acquire synthetic local tokens with the legacy password grant. That test-only client has no redirect URIs or web origins, is excluded from the production template, and is permitted only for isolated loopback-only test infrastructure.

**Do not run the realm updater against the already-running shared Phase 1 Keycloak realm.** The updated script now requires `--confirm-isolated-local-realm wattscape-local` as an extra guard, but the operator must still verify that the target is a dedicated isolated test instance. The smoke client is present in the local realm import template; it is not proof that it exists in any persistent realm. Use a disposable Keycloak instance and isolated test database for password-grant smoke runs.
