# Google Sign-In setup

Google Sign-In is optional and stays disabled until a real client is configured and an end-to-end login succeeds. Never place the client secret in Vite settings or source control.

1. In Google Cloud Console, select/create a project, configure the OAuth consent screen and create an **OAuth client ID → Web application**.
2. Add this exact Authorized redirect URI:
   `http://localhost:8081/realms/wattscape-local/broker/google/endpoint`
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the ignored Keycloak stack `backend/.env` only. Set `KEYCLOAK_PUBLIC_URL` to the exact browser-facing issuer base if it differs from `KEYCLOAK_ADMIN_URL`. Keep `GOOGLE_IDP_ENABLED=false` while testing provider setup.
4. Run `python3 backend/keycloak/configure-identity-provider.py google --confirm-target-realm wattscape-local` from the project root. The script configures alias `google`, scopes `openid email profile`, disables token storage and automatic trust of upstream email, and prints the callback URL.
5. In the Keycloak Admin Console, verify **Identity providers → google**, the first broker login flow and account-linking behavior. Complete a real login with test users and check the resulting verified email and organization membership policy.
6. Only after successful validation set `GOOGLE_IDP_ENABLED=true` in `backend/.env`, restart the API, and confirm `GET /api/v1/auth/providers` reports Google enabled.

Google requires the redirect URI in the authorization request to match a registered redirect URI exactly; see the [Google OAuth web server documentation](https://developers.google.com/identity/protocols/oauth2/web-server). Do not enable email-based linking without an explicit trusted-provider policy.


**Target safety:** The provider script requires an explicit matching realm confirmation. Do not run it against the currently shared local Keycloak as part of this remediation. Use a disposable isolated test realm or a separately approved production change window; no provider credentials are available in the current package.
