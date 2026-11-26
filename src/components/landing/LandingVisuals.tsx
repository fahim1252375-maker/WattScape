import React, { useRef, useState } from 'react';

function isReducedMotionActive(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('ws-reduced-motion')) {
    return true;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

function applyPointerTilt(el: HTMLElement | null, e: React.PointerEvent<HTMLElement>, maxRx = 6, maxRy = 8) {
  if (!el || e.pointerType !== 'mouse' || isReducedMotionActive()) return;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const nx = (e.clientX - rect.left) / rect.width - 0.5;
  const ny = (e.clientY - rect.top) / rect.height - 0.5;
  el.style.setProperty('--ws-rx', `${(-ny * maxRx).toFixed(2)}deg`);
  el.style.setProperty('--ws-ry', `${(nx * maxRy).toFixed(2)}deg`);
}

function resetPointerTilt(el: HTMLElement | null) {
  if (!el) return;
  el.style.setProperty('--ws-rx', '0deg');
  el.style.setProperty('--ws-ry', '0deg');
}

/**
 * Interactive 3D-tilting wrapper for Core Operational Loop cards.
 * Uses CSS variables for pointer tilt (zero React re-renders on pointermove),
 * supports mouse tilt, touch tap, keyboard focus, and Enter/Space activation.
 */
export function Interactive3DLoopCard({
  stepLabel,
  title,
  description,
  ctaLabel,
  accentColor,
  onActivate,
  children,
}: {
  stepLabel: string;
  title: string;
  description: string;
  ctaLabel: string;
  accentColor: string;
  onActivate: () => void;
  children: (hovered: boolean) => React.ReactNode;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      ref={cardRef}
      type="button"
      aria-label={`${stepLabel}: ${title}. ${ctaLabel}`}
      onClick={onActivate}
      onPointerEnter={() => setHovered(true)}
      onPointerMove={(e) => applyPointerTilt(cardRef.current, e, 7, 9)}
      onPointerLeave={() => {
        setHovered(false);
        resetPointerTilt(cardRef.current);
      }}
      className="group ws-tilt-card relative w-full flex flex-col justify-between rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-5 text-left cursor-pointer shadow-[var(--ws-shadow-sm)] hover:shadow-[var(--ws-shadow-md)] hover:border-[var(--ws-brand-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
    >
      <div className="w-full">
        {/* 3D Animated Stage Container */}
        <div className="relative h-44 w-full rounded-md border border-[var(--ws-line)] bg-[var(--ws-canvas)] overflow-hidden mb-4 flex items-center justify-center ws-blueprint-grid ws-perspective-900">
          {children(hovered)}
        </div>

        <div
          className="text-xs font-mono-tabular font-semibold tracking-wide"
          style={{ color: accentColor }}
        >
          {stepLabel}
        </div>
        <h3 className="mt-1 text-lg font-display font-semibold text-[var(--ws-text-primary)] group-hover:text-[var(--ws-brand-teal)] transition-colors">
          {title}
        </h3>
        <p className="mt-2 text-sm text-[var(--ws-text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-5 pt-3 w-full border-t border-[var(--ws-line)] flex items-center justify-between text-xs font-semibold text-[var(--ws-brand-teal)]">
        <span>{ctaLabel}</span>
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-1 font-mono-tabular"
        >
          -&gt;
        </span>
      </div>
    </button>
  );
}

/**
 * Interactive 3D-tilting card wrapper for the Eight Core Architectural Systems.
 * Zero React re-renders on pointermove; native button semantics for Enter/Space & focus.
 */
export function Interactive3DSystemCard({
  num,
  category,
  title,
  description,
  accentColor,
  onActivate,
  children,
}: {
  num: string;
  category: string;
  title: string;
  description: string;
  accentColor: string;
  onActivate: () => void;
  children: React.ReactNode;
}) {
  const cardRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onActivate}
      onPointerMove={(e) => applyPointerTilt(cardRef.current, e, 5.5, 7)}
      onPointerLeave={() => resetPointerTilt(cardRef.current)}
      className="group ws-tilt-card relative w-full rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-4 flex flex-col justify-between text-left cursor-pointer shadow-[var(--ws-shadow-sm)] hover:shadow-[var(--ws-shadow-md)] hover:border-[var(--ws-brand-teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ws-brand-teal)]"
    >
      <div className="w-full space-y-3">
        {children}
        <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular">
          <span style={{ color: accentColor }} className="font-semibold">
            SYS-{num}
          </span>
          <span className="text-[var(--ws-text-muted)]">{category}</span>
        </div>
        <h3 className="text-sm font-display font-semibold text-[var(--ws-text-primary)] group-hover:text-[var(--ws-brand-teal)] transition-colors">
          {title}
        </h3>
        <p className="text-xs text-[var(--ws-text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-4 pt-3 w-full border-t border-[var(--ws-line)] flex items-center justify-between text-xs font-semibold text-[var(--ws-brand-teal)]">
        <span>Explore system</span>
        <span
          aria-hidden="true"
          className="font-mono-tabular transition-transform duration-200 group-hover:translate-x-1"
        >
          -&gt;
        </span>
      </div>
    </button>
  );
}

