import React, { useMemo, useState } from 'react';
import { Download, Search, ShieldAlert } from 'lucide-react';
import { useWattScape } from '../context/WattScapeContext';
import {
  Panel,
  SectionHeader,
  SyntheticDemoBanner,
  TrustLabel,
} from '../components/ui/Primitives';
import { calculateResourceBalance } from '../domain/calculations';
import type { AiQueryResponse } from '../domain/types';

/* ============================================================================
 * 12. ANALYTICS AND REPORTING
 * ============================================================================ */
export function AnalyticsReportingScreen() {
  const { sites, rooms, activeSite } = useWattScape();
  const [drillLevel, setDrillLevel] = useState<'site' | 'floor' | 'room'>('site');
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const energyBalance = useMemo(
    () =>
      calculateResourceBalance({
        measuredInput: 10940,
        onsiteGeneration: 900,
        meteredConsumption: 11120,
        knownLosses: 290,
      }),
    [],
  );

  const waterBalance = useMemo(
    () =>
      calculateResourceBalance({
        measuredInput: 34200,
        onsiteGeneration: 0,
        meteredConsumption: 29850,
        knownLosses: 950,
      }),
    [],
  );

  const handleExport = (format: 'CSV' | 'JSON') => {
    setExportMessage(
      `Prepared ${format} analytics packet for ${activeSite.name} (${activeSite.timeZone}) · Coverage ${activeSite.summaryMetrics.coveragePct}% · Generated ${new Date().toISOString()}`,
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Analytics & Resource Balance Reporting"
        subtitle="Hierarchical drill-down, explicit unaccounted balance disclosure, and bounded benchmarking."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport('CSV')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)] hover:bg-[var(--ws-surface-2)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport('JSON')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Evidence JSON</span>
            </button>
          </div>
        }
      />

      <SyntheticDemoBanner context="Unaccounted resource balances are shown explicitly instead of silently absorbed" />

      {exportMessage && (
        <div className="rounded border border-[var(--ws-brand-teal)] bg-[var(--ws-surface-2)] px-4 py-2.5 text-xs text-[var(--ws-text-primary)]">
          {exportMessage}
        </div>
      )}

      {/* Resource Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">24h Electricity Balance · {activeSite.name}</h2>
            <span className="font-mono-tabular text-xs text-[var(--ws-text-muted)]">
              {energyBalance.reconciliationPct}% reconciled
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded bg-[var(--ws-surface-2)] p-3">
              <div className="text-[var(--ws-text-muted)]">Grid + Onsite PV Supply</div>
              <div className="mt-1 text-lg font-mono-tabular font-semibold">
                {energyBalance.totalSupply.toLocaleString()} kWh
              </div>
            </div>
            <div className="rounded bg-[var(--ws-surface-2)] p-3">
              <div className="text-[var(--ws-text-muted)]">Submetered + Losses</div>
              <div className="mt-1 text-lg font-mono-tabular font-semibold">
                {energyBalance.accountedOutflow.toLocaleString()} kWh
              </div>
            </div>
          </div>
          <div className="rounded border border-[var(--ws-warning)] bg-[var(--ws-surface-2)] p-3 text-xs flex items-center justify-between">
            <span className="font-medium">Unaccounted Electrical Balance (incl. unmetered L3-304)</span>
            <span className="font-mono-tabular font-semibold text-[var(--ws-warning)]">
              {energyBalance.unaccounted} kWh
            </span>
          </div>
        </Panel>

        <Panel className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">24h Water Balance · {activeSite.name}</h2>
            <span className="font-mono-tabular text-xs text-[var(--ws-text-muted)]">
              {waterBalance.reconciliationPct}% reconciled
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded bg-[var(--ws-surface-2)] p-3">
              <div className="text-[var(--ws-text-muted)]">Municipal & DI Supply</div>
              <div className="mt-1 text-lg font-mono-tabular font-semibold">
                {waterBalance.totalSupply.toLocaleString()} L
              </div>
            </div>
            <div className="rounded bg-[var(--ws-surface-2)] p-3">
              <div className="text-[var(--ws-text-muted)]">Metered + Cooling Blowdown</div>
              <div className="mt-1 text-lg font-mono-tabular font-semibold">
                {waterBalance.accountedOutflow.toLocaleString()} L
              </div>
            </div>
          </div>
          <div className="rounded border border-[var(--ws-danger)] bg-[var(--ws-surface-2)] p-3 text-xs flex items-center justify-between">
            <span className="font-medium">Unaccounted Water Variance (overnight flow hypothesis)</span>
            <span className="font-mono-tabular font-semibold text-[var(--ws-danger)]">
              {waterBalance.unaccounted.toLocaleString()} L
            </span>
          </div>
        </Panel>
      </div>

      {/* Like-for-Like Drill-Down */}
      <Panel className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Normalized Energy Use Intensity (EUI) Comparison</h2>
            <p className="text-xs text-[var(--ws-text-secondary)]">
              Like-for-like metrics only; sites with different process loads display boundary caveats.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)]">
            {(['site', 'floor', 'room'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setDrillLevel(lvl)}
                className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                  drillLevel === lvl
                    ? 'bg-[var(--ws-surface-1)] text-[var(--ws-text-primary)]'
                    : 'text-[var(--ws-text-secondary)]'
                }`}
              >
                By {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                <th className="py-2 font-medium">Boundary</th>
                <th className="py-2 font-medium text-right">Area (m²)</th>
                <th className="py-2 font-medium text-right">24h Intensity</th>
                <th className="py-2 font-medium">Trust & Caveat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ws-line)]">
              {drillLevel === 'site' &&
                sites.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 font-medium">{s.name} ({s.buildingUse})</td>
                    <td className="py-2.5 text-right font-mono-tabular">{s.areaSqm.toLocaleString()}</td>
                    <td className="py-2.5 text-right font-mono-tabular">
                      {(s.summaryMetrics.electricityKwh24h / s.areaSqm).toFixed(2)} kWh/m²
                    </td>
                    <td className="py-2.5">
                      <TrustLabel
                        score={s.summaryMetrics.trustScore}
                        qualityState={s.summaryMetrics.trustScore >= 80 ? 'valid' : 'estimated'}
                      />
                    </td>
                  </tr>
                ))}

              {drillLevel === 'floor' &&
                [0, 1, 2].map((lvl) => {
                  const fRooms = rooms.filter((r) => r.level === lvl);
                  const area = fRooms.reduce((a, r) => a + r.areaSqm, 0);
                  const kwh = fRooms.reduce(
                    (a, r) => a + r.hourlyEnergyKwh.reduce((x, y) => x + y, 0),
                    0,
                  );
                  return (
                    <tr key={lvl}>
                      <td className="py-2.5 font-medium">Meridian North · Level {lvl + 1}</td>
                      <td className="py-2.5 text-right font-mono-tabular">{area.toLocaleString()}</td>
                      <td className="py-2.5 text-right font-mono-tabular">
                        {(kwh / Math.max(1, area)).toFixed(2)} kWh/m²
                      </td>
                      <td className="py-2.5 text-[var(--ws-text-secondary)]">
                        {lvl === 2 ? 'Includes unmetered draft zone L3-304' : '94%+ submeter coverage'}
                      </td>
                    </tr>
                  );
                })}

              {drillLevel === 'room' &&
                rooms.map((r) => {
                  const kwh = r.hourlyEnergyKwh.reduce((a, b) => a + b, 0);
                  return (
                    <tr key={r.id}>
                      <td className="py-2.5 font-medium">
                        {r.code} · {r.name}
                      </td>
                      <td className="py-2.5 text-right font-mono-tabular">{r.areaSqm}</td>
                      <td className="py-2.5 text-right font-mono-tabular">
                        {r.qualityState === 'missing'
                          ? 'Missing'
                          : `${(kwh / r.areaSqm).toFixed(2)} kWh/m²`}
                      </td>
                      <td className="py-2.5">
                        <TrustLabel score={r.trustScore} qualityState={r.qualityState} />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================================
 * 13. AI INTELLIGENCE CENTER (EXPLAINABLE RESOURCE AI)
 * ============================================================================ */
export function AiIntelligenceScreen() {
  const { aiPresets, setScreen, createWorkOrder, appendAudit } = useWattScape();
  const [selectedPresetId, setSelectedPresetId] = useState<string>(aiPresets[0].id);
  const [customQuery, setCustomQuery] = useState('');
  const [customResult, setCustomResult] = useState<AiQueryResponse | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const activeResponse =
    customResult ?? aiPresets.find((p) => p.id === selectedPresetId) ?? aiPresets[0];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = customQuery.trim().toLowerCase();
    if (!q) return;

    if (q.includes('water') || q.includes('leak') || q.includes('cleanroom')) {
      setCustomResult(aiPresets[0]);
    } else if (q.includes('chiller') || q.includes('ahu') || q.includes('payback')) {
      setCustomResult(aiPresets[1]);
    } else if (q.includes('304') || q.includes('terrace') || q.includes('missing')) {
      setCustomResult(aiPresets[2]);
    } else {
      // Calibrated abstention for unsupported queries
      setCustomResult({
        id: `ai_abstain_${Date.now()}`,
        question: customQuery.trim(),
        abstained: true,
        abstentionReason:
          'Abstained: The query falls outside verified twin telemetry or lacks sufficient evidence records within your tenant scope. WattScape does not guess values or execute unverified actions.',
        answerTitle: 'Abstained — Insufficient Authorized Evidence',
        summary:
          'Ask about Chiller CH-01 drift, Cleanroom Suite A overnight DI water flow, Penthouse AHU-02 setback, or Room L3-304 missing telemetry.',
        confidenceLabel: 'Insufficient Evidence — Abstained',
        graphPath: ['Meridian North Lab', 'Evidence Validator'],
        evidenceRecords: [],
        assumptions: ['Strict evidence-citation policy enabled (no hallucinated estimates).'],
        counterEvidence: 'N/A',
        whatWouldChange: 'Narrow the question to a mapped room, asset, or time window.',
      });
    }
    setActionStatus(null);
  };

  const handleProposeAction = () => {
    if (!activeResponse.proposedAction) return;
    if (activeResponse.proposedAction.type === 'create_work_order') {
      createWorkOrder({
        siteId: 'site_meridian_north',
        assetId: 'ast_wp01',
        roomId: 'rm_201',
        title: 'AI Proposal: Escalate Suite A DI valve isolation check',
        description: `Generated from Explainable AI evidence packet ${activeResponse.id}`,
        severity: 'high',
        assignee: 'David Morales',
        dueDate: '2026-11-20',
      });
      setActionStatus('Proposed work order created in Maintenance Center (human-initiated).');
    } else if (activeResponse.proposedAction.type === 'policy_control_request') {
      appendAudit('AI_PROPOSED_CONTROL_QUEUED', activeResponse.proposedAction.label);
      setActionStatus(
        'Typed control request queued in Automation Studio for Site Admin approval. LLM never actuates equipment directly.',
      );
    } else {
      setScreen('twin-editor');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Explainable Resource AI Center"
        subtitle="Evidence-backed operational Q&A with graph citations, counter-evidence, calibrated abstention, and approval-gated action proposals."
      />

      <SyntheticDemoBanner context="AI responses are grounded strictly in synthetic tenant graph & telemetry fixtures" />

      {/* Natural Language Query Bar */}
      <Panel className="p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ws-text-muted)]" />
            <input
              aria-label="Ask Explainable Resource AI"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Ask about overnight water leaks, chiller payback, or missing meter L3-304..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
          >
            Query Evidence
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {aiPresets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setCustomResult(null);
                setSelectedPresetId(p.id);
                setActionStatus(null);
              }}
              className={`px-3 py-1.5 text-xs rounded border text-left ${
                !customResult && selectedPresetId === p.id
                  ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)] text-[var(--ws-text-primary)] font-medium'
                  : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-secondary)]'
              }`}
            >
              {p.abstained ? '[Abstention Example] ' : ''}
              {p.question}
            </button>
          ))}
        </div>
      </Panel>

      {/* Structured Explainable Response */}
      <Panel className="p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[var(--ws-line)]">
          <div>
            <div className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
              Graph Path: {activeResponse.graphPath.join(' → ')}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-[var(--ws-text-primary)]">
              {activeResponse.answerTitle}
            </h2>
          </div>
          <span
            className={`text-xs font-semibold font-mono-tabular ${
              activeResponse.abstained ? 'text-[var(--ws-danger)]' : 'text-[var(--ws-brand-teal)]'
            }`}
          >
            {activeResponse.confidenceLabel}
          </span>
        </div>

        {activeResponse.abstained && activeResponse.abstentionReason && (
          <div className="rounded border border-[var(--ws-danger)] bg-[var(--ws-surface-2)] p-3 text-xs text-[var(--ws-danger)] flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{activeResponse.abstentionReason}</span>
          </div>
        )}

        <p className="text-sm leading-relaxed text-[var(--ws-text-primary)]">
          {activeResponse.summary}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-4 space-y-2">
            <div className="font-semibold text-[var(--ws-text-primary)]">
              Why This Answer (Cited Evidence)
            </div>
            {activeResponse.evidenceRecords.length === 0 ? (
              <p className="text-[var(--ws-text-muted)]">No qualifying evidence records found.</p>
            ) : (
              <ul className="space-y-1.5">
                {activeResponse.evidenceRecords.map((ev) => (
                  <li key={ev.id} className="flex items-center justify-between gap-2">
                    <span>
                      <strong className="font-mono-tabular">{ev.id}</strong> · {ev.label} ({ev.window})
                    </span>
                    <span className="font-mono-tabular font-semibold">{ev.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-4 space-y-2">
            <div className="font-semibold text-[var(--ws-text-primary)]">
              Assumptions, Counter-Evidence & What Would Change It
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[var(--ws-text-secondary)]">
              {activeResponse.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
            <div className="pt-1 text-[var(--ws-text-secondary)]">
              <strong className="text-[var(--ws-text-primary)]">Counter-evidence:</strong>{' '}
              {activeResponse.counterEvidence}
            </div>
            <div className="text-[var(--ws-text-secondary)]">
              <strong className="text-[var(--ws-text-primary)]">What could change it:</strong>{' '}
              {activeResponse.whatWouldChange}
            </div>
          </div>
        </div>

        {activeResponse.proposedAction && (
          <div className="pt-4 border-t border-[var(--ws-line)] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-semibold text-[var(--ws-text-primary)]">
                Proposed Next Action:
              </span>{' '}
              <span className="text-[var(--ws-text-secondary)]">
                {activeResponse.proposedAction.label} (Approval:{' '}
                {activeResponse.proposedAction.approvalRequired})
              </span>
            </div>
            <button
              type="button"
              onClick={handleProposeAction}
              className="px-4 py-2 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
            >
              Submit Typed Action Request
            </button>
          </div>
        )}

        {actionStatus && (
          <div className="text-xs font-medium text-[var(--ws-success)]">{actionStatus}</div>
        )}
      </Panel>
    </div>
  );
}
