import React, { useState } from 'react';
import {
  Plus,
} from 'lucide-react';
import { useWattScape } from '../context/WattScapeContext';
import {
  MetricCard,
  Panel,
  SectionHeader,
  SeverityText,
  SyntheticDemoBanner,
} from '../components/ui/Primitives';
import { validateWorkOrderInput } from '../domain/validation';
import type { ProblemToProofStage, WorkOrder } from '../domain/types';

const STAGES: ProblemToProofStage[] = [
  'candidate',
  'triaged',
  'baseline_locked',
  'approved',
  'action_in_progress',
  'measurement_window',
  'review',
  'closed',
];

/* ============================================================================
 * 16. MAINTENANCE CENTER & PROBLEM-TO-PROOF ENGINE
 * ============================================================================ */
export function MaintenanceCenterScreen() {
  const {
    issues,
    advanceIssueStage,
    workOrders,
    createWorkOrder,
    updateWorkOrderStatus,
    assets,
    rooms,
    focusAssetIn3D,
  } = useWattScape();

  const [selectedIssueId, setSelectedIssueId] = useState<string>(issues[0]?.id ?? '');
  const activeIssue = issues.find((i) => i.id === selectedIssueId) ?? issues[0];

  // Create work order form
  const [title, setTitle] = useState('');
  const [assetId, setAssetId] = useState(assets[0]?.id ?? '');
  const [assignee, setAssignee] = useState('Marcus Vance');
  const [severity, setSeverity] = useState<WorkOrder['severity']>('medium');
  const [dueDate, setDueDate] = useState('2026-11-26');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdMsg, setCreatedMsg] = useState<string | null>(null);

  const handleCreateWo = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateWorkOrderInput({ title, assetId, assignee, dueDate });
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    const targetAsset = assets.find((a) => a.id === assetId);
    createWorkOrder({
      siteId: 'site_meridian_north',
      assetId,
      roomId: targetAsset?.roomId ?? null,
      title: title.trim(),
      description: description.trim() || 'Operational inspection created from Maintenance Center.',
      severity,
      assignee,
      dueDate,
    });
    setTitle('');
    setDescription('');
    setCreatedMsg('Work order created and linked to Spatial Resource Graph.');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Maintenance & Problem-to-Proof Center"
        subtitle="Track operational issues from detection through baseline lock, work execution, post-action measurement, and review."
      />

      <SyntheticDemoBanner context="CMMS external IDs represent demo integration references" />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard label="Tracked Issues" value={issues.length} meta="Problem-to-Proof lifecycle" />
        <MetricCard
          label="Open Work Orders"
          value={workOrders.filter((w) => w.status !== 'completed').length}
          meta="Across 3 site technicians"
          accentColor="var(--ws-warning)"
        />
        <MetricCard
          label="In Measurement Window"
          value={issues.filter((i) => i.stage === 'measurement_window').length}
          meta="Collecting post-action M&V data"
          accentColor="var(--ws-brand-teal)"
        />
        <MetricCard
          label="Completed Work"
          value={workOrders.filter((w) => w.status === 'completed').length}
          meta="Ready for proof packet"
          accentColor="var(--ws-success)"
        />
      </div>

      {/* Problem-to-Proof Lifecycle Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-5 p-5 space-y-3">
          <h2 className="text-base font-semibold">Problem-to-Proof Queue</h2>
          <div className="space-y-2">
            {issues.map((iss) => (
              <button
                key={iss.id}
                type="button"
                onClick={() => setSelectedIssueId(iss.id)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  activeIssue?.id === iss.id
                    ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)]'
                    : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <SeverityText severity={iss.severity} />
                  <span className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                    {iss.stage.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--ws-text-primary)]">
                  {iss.title}
                </div>
                <div className="mt-1 text-xs text-[var(--ws-text-secondary)]">
                  {iss.detectedMetric} · Owner: {iss.owner}
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-7 p-5 space-y-4">
          {activeIssue && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                    {activeIssue.id} · Window: {activeIssue.evidenceWindow}
                  </div>
                  <h2 className="text-base font-semibold mt-0.5">{activeIssue.title}</h2>
                </div>
                {activeIssue.assetId && (
                  <button
                    type="button"
                    onClick={() => focusAssetIn3D(activeIssue.assetId!)}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
                  >
                    Inspect Asset in 3D
                  </button>
                )}
              </div>

              {/* Lifecycle Progress */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-[var(--ws-text-secondary)]">
                  Problem-to-Proof Stage (click to advance for demo review)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STAGES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => advanceIssueStage(activeIssue.id, st)}
                      className={`px-2 py-1 text-[11px] font-mono-tabular rounded border ${
                        activeIssue.stage === st
                          ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] font-semibold'
                          : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-secondary)]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Operational Context Engine */}
              <div className="pt-3 border-t border-[var(--ws-line)] space-y-2">
                <div className="text-xs font-semibold">
                  Operational Context Engine (Observed vs Calculated vs Inferred)
                </div>
                <div className="space-y-2">
                  {activeIssue.contextSignals.map((sig, i) => (
                    <div
                      key={i}
                      className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[var(--ws-text-primary)]">{sig.label}</span>
                        <span className="font-mono-tabular text-[var(--ws-brand-blue)] uppercase">
                          {sig.mode} · {sig.source}
                        </span>
                      </div>
                      <div className="mt-1 text-[var(--ws-text-secondary)]">{sig.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </Panel>
      </div>

      {/* Work Orders Board + Create Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-5 p-5 space-y-3">
          <h2 className="text-base font-semibold">Create Spatial Work Order</h2>
          <form onSubmit={handleCreateWo} className="space-y-3 text-xs">
            <div>
              <label htmlFor="wo-title" className="block text-[var(--ws-text-secondary)] mb-1">
                Work Order Title
              </label>
              <input
                id="wo-title"
                placeholder="e.g., Inspect Chiller CH-01 condenser bypass valve"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm"
              />
              {errors.title && <span className="text-[var(--ws-danger)]">{errors.title}</span>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="wo-asset" className="block text-[var(--ws-text-secondary)] mb-1">
                  Target Asset
                </label>
                <select
                  id="wo-asset"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-2.5 py-1.5 text-xs"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="wo-severity" className="block text-[var(--ws-text-secondary)] mb-1">
                  Severity
                </label>
                <select
                  id="wo-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as WorkOrder['severity'])}
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-2.5 py-1.5 text-xs"
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="wo-assignee" className="block text-[var(--ws-text-secondary)] mb-1">
                  Assignee
                </label>
                <input
                  id="wo-assignee"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-2.5 py-1.5 text-xs"
                />
              </div>
              <div>
                <label htmlFor="wo-due" className="block text-[var(--ws-text-secondary)] mb-1">
                  Due Date
                </label>
                <input
                  id="wo-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-2.5 py-1.5 text-xs font-mono-tabular"
                />
              </div>
            </div>

            <div>
              <label htmlFor="wo-desc" className="block text-[var(--ws-text-secondary)] mb-1">
                Instructions / Safety Notes
              </label>
              <textarea
                id="wo-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-xs"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Work Order</span>
            </button>
            {createdMsg && (
              <div className="text-[var(--ws-success)] font-medium">{createdMsg}</div>
            )}
          </form>
        </Panel>

        <Panel className="lg:col-span-7 p-5 space-y-3">
          <h2 className="text-base font-semibold">Active Work Orders ({workOrders.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                  <th className="py-2 font-medium">Work Item</th>
                  <th className="py-2 font-medium">Assignee</th>
                  <th className="py-2 font-medium">Due</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ws-line)]">
                {workOrders.map((wo) => {
                  const room = rooms.find((r) => r.id === wo.roomId);
                  return (
                    <tr key={wo.id}>
                      <td className="py-2.5">
                        <div className="font-medium text-[var(--ws-text-primary)]">{wo.title}</div>
                        <div className="text-[var(--ws-text-muted)] font-mono-tabular">
                          {wo.id} {wo.externalCmmsId ? `· ${wo.externalCmmsId}` : ''}{' '}
                          {room ? `· ${room.code}` : ''}
                        </div>
                      </td>
                      <td className="py-2.5">{wo.assignee}</td>
                      <td className="py-2.5 font-mono-tabular">{wo.dueDate}</td>
                      <td className="py-2.5">
                        <select
                          aria-label={`Status for ${wo.title}`}
                          value={wo.status}
                          onChange={(e) =>
                            updateWorkOrderStatus(wo.id, e.target.value as WorkOrder['status'])
                          }
                          className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-2 py-1 text-xs"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="awaiting_review">Awaiting Review</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================================
 * 19. COLLABORATION CENTER
 * ============================================================================ */
export function CollaborationCenterScreen() {
  const { comments, addComment, rooms, issues, notifications, markAllNotificationsRead } =
    useWattScape();
  const [anchorId, setAnchorId] = useState(rooms[5]?.id ?? 'rm_201');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || body.trim().length < 4) {
      setError('Enter an annotation note (minimum 4 characters).');
      return;
    }
    setError(null);
    const r = rooms.find((item) => item.id === anchorId);
    addComment('room', anchorId, r ? `${r.code} · ${r.name}` : anchorId, body.trim());
    setBody('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Collaboration & Evidence Sharing"
        subtitle="Spatial annotations anchored to rooms, equipment, and issues, plus scoped notification policies."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-7 p-5 space-y-4">
          <h2 className="text-base font-semibold">Anchored Spatial Annotations ({comments.length})</h2>
          <form onSubmit={handlePost} className="space-y-3 pb-4 border-b border-[var(--ws-line)]">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="cmt-anchor" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                  Anchor to Room / Space
                </label>
                <select
                  id="cmt-anchor"
                  value={anchorId}
                  onChange={(e) => setAnchorId(e.target.value)}
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-2.5 py-1.5 text-xs"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} · {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="cmt-body" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                Annotation Note (use @name to mention team members)
              </label>
              <textarea
                id="cmt-body"
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share inspection context or baseline notes..."
                className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-xs"
              />
              {error && <span className="text-xs text-[var(--ws-danger)]">{error}</span>}
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
            >
              Post Spatial Annotation
            </button>
          </form>

          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--ws-text-primary)]">
                    {c.author} · {c.role}
                  </span>
                  <span className="font-mono-tabular text-[var(--ws-brand-teal)]">
                    {c.anchorLabel}
                  </span>
                </div>
                <p className="text-[var(--ws-text-secondary)]">{c.body}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="lg:col-span-5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Demo Notifications</h2>
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="text-xs text-[var(--ws-brand-teal)] hover:underline"
            >
              Mark all read
            </button>
          </div>
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded border p-3 text-xs ${
                  n.read
                    ? 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] opacity-75'
                    : 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)]'
                }`}
              >
                <div className="flex justify-between font-medium">
                  <span>{n.title}</span>
                  <span className="font-mono-tabular text-[var(--ws-text-muted)]">{n.timestamp}</span>
                </div>
                <p className="mt-1 text-[var(--ws-text-secondary)]">{n.detail}</p>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-[var(--ws-line)] text-xs text-[var(--ws-text-secondary)]">
            Active issues linked to packets: {issues.length}. Quiet hours policy: 22:00–06:00 local site time (critical leaks bypass).
          </div>
        </Panel>
      </div>
    </div>
  );
}