/**
 * Card 1 Visual: Miniature architectural building assembling from floating floor layers.
 */
export function SpatialEntry3DVisual({ hovered }: { hovered: boolean }) {
  return (
    <div
      className="relative w-48 h-36 flex items-center justify-center ws-preserve-3d transition-transform duration-500"
      style={{
        transform: hovered
          ? 'rotateX(56deg) rotateZ(-36deg) scale(1.06)'
          : 'rotateX(58deg) rotateZ(-42deg) scale(1)',
      }}
    >
      {/* Level 1 Base Slab */}
      <div
        className="absolute w-32 h-24 rounded-sm border border-[var(--ws-line)] bg-[var(--ws-surface-2)] ws-anim-float transition-transform duration-500"
        style={{
          ['--z' as string]: hovered ? '2px' : '-6px',
          transform: `translateZ(${hovered ? '2px' : '-6px'})`,
        }}
      >
        <div className="absolute inset-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-[2px] border border-[var(--ws-energy)]/50 bg-[var(--ws-energy)]/18" />
          <div className="rounded-[2px] border border-[var(--ws-water)]/50 bg-[var(--ws-water)]/18" />
        </div>
      </div>

      {/* Level 2 Mid Slab */}
      <div
        className="absolute w-32 h-24 rounded-sm border border-[var(--ws-brand-teal)]/60 bg-[var(--ws-surface-1)]/90 ws-anim-float transition-transform duration-500"
        style={{
          ['--z' as string]: hovered ? '24px' : '28px',
          animationDelay: '0.4s',
          transform: `translateZ(${hovered ? '24px' : '28px'})`,
        }}
      >
        <div className="absolute inset-2 grid grid-cols-3 gap-1">
          <div className="col-span-2 rounded-[2px] border border-[var(--ws-brand-teal)]/70 bg-[var(--ws-brand-teal)]/22" />
          <div className="rounded-[2px] border border-[var(--ws-line)] bg-[var(--ws-surface-3)]" />
        </div>
      </div>

      {/* Level 3 Top Slab + Roof PV */}
      <div
        className="absolute w-32 h-24 rounded-sm border border-[var(--ws-water)]/70 bg-[var(--ws-surface-3)]/95 ws-anim-float transition-transform duration-500"
        style={{
          ['--z' as string]: hovered ? '46px' : '62px',
          animationDelay: '0.8s',
          transform: `translateZ(${hovered ? '46px' : '62px'})`,
        }}
      >
        <div className="absolute inset-2 flex items-center justify-between gap-1.5">
          <div className="h-full flex-1 rounded-[2px] border border-[var(--ws-carbon)]/60 bg-[var(--ws-carbon)]/20" />
          <div className="h-full w-10 rounded-[2px] border border-[var(--ws-brand-blue)]/60 bg-[var(--ws-brand-blue)]/25" />
        </div>
      </div>
    </div>
  );
}

