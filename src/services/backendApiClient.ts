/** Connected-mode API client. Demo mode remains in apiClient.ts and is not changed.
 * Callers must pass an access token obtained from the configured OIDC provider;
 * this module never creates, persists, or fabricates credentials.
 */
export interface ApiProblem {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  errors?: Record<string, string>;
}
export interface MeResponse { subject: string; email: string | null; displayName: string | null; role: string; organizationId: string; emailVerified: boolean }
export interface OnboardingStatusResponse { hasOrganization: boolean; needsOrganizationSelection: boolean }
export interface MembershipResponse { organizationId: string; organizationName: string; role: string; status: string }
export interface OrganizationMemberOption { id: string; displayName: string; role: string }
export interface OrganizationResponse {
  id: string; name: string; legalName: string; defaultCurrency: string; unitSystem: string;
  timeZonePolicy: string; locale: string; retentionDays: number; region: string;
}
export interface SiteResponse {
  id: string; name: string; code: string; regionTag: string | null; address: string | null;
  timeZone: string; buildingUse: string | null; areaSqm: number | null; status: string;
  createdAt: string; updatedAt: string;
}
export interface CreateSiteRequest {
  name: string; code: string; regionTag?: string; address?: string; timeZone: string;
  buildingUse?: string; areaSqm?: number; latitude?: number; longitude?: number; initialBuildingName?: string;
}
export interface RoomResponse {
  id: string; floorId: string; code: string; name: string; zoneType: string; areaSqm: number;
  modelState: string; provenance: string; createdAt: string; updatedAt: string;
}
export interface CreateRoomRequest { floorId: string; code: string; name: string; zoneType: string; areaSqm: number }
export interface AssetResponse {
  id: string; floorId: string; roomId: string | null; systemName: string | null; assetClass: string;
  name: string; manufacturer: string | null; model: string | null; serial: string | null;
  commissionDate: string | null; status: string; criticality: string; sourceId: string;
  powerKw: number | null; waterFlowLpm: number | null; createdAt: string; updatedAt: string;
}
export interface CreateAssetRequest {
  floorId: string; roomId?: string; systemName?: string; assetClass: string; name: string; sourceId: string;
  manufacturer?: string; model?: string; serial?: string; commissionDate?: string; criticality?: string;
  powerKw?: number; waterFlowLpm?: number;
}
export interface FloorPlanResponse { id: string; floorId: string; revision: number; coordinateSystem: string; unit: 'm' | 'ft'; width: number; height: number; originX: number; originY: number; rotationDegrees: number; planReference: string | null; active: boolean; createdAt: string }
export interface SpatialElementResponse { id: string; entityType: 'room' | 'asset'; planRevision: number; roomId: string | null; assetId: string | null; geometry: Record<string, unknown>; positionX: number; positionY: number; positionZ: number; rotationDegrees: number; version: number; lifecycleState: string; updatedAt: string }
export interface TelemetryDeviceResponse { id: string; siteId: string; assetId: string | null; externalId: string; displayName: string; protocol: string; status: string; lastSeenAt: string | null; createdAt: string }
export interface TelemetryDeviceCreated { id: string; externalId: string; displayName: string; protocol: string; status: string; ingestSecret: string; createdAt: string }
export interface TelemetryPointResponse { id: string; deviceId: string; assetId: string | null; metricKey: string; value: number; unit: string; quality: string; observedAt: string; receivedAt: string }
export interface WorkOrderResponse { id: string; siteId: string; assetId: string | null; title: string; description: string | null; priority: string; status: string; dueAt: string | null; assigneeSubject: string | null; assigneeName: string | null; createdBy: string; updatedBy: string; version: number; createdAt: string; updatedAt: string }
export interface EnergySummaryResponse {
  from: string; to: string; currency: string | null; energyKwh: number; waterM3: number;
  averagePowerKw: number | null; peakPowerKw: number | null; electricityCost: number | null;
  waterCost: number | null; estimatedEmissionsKg: number | null; energySamples: number; waterSamples: number;
  powerSamples: number; sampledPoints: number; truncated: boolean; caveats: string[];
  daily: Array<{ date: string; energyKwh: number; waterM3: number; averagePowerKw: number | null; peakPowerKw: number | null }>;
}
export interface AiInsightResponse { siteId: string; task: string; provider: string; model: string; insight: string; generatedAt: string; latencyMs: number; advisoryNote: string }
export interface AiProviderInfo { enabled: boolean; provider: string; model: string }
export interface TwinResponse {
  site: { id: string; name: string; code: string; timeZone: string; areaSqm: number | null };
  buildings: Array<{ id: string; siteId: string; code: string; name: string; createdAt: string }>;
  floors: Array<{ id: string; buildingId: string; level: number; name: string; elevationM: number | null; areaSqm: number | null }>;
  rooms: Array<{ id: string; floorId: string; code: string; name: string; zoneType: string; areaSqm: number }>;
  assets: Array<{ id: string; floorId: string; roomId: string | null; assetClass: string; name: string; status: string; sourceId: string }>;
  nodes: Array<{ id: string; kind: string; name: string; lifecycleState: string; sourceId: string }>;
  edges: Array<{ id: string; sourceNodeId: string; targetNodeId: string; edgeType: string }>;
}
export class WattScapeApiError extends Error {
  constructor(public readonly status: number, public readonly problem: ApiProblem) {
    super(problem.detail ?? problem.title); this.name = 'WattScapeApiError';
  }
}

