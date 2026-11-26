# Phase 4 local connected-demo verification

Use this procedure only with a dedicated disposable QA stack and synthetic accounts. It is not a production-readiness check.

## 1. Confirm the QA targets before starting

- Use a dedicated Keycloak realm/issuer and client created for QA. Do not use the existing shared Phase 1 realm, users, or database.
- Use a dedicated Phase 4 PostgreSQL database with disposable storage. Confirm its container/project identity and host port (expected local Phase 4 port: `55432`) before any write-capable test.
- Use a unique Compose project name and project-specific resources. Do not run destructive cleanup commands or any `down -v` command.
- Use synthetic identities and organization/site fixtures only. Do not copy production users, secrets, or data.

## 2. Configure the frontend and API consistently

In a local-only `.env.local`, set:

```dotenv
VITE_WATSCAPE_API_BASE_URL=http://localhost:8082
VITE_OIDC_AUTHORITY=<the disposable QA issuer URL>
VITE_OIDC_CLIENT_ID=<the public QA browser client id>
```

The application reads `VITE_WATSCAPE_API_BASE_URL`. Configure the backend issuer to the **same issuer URL** that appears in the browser token's `iss` claim, and configure the backend audience to match the token's `aud`. Do not place client secrets, access tokens, private keys, or real credentials in frontend variables.

Before signing in, make read-only readiness checks:

```bash
curl -sS -i http://localhost:8082/actuator/health/readiness
curl -sS -i <the-disposable-issuer>/.well-known/openid-configuration
```

Check only status and issuer/JWKS endpoint consistency. Do not paste tokens into terminal commands or logs.

## 3. Verify the real browser-to-API journey

1. Open the frontend and sign in through the disposable QA Keycloak realm using a synthetic account.
2. Confirm the browser returns to WattScape and the Live API workspace identifies the expected synthetic organization/site.
3. In browser DevTools Network, verify protected requests go to the Phase 4 API origin on port `8082`, not a Phase 1 service. Confirm requests return the API's expected success/authorization responses. Never copy or share the `Authorization` header.
4. Use one synthetic ADMIN and one MEMBER to confirm permitted and denied actions. Verify two synthetic organizations cannot see each other's site data.
5. Sign out, verify protected requests are unauthorized, and repeat with an expired synthetic session.
6. Test telemetry, spatial/floor-plan, work-order, analytics, and AI-disabled behavior only against the disposable database. Confirm AI is disabled unless a separate synthetic QA provider is intentionally configured.

## 4. Gate the write-capable smoke script

`backend/scripts/verify-phase4-smoke.py` writes data and performs database readbacks through Compose. Do not run it until the Compose project, Postgres container identity, database name, and port have been independently confirmed as the disposable Phase 4 QA target. If any target is ambiguous, leave the smoke test NOT RUN. Do not run it against shared Keycloak/Phase 1 data or owner runtime services.

Keep logs free of tokens and device secrets. After the run, retain only sanitized output and the synthetic QA database evidence. Do not use volume pruning or broad Compose cleanup; remove only disposable QA resources after their owner confirms they are safe to remove.
