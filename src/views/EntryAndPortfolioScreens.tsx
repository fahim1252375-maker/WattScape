import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Droplets,
  Mail,
  Menu,
  Moon,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { useWattScape } from '../context/WattScapeContext';
import { useAppMode } from '../context/AppModeContext';
import { useAuth } from '../auth/AuthProvider';
import {
  MetricCard,
  Panel,
  SectionHeader,
  SyntheticDemoBanner,
  TrustLabel,
} from '../components/ui/Primitives';
import {
  ClosedLoop3DVisual,
  EvidenceFirst3DVisual,
  Interactive3DLoopCard,
  Interactive3DSystemCard,
  SpatialEntry3DVisual,
  SystemCardVisual,
  type SystemVisualKind,
} from '../components/landing/LandingVisuals';
import { validateEmailInvite } from '../domain/validation';
import type { OrgMember, ScreenId } from '../domain/types';

const CURRENT_YEAR = new Date().getFullYear();

const LazyBuildingTwin3D = lazy(() =>
  import('../components/twin/BuildingTwin3D').then((m) => ({
    default: m.BuildingTwin3D,
  })),
);

/* ============================================================================
 * 1. LANDING PAGE (MIDNIGHT RESOURCE INTELLIGENCE)
 * ============================================================================ */
