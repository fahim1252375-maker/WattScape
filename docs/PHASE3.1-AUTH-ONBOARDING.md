# Phase 3.1 authentication and organization onboarding

## User authentication flow

The React client uses `oidc-client-ts` Authorization Code Flow with PKCE (`S256`). Selecting Sign In redirects directly to the configured Keycloak issuer; there is no email-only React intermediate and React never receives the user's password. Keycloak renders the WattScape-branded login, registration, password reset, required terms and email-verification steps. Local OIDC tokens remain in `sessionStorage`. The local `wattscape-local` browser client has Standard Flow enabled, PKCE S256 and Direct Access Grants/implicit flow disabled.

The local realm import also defines `wattscape-local-smoke`, a separate local-only public client with Direct Access Grants enabled for existing Python smoke scripts that need synthetic credentials. It has no browser redirects or web origins, is not part of the production realm template, and must never be deployed or configured in production. OAuth security guidance advises against the password grant for end-user applications; this exception is confined to disposable local test infrastructure. See the [local smoke guide](PHASE4-LOCAL-SMOKE-TEST.md) and [production realm template](KEYCLOAK-PRODUCTION-REALM.md).

The `wattscape-brand` theme and local realm configuration have been applied by the owner to the currently running local environment as reported on 2026-11-22. That Keycloak stack is shared with earlier local WattScape work. Do not rerun realm/provider mutation scripts against it as part of this remediation. New scripts require explicit realm confirmation and should be used only with a dedicated disposable local Keycloak instance. The currently shared realm was not changed by this remediation package.

The local realm enables verified email, password reset, unique email addresses, a 12-character mixed password policy and the MEMBER default role. The realm template declares the built-in `TERMS_AND_CONDITIONS` required action. The included local legal text is placeholder copy, not approved legal policy. A browser signup/consent flow has not yet been verified end to end.

Mailpit captures local verification/reset messages at `http://localhost:8025`; this does not prove production email delivery.

## Organization onboarding and tenant scope

After OIDC login, the UI asks the API for onboarding status. A verified identity can create one organization and receives a server-assigned `Organization Owner` database membership, or accept an invitation. The browser may send `X-Organization-Id`, but the API verifies an active membership for the signed issuer and subject on every protected organization/site request. The signed organization claim can bootstrap an allowed selection; it never grants membership or role. `TenantContext.requireMembership` queries only `status='active'`; `SiteService.requireSite` and the room/work-order/analytics/AI services use that check. The selected-organization header is a selector, not an authorization grant.

The membership entity already stores `active`, `invited` and `revoked` states, and invitation revocation is implemented separately. No organization-member revocation endpoint exists. That endpoint remains blocked until the owner defines role/owner safeguards, active-owner invariant, reversibility and historical/audit semantics. Do not equate invitation revocation with membership revocation.

## Invitation lifecycle and email

An owner/admin can create an invitation with `POST /api/v1/organizations/current/invitations`. The API stores only a SHA-256 token hash; raw token exists only in the short-lived email event and is not returned or logged. The token expires after 72 hours, is single-use, and can grant only non-owner roles. The recipient must sign in with the same verified email. A pending invitation can be revoked within its organization without deleting history.

Invitation email dispatch now uses a `@TransactionalEventListener(AFTER_COMMIT)`. A rolled-back transaction therefore does not send the message. Delivery failures are caught and logged with request ID and exception type only; the committed invitation remains valid. The dispatcher is not a durable outbox: process failure after commit or provider outage can leave a pending invitation without a delivered email, and automatic retry/deduplication is not guaranteed. The current UI says the dispatch was scheduled, not that the message reached the inbox. Reissue/retry policy is an operational follow-up.

Email template placeholders are substituted in one pass. HTML values are context-escaped and literal `${...}` text inside user-provided values is not recursively interpreted. The email subject is constant and does not embed untrusted organization text.

The invitation acceptance UI remains a manual token-entry form. The token is not placed in a query string or persistent browser storage; no direct-link change was introduced.

## Google and Apple identity providers

Google and Apple controls stay disabled until real Keycloak broker configuration succeeds and the API feature flag is enabled after end-to-end testing. The browser never receives provider secrets. The setup scripts require `--confirm-target-realm` matching the selected environment file. Use them only against an approved isolated test realm or a specifically approved production change window; never target the shared local realm during this remediation.

- Google requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a registered exact Keycloak broker callback.
- Apple requires `APPLE_SERVICES_ID`, `APPLE_CLIENT_SECRET_JWT`, Team ID, Key ID, a `.p8` key outside source control and an eligible verified HTTPS domain/return URL.

No real provider credentials were available in this implementation. Neither provider is claimed as functional or enabled. The frontend reports the backend's provider availability flags, which remain false by default.

## JWT issuer and audience

`backend/src/main/resources/application.yml` configures Spring Boot's OAuth2 resource-server JWT decoder with `JWT_ISSUER_URI`, optional `JWT_JWK_SET_URI` and `JWT_AUDIENCE` (default `wattscape-api`). Spring Boot 3.5.16's native `audiences` property enforces that expected audience; issuer, signature/JWKS and token-time validators remain part of resource-server validation. The Keycloak realm must include the configured audience in the **access token** using the `oidc-audience-mapper` and `access.token.claim=true`, `id.token.claim=false`. The `organization_id` mapper is a separate identity/bootstrap claim and does not replace the database membership check.

No custom `JwtDecoderConfig` or `AudienceValidator` file is present in this source. Existing integration tests replace the decoder with a mock, so actual signed token rejection for absent/wrong audience, issuer and expiry was not runtime-verified in this environment. Verify with real tokens on isolated Keycloak + API before production.

## Production identity setup

Use `deploy/keycloak/wattscape-production-realm.template.json` only as an environment placeholder template. It specifies a separate realm/client, exact frontend-origin callback placeholders, PKCE S256, no password/implicit/service-account grant, external SSL, temporary brute-force controls, email verification/reset and audience mapping. Replace the placeholders in a protected file, never in source control. No production domain, issuer, SMTP, realm ID or credentials were invented or provisioned. See `KEYCLOAK-PRODUCTION-REALM.md`.
