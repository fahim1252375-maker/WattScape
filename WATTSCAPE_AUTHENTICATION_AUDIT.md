# WattScape Authentication Audit

**Scope:** Read-only architecture review of the supplied WattScape Phase 4 source bundle and the earlier `wattscape-brand` patch before the authentication redesign. No live Keycloak instance was available to this audit environment.

## Executive decision

The existing OIDC Authorization Code + PKCE architecture is the correct direction and is retained. The previous experience was awkward because the React `AuthScreen` collected only an email address, then sent the user to a second identity-provider page. The actual email/password form belonged to Keycloak, but the old local realm/theme/client settings did not consistently present it as WattScape.

The revised design removes the email-only React step and immediately starts the OIDC authorization redirect when a user selects Sign In. The actual email/password, registration, password-reset, email-verification and configured social-provider screens are rendered by the Keycloak `wattscape-brand` theme. This is a deliberate security boundary, not an embedded password form.

**Local source status after implementation:** prepared; the user must install the theme into the currently running Keycloak stack and run the realm configuration script with that stack's existing admin environment file. This audit environment cannot access or modify the user's Mac Keycloak service.

## Architecture decision: why Keycloak still receives the password

A browser-based public OIDC client should use Authorization Code Flow with PKCE. The browser is redirected to the issuer's authorization endpoint; the issuer authenticates the user and returns an authorization code to the exact registered callback. WattScape exchanges the code using the PKCE verifier. The React app does not collect, proxy, or store a user's Keycloak password.

A password field inside React followed by a custom API password submission would introduce a different credential-handling architecture and undermine the existing hosted OIDC security boundary. It is intentionally not implemented.

The browser will still navigate from the app origin to the identity-provider origin (`localhost:3000` to `localhost:8081` locally). The visual experience is made cohesive by using the same WattScape brand on Keycloak. In production, a dedicated identity hostname such as `auth.example.com` (or an approved same-site reverse-proxy path) can make the origin transition feel more integrated while preserving the issuer boundary. The issuer URL must remain consistent with the `iss` claim and discovery metadata; do not rewrite it casually through a reverse proxy.

## Findings before this implementation

1. `src/views/EntryAndPortfolioScreens.tsx` used an email-only field and a "Continue with email" button. This created the additional page the owner dislikes.
2. The existing React OIDC client already used `oidc-client-ts`, `response_type: code`, callbacks, session storage, automatic renewal and Keycloak broker hints. This should be preserved.
3. The earlier theme patch only supplied a theme directory and installer. It did not guarantee that an already-imported realm was updated in place. An existing realm could continue showing an old display name or old login theme until explicitly configured.
4. `configure-local-realm.py` selected the old `wattscape` theme rather than `wattscape-brand`, and did not update the realm display/client display name.
5. The supplied realm import had `directAccessGrantsEnabled: true` for a public browser client. The updated configuration disables Direct Access Grants and implicit flow while retaining standard authorization code and PKCE S256.
6. The Keycloak realm had email verification, password reset and Terms & Conditions flow components, but those must be confirmed on the persistent realm in use, not merely in an import JSON file.
7. Google and Apple integration scripts and server-side feature flags exist. The providers are not configured unless valid external credentials are supplied and the Keycloak brokers are verified. No credentials are fabricated or embedded in the frontend.

## Implementation summary

- The React authentication handoff no longer asks for an email address. It starts the hosted OIDC login directly.
- `AuthScreen` remains a secure handoff/fallback view; it contains no password field and makes no password API call.
- The Keycloak theme inherits from `keycloak.v2`, applies WattScape branding and local assets, and styles login, registration, reset, verification, error, terms and social-provider areas.
- A self-hosted theme script adds accessible show/hide controls and registration password-strength feedback. Keycloak remains authoritative for password policy enforcement.
- The local realm configuration sets the visible name to WattScape, enables email-as-username, registration, password reset, email verification and remember-me, and selects `wattscape-brand`.
- The public client remains Authorization Code + PKCE (S256); Direct Access Grants and implicit flow are disabled. Existing callback/origin entries and protocol mappers are preserved.
- The local configuration script accepts a separate `--env-file` so the owner can target the existing Phase 1 Keycloak stack's admin credentials without copying or printing them into the Phase 4 project's `.env`.
- Google/Apple buttons are rendered by Keycloak when and only when the corresponding broker is enabled. Provider credentials remain server-side.

## Known limits and unverified items

- No live Keycloak service or browser was available here; theme rendering, realm update API compatibility and the user journeys still require execution on the user's Mac.
- Local verification email and password-reset email require the existing Keycloak container to reach Mailpit and the SMTP settings in the selected old-stack env file to be correct. Mailpit captures mail locally; it does not prove production delivery.
- Google requires an OAuth Web client ID and client secret. Apple requires an Apple Services ID, Team ID, Key ID, private key and a generated client-secret JWT; Apple web authentication requires a verified HTTPS domain and registered return URL.
- Terms text shipped for local development is not approved production legal copy. Replace it with organization-approved Terms and Privacy Policy content before launch.
- The local realm has `sslRequired=none` only for localhost development. Production must use an HTTPS identity domain, secure cookies, TLS and production realm policy.
- Remember Me keeps the identity-provider session persistent; the SPA's OIDC user store remains `sessionStorage` and is not changed to `localStorage`.
- An existing persistent Keycloak realm is not replaced or re-imported by the configuration script. It updates selected realm/client fields in place and preserves users, credentials, organization attributes, role assignments, and mappers.

## Evidence labels

- **Source inspected:** facts visible in the supplied source bundle.
- **Implementation prepared:** files changed in this package.
- **User-side verification required:** runtime steps not executed by this packaging environment.
- **Production decision:** NO-GO until real OIDC, email, provider, deployment and security gates are validated.


## Phase 2 remediation update — 2026-11-22

This source package adds a separate local-only smoke client for the legacy password-grant scripts, while the public SPA client and production template keep Direct Access Grants disabled. The local realm updater now requires an explicit isolated-target confirmation; the owner’s existing shared local Keycloak was not modified in this remediation. Production brute-force settings and a placeholder production realm template are now provided but have not been deployed.

The full authentication status and the exact remaining runtime checks are in `WATTSCAPE_AUTHENTICATION_GUIDE.md`. No live Google or Apple provider credentials were available. Actual signed-token audience/issuer/expiry verification, registration, reset, verification mail and social sign-in remain outstanding.
