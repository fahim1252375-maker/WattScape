# WattScape — Professional deployment readiness

**Status:** deployment-ready frontend packaging and API container source are prepared; production infrastructure is not provisioned or verified.

## Intended product architecture

Recommended split deployment:

1. **Frontend:** Vercel or Netlify static hosting. Build with Bun 1.4.5 (`bun install --frozen-lockfile`, `bun run build`) and publish `dist/`.
2. **Spring Boot API:** Render Docker web service using `backend/Dockerfile`, listening on the platform-provided `PORT` (defaults to 8080 locally). Configure readiness health check `/actuator/health/readiness`.
3. **Identity:** a separately deployed, HTTPS-only Keycloak production service with a managed PostgreSQL database. Do not deploy the local `start-dev` realm/service configuration.
4. **API database:** managed PostgreSQL with TLS, backups, restore testing and a migration/rollback procedure.
5. **Email:** a real transactional email provider with an authenticated SMTP submission endpoint, TLS, verified sender domain, SPF, DKIM and DMARC. Keycloak realm email and Spring Boot invitation email are separate SMTP configurations.

The frontend is independent of Vercel/Netlify/Render at runtime; only the configured HTTPS API and identity origins change between environments.

## Frontend hosting configuration

Build command:

```sh
bun install --frozen-lockfile
bun run build
```

Publish directory: `dist`.

Set these public build-time variables in the frontend host, then redeploy after changing them:

```dotenv
VITE_WATSCAPE_API_BASE_URL=https://api.example.com
VITE_OIDC_AUTHORITY=https://identity.example.com/realms/wattscape
VITE_OIDC_CLIENT_ID=wattscape-web
```

`VITE_` values are embedded in browser JavaScript. They may contain only public origins and a public OIDC client ID. Never put a client secret, SMTP credential, AI provider key, database password or access token in them.

The SPA fallback rules and baseline browser security headers are included for both Vercel and Netlify. Static assets are configured for immutable caching. The Vite build uses module-relative filesystem paths rather than Node's CommonJS-only `__dirname` global.

## OIDC production realm checklist

Create a separate production realm and public browser client. Configure Authorization Code flow with PKCE (S256), and disable Direct Access Grants/password grant. Configure exact redirect URLs for the final frontend origin:

- `https://app.example.com/auth/callback`
- `https://app.example.com/auth/silent-callback`
- post-logout redirect: `https://app.example.com/`

Set the corresponding web origin to `https://app.example.com`. Set the exact production issuer in `JWT_ISSUER_URI` and its JWKS endpoint in `JWT_JWK_SET_URI`. Confirm the signed audience and organization claim mapping. Do not use the local test users, local realm, bootstrap credentials or local verifier password grant in production.

## Email delivery is deliberately not hard-coded

Local development currently routes Keycloak verification email and Spring invitation email to Mailpit. That inbox is intentionally local and does not deliver to iCloud/Gmail/Outlook. The local compose configuration must not be used as the production SMTP configuration.

For production:

- Configure Keycloak's **Realm settings → Email** using the production provider host, port, sender, authentication and encrypted transport.
- Separately configure the Spring API's `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH=true`, `SMTP_STARTTLS=true`, `SMTP_FROM` and `APP_PUBLIC_URL`.
- Verify the sending domain and publish the provider-supplied SPF/DKIM records; add a DMARC policy after sender alignment is confirmed.
- Test account verification, password reset, invitation delivery, bounce handling and spam placement using real recipient mailboxes.
- Keep SMTP credentials in the host's secret manager, never in source control or browser variables.

A sample variable-name template is in `backend/.env.production.example`. It contains placeholders only. The Keycloak SMTP values belong in the Keycloak production realm, not in the Spring API environment file.

## API host environment

Configure the variables from `backend/.env.production.example` in the API host's secret/environment panel. The API Dockerfile already builds a Java 21 Spring Boot image and runs as a non-root user. The API should be reachable only over HTTPS from the browser. Use managed database TLS, connection-pool sizing appropriate to the selected plan, and the platform's readiness health check.

Keycloak and the API should use separate database users and preferably separate managed databases. Keep Keycloak's administrative endpoint protected and never expose the local admin bootstrap credentials.

## Release gates still open

- Select/register the public domain and decide the final app, API and identity hostnames.
- Provision managed PostgreSQL for the API and Keycloak; apply migrations and prove a restore from backup.
- Provision production Keycloak, production realm/client, signing key lifecycle, MFA/admin policy, issuer/JWKS and exact redirect origins.
- Configure production SMTP in both systems, verify sender DNS and test real delivery.
- Add production secrets, exact CORS origins, rate limiting/WAF, monitoring/error reporting, alerting and operational ownership.
- Run the GitHub Actions CI workflow and preserve its run result.
- Complete role-specific browser E2E tests against the deployed environment, including sign-up, verified email, invitation, spatial, telemetry, work orders, analytics and AI opt-in.
- Complete independent security review, abuse/rate-limit review, load testing, backup/restore drill, deployment rollback test and privacy/terms approval.
- Enable AI only after data processing is approved and the server-side provider key is stored in a secret manager.

**Do not describe the platform as production-ready until these release gates are closed and evidenced.**
