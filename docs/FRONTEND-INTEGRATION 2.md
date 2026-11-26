# Frontend connected-mode integration

The existing UI and demo service are unchanged. src/services/apiClient.ts remains the synthetic demo implementation. A separate typed HTTP client is added at src/services/backendApiClient.ts; it accepts an access-token callback from an OIDC SDK and covers the Phase 1 endpoints. It does not store tokens, sign users in, or create local demo credentials.

## Integration boundary

- Keep wattScapeApi.fetchInitialWorkspaceSnapshot() as the demo-mode source.
- When a real identity provider is configured, create WattScapeBackendClient with the provider's access-token callback and the backend origin. Never send the Gemini key, database credentials, or a tenant ID from the browser.
- Select demo or connected data source through explicit environment/product configuration in a later UI integration change. Do not infer mode from failed network requests.
- Map API DTOs into existing domain contracts in a dedicated adapter. Do not fill missing server data with demo values or claim synthetic readings are observed. The site summary metrics, spatial coordinates, hourly telemetry arrays, source trust, and full asset metadata are not part of this initial API, so those views must stay in demo mode or present a truthful empty/loading state until those API capabilities are implemented.
- Current front-end persona selector is still a demo-only screen and must not be wired to this API as authentication. Connected mode needs an OIDC login flow and token lifecycle from the chosen identity provider.

The initial API returns normalized site/room/asset DTOs rather than serializing current React models or JPA entities. This avoids coupling persistence classes to the frontend and leaves room to evolve either contract independently.
