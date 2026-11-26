import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAppMode } from '../context/AppModeContext';
import { useAuth } from '../auth/AuthProvider';
import { hasLiveWorkspaceRole } from '../auth/oidcLifecycle';
import { WattScapeApiError, WattScapeBackendClient } from '../services/backendApiClient';
import LivePhase4Operations from './LivePhase4Operations';
import type { AssetResponse, OrganizationResponse, RoomResponse, SiteResponse, TwinResponse, MeResponse, MembershipResponse } from '../services/backendApiClient';
import { resolveApiBaseUrl } from '../config/runtimeConfig';

const API_BASE = resolveApiBaseUrl(import.meta.env.VITE_WATSCAPE_API_BASE_URL, import.meta.env.DEV);
const panel = 'rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] shadow-[var(--ws-shadow-sm)]';
const field = 'w-full rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-2 text-sm text-[var(--ws-text-primary)]';
const action = 'rounded-md bg-[var(--ws-brand-teal)] px-3.5 py-2 text-sm font-semibold text-[var(--ws-brand-teal-fg)] disabled:cursor-not-allowed disabled:opacity-50';

function errorText(cause: unknown): string {
  if (cause instanceof WattScapeApiError) {
    if (cause.status === 401) return 'Your API session expired or is no longer valid. Sign in again to reconnect.';
    if (cause.status === 403) return cause.problem.detail || 'Your identity is authenticated, but this organization does not grant that permission.';
    return cause.problem.detail || cause.problem.title || `The API returned HTTP ${cause.status}.`;
  }
  return cause instanceof Error ? cause.message : 'The live API request failed.';
}

function useActiveOrganizationScope() {
  const organizationRef = useRef<string | null>(null);
  const getOrganizationId = useCallback(() => organizationRef.current, []);
  const setOrganizationId = useCallback((organizationId: string | null) => { organizationRef.current = organizationId; }, []);
  return { getOrganizationId, setOrganizationId };
}

function LiveSignIn() {
  const auth = useAuth();
  const { setMode } = useAppMode();
  const expired = auth.status === 'expired';
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--ws-canvas)] text-[var(--ws-text-primary)]">
      <section className={`${panel} w-full max-w-lg p-7 space-y-5`}>
        <div className="text-xs font-semibold uppercase tracking-wide text-[var(--ws-brand-teal)]">Live API Mode · OIDC / PKCE</div>
        <h1 className="text-2xl font-display font-semibold">Connect to your organization</h1>
        <p className="text-sm leading-6 text-[var(--ws-text-secondary)]">Sign in through WattScape’s local identity provider. The browser receives a short-lived OIDC session; organization scope is resolved by the API from that verified identity.</p>
        {expired && <div role="status" className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">Your session expired. Sign in again to continue. Live data is not replaced with demo data.</div>}
        {auth.error && <div role="alert" className="rounded border border-[var(--ws-danger)]/40 bg-[var(--ws-danger)]/10 p-3 text-sm">{auth.error}</div>}
        {!auth.enabled && <div role="alert" className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">OIDC configuration is missing. Set the public VITE_OIDC_AUTHORITY and VITE_OIDC_CLIENT_ID values in .env.local and restart Vite.</div>}
        <button className={action + ' w-full'} disabled={!auth.enabled || auth.status === 'signing-in'} onClick={() => void auth.signIn()}>
          {auth.status === 'signing-in' ? 'Opening secure sign-in…' : expired ? 'Sign in again' : 'Continue with Keycloak'}
        </button>
        <button className="w-full rounded-md border border-[var(--ws-line)] px-3.5 py-2 text-sm" onClick={() => setMode('demo')}>Switch to Demo Mode</button>
      </section>
    </main>
  );
}

function AccessDenied({ message, onBack }: { message: string; onBack: () => void }) {
  return <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--ws-canvas)] text-[var(--ws-text-primary)]"><section className={`${panel} max-w-lg p-7 space-y-4`}><div className="text-xs font-semibold uppercase tracking-wide text-[var(--ws-danger)]">Access denied</div><h1 className="text-2xl font-display font-semibold">Live workspace unavailable</h1><p role="alert" className="text-sm text-[var(--ws-text-secondary)]">{message}</p><button className={action} onClick={onBack}>Return to live sign-in</button></section></main>;
}

