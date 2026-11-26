# WattScape production Keycloak realm template

This is a **placeholder template**, not a deployable realm export and not a production readiness claim. No production domain, realm name, SMTP credential, Google/Apple credential, user, or deployment URL is supplied. Do not import it unchanged.

## Fill only with approved deployment values

Replace these tokens with real deployment-specific values in a protected, temporary working file (mode `0600`):

- `${WATSCAPE_PRODUCTION_REALM}` — owner-approved realm identifier.
- `${WATSCAPE_FRONTEND_ORIGIN}` — exact HTTPS frontend origin, with no path or trailing slash.
- `${WATSCAPE_API_AUDIENCE}` — must exactly equal backend `JWT_AUDIENCE` (default `wattscape-api`).
- `${WATSCAPE_SMTP_HOST}`, `${WATSCAPE_SMTP_PORT}`, `${WATSCAPE_SMTP_FROM}`, `${WATSCAPE_SMTP_USERNAME}`, `${WATSCAPE_SMTP_PASSWORD}` — approved transactional SMTP credentials; keep rendered files off source control and remove them securely after import.

The identity issuer is not embedded as a guess: configure the actual production issuer and JWKS URI in the backend, then verify the issuer returned by Keycloak discovery is an exact match for `JWT_ISSUER_URI`.

## Security profile

- Public SPA client `wattscape-web`: Authorization Code only, PKCE S256, no implicit flow, no Direct Access Grants, no service account.
- Redirects and web origins are exact frontend-origin URLs; no wildcard values are permitted.
- `sslRequired=external`; serve the public Keycloak endpoint only behind a correctly configured trusted TLS-terminating proxy and HTTPS.
- Brute force enabled: 5 failures per wait block, MULTIPLE strategy, 60-second increment, 900-second maximum wait, 60-second quick-login minimum, 1-second quick-login detection window, 12-hour failure observation window, no permanent lockout. These are a security-oriented starting point and must be tuned against operational support and abuse telemetry.
- Email verification, password reset, email-as-username, unique email and password policy are enabled. Replace local Terms & Conditions text with counsel-approved production documents before allowing registration.
- API audience mapper includes the configured audience in access tokens only; the `organization_id` user-attribute mapper remains for the existing API claim contract. Database membership checks remain authoritative.
- `identityProviders` is intentionally empty. Use the existing provider configuration scripts with approved secrets; do not claim Google/Apple until each provider is configured and end-to-end tested.

## Apply safely

1. Confirm the hosting provider, custom domains, TLS proxy mode, production realm, exact callback paths, SMTP provider and secret store with the owner.
2. Render a separate file outside the repository, validate it with `python3 -m json.tool`, and confirm no `${...}` tokens remain. Confirm redirect URIs are HTTPS and exact.
3. Review the resulting realm diff; import only into a newly approved production Keycloak instance. Do not run `configure-local-realm.py` against production.
4. Configure Keycloak theme and real SMTP, then test browser OIDC, email verification, password reset, issuer, audience, role and organization claims with synthetic accounts.
5. Configure Google/Apple in Keycloak only when credentials and callback registration are available.

No production Keycloak resource was created or changed during this implementation.
