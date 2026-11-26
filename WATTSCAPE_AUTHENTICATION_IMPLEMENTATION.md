# WattScape Authentication Implementation

## Design decision

WattScape keeps Keycloak as its identity provider and keeps OIDC Authorization Code Flow with PKCE S256. Email and password fields live on the WattScape-branded Keycloak sign-in page. React never receives the user's password.

The React email-only intermediate form has been removed. Selecting **Sign In** now goes directly to the OIDC authorization endpoint. The Keycloak page then presents email/password, remember me, password recovery, create account, configured Google/Apple brokers, and the other identity-provider steps with WattScape styling. This removes the former "enter email, click continue, then see another login form" experience.

## Files changed

| File | Change |
|---|---|
| `src/views/EntryAndPortfolioScreens.tsx` | Replaced email-only intermediate page with direct OIDC redirect and safe non-live fallback. |
| `src/views/AuthScreen.test.tsx` | Added tests for direct hosted sign-in, config wait, missing OIDC configuration and demo separation. |
| `src/auth/oidcLifecycle.test.ts` | Clarified empty default redirect (no email-only `login_hint`) and retained registration/provider hint coverage. |
| `backend/keycloak/wattscape-local-realm.json` | Updated local import metadata, email login, registration and PKCE-only public client settings. |
| `backend/keycloak/configure-local-realm.py` | Safe in-place realm/client config; accepts `--env-file`; updates display names/theme and disables Direct Access Grants. |
| `backend/keycloak/configure-identity-provider.py` | Supports an explicit env file when provisioning Google/Apple brokers. |
| `backend/keycloak/themes/wattscape-brand/login/theme.properties` | Loads the local password enhancement script. |
| `backend/keycloak/themes/wattscape-brand/login/messages/messages_en.properties` | WattScape login, registration, reset, email, remember-me and terms copy. |
| `backend/keycloak/themes/wattscape-brand/login/resources/css/login.css` | Responsive WattScape layout, forms, actions, provider buttons, errors and password controls. |
| `backend/keycloak/themes/wattscape-brand/login/resources/js/password-enhancements.js` | Accessible show/hide controls and registration strength meter. |
| `docs/WATSCAPE-BRANDED-LOGIN.md` | Replaced old manual-only notes with current architecture and rollout steps. |
| `WATTSCAPE_AUTHENTICATION_AUDIT.md` | Findings, architecture rationale, evidence status and open gates. |
| `WATTSCAPE_AUTHENTICATION_IMPLEMENTATION.md` | Change inventory and design description. |
| `WATTSCAPE_AUTHENTICATION_SETUP.md` | Mac installation, realm update, test and provider steps. |

## User journeys

### Sign in

1. User selects Sign In in WattScape.
2. React stores the live-mode choice and immediately starts OIDC Authorization Code + PKCE.
3. Keycloak displays `wattscape-brand`, not a generic realm heading.
4. User enters email and password on Keycloak. Optional Remember Me is handled by Keycloak.
5. Keycloak authenticates and redirects to `/auth/callback` with an authorization code.
6. `oidc-client-ts` validates state/nonce and completes the PKCE exchange.
7. The app restores the live mode and calls the Phase 4 API with the access token.

### Create account

The login page's **Create account** link opens Keycloak's native registration flow. Keycloak collects first name, last name (together the user's full name), email, password and password confirmation. The realm enforces the password policy, required Terms & Conditions step, and email verification. The email is the username. No custom React password form is introduced.

### Forgot password

The login page's **Forgot password?** link uses Keycloak's reset-credentials flow. Keycloak emails a time-limited reset action through the realm's configured SMTP provider, then returns the user to the sign-in flow. Local email can be captured by Mailpit. Production delivery remains a separate provider task.

### Google and Apple

Keycloak renders provider buttons only after the matching broker is configured and enabled. The browser app contains no client secrets. The supplied broker script configures the alias; the corresponding environment feature flag should be set to `true` only after the external provider and end-to-end flow have been tested.

## Security properties retained/strengthened

- Browser client is public; it has no client secret.
- Authorization Code Flow is enabled.
- PKCE challenge method is S256.
- Implicit Flow is disabled.
- Direct Access Grants (password grant) are disabled for the public browser client.
- Exact localhost callback URIs and web origin are preserved/ensured for local development only.
- API JWT validation, audience, organization claim mapping and server-side tenant membership checks are not bypassed.
- OIDC user data remains in `sessionStorage`; it is not moved to `localStorage`.
- No password or OAuth secret is added to Vite variables.

## Verification status

Source-level tests and scripts were added/updated, but this environment does not contain the project's Bun dependencies or a live Keycloak container. Do not interpret this package creation as proof that the new theme has been installed or that login, registration, email, reset or social providers have passed live testing. Follow `WATTSCAPE_AUTHENTICATION_SETUP.md` and capture the user-side outputs.


## Phase 2 security hardening delta — 2026-11-22

- The public `wattscape-local` client and production `wattscape-web` template disable Direct Access Grants and implicit flow while requiring Code + PKCE S256. The legacy Python smoke scripts now target a separate `wattscape-local-smoke` client in the local template only; it is never part of production. The local updater requires explicit confirmation that the target is a dedicated isolated realm.
- Added a separate production realm template with strict HTTPS origin placeholders, `sslRequired=external`, no wildcard redirects, audience mapper and temporary brute-force controls. It is not deployed.
- Provider setup scripts now require matching target-realm confirmation and verify saved provider configuration. Real Google/Apple credentials and browser tests remain outstanding.
- `application.yml` retains configurable Spring Boot JWT audience enforcement through `JWT_AUDIENCE`; the Keycloak access-token audience mapper is preserved. Real signed token tests for missing/wrong audience, issuer and expiry remain necessary.
- Current shared Keycloak was not touched by this remediation. The owner had previously applied the branded realm update and reported the result in their terminal.

The full implementation report is in `WATTSCAPE_COMPLETE_AUDIT.md`; owner decisions and outstanding gates are in `WATTSCAPE_REMAINING_ISSUES.md`.