/**
 * Card 2 Visual: 3D resource-data network passing through a Trust Validation Shield.
 * Uses CSS keyframe trajectories so reduced-motion stops all packet motion deterministically.
 */
export function EvidenceFirst3DVisual({ hovered }: { hovered: boolean }) {
  return (
    <div
      className="relative w-full h-full flex items-center justify-center px-5 ws-preserve-3d transition-transform duration-500"
      style={{
        transform: hovered ? 'rotateX(12deg) rotateY(-8deg)' : 'rotateX(16deg) rotateY(-12deg)',
      }}
    >
      <svg viewBox="0 0 280 140" className="w-full h-full" aria-hidden="true">
        <line x1="36" y1="36" x2="136" y2="70" stroke="var(--ws-brand-teal)" strokeWidth="1.5" strokeOpacity="0.65" />
        <line x1="36" y1="70" x2="136" y2="70" stroke="var(--ws-water)" strokeWidth="1.5" strokeOpacity="0.65" />
        <line x1="36" y1="104" x2="136" y2="70" stroke="var(--ws-danger)" strokeWidth="1.5" strokeDasharray="3 3" strokeOpacity="0.75" />

        <line x1="146" y1="70" x2="244" y2="42" stroke="var(--ws-brand-teal)" strokeWidth="1.8" />
        <line x1="146" y1="70" x2="244" y2="98" stroke="var(--ws-ai)" strokeWidth="1.5" strokeDasharray="4 2" />

        {/* Input Source Nodes */}
        <g>
          <circle cx="36" cy="36" r="8" fill="var(--ws-surface-2)" stroke="var(--ws-brand-teal)" strokeWidth="2" />
          <text x="36" y="21" textAnchor="middle" fill="var(--ws-text-muted)" fontSize="8" fontFamily="var(--ws-font-mono)">BMS</text>

          <circle cx="36" cy="70" r="8" fill="var(--ws-surface-2)" stroke="var(--ws-water)" strokeWidth="2" />
          <text x="36" y="57" textAnchor="middle" fill="var(--ws-text-muted)" fontSize="8" fontFamily="var(--ws-font-mono)">FLOW</text>

          <circle cx="36" cy="104" r="8" fill="var(--ws-surface-2)" stroke="var(--ws-danger)" strokeWidth="2" />
          <text x="36" y="124" textAnchor="middle" fill="var(--ws-danger)" fontSize="8" fontFamily="var(--ws-font-mono)">SUSPECT</text>
        </g>

        {/* Animated Data Packets (CSS keyframe trajectories) */}
        <circle r="3.5" fill="var(--ws-brand-teal)" className="ws-packet-a" />
        <circle r="3.5" fill="var(--ws-water)" className="ws-packet-b" />
        <circle r="3.2" fill="var(--ws-danger)" className="ws-packet-c" />

        {/* Central 3D Validation Shield */}
        <g transform="translate(140, 70)">
          <polygon
            points="0,-28 24,-15 24,10 0,26 -24,10 -24,-15"
            fill="var(--ws-surface-2)"
            stroke="var(--ws-brand-teal)"
            strokeWidth="2"
          />
          <polygon
            points="0,-19 16,-10 16,6 0,17 -16,6 -16,-10"
            fill="var(--ws-surface-3)"
            stroke="var(--ws-water)"
            strokeWidth="1"
          />
          <text x="0" y="3" textAnchor="middle" fill="var(--ws-brand-teal)" fontSize="9" fontWeight="700" fontFamily="var(--ws-font-mono)">
            TRUST
          </text>
        </g>

        {/* Output Destination Nodes */}
        <g>
          <rect x="218" y="29" width="46" height="24" rx="4" fill="var(--ws-surface-2)" stroke="var(--ws-brand-teal)" strokeWidth="1.5" />
          <text x="241" y="44" textAnchor="middle" fill="var(--ws-brand-teal)" fontSize="8" fontFamily="var(--ws-font-mono)">VALID</text>

          <rect x="218" y="86" width="46" height="24" rx="4" fill="var(--ws-surface-2)" stroke="var(--ws-ai)" strokeWidth="1.5" />
          <text x="241" y="101" textAnchor="middle" fill="var(--ws-ai)" fontSize="8" fontFamily="var(--ws-font-mono)">REVIEW</text>
        </g>
      </svg>
    </div>
  );
}