export function LandingScreen() {
  const {
    setScreen,
    openSpatialGraphIn3D,
    theme,
    toggleTheme,
    sites,
    rooms,
    assets,
    impactLedger,
    twinEdges,
    twin3d,
    selectedRoomId,
    setSelectedRoomId,
    selectedAssetId,
    setSelectedAssetId,
  } = useWattScape();

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const heroSite = sites[0];
  const heroRooms = rooms.filter((r) => r.siteId === 'site_meridian_north');
  const heroAssets = assets.filter((a) => a.siteId === 'site_meridian_north');
  const activeRoom = heroRooms.find((r) => r.id === selectedRoomId) ?? heroRooms[0];
  const hasVerifiedImpactRecord = impactLedger.some((r) => r.classification === 'verified');

  const systemsList: {
    num: string;
    title: string;
    category: string;
    desc: string;
    kind: SystemVisualKind;
    accent: string;
    onOpen: () => void;
  }[] = [
    {
      num: '01',
      title: 'Zero-BIM Resource Twin Creator',
      category: 'Spatial Modeling',
      desc: 'Start from floor plans, room CSVs, and asset lists with explicit confidence labels — enrich with IFC/BIM later without overwriting manual edits.',
      kind: 'twin',
      accent: 'var(--ws-brand-teal)',
      onOpen: () => setScreen('twin-editor'),
    },
    {
      num: '02',
      title: 'Unified Spatial Resource Graph',
      category: 'Spatial Topology',
      desc: 'Tenant-scoped graph joining spaces, equipment, meters, readings, issues, and verified proof with strict cross-tenant isolation.',
      kind: 'graph',
      accent: 'var(--ws-water)',
      onOpen: () => openSpatialGraphIn3D(),
    },
    {
      num: '03',
      title: 'Data Trust Engine',
      category: 'Quality & Provenance',
      desc: '5-dimension scoring with stale/suspect flags, human review queues, and weakest-input trust propagation across derived KPIs.',
      kind: 'trust',
      accent: 'var(--ws-brand-teal)',
      onOpen: () => setScreen('data-quality'),
    },
    {
      num: '04',
      title: 'Explainable Resource AI',
      category: 'Diagnostic Intelligence',
      desc: 'Source citations, counter-evidence, calibrated abstention on missing feeds, and approval-gated operational proposals.',
      kind: 'ai',
      accent: 'var(--ws-ai)',
      onOpen: () => setScreen('ai-intelligence'),
    },
    {
      num: '05',
      title: 'Resource Trade-off Simulator',
      category: 'Scenario Modeling',
      desc: 'Compare energy, water, carbon, cost, comfort, and resilience interventions side by side with explicit uncertainty ranges.',
      kind: 'sim',
      accent: 'var(--ws-energy)',
      onOpen: () => setScreen('simulation'),
    },
    {
      num: '06',
      title: 'Problem-to-Proof Engine',
      category: 'Operational Execution',
      desc: 'Auditable work lifecycle connecting candidate detection, triage, dispatch, baseline lock, and post-action M&V verification.',
      kind: 'proof',
      accent: 'var(--ws-energy)',
      onOpen: () => setScreen('maintenance'),
    },
    {
      num: '07',
      title: 'Operational Context Engine',
      category: 'Telemetry Analytics',
      desc: 'Distinguishes observed meter readings from calculated carbon factors and inferred occupancy or schedule context.',
      kind: 'context',
      accent: 'var(--ws-brand-blue)',
      onOpen: () => setScreen('analytics'),
    },
    {
      num: '08',
      title: 'Verified Impact Ledger',
      category: 'Auditable M&V',
      desc: 'Append-only hash-linked records strictly separating modeled forecasts from observed telemetry and reviewer-verified outcomes.',
      kind: 'ledger',
      accent: 'var(--ws-carbon)',
      onOpen: () => setScreen('impact-ledger'),
    },
  ];


  const creatorLinks = [
    {
      id: 'email',
      label: 'Email',
      display: 'support@wattscape.example',
      href: 'mailto:support@wattscape.example',
      ariaLabel: 'Email WattScape support',
      tooltip: 'Email WattScape support',
      external: false,
      Icon: Mail,
    },
  ] as const;

  const scrollToSection = (id: string) => {
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div id="top" className="min-h-screen bg-[var(--ws-canvas)] text-[var(--ws-text-primary)]">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--ws-line)] bg-[var(--ws-surface-1)]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('top');
            }}
            className="inline-flex items-center gap-2.5 text-lg font-display font-bold tracking-tight text-[var(--ws-text-primary)] whitespace-nowrap shrink-0"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <polygon
                points="12,2 21,7 12,12 3,7"
                stroke="var(--ws-brand-teal)"
                strokeWidth="1.8"
                fill="var(--ws-surface-3)"
              />
              <polyline points="3,12 12,17 21,12" stroke="var(--ws-water)" strokeWidth="1.8" fill="none" />
              <polyline points="3,17 12,22 21,17" stroke="var(--ws-energy)" strokeWidth="1.8" fill="none" />
            </svg>
            <span>WattScape</span>
          </a>

          <nav aria-label="Landing Navigation" className="hidden lg:flex items-center gap-6 text-xs font-medium text-[var(--ws-text-secondary)]">
            <a href="#capabilities" className="hover:text-[var(--ws-text-primary)] transition-colors whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]">
              Capabilities
            </a>
            <a href="#systems" className="hover:text-[var(--ws-text-primary)] transition-colors whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]">
              Core Systems
            </a>
            <a href="#how-it-works" className="hover:text-[var(--ws-text-primary)] transition-colors whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]">
              How It Works
            </a>
            <a href="#architecture" className="hover:text-[var(--ws-text-primary)] transition-colors whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]">
              Architecture
            </a>
            <a href="#contact" className="hover:text-[var(--ws-text-primary)] transition-colors whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]">
              Contact
            </a>
            <button
              type="button"
              onClick={() => setScreen('auth')}
              className="hover:text-[var(--ws-text-primary)] transition-colors whitespace-nowrap rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
            >
              Sign In
            </button>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggleTheme}
              className="p-2 rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-secondary)] hover:text-[var(--ws-text-primary)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setScreen('twin-viewer')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] hover:opacity-90 transition-opacity whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
            >
              <span>Explore 3D Twin</span>
            </button>
            <button
              type="button"
              aria-label="Toggle landing menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((v) => !v)}
              className="lg:hidden p-2 rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <div className="lg:hidden border-t border-[var(--ws-line)] bg-[var(--ws-surface-1)] px-4 py-3 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => scrollToSection('capabilities')} className="text-left px-3 py-2 rounded bg-[var(--ws-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--ws-brand-teal)]">
                Capabilities
              </button>
              <button type="button" onClick={() => scrollToSection('systems')} className="text-left px-3 py-2 rounded bg-[var(--ws-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--ws-brand-teal)]">
                Core Systems
              </button>
              <button type="button" onClick={() => scrollToSection('how-it-works')} className="text-left px-3 py-2 rounded bg-[var(--ws-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--ws-brand-teal)]">
                How It Works
              </button>
              <button type="button" onClick={() => scrollToSection('architecture')} className="text-left px-3 py-2 rounded bg-[var(--ws-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--ws-brand-teal)]">
                Architecture
              </button>
              <button type="button" onClick={() => scrollToSection('contact')} className="col-span-2 text-left px-3 py-2 rounded bg-[var(--ws-surface-2)] text-[var(--ws-brand-teal)] font-medium focus-visible:outline-2 focus-visible:outline-[var(--ws-brand-teal)]">
                Contact
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setScreen('auth')}
                className="flex-1 py-2 text-xs font-medium rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setScreen('twin-viewer')}
                className="flex-1 py-2 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
              >
                Explore 3D Twin
              </button>
            </div>
          </div>
        )}
      </header>

      {/* B. Hero Section with Live Interactive 3D Building Twin */}
      <section className="relative overflow-hidden border-b border-[var(--ws-line)] ws-blueprint-grid">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tabular font-medium text-[var(--ws-brand-teal)]">
              <span>MIDNIGHT RESOURCE INTELLIGENCE</span>
              <span className="text-[var(--ws-text-muted)]" aria-hidden="true">·</span>
              <span className="text-[var(--ws-text-secondary)]">Synthetic Demo Fixture</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight leading-[1.08] text-balance">
              Understand Every Resource. Improve Every Space.
            </h1>

            <p className="text-base text-[var(--ws-text-secondary)] leading-relaxed max-w-xl">
              Connect buildings, equipment, resource intelligence, and operational decisions through one interactive 3D resource twin.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setScreen('twin-viewer')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-md bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <span>Explore Interactive 3D Twin</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setScreen('portfolio-overview')}
                className="px-5 py-2.5 text-sm font-medium rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] text-[var(--ws-text-primary)] hover:bg-[var(--ws-surface-2)] transition-colors whitespace-nowrap"
              >
                Explore the Platform
              </button>
            </div>

            {/* Grounded Synthetic Fixture Telemetry Strip */}
            <div className="pt-4 border-t border-[var(--ws-line)] grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-[var(--ws-text-muted)]">Demo Campus</div>
                <div className="mt-0.5 font-mono-tabular font-semibold text-[var(--ws-text-primary)]">
                  {heroSite.summaryMetrics.electricityKwh24h.toLocaleString()} kWh/24h
                </div>
              </div>
              <div>
                <div className="text-[var(--ws-text-muted)]">Water Intake</div>
                <div className="mt-0.5 font-mono-tabular font-semibold text-[var(--ws-water)]">
                  {heroSite.summaryMetrics.waterLiters24h.toLocaleString()} L/24h
                </div>
              </div>
              <div>
                <div className="text-[var(--ws-text-muted)]">Data Trust</div>
                <div className="mt-0.5 font-mono-tabular font-semibold text-[var(--ws-brand-teal)]">
                  {heroSite.summaryMetrics.trustScore}/100 ({heroSite.summaryMetrics.coveragePct}%)
                </div>
              </div>
            </div>
          </div>

          {/* Right Live 3D Building Viewport + Floating Spatial Readouts */}
          <div className="lg:col-span-7 relative rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] shadow-[var(--ws-shadow-md)] overflow-hidden min-h-[380px] lg:min-h-[480px] flex flex-col">
            <div className="px-4 py-2.5 border-b border-[var(--ws-line)] flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ws-text-secondary)] bg-[var(--ws-surface-1)]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--ws-text-primary)]">{heroSite.name}</span>
                <span className="text-[var(--ws-text-muted)]" aria-hidden="true">·</span>
                <span>Interactive 3D Cutaway (Synthetic Demo)</span>
              </div>
              <span className="font-mono-tabular text-[var(--ws-text-muted)]">
                3 Floors · {heroRooms.length} Spaces · {heroAssets.length} Assets
              </span>
            </div>

            <div className="relative flex-1 min-h-[340px]">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full text-xs text-[var(--ws-text-secondary)]">
                    Initializing interactive 3D building scene...
                  </div>
                }
              >
                <LazyBuildingTwin3D
                  rooms={heroRooms}
                  assets={heroAssets}
                  edges={twinEdges}
                  twin3d={twin3d}
                  selectedRoomId={selectedRoomId}
                  selectedAssetId={selectedAssetId}
                  onSelectRoom={(id) => {
                    setSelectedAssetId(null);
                    setSelectedRoomId(id);
                  }}
                  onSelectAsset={(id) => setSelectedAssetId(id)}
                  theme={theme}
                  onFallbackTo2D={() => setScreen('twin-viewer')}
                />
              </Suspense>

              {/* Floating Spatial Intelligence Card (Bottom Left of 3D Hero) */}
              {activeRoom && (
                <div className="hidden sm:block absolute bottom-3 left-3 z-10 max-w-xs rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-3 text-xs shadow-[var(--ws-shadow-md)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono-tabular text-[var(--ws-brand-teal)] font-semibold">
                      {activeRoom.code}
                    </span>
                    <TrustLabel score={activeRoom.trustScore} qualityState={activeRoom.qualityState} />
                  </div>
                  <div className="mt-1 font-semibold text-[var(--ws-text-primary)]">
                    {activeRoom.name}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 font-mono-tabular text-[11px] text-[var(--ws-text-secondary)]">
                    <span className="inline-flex items-center gap-1 text-[var(--ws-energy)]">
                      <Zap className="w-3 h-3" />
                      {activeRoom.hourlyEnergyKwh[14] ?? 0} kWh
                    </span>
                    <span className="inline-flex items-center gap-1 text-[var(--ws-water)]">
                      <Droplets className="w-3 h-3" />
                      {activeRoom.hourlyWaterL[14] ?? 0} L/h
                    </span>
                  </div>
                </div>
              )}

              {/* Floating Flow Legend (Top Right of 3D Hero) */}
              <div className="absolute top-3 right-3 z-10 rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] px-3 py-1.5 text-[11px] text-[var(--ws-text-secondary)] flex items-center gap-3 shadow-[var(--ws-shadow-sm)]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--ws-energy)]" />
                  <span>Energy Flow</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--ws-water)]" />
                  <span>Water Flow</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* C. Product Introduction Pipeline */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-b border-[var(--ws-line)]">
        <div className="max-w-3xl mb-8">
          <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-brand-teal)]">
            UNIFIED OPERATIONAL ARCHITECTURE
          </div>
          <h2 className="mt-1.5 text-2xl sm:text-3xl font-display font-semibold tracking-tight">
            One Connected Chain from Physical Space to Verified Proof
          </h2>
          <p className="mt-2 text-sm text-[var(--ws-text-secondary)] leading-relaxed">
            Instead of keeping floor plans, BMS telemetry, data-quality flags, AI diagnostics, and project accounting in disconnected tools, WattScape binds them into a single tenant-scoped operational model.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {[
            ['01', 'Building', 'Site envelope & floors', 'var(--ws-brand-teal)'],
            ['02', 'Spaces', 'Rooms, zones & usage', 'var(--ws-brand-teal)'],
            ['03', 'Equipment', 'Plants, AHUs & PV', 'var(--ws-brand-blue)'],
            ['04', 'Meters', 'Submeters & feeds', 'var(--ws-water)'],
            ['05', 'Resource Data', '5D trust & lineage', 'var(--ws-energy)'],
            ['06', 'AI Insights', 'Cited & calibrated', 'var(--ws-ai)'],
            ['07', 'Actions', 'Approval-gated work', 'var(--ws-energy)'],
            ['08', 'Verified Impact', 'Audited M&V ledger', 'var(--ws-carbon)'],
          ].map(([num, label, sub, color]) => (
            <div
              key={num}
              className="rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-3 flex flex-col justify-between shadow-[var(--ws-shadow-sm)]"
            >
              <div className="text-[11px] font-mono-tabular font-semibold" style={{ color }}>
                {num}
              </div>
              <div className="mt-2">
                <div className="text-sm font-semibold text-[var(--ws-text-primary)]">{label}</div>
                <div className="mt-0.5 text-[11px] text-[var(--ws-text-muted)]">{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PHASE 4: Core Operational Loop — Three Interactive Animated 3D Cards */}
      <section id="capabilities" className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 py-14 border-b border-[var(--ws-line)]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-brand-teal)]">
              INTERACTIVE WORKFLOW ENTRY
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-display font-semibold tracking-tight">
              Core Operational Loop
            </h2>
            <p className="mt-1.5 text-sm text-[var(--ws-text-secondary)] max-w-2xl">
              Select any interactive 3D stage below to jump directly into Twin Authoring, Data Trust Review, or the Verified Impact Ledger.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Interactive3DLoopCard
            stepLabel="01. Spatial Entry"
            title="Zero-BIM Twin Creation"
            description="Build an editable 3D model from room lists, floor-plan SVGs, and guided dimensions. Enrich with IFC/BIM later without overwriting manual edits."
            ctaLabel="Explore workflow · 3D Building Editor"
            accentColor="var(--ws-brand-teal)"
            onActivate={() => setScreen('twin-editor')}
          >
            {(hovered) => <SpatialEntry3DVisual hovered={hovered} />}
          </Interactive3DLoopCard>

          <Interactive3DLoopCard
            stepLabel="02. Evidence First"
            title="Data Trust & Explainable AI"
            description="Every reading displays its source, transformation, and 5-dimension trust breakdown. AI recommendations cite evidence windows and abstain when data is missing."
            ctaLabel="Explore workflow · Data Quality Center"
            accentColor="var(--ws-water)"
            onActivate={() => setScreen('data-quality')}
          >
            {(hovered) => <EvidenceFirst3DVisual hovered={hovered} />}
          </Interactive3DLoopCard>

          <Interactive3DLoopCard
            stepLabel="03. Closed Loop"
            title="Problem-to-Proof Ledger"
            description="Model multi-resource trade-offs, dispatch approval-gated work orders, and track modeled versus observed and reviewer-verified outcomes."
            ctaLabel="Explore workflow · Verified Impact Ledger"
            accentColor="var(--ws-carbon)"
            onActivate={() => setScreen('impact-ledger')}
          >
            {(hovered) => <ClosedLoop3DVisual hovered={hovered} />}
          </Interactive3DLoopCard>
        </div>
      </section>

      {/* D. How WattScape Works (7-Step Journey) */}
      <section id="how-it-works" className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 py-14 border-b border-[var(--ws-line)]">
        <div className="mb-8">
          <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-water)]">
            OPERATOR LIFECYCLE
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-display font-semibold tracking-tight">
            How WattScape Works
          </h2>
          <p className="mt-1.5 text-sm text-[var(--ws-text-secondary)] max-w-2xl">
            Seven sequential stages from rapid spatial setup to auditable post-intervention measurement.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {[
            ['01', 'Create a spatial twin', 'Import room CSVs or draw floors without waiting on BIM.', 'twin-editor'],
            ['02', 'Connect resource data', 'Map meters, submeters, and synthetic demo feeds to spaces.', 'integrations'],
            ['03', 'Validate data quality', 'Score completeness, freshness, and flag suspect registers.', 'data-quality'],
            ['04', 'Investigate problems', 'Inspect 3D heatmaps, flow conduits, and cited AI hypotheses.', 'twin-viewer'],
            ['05', 'Simulate improvements', 'Model trade-offs across energy, water, carbon, and comfort.', 'simulation'],
            ['06', 'Approve actions', 'Dispatch work orders or hold control proposals for human sign-off.', 'automation'],
            ['07', 'Measure & verify', 'Compare modeled vs observed deltas for reviewer certification.', 'impact-ledger'],
          ].map(([step, title, detail, target]) => (
            <button
              key={step}
              type="button"
              onClick={() => setScreen(target as ScreenId)}
              className="group text-left rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-4 hover:border-[var(--ws-brand-teal)] hover:bg-[var(--ws-surface-2)] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-brand-teal)]">
                  Step {step}
                </div>
                <div className="mt-1.5 text-sm font-semibold text-[var(--ws-text-primary)] group-hover:text-[var(--ws-brand-teal)]">
                  {title}
                </div>
                <p className="mt-1.5 text-xs text-[var(--ws-text-secondary)] leading-relaxed">
                  {detail}
                </p>
              </div>
              <div className="mt-3 text-[11px] font-mono-tabular text-[var(--ws-text-muted)] group-hover:text-[var(--ws-brand-teal)]">
                Open module -&gt;
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* PHASES 5 & 6: Eight Core Architectural Systems (Visually Distinct + Full Navigation) */}
      <section id="systems" className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 py-14 border-b border-[var(--ws-line)]">
        <div className="mb-8">
          <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-ai)]">
            PLATFORM SUBSYSTEMS · CLICK TO EXPLORE
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-display font-semibold tracking-tight">
            Eight Core Architectural Systems
          </h2>
          <p className="mt-1.5 text-sm text-[var(--ws-text-secondary)] max-w-3xl">
            Product differentiation systems structured for operator validation alongside established market capabilities. Select any card to launch its dedicated screen.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemsList.map((sys) => (
            <Interactive3DSystemCard
              key={sys.num}
              num={sys.num}
              category={sys.category}
              title={sys.title}
              description={sys.desc}
              accentColor={sys.accent}
              onActivate={sys.onOpen}
            >
              <SystemCardVisual kind={sys.kind} ledgerVerified={hasVerifiedImpactRecord} />
            </Interactive3DSystemCard>
          ))}
        </div>
      </section>

      {/* PHASE 7: Resource Intelligence + Spatial Showcase + Evidence & Transparency */}
      <section id="architecture" className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-14 border-b border-[var(--ws-line)]">
        {/* Resource Intelligence (9 categories with honest status framing) */}
        <div>
          <div className="mb-6">
            <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-energy)]">
              MULTI-RESOURCE COVERAGE
            </div>
            <h2 className="mt-1 text-2xl font-display font-semibold tracking-tight">
              Resource Intelligence Across Utilities & Distributed Assets
            </h2>
            <p className="mt-1 text-sm text-[var(--ws-text-secondary)]">
              Active synthetic demo coverage is clearly distinguished from planned roadmap connector expansions.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {[
              ['Electricity', 'Active in Demo Fixture', 'Main switchgear, chillers, cleanroom VAV submeters', 'var(--ws-energy)'],
              ['Water', 'Active in Demo Fixture', 'Potable & DI booster skids with overnight flow checks', 'var(--ws-water)'],
              ['Heating & Cooling', 'Active in Demo Fixture', 'Chiller plant COP, condensing boiler, thermal zones', 'var(--ws-brand-blue)'],
              ['Waste', 'Active in Demo Fixture', 'Lab plastics & organics diversion rate tracking', 'var(--ws-waste)'],
              ['Carbon', 'Active in Demo Fixture', 'Versioned EPA eGRID CAMX Scope 1 & 2 accounting', 'var(--ws-carbon)'],
              ['Renewable Energy', 'Active in Demo Fixture', 'Rooftop 120 kWp bifacial PV generation telemetry', 'var(--ws-brand-teal)'],
              ['Gas', 'Planned Expansion', 'Utility gas meter integration adapter roadmap', 'var(--ws-text-muted)'],
              ['Battery Storage', 'Planned Expansion', 'BESS dispatch & peak-shaving telemetry schema', 'var(--ws-text-muted)'],
              ['EV Charging', 'Planned Expansion', 'Fleet depot charger load balancing interface', 'var(--ws-text-muted)'],
            ].map(([name, status, detail, color]) => (
              <div
                key={name}
                className="rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-3.5 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="font-semibold text-sm text-[var(--ws-text-primary)]">{name}</div>
                  <div className="mt-1 text-[var(--ws-text-secondary)]">{detail}</div>
                </div>
                <span
                  className="shrink-0 font-mono-tabular text-[11px] font-medium"
                  style={{ color }}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Spatial Intelligence Showcase + Evidence & Transparency */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Panel className="lg:col-span-6 p-6 space-y-5">
            <div>
              <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-brand-teal)]">
                SPATIAL INTELLIGENCE HIERARCHY
              </div>
              <h2 className="mt-1 text-xl font-display font-semibold">
                Drill from Portfolio Building down to Equipment Asset
              </h2>
              <p className="mt-1 text-xs text-[var(--ws-text-secondary)]">
                Every node maintains synchronized selection across the 3D scene, 2D floor plan, object tree, and inspector drawer.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              {[
                ['01', 'Building', 'Meridian North Lab (MNL-01) · 6,420 m²', 'var(--ws-brand-teal)'],
                ['02', 'Floor', 'Level 2 — ISO Cleanroom & Genomics Labs', 'var(--ws-water)'],
                ['03', 'Room / Space', 'L2-201 · ISO-7 Cleanroom Suite A (560 m²)', 'var(--ws-energy)'],
                ['04', 'Asset', 'HEPA Air Handling Unit AHU-01 · 38.5 kW', 'var(--ws-carbon)'],
              ].map(([lvl, kind, label, color], idx) => (
                <div
                  key={lvl}
                  className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3.5 py-2.5 flex items-center justify-between gap-2"
                  style={{ marginLeft: `${idx * 12}px` }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono-tabular font-semibold" style={{ color }}>
                      {lvl} · {kind}
                    </span>
                    <span className="truncate text-[var(--ws-text-primary)]">{label}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setScreen('twin-viewer')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
            >
              <span>Inspect Spatial Hierarchy in 3D</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Panel>

          <Panel className="lg:col-span-6 p-6 space-y-5">
            <div>
              <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-ai)]">
                EVIDENCE &amp; TRANSPARENCY TAXONOMY
              </div>
              <h2 className="mt-1 text-xl font-display font-semibold">
                Strict Provenance &amp; Verification Boundaries
              </h2>
              <p className="mt-1 text-xs text-[var(--ws-text-secondary)]">
                WattScape never conflates modeled projections with observed telemetry or reviewer-certified savings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                ['Observed Data', 'Direct time-series interval read from meter or sensor source', 'var(--ws-brand-teal)'],
                ['Calculated Data', 'Deterministic transform using versioned unit or EPA eGRID factor', 'var(--ws-brand-blue)'],
                ['Inferred Data', 'Schedule, occupancy, or gap estimate explicitly marked non-observed', 'var(--ws-warning)'],
                ['Modeled Outcomes', 'Trade-off simulator projection with bounded uncertainty intervals', 'var(--ws-energy)'],
                ['Reviewed Outcomes', 'Operator-triaged anomaly or telemetry correction with reason log', 'var(--ws-ai)'],
                ['Verified Outcomes', 'Reviewer-approved M&V delta locked in hash-linked impact ledger', 'var(--ws-carbon)'],
              ].map(([term, desc, color]) => (
                <div
                  key={term}
                  className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-3 space-y-1"
                >
                  <div className="font-semibold" style={{ color }}>
                    {term}
                  </div>
                  <div className="text-[var(--ws-text-secondary)] leading-snug">{desc}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="relative py-16 px-4 sm:px-6 text-center ws-blueprint-grid border-b border-[var(--ws-line)]">
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-brand-teal)]">
            SYNTHETIC DEMO WORKSPACE READY
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight">
            Make Every Space More Intelligent.
          </h2>
          <p className="text-sm text-[var(--ws-text-secondary)] leading-relaxed">
            Explore Meridian North Lab in interactive 3D, test exploded floor cutaways, audit 5-dimension data trust scores, and simulate resource trade-offs.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setScreen('twin-viewer')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-md bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] hover:opacity-90 transition-opacity"
            >
              <span>Explore WattScape</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setScreen('workspace')}
              className="px-5 py-3 text-sm font-medium rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] text-[var(--ws-text-primary)] hover:bg-[var(--ws-surface-2)]"
            >
              Organization Workspace
            </button>
          </div>
        </div>
      </section>

      {/* Creator & Contact Section */}
      <section id="contact" className="scroll-mt-20 relative border-b border-[var(--ws-line)] bg-[var(--ws-canvas)] ws-blueprint-grid py-14 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Heading & Direct Email Action */}
            <div className="lg:col-span-5 space-y-5">
              <div className="text-xs font-mono-tabular font-semibold text-[var(--ws-brand-teal)]">
                CREATOR &amp; CONTACT
              </div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-[var(--ws-text-primary)]">
                Let&apos;s Connect.
              </h2>
              <p className="text-sm text-[var(--ws-text-secondary)] leading-relaxed max-w-md">
                Have a question, collaboration idea, or feedback about WattScape? Contact the WattScape team.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <a
                  href="mailto:support@wattscape.example"
                  aria-label="Email WattScape support"
                  title="Email WattScape support"
                  className="group inline-flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold rounded-md bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] hover:opacity-90 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
                >
                  <Mail className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" aria-hidden="true" />
                  <span>support@wattscape.example</span>
                </a>
              </div>

              {/* Compact Clickable Social Icon Row */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5" aria-label="WattScape contact links">
                {creatorLinks.map(({ id, label, href, ariaLabel, tooltip, external, Icon }) => (
                  <a
                    key={id}
                    href={href}
                    aria-label={ariaLabel}
                    title={tooltip}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="group inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] text-xs font-medium text-[var(--ws-text-secondary)] hover:text-[var(--ws-brand-teal)] hover:border-[var(--ws-brand-teal)] hover:-translate-y-0.5 transition-all shadow-[var(--ws-shadow-sm)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
                  >
                    <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Right Creator Identity Card */}
            <div className="lg:col-span-7">
              <div className="rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-6 sm:p-7 shadow-[var(--ws-shadow-md)] space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-[var(--ws-line)] pb-5">
                  <div className="space-y-1.5 min-w-0">
                    <div className="inline-flex items-center gap-2 text-[11px] font-mono-tabular font-semibold text-[var(--ws-brand-teal)]">
                      <span>WATTSCAPE</span>
                    </div>
                    <h3 className="text-xl font-display font-bold tracking-tight text-[var(--ws-text-primary)]">
                      WattScape
                    </h3>
                    <div className="text-sm font-medium text-[var(--ws-text-secondary)]">
                      Building operations intelligence
                    </div>
                  </div>
                  <div
                    aria-hidden="true"
                    className="w-11 h-11 shrink-0 rounded-md border border-[var(--ws-brand-teal)]/50 bg-[var(--ws-surface-2)] flex items-center justify-center font-mono-tabular text-xs font-bold text-[var(--ws-brand-teal)]"
                  >
                    MF
                  </div>
                </div>

                <p className="text-sm text-[var(--ws-text-secondary)] leading-relaxed">
                  Building WattScape — an intelligent 3D resource twin platform connecting spatial intelligence, resource analytics, AI, and operational sustainability.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {creatorLinks.map(({ id, label, display, href, ariaLabel, tooltip, external, Icon }) => (
                    <a
                      key={id}
                      href={href}
                      aria-label={ariaLabel}
                      title={tooltip}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="group rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-3.5 flex items-center justify-between gap-3 hover:border-[var(--ws-brand-teal)] hover:bg-[var(--ws-surface-3)] hover:-translate-y-0.5 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 shrink-0 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)] flex items-center justify-center text-[var(--ws-brand-teal)] group-hover:border-[var(--ws-brand-teal)] transition-colors">
                          <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--ws-text-primary)] group-hover:text-[var(--ws-brand-teal)] transition-colors">
                            {label}
                          </div>
                          <div className="text-[11px] font-mono-tabular text-[var(--ws-text-muted)] truncate">
                            {display}
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight
                        className="w-4 h-4 shrink-0 text-[var(--ws-text-muted)] group-hover:text-[var(--ws-brand-teal)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                        aria-hidden="true"
                      />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Footer */}
      <footer className="bg-[var(--ws-surface-1)] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left: Brand Mark & Tagline */}
            <div className="md:col-span-5 space-y-2.5">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('top');
                }}
                className="inline-flex items-center gap-2.5 text-base font-display font-bold tracking-tight text-[var(--ws-text-primary)] rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <polygon
                    points="12,2 21,7 12,12 3,7"
                    stroke="var(--ws-brand-teal)"
                    strokeWidth="1.8"
                    fill="var(--ws-surface-3)"
                  />
                  <polyline points="3,12 12,17 21,12" stroke="var(--ws-water)" strokeWidth="1.8" fill="none" />
                  <polyline points="3,17 12,22 21,17" stroke="var(--ws-energy)" strokeWidth="1.8" fill="none" />
                </svg>
                <span>WattScape</span>
              </a>
              <p className="text-sm font-medium text-[var(--ws-text-primary)]">
                Understand Every Resource. Improve Every Space.
              </p>
              <p className="text-xs text-[var(--ws-text-muted)] leading-relaxed max-w-sm">
                Midnight Resource Intelligence prototype using synthetic Meridian BioSystems demo fixtures (not connected to live BMS/meters).
              </p>
            </div>

            {/* Center: Product Links */}
            <div className="md:col-span-4 space-y-2.5">
              <div className="text-xs font-mono-tabular font-semibold uppercase tracking-wider text-[var(--ws-text-muted)]">
                Product
              </div>
              <ul className="space-y-2 text-xs text-[var(--ws-text-secondary)]">
                <li>
                  <button
                    type="button"
                    onClick={() => setScreen('portfolio-overview')}
                    className="hover:text-[var(--ws-brand-teal)] transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
                  >
                    Platform
                  </button>
                </li>
                <li>
                  <a
                    href="#systems"
                    className="hover:text-[var(--ws-brand-teal)] transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
                  >
                    Core Systems
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="hover:text-[var(--ws-brand-teal)] transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
                  >
                    How It Works
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setScreen('twin-viewer')}
                    className="hover:text-[var(--ws-brand-teal)] transition-colors rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
                  >
                    Explore 3D Twin
                  </button>
                </li>
              </ul>
            </div>

            {/* Right: Connect */}
            <div className="md:col-span-3 space-y-2.5">
              <div className="text-xs font-mono-tabular font-semibold uppercase tracking-wider text-[var(--ws-text-muted)]">
                Connect
              </div>
              <div className="grid grid-cols-2 gap-2">
                {creatorLinks.map(({ id, label, href, ariaLabel, tooltip, external, Icon }) => (
                  <a
                    key={id}
                    href={href}
                    aria-label={ariaLabel}
                    title={tooltip}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="group inline-flex items-center gap-2 px-2.5 py-2 rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-xs font-medium text-[var(--ws-text-secondary)] hover:text-[var(--ws-brand-teal)] hover:border-[var(--ws-brand-teal)] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden="true" />
                    <span>{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--ws-line)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--ws-text-muted)]">
            <div>WattScape</div>
            <div>&copy; {CURRENT_YEAR} WattScape</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================================
 * 2. AUTHENTICATION HANDOFF
 *
 * The actual email/password form is rendered by WattScape's Keycloak theme.
 * Keeping credentials on the OIDC issuer preserves Authorization Code + PKCE;
 * this React screen intentionally contains no password field or password API.
 * ============================================================================ */
export function AuthScreen() {
  const { signInDemo } = useWattScape();
  const { setMode } = useAppMode();
  const { enabled: oidcEnabled, status: oidcStatus, error: oidcError, signIn } = useAuth();
  const redirectStarted = useRef(false);

  useEffect(() => {
    if (!oidcEnabled || oidcStatus === 'loading' || redirectStarted.current) return;
    if (oidcStatus !== 'ready' && oidcStatus !== 'expired') return;
    redirectStarted.current = true;
    setMode('live');
    void signIn();
  }, [oidcEnabled, oidcStatus, signIn, setMode]);

  const retrySignIn = () => {
    redirectStarted.current = false;
    setMode('live');
    void signIn();
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--ws-canvas)] px-5 py-10 text-[var(--ws-text-primary)]">
      <section className="w-full max-w-md rounded-2xl border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-7 shadow-2xl sm:p-9">
        <div className="mb-8 flex items-center justify-center gap-3">
          <svg viewBox="0 0 24 24" className="h-10 w-10" aria-hidden="true">
            <polygon points="12,2 21,7 12,12 3,7" stroke="var(--ws-brand-teal)" strokeWidth="1.8" fill="var(--ws-surface-3)" />
            <polyline points="3,12 12,17 21,12" stroke="var(--ws-water)" strokeWidth="1.8" fill="none" />
            <polyline points="3,17 12,22 21,17" stroke="var(--ws-energy)" strokeWidth="1.8" fill="none" />
          </svg>
          <span className="text-2xl font-semibold tracking-tight">WattScape</span>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ws-text-secondary)]">Sign in to your WattScape account.</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--ws-text-muted)]" role="status" aria-live="polite">
            {oidcStatus === 'signing-in' ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--ws-line)] border-t-[var(--ws-brand-teal)]" aria-hidden="true" />
                Opening secure WattScape sign-in…
              </>
            ) : oidcEnabled ? (
              <>Secure sign-in · OpenID Connect · PKCE</>
            ) : (
              <>Secure organization access</>
            )}
          </div>
        </div>

        {!oidcEnabled && (
          <div className="mt-6 rounded-xl border border-[var(--ws-warning)]/30 bg-[var(--ws-warning)]/5 p-4 text-sm" role="alert">
            <p className="font-semibold">Live sign-in is not configured.</p>
            <p className="mt-1 text-[var(--ws-text-secondary)]">Set VITE_OIDC_AUTHORITY and VITE_OIDC_CLIENT_ID in the frontend environment, then restart the Vite server.</p>
          </div>
        )}
        {oidcError && (
          <div className="mt-6 rounded-xl border border-[var(--ws-danger)]/30 bg-[var(--ws-danger)]/5 p-4 text-sm text-[var(--ws-danger)]" role="alert">
            {oidcError}
            <button type="button" onClick={retrySignIn} className="mt-3 block font-semibold underline underline-offset-4">Retry secure sign-in</button>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {oidcEnabled && (oidcStatus === 'error' || oidcStatus === 'expired') && !oidcError && (
            <button type="button" onClick={retrySignIn} className="w-full rounded-xl bg-[var(--ws-brand-teal)] px-4 py-3 text-sm font-semibold text-[var(--ws-brand-teal-fg)]">Sign in</button>
          )}
          <button
            type="button"
            onClick={() => signInDemo('elena.rostova@meridian-demo.example', 'Organization Owner')}
            className="w-full rounded-xl border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-4 py-3 text-sm font-medium text-[var(--ws-text-primary)] transition hover:bg-[var(--ws-surface-3)]"
          >
            Explore demo workspace
          </button>
        </div>

        <p className="mt-7 text-center text-xs leading-5 text-[var(--ws-text-muted)]">
          Your email, password, verification, and recovery are handled on WattScape’s secure identity page. WattScape never receives your password.
        </p>
        <div className="mt-6 border-t border-[var(--ws-line)] pt-5 text-center text-xs text-[var(--ws-text-muted)]">
          Sign-in, account creation, password recovery, and configured social providers are available on the same WattScape-branded identity page.
        </div>
      </section>
    </main>
  );
}

