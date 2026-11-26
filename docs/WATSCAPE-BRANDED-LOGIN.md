# WattScape-branded OIDC login, registration and recovery

See the root-level documents for the complete implementation:

- `WATTSCAPE_AUTHENTICATION_AUDIT.md` — pre-change findings, architecture decision and verification limits.
- `WATTSCAPE_AUTHENTICATION_IMPLEMENTATION.md` — exact source changes and the final user journeys.
- `WATTSCAPE_AUTHENTICATION_SETUP.md` — commands for the existing local Keycloak stack, realm configuration, test steps and Google/Apple setup.

## Architecture at a glance

WattScape retains Keycloak and OIDC Authorization Code + PKCE S256. Selecting Sign In immediately redirects to the hosted Keycloak login page, which inherits the supported `keycloak.v2` theme and applies the WattScape brand. The hosted page owns the email/password fields, registration, Forgot Password, email verification, Remember Me and configured social broker buttons. React never captures or proxies the user's password.

The old email-only React step is removed. There is still a browser-origin change to the OIDC issuer, as required by the hosted identity-provider architecture, but the destination is visually part of WattScape rather than a generic local-development page.

## Installation

Follow `WATTSCAPE_AUTHENTICATION_SETUP.md` from the Phase 4 source root. The theme installer targets the theme directory bind-mounted by the existing local Keycloak container; the in-place realm script accepts `--env-file` so the owner can use the existing Phase 1 stack's ignored environment file without copying administrator credentials into the Phase 4 `.env`.

## Social providers

Keycloak displays its own Google/Apple broker buttons only when the corresponding provider has real credentials and is enabled. Follow `docs/GOOGLE-OAUTH-SETUP.md` and `docs/APPLE-SIGN-IN-SETUP.md`. Do not add secrets to Vite variables. Keep `GOOGLE_IDP_ENABLED` and `APPLE_IDP_ENABLED` false until the complete broker flow is tested.

## Verification boundary

The source package is prepared but does not prove live Keycloak rendering, registration, email verification, recovery or social login. Run the local setup and test checklist. Use synthetic accounts and Mailpit; do not use real customer data during local acceptance testing.
