# Contributing to WattScape

Thank you for helping improve WattScape. Changes should preserve the current React/Vite frontend, Spring Boot API, PostgreSQL/Flyway persistence, and Keycloak OIDC architecture unless the maintainer explicitly approves an architectural change.

## Before opening a pull request

1. Search existing issues and pull requests; describe the problem and proposed change before large rewrites.
2. Create a focused branch from the latest `main`.
3. Keep changes small and explain user impact, security implications, and operational effects.
4. Add or update tests and documentation. Do not claim a workflow is verified merely because its source files exist.

## Development prerequisites

- Bun 1.4.5 (the repository's lockfile package manager)
- Node.js `>=22.14.0 <25` where Node is used by tooling
- Java 21 and Maven
- Docker available for Testcontainers/PostgreSQL integration tests

Follow the root [README](README.md), [backend setup](docs/BACKEND-SETUP.md), and [local Keycloak guide](docs/KEYCLOAK-LOCAL.md).

## Validation commands

Run from the repository root:

```sh
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run test
bun run build
bun audit --audit-level=low
bun run e2e
```

Run the backend suite from `backend/`:

```sh
mvn --batch-mode --no-transfer-progress verify
```

The backend integration tests use Testcontainers and require Docker. The Mailpit smoke test is environment-gated; a skipped Mailpit test is not proof of real SMTP delivery. The current Playwright suite primarily verifies synthetic demo-mode UI, not a production Keycloak/API workflow.

## Database and migration rules

- Use Flyway for schema evolution; do not rely on Hibernate schema creation.
- Add a new, forward-only migration for schema changes. Never edit an already-applied migration.
- Do not introduce `DROP`, `TRUNCATE`, broad `DELETE`, destructive renames, or data rewrites without a separately reviewed migration plan, verified backup, and explicit owner approval.
- Preserve organization-scoped foreign keys, tenant predicates, role checks, optimistic locking, and integration coverage.
- Tests that require a database must use an isolated disposable database/container and synthetic records. Never point tests or smoke scripts at an owner's persistent database.

## Security and privacy

- Never commit real `.env` values, secrets, keys, tokens, user data, logs, or database dumps.
- Do not put credentials or secret API keys in any `VITE_*` variable.
- Do not weaken OIDC PKCE, issuer/audience validation, organization membership checks, CORS allowlists, or API authorization.
- Keep demo fixtures synthetic. Do not add real customer, employee, building-access, telemetry, or regulated data.
- Keep `AI_ENABLED=false` unless the data sent to the configured provider and its retention terms have been approved.
- Report vulnerabilities privately; see [SECURITY.md](SECURITY.md).

## Pull request checklist

- [ ] The PR has one clear purpose and describes the relevant issue.
- [ ] Frontend typecheck, lint, unit tests, and production build pass.
- [ ] Backend `mvn verify` passes where backend code is affected.
- [ ] Playwright tests are updated and run where UI behavior changes.
- [ ] Migration changes are additive, reviewed, and tested against an isolated database.
- [ ] No secrets, populated env files, dumps, personal data, or generated reports are included.
- [ ] Documentation and environment-variable references match the code.
- [ ] The change does not claim production acceptance without live evidence.

## License

This repository currently has no `LICENSE` file. A public GitHub repository is not, by itself, a grant of permission to reuse, redistribute, or sublicense its code. Do not add a license without the maintainer's explicit decision.
