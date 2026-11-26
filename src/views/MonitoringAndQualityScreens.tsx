import React, { useMemo, useState } from 'react';
import {
} from 'lucide-react';
import { useWattScape } from '../context/WattScapeContext';
import {
  MetricCard,
  Panel,
  SectionHeader,
  SyntheticDemoBanner,
  TimeSeriesChart,
  TrustLabel,
} from '../components/ui/Primitives';

/* ============================================================================
 * 9. MULTI-RESOURCE MONITORING
 * ============================================================================ */
export function MultiResourceMonitoringScreen() {
  const { activeSite, rooms, telemetryPoints } = useWattScape();
  const [resourceTab, setResourceTab] = useState<'energy' | 'water' | 'waste' | 'carbon' | 'iaq'>('energy');

  const hourLabels = useMemo(
    () => Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`),
    [],
  );

  const aggregated24h = useMemo(() => {
    const siteRooms = rooms.filter((r) => r.siteId === 'site_meridian_north' && r.qualityState !== 'missing');
    return Array.from({ length: 24 }, (_, h) => {
      const sum = siteRooms.reduce((acc, r) => {
        if (resourceTab === 'water') return acc + (r.hourlyWaterL[h] ?? 0);
        if (resourceTab === 'carbon') return acc + (r.hourlyCarbonKg[h] ?? 0);
        if (resourceTab === 'iaq') return acc + (r.hourlyCo2Ppm[h] ?? 430);
        if (resourceTab === 'waste') return acc + (h >= 8 && h <= 18 ? 34 : 4);
        return acc + (r.hourlyEnergyKwh[h] ?? 0);
      }, 0);
      return resourceTab === 'iaq' ? Math.round(sum / Math.max(1, siteRooms.length)) : Number(sum.toFixed(1));
    });
  }, [rooms, resourceTab]);

  const baseline24h = useMemo(
    () => aggregated24h.map((v) => Number((v * 1.07).toFixed(1))),
    [aggregated24h],
  );

  const unitLabel =
    resourceTab === 'water'
      ? 'L/h'
      : resourceTab === 'carbon'
        ? 'kgCO₂e/h'
        : resourceTab === 'waste'
          ? 'kg/h'
          : resourceTab === 'iaq'
            ? 'ppm CO₂ (optional)'
            : 'kWh';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Multi-Resource Monitoring"
        subtitle={`Unified telemetry across electricity, thermal/PV, water, waste, GHG emissions, and optional IAQ for ${activeSite.name}.`}
      />

      <SyntheticDemoBanner context="Actual, estimated, calculated, forecast, and missing intervals remain explicitly labeled" />

      <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] w-fit">
        {(
          [
            ['energy', 'Energy & PV'],
            ['water', 'Water & Leaks'],
            ['waste', 'Waste Streams'],
            ['carbon', 'GHG Emissions'],
            ['iaq', 'Indoor Environment (Optional)'],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setResourceTab(k)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              resourceTab === k
                ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                : 'text-[var(--ws-text-secondary)]'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="24h Electricity"
          value={activeSite.summaryMetrics.electricityKwh24h.toLocaleString()}
          unit="kWh"
          meta="Tag: Actual + 1 Estimated Zone"
          accentColor="var(--ws-energy)"
        />
        <MetricCard
          label="24h Water Intake"
          value={activeSite.summaryMetrics.waterLiters24h.toLocaleString()}
          unit="L"
          meta="Flag: 14.2 L/min overnight anomaly"
          accentColor="var(--ws-water)"
        />
        <MetricCard
          label="24h Waste Output"
          value={activeSite.summaryMetrics.wasteKg24h}
          unit="kg"
          meta="62% diverted · Plastics + Organics"
          accentColor="var(--ws-waste)"
        />
        <MetricCard
          label="Operational Carbon"
          value={activeSite.summaryMetrics.carbonKgCo2e24h.toLocaleString()}
          unit="kgCO₂e"
          meta="Tag: Calculated (EPA eGRID v2025.2)"
          accentColor="var(--ws-carbon)"
        />
      </div>

      <Panel className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">
              24-Hour {resourceTab.toUpperCase()} Profile vs Prior-Week Baseline
            </h2>
            <p className="text-xs text-[var(--ws-text-secondary)]">
              Solid line: Current 24h ({unitLabel}) · Dashed line: Normalized Baseline
            </p>
          </div>
          <span className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
            Coverage: {activeSite.summaryMetrics.coveragePct}%
          </span>
        </div>
        <TimeSeriesChart
          data={aggregated24h}
          baselineData={baseline24h}
          labels={hourLabels}
          unit={unitLabel}
          height={210}
          strokeColor={
            resourceTab === 'water'
              ? 'var(--ws-water)'
              : resourceTab === 'carbon'
                ? 'var(--ws-carbon)'
                : resourceTab === 'waste'
                  ? 'var(--ws-waste)'
                  : 'var(--ws-energy)'
          }
        />
      </Panel>

      {/* Canonical Telemetry Drill-through Table */}
      <Panel className="p-5 space-y-3">
        <h2 className="text-base font-semibold">Source Reading Lineage & Data Tags</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                <th className="py-2 font-medium">Point / Node</th>
                <th className="py-2 font-medium">Classification</th>
                <th className="py-2 font-medium text-right">Original</th>
                <th className="py-2 font-medium text-right">Normalized</th>
                <th className="py-2 font-medium">Trust</th>
                <th className="py-2 font-medium">Source Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ws-line)]">
              {telemetryPoints.map((pt) => (
                <tr key={pt.id}>
                  <td className="py-2.5">
                    <div className="font-medium">{pt.nodeName}</div>
                    <div className="text-[var(--ws-text-muted)]">{pt.metric}</div>
                  </td>
                  <td className="py-2.5 capitalize font-medium">{pt.dataTag}</td>
                  <td className="py-2.5 text-right font-mono-tabular">
                    {pt.originalValue === null ? '—' : `${pt.originalValue} ${pt.originalUnit}`}
                  </td>
                  <td className="py-2.5 text-right font-mono-tabular">
                    {pt.normalizedValue === null
                      ? 'Missing'
                      : `${pt.normalizedValue} ${pt.normalizedUnit}`}
                  </td>
                  <td className="py-2.5">
                    <TrustLabel score={pt.trust.total} qualityState={pt.qualityState} />
                  </td>
                  <td className="py-2.5 font-mono-tabular text-[var(--ws-text-muted)]">
                    {pt.sourceKey}
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

/* ============================================================================
 * 10. DATA QUALITY CENTER (DATA TRUST ENGINE)
 * ============================================================================ */
export function DataQualityCenterScreen() {
  const { telemetryPoints, resolveTelemetryPoint, setScreen } = useWattScape();
  const [selectedId, setSelectedId] = useState<string>('pt_sm203_kwh');
  const [reviewNote, setReviewNote] = useState(
    'Verified Modbus register multiplier (1.0 kWh/count); corrected scaling.',
  );

  const activePoint =
    telemetryPoints.find((p) => p.id === selectedId) ?? telemetryPoints[0];

  const queueItems = telemetryPoints.filter(
    (p) => p.qualityState !== 'valid' && p.qualityState !== 'corrected',
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Data Quality Center — Data Trust Engine"
        subtitle="Inspect per-value provenance, 5-dimension trust scoring, stale/suspect anomalies, and human-audited correction queues."
        actions={
          <button
            type="button"
            onClick={() => setScreen('ai-intelligence')}
            className="px-3.5 py-2 text-xs font-semibold rounded-md border border-[var(--ws-ai)] text-[var(--ws-ai)] bg-[var(--ws-surface-1)] hover:bg-[var(--ws-surface-2)] transition-colors whitespace-nowrap"
          >
            Investigate in Explainable AI
          </button>
        }
      />

      <SyntheticDemoBanner context="Confirming or rejecting a point updates its trust score and appends an immutable audit record" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Points Requiring Review"
          value={queueItems.length}
          meta="Suspect, estimated, or unmapped"
          accentColor={queueItems.length > 0 ? 'var(--ws-warning)' : 'var(--ws-success)'}
        />
        <MetricCard
          label="Trusted Telemetry Points"
          value={telemetryPoints.filter((p) => p.trust.status === 'trusted').length}
          meta="Score ≥ 82/100"
          accentColor="var(--ws-success)"
        />
        <MetricCard
          label="Weakest-Input Propagation"
          value="Active"
          meta="Derived KPIs inherit lowest critical score"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Queue List */}
        <Panel className="lg:col-span-6 p-5 space-y-3">
          <h2 className="text-base font-semibold">Telemetry Review Queue</h2>
          <div className="space-y-2">
            {telemetryPoints.map((pt) => (
              <button
                key={pt.id}
                type="button"
                onClick={() => setSelectedId(pt.id)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  activePoint?.id === pt.id
                    ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)]'
                    : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] hover:bg-[var(--ws-surface-3)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{pt.nodeName}</span>
                  <TrustLabel score={pt.trust.total} qualityState={pt.qualityState} />
                </div>
                <div className="mt-1 text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                  {pt.sourceSystem} · {pt.sourceKey}
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* Detailed 5-Dimension Trust Breakdown & Human Review Action */}
        <Panel className="lg:col-span-6 p-5 space-y-4">
          {activePoint && (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">{activePoint.nodeName}</h2>
                  <div className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                    Transform: {activePoint.transformVersion} · Coverage: {activePoint.coveragePct}%
                  </div>
                </div>
                <TrustLabel
                  score={activePoint.trust.total}
                  qualityState={activePoint.qualityState}
                />
              </div>

              {/* 5 Dimensions */}
              <div className="space-y-2.5 pt-2 border-t border-[var(--ws-line)]">
                {[
                  ['Source & Mapping Integrity', activePoint.trust.sourceIntegrity, 25],
                  ['Validation & Completeness', activePoint.trust.completeness, 25],
                  ['Telemetry Freshness', activePoint.trust.freshness, 20],
                  ['Continuity & Gap Check', activePoint.trust.continuity, 20],
                  ['Meter/Bill Reconciliation', activePoint.trust.reconciliation, 10],
                ].map(([label, score, max]) => {
                  const pct = Math.round(((score as number) / (max as number)) * 100);
                  return (
                    <div key={label as string} className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--ws-text-secondary)]">{label}</span>
                        <span className="font-mono-tabular font-medium">
                          {score}/{max}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded bg-[var(--ws-surface-2)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--ws-brand-teal)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1 text-xs">
                <div className="font-semibold text-[var(--ws-text-primary)]">Trust Reasons</div>
                <ul className="list-disc pl-4 text-[var(--ws-text-secondary)] space-y-0.5">
                  {activePoint.trust.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-[var(--ws-line)] space-y-3">
                <label htmlFor="dq-reason" className="block text-xs font-medium text-[var(--ws-text-secondary)]">
                  Operator Resolution Note (stored in correction history)
                </label>
                <input
                  id="dq-reason"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      resolveTelemetryPoint(
                        activePoint.id,
                        'corrected',
                        reviewNote || 'Confirmed & corrected by operator',
                      )
                    }
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
                  >
                    Confirm & Mark Corrected
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      resolveTelemetryPoint(
                        activePoint.id,
                        'rejected',
                        'Rejected bad register reading from source',
                      )
                    }
                    className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--ws-danger)] text-[var(--ws-danger)]"
                  >
                    Reject Reading
                  </button>
                </div>
              </div>

              {activePoint.correctionHistory.length > 0 && (
                <div className="pt-2 border-t border-[var(--ws-line)] text-xs space-y-1">
                  <div className="font-semibold">Correction History</div>
                  {activePoint.correctionHistory.map((h, idx) => (
                    <div key={idx} className="text-[var(--ws-text-secondary)]">
                      <span className="font-mono-tabular">{h.previousState} → {h.newState}</span> by{' '}
                      <strong>{h.actor}</strong>: {h.reason}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
