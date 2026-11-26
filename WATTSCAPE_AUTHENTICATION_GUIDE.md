# WattScape — Authentication, authorization and deployment identity guide

**Date:** 2026-11-22  
**Security decision:** Retain hosted Keycloak OIDC Authorization Code + PKCE S256. Do not collect user passwords inside React.  
**Source note:** The originally referenced guide was not present in the received source tree. This is a newly created replacement based on the available code and the owner's remediation request.

## 1. Browser authentication

- Browser client: public OIDC client; no client secret.
- Flow: Authorization Code; PKCE method S256.
- Disabled on SPA client: Direct Access Grants (ROPC) and implicit flow.
- Token storage: existing `sessionStorage` behavior retained.
- Keycloak handles credentials, registration, password reset, terms and email verification.
- Sign In navigates directly to issuer; the email-only intermediate screen is removed.
- Local callback paths are exact localhost routes. Production callback paths must be exact HTTPS URLs and must not use wildcard redirects/origins.

OAuth 2.0 Security Best Current Practice (RFC 9700) says the password grant MUST NOT be used. The legacy local Python smoke scripts still need a username/password token helper, so source now separates that into a distinct `wattscape-local-smoke` local-only client. This client has Direct Access Grants but no standard flow, implicit flow, redirect URIs or web origins; it is excluded from the production template. Never expose this exception to a production realm or real end-user authentication.

## 2. Existing owner Mac environment

The owner reported on 2026-11-22 that the existing local realm at `http://localhost:8081/realms/wattscape-local` was updated to:

- Theme `wattscape-brand` and display name `WattScape`.
- Email login, registration, password reset and email verification enabled.
- Browser SPA `wattscape-local`: Code + PKCE S256, Direct Access Grants disabled, implicit flow disabled.

The existing Keycloak stack is shared local infrastructure. The remediation work did not update that live instance and the user should not rerun the local/provider setup scripts against it. The new local smoke client is not confirmed to exist on that shared realm.

## 3. Production realm configuration

Template: `deploy/keycloak/wattscape-production-realm.template.json`. Instructions: `docs/KEYCLOAK-PRODUCTION-REALM.md`.

Security settings:

| Setting | Template value |
|---|---|
| Realm ID | `${WATSCAPE_PRODUCTION_REALM}` placeholder |
| Browser client | `wattscape-web` public client |
| Standard Authorization Code Flow | enabled |
| PKCE | S256 |
| Direct Access Grants | disabled |
| Implicit Flow | disabled |
| Service accounts | disabled |
| Redirect URIs / web origins | exact `${WATSCAPE_FRONTEND_ORIGIN}` placeholders; no `*` |
| SSL requirement | `external` |
| Brute force | enabled; temporary lockouts, incremental wait, max 900s |
| Permanent lockout | disabled |
| Email verification / password reset | enabled |
| API audience mapper | configured placeholder; access token only |
| SMTP | environment placeholders only |
| Social IdPs | empty until real credentials and tests exist |

The brute-force configuration is a defensible starting point, not a final abuse/availability policy. Validate the edge proxy's HTTPS forwarding and tune lockout values based on support requirements. No production domain, deployment, realm, DNS, SMTP account or credential was created.

## 4. Brute-force settings rationale

The template configures:

- `bruteForceProtected=true`
- `permanentLockout=false`
- `bruteForceStrategy=MULTIPLE`
- `failureFactor=5`
- `waitIncrementSeconds=60`
- `maxFailureWaitSeconds=900`
- `minimumQuickLoginWaitSeconds=60`
- `quickLoginCheckMilliSeconds=1000`
- `maxDeltaTimeSeconds=43200`

The intent is to slow repeated credential guessing while avoiding permanent denial of service caused by account lockout. Test this with the precise deployed Keycloak image, proxy/IP forwarding and support workflow before enabling real registrations.

## 5. JWT validation and Keycloak claim mapping

Backend property in `backend/src/main/resources/application.yml`:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${JWT_ISSUER_URI}
          jwk-set-uri: ${JWT_JWK_SET_URI:}
          audiences: ${JWT_AUDIENCE:wattscape-api}