/**
 * Card 3 Visual: 3D workflow stages Detect -> Explain -> Prioritize -> Approve -> Resolve -> Verify.
 */
export function ClosedLoop3DVisual({ hovered }: { hovered: boolean }) {
  const stages = [
    { label: 'Detect', color: 'var(--ws-energy)' },
    { label: 'Explain', color: 'var(--ws-ai)' },
    { label: 'Prioritize', color: 'var(--ws-water)' },
    { label: 'Approve', color: 'var(--ws-brand-teal)' },
    { label: 'Resolve', color: 'var(--ws-carbon)' },
    { label: 'Verify', color: 'var(--ws-success)' },
  ];

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center px-4 ws-preserve-3d transition-transform duration-500"
      style={{
        transform: hovered ? 'rotateX(14deg) rotateY(6deg)' : 'rotateX(20deg) rotateY(10deg)',
      }}
    >
      {/* Top 3 stages */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
        {stages.slice(0, 3).map((st, idx) => (
          <div
            key={st.label}
            className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)] px-2 py-2 text-center ws-anim-seq"
            style={{ animationDelay: `${idx * 0.45}s` }}
          >
            <div
              className="mx-auto w-2 h-2 rounded-full mb-1"
              style={{ backgroundColor: st.color }}
            />
            <div className="text-[10px] font-mono-tabular text-[var(--ws-text-primary)]">
              {st.label}
            </div>
          </div>
        ))}
      </div>

      {/* Connecting progress flow bar */}
      <div className="relative my-2.5 h-1.5 w-56 rounded-full bg-[var(--ws-surface-3)] overflow-hidden">
        <div
          className="absolute inset-y-0 w-16 rounded-full ws-anim-pulse-slide"
          style={{
            background: 'linear-gradient(90deg, var(--ws-energy), var(--ws-brand-teal), var(--ws-carbon))',
          }}
        />
      </div>

      {/* Bottom 3 stages culminating in Verified Seal */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
        {stages.slice(3, 6).map((st, idx) => (
          <div
            key={st.label}
            className={`rounded border px-2 py-2 text-center ws-anim-seq ${
              st.label === 'Verify'
                ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)]'
                : 'border-[var(--ws-line)] bg-[var(--ws-surface-1)]'
            }`}
            style={{ animationDelay: `${(idx + 3) * 0.45}s` }}
          >
            <div
              className="mx-auto w-2 h-2 rounded-full mb-1"
              style={{ backgroundColor: st.color }}
            />
            <div
              className={`text-[10px] font-mono-tabular font-semibold ${
                st.label === 'Verify' ? 'text-[var(--ws-brand-teal)]' : 'text-[var(--ws-text-primary)]'
              }`}
            >
              {st.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type SystemVisualKind =
  | 'twin'
  | 'graph'
  | 'trust'
  | 'ai'
  | 'sim'
  | 'proof'
  | 'context'
  | 'ledger';

/**
 * Eight continuously animated, CSS/SVG 3D-inspired illustrations for the Eight Core Architectural Systems grid.
 */
export function SystemCardVisual({
  kind,
  ledgerVerified = false,
}: {
  kind: SystemVisualKind;
  ledgerVerified?: boolean;
}) {
  return (
    <div
      className="relative h-24 w-full rounded border border-[var(--ws-line)] bg-[var(--ws-canvas)] overflow-hidden flex items-center justify-center ws-blueprint-grid ws-perspective-900"
      aria-hidden="true"
    >
      {/* SYS-01: Twin Creator — floating floor layers with hover depth reveal */}
      {kind === 'twin' && (
        <div
          className="relative w-24 h-16 ws-preserve-3d transition-transform duration-500 group-hover:scale-105"
          style={{ transform: 'rotateX(56deg) rotateZ(-36deg)' }}
        >
          {/* L1 Base Floor */}
          <div className="ws-sys-slab ws-sys-slab-1 absolute inset-0 rounded-[2px] border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-1 grid grid-cols-2 gap-1">
            <span className="rounded-[1px] bg-[var(--ws-energy)]/25 border border-[var(--ws-energy)]/45" />
            <span className="rounded-[1px] bg-[var(--ws-water)]/25 border border-[var(--ws-water)]/45" />
          </div>
          {/* L2 Mid Floor */}
          <div className="ws-sys-slab ws-sys-slab-2 absolute inset-0 rounded-[2px] border border-[var(--ws-brand-teal)]/70 bg-[var(--ws-surface-1)]/92 p-1 grid grid-cols-3 gap-1">
            <span className="col-span-2 rounded-[1px] bg-[var(--ws-brand-teal)]/22 border border-[var(--ws-brand-teal)]/60" />
            <span className="rounded-[1px] bg-[var(--ws-surface-3)] border border-[var(--ws-line)]" />
          </div>
          {/* L3 Roof & PV */}
          <div className="ws-sys-slab ws-sys-slab-3 absolute inset-0 rounded-[2px] border border-[var(--ws-water)]/85 bg-[var(--ws-surface-3)]/95 p-1 flex items-center gap-1">
            <span className="h-full flex-1 rounded-[1px] bg-[var(--ws-carbon)]/22 border border-[var(--ws-carbon)]/55" />
            <span className="h-full w-6 rounded-[1px] bg-[var(--ws-brand-blue)]/25 border border-[var(--ws-brand-blue)]/55" />
          </div>
        </div>
      )}

      {/* SYS-02: Spatial Graph — edge pulses, central node depth, illuminated connected nodes */}
      {kind === 'graph' && (
        <svg viewBox="0 0 180 80" className="w-full h-full">
          {/* Edges */}
          <line x1="34" y1="40" x2="90" y2="22" stroke="var(--ws-water)" strokeWidth="1.4" strokeOpacity="0.7" className="ws-sys-edge-flow" />
          <line x1="34" y1="40" x2="90" y2="58" stroke="var(--ws-energy)" strokeWidth="1.4" strokeOpacity="0.7" className="ws-sys-edge-flow" />
          <line x1="90" y1="22" x2="146" y2="40" stroke="var(--ws-brand-teal)" strokeWidth="1.5" strokeOpacity="0.75" className="ws-sys-edge-flow" />
          <line x1="90" y1="58" x2="146" y2="40" stroke="var(--ws-carbon)" strokeWidth="1.5" strokeOpacity="0.75" className="ws-sys-edge-flow" />
          <line x1="90" y1="22" x2="90" y2="58" stroke="var(--ws-line)" strokeWidth="1.2" />

          {/* Moving edge pulses */}
          <circle r="2.6" fill="var(--ws-water)" className="ws-graph-dot-1" />
          <circle r="2.6" fill="var(--ws-energy)" className="ws-graph-dot-2" />
          <circle r="2.6" fill="var(--ws-brand-teal)" className="ws-graph-dot-3" />

          {/* Connected peripheral nodes */}
          <circle cx="34" cy="40" r="6" fill="var(--ws-surface-1)" stroke="var(--ws-energy)" strokeWidth="2" className="ws-sys-node-glow" />
          <circle cx="90" cy="58" r="5.5" fill="var(--ws-surface-1)" stroke="var(--ws-carbon)" strokeWidth="1.8" className="ws-sys-node-glow" style={{ animationDelay: '0.8s' }} />
          <circle cx="146" cy="40" r="6" fill="var(--ws-surface-1)" stroke="var(--ws-brand-teal)" strokeWidth="2" className="ws-sys-node-glow" style={{ animationDelay: '1.6s' }} />

          {/* Central space node with subtle depth halo */}
          <circle cx="90" cy="22" r="11" fill="none" stroke="var(--ws-water)" strokeWidth="1.2" className="ws-sys-center-ring" />
          <circle cx="90" cy="22" r="7" fill="var(--ws-surface-3)" stroke="var(--ws-water)" strokeWidth="2" className="transition-transform duration-300 group-hover:scale-110" />
        </svg>
      )}

      {/* SYS-03: Data Trust — slow shield pulse, controlled bars, trusted/suspect transition */}
      {kind === 'trust' && (
        <div className="flex items-center gap-3 px-4 w-full">
          <div className="relative shrink-0 w-10 h-10 flex items-center justify-center">
            <svg width="40" height="42" viewBox="0 0 40 42" className="overflow-visible">
              <polygon
                points="20,2 36,10 36,25 20,39 4,25 4,10"
                fill="none"
                stroke="var(--ws-brand-teal)"
                strokeWidth="1.2"
                className="ws-sys-shield-halo"
              />
              <polygon
                points="20,5 33,12 33,24 20,36 7,24 7,12"
                fill="var(--ws-surface-2)"
                stroke="var(--ws-brand-teal)"
                strokeWidth="1.8"
              />
              <polyline points="14,20 18.5,24.5 27,15" fill="none" stroke="var(--ws-brand-teal)" strokeWidth="2" />
            </svg>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="relative h-3.5 text-[9px] font-mono-tabular">
              <span className="ws-sys-state-trusted absolute inset-0 inline-flex items-center gap-1 font-semibold text-[var(--ws-success)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ws-success)]" />
                TRUSTED
              </span>
              <span className="ws-sys-state-suspect absolute inset-0 inline-flex items-center gap-1 font-semibold text-[var(--ws-warning)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--ws-warning)]" />
                SUSPECT CHECK
              </span>
            </div>
            <div className="h-1.5 w-full rounded bg-[var(--ws-surface-3)] overflow-hidden">
              <div className="h-full w-11/12 bg-[var(--ws-brand-teal)] ws-sys-bar-breathe" />
            </div>
            <div className="h-1.5 w-full rounded bg-[var(--ws-surface-3)] overflow-hidden">
              <div className="h-full w-4/5 bg-[var(--ws-water)] ws-sys-bar-breathe" style={{ animationDelay: '0.6s' }} />
            </div>
            <div className="h-1.5 w-full rounded bg-[var(--ws-surface-3)] overflow-hidden">
              <div className="h-full w-3/5 bg-[var(--ws-warning)] ws-sys-bar-breathe" style={{ animationDelay: '1.2s' }} />
            </div>
          </div>
        </div>
      )}

      {/* SYS-04: Explainable AI — evidence packets -> central analysis pulse -> distinct inference */}
      {kind === 'ai' && (
        <svg viewBox="0 0 180 80" className="w-full h-full">
          {/* Section micro-labels distinguishing Evidence vs Inference */}
          <text x="23" y="12" textAnchor="middle" fill="var(--ws-brand-teal)" fontSize="6.5" fontFamily="var(--ws-font-mono)">EVIDENCE</text>
          <text x="157" y="12" textAnchor="middle" fill="var(--ws-ai)" fontSize="6.5" fontFamily="var(--ws-font-mono)">INFERENCE</text>

          {/* Animated evidence connecting lines */}
          <line x1="30" y1="24" x2="72" y2="36" stroke="var(--ws-brand-teal)" strokeWidth="1.4" className="ws-sys-edge-flow" />
          <line x1="30" y1="56" x2="72" y2="44" stroke="var(--ws-water)" strokeWidth="1.4" className="ws-sys-edge-flow" />
          {/* Outgoing inference lines */}
          <line x1="108" y1="36" x2="150" y2="24" stroke="var(--ws-ai)" strokeWidth="1.5" />
          <line x1="108" y1="44" x2="150" y2="56" stroke="var(--ws-brand-teal)" strokeWidth="1.5" strokeDasharray="3 2" />

          {/* Moving packets */}
          <circle r="2.5" fill="var(--ws-brand-teal)" className="ws-sys-ai-in-1" />
          <circle r="2.5" fill="var(--ws-water)" className="ws-sys-ai-in-2" />
          <circle r="2.5" fill="var(--ws-ai)" className="ws-sys-ai-out" />

          {/* Central AI Node + subtle analysis pulse */}
          <polygon points="90,12 118,40 90,68 62,40" fill="none" stroke="var(--ws-ai)" strokeWidth="1" className="ws-sys-ai-halo" />
          <polygon points="90,16 113,40 90,64 67,40" fill="var(--ws-surface-2)" stroke="var(--ws-ai)" strokeWidth="1.8" />
          <circle cx="90" cy="40" r="5.5" fill="var(--ws-ai)" className="transition-transform duration-300 group-hover:scale-125" />

          {/* Evidence boxes (solid) vs Inference boxes (dashed/accent) */}
          <rect x="16" y="19" width="14" height="10" rx="2" fill="var(--ws-surface-3)" stroke="var(--ws-brand-teal)" />
          <rect x="16" y="51" width="14" height="10" rx="2" fill="var(--ws-surface-3)" stroke="var(--ws-water)" />
          <rect x="150" y="19" width="16" height="10" rx="2" fill="var(--ws-surface-1)" stroke="var(--ws-ai)" strokeDasharray="2 1" />
          <rect x="150" y="51" width="16" height="10" rx="2" fill="var(--ws-surface-1)" stroke="var(--ws-brand-teal)" strokeDasharray="2 1" />
        </svg>
      )}

      {/* SYS-05: Resource Trade-off Simulator — preserved orbit, improved 3D depth & hover, variable bars */}
      {kind === 'sim' && (
        <div className="relative flex items-center justify-center w-full h-full ws-preserve-3d transition-transform duration-300 group-hover:scale-105">
          {/* Secondary depth ring */}
          <div
            className="absolute w-24 h-24 rounded-full border border-[var(--ws-water)]/30"
            style={{ transform: 'rotateX(68deg) rotateY(-12deg)' }}
          />
          {/* Primary orbit ring */}
          <div className="w-20 h-20 rounded-full border border-dashed border-[var(--ws-energy)]/75 ws-anim-orbit flex items-start justify-center">
            <span className="w-2.5 h-2.5 -mt-1.5 rounded-full bg-[var(--ws-energy)]" />
          </div>
          {/* Subtly animated multi-resource variable bars */}
          <div className="absolute flex items-end gap-1.5 h-10 pb-0.5">
            <span className="w-1.5 h-7 rounded bg-[var(--ws-energy)] ws-sys-var-bar" />
            <span className="w-1.5 h-9 rounded bg-[var(--ws-water)] ws-sys-var-bar" style={{ animationDelay: '0.6s' }} />
            <span className="w-1.5 h-6 rounded bg-[var(--ws-carbon)] ws-sys-var-bar" style={{ animationDelay: '1.2s' }} />
          </div>
        </div>
      )}

      {/* SYS-06: Problem-to-Proof — sequential Detect->Explain->Prioritize->Approve->Resolve->Verify + sweep + finish */}
      {kind === 'proof' && (
        <div className="w-full px-3 flex flex-col items-center gap-2">
          <div className="grid grid-cols-6 gap-1 w-full">
            {[
              { code: 'DET', color: 'var(--ws-energy)', finish: false },
              { code: 'EXP', color: 'var(--ws-ai)', finish: false },
              { code: 'PRI', color: 'var(--ws-water)', finish: false },
              { code: 'APP', color: 'var(--ws-brand-blue)', finish: false },
              { code: 'RES', color: 'var(--ws-carbon)', finish: false },
              { code: 'VER', color: 'var(--ws-brand-teal)', finish: true },
            ].map((stage, i) => (
              <div
                key={stage.code}
                className={`rounded border px-1 py-1.5 flex flex-col items-center justify-center gap-1 ws-anim-seq ${
                  stage.finish
                    ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)] ws-sys-verify-finish'
                    : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)]'
                }`}
                style={{ animationDelay: `${i * 0.65}s` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-[7px] font-mono-tabular font-semibold text-[var(--ws-text-primary)]">
                  {stage.code}
                </span>
              </div>
            ))}
          </div>
          {/* Moving progress indicator track */}
          <div className="relative h-1 w-full rounded-full bg-[var(--ws-surface-3)] overflow-hidden">
            <div
              className="absolute inset-y-0 w-1/4 rounded-full ws-sys-progress-sweep"
              style={{ background: 'linear-gradient(90deg, var(--ws-energy), var(--ws-water), var(--ws-brand-teal))' }}
            />
          </div>
        </div>
      )}

      {/* SYS-07: Operational Context — animated time-series line draw, timeline indicator, OBS vs CTX */}
      {kind === 'context' && (
        <svg viewBox="0 0 180 80" className="w-full h-full">
          {/* Distinction labels */}
          <text x="16" y="13" fill="var(--ws-brand-teal)" fontSize="6.5" fontFamily="var(--ws-font-mono)">OBS</text>
          <text x="42" y="13" fill="var(--ws-text-muted)" fontSize="6.5" fontFamily="var(--ws-font-mono)">CTX</text>

          {/* Contextual baseline signal (dashed, subtle) */}
          <polyline
            points="16,62 42,60 66,56 92,50 118,48 144,44 164,46"
            fill="none"
            stroke="var(--ws-text-muted)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />

          {/* Observed telemetry line (animated drawing) */}
          <polyline
            points="16,58 42,48 66,52 92,30 118,36 144,22 164,28"
            fill="none"
            stroke="var(--ws-brand-teal)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="ws-sys-line-draw"
          />

          {/* Moving timeline sweep cursor */}
          <g className="ws-sys-cursor">
            <line x1="16" y1="16" x2="16" y2="66" stroke="var(--ws-water)" strokeWidth="1" strokeOpacity="0.65" />
            <circle cx="16" cy="40" r="2.5" fill="var(--ws-water)" />
          </g>

          <circle cx="92" cy="30" r="3" fill="var(--ws-energy)" />
          <circle cx="144" cy="22" r="3" fill="var(--ws-water)" />
        </svg>
      )}

      {/* SYS-08: Verified Impact Ledger — floating layered cards, hash-link pulse, state-gated seal */}
      {kind === 'ledger' && (
        <div
          className="relative w-32 h-16 ws-preserve-3d transition-transform duration-300 group-hover:scale-105"
          style={{ transform: 'rotateX(26deg) rotateY(-16deg)' }}
        >
          {/* Underlying card stack floating gently */}
          <div
            className="ws-anim-float absolute inset-x-0 top-4 h-10 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)]"
            style={{ ['--z' as string]: '-8px', animationDelay: '0.8s' }}
          />
          <div
            className="ws-anim-float absolute inset-x-1 top-2 h-10 rounded border border-[var(--ws-brand-blue)]/60 bg-[var(--ws-surface-3)]"
            style={{ ['--z' as string]: '2px', animationDelay: '0.4s' }}
          />
          {/* Animated hash-link connector between stacked records */}
          <div
            className="ws-sys-hash-link absolute left-3 -top-0.5 z-10 flex items-center gap-0.5 text-[8px] font-mono-tabular text-[var(--ws-brand-blue)]"
            style={{ transform: 'translateZ(14px)' }}
          >
            <span>#</span>
          </div>
          {/* Top active record card reflecting actual underlying record state */}
          <div
            className={`ws-anim-float absolute inset-x-2 top-0 h-10 rounded border bg-[var(--ws-surface-1)] flex items-center justify-between px-2.5 ${
              ledgerVerified ? 'border-[var(--ws-brand-teal)]' : 'border-[var(--ws-brand-blue)]'
            }`}
            style={{ ['--z' as string]: '12px' }}
          >
            <span className="text-[9px] font-mono-tabular text-[var(--ws-text-muted)]">SHA-256</span>
            {ledgerVerified ? (
              <span className="ws-sys-seal-pulse text-[9px] font-mono-tabular font-semibold text-[var(--ws-brand-teal)]">
                VERIFIED
              </span>
            ) : (
              <span className="text-[9px] font-mono-tabular font-semibold text-[var(--ws-brand-blue)]">
                OBSERVED
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