/* ============================================================================
 * 3. ORGANIZATION WORKSPACE SCREEN
 * ============================================================================ */
export function OrganizationWorkspaceScreen() {
  const {
    organization,
    updateOrganization,
    members,
    inviteMember,
    revokeMember,
    sites,
    activeSiteId,
    setActiveSiteId,
    setScreen,
  } = useWattScape();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgMember['role']>('Facilities Operator');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateEmailInvite(inviteEmail, inviteRole);
    if (!res.valid) {
      setInviteError(res.errors.email ?? 'Please enter a valid email.');
      return;
    }
    setInviteError(null);
    inviteMember(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Organization Workspace"
        subtitle={`Tenant Root: ${organization.name} (${organization.id}) · Region: ${organization.region}`}
        actions={
          <button
            type="button"
            onClick={() => setScreen('twin-viewer')}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
          >
            Open Active Site Twin
          </button>
        }
      />

      <SyntheticDemoBanner context="Tenant policies & member invitations operate on local synthetic state" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Org Configuration */}
        <Panel className="lg:col-span-5 p-5 space-y-4">
          <h2 className="text-base font-semibold">Tenant Policy & Defaults</h2>
          <div className="space-y-3 text-sm">
            <div>
              <label htmlFor="org-name" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                Display Organization Name
              </label>
              <input
                id="org-name"
                value={organization.name}
                onChange={(e) => updateOrganization({ name: e.target.value })}
                className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="org-currency" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                  Home Currency
                </label>
                <select
                  id="org-currency"
                  value={organization.defaultCurrency}
                  onChange={(e) =>
                    updateOrganization({
                      defaultCurrency: e.target.value as 'USD' | 'EUR' | 'GBP',
                    })
                  }
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div>
                <label htmlFor="org-retention" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                  Retention (Days)
                </label>
                <input
                  id="org-retention"
                  type="number"
                  value={organization.retentionDays}
                  onChange={(e) =>
                    updateOrganization({ retentionDays: Number(e.target.value) || 365 })
                  }
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm font-mono-tabular"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--ws-line)]">
            <h3 className="text-sm font-semibold mb-2">Portfolio Sites ({sites.length})</h3>
            <div className="space-y-2">
              {sites.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSiteId(s.id)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    activeSiteId === s.id
                      ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)]'
                      : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                      {s.code}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--ws-text-secondary)] mt-0.5">
                    {s.regionTag} · {s.areaSqm.toLocaleString()} m² · {s.buildingUse}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Panel>

        {/* Member Invitations & Scope */}
        <Panel className="lg:col-span-7 p-5 space-y-4">
          <h2 className="text-base font-semibold">Members & Scoped Access</h2>

          <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3 pb-4 border-b border-[var(--ws-line)]">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="invite-email" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                Invite User by Email
              </label>
              <input
                id="invite-email"
                type="email"
                placeholder="engineer@meridian-demo.example"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label htmlFor="invite-role" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                Role
              </label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as OrgMember['role'])}
                className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm"
              >
                <option>Organization Admin</option>
                <option>Site Admin</option>
                <option>Facilities Operator</option>
                <option>Energy/Sustainability Analyst</option>
                <option>Technician</option>
                <option>Auditor/Read Only</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 text-sm font-medium rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
            >
              Send Invite
            </button>
            {inviteError && (
              <div role="alert" className="w-full text-xs text-[var(--ws-danger)]">
                {inviteError}
              </div>
            )}
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                  <th className="py-2 font-medium">User</th>
                  <th className="py-2 font-medium">Role</th>
                  <th className="py-2 font-medium">Site Scope</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ws-line)]">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5">
                      <div className="font-medium text-[var(--ws-text-primary)]">{m.name}</div>
                      <div className="text-[var(--ws-text-muted)]">{m.email}</div>
                    </td>
                    <td className="py-2.5">{m.role}</td>
                    <td className="py-2.5 font-mono-tabular">
                      {m.siteScopes.includes('*') ? 'All Sites' : `${m.siteScopes.length} Site(s)`}
                    </td>
                    <td className="py-2.5 capitalize">{m.status}</td>
                    <td className="py-2.5 text-right">
                      {m.status !== 'revoked' && m.role !== 'Organization Owner' && (
                        <button
                          type="button"
                          onClick={() => revokeMember(m.id)}
                          className="text-[var(--ws-danger)] hover:underline"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================================
 * 4. GLOBAL OVERVIEW (PORTFOLIO)
 * ============================================================================ */
export function PortfolioOverviewScreen() {
  const { sites, activeSiteId, setActiveSiteId, setScreen, issues, impactLedger } = useWattScape();
  const [regionFilter, setRegionFilter] = useState<'all' | 'operational' | 'needs_mapping'>('all');

  const filteredSites = sites.filter((s) =>
    regionFilter === 'all' ? true : s.status === regionFilter,
  );

  const totalKwh = sites.reduce((acc, s) => acc + s.summaryMetrics.electricityKwh24h, 0);
  const totalWater = sites.reduce((acc, s) => acc + s.summaryMetrics.waterLiters24h, 0);
  const totalCarbon = sites.reduce((acc, s) => acc + s.summaryMetrics.carbonKgCo2e24h, 0);
  const verifiedSavings = impactLedger
    .filter((i) => i.classification === 'verified')
    .reduce((acc, i) => acc + Math.abs(i.energyDeltaKwh), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Global Portfolio Overview"
        subtitle="Cross-site resource consumption, data trust coverage, open operational issues, and verified outcomes."
        actions={
          <div className="flex items-center gap-1 p-1 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)]">
            {(
              [
                ['all', 'All Sites'],
                ['operational', 'Operational'],
                ['needs_mapping', 'Needs Mapping'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setRegionFilter(k)}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  regionFilter === k
                    ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                    : 'text-[var(--ws-text-secondary)]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        }
      />

      <SyntheticDemoBanner context="3 sample sites across California" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="24h Portfolio Electricity"
          value={totalKwh.toLocaleString()}
          unit="kWh"
          meta="Combined metered + estimated feeds"
          accentColor="var(--ws-energy)"
        />
        <MetricCard
          label="24h Portfolio Water"
          value={totalWater.toLocaleString()}
          unit="L"
          meta="1 active overnight leak hypothesis"
          accentColor="var(--ws-water)"
        />
        <MetricCard
          label="24h Operational Carbon"
          value={totalCarbon.toLocaleString()}
          unit="kgCO₂e"
          meta="EPA eGRID CAMX v2025.2"
          accentColor="var(--ws-carbon)"
        />
        <MetricCard
          label="Reviewer-Verified Savings"
          value={verifiedSavings.toLocaleString()}
          unit="kWh"
          meta={`${issues.length} active issues tracked`}
          accentColor="var(--ws-brand-teal)"
        />
      </div>

      {/* Portfolio Site Comparison Table + Interactive Spatial Jump */}
      <Panel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Portfolio Sites & Spatial Readiness</h2>
          <span className="text-xs text-[var(--ws-text-muted)]">
            Click a site row to enter its 3D Digital Twin
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                <th className="py-2.5 font-medium">Site</th>
                <th className="py-2.5 font-medium">Region</th>
                <th className="py-2.5 font-medium text-right">Area (m²)</th>
                <th className="py-2.5 font-medium text-right">24h Energy</th>
                <th className="py-2.5 font-medium text-right">24h Water</th>
                <th className="py-2.5 font-medium">Data Trust</th>
                <th className="py-2.5 font-medium text-right">Coverage</th>
                <th className="py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ws-line)]">
              {filteredSites.map((s) => (
                <tr
                  key={s.id}
                  className={
                    activeSiteId === s.id ? 'bg-[var(--ws-surface-2)]' : 'hover:bg-[var(--ws-surface-2)]'
                  }
                >
                  <td className="py-3">
                    <div className="font-semibold text-[var(--ws-text-primary)]">{s.name}</div>
                    <div className="text-[var(--ws-text-muted)]">
                      {s.code} · {s.buildingUse}
                    </div>
                  </td>
                  <td className="py-3">{s.regionTag}</td>
                  <td className="py-3 text-right font-mono-tabular">
                    {s.areaSqm.toLocaleString()}
                  </td>
                  <td className="py-3 text-right font-mono-tabular">
                    {s.summaryMetrics.electricityKwh24h.toLocaleString()} kWh
                  </td>
                  <td className="py-3 text-right font-mono-tabular">
                    {s.summaryMetrics.waterLiters24h.toLocaleString()} L
                  </td>
                  <td className="py-3">
                    <TrustLabel
                      score={s.summaryMetrics.trustScore}
                      qualityState={s.summaryMetrics.trustScore >= 80 ? 'valid' : 'estimated'}
                    />
                  </td>
                  <td className="py-3 text-right font-mono-tabular">
                    {s.summaryMetrics.coveragePct}%
                  </td>
                  <td className="py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSiteId(s.id);
                        setScreen('twin-viewer');
                      }}
                      className="px-3 py-1 rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] font-medium whitespace-nowrap"
                    >
                      Open 3D Twin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