```

`JWT_AUDIENCE` is configurable (default `wattscape-api`). Backend validation requires a token from the configured issuer and expected audience; JWK signature and expiry validation are part of Spring Security's resource server JWT decoder. Configure issuer URI exactly as returned by Keycloak discovery and use its JWKS endpoint. Do not substitute the browser client ID for the API audience unless both are deliberately aligned.

Keycloak protocol mapper for `wattscape-api`:

- Mapper type: Audience (`oidc-audience-mapper`).
- Included custom audience: exact backend `JWT_AUDIENCE` value.
- `access.token.claim=true`.
- `id.token.claim=false`.

The separate `organization_id` user-attribute mapper retains the existing claim contract. It is not a membership grant. `TenantContext` resolves the issuer + subject against `organization_users` with `status='active'` on protected requests. The owner must test tokens signed by the actual target Keycloak and verify missing/wrong audience, issuer and expiry are rejected. Existing integration tests mock the JWT decoder and do not prove that runtime behavior.

## 6. Google and Apple

### Google

Needs real Google Web Client ID and Secret. Register the exact Keycloak broker endpoint for the approved target issuer:

`{KEYCLOAK_PUBLIC_URL}/realms/{KEYCLOAK_REALM}/broker/google/endpoint`

Store only in server-side ignored env/secret storage. Script:

```bash
python3 backend/keycloak/configure-identity-provider.py google \
  --env-file /path/to/isolated-keycloak/backend/.env \
  --confirm-target-realm wattscape-local
```

The script validates the alias/type/client ID after saving. This read-back does not prove an interactive Google sign-in. Only set `GOOGLE_IDP_ENABLED=true` after real end-to-end login and verify the API's provider status response.

### Apple

Needs Services ID, Team ID, Key ID, `.p8` signing key outside repository, generated `APPLE_CLIENT_SECRET_JWT`, verified domain and Apple return URL. Script:

```bash
python3 backend/keycloak/renew-apple-client-secret.py \
  --env-file /path/to/isolated-keycloak/backend/.env \
  --confirm-target-realm wattscape-local
```

The current flow generates a 150-day ES256 client-secret JWT and configures the Keycloak Apple OIDC broker. Plan renewal before expiry. No Apple localhost success is assumed. Only set `APPLE_IDP_ENABLED=true` after a real eligible-domain login test.

Both scripts require explicit target-realm confirmation. Do not run them against the currently shared Keycloak without separately approved change control. Provider status flags are operator assertions, not credentials validation; keep false until broker testing is complete.

## 7. Membership authorization

- Realm roles provide coarse API entry permissions.
- Database organization membership controls organization/site access.
- Membership status is checked as `active` by `TenantContext`.
- Site access goes through `SiteService.requireSite` and service-level role checks.
- Room listing requires active site membership; room creation requires an authorized organization role and verifies floor/site/organization consistency.
- `Auditor/Read Only` is not assignable to work orders (backend and frontend).

Membership deactivation endpoint remains blocked until the owner defines role hierarchy, owner safeguards, minimum active-owner invariant, reversibility and audit/history requirements. Invitation revocation is a different operation and does not deactivate an existing member.

## 8. Owner-side acceptance checklist

Run only against an isolated test environment with synthetic accounts/data:

1. OIDC discovery issuer equals backend `JWT_ISSUER_URI` exactly.
2. SPA client uses code flow, PKCE S256, no direct access or implicit grant.
3. User login, registration, email verification, reset, logout and token expiry.
4. Access token includes the expected API audience, not only the OIDC client ID.
5. API rejects missing/wrong audience, wrong issuer, expired and invalid signature tokens.
6. Cross-organization site/room/asset/work-order read returns 404/403 according to existing API policy.
7. Inactive memberships cannot access protected tenant resources.
8. Role matrix: ADMIN, MEMBER, Technician, Auditor/Read Only and site-level roles.
9. Google/Apple remain unavailable until real broker login passes.

Do not paste credentials, JWTs, cookies or private keys in chat/logs. Production remains NO-GO until domain/TLS, real provider secrets, SMTP, API database and actual token/tenant tests are accepted.
