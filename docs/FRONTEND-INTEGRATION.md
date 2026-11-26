# WattScape frontend integration

## Local setup

1. Start PostgreSQL, Keycloak, and the Spring API using the commands in the root README.
2. From the project root, copy `.env.example` to `.env.local` or create `.env.local` with only the three public browser settings shown in the example. Vite exposes values prefixed `VITE_`; never place database, Keycloak bootstrap, Gemini, or user passwords in a `VITE_` variable.
3. Run `bun install`, `bun run dev`, then open `http://localhost:3000`.

The Vite configuration uses port 3000. The public OIDC settings use realm issuer `http://localhost:8081/realms/wattscape-local`, client ID `wattscape-local`, callback `http://localhost:3000/auth/callback`, silent-renew callback `http://localhost:3000/auth/silent-callback`, and post-logout URI `http://localhost:3000/`. The public client requires PKCE S256 and no client secret. The OAuth library is `oidc-client-ts`; browser auth uses Authorization Code, sessionStorage-backed OIDC state, silent token renewal, callback state validation, and the provider’s end-session redirect.

If the realm already existed before these callback settings were added, Keycloak's import uses `IGNORE_EXISTING` and will not update it. In Keycloak Admin Console, open realm `wattscape-local`, client `wattscape-local`, and set the redirect URIs, web origin, post-logout redirect URI, and PKCE code challenge method to the values above. The local running Keycloak client was updated and checked during Phase 3 integration.

## Explicit data modes

- **Demo Mode** mounts the existing `WattScapeProvider`, demo API client, and all current screens and 3D workflows. Synthetic data remains marked as demo.
- **Live API Mode** mounts a separate workspace and never renders the demo provider. It has its own transient React state, requests tenant-scoped responses from Spring, and does not fall back to fixtures after authentication, authorization, or network errors.
- The selected mode is stored in tab-scoped `sessionStorage`; access and ID tokens are also stored in sessionStorage by the OIDC SDK. They are not written to localStorage or application database storage.

The live workspace currently integrates exactly these API contracts:

| API | Live UI |
| --- | --- |
| `GET /api/v1/me` | Signed-in identity and membership role |
| `GET /api/v1/organizations/current` | Current organization context |
| `GET /api/v1/sites` / `POST /api/v1/sites` | Site list and ADMIN-only creation |
| `GET /api/v1/sites/{siteId}/twin` | Site/building/floor hierarchy and twin graph |
| `GET` / `POST /api/v1/sites/{siteId}/rooms` | Room list and ADMIN-only creation |
| `GET` / `POST /api/v1/sites/{siteId}/assets` | Asset list and ADMIN-only creation |

The browser does not send an organization ID. Spring resolves scope from the verified issuer, subject, signed organization claim, and active membership. UI role checks only control affordances; API authorization remains authoritative. A 401 prompts a new sign-in; a 403 displays access denial. Site changes/unmount abort outstanding requests, API calls have a 15-second timeout, and connectivity status uses the unauthenticated readiness endpoint.

The current twin endpoint returns hierarchy and graph metadata, not spatial coordinates, telemetry history, visual model geometry, site floor-plan imagery, or 3D mesh state. The Live Twin view explicitly displays that boundary; the original 3D experience remains in Demo Mode. Work orders, monitoring, AI, analytics, simulation, member management, connectors, automations, impact ledger, and settings are not represented as live functionality because the backend does not yet expose their API contracts.

## Security notes

- The frontend does not use the Keycloak password grant and contains no ADMIN/MEMBER credential or hardcoded token.
- `oidc-client-ts` performs authorization code flow with PKCE S256. Redirect and return paths are fixed to same-origin relative routes.
- Tokens are held in per-tab session storage by the OIDC SDK and sent only in `Authorization: Bearer` headers to the configured API origin.
- Do not treat decoded client-side role claims as authorization. Spring Security validates token signature, issuer, audience, role, and tenant membership for every request.
- The local Keycloak public client retains direct grants for the existing command-line local verification script. That local setting is not used by this React application and is not a production identity configuration.
