import React from 'react';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WattScapeApiError } from '../services/backendApiClient';

const mocks = vi.hoisted(() => ({
  auth: {
    enabled: true,
    status: 'ready',
    user: { access_token: 'test' } as { access_token: string } | null,
    roles: ['MEMBER'] as string[],
    error: null as string | null,
    accessToken: vi.fn(async () => 'test-token'),
    signIn: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    clearSession: vi.fn(async () => undefined),
  },
  setMode: vi.fn(),
  api: {
    memberships: vi.fn(async () => [{ organizationId: 'org-live', organizationName: 'Live Organization', role: 'Auditor/Read Only', status: 'active' }]),
    selectOrganization: vi.fn(async (organizationId: string) => ({ organizationId, organizationName: 'Live Organization', role: 'Auditor/Read Only', status: 'active' })),
    onboardingStatus: vi.fn(async () => ({ hasOrganization: true, needsOrganizationSelection: false })),
    health: vi.fn(async () => ({ status: 'UP' })),
    me: vi.fn(async () => ({ subject: 'test-subject', email: 'member@example.test', displayName: 'Live Member', role: 'Auditor/Read Only', organizationId: 'org-live', emailVerified: true })),
    currentOrganization: vi.fn(async () => ({ id: 'org-live', name: 'Live Organization', legalName: 'Live Organization LLC', defaultCurrency: 'USD', unitSystem: 'metric', timeZonePolicy: 'UTC', locale: 'en-US', retentionDays: 90, region: 'test' })),
    sites: vi.fn(async () => []),
    twin: vi.fn(async () => null),
    rooms: vi.fn(async () => []),
    assets: vi.fn(async () => []),
    createSite: vi.fn(), createRoom: vi.fn(), createAsset: vi.fn(),
  },
}));

vi.mock('../auth/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('../context/AppModeContext', () => ({ useAppMode: () => ({ mode: 'live', setMode: mocks.setMode }) }));
vi.mock('../services/backendApiClient', () => ({
  WattScapeApiError: class WattScapeApiError extends Error {
    constructor(public status: number, public problem: { title: string; status: number; detail?: string }) { super(problem.detail ?? problem.title); }
  },
  WattScapeBackendClient: class {
    memberships = mocks.api.memberships; selectOrganization = mocks.api.selectOrganization;
    onboardingStatus = mocks.api.onboardingStatus;
    health = mocks.api.health; me = mocks.api.me; currentOrganization = mocks.api.currentOrganization; sites = mocks.api.sites;
    twin = mocks.api.twin; rooms = mocks.api.rooms; assets = mocks.api.assets;
    createSite = mocks.api.createSite; createRoom = mocks.api.createRoom; createAsset = mocks.api.createAsset;
    constructor(_baseUrl: string, _getAccessToken: () => Promise<string>, _getOrganizationId?: () => string | null) {}
  },
}));

import LiveWorkspaceScreen from './LiveWorkspaceScreen';

describe('Live API workspace boundary', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    mocks.auth.status = 'ready';
    mocks.auth.user = { access_token: 'test' };
    mocks.auth.roles = ['MEMBER'];
    mocks.auth.error = null;
    mocks.auth.clearSession.mockClear();
    mocks.api.me.mockClear();
    mocks.api.health.mockResolvedValue({ status: 'UP' });
    mocks.api.me.mockResolvedValue({ subject: 'test-subject', email: 'member@example.test', displayName: 'Live Member', role: 'Auditor/Read Only', organizationId: 'org-live', emailVerified: true });
    mocks.api.memberships.mockResolvedValue([{ organizationId: 'org-live', organizationName: 'Live Organization', role: 'Auditor/Read Only', status: 'active' }]);
    mocks.api.currentOrganization.mockResolvedValue({ id: 'org-live', name: 'Live Organization', legalName: 'Live Organization LLC', defaultCurrency: 'USD', unitSystem: 'metric', timeZonePolicy: 'UTC', locale: 'en-US', retentionDays: 90, region: 'test' });
    mocks.api.sites.mockResolvedValue([]);
  });

  it('renders only live API identity/data and keeps MEMBER write actions hidden', async () => {
    render(<LiveWorkspaceScreen />);
    expect(await screen.findByText('No live sites in this organization')).toBeTruthy();
    expect(screen.getAllByText('Live Organization').length).toBeGreaterThan(0);
    expect(screen.queryByText('Meridian North Lab')).toBeNull();
    expect(screen.queryByText('Synthetic Demo Dataset')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create site' })).toBeNull();
  });

  it('shows supported site creation to ADMIN while leaving authorization to the API', async () => {
    mocks.auth.roles = ['ADMIN'];
    render(<LiveWorkspaceScreen />);
    expect(await screen.findByRole('button', { name: 'Create site' })).toBeTruthy();
  });

  it('lists per-organization roles and validates an organization switch through the API', async () => {
    mocks.api.memberships.mockResolvedValue([
      { organizationId: 'org-live', organizationName: 'Live Organization', role: 'Auditor/Read Only', status: 'active' },
      { organizationId: 'org-second', organizationName: 'Second Organization', role: 'Organization Admin', status: 'active' },
    ]);
    const user = userEvent.setup();
    render(<LiveWorkspaceScreen />);
    const selector = await screen.findByRole('combobox', { name: 'Active organization' });
    expect((selector as HTMLSelectElement).options).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Second Organization · Organization Admin' })).toBeTruthy();
    await user.selectOptions(selector, 'org-second');
    await waitFor(() => expect(mocks.api.selectOrganization).toHaveBeenCalledWith('org-second'));
  });

  it('shows an explicit expired-session sign-in state with no fixture fallback', async () => {
    mocks.auth.status = 'expired';
    mocks.auth.user = null;
    render(<LiveWorkspaceScreen />);
    expect(await screen.findByRole('heading', { name: 'Connect to your organization' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('Your session expired');
    expect(screen.queryByText('Meridian North Lab')).toBeNull();
  });

  it('blocks identities without a supported role before calling tenant APIs', async () => {
    mocks.auth.roles = ['VISITOR'];
    render(<LiveWorkspaceScreen />);
    expect(await screen.findByRole('heading', { name: 'Live workspace unavailable' })).toBeTruthy();
    expect(mocks.api.me).not.toHaveBeenCalled();
  });

  it('shows an access-denied state after a 403 and does not substitute demo content', async () => {
    mocks.api.me.mockRejectedValueOnce(new WattScapeApiError(403, { title: 'Forbidden', status: 403, detail: 'The live identity has no active membership.' }));
    render(<LiveWorkspaceScreen />);
    expect(await screen.findByRole('heading', { name: 'Live workspace unavailable' })).toBeTruthy();
    expect(screen.getByText('The live identity has no active membership.')).toBeTruthy();
    expect(screen.queryByText('Meridian North Lab')).toBeNull();
  });

  it('moves focus into the site dialog, traps keyboard focus, and restores focus on Escape', async () => {
    mocks.auth.roles = ['ADMIN'];
    const user = userEvent.setup();
    render(<LiveWorkspaceScreen />);
    const openButton = await screen.findByRole('button', { name: 'Create site' });
    openButton.focus();
    await user.click(openButton);
    const dialog = screen.getByRole('dialog', { name: 'Create live site' });
    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(document.activeElement).toBe(closeButton);
    const lastControl = within(dialog).getByRole('button', { name: 'Create site' });
    lastControl.focus();
    await user.tab();
    expect(document.activeElement).toBe(closeButton);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Create live site' })).toBeNull());
    expect(document.activeElement).toBe(openButton);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });
});
