# Security Policy

## Scope

The supported review target is the latest code on the `main` branch. WattScape is still a development/release-candidate project; this policy is not a statement that a hosted production environment has passed security acceptance.

## Reporting a vulnerability

Please **do not** publish suspected vulnerabilities, exploit details, credentials, tokens, customer data, or database contents in a public issue or pull request.

Use GitHub's **Report a vulnerability** workflow in the repository's Security tab when private vulnerability reporting is available. If that option is not enabled for this repository, contact the maintainer privately through a verified contact method on the maintainer's GitHub profile. Do not attach live secrets or personal data; use redacted logs and synthetic examples.

A useful report contains the affected commit or file, impact, minimal reproduction steps, prerequisites, and a suggested mitigation where possible. Avoid destructive testing against any shared or production system.

## Handling and disclosure

The maintainer should acknowledge receipt, assess severity and affected versions, coordinate a fix, and agree on a disclosure date with the reporter. Do not assume a response-time SLA or a supported-version guarantee that has not been published.

## Security expectations for contributors and operators

- Never commit populated `.env` files, credentials, private keys, tokens, database dumps, or real user data.
- Keep browser-exposed `VITE_*` values limited to public URLs and public client identifiers.
- Preserve Keycloak OIDC, JWT issuer/audience validation, organization membership checks, role authorization, and tenant-scoped database access.
- Review every Flyway migration before deployment. Back up the target database before applying an approved production migration.
- Do not disable authentication, weaken tenant boundaries, reset persistent volumes, or run destructive SQL to make a deployment pass.
- Treat the demo fixtures as synthetic. Do not place customer or regulated data into screenshots, E2E artifacts, issue attachments, or AI prompts.
- Keep optional external AI integration disabled until data transfer and provider retention have been explicitly approved.

## Current release posture

The repository contains local-development configuration and production templates. They are not evidence of a deployed or independently penetration-tested production system. See [the production audit](docs/PRODUCTION-AUDIT-2026-11-26.md) and [the operations runbook](docs/OPERATIONS-RUNBOOK.md).
