import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: {
    enabled: true,
    status: 'ready' as 'loading' | 'ready' | 'signing-in' | 'expired' | 'error',
    error: null as string | null,
    signIn: vi.fn(async () => undefined),
  },
  setMode: vi.fn(),
  signInDemo: vi.fn(),
}));

vi.mock('../auth/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('../context/AppModeContext', () => ({ useAppMode: () => ({ setMode: mocks.setMode }) }));
vi.mock('../context/WattScapeContext', () => ({ useWattScape: () => ({ signInDemo: mocks.signInDemo }) }));

import { AuthScreen } from './EntryAndPortfolioScreens';

describe('WattScape OIDC sign-in handoff', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    mocks.auth.enabled = true;
    mocks.auth.status = 'ready';
    mocks.auth.error = null;
    mocks.auth.signIn.mockClear();
    mocks.setMode.mockClear();
    mocks.signInDemo.mockClear();
  });

  it('opens the branded identity-provider login directly without an email-only form', async () => {
    render(<AuthScreen />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    await waitFor(() => expect(mocks.auth.signIn).toHaveBeenCalledOnce());
    expect(mocks.auth.signIn).toHaveBeenCalledWith();
    expect(mocks.setMode).toHaveBeenCalledWith('live');
  });

  it('waits for OIDC initialization before redirecting', async () => {
    mocks.auth.status = 'loading';
    const view = render(<AuthScreen />);
    expect(mocks.auth.signIn).not.toHaveBeenCalled();
    mocks.auth.status = 'ready';
    view.rerender(<AuthScreen />);
    await waitFor(() => expect(mocks.auth.signIn).toHaveBeenCalledOnce());
  });

  it('does not start a redirect when the OIDC client is not configured', () => {
    mocks.auth.enabled = false;
    render(<AuthScreen />);
    expect(screen.getByText(/Live sign-in is not configured/i)).toBeTruthy();
    expect(mocks.auth.signIn).not.toHaveBeenCalled();
  });

  it('keeps a safe demo entry available without mixing it with live authentication', async () => {
    render(<AuthScreen />);
    screen.getByRole('button', { name: 'Explore demo workspace' }).click();
    expect(mocks.signInDemo).toHaveBeenCalledWith('elena.rostova@meridian-demo.example', 'Organization Owner');
  });
});
