import { describe, expect, it, vi } from 'vitest';
import type { User, UserManager } from 'oidc-client-ts';
import { buildAuthSettings } from './AuthProvider';
import { completeLoginCallback, hasLiveWorkspaceRole, returnPathFromState, signInQueryParams, signOutFromProvider } from './oidcLifecycle';

describe('OIDC browser configuration', () => {
  it('uses a public authorization-code client with PKCE and exact callback routes', () => {
    const settings = buildAuthSettings('http://localhost:3000', {
      VITE_OIDC_AUTHORITY: 'http://localhost:8081/realms/wattscape-local/',
      VITE_OIDC_CLIENT_ID: 'wattscape-local',
    });
    expect(settings).not.toBeNull();
    expect(settings).toMatchObject({
      authority: 'http://localhost:8081/realms/wattscape-local',
      client_id: 'wattscape-local',
      response_type: 'code',
      redirect_uri: 'http://localhost:3000/auth/callback',
      silent_redirect_uri: 'http://localhost:3000/auth/silent-callback',
      post_logout_redirect_uri: 'http://localhost:3000/',
      automaticSilentRenew: true,
    });
    expect(buildAuthSettings('http://localhost:3000', {})).toBeNull();
  });

  it('completes the OIDC callback and permits only same-origin relative return paths', async () => {
    const user = { state: { returnTo: '/?screen=assets' } } as User;
    const manager = { signinRedirectCallback: vi.fn().mockResolvedValue(user) } as unknown as UserManager;
    await expect(completeLoginCallback(manager)).resolves.toEqual({ user, returnTo: '/?screen=assets' });
    expect(manager.signinRedirectCallback).toHaveBeenCalledOnce();
    expect(returnPathFromState({ returnTo: '//evil.example' })).toBe('/');
    expect(returnPathFromState({ returnTo: 'https://evil.example' })).toBe('/');
  });

  it('starts the hosted Keycloak login without an email-only intermediate step', () => {
    expect(signInQueryParams()).toEqual({});
  });

  it('retains safe registration and configured social-provider hints', () => {
    expect(signInQueryParams({ registration: true })).toEqual({ prompt: 'create' });
    expect(signInQueryParams({ provider: 'google' })).toEqual({ kc_idp_hint: 'google' });
    expect(signInQueryParams({ email: ' person@example.test ' })).toEqual({ login_hint: 'person@example.test' });
  });

  it('signs out through the OIDC end-session endpoint and clears an empty session', async () => {
    const manager = { signoutRedirect: vi.fn().mockResolvedValue(undefined), removeUser: vi.fn().mockResolvedValue(undefined) } as unknown as UserManager;
    await signOutFromProvider(manager, { id_token: 'id-token-hint' } as User);
    expect(manager.signoutRedirect).toHaveBeenCalledWith({ id_token_hint: 'id-token-hint' });
    await signOutFromProvider(manager, null);
    expect(manager.removeUser).toHaveBeenCalledOnce();
  });

  it('protects the live workspace by requiring ADMIN or MEMBER', () => {
    expect(hasLiveWorkspaceRole(['ADMIN'])).toBe(true);
    expect(hasLiveWorkspaceRole(['MEMBER'])).toBe(true);
    expect(hasLiveWorkspaceRole(['VISITOR'])).toBe(false);
    expect(hasLiveWorkspaceRole([])).toBe(false);
  });
});
