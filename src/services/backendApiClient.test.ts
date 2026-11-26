import { afterEach, describe, expect, it, vi } from 'vitest';
import { WattScapeApiError, WattScapeBackendClient } from './backendApiClient';

const jsonResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('WattScapeBackendClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the OIDC access token and does not add a browser-supplied tenant scope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);
    const client = new WattScapeBackendClient('http://localhost:8080/', async () => 'signed-access-token');
    await client.sites();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8080/api/v1/sites');
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer signed-access-token');
    expect(url).not.toContain('tenant');
  });

  it('sends a selected organization only as a server-validated selector', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);
    const client = new WattScapeBackendClient('http://localhost:8080', async () => 'signed-token', () => 'org-selected');
    await client.sites();
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(request.headers).get('X-Organization-Id')).toBe('org-selected');
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer signed-token');
  });

  it.each([401, 403])('surfaces HTTP %i without retrying into demo data', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(status, { title: status === 401 ? 'Unauthorized' : 'Forbidden', status })));
    const client = new WattScapeBackendClient('http://localhost:8080', async () => 'token');
    await expect(client.me()).rejects.toBeInstanceOf(WattScapeApiError);
    await expect(client.me()).rejects.toMatchObject({ status });
  });

  it('aborts requests when the selected live site changes or the view unmounts', async () => {
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    })));
    const client = new WattScapeBackendClient('http://localhost:8080', async () => 'token');
    const controller = new AbortController();
    const pending = client.sites(controller.signal);
    await Promise.resolve();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });


  it('calls the persisted Phase 4 APIs with encoded tenant-scoped resource paths', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(200, {})));
    vi.stubGlobal('fetch', fetchMock);
    const client = new WattScapeBackendClient('http://localhost:8080', async () => 'live-token', () => 'org-1');

    await client.createFloorPlan('site/1', 'floor 1', { unit: 'm', width: 45, height: 30 });
    await client.registerTelemetryDevice('site-1', { externalId: 'meter-01', displayName: 'Main meter', protocol: 'HTTPS' });
    await client.createWorkOrder('site-1', { title: 'Inspect pump', priority: 'high' });
    await client.energySummary('site-1', '2026-11-01T00:00:00Z', '2026-11-02T00:00:00Z');
    await client.generateAiInsight('site-1', { task: 'energy_review' });

    const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
    expect(calls.map(([url]) => url)).toEqual([
      'http://localhost:8080/api/v1/sites/site%2F1/floors/floor%201/plan',
      'http://localhost:8080/api/v1/sites/site-1/telemetry/devices',
      'http://localhost:8080/api/v1/sites/site-1/work-orders',
      'http://localhost:8080/api/v1/sites/site-1/analytics/energy?from=2026-11-01T00%3A00%3A00Z&to=2026-11-02T00%3A00%3A00Z',
      'http://localhost:8080/api/v1/sites/site-1/ai/insights',
    ]);
    for (const [, request] of calls) {
      expect(new Headers(request.headers).get('Authorization')).toBe('Bearer live-token');
      expect(new Headers(request.headers).get('X-Organization-Id')).toBe('org-1');
    }
    expect(JSON.parse(String(calls[1][1].body))).toEqual({ externalId: 'meter-01', displayName: 'Main meter', protocol: 'HTTPS' });
  });
});
