import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { QualityState } from '../../domain/types';

export function Panel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] shadow-[var(--ws-shadow-sm)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[var(--ws-line)]">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight text-[var(--ws-text-primary)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--ws-text-secondary)] max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  meta,
  accentColor,
}: {
  label: string;
  value: string | number;
  unit?: string;
  meta?: string;
  accentColor?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] shadow-[var(--ws-shadow-sm)] p-4 min-w-0">
      <div className="text-xs font-medium text-[var(--ws-text-secondary)]">{label}</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span
          className="text-xl xl:text-2xl font-display font-semibold font-mono-tabular tracking-tight break-words"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono-tabular text-[var(--ws-text-muted)] whitespace-nowrap">
            {unit}
          </span>
        )}
      </div>
      {meta && (
        <div className="mt-1.5 text-xs text-[var(--ws-text-muted)] leading-snug">
          {meta}
        </div>
      )}
    </div>
  );
}

/**
 * Color-independent Trust & Quality indicator (no pill enclosures per design rules).
 */
export function TrustLabel({
  score,
  qualityState,
}: {
  score: number | null;
  qualityState: QualityState;
}) {
  const map: Record<
    QualityState,
    { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    valid: { label: 'Valid', color: 'var(--ws-success)', Icon: ShieldCheck },
    corrected: { label: 'Corrected', color: 'var(--ws-brand-blue)', Icon: CheckCircle2 },
    estimated: { label: 'Estimated', color: 'var(--ws-warning)', Icon: Info },
    suspect: { label: 'Suspect', color: 'var(--ws-danger)', Icon: ShieldAlert },
    stale: { label: 'Stale', color: 'var(--ws-warning)', Icon: AlertTriangle },
    missing: { label: 'Missing', color: 'var(--ws-text-muted)', Icon: HelpCircle },
    rejected: { label: 'Rejected', color: 'var(--ws-danger)', Icon: XCircle },
  };
  const cfg = map[qualityState];
  const Icon = cfg.Icon;

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
      style={{ color: cfg.color }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{cfg.label}</span>
      <span className="text-[var(--ws-text-muted)]" aria-hidden="true">
        ·
      </span>
      <span className="font-mono-tabular">
        {score === null ? 'Unknown' : `${score}/100`}
      </span>
    </span>
  );
}

export function SeverityText({
  severity,
}: {
  severity: 'critical' | 'high' | 'medium' | 'low';
}) {
  const cfg = {
    critical: { label: 'Critical', color: 'var(--ws-danger)', Icon: XCircle },
    high: { label: 'High', color: 'var(--ws-warning)', Icon: AlertTriangle },
    medium: { label: 'Medium', color: 'var(--ws-brand-blue)', Icon: Info },
    low: { label: 'Low', color: 'var(--ws-text-secondary)', Icon: CheckCircle2 },
  }[severity];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap"
      style={{ color: cfg.color }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{cfg.label}</span>
    </span>
  );
}

/**
 * Honest synthetic data disclosure banner/line (spec §6 & §14).
 */
export function SyntheticDemoBanner({ context }: { context?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-2 text-xs text-[var(--ws-text-secondary)]">
      <span>
        <strong className="font-medium text-[var(--ws-text-primary)]">
          Synthetic Demo Dataset
        </strong>{' '}
        · Sample campus & telemetry fixtures for product validation — not connected to live meters, BMS hardware, or utility accounts.
        {context ? ` · ${context}` : ''}
      </span>
    </div>
  );
}

/**
 * Clean responsive SVG time-series chart with baseline dashed overlay and tabular tooltip readout.
 */
export function TimeSeriesChart({
  data,
  baselineData,
  labels,
  unit,
  strokeColor = 'var(--ws-brand-teal)',
  height = 180,
  highlightIndex,
}: {
  data: number[];
  baselineData?: number[];
  labels: string[];
  unit: string;
  strokeColor?: string;
  height?: number;
  highlightIndex?: number;
}) {
  const width = 640;
  const padL = 42;
  const padR = 16;
  const padT = 16;
  const padB = 26;

  const allVals = baselineData ? [...data, ...baselineData] : data;
  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals, 1) * 1.08;
  const range = Math.max(1e-6, maxVal - minVal);

  const toX = (i: number) =>
    padL + (i / Math.max(1, data.length - 1)) * (width - padL - padR);
  const toY = (v: number) =>
    padT + (1 - (v - minVal) / range) * (height - padT - padB);

  const pathD = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${toX(data.length - 1).toFixed(1)} ${(height - padB).toFixed(1)} L ${toX(0).toFixed(1)} ${(height - padB).toFixed(1)} Z`;

  const baselineD = baselineData
    ? baselineData
        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
        .join(' ')
    : null;

  const ticks = [0, 0.5, 1].map((t) => minVal + t * range);

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block"
        role="img"
        aria-label={`Time series chart in ${unit}`}
      >
        {/* Horizontal gridlines */}
        {ticks.map((tick, idx) => {
          const y = toY(tick);
          return (
            <g key={idx}>
              <line
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke="var(--ws-line)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fill="var(--ws-text-muted)"
                fontSize="10"
                fontFamily="var(--ws-font-mono)"
              >
                {Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill={strokeColor} fillOpacity="0.12" />

        {/* Baseline comparison */}
        {baselineD && (
          <path
            d={baselineD}
            fill="none"
            stroke="var(--ws-text-muted)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        )}

        {/* Primary line */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />

        {/* Highlight cursor */}
        {typeof highlightIndex === 'number' && data[highlightIndex] !== undefined && (
          <g>
            <line
              x1={toX(highlightIndex)}
              x2={toX(highlightIndex)}
              y1={padT}
              y2={height - padB}
              stroke="var(--ws-text-primary)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <circle
              cx={toX(highlightIndex)}
              cy={toY(data[highlightIndex])}
              r="4.5"
              fill={strokeColor}
              stroke="var(--ws-surface-1)"
              strokeWidth="2"
            />
          </g>
        )}

        {/* X axis labels */}
        {labels.map((lbl, idx) => {
          if (idx % Math.max(1, Math.floor(labels.length / 6)) !== 0 && idx !== labels.length - 1) {
            return null;
          }
          return (
            <text
              key={idx}
              x={toX(idx)}
              y={height - 6}
              textAnchor="middle"
              fill="var(--ws-text-muted)"
              fontSize="10"
              fontFamily="var(--ws-font-mono)"
            >
              {lbl}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
