# Apple Sign-In setup

Apple Sign-In is prepared but unavailable until Apple Developer configuration and a real end-to-end test are complete. Apple requires an eligible registered web domain; localhost alone is insufficient.

1. In Apple Developer, create a **Services ID** and enable Sign in with Apple.
2. Register the production web domain and exact return URL shown by the script. For the local Keycloak broker callback it is `http://localhost:8081/realms/wattscape-local/broker/apple/endpoint`; Apple web sign-in may require HTTPS and a verified domain, so use the registered HTTPS host for a real environment.
3. Create/download the Sign in with Apple private key. Store it outside source control with file permissions `600`; set `KEYCLOAK_PUBLIC_URL` to the browser-facing issuer base if it differs from the admin URL; point `APPLE_PRIVATE_KEY_FILE` in ignored `backend/.env` to it. Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_SERVICES_ID` there.
4. Run `python3 backend/keycloak/renew-apple-client-secret.py --confirm-target-realm wattscape-local`. It signs a short-lived ES256 client-secret JWT, stores it only in `backend/.env`, and configures Keycloak's `apple` broker alias. Never copy the private key or JWT into frontend configuration.
5. Verify callback, scopes, account linking, first-login flow, and logout with a real Apple account in the eligible registered domain environment.
6. Keep `APPLE_IDP_ENABLED=false` until that test passes; then enable the API status flag and verify `/api/v1/auth/providers`.


**Target safety:** The provider script requires an explicit matching realm confirmation. Do not run it against the currently shared local Keycloak as part of this remediation. Use a disposable isolated test realm or a separately approved production change window; no provider credentials are available in the current package.

The renewal script generates a 150-day JWT and must be run before expiry. Establish an operational renewal reminder/automation in the deployment environment; this repository does not schedule one. No Apple credentials/domain were provided, so Apple login is not verified or enabled.