export default function LiveWorkspaceScreen() {
  const auth = useAuth();
  const clearSession = auth.clearSession;
  const { getOrganizationId, setOrganizationId } = useActiveOrganizationScope();
  const [api] = useState(() => new WattScapeBackendClient(API_BASE, auth.accessToken, getOrganizationId));
  const [identity, setIdentity] = useState<MeResponse | null>(null);
  const [organization, setOrganization] = useState<OrganizationResponse | null>(null);
  const [sites, setSites] = useState<SiteResponse[]>([]);
  const [siteId, setSiteId] = useState('');
  const [twin, setTwin] = useState<TwinResponse | null>(null);
  const [rooms, setRooms] = useState<RoomResponse[] | null>(null);
  const [assets, setAssets] = useState<AssetResponse[] | null>(null);
  const [tab, setTab] = useState<'overview' | 'twin' | 'rooms' | 'assets' | 'phase4'>('overview');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [memberships, setMemberships] = useState<MembershipResponse[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const canWrite = auth.roles.includes('ADMIN') || ['Organization Owner', 'Organization Admin', 'Site Admin'].includes(identity?.role ?? '');

  useEffect(() => {
    const controller = new AbortController();
    if (!auth.user || !hasLiveWorkspaceRole(auth.roles)) {
      return () => controller.abort();
    }
    if (!API_BASE) return () => controller.abort();
    void api.memberships(controller.signal).then((availableMemberships) => {
      if (controller.signal.aborted) return;
      setMemberships(availableMemberships);
      setOnboardingRequired(availableMemberships.length === 0);
      if (availableMemberships.length === 0) { setLoading(false); return; }
      const saved = window.sessionStorage.getItem('wattscape.activeOrganizationId');
      const claimed = (() => { try { const value = auth.user?.access_token.split('.')[1]; if (!value) return null; const payload = JSON.parse(window.atob(value.replace(/-/g,'+').replace(/_/g,'/'))) as { organization_id?: unknown }; return typeof payload.organization_id === 'string' ? payload.organization_id : null; } catch { return null; } })();
      const selected = availableMemberships.find((item) => item.organizationId === saved)?.organizationId ?? availableMemberships.find((item) => item.organizationId === claimed)?.organizationId ?? availableMemberships[0].organizationId;
      setOrganizationId(selected);
      window.sessionStorage.setItem('wattscape.activeOrganizationId', selected);
      setActiveOrganizationId(selected);
      return Promise.allSettled([
      api.health(controller.signal),
      api.me(controller.signal),
      api.currentOrganization(controller.signal),
      api.sites(controller.signal),
      ]).then(async ([healthResult, meResult, orgResult, sitesResult]) => {
      if (controller.signal.aborted) return;
      setOnline(healthResult.status === 'fulfilled' && healthResult.value.status === 'UP');
      const failed = [meResult, orgResult, sitesResult].find((result) => result.status === 'rejected');
      if (failed?.status === 'rejected') {
        const text = errorText(failed.reason);
        setError(text);
        if (failed.reason instanceof WattScapeApiError && failed.reason.status === 403) setAccessDenied(true);
        if (failed.reason instanceof WattScapeApiError && failed.reason.status === 401) await clearSession(text);
      } else if (meResult.status === 'fulfilled' && orgResult.status === 'fulfilled' && sitesResult.status === 'fulfilled') {
        setIdentity(meResult.value);
        setOrganization(orgResult.value);
        setSites(sitesResult.value);
        setSiteId((current) => current && sitesResult.value.some((site) => site.id === current) ? current : sitesResult.value[0]?.id ?? '');
        setDetailLoading(Boolean(sitesResult.value.length));
      }
      setLoading(false);
      });
    }).catch((cause: unknown) => { if (!controller.signal.aborted) { setError(errorText(cause)); setLoading(false); } });
    return () => controller.abort();
  }, [api, refreshKey, clearSession, auth.roles, auth.user, setOrganizationId]);

  useEffect(() => {
    if (!siteId) return;
    const controller = new AbortController();
    void Promise.all([api.twin(siteId, controller.signal), api.rooms(siteId, controller.signal), api.assets(siteId, controller.signal)])
      .then(([twinData, roomData, assetData]) => {
        if (controller.signal.aborted) return;
        setTwin(twinData); setRooms(roomData); setAssets(assetData);
      })
      .catch(async (cause: unknown) => {
        if (controller.signal.aborted) return;
        const text = errorText(cause);
        setError(text);
        if (cause instanceof WattScapeApiError && cause.status === 403) setAccessDenied(true);
        if (cause instanceof WattScapeApiError && cause.status === 401) await clearSession(text);
      })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [api, siteId, refreshKey, clearSession]);

  const floorOptions = twin?.floors ?? [];
  const roomOptions = rooms ?? [];
  const refresh = (loadDetails = Boolean(siteId)) => {
    setLoading(true);
    setDetailLoading(loadDetails);
    setTwin(null); setRooms(null); setAssets(null);
    setError(null);
    setAccessDenied(false);
    setRefreshKey((value) => value + 1);
  };
  const selectSite = (id: string) => {
    setDetailLoading(Boolean(id));
    setTwin(null); setRooms(null); setAssets(null);
    setError(null); setAccessDenied(false);
    setSiteId(id);
  };
  const reportMutationError = (cause: unknown) => {
    const text = errorText(cause);
    setError(text);
    if (cause instanceof WattScapeApiError && cause.status === 401) void clearSession(text);
    if (cause instanceof WattScapeApiError && cause.status === 403) setAccessDenied(true);
  };

  if (auth.status === 'loading' || loading && !error && Boolean(API_BASE) && auth.user && hasLiveWorkspaceRole(auth.roles)) return <main className="min-h-screen grid place-items-center bg-[var(--ws-canvas)] text-[var(--ws-text-secondary)]" role="status">Restoring secure session and loading organization…</main>;
  if (!auth.user) return <LiveSignIn />;
  if (!hasLiveWorkspaceRole(auth.roles)) return <AccessDenied message="This identity does not have a WattScape ADMIN or MEMBER role." onBack={() => void auth.clearSession()} />;
  if (!API_BASE) return <main className="min-h-screen flex items-center justify-center bg-[var(--ws-canvas)] p-6 text-[var(--ws-text-primary)]"><section className={`${panel} w-full max-w-xl space-y-3 p-7`}><div className="text-xs font-semibold uppercase tracking-wide text-[var(--ws-warning)]">Deployment configuration required</div><h1 className="text-2xl font-display font-semibold">Connect the WattScape API</h1><p className="text-sm leading-6 text-[var(--ws-text-secondary)]">This production build has no API origin configured. Add <code>VITE_WATSCAPE_API_BASE_URL</code> to the frontend deployment environment, using the HTTPS URL for the WattScape API, then trigger a new build.</p><button className={action} onClick={() => void auth.signOut()}>Sign out</button></section></main>;
  if (onboardingRequired) return <OrganizationOnboarding api={api} onComplete={() => { setOnboardingRequired(false); refresh(); }} />;
  if (accessDenied && error) return <AccessDenied message={error} onBack={() => void auth.clearSession(error)} />;

  return (
    <div className="min-h-screen bg-[var(--ws-canvas)] text-[var(--ws-text-primary)]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ws-line)] bg-[var(--ws-surface-1)] px-5 py-3">
        <div className="flex min-w-0 items-center gap-3"><span className="font-display text-lg font-bold">WattScape</span><span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">LIVE API</span><span className={`text-xs ${online ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'}`} role="status">● API {online ? 'Connected' : 'Unavailable'}</span></div>
        <div className="flex flex-wrap items-center gap-3 text-xs"><label className="flex items-center gap-2">Organization<select aria-label="Active organization" className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-2 py-1.5" value={activeOrganizationId ?? ''} onChange={(event) => { const id=event.target.value; void api.selectOrganization(id).then((membership) => { setOrganizationId(membership.organizationId); window.sessionStorage.setItem('wattscape.activeOrganizationId',membership.organizationId); setActiveOrganizationId(membership.organizationId); setSiteId(''); setTwin(null); setRooms(null); setAssets(null); refresh(false); }).catch((cause: unknown)=>setError(errorText(cause))); }}>{memberships.map((item)=><option key={item.organizationId} value={item.organizationId}>{item.organizationName} · {item.role}</option>)}</select></label><span className="text-[var(--ws-text-muted)]">{identity?.displayName || identity?.email || identity?.subject} · {identity?.role ?? 'Membership'}</span><button className="rounded border border-[var(--ws-line)] px-2.5 py-1.5" onClick={() => setAccountOpen((value)=>!value)}>{accountOpen ? 'Close account' : 'Account & access'}</button><button className="rounded border border-[var(--ws-line)] px-2.5 py-1.5" onClick={() => void auth.signOut()}>Sign out</button></div>
      </header>
      <main className="mx-auto max-w-7xl space-y-5 p-5 md:p-7">
        {accountOpen && <AccountSettings identity={identity} memberships={memberships} authority={import.meta.env.VITE_OIDC_AUTHORITY ?? ''} canInvite={['Organization Owner','Organization Admin'].includes(identity?.role ?? '')} onJoin={()=>setInviteOpen((value)=>!value)} api={api} />}
        {inviteOpen && <InvitationAccept api={api} onAccepted={()=>{setInviteOpen(false);setRefreshKey((value)=>value+1);}} />}
        <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-wide text-[var(--ws-brand-teal)]">Organization data · tenant scoped by API identity</div><h1 className="mt-1 text-2xl font-display font-semibold">{organization?.name ?? 'Live organization workspace'}</h1><p className="mt-1 text-sm text-[var(--ws-text-secondary)]">Only records returned by the authenticated WattScape API are shown in Live API Mode.</p></div><label className="min-w-56 text-xs font-medium text-[var(--ws-text-secondary)]">Current site<select className={`${field} mt-1`} value={siteId} onChange={(event) => selectSite(event.target.value)} disabled={!sites.length}><option value="">{sites.length ? 'Select a site' : 'No live sites'}</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.code}</option>)}</select></label></div>
        <nav aria-label="Live organization sections" className="flex flex-wrap gap-2 border-b border-[var(--ws-line)] pb-3">{(['overview', 'twin', 'rooms', 'assets', 'phase4'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded px-3 py-1.5 text-sm capitalize ${tab === item ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]' : 'border border-[var(--ws-line)]'}`}>{item === 'phase4' ? 'Phase 4 Operations' : item}</button>)}{canWrite && <span className="ml-auto self-center text-xs text-emerald-700 dark:text-emerald-300">Organization admin actions enabled (API enforces membership permissions)</span>}</nav>
        {error && <div role="alert" className="rounded border border-[var(--ws-danger)]/40 bg-[var(--ws-danger)]/10 p-3 text-sm">{error} <button className="ml-2 underline" onClick={() => refresh()}>Retry</button></div>}
        {loading ? <div role="status" className={`${panel} p-6 text-sm text-[var(--ws-text-secondary)]`}>Loading verified API identity and tenant data…</div> : !identity || !organization ? <div className={`${panel} p-6 text-sm`}>Live organization data is unavailable. Check the API connection or sign-in permissions, then retry. Demo data has not been substituted.</div> : !sites.length ? <section className={`${panel} p-6`}><h2 className="text-lg font-semibold">No live sites in this organization</h2><p className="mt-1 text-sm text-[var(--ws-text-secondary)]">Create a site to begin. Only API-persisted data appears here.</p>{canWrite && <button className={`${action} mt-4`} onClick={() => setShowSiteForm(true)}>Create site</button>}</section> : !siteId ? <section className={`${panel} p-6`}><h2 className="font-semibold">Select a site</h2><p className="mt-1 text-sm text-[var(--ws-text-secondary)]">Choose a live site to view its data.</p></section> : tab === 'overview' ? <LiveSiteList sites={sites} selectedId={siteId} onSelect={selectSite} onCreate={() => setShowSiteForm(true)} canWrite={canWrite} /> : tab === 'twin' ? <LiveTwin twin={twin} loading={detailLoading} /> : tab === 'rooms' ? <LiveRooms rooms={roomOptions} twin={twin} loading={detailLoading} canWrite={canWrite} onCreate={() => setShowRoomForm(true)} /> : tab === 'assets' ? <LiveAssets assets={assets ?? []} twin={twin} loading={detailLoading} canWrite={canWrite} onCreate={() => setShowAssetForm(true)} /> : <LivePhase4Operations key={siteId} api={api} siteId={siteId} floors={floorOptions} rooms={roomOptions} assets={assets ?? []} role={identity?.role ?? ''} actorSubject={identity?.subject ?? ''} />}
      </main>
      {showSiteForm && <Modal title="Create live site" onClose={() => setShowSiteForm(false)}><SiteForm api={api} onSaved={(site) => { setShowSiteForm(false); setSites((current) => [...current, site].sort((a, b) => a.name.localeCompare(b.name))); selectSite(site.id); refresh(true); }} onError={reportMutationError} /></Modal>}
      {showRoomForm && siteId && <Modal title="Create room" onClose={() => setShowRoomForm(false)}><RoomForm api={api} siteId={siteId} floors={floorOptions} onSaved={() => { setShowRoomForm(false); refresh(); }} onError={reportMutationError} /></Modal>}
      {showAssetForm && siteId && <Modal title="Create asset" onClose={() => setShowAssetForm(false)}><AssetForm api={api} siteId={siteId} floors={floorOptions} rooms={roomOptions} onSaved={() => { setShowAssetForm(false); refresh(); }} onError={reportMutationError} /></Modal>}
    </div>
  );
}

function OrganizationOnboarding({ api, onComplete }: { api: WattScapeBackendClient; onComplete: () => void }) {
  const [organization, setOrganization] = useState(''); const [legalName, setLegalName] = useState(''); const [invitation, setInvitation] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>) => { setBusy(true); setError(''); try { await action(); onComplete(); } catch (cause) { setError(errorText(cause)); } finally { setBusy(false); } };
  return <main className="min-h-screen grid place-items-center bg-[var(--ws-canvas)] p-5 text-[var(--ws-text-primary)]"><section className={`${panel} w-full max-w-xl space-y-6 p-7`}><div><div className="text-xs font-semibold uppercase tracking-wide text-[var(--ws-brand-teal)]">Live API · Organization setup</div><h1 className="mt-2 text-2xl font-display font-semibold">Set up your organization</h1><p className="mt-2 text-sm leading-6 text-[var(--ws-text-secondary)]">Create a new organization as its initial owner, or join with a single-use invitation sent to your verified email. Organization scope comes from your signed-in identity.</p></div>
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void run(() => api.createOrganization({ name: organization, legalName: legalName || organization })); }}><h2 className="font-semibold">Create an organization</h2><label className="block text-xs">Organization name<input required maxLength={160} value={organization} onChange={(event) => setOrganization(event.target.value)} className={`${field} mt-1`} /></label><label className="block text-xs">Legal name<input required maxLength={240} value={legalName} onChange={(event) => setLegalName(event.target.value)} className={`${field} mt-1`} /></label><button className={action} disabled={busy}>{busy ? 'Creating…' : 'Create organization as owner'}</button></form>
    <form className="space-y-3 border-t border-[var(--ws-line)] pt-5" onSubmit={(event) => { event.preventDefault(); void run(async () => { await api.acceptInvitation(invitation); }); }}><h2 className="font-semibold">Join with an invitation</h2><label className="block text-xs">Invitation token<input required minLength={32} maxLength={128} autoComplete="off" value={invitation} onChange={(event) => setInvitation(event.target.value)} className={`${field} mt-1`} /></label><button className="rounded-md border border-[var(--ws-line)] px-3.5 py-2 text-sm font-semibold" disabled={busy}>{busy ? 'Checking invitation…' : 'Accept invitation'}</button></form>
    {error && <div role="alert" className="text-sm text-[var(--ws-danger)]">{error}</div>}
  </section></main>;
}

function AccountSettings({ identity, memberships, authority, canInvite, onJoin, api }: { identity: MeResponse | null; memberships: MembershipResponse[]; authority: string; canInvite: boolean; onJoin: () => void; api: WattScapeBackendClient }) {
  const accountUrl = authority ? `${authority.replace(/\/$/, '')}/account` : '';
  return <section className={`${panel} grid gap-5 p-5 lg:grid-cols-2`} aria-label="Account settings">
    <div><h2 className="font-semibold">Account</h2><dl className="mt-3 space-y-2 text-sm"><div><dt className="inline text-[var(--ws-text-muted)]">Name: </dt><dd className="inline">{identity?.displayName || 'Not provided'}</dd></div><div><dt className="inline text-[var(--ws-text-muted)]">Email: </dt><dd className="inline">{identity?.email || 'Not provided'} · {identity?.emailVerified ? 'Verified' : 'Not verified'}</dd></div><div><dt className="inline text-[var(--ws-text-muted)]">Active organization: </dt><dd className="inline">{memberships.find((item)=>item.organizationId===identity?.organizationId)?.organizationName ?? 'Selected above'}</dd></div></dl>{accountUrl && <a className="mt-4 inline-block text-sm font-medium text-[var(--ws-brand-teal)] underline" href={accountUrl} target="_blank" rel="noopener noreferrer">Manage profile, password, and linked identity providers in Keycloak</a>}</div>
    <div><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Organization memberships</h2><button className="rounded border border-[var(--ws-line)] px-3 py-1.5 text-xs" onClick={onJoin}>Join organization</button></div><ul className="mt-3 space-y-2">{memberships.map((item)=><li key={item.organizationId} className="flex flex-wrap justify-between gap-2 rounded border border-[var(--ws-line)] p-3 text-sm"><span>{item.organizationName}</span><span className="text-[var(--ws-text-muted)]">{item.role} · {item.status}</span></li>)}</ul>{canInvite && <InvitationCreate api={api} />}</div>
  </section>;
}

function InvitationCreate({ api }: { api: WattScapeBackendClient }) {
  const [email,setEmail]=useState(''); const [role,setRole]=useState('Facilities Operator'); const [status,setStatus]=useState(''); const [busy,setBusy]=useState(false);
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();setBusy(true);setStatus('');try{const delivery=await api.createInvitation({email,role});setStatus(`Invitation created for ${delivery.email}. Email dispatch is scheduled after the database commit; delivery can still fail. The invitation expires ${new Date(delivery.expiresAt).toLocaleString()}.`);setEmail('');}catch(cause){setStatus(errorText(cause));}finally{setBusy(false);}};
  return <form onSubmit={(event)=>void submit(event)} className="mt-4 space-y-2 border-t border-[var(--ws-line)] pt-4"><h3 className="text-sm font-semibold">Invite a verified user</h3><div className="flex flex-wrap gap-2"><input type="email" required maxLength={320} autoComplete="email" value={email} onChange={(event)=>setEmail(event.target.value)} className={`${field} min-w-48 flex-1`} placeholder="name@organization.com" aria-label="Invite email"/><select value={role} onChange={(event)=>setRole(event.target.value)} className={field} aria-label="Invitation role">{['Facilities Operator','Energy/Sustainability Analyst','Technician','Auditor/Read Only'].map((item)=><option key={item}>{item}</option>)}</select><button className={action} disabled={busy}>{busy?'Sending…':'Send invite'}</button></div>{status&&<p role="status" className="text-xs text-[var(--ws-text-secondary)]">{status}</p>}</form>;
}

function InvitationAccept({ api, onAccepted }: { api: WattScapeBackendClient; onAccepted: () => void }) {
  const [token,setToken]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();setBusy(true);setError('');try{await api.acceptInvitation(token);onAccepted();}catch(cause){setError(errorText(cause));}finally{setBusy(false);}};
  return <section className={`${panel} p-5`}><form onSubmit={(event)=>void submit(event)} className="space-y-3"><h2 className="font-semibold">Join an organization</h2><p className="text-sm text-[var(--ws-text-secondary)]">Enter the single-use code sent to your verified email. The API verifies the organization and membership.</p><input required minLength={32} maxLength={128} autoComplete="off" value={token} onChange={(event)=>setToken(event.target.value)} className={field} aria-label="Invitation code"/><button className={action} disabled={busy}>{busy?'Checking…':'Accept invitation'}</button>{error&&<p role="alert" className="text-sm text-[var(--ws-danger)]">{error}</p>}</form></section>;
}

