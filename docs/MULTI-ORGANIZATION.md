# Multi-organization membership and tenant scope

`organization_users` is the server-controlled membership source, keyed by issuer + subject + organization, with a unique membership constraint. A user may hold active memberships in multiple organizations, each with an independent role.

`GET /api/v1/organizations/memberships` lists active memberships from the authenticated issuer and subject. `POST /api/v1/organizations/active` accepts an organization ID as a selector, then verifies membership in the database. The React workspace remembers the current selector in tab-scoped `sessionStorage` and sends it as `X-Organization-Id` on API calls. The selector does not grant access. `TenantContext` verifies active membership for the authenticated issuer and subject on every tenant operation, including reads and writes. A forged or stale selection is denied; a role comes only from the matching membership row.

The signed `organization_id` claim can bootstrap selection if that organization is still an active membership. It cannot create membership or override database roles. Without a selector or valid unique membership, ambiguous tenant scope is denied. IDs from request bodies are not used to set tenant scope. Cross-tenant object lookup remains tenant filtered.

Roles shown in the picker are informational and organization-specific. Backend authorization remains decisive. Switching organization does not delete, revoke, or otherwise modify memberships in other organizations.
