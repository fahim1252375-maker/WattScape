# Invitation email and SMTP

## Local Mailpit

Compose runs Mailpit on loopback. Start services with `docker compose --env-file backend/.env up -d --build`, then open [Mailpit](http://localhost:8025). The API connects to `mailpit:1025` on the Compose network. Local defaults disable SMTP authentication and STARTTLS; do not use them outside local development.

Invitation email uses a responsive table layout, the WattScape layered mark embedded as an inline PNG, organization and role, an explicit UTC expiration timestamp, a sign-in CTA, a plain-text alternative, and a fallback single-use code. The CTA points only to the configured application URL; it does not put the bearer code in a URL, browser history, or referrer. The recipient signs in with the invited verified email and enters the fallback code in Account & access.

The API stores only a SHA-256 token hash, never logs the raw token, and its ordinary create response contains delivery status, destination, role and expiration only. An Owner/Admin can revoke a pending invitation through `POST /api/v1/organizations/current/invitations/{invitationId}/revoke`; the operation is scoped to the active organization and preserves the row with a revocation timestamp. Acceptance requires an active Keycloak identity with a verified matching email. A database-backed rate limit permits five invitations per issuer/subject per hour.

The new template is covered by MIME unit tests. The existing Mailpit message was sent by the earlier template and is retained for evidence; the replacement email is intentionally not generated until the disposable account completes registration and email verification. Public delivery has not been tested with a production SMTP provider.

## Other SMTP servers

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS`, `SMTP_FROM`, and `APP_PUBLIC_URL` through the deployment secret/configuration manager. Never commit passwords. Set authenticated transport and TLS according to the provider; require encrypted transport in production. Verify DNS, SPF/DKIM/DMARC, bounce handling, and deliverability separately.

Invitation creation now publishes an in-process event inside the database transaction. `InvitationEmailDispatcher` handles it with `@TransactionalEventListener(phase = AFTER_COMMIT)`, so an invitation email is not sent for a transaction that rolls back. SMTP delivery failure is logged with a request identifier and exception class only; the already-committed invitation remains valid and the API does not report the database operation as rolled back. Dispatch is in-process, not a durable outbox: a process crash after commit can lose the email, and automatic retries, deduplication and bounce handling are not implemented. The response indicates that dispatch was scheduled, not that the recipient received the message.


## Production delivery (not configured in the local stack)

Mailpit is a local sink. It is expected that local verification messages appear in `http://localhost:8025`, not in an external mailbox. The local Keycloak realm and local Compose environment intentionally use this sink.

A production deployment must configure two separate senders:

1. **Keycloak account email:** configure the production realm's Email settings with a real provider host, port, sender, authentication credentials and TLS/STARTTLS. Do not import the `wattscape-local` realm's Mailpit settings into production.
2. **Spring Boot email:** configure the API's `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH=true`, `SMTP_STARTTLS=true`, `SMTP_FROM` and `APP_PUBLIC_URL` in the production secret manager.

Verify the sender domain with the provider, publish its SPF and DKIM DNS records, set an appropriate DMARC policy, and test verification, password reset and invitations in real inboxes. Add bounce and delivery monitoring before inviting external customers. The after-commit invitation dispatcher is in-process and has no durable outbox, automatic retry, deduplication or bounce workflow; these remain production reliability improvements.

See [Professional deployment readiness](DEPLOYMENT-READINESS.md) and `backend/.env.production.example` for the API variable names. The example contains placeholders only.
