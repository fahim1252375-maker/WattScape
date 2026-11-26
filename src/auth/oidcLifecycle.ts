import type { User, UserManager } from 'oidc-client-ts';

export function returnPathFromState(state: unknown): string {
  if (!state || typeof state !== 'object' || !('returnTo' in state)) return '/';
  const value = (state as { returnTo?: unknown }).returnTo;
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function signInQueryParams(options: { email?: string; registration?: boolean; provider?: 'google' | 'apple' } = {}) {
  const params: Record<string, string> = {};
  if (options.email?.trim()) params.login_hint = options.email.trim();
  if (options.registration) params.prompt = 'create';
  if (options.provider) params.kc_idp_hint = options.provider;
  return params;
}

export async function completeLoginCallback(manager: UserManager) {
  const user = await manager.signinRedirectCallback();
  return { user, returnTo: returnPathFromState(user.state) };
}

export async function completeSilentCallback(manager: UserManager) {
  await manager.signinSilentCallback();
}

export async function signOutFromProvider(manager: UserManager, currentUser: User | null) {
  if (currentUser) await manager.signoutRedirect({ id_token_hint: currentUser.id_token });
  else await manager.removeUser();
}

export function hasLiveWorkspaceRole(roles: string[]) {
  return roles.some((role) => role === 'ADMIN' || role === 'MEMBER');
}
