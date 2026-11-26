# WattScape Authentication Setup — Local Development

**Status (2026-11-22):** The owner reported that the WattScape-branded theme and realm settings were successfully applied to the existing local Keycloak on `localhost:8081`. That Keycloak/Phase 1 stack is shared local infrastructure. **Do not rerun realm-update, provider, or smoke-client provisioning commands against it as part of this remediation.** This guide now describes the expected configuration and the safe path for a separate disposable test realm.

## Architecture

WattScape uses OIDC Authorization Code + PKCE (S256). Selecting Sign In in React redirects to Keycloak. Keycloak hosts the email/password, registration, verification and reset screens. The React app never collects or submits the user's password. The browser origin changes from `localhost:3000` to the identity origin `localhost:8081`; the branded page makes the journey visually cohesive without embedding credentials into React.

## Current local runtime

| Component | Local address | Notes |
|---|---|---|
| Phase 4 frontend | `http://localhost:3000` | Vite |
| Phase 4 API | `http://localhost:8082` | Host-run Spring Boot |
| Phase 4 PostgreSQL | `localhost:55432` | Keep separate from old Phase 1 database |
| Keycloak | `http://localhost:8081` | Existing shared local instance; already updated by owner |
| Mailpit | `http://localhost:8025` | Local email capture |

The frontend's public local configuration is:

```dotenv
VITE_WATSCAPE_API_BASE_URL=http://localhost:8082
VITE_OIDC_AUTHORITY=http://localhost:8081/realms/wattscape-local
VITE_OIDC_CLIENT_ID=wattscape-local
```

These are public endpoints and a public client ID. Never put a client secret, admin password, SMTP password, Google/Apple secret, JWT, or private key in a `VITE_*` variable.

## Existing shared instance — do not mutate further

The previous auth update was applied to the existing shared instance by the owner. The user-reported read-back was:

- Theme `wattscape-brand`; realm display `WattScape`.
- Email login, registration, reset and email verification enabled.
- Browser client uses Authorization Code + PKCE S256.
- Direct Access Grants and implicit flow disabled for `wattscape-local`.
- Existing users, credentials, organization claims, roles and persistent Keycloak data retained.

That live instance was not inspected by this remediation environment. Browser login, registration, email verification/reset and live API JWT validation still require owner-side verification.

## Separate local-only smoke client

The Python local smoke scripts use the Resource Owner Password Credentials grant. To preserve these legacy local tests without reopening password grants on the SPA client, the local realm import contains a separate `wattscape-local-smoke` client. Only this disposable local client has Direct Access Grants enabled; Standard Flow, implicit flow, redirects and web origins are disabled. It is excluded from the production realm template.

OAuth 2.0 Security Best Current Practice says the password grant must not be used in new end-user application flows. This separate client is an explicitly limited test exception, not an authentication design for users or production. The existing shared Keycloak has not been provisioned with this new client by this remediation, and **the smoke scripts may fail with `invalid_client` against that instance until a separate isolated test Keycloak is prepared**.

Do not use `configure-local-realm.py` against the currently shared instance. The script requires `--confirm-isolated-local-realm wattscape-local` as an additional guard and should only be invoked after verifying the environment file points to a dedicated disposable local Keycloak that has no shared users/data. Never reimport/replace an existing realm or delete volumes to provision the test client.

The smoke scripts accept `WATSCAPE_SMOKE_CLIENT_ID` only to select a local smoke client. The issuer guard restricts them to the local `wattscape-local` realm and loopback host. Do not set this up in production.

## Password reset and verification email

The Keycloak container must reach Mailpit over the Docker network, normally `mailpit:1025`; the browser inbox UI is `http://localhost:8025`. A local Mailpit capture does not demonstrate production deliverability. Production email requires a real provider, TLS, verified sender domain and SPF/DKIM/DMARC.

## Google and Apple setup

No real provider credentials were provided, so neither sign-in option is claimed as available. Setup scripts require a matching explicit target-realm confirmation. Run them only against an isolated test realm or under a separately approved production change window; do not target the existing shared realm.

Google requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and exact broker callback registration. Apple requires `APPLE_SERVICES_ID`, a generated `APPLE_CLIENT_SECRET_JWT`, Team ID, Key ID, `.p8` signing key outside source control, and an eligible verified HTTPS domain/return URL. Provider flags remain false until a real broker login succeeds.

## Required owner-side browser acceptance

Use synthetic accounts only and an isolated browser profile:

1. Visit `http://localhost:3000`, choose Sign In and confirm a direct redirect to branded Keycloak (no email-only React page).
2. Complete a synthetic account login, callback and authenticated identity request to API port `8082`.
3. Verify ADMIN/MEMBER API permissions and a cross-organization denial using synthetic tenants.
4. Test logout/session expiry, signup, terms, verification email and reset email in Mailpit.
5. Confirm the access token audience equals backend `JWT_AUDIENCE` (default `wattscape-api`) and the issuer exactly equals backend `JWT_ISSUER_URI`; do not copy tokens into logs/chat.
6. Only test Google/Apple after real credentials and target registration are available. Leave feature flags false until the real broker flow passes.

A successful Keycloak page load alone is not proof that the API accepts issuer/audience and performs tenant membership checks. End-to-end acceptance has not yet been run for this remediation.
