import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl, resolveIdentityAuthority } from './runtimeConfig';

describe('deployment-aware browser configuration', () => {
  it('uses localhost defaults only during local development', () => {
    expect(resolveApiBaseUrl(undefined, true)).toBe('http://localhost:8080');
    expect(resolveApiBaseUrl(undefined, false)).toBe('');
  });

  it('normalizes a valid HTTPS API origin', () => {
    expect(resolveApiBaseUrl(' https://api.example.com/ ', false)).toBe('https://api.example.com');
  });

  it('rejects non-HTTPS remote API origins and embedded credentials', () => {
    expect(resolveApiBaseUrl('http://api.example.com', false)).toBe('');
    expect(resolveApiBaseUrl('https://user:password@api.example.com', false)).toBe('');
  });

  it('preserves the explicit Phase 4 host-run API port instead of using the generic 8080 fallback', () => {
    expect(resolveApiBaseUrl('http://localhost:8082', true)).toBe('http://localhost:8082');
  });

  it('allows HTTP loopback endpoints for local development', () => {
    expect(resolveApiBaseUrl('http://localhost:8080/', true)).toBe('http://localhost:8080');
    expect(resolveApiBaseUrl('http://localhost:8080/', false)).toBe('');
    expect(resolveIdentityAuthority('http://localhost:8081/realms/wattscape-local/', true))
      .toBe('http://localhost:8081/realms/wattscape-local');
  });

  it('requires HTTPS for a remotely hosted identity provider', () => {
    expect(resolveIdentityAuthority('http://identity.example.com/realms/wattscape', false)).toBe('');
    expect(resolveIdentityAuthority('https://identity.example.com/realms/wattscape', false))
      .toBe('https://identity.example.com/realms/wattscape');
  });
});
