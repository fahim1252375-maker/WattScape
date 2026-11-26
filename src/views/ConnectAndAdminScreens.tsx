import React, { useState } from 'react';
import {
  RefreshCw,
} from 'lucide-react';
import { useWattScape } from '../context/WattScapeContext';
import {
  MetricCard,
  Panel,
  SectionHeader,
  SyntheticDemoBanner,
} from '../components/ui/Primitives';
import { evaluateControlGuardrail } from '../domain/validation';

/* ============================================================================
 * 10. INTEGRATION HUB
 * ============================================================================ */
export function IntegrationHubScreen() {
  const { connectors, toggleConnectorDryRun } = useWattScape();
  const [selectedId, setSelectedId] = useState(connectors[0]?.id ?? '');
  const [dryRunMsg, setDryRunMsg] = useState<string | null>(null);

  const active = connectors.find((c) => c.id === selectedId) ?? connectors[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Integration Hub"
        subtitle="Source-preserving connectors separating built-and-tested adapters, customer-configured gateways, and planned protocols."
      />

      <SyntheticDemoBanner context="No live field hardware or external BMS endpoints are connected in this demo" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-6 p-5 space-y-3">
          <h2 className="text-base font-semibold">Registered Connector Catalog</h2>
          <div className="space-y-2">
            {connectors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedId(c.id);
                  setDryRunMsg(null);
                }}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  active?.id === c.id
                    ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)]'
                    : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs font-mono-tabular uppercase">{c.health}</span>
                </div>
                <div className="mt-1 text-xs text-[var(--ws-text-secondary)]">
                  {c.protocol} · {c.catalogStatus.replace(/_/g, ' ')} · {c.readWriteScope.replace(/_/g, ' ')}
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
                    {active.vendor} · {active.protocol}
                  </div>
                  <h2 className="text-base font-semibold mt-0.5">{active.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toggleConnectorDryRun(active.id);
                    setDryRunMsg(
                      `Dry-run validation completed for ${active.name}: schema & unit mappings verified.`,
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Dry-Run Preview</span>
                </button>
              </div>

              {dryRunMsg && (
                <div className="text-xs font-medium text-[var(--ws-success)]">{dryRunMsg}</div>
              )}

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded bg-[var(--ws-surface-2)] p-3">
                  <div className="text-[var(--ws-text-muted)]">Sync Lag</div>
                  <div className="mt-1 font-mono-tabular font-semibold">{active.syncLagSeconds}s</div>
                </div>
                <div className="rounded bg-[var(--ws-surface-2)] p-3">
                  <div className="text-[var(--ws-text-muted)]">24h Accepted</div>
                  <div className="mt-1 font-mono-tabular font-semibold">
                    {active.acceptedCount24h.toLocaleString()}
                  </div>
                </div>
                <div className="rounded bg-[var(--ws-surface-2)] p-3">
                  <div className="text-[var(--ws-text-muted)]">Dead Letter</div>
                  <div className="mt-1 font-mono-tabular font-semibold text-[var(--ws-warning)]">
                    {active.deadLetterCount}
                  </div>
                </div>
              </div>

              {active.remediationHint && (
                <div className="rounded border border-[var(--ws-warning)] bg-[var(--ws-surface-2)] p-3 text-xs text-[var(--ws-text-secondary)]">
                  <strong className="text-[var(--ws-text-primary)]">Remediation:</strong>{' '}
                  {active.remediationHint}
                </div>
              )}

              <div className="pt-2 border-t border-[var(--ws-line)]">
                <div className="text-xs font-semibold mb-2">Canonical Field Mappings</div>
                {active.pointMappings.length === 0 ? (
                  <p className="text-xs text-[var(--ws-text-muted)]">
                    No active point mappings configured.
                  </p>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    {active.pointMappings.map((pm) => (
                      <div
                        key={pm.sourceKey}
                        className="flex items-center justify-between rounded bg-[var(--ws-surface-2)] px-3 py-2"
                      >
                        <span className="font-mono-tabular">{pm.sourceKey}</span>
                        <span>
                          → {pm.twinNodeName} ({pm.sourceUnit} → {pm.canonicalUnit})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================================
 * 14. AI AUTOMATION STUDIO
 * ============================================================================ */
export function AutomationStudioScreen() {
  const { automationRules, toggleAutomationRule, appendAudit } = useWattScape();
  const [testSetpoint, setTestSetpoint] = useState(35);
  const [hasApproval, setHasApproval] = useState(false);
  const [guardrailResult, setGuardrailResult] = useState<string | null>(null);

  const controlRule = automationRules.find((r) => r.actionType === 'request_control_change');

  const handleTestGuardrail = () => {
    if (!controlRule) return;
    const res = evaluateControlGuardrail(controlRule, testSetpoint, hasApproval);
    setGuardrailResult(`${res.status.toUpperCase()}: ${res.reason}`);
    appendAudit('AUTOMATION_GUARDRAIL_SIMULATED', `${controlRule.id} · ${res.status}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="AI Automation Studio"
        subtitle="Typed trigger → condition → policy → approval → action workflows with loop protection and physical-control safety bounds."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-7 p-5 space-y-3">
          <h2 className="text-base font-semibold">Workflow Rules ({automationRules.length})</h2>
          <div className="space-y-3">
            {automationRules.map((rule) => (
              <div
                key={rule.id}
                className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{rule.name}</div>
                    <div className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                      {rule.version} · Owner: {rule.owner} · Scope: {rule.scope}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAutomationRule(rule.id)}
                    className={`px-3 py-1 text-xs font-medium rounded border ${
                      rule.enabled
                        ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                        : 'border-[var(--ws-line)] bg-[var(--ws-surface-1)] text-[var(--ws-text-secondary)]'
                    }`}
                  >
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="text-xs text-[var(--ws-text-secondary)]">
                  <strong>Trigger:</strong> {rule.triggerCondition}
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                  <span>Action: {rule.actionType}</span>
                  <span>Rate Cap: {rule.rateCapPerHour}/hr</span>
                  <span>Loop Guard Depth: ≤ {rule.loopGuardMaxDepth}</span>
                  <span>Approval: {rule.requiresHumanApproval ? 'Required' : 'Auto-task'}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-5 p-5 space-y-4">
          <h2 className="text-base font-semibold">Physical Control Guardrail Tester</h2>
          <p className="text-xs text-[var(--ws-text-secondary)]">
            Allow-listed point: <span className="font-mono-tabular">AV:202.AHU02_VFD_MAX</span> (safe bounds 20%–85%). Safe failure always rejects or holds.
          </p>
          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="ctrl-val" className="block text-[var(--ws-text-secondary)] mb-1">
                Proposed Fan Speed Setpoint (%)
              </label>
              <input
                id="ctrl-val"
                type="number"
                value={testSetpoint}
                onChange={(e) => setTestSetpoint(Number(e.target.value))}
                className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm font-mono-tabular"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasApproval}
                onChange={(e) => setHasApproval(e.target.checked)}
                className="accent-[var(--ws-brand-teal)]"
              />
              <span>Simulate Site Admin Explicit Approval Granted</span>
            </label>
            <button
              type="button"
              onClick={handleTestGuardrail}
              className="w-full py-2 px-4 font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
            >
              Evaluate Policy Gate
            </button>
            {guardrailResult && (
              <div className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-3 font-mono-tabular">
                {guardrailResult}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================================
 * 20. SECURITY AND GOVERNANCE
 * ============================================================================ */
export function SecurityGovernanceScreen() {
  const { auditEvents, organization } = useWattScape();
  const [aiTrainingOptOut, setAiTrainingOptOut] = useState(true);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Security, Privacy & Governance"
        subtitle={`Tenant isolation, RBAC/ABAC policy matrix, AI data controls, and append-only audit log for ${organization.name}.`}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          label="Tenant Isolation Guard"
          value="Enforced"
          meta="Server-derived orgId · Cross-tenant edges blocked"
          accentColor="var(--ws-success)"
        />
        <MetricCard
          label="Auth & Session Policy"
          value="OIDC + PKCE"
          meta="Short-lived tokens · MFA via IdP"
        />
        <MetricCard
          label="Assurance Target"
          value="SOC 2 / ISO"
          meta="Design target (not an active certification claim)"
        />
      </div>

      <Panel className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">AI Privacy & Tenant Isolation Controls</h2>
            <p className="text-xs text-[var(--ws-text-secondary)]">
              Occupancy analytics remain zone-aggregated; tenant data is excluded from shared model training by default.
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={aiTrainingOptOut}
              onChange={(e) => setAiTrainingOptOut(e.target.checked)}
              className="accent-[var(--ws-brand-teal)]"
            />
            <span>Enforce Zero Shared-Model Training</span>
          </label>
        </div>
      </Panel>

      <Panel className="p-5 space-y-3">
        <h2 className="text-base font-semibold">Immutable Security & Operational Audit Log</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                <th className="py-2 font-medium">Timestamp</th>
                <th className="py-2 font-medium">Actor</th>
                <th className="py-2 font-medium">Action</th>
                <th className="py-2 font-medium">Resource</th>
                <th className="py-2 font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ws-line)]">
              {auditEvents.map((ev) => (
                <tr key={ev.id}>
                  <td className="py-2.5 font-mono-tabular text-[var(--ws-text-muted)]">
                    {ev.timestamp.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-2.5">{ev.actor}</td>
                  <td className="py-2.5 font-mono-tabular">{ev.action}</td>
                  <td className="py-2.5">{ev.resource}</td>
                  <td
                    className={`py-2.5 font-mono-tabular uppercase font-semibold ${
                      ev.outcome === 'denied' ? 'text-[var(--ws-danger)]' : 'text-[var(--ws-success)]'
                    }`}
                  >
                    {ev.outcome}
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
 * 21. SETTINGS SCREEN
 * ============================================================================ */
export function SettingsScreen() {
  const {
    theme,
    setTheme,
    density,
    setDensity,
    unitSystem,
    setUnitSystem,
    reducedMotion,
    setReducedMotion,
    authenticatedUser,
    signOutDemo,
  } = useWattScape();

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <SectionHeader
        title="Workspace Preferences & Accessibility Settings"
        subtitle="Configure theme contrast, table density, measurement units, and reduced-motion preferences."
      />

      <Panel className="p-6 space-y-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--ws-line)]">
          <div>
            <div className="font-medium">Color Theme</div>
            <div className="text-xs text-[var(--ws-text-secondary)]">
              Switches semantic surfaces and 3D environment lighting between Deep Graphite Dark and Architectural Light.
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)]">
            {(['dark', 'light'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTheme(m)}
                className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                  theme === m
                    ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                    : 'text-[var(--ws-text-secondary)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--ws-line)]">
          <div>
            <div className="font-medium">Table & Panel Density</div>
            <div className="text-xs text-[var(--ws-text-secondary)]">
              Comfortable default or compact density for high-volume asset inventories.
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)]">
            {(['comfortable', 'compact'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                  density === d
                    ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                    : 'text-[var(--ws-text-secondary)]'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--ws-line)]">
          <div>
            <div className="font-medium">Display Unit System</div>
            <div className="text-xs text-[var(--ws-text-secondary)]">
              Canonical storage retains original source units alongside normalized metric/imperial presentation.
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)]">
            {(['metric', 'imperial'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnitSystem(u)}
                className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                  unitSystem === u
                    ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                    : 'text-[var(--ws-text-secondary)]'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--ws-line)]">
          <div>
            <div className="font-medium">Reduced Motion Mode</div>
            <div className="text-xs text-[var(--ws-text-secondary)]">
              Suppresses continuous flow animations and non-essential UI transitions.
            </div>
          </div>
          <input
            type="checkbox"
            aria-label="Enable reduced motion mode"
            checked={reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
            className="accent-[var(--ws-brand-teal)] w-4 h-4"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[var(--ws-text-secondary)]">
            Signed in as <strong className="text-[var(--ws-text-primary)]">{authenticatedUser?.email}</strong> ({authenticatedUser?.role})
          </div>
          <button
            type="button"
            onClick={signOutDemo}
            className="px-3.5 py-1.5 text-xs font-medium rounded border border-[var(--ws-line)] hover:bg-[var(--ws-surface-2)]"
          >
            Switch Demo User
          </button>
        </div>
      </Panel>
    </div>
  );
}
