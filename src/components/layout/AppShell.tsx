import React, { useMemo, useState } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Building2,
  Compass,
  Cpu,
  Layers,
  Menu,
  MessageSquare,
  Moon,
  PenTool,
  Plug,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Sun,
  Wrench,
  X,
  Leaf,
} from 'lucide-react';
import { useWattScape } from '../../context/WattScapeContext';
import type { NavGroupId, ScreenId } from '../../domain/types';

interface NavEntry {
  id: ScreenId;
  label: string;
  group: NavGroupId;
  Icon: React.ComponentType<{ className?: string }>;
}

const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'twin', label: 'Twin' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'work', label: 'Work' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'connect', label: 'Connect' },
  { id: 'admin', label: 'Admin' },
];

const NAV_ITEMS: NavEntry[] = [
  { id: 'portfolio-overview', label: 'Global Overview', group: 'portfolio', Icon: Compass },
  { id: 'workspace', label: 'Org Workspace', group: 'portfolio', Icon: Building2 },
  { id: 'twin-viewer', label: 'Building 3D Twin', group: 'twin', Icon: Layers },
  { id: 'twin-editor', label: '3D Building Editor', group: 'twin', Icon: PenTool },
  { id: 'floor-explorer', label: 'Floor & Room Explorer', group: 'twin', Icon: Building2 },
  { id: 'assets', label: 'Asset Management', group: 'twin', Icon: Cpu },
  { id: 'monitoring', label: 'Multi-Resource Monitor', group: 'monitor', Icon: Activity },
  { id: 'data-quality', label: 'Data Quality Center', group: 'monitor', Icon: ShieldAlert },
  { id: 'maintenance', label: 'Maintenance Center', group: 'work', Icon: Wrench },
  { id: 'collaboration', label: 'Collaboration Center', group: 'work', Icon: MessageSquare },
  { id: 'analytics', label: 'Analytics & Reporting', group: 'analyze', Icon: BarChart3 },
  { id: 'ai-intelligence', label: 'AI Intelligence', group: 'analyze', Icon: Sparkles },
  { id: 'simulation', label: 'Simulation Lab', group: 'analyze', Icon: Sliders },
  { id: 'sustainability', label: 'Sustainability Center', group: 'analyze', Icon: Leaf },
  { id: 'impact-ledger', label: 'Verified Impact Ledger', group: 'analyze', Icon: Award },
  { id: 'integrations', label: 'Integration Hub', group: 'connect', Icon: Plug },
  { id: 'automation', label: 'AI Automation Studio', group: 'connect', Icon: Activity },
  { id: 'security', label: 'Security & Governance', group: 'admin', Icon: Shield },
  { id: 'settings', label: 'Settings', group: 'admin', Icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    screen,
    setScreen,
    theme,
    toggleTheme,
    sites,
    activeSiteId,
    setActiveSiteId,
    rooms,
    assets,
    issues,
    focusRoomIn3D,
    focusAssetIn3D,
    notifications,
    markAllNotificationsRead,
    globalSearchQuery,
    setGlobalSearchQuery,
    authenticatedUser,
  } = useWattScape();

  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const searchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: { id: string; type: string; label: string; onSelect: () => void }[] = [];

    rooms.forEach((r) => {
      if (r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)) {
        results.push({
          id: r.id,
          type: 'Space',
          label: `${r.code} · ${r.name}`,
          onSelect: () => {
            focusRoomIn3D(r.id);
            setGlobalSearchQuery('');
          },
        });
      }
    });
    assets.forEach((a) => {
      if (a.name.toLowerCase().includes(q) || a.sourceId.toLowerCase().includes(q)) {
        results.push({
          id: a.id,
          type: 'Asset',
          label: `${a.name} (${a.assetClass})`,
          onSelect: () => {
            focusAssetIn3D(a.id);
            setGlobalSearchQuery('');
          },
        });
      }
    });
    issues.forEach((iss) => {
      if (iss.title.toLowerCase().includes(q)) {
        results.push({
          id: iss.id,
          type: 'Issue',
          label: iss.title,
          onSelect: () => {
            setScreen('maintenance');
            setGlobalSearchQuery('');
          },
        });
      }
    });
    return results.slice(0, 6);
  }, [globalSearchQuery, rooms, assets, issues, focusRoomIn3D, focusAssetIn3D, setScreen, setGlobalSearchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--ws-canvas)] text-[var(--ws-text-primary)]">
      {/* 64px Top Bar */}
      <header className="h-16 shrink-0 border-b border-[var(--ws-line)] bg-[var(--ws-surface-1)] px-4 flex items-center justify-between gap-4 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label="Toggle navigation drawer"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden p-2 rounded border border-[var(--ws-line)] text-[var(--ws-text-primary)]"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setScreen('landing')}
            className="inline-flex items-center gap-2 text-base font-display font-bold tracking-tight text-[var(--ws-text-primary)] whitespace-nowrap shrink-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <polygon points="12,2 21,7 12,12 3,7" stroke="var(--ws-brand-teal)" strokeWidth="1.8" fill="var(--ws-surface-3)" />
              <polyline points="3,12 12,17 21,12" stroke="var(--ws-water)" strokeWidth="1.8" fill="none" />
              <polyline points="3,17 12,22 21,17" stroke="var(--ws-energy)" strokeWidth="1.8" fill="none" />
            </svg>
            <span>WattScape</span>
          </button>

          <span className="hidden sm:inline text-[var(--ws-line)]" aria-hidden="true">
            |
          </span>

          <select
            aria-label="Active Site Selector"
            value={activeSiteId}
            onChange={(e) => setActiveSiteId(e.target.value)}
            className="hidden sm:block max-w-[200px] truncate rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--ws-text-primary)]"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
          <span className="hidden md:inline rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-amber-700 dark:text-amber-300">DEMO MODE · SYNTHETIC</span>
        </div>

        {/* Global Search */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ws-text-muted)]" />
          <input
            aria-label="Global twin search"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder="Search rooms, equipment, issues..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)]"
          />
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] shadow-lg z-40 divide-y divide-[var(--ws-line)]">
              {searchResults.map((res) => (
                <button
                  key={res.id}
                  type="button"
                  onClick={res.onSelect}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--ws-surface-2)] flex items-center justify-between gap-2"
                >
                  <span className="truncate font-medium">{res.label}</span>
                  <span className="font-mono-tabular text-[var(--ws-text-muted)] shrink-0">
                    {res.type}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button
              type="button"
              aria-label={`Notifications (${unreadCount} unread)`}
              onClick={() => setNotifOpen((v) => !v)}
              className="relative p-2 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)] hover:bg-[var(--ws-surface-3)]"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1 rounded bg-[var(--ws-danger)] text-white text-[10px] font-mono-tabular leading-tight">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-3 z-50 space-y-2 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Demo Notifications</span>
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="text-[var(--ws-brand-teal)] hover:underline"
                  >
                    Mark read
                  </button>
                </div>
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setScreen(n.targetScreen);
                      setNotifOpen(false);
                    }}
                    className="w-full text-left rounded bg-[var(--ws-surface-2)] p-2 text-xs hover:bg-[var(--ws-surface-3)]"
                  >
                    <div className="font-medium text-[var(--ws-text-primary)]">{n.title}</div>
                    <div className="text-[var(--ws-text-secondary)] mt-0.5">{n.detail}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
            className="p-2 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)] hover:bg-[var(--ws-surface-3)]"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setScreen('auth')}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] hover:bg-[var(--ws-surface-3)] whitespace-nowrap"
          >
            <span>{authenticatedUser?.name ?? 'Sign In'}</span>
          </button>
        </div>
      </header>

      {/* Body with Collapsible Rail + Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop Navigation Rail */}
        <aside
          aria-label="Primary Platform Navigation"
          className={`hidden lg:flex flex-col shrink-0 border-r border-[var(--ws-line)] bg-[var(--ws-surface-1)] transition-all ${
            railCollapsed ? 'w-16' : 'w-60'
          }`}
        >
          <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
            {NAV_GROUPS.map((grp) => {
              const items = NAV_ITEMS.filter((i) => i.group === grp.id);
              return (
                <div key={grp.id}>
                  {!railCollapsed && (
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-[var(--ws-text-muted)]">
                      {grp.label}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.Icon;
                      const active = screen === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          title={item.label}
                          aria-label={item.label}
                          onClick={() => setScreen(item.id)}
                          className={`relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-[var(--ws-surface-3)] text-[var(--ws-brand-teal)] shadow-[var(--ws-shadow-sm)]'
                              : 'text-[var(--ws-text-secondary)] hover:bg-[var(--ws-surface-2)] hover:text-[var(--ws-text-primary)]'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {!railCollapsed && <span className="truncate">{item.label}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-[var(--ws-line)]">
            <button
              type="button"
              onClick={() => setRailCollapsed((v) => !v)}
              className="w-full py-1.5 text-xs text-[var(--ws-text-secondary)] hover:text-[var(--ws-text-primary)] rounded hover:bg-[var(--ws-surface-2)]"
            >
              {railCollapsed ? 'Expand' : 'Collapse Rail'}
            </button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 top-16 z-40 bg-[var(--ws-surface-1)] overflow-y-auto p-4 space-y-4">
            {NAV_GROUPS.map((grp) => {
              const items = NAV_ITEMS.filter((i) => i.group === grp.id);
              return (
                <div key={grp.id}>
                  <div className="px-2 py-1 text-xs font-semibold text-[var(--ws-text-muted)]">
                    {grp.label}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {items.map((item) => {
                      const Icon = item.Icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setScreen(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded border text-xs font-medium text-left ${
                            screen === item.id
                              ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)] text-[var(--ws-brand-teal)]'
                              : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)]'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
