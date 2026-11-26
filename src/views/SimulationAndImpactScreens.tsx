import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useWattScape } from '../context/WattScapeContext';
import {
  MetricCard,
  Panel,
  SectionHeader,
  SyntheticDemoBanner,
} from '../components/ui/Primitives';
import { calculateEmissionsKg, runResourceTradeoffSimulation } from '../domain/calculations';
import type { ScenarioResult } from '../domain/types';

/* ============================================================================
 * 15. SIMULATION LABORATORY (RESOURCE TRADE-OFF SIMULATOR)
 * ============================================================================ */
export function SimulationLabScreen() {
  const { scenarioAssumptions, setScenarioAssumptions, createWorkOrder, appendAudit } =
    useWattScape();
  const [scenarioName, setScenarioName] = useState('Q1 Chiller + Setback + 200kW PV');
  const [includeWater, setIncludeWater] = useState(true);
  const [savedScenarios, setSavedScenarios] = useState<ScenarioResult[]>([]);
  const [planCreatedMsg, setPlanCreatedMsg] = useState<string | null>(null);

  const liveScenario = useMemo(
    () =>
      runResourceTradeoffSimulation({
        scenarioId: 'scn_live',
        name: scenarioName,
        baselineKwhYear: 4320000,
        baselineWaterLYear: 12480000,
        baselineCostUsdYear: 850750,
        baselineCarbonKgYear: 1231200,
        assumptions: scenarioAssumptions,
        includeWaterModel: includeWater,
      }),
    [scenarioName, scenarioAssumptions, includeWater],
  );

  const updateAssumption = (key: string, val: number) => {
    setScenarioAssumptions((prev) =>
      prev.map((a) => (a.key === key ? { ...a, value: val } : a)),
    );
  };

  const handleSaveSnapshot = () => {
    setSavedScenarios((prev) => [
      { ...liveScenario, scenarioId: `scn_${prev.length + 1}`, name: `${scenarioName} (#${prev.length + 1})` },
      ...prev.slice(0, 3),
    ]);
  };

  const handleApplyActionPlan = () => {
    createWorkOrder({
      siteId: 'site_meridian_north',
      assetId: 'ast_ch01',
      roomId: 'rm_102',
      title: `Action Plan from Scenario: ${scenarioName}`,
      description:
        'Converted modeled scenario into an engineering review work plan. Scenario values are never written directly to live BMS equipment.',
      severity: 'medium',
      assignee: 'Elena Rostova',
      dueDate: '2026-12-05',
    });
    appendAudit('SCENARIO_ACTION_PLAN_CREATED', scenarioName);
    setPlanCreatedMsg(
      'Created approved action plan in Maintenance Center. Live BMS controls remain untouched.',
    );
  };

  const carbonOut = liveScenario.outcomes.find((o) => o.metric === 'carbon');
  const comfortOut = liveScenario.outcomes.find((o) => o.metric === 'comfort');
  const costOut = liveScenario.outcomes.find((o) => o.metric === 'cost');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Simulation Laboratory — Resource Trade-off Simulator"
        subtitle="Test multi-resource interventions across energy, water, carbon, cost, comfort, and reliability with explicit uncertainty ranges."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveSnapshot}
              className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)] hover:bg-[var(--ws-surface-2)]"
            >
              Save to Compare ({savedScenarios.length})
            </button>
            <button
              type="button"
              onClick={handleApplyActionPlan}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
            >
              Create Action Plan
            </button>
          </div>
        }
      />

      <SyntheticDemoBanner context="Outputs represent modeled forecasts with uncertainty ranges — never guaranteed or verified savings" />

      {planCreatedMsg && (
        <div className="rounded border border-[var(--ws-success)] bg-[var(--ws-surface-2)] px-4 py-2.5 text-xs text-[var(--ws-success)]">
          {planCreatedMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <Panel className="lg:col-span-5 p-5 space-y-4">
          <div>
            <label htmlFor="scn-name" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
              Scenario Name
            </label>
            <input
              id="scn-name"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label htmlFor="toggle-water-sim" className="text-[var(--ws-text-secondary)]">
              Include Water Reuse Model
            </label>
            <input
              id="toggle-water-sim"
              type="checkbox"
              checked={includeWater}
              onChange={(e) => setIncludeWater(e.target.checked)}
              className="accent-[var(--ws-brand-teal)]"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-[var(--ws-line)]">
            {scenarioAssumptions.map((a) => (
              <div key={a.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={`sl-${a.key}`} className="font-medium text-[var(--ws-text-primary)]">
                    {a.label}
                  </label>
                  <span className="font-mono-tabular text-[var(--ws-brand-teal)] font-semibold">
                    {a.value} {a.unit}
                  </span>
                </div>
                <input
                  id={`sl-${a.key}`}
                  type="range"
                  min={a.min}
                  max={a.max}
                  step={a.step}
                  value={a.value}
                  onChange={(e) => updateAssumption(a.key, Number(e.target.value))}
                  className="w-full accent-[var(--ws-brand-teal)]"
                />
              </div>
            ))}
          </div>
        </Panel>

        {/* Results & Trade-off Matrix */}
        <div className="lg:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Modeled Carbon Delta"
              value={carbonOut ? `${carbonOut.delta.toLocaleString()}` : '0'}
              unit="kgCO₂e/yr"
              meta="Model says (not verified)"
              accentColor="var(--ws-carbon)"
            />
            <MetricCard
              label="Modeled Spend Delta"
              value={costOut ? `$${costOut.delta.toLocaleString()}` : '$0'}
              unit="/yr"
              meta={
                liveScenario.simplePaybackYears
                  ? `Est. Payback ${liveScenario.simplePaybackYears} yrs · Capex $${liveScenario.capexUsd.toLocaleString()}`
                  : 'Operational / zero-capex tuning'
              }
              accentColor="var(--ws-energy)"
            />
            <MetricCard
              label="Thermal Comfort Impact"
              value={comfortOut ? `${comfortOut.modeledValue}` : '92'}
              unit="/100"
              meta={`Delta ${comfortOut?.delta ?? 0} pts vs baseline`}
              accentColor="var(--ws-brand-blue)"
            />
          </div>

          <Panel className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Multi-Dimension Outcome & Uncertainty Table</h2>
              <span className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                {liveScenario.modelVersion}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                    <th className="py-2 font-medium">Dimension</th>
                    <th className="py-2 font-medium text-right">Baseline</th>
                    <th className="py-2 font-medium text-right">Modeled Delta</th>
                    <th className="py-2 font-medium text-right">Uncertainty Range</th>
                    <th className="py-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ws-line)]">
                  {liveScenario.outcomes.map((o) => (
                    <tr key={o.metric}>
                      <td className="py-2 font-medium">{o.label}</td>
                      <td className="py-2 text-right font-mono-tabular">
                        {o.baselineValue.toLocaleString()} {o.unit}
                      </td>
                      <td className="py-2 text-right font-mono-tabular font-semibold">
                        {o.status === 'not_modeled'
                          ? '—'
                          : `${o.delta > 0 ? '+' : ''}${o.delta.toLocaleString()} ${o.unit}`}
                      </td>
                      <td className="py-2 text-right font-mono-tabular text-[var(--ws-text-secondary)]">
                        {o.status === 'not_modeled'
                          ? 'N/A'
                          : `[${o.range[0].toLocaleString()}, ${o.range[1].toLocaleString()}]`}
                      </td>
                      <td className="py-2 text-right font-mono-tabular">
                        {o.status === 'not_modeled' ? 'Not modeled' : 'Modeled'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-[var(--ws-text-muted)] pt-2 border-t border-[var(--ws-line)]">
              Trust Caveats: {liveScenario.trustSummary.reasons.join(' · ')}
            </div>
          </Panel>

          {savedScenarios.length > 0 && (
            <Panel className="p-5 space-y-2">
              <h3 className="text-sm font-semibold">Saved Scenario Comparison</h3>
              <div className="space-y-2 text-xs">
                {savedScenarios.map((sc) => {
                  const e = sc.outcomes.find((x) => x.metric === 'electricity');
                  const c = sc.outcomes.find((x) => x.metric === 'comfort');
                  return (
                    <div
                      key={sc.scenarioId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded bg-[var(--ws-surface-2)] px-3 py-2"
                    >
                      <span className="font-medium">{sc.name}</span>
                      <span className="font-mono-tabular">
                        Energy: {e?.delta.toLocaleString()} kWh · Comfort: {c?.modeledValue}/100 · Capex: ${sc.capexUsd.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 17. SUSTAINABILITY CENTER
 * ============================================================================ */
export function SustainabilityCenterScreen() {
  const { emissionFactors, activeSite } = useWattScape();
  const [method, setMethod] = useState<'location_based' | 'market_based'>('location_based');
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const elecFactor =
    emissionFactors.find((f) => f.resource === 'electricity' && f.method === method) ??
    emissionFactors[0];
  const gasFactor = emissionFactors.find((f) => f.resource === 'natural_gas')!;
  const waterFactor = emissionFactors.find((f) => f.resource === 'water_supply')!;

  const annualElecKwh = activeSite.summaryMetrics.electricityKwh24h * 365;
  const annualElecKg = calculateEmissionsKg(annualElecKwh, elecFactor);
  const annualGasKg = calculateEmissionsKg(320000, gasFactor);
  const annualWaterKg = calculateEmissionsKg(activeSite.summaryMetrics.waterLiters24h * 365, waterFactor);
  const totalTonnes = ((annualElecKg + annualGasKg + annualWaterKg) / 1000).toFixed(1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Sustainability & Emissions Center"
        subtitle="Versioned emission factors, explicit reporting boundaries, actual vs. estimated activity share, and Portfolio Manager exchange prep."
        actions={
          <button
            type="button"
            onClick={() =>
              setExportMsg(
                `Exported ENERGY STAR Portfolio Manager XML/CSV property payload for ${activeSite.name} (Factor ${elecFactor.version}).`,
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Portfolio Manager Pack</span>
          </button>
        }
      />

      {exportMsg && (
        <div className="rounded border border-[var(--ws-brand-teal)] bg-[var(--ws-surface-2)] px-4 py-2 text-xs">
          {exportMsg}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--ws-text-secondary)]">
          Electricity Accounting Method:
        </span>
        <div className="flex items-center gap-1 p-1 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)]">
          {(
            [
              ['location_based', 'Location-Based (EPA eGRID)'],
              ['market_based', 'Market-Based (Supplier PPA)'],
            ] as const
          ).map(([m, lbl]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                method === m
                  ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                  : 'text-[var(--ws-text-secondary)]'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard
          label="Annualized Operational GHG"
          value={totalTonnes}
          unit="tCO₂e"
          meta={`Factor ${elecFactor.source} ${elecFactor.version}`}
          accentColor="var(--ws-carbon)"
        />
        <MetricCard
          label="Scope 2 Electricity"
          value={(annualElecKg / 1000).toFixed(1)}
          unit="tCO₂e"
          meta={`${elecFactor.value} ${elecFactor.unit}`}
        />
        <MetricCard
          label="Scope 1 Stationary Fuel"
          value={(annualGasKg / 1000).toFixed(1)}
          unit="tCO₂e"
          meta="Boiler B-01 metered gas"
        />
        <MetricCard
          label="Actual Activity Coverage"
          value={`${activeSite.summaryMetrics.coveragePct}%`}
          meta="5.8% gap-filled / estimated"
          accentColor="var(--ws-brand-teal)"
        />
      </div>

      <Panel className="p-5 space-y-3">
        <h2 className="text-base font-semibold">Versioned Emission Factor Registry</h2>
        <p className="text-xs text-[var(--ws-text-secondary)]">
          Recalculations create a new versioned result and never silently overwrite submitted sustainability disclosures.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                <th className="py-2 font-medium">Resource & Region</th>
                <th className="py-2 font-medium">Method</th>
                <th className="py-2 font-medium">Source & Vintage</th>
                <th className="py-2 font-medium text-right">Factor Value</th>
                <th className="py-2 font-medium text-right">Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ws-line)]">
              {emissionFactors.map((ef) => (
                <tr key={ef.id}>
                  <td className="py-2.5 font-medium">
                    {ef.resource.replace(/_/g, ' ')} · {ef.region}
                  </td>
                  <td className="py-2.5 capitalize">{ef.method.replace(/_/g, ' ')}</td>
                  <td className="py-2.5">
                    {ef.source} ({ef.vintage})
                  </td>
                  <td className="py-2.5 text-right font-mono-tabular">
                    {ef.value} {ef.unit}
                  </td>
                  <td className="py-2.5 text-right font-mono-tabular">{ef.version}</td>
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
 * 18. VERIFIED IMPACT LEDGER
 * ============================================================================ */
export function VerifiedImpactLedgerScreen() {
  const { impactLedger, verifyImpactRecord } = useWattScape();
  const [selectedId, setSelectedId] = useState(impactLedger[0]?.id ?? '');
  const [reviewNotes, setReviewNotes] = useState(
    'Confirmed baseline adjustment, factor version, and continuous 14-day post-measurement coverage.',
  );

  const active = impactLedger.find((r) => r.id === selectedId) ?? impactLedger[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Verified Impact Ledger"
        subtitle="Append-only, hash-linked evidence ledger separating modeled estimates, observed post-action measurements, and reviewer-verified outcomes."
      />

      <SyntheticDemoBanner context="Only an authorized reviewer can promote a record to Verified after checklist inspection" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-6 p-5 space-y-3">
          <h2 className="text-base font-semibold">Impact Records ({impactLedger.length})</h2>
          <div className="space-y-2">
            {impactLedger.map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => setSelectedId(rec.id)}
                className={`w-full text-left p-3.5 rounded border transition-colors ${
                  active?.id === rec.id
                    ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)]'
                    : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono-tabular uppercase font-semibold text-[var(--ws-brand-teal)]">
                    {rec.classification}
                  </span>
                  <span className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                    {rec.hashDigest.slice(0, 18)}...
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium">{rec.title}</div>
                <div className="mt-1 text-xs font-mono-tabular text-[var(--ws-text-secondary)]">
                  {rec.energyDeltaKwh.toLocaleString()} kWh · {rec.carbonDeltaKg.toLocaleString()} kgCO₂e · ±{rec.uncertaintyPct}%
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-6 p-5 space-y-4">
          {active && (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                    {active.id} · {active.formulaVersion}
                  </div>
                  <h2 className="text-base font-semibold mt-0.5">{active.title}</h2>
                </div>
                <span className="text-xs font-mono-tabular font-semibold uppercase text-[var(--ws-brand-teal)]">
                  {active.classification}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[var(--ws-text-secondary)] border-t border-b border-[var(--ws-line)] py-3">
                <div className="flex justify-between">
                  <span>Boundary</span>
                  <span className="text-[var(--ws-text-primary)]">{active.boundary}</span>
                </div>
                <div className="flex justify-between">
                  <span>Baseline Window</span>
                  <span className="font-mono-tabular">{active.baselinePeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Measurement Window</span>
                  <span className="font-mono-tabular">{active.measurementPeriod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Adjustment Method</span>
                  <span>{active.adjustmentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span>Factor Source</span>
                  <span className="font-mono-tabular">
                    {active.factorSource} · {active.factorVersion}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Integrity Digest</span>
                  <span className="font-mono-tabular">{active.hashDigest}</span>
                </div>
              </div>

              {active.reviewer ? (
                <div className="rounded border border-[var(--ws-success)] bg-[var(--ws-surface-2)] p-3 text-xs space-y-1">
                  <div className="font-semibold text-[var(--ws-success)]">
                    Verified by {active.reviewer.name} ({active.reviewer.role})
                  </div>
                  <div className="text-[var(--ws-text-secondary)]">
                    Policy: {active.reviewer.policy} · {active.reviewer.reviewedAt}
                  </div>
                  <div className="text-[var(--ws-text-primary)]">{active.reviewer.notes}</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-[var(--ws-warning)]">
                    Pending Reviewer Attestation — Do not report as verified savings until checklist passes.
                  </div>
                  <input
                    aria-label="Reviewer verification notes"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    disabled={active.classification === 'modeled'}
                    onClick={() => verifyImpactRecord(active.id, reviewNotes)}
                    className="px-4 py-2 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] disabled:opacity-50"
                  >
                    {active.classification === 'modeled'
                      ? 'Cannot Verify Modeled Forecast Without Post-Measurement'
                      : 'Sign Off & Mark Verified'}
                  </button>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
