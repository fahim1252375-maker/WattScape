import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, UserManager, WebStorageStateStore } from 'oidc-client-ts';
import { completeLoginCallback, completeSilentCallback, signInQueryParams, signOutFromProvider } from './oidcLifecycle';
import { resolveIdentityAuthority } from '../config/runtimeConfig';

const CALLBACK_PATH = '/auth/callback';
const SILENT_CALLBACK_PATH = '/auth/silent-callback';

export interface AuthSettings {
  authority: string;
  client_id: string;
  redirect_uri: string;
  post_logout_redirect_uri: string;
  silent_redirect_uri: string;
  response_type: 'code';
  scope: 'openid profile email';
  automaticSilentRenew: true;
  monitorSession: true;
  userStore: WebStorageStateStore;
}

export function buildAuthSettings(origin: string, values: Record<string, string | undefined>): AuthSettings | null {
  const authority = resolveIdentityAuthority(values.VITE_OIDC_AUTHORITY, import.meta.env.DEV);
  const clientId = values.VITE_OIDC_CLIENT_ID?.trim();
  if (!authority || !clientId) return null;
  return {
    authority,
    client_id: clientId,
    redirect_uri: `${origin}${CALLBACK_PATH}`,
    post_logout_redirect_uri: `${origin}/`,
    silent_redirect_uri: `${origin}${SILENT_CALLBACK_PATH}`,
    response_type: 'code',
    scope: 'openid profile email',
    automaticSilentRenew: true,
    monitorSession: true,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  };
}

function rolesFromAccessToken(accessToken?: string): string[] {
  if (!accessToken) return [];
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return [];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='))) as {
      realm_access?: { roles?: unknown };
    };
    return Array.isArray(decoded.realm_access?.roles)
      ? decoded.realm_access.roles.filter((role): role is string => typeof role === 'string')
      : [];
  } catch {
    return [];
  }
}

type AuthStatus = 'loading' | 'ready' | 'signing-in' | 'expired' | 'error';
interface AuthContextValue {
  enabled: boolean;
  status: AuthStatus;
  user: User | null;
  roles: string[];
  error: string | null;
  signIn: (options?: { email?: string; registration?: boolean; provider?: 'google' | 'apple' }) => Promise<void>;
  signOut: () => Promise<void>;
  clearSession: (reason?: string) => Promise<void>;
  accessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const settings = typeof window === 'undefined' ? null : buildAuthSettings(window.location.origin, import.meta.env);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [manager] = useState(() => settings ? new UserManager(settings) : null);
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(settings ? 'loading' : 'ready');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!manager) return;
    let active = true;
    const path = window.location.pathname;
    if (path === SILENT_CALLBACK_PATH) {
      void completeSilentCallback(manager).catch(() => undefined);
      return () => { active = false; };
    }
    if (path === CALLBACK_PATH) {
      void completeLoginCallback(manager).then(({ user: signedInUser, returnTo }) => {
        if (!active) return;
        setUser(signedInUser);
        setStatus('ready');
        window.location.replace(returnTo);
      }).catch((cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'Sign-in could not be completed.');
        setStatus('error');
        window.history.replaceState({}, document.title, '/');
      });
      return () => { active = false; };
    }

    void manager.getUser().then((storedUser) => {
      if (!active) return;
      setUser(storedUser && !storedUser.expired ? storedUser : null);
      setStatus(storedUser?.expired ? 'expired' : 'ready');
      manager.startSilentRenew();
    }).catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : 'Unable to restore the sign-in session.');
      setStatus('error');
    });

    const removeLoaded = manager.events.addUserLoaded((loadedUser) => {
      if (active) { setUser(loadedUser); setStatus('ready'); setError(null); }
    });
    const removeUnloaded = manager.events.addUserUnloaded(() => {
      if (active) { setUser(null); setStatus('expired'); }
    });
    const removeSignedOut = manager.events.addUserSignedOut(() => {
      if (active) { setUser(null); setStatus('expired'); }
    });
    const removeRenewError = manager.events.addSilentRenewError(() => {
      void manager.getUser().then((current) => {
        if (active && (!current || current.expired)) {
          setUser(null);
          setStatus('expired');
        }
      });
    });
    return () => {
      active = false;
      removeLoaded(); removeUnloaded(); removeSignedOut(); removeRenewError();
      manager.stopSilentRenew();
    };
  }, [manager]);

  const signIn = useCallback(async (options: { email?: string; registration?: boolean; provider?: 'google' | 'apple' } = {}) => {
    if (!manager) throw new Error('Live sign-in is not configured. Copy .env.example to .env.local and set the OIDC values.');
    setError(null);
    setStatus('signing-in');
    try {
      await manager.signinRedirect({ extraQueryParams: signInQueryParams(options), state: { returnTo: `${window.location.pathname}${window.location.search}` } });
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Unable to open the identity provider.');
    }
  }, [manager]);

  const signOut = useCallback(async () => {
    if (!manager) return;
    const current = await manager.getUser();
    setUser(null);
    setStatus('ready');
    await signOutFromProvider(manager, current);
  }, [manager]);

  const clearSession = useCallback(async (reason?: string) => {
    if (manager) await manager.removeUser();
    setUser(null);
    setStatus('expired');
    if (reason) setError(reason);
  }, [manager]);

  const accessToken = useCallback(async () => {
    if (!manager) throw new Error('Live OIDC is not configured.');
    let current = await manager.getUser();
    if (!current || current.expired || (current.expires_at ?? 0) <= Date.now() / 1000 + 15) {
      current = await manager.signinSilent();
    }
    if (!current?.access_token || current.expired) throw new Error('Your WattScape session expired. Sign in again to continue.');
    setUser(current);
    setStatus('ready');
    return current.access_token;
  }, [manager]);

  const value = useMemo<AuthContextValue>(() => ({
    enabled: !!manager,
    status,
    user,
    roles: rolesFromAccessToken(user?.access_token),
    error,
    signIn,
    signOut,
    clearSession,
    accessToken,
  }), [manager, status, user, error, signIn, signOut, clearSession, accessToken]);

  if (window.location.pathname === CALLBACK_PATH && status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--ws-canvas)] text-[var(--ws-text-secondary)]" role="status">Completing secure sign-in…</div>;
  }
  if (window.location.pathname === SILENT_CALLBACK_PATH) return <div aria-hidden="true" />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