export class WattScapeBackendClient {
  constructor(private readonly baseUrl: string, private readonly getAccessToken: () => Promise<string>, private readonly getOrganizationId: () => string | null = () => null) {}
  private async request<T>(path: string, init: RequestInit = {}, authenticated = true): Promise<T> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(new DOMException('The API request timed out.', 'TimeoutError')), 15000);
    const abortFromCaller = () => controller.abort(init.signal?.reason);
    if (init.signal?.aborted) abortFromCaller();
    else init.signal?.addEventListener('abort', abortFromCaller, { once: true });
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    try {
      if (authenticated) {
        const token = await this.getAccessToken();
        headers.set('Authorization', `Bearer ${token}`);
        const organizationId = this.getOrganizationId();
        if (organizationId) headers.set('X-Organization-Id', organizationId);
      }
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, { ...init, headers, signal: controller.signal });
      if (!response.ok) {
        const problem = await response.json().catch(() => ({ title: response.statusText, status: response.status })) as ApiProblem;
        throw new WattScapeApiError(response.status, problem);
      }
      if (response.status === 204) return undefined as T;
      return response.json() as Promise<T>;
    } catch (cause) {
      if (controller.signal.aborted && !init.signal?.aborted) {
        throw new Error('The WattScape API did not respond within 15 seconds. Check that the local API is running and try again.');
      }
      if (cause instanceof TypeError && !controller.signal.aborted) {
        throw new Error('WattScape could not reach the API. Check your network connection and API URL.');
      }
      throw cause;
    } finally {
      window.clearTimeout(timeout);
      init.signal?.removeEventListener('abort', abortFromCaller);
    }
  }
  health(signal?: AbortSignal) { return this.request<{ status: string }>('/actuator/health/readiness', { signal }, false); }
  me(signal?: AbortSignal) { return this.request<MeResponse>('/api/v1/me', { signal }); }
  onboardingStatus(signal?: AbortSignal) { return this.request<OnboardingStatusResponse>('/api/v1/onboarding/status', { signal }); }
  memberships(signal?: AbortSignal) { return this.request<MembershipResponse[]>('/api/v1/organizations/memberships', { signal }); }
  organizationMembers(signal?: AbortSignal) { return this.request<OrganizationMemberOption[]>('/api/v1/organizations/current/members', { signal }); }
  selectOrganization(organizationId: string, signal?: AbortSignal) { return this.request<MembershipResponse>('/api/v1/organizations/active', { method: 'POST', body: JSON.stringify({ organizationId }), signal }); }
  createOrganization(request: { name: string; legalName: string }, signal?: AbortSignal) { return this.request<OrganizationResponse>('/api/v1/onboarding/organizations', { method: 'POST', body: JSON.stringify(request), signal }); }
  acceptInvitation(token: string, signal?: AbortSignal) { return this.request<void>('/api/v1/onboarding/invitations/accept', { method: 'POST', body: JSON.stringify({ token }), signal }); }
  createInvitation(request: { email: string; role: string }, signal?: AbortSignal) { return this.request<{ emailDispatchScheduled: boolean; email: string; role: string; expiresAt: string }>('/api/v1/organizations/current/invitations', { method: 'POST', body: JSON.stringify(request), signal }); }
  currentOrganization(signal?: AbortSignal) { return this.request<OrganizationResponse>('/api/v1/organizations/current', { signal }); }
  sites(signal?: AbortSignal) { return this.request<SiteResponse[]>('/api/v1/sites', { signal }); }
  createSite(request: CreateSiteRequest, signal?: AbortSignal) { return this.request<SiteResponse>('/api/v1/sites', { method: 'POST', body: JSON.stringify(request), signal }); }
  twin(siteId: string, signal?: AbortSignal) { return this.request<TwinResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/twin`, { signal }); }
  rooms(siteId: string, signal?: AbortSignal) { return this.request<RoomResponse[]>(`/api/v1/sites/${encodeURIComponent(siteId)}/rooms`, { signal }); }
  createRoom(siteId: string, request: CreateRoomRequest, signal?: AbortSignal) { return this.request<RoomResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/rooms`, { method: 'POST', body: JSON.stringify(request), signal }); }
  assets(siteId: string, signal?: AbortSignal) { return this.request<AssetResponse[]>(`/api/v1/sites/${encodeURIComponent(siteId)}/assets`, { signal }); }
  createAsset(siteId: string, request: CreateAssetRequest, signal?: AbortSignal) { return this.request<AssetResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/assets`, { method: 'POST', body: JSON.stringify(request), signal }); }
  floorPlan(siteId: string, floorId: string, signal?: AbortSignal) { return this.request<FloorPlanResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/floors/${encodeURIComponent(floorId)}/plan`, { signal }); }
  createFloorPlan(siteId: string, floorId: string, request: { unit: 'm' | 'ft'; width: number; height: number; originX?: number; originY?: number; rotationDegrees?: number; planReference?: string }, signal?: AbortSignal) { return this.request<FloorPlanResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/floors/${encodeURIComponent(floorId)}/plan`, { method: 'POST', body: JSON.stringify(request), signal }); }
  spatialElements(siteId: string, floorId: string, signal?: AbortSignal) { return this.request<SpatialElementResponse[]>(`/api/v1/sites/${encodeURIComponent(siteId)}/floors/${encodeURIComponent(floorId)}/spatial-elements`, { signal }); }
  upsertSpatialElement(siteId: string, floorId: string, type: 'room' | 'asset', entityId: string, request: { geometry: Record<string, unknown>; positionX: number; positionY: number; positionZ?: number; rotationDegrees?: number; expectedVersion?: number }, signal?: AbortSignal) { return this.request<SpatialElementResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/floors/${encodeURIComponent(floorId)}/spatial-elements/${type}/${encodeURIComponent(entityId)}`, { method: 'PUT', body: JSON.stringify(request), signal }); }
  retireSpatialElement(siteId: string, floorId: string, elementId: string, signal?: AbortSignal) { return this.request<void>(`/api/v1/sites/${encodeURIComponent(siteId)}/floors/${encodeURIComponent(floorId)}/spatial-elements/${encodeURIComponent(elementId)}`, { method: 'DELETE', signal }); }
  telemetryDevices(siteId: string, signal?: AbortSignal) { return this.request<TelemetryDeviceResponse[]>(`/api/v1/sites/${encodeURIComponent(siteId)}/telemetry/devices`, { signal }); }
  registerTelemetryDevice(siteId: string, request: { externalId: string; displayName: string; protocol: 'HTTPS'; assetId?: string }, signal?: AbortSignal) { return this.request<TelemetryDeviceCreated>(`/api/v1/sites/${encodeURIComponent(siteId)}/telemetry/devices`, { method: 'POST', body: JSON.stringify(request), signal }); }
  revokeTelemetryDevice(siteId: string, deviceId: string, signal?: AbortSignal) { return this.request<void>(`/api/v1/sites/${encodeURIComponent(siteId)}/telemetry/devices/${encodeURIComponent(deviceId)}/revoke`, { method: 'POST', signal }); }
  telemetryLatest(siteId: string, limit = 100, signal?: AbortSignal) { return this.request<TelemetryPointResponse[]>(`/api/v1/sites/${encodeURIComponent(siteId)}/telemetry/latest?limit=${limit}`, { signal }); }
  telemetryHistory(siteId: string, metricKey: string, from: string, to: string, limit = 500, signal?: AbortSignal) { const query = new URLSearchParams({ metricKey, from, to, limit: String(limit) }); return this.request<TelemetryPointResponse[]>(`/api/v1/sites/${encodeURIComponent(siteId)}/telemetry?${query}`, { signal }); }
  workOrders(siteId: string, status?: string, signal?: AbortSignal) { const suffix = status ? `?status=${encodeURIComponent(status)}` : ''; return this.request<WorkOrderResponse[]>(`/api/v1/sites/${encodeURIComponent(siteId)}/work-orders${suffix}`, { signal }); }
  createWorkOrder(siteId: string, request: { title: string; description?: string; priority?: string; assetId?: string; dueAt?: string; assigneeMemberId?: string }, signal?: AbortSignal) { return this.request<WorkOrderResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/work-orders`, { method: 'POST', body: JSON.stringify(request), signal }); }
  updateWorkOrder(siteId: string, orderId: string, request: { expectedVersion: number; status?: string; priority?: string; dueAt?: string; clearDueAt?: boolean; assigneeMemberId?: string; clearAssignee?: boolean }, signal?: AbortSignal) { return this.request<WorkOrderResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/work-orders/${encodeURIComponent(orderId)}`, { method: 'PATCH', body: JSON.stringify(request), signal }); }
  energySummary(siteId: string, from: string, to: string, signal?: AbortSignal) { const query = new URLSearchParams({ from, to }); return this.request<EnergySummaryResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/analytics/energy?${query}`, { signal }); }
  setEnergyFactors(siteId: string, request: { effectiveFrom: string; currency: string; electricityCostPerKwh?: number; gridEmissionsKgPerKwh?: number; waterCostPerM3?: number }, signal?: AbortSignal) { return this.request<unknown>(`/api/v1/sites/${encodeURIComponent(siteId)}/analytics/energy/factors`, { method: 'POST', body: JSON.stringify(request), signal }); }
  aiProviderInfo(siteId: string, signal?: AbortSignal) { return this.request<AiProviderInfo>(`/api/v1/sites/${encodeURIComponent(siteId)}/ai/provider`, { signal }); }
  generateAiInsight(siteId: string, request: { task: 'energy_review' | 'maintenance_review'; question?: string }, signal?: AbortSignal) { return this.request<AiInsightResponse>(`/api/v1/sites/${encodeURIComponent(siteId)}/ai/insights`, { method: 'POST', body: JSON.stringify(request), signal }); }
}