function LiveSiteList({ sites, selectedId, onSelect, onCreate, canWrite }: { sites: SiteResponse[]; selectedId: string; onSelect: (id: string) => void; onCreate: () => void; canWrite: boolean }) {
  return <section className={`${panel} overflow-hidden`}><div className="flex items-center justify-between gap-3 border-b border-[var(--ws-line)] p-4"><div><h2 className="font-semibold">Live sites</h2><p className="text-xs text-[var(--ws-text-secondary)]">{sites.length} record(s) returned by GET /api/v1/sites</p></div>{canWrite && <button className={action} onClick={onCreate}>Create site</button>}</div>{sites.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-[var(--ws-text-muted)]"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Region</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Area</th></tr></thead><tbody>{sites.map((site) => <tr key={site.id} className="cursor-pointer border-t border-[var(--ws-line)] hover:bg-[var(--ws-surface-2)]" onClick={() => onSelect(site.id)} aria-selected={site.id === selectedId}><td className="px-4 py-3 font-medium">{site.name}</td><td className="px-4 py-3 font-mono text-xs">{site.code}</td><td className="px-4 py-3">{site.regionTag || '—'}</td><td className="px-4 py-3 capitalize">{site.status.replaceAll('_', ' ')}</td><td className="px-4 py-3">{site.areaSqm == null ? '—' : `${site.areaSqm} m²`}</td></tr>)}</tbody></table></div> : <div className="p-6 text-sm text-[var(--ws-text-secondary)]">No live site records were returned.</div>}</section>;
}

function LiveTwin({ twin, loading }: { twin: TwinResponse | null; loading: boolean }) {
  if (loading || !twin) return <LoadingPanel text={loading ? 'Loading API twin structure…' : 'Select a site to load its API twin.'} />;
  return <section className="space-y-4"><div className={`${panel} p-5`}><h2 className="text-lg font-semibold">{twin.site.name} · twin structure</h2><p className="mt-1 text-sm text-[var(--ws-text-secondary)]">This view returns the persisted hierarchy and twin graph. Use Phase 4 Operations for versioned room/asset geometry, device telemetry, work orders, analytics, and AI insights.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Buildings', twin.buildings.length], ['Floors', twin.floors.length], ['Rooms', twin.rooms.length], ['Assets', twin.assets.length]].map(([label, value]) => <div key={label} className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-3"><div className="text-xs text-[var(--ws-text-muted)]">{label}</div><div className="mt-1 text-2xl font-semibold">{value}</div></div>)}</div></div><div className={`${panel} p-5`}><h3 className="font-semibold">Buildings and floors</h3>{twin.buildings.length ? <div className="mt-3 space-y-3">{twin.buildings.map((building) => <div key={building.id} className="rounded border border-[var(--ws-line)] p-3"><div className="font-medium">{building.name} <span className="font-mono text-xs text-[var(--ws-text-muted)]">{building.code}</span></div><div className="mt-2 flex flex-wrap gap-2">{twin.floors.filter((floor) => floor.buildingId === building.id).map((floor) => <span key={floor.id} className="rounded bg-[var(--ws-surface-2)] px-2.5 py-1 text-xs">Level {floor.level} · {floor.name} · {floor.id}</span>)}</div></div>)}</div> : <EmptyData text="No building records returned for this site." />}</div><div className={`${panel} p-5`}><h3 className="font-semibold">Twin graph</h3><p className="mt-1 text-xs text-[var(--ws-text-secondary)]">{twin.nodes.length} nodes · {twin.edges.length} edges</p>{twin.nodes.length ? <ul className="mt-3 grid gap-2 sm:grid-cols-2">{twin.nodes.map((node) => <li key={node.id} className="rounded border border-[var(--ws-line)] p-3 text-sm"><span className="mr-2 rounded bg-[var(--ws-surface-2)] px-1.5 py-0.5 text-xs">{node.kind}</span>{node.name}<div className="mt-1 truncate font-mono text-[10px] text-[var(--ws-text-muted)]">{node.sourceId}</div></li>)}</ul> : <EmptyData text="No twin nodes returned." />}</div></section>;
}

function LiveRooms({ rooms, twin, loading, canWrite, onCreate }: { rooms: RoomResponse[]; twin: TwinResponse | null; loading: boolean; canWrite: boolean; onCreate: () => void }) {
  return <section className={`${panel} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--ws-line)] p-4"><div><h2 className="font-semibold">Live rooms</h2><p className="text-xs text-[var(--ws-text-secondary)]">Rooms returned by the selected site endpoint.</p></div>{canWrite && <button className={action} disabled={!twin?.floors.length} onClick={onCreate}>Create room</button>}</div>{loading ? <LoadingPanel text="Loading rooms…" /> : rooms.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-[var(--ws-text-muted)]"><tr><th className="px-4 py-3">Room</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Floor</th><th className="px-4 py-3">Zone</th><th className="px-4 py-3">Area</th><th className="px-4 py-3">Model state</th></tr></thead><tbody>{rooms.map((room) => <tr key={room.id} className="border-t border-[var(--ws-line)]"><td className="px-4 py-3 font-medium">{room.name}</td><td className="px-4 py-3 font-mono text-xs">{room.code}</td><td className="px-4 py-3">{twin?.floors.find((floor) => floor.id === room.floorId)?.name ?? room.floorId}</td><td className="px-4 py-3 capitalize">{room.zoneType}</td><td className="px-4 py-3">{room.areaSqm} m²</td><td className="px-4 py-3">{room.modelState}</td></tr>)}</tbody></table></div> : <EmptyData text="No live rooms returned for this site." />}</section>;
}

function LiveAssets({ assets, twin, loading, canWrite, onCreate }: { assets: AssetResponse[]; twin: TwinResponse | null; loading: boolean; canWrite: boolean; onCreate: () => void }) {
  return <section className={`${panel} overflow-hidden`}><div className="flex items-center justify-between border-b border-[var(--ws-line)] p-4"><div><h2 className="font-semibold">Live assets</h2><p className="text-xs text-[var(--ws-text-secondary)]">Asset records returned by the selected site endpoint.</p></div>{canWrite && <button className={action} disabled={!twin?.floors.length} onClick={onCreate}>Create asset</button>}</div>{loading ? <LoadingPanel text="Loading assets…" /> : assets.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-[var(--ws-text-muted)]"><tr><th className="px-4 py-3">Asset</th><th className="px-4 py-3">Class</th><th className="px-4 py-3">Source ID</th><th className="px-4 py-3">Room</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Criticality</th></tr></thead><tbody>{assets.map((asset) => <tr key={asset.id} className="border-t border-[var(--ws-line)]"><td className="px-4 py-3 font-medium">{asset.name}</td><td className="px-4 py-3">{asset.assetClass}</td><td className="px-4 py-3 font-mono text-xs">{asset.sourceId}</td><td className="px-4 py-3">{asset.roomId ? twin?.rooms.find((room) => room.id === asset.roomId)?.name ?? asset.roomId : 'Unlocated'}</td><td className="px-4 py-3 capitalize">{asset.status}</td><td className="px-4 py-3 capitalize">{asset.criticality}</td></tr>)}</tbody></table></div> : <EmptyData text="No live assets returned for this site." />}</section>;
}

function LoadingPanel({ text }: { text: string }) { return <div className={`${panel} p-6 text-sm text-[var(--ws-text-secondary)]`} role="status">{text}</div>; }
function EmptyData({ text }: { text: string }) { return <div className="p-6 text-sm text-[var(--ws-text-secondary)]">{text}</div>; }
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const firstControl = dialog?.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    firstControl?.focus();
    return () => previouslyFocused?.focus();
  }, []);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])];
    if (!controls.length) { event.preventDefault(); return; }
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} onKeyDown={handleKeyDown} className={`${panel} max-h-[90vh] w-full max-w-xl overflow-y-auto p-5`}><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button className="rounded border border-[var(--ws-line)] px-2 py-1 text-sm" onClick={onClose}>Close</button></div>{children}</section></div>;
}

function SiteForm({ api, onSaved, onError }: { api: WattScapeBackendClient; onSaved: (site: SiteResponse) => void; onError: (cause: unknown) => void }) {
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const site = await api.createSite({ name: String(form.get('name')), code: String(form.get('code')), timeZone: String(form.get('timeZone')), ...(form.get('regionTag') ? { regionTag: String(form.get('regionTag')) } : {}), ...(form.get('areaSqm') ? { areaSqm: Number(form.get('areaSqm')) } : {}), initialBuildingName: String(form.get('buildingName')) });
      onSaved(site);
    } catch (cause) { onError(cause); } finally { setSaving(false); }
  };
  return <form className="space-y-3" onSubmit={(event) => void submit(event)}><label className="block text-xs">Site name<input required maxLength={160} name="name" className={field} /></label><label className="block text-xs">Site code<input required pattern="[A-Za-z0-9_-]{2,32}" name="code" className={field} /></label><label className="block text-xs">Time zone<input required maxLength={80} name="timeZone" defaultValue="UTC" className={field} /></label><label className="block text-xs">Region tag<input maxLength={80} name="regionTag" className={field} /></label><label className="block text-xs">Area (m²)<input type="number" min="0.01" max="100000000" step="any" name="areaSqm" className={field} /></label><label className="block text-xs">Initial building name<input maxLength={160} name="buildingName" className={field} /></label><p className="text-xs text-[var(--ws-text-muted)]">The API creates the initial building and ground floor together with this site.</p><button disabled={saving} className={action}>{saving ? 'Saving…' : 'Create site'}</button></form>;
}

function RoomForm({ api, siteId, floors, onSaved, onError }: { api: WattScapeBackendClient; siteId: string; floors: TwinResponse['floors']; onSaved: () => void; onError: (cause: unknown) => void }) {
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget); try { await api.createRoom(siteId, { floorId: String(form.get('floorId')), code: String(form.get('code')), name: String(form.get('name')), zoneType: String(form.get('zoneType')), areaSqm: Number(form.get('areaSqm')) }); onSaved(); } catch (cause) { onError(cause); } finally { setSaving(false); } };
  return <form className="space-y-3" onSubmit={(event) => void submit(event)}><label className="block text-xs">Floor<select name="floorId" required className={field}>{floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name} · level {floor.level}</option>)}</select></label><label className="block text-xs">Room name<input required maxLength={160} name="name" className={field} /></label><label className="block text-xs">Code<input required maxLength={32} name="code" className={field} /></label><label className="block text-xs">Zone type<select name="zoneType" className={field}>{['office','lab','plant','lobby','storage','server','corridor'].map((zone) => <option key={zone}>{zone}</option>)}</select></label><label className="block text-xs">Area (m²)<input required type="number" min="0.01" max="10000" step="any" name="areaSqm" className={field} /></label><button disabled={saving} className={action}>{saving ? 'Saving…' : 'Create room'}</button></form>;
}

function AssetForm({ api, siteId, floors, rooms, onSaved, onError }: { api: WattScapeBackendClient; siteId: string; floors: TwinResponse['floors']; rooms: RoomResponse[]; onSaved: () => void; onError: (cause: unknown) => void }) {
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); const form = new FormData(event.currentTarget); try { const roomId = String(form.get('roomId') || ''); await api.createAsset(siteId, { floorId: String(form.get('floorId')), ...(roomId ? { roomId } : {}), assetClass: String(form.get('assetClass')), name: String(form.get('name')), sourceId: String(form.get('sourceId')), ...(form.get('systemName') ? { systemName: String(form.get('systemName')) } : {}) }); onSaved(); } catch (cause) { onError(cause); } finally { setSaving(false); } };
  return <form className="space-y-3" onSubmit={(event) => void submit(event)}><label className="block text-xs">Floor<select name="floorId" required className={field}>{floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name} · level {floor.level}</option>)}</select></label><label className="block text-xs">Room (optional)<select name="roomId" className={field}><option value="">Unlocated on floor</option>{rooms.map((room) => <option key={room.id} value={room.id}>{room.code} · {room.name}</option>)}</select></label><label className="block text-xs">Asset name<input required maxLength={160} name="name" className={field} /></label><label className="block text-xs">Asset class<select name="assetClass" className={field}>{['Chiller','AHU','Boiler','Switchgear','Pump','SolarInverter','Submeter','CoolingTower','PVArray'].map((kind) => <option key={kind}>{kind}</option>)}</select></label><label className="block text-xs">Source ID<input required maxLength={120} name="sourceId" className={field} /></label><label className="block text-xs">System name<input maxLength={120} name="systemName" className={field} /></label><button disabled={saving} className={action}>{saving ? 'Saving…' : 'Create asset'}</button></form>;
}
