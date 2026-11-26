import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
} from 'lucide-react';
import { useWattScape } from '../context/WattScapeContext';
import {
  MetricCard,
  Panel,
  SectionHeader,
  SyntheticDemoBanner,
  TrustLabel,
} from '../components/ui/Primitives';
import { validateRoomCsvLines, validateRoomInput } from '../domain/validation';
import type { Asset, RoomSpace } from '../domain/types';

/* ============================================================================
 * 6. 3D BUILDING EDITOR (ZERO-BIM RESOURCE TWIN CREATOR)
 * ============================================================================ */
export function TwinEditorScreen() {
  const {
    floors,
    rooms,
    assets,
    addRoomToTwin,
    updateRoomState,
    placeAssetInRoom,
    setScreen,
    focusRoomIn3D,
  } = useWattScape();

  const [tab, setTab] = useState<'manual' | 'csv' | 'unlocated'>('manual');

  // Manual room creation form
  const [floorLevel, setFloorLevel] = useState(0);
  const [code, setCode] = useState('L1-106');
  const [name, setName] = useState('Bio-Waste Sterilization Bay');
  const [zoneType, setZoneType] = useState<RoomSpace['zoneType']>('lab');
  const [areaSqm, setAreaSqm] = useState(145);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [createdBanner, setCreatedBanner] = useState<string | null>(null);

  // CSV batch import state
  const [csvInput, setCsvInput] = useState(
    'code,name,areaSqm\nL2-205,Cryo Prep Alcove,95\nL2-205,Duplicate Test Row,50\nL3-305,Solar Inverter Alcove,72',
  );
  const csvValidation = useMemo(() => validateRoomCsvLines(csvInput), [csvInput]);
  const [csvAppliedCount, setCsvAppliedCount] = useState<number | null>(null);

  // Unlocated asset mapping state
  const unlocatedAssets = assets.filter((a) => a.roomId === null);
  const [selectedMapRoom, setSelectedMapRoom] = useState<Record<string, string>>({});

  const unreviewedCount = rooms.filter((r) => r.modelState !== 'reviewed').length;

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateRoomInput({ name, code, areaSqm });
    if (!res.valid) {
      setFormErrors(res.errors);
      return;
    }
    setFormErrors({});
    const targetFloor = floors.find((f) => f.level === floorLevel) ?? floors[0];
    addRoomToTwin({
      siteId: 'site_meridian_north',
      floorId: targetFloor.id,
      level: floorLevel,
      code: code.trim(),
      name: name.trim(),
      zoneType,
      areaSqm,
      x: (rooms.length % 3) * 4 - 4,
      z: -8.5,
      width: 6.5,
      depth: 5.5,
      height: 3.5,
      modelState: 'needs_review',
      provenance: 'Zero-BIM Guided Dimension Entry (Estimated)',
      hourlyEnergyKwh: Array.from({ length: 24 }, () => 12),
      hourlyWaterL: Array.from({ length: 24 }, () => 20),
      hourlyCarbonKg: Array.from({ length: 24 }, () => 3.4),
      hourlyTempC: Array.from({ length: 24 }, () => 21.2),
      hourlyCo2Ppm: Array.from({ length: 24 }, () => 450),
      qualityState: 'estimated',
      trustScore: 72,
      adjacentRoomIds: [],
    });
    setCreatedBanner(`Added ${code} · ${name} to Level ${floorLevel + 1} (labeled "needs_review").`);
  };

  const handleApplyCsv = () => {
    csvValidation.accepted.forEach((row, idx) => {
      if (!row.roomCode || !row.roomName || !row.areaSqm) return;
      addRoomToTwin({
        siteId: 'site_meridian_north',
        floorId: floors[1].id,
        level: 1,
        code: row.roomCode,
        name: row.roomName,
        zoneType: 'lab',
        areaSqm: row.areaSqm,
        x: -10 + idx * 5,
        z: -9.5,
        width: 5.2,
        depth: 4.5,
        height: 3.5,
        modelState: 'draft',
        provenance: 'Room CSV Import (Estimated)',
        hourlyEnergyKwh: Array.from({ length: 24 }, () => 8),
        hourlyWaterL: Array.from({ length: 24 }, () => 14),
        hourlyCarbonKg: Array.from({ length: 24 }, () => 2.3),
        hourlyTempC: Array.from({ length: 24 }, () => 21.0),
        hourlyCo2Ppm: Array.from({ length: 24 }, () => 440),
        qualityState: 'estimated',
        trustScore: 66,
        adjacentRoomIds: [],
      });
    });
    setCsvAppliedCount(csvValidation.accepted.length);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Zero-BIM 3D Building Editor"
        subtitle="Create, reconcile, and review spatial geometry from room lists, floor plans, or guided dimensions — without requiring BIM."
        actions={
          <button
            type="button"
            onClick={() => setScreen('twin-viewer')}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
          >
            Preview in 3D Twin
          </button>
        }
      />

      <SyntheticDemoBanner context="Changes update the live session 3D building twin immediately" />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard label="Mapped Rooms" value={rooms.length} meta="Across 3 building levels" />
        <MetricCard
          label="Needs Review / Draft"
          value={unreviewedCount}
          meta="Explicitly marked estimated until reviewed"
          accentColor="var(--ws-warning)"
        />
        <MetricCard
          label="Unlocated Assets"
          value={unlocatedAssets.length}
          meta="Sensors/meters awaiting room binding"
          accentColor={unlocatedAssets.length > 0 ? 'var(--ws-danger)' : 'var(--ws-success)'}
        />
        <MetricCard label="Optional IFC Enrichment" value="Ready" meta="Preserves operator edits" />
      </div>

      {/* Mode Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] w-fit">
        {(
          [
            ['manual', 'Guided Room Builder'],
            ['csv', 'Room & Asset CSV Import'],
            ['unlocated', `Unlocated Equipment (${unlocatedAssets.length})`],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              tab === k
                ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                : 'text-[var(--ws-text-secondary)] hover:text-[var(--ws-text-primary)]'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {tab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Panel className="lg:col-span-5 p-5 space-y-4">
            <h2 className="text-base font-semibold">Add Space Without BIM</h2>
            <p className="text-xs text-[var(--ws-text-secondary)]">
              Generated volumes are labeled <span className="font-mono-tabular">needs_review</span> until an operator confirms boundaries and submeter links.
            </p>
            <form onSubmit={handleCreateRoom} className="space-y-3 text-sm">
              <div>
                <label htmlFor="ed-floor" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                  Target Floor
                </label>
                <select
                  id="ed-floor"
                  value={floorLevel}
                  onChange={(e) => setFloorLevel(Number(e.target.value))}
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm"
                >
                  {floors.map((f) => (
                    <option key={f.id} value={f.level}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ed-code" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                    Room Code
                  </label>
                  <input
                    id="ed-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm font-mono-tabular"
                  />
                  {formErrors.code && (
                    <span className="text-xs text-[var(--ws-danger)]">{formErrors.code}</span>
                  )}
                </div>
                <div>
                  <label htmlFor="ed-area" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                    Area (m²)
                  </label>
                  <input
                    id="ed-area"
                    type="number"
                    value={areaSqm}
                    onChange={(e) => setAreaSqm(Number(e.target.value))}
                    className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm font-mono-tabular"
                  />
                  {formErrors.areaSqm && (
                    <span className="text-xs text-[var(--ws-danger)]">{formErrors.areaSqm}</span>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="ed-name" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                  Space Name
                </label>
                <input
                  id="ed-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm"
                />
                {formErrors.name && (
                  <span className="text-xs text-[var(--ws-danger)]">{formErrors.name}</span>
                )}
              </div>
              <div>
                <label htmlFor="ed-type" className="block text-xs text-[var(--ws-text-secondary)] mb-1">
                  Zone Classification
                </label>
                <select
                  id="ed-type"
                  value={zoneType}
                  onChange={(e) => setZoneType(e.target.value as RoomSpace['zoneType'])}
                  className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] px-3 py-1.5 text-sm"
                >
                  <option value="lab">Laboratory / Cleanroom</option>
                  <option value="office">Office / Studio</option>
                  <option value="plant">Mechanical / Utility Plant</option>
                  <option value="storage">Storage / Cold Vault</option>
                  <option value="server">Compute / Telemetry</option>
                </select>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Room to 3D Twin</span>
              </button>
              {createdBanner && (
                <div className="text-xs font-medium text-[var(--ws-success)]">{createdBanner}</div>
              )}
            </form>
          </Panel>

          <Panel className="lg:col-span-7 p-5 space-y-3">
            <h2 className="text-base font-semibold">Model Completeness & Revision Queue</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                    <th className="py-2 font-medium">Room</th>
                    <th className="py-2 font-medium">Provenance</th>
                    <th className="py-2 font-medium">State</th>
                    <th className="py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ws-line)]">
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5">
                        <div className="font-medium text-[var(--ws-text-primary)]">
                          {r.code} · {r.name}
                        </div>
                        <div className="text-[var(--ws-text-muted)] font-mono-tabular">
                          Level {r.level + 1} · {r.areaSqm} m²
                        </div>
                      </td>
                      <td className="py-2.5 text-[var(--ws-text-secondary)]">{r.provenance}</td>
                      <td className="py-2.5 font-mono-tabular">{r.modelState}</td>
                      <td className="py-2.5 text-right space-x-2 whitespace-nowrap">
                        {r.modelState !== 'reviewed' && (
                          <button
                            type="button"
                            onClick={() => updateRoomState(r.id, { modelState: 'reviewed' })}
                            className="text-[var(--ws-brand-teal)] hover:underline"
                          >
                            Mark Reviewed
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => focusRoomIn3D(r.id)}
                          className="text-[var(--ws-text-secondary)] hover:underline"
                        >
                          Focus 3D
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'csv' && (
        <Panel className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Room List CSV Importer with Validation Preview</h2>
              <p className="text-xs text-[var(--ws-text-secondary)]">
                Detects duplicate room codes and malformed area fields before writing to the spatial resource graph.
              </p>
            </div>
          </div>
          <textarea
            aria-label="Room CSV Input"
            rows={5}
            value={csvInput}
            onChange={(e) => {
              setCsvInput(e.target.value);
              setCsvAppliedCount(null);
            }}
            className="w-full rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-3 font-mono-tabular text-xs"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded border border-[var(--ws-line)] p-3">
              <div className="font-semibold text-[var(--ws-success)] mb-2">
                Accepted Rows ({csvValidation.accepted.length})
              </div>
              {csvValidation.accepted.map((row) => (
                <div key={row.rowNumber} className="font-mono-tabular py-0.5">
                  Row {row.rowNumber}: {row.roomCode} · {row.roomName} ({row.areaSqm} m²)
                </div>
              ))}
            </div>
            <div className="rounded border border-[var(--ws-line)] p-3">
              <div className="font-semibold text-[var(--ws-danger)] mb-2">
                Rejected Rows ({csvValidation.rejected.length})
              </div>
              {csvValidation.rejected.map((row) => (
                <div key={row.rowNumber} className="text-[var(--ws-danger)] py-0.5">
                  Row {row.rowNumber}: {row.error}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={csvValidation.accepted.length === 0}
              onClick={handleApplyCsv}
              className="px-4 py-2 text-xs font-semibold rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] disabled:opacity-50"
            >
              Import {csvValidation.accepted.length} Valid Room(s)
            </button>
            {csvAppliedCount !== null && (
              <span className="text-xs text-[var(--ws-success)]">
                Imported {csvAppliedCount} room(s) into Level 2 as draft spaces.
              </span>
            )}
          </div>
        </Panel>
      )}

      {tab === 'unlocated' && (
        <Panel className="p-5 space-y-4">
          <h2 className="text-base font-semibold">Resolve Unlocated Meters & Equipment</h2>
          <p className="text-xs text-[var(--ws-text-secondary)]">
            Sensors and meters ingested prior to spatial binding remain explicitly unlocated until assigned to a room.
          </p>
          {unlocatedAssets.length === 0 ? (
            <div className="text-xs text-[var(--ws-success)]">
              All registered equipment and meters are spatially mapped.
            </div>
          ) : (
            <div className="space-y-3">
              {unlocatedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-3"
                >
                  <div>
                    <div className="text-sm font-medium">{asset.name}</div>
                    <div className="text-xs text-[var(--ws-text-muted)] font-mono-tabular">
                      Source: {asset.sourceId} · Status: Unlocated
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Assign room for ${asset.name}`}
                      value={selectedMapRoom[asset.id] ?? 'rm_304'}
                      onChange={(e) =>
                        setSelectedMapRoom((p) => ({ ...p, [asset.id]: e.target.value }))
                      }
                      className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)] px-2.5 py-1.5 text-xs"
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.code} · {r.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        placeAssetInRoom(asset.id, selectedMapRoom[asset.id] ?? 'rm_304')
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
                    >
                      Bind to Space
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

/* ============================================================================
 * 7. FLOOR AND ROOM EXPLORER
 * ============================================================================ */
export function FloorExplorerScreen() {
  const { floors, rooms, assets, focusRoomIn3D } = useWattScape();
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [query, setQuery] = useState('');

  const filteredRooms = rooms.filter((r) => {
    const matchesFloor = selectedFloor === 'all' || r.level === selectedFloor;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
    return matchesFloor && matchesQuery;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Floor & Room Explorer"
        subtitle="Synchronized 2D spatial directory, room adjacency graph, and telemetry readiness across all building levels."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)]">
          <button
            type="button"
            onClick={() => setSelectedFloor('all')}
            className={`px-3 py-1 text-xs font-medium rounded ${
              selectedFloor === 'all'
                ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                : 'text-[var(--ws-text-secondary)]'
            }`}
          >
            All Floors
          </button>
          {floors.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFloor(f.level)}
              className={`px-3 py-1 text-xs font-medium rounded ${
                selectedFloor === f.level
                  ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                  : 'text-[var(--ws-text-secondary)]'
              }`}
            >
              L{f.level + 1}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ws-text-muted)]" />
          <input
            aria-label="Filter rooms"
            placeholder="Search room code or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)]"
          />
        </div>
      </div>

      <Panel className="p-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
              <th className="py-2 font-medium">Code & Space</th>
              <th className="py-2 font-medium">Level</th>
              <th className="py-2 font-medium text-right">Area</th>
              <th className="py-2 font-medium text-right">14:00 Load</th>
              <th className="py-2 font-medium">Trust</th>
              <th className="py-2 font-medium">Linked Assets</th>
              <th className="py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ws-line)]">
            {filteredRooms.map((r) => {
              const roomAssets = assets.filter((a) => a.roomId === r.id);
              return (
                <tr key={r.id} className="hover:bg-[var(--ws-surface-2)]">
                  <td className="py-2.5">
                    <div className="font-medium text-[var(--ws-text-primary)]">{r.name}</div>
                    <div className="font-mono-tabular text-[var(--ws-text-muted)]">{r.code}</div>
                  </td>
                  <td className="py-2.5 font-mono-tabular">L{r.level + 1}</td>
                  <td className="py-2.5 text-right font-mono-tabular">{r.areaSqm} m²</td>
                  <td className="py-2.5 text-right font-mono-tabular">
                    {r.qualityState === 'missing' ? 'Missing' : `${r.hourlyEnergyKwh[14]} kWh`}
                  </td>
                  <td className="py-2.5">
                    <TrustLabel score={r.trustScore} qualityState={r.qualityState} />
                  </td>
                  <td className="py-2.5 text-[var(--ws-text-secondary)]">
                    {roomAssets.length > 0 ? roomAssets.map((a) => a.assetClass).join(', ') : 'None'}
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => focusRoomIn3D(r.id)}
                      className="px-2.5 py-1 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] hover:bg-[var(--ws-surface-3)] font-medium"
                    >
                      Focus 3D
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ============================================================================
 * 8. ASSET MANAGEMENT
 * ============================================================================ */
export function AssetManagementScreen() {
  const { assets, rooms, focusAssetIn3D } = useWattScape();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Asset['status']>('all');
  const [selectedId, setSelectedId] = useState<string>(assets[0]?.id ?? '');

  const filtered = assets.filter((a) => {
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.assetClass.toLowerCase().includes(q) ||
      a.sourceId.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const activeAsset = assets.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Asset & Equipment Management"
        subtitle="Unified inventory of mechanical plant, HVAC, switchgear, renewables, and submeters linked to spatial rooms."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)]">
          {(['all', 'running', 'warning', 'fault', 'standby'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded capitalize ${
                statusFilter === st
                  ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]'
                  : 'text-[var(--ws-text-secondary)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ws-text-muted)]" />
          <input
            aria-label="Search assets"
            placeholder="Search equipment, source ID, or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-[var(--ws-line)] bg-[var(--ws-surface-1)]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Panel className="lg:col-span-7 p-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--ws-line)] text-[var(--ws-text-muted)]">
                <th className="py-2 font-medium">Asset</th>
                <th className="py-2 font-medium">Location</th>
                <th className="py-2 font-medium text-right">Power</th>
                <th className="py-2 font-medium">Trust</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ws-line)]">
              {filtered.map((a) => {
                const room = rooms.find((r) => r.id === a.roomId);
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={`cursor-pointer ${
                      activeAsset?.id === a.id
                        ? 'bg-[var(--ws-surface-3)]'
                        : 'hover:bg-[var(--ws-surface-2)]'
                    }`}
                  >
                    <td className="py-2.5">
                      <div className="font-medium text-[var(--ws-text-primary)]">{a.name}</div>
                      <div className="font-mono-tabular text-[var(--ws-text-muted)]">
                        {a.assetClass} · {a.sourceId}
                      </div>
                    </td>
                    <td className="py-2.5">
                      {room ? `${room.code} · ${room.name}` : 'Unlocated'}
                    </td>
                    <td className="py-2.5 text-right font-mono-tabular">{a.powerKw} kW</td>
                    <td className="py-2.5">
                      <TrustLabel score={a.trustScore} qualityState={a.qualityState} />
                    </td>
                    <td className="py-2.5 capitalize">{a.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel className="lg:col-span-5 p-5 space-y-4">
          {activeAsset ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                    {activeAsset.manufacturer} · {activeAsset.model}
                  </div>
                  <h2 className="text-base font-semibold mt-0.5">{activeAsset.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => focusAssetIn3D(activeAsset.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] whitespace-nowrap"
                >
                  Locate in 3D
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded bg-[var(--ws-surface-2)] p-3">
                  <div className="text-[var(--ws-text-muted)]">Criticality</div>
                  <div className="mt-1 font-semibold capitalize">{activeAsset.criticality}</div>
                </div>
                <div className="rounded bg-[var(--ws-surface-2)] p-3">
                  <div className="text-[var(--ws-text-muted)]">Owner</div>
                  <div className="mt-1 font-semibold">{activeAsset.owner}</div>
                </div>
                <div className="rounded bg-[var(--ws-surface-2)] p-3">
                  <div className="text-[var(--ws-text-muted)]">Serial</div>
                  <div className="mt-1 font-mono-tabular">{activeAsset.serial}</div>
                </div>
                <div className="rounded bg-[var(--ws-surface-2)] p-3">
                  <div className="text-[var(--ws-text-muted)]">Commissioned</div>
                  <div className="mt-1 font-mono-tabular">{activeAsset.commissionDate}</div>
                </div>
              </div>
              <div className="text-xs text-[var(--ws-text-secondary)]">
                <span className="font-medium text-[var(--ws-text-primary)]">Efficiency:</span>{' '}
                {activeAsset.efficiencyMetric}
              </div>
              <div className="pt-3 border-t border-[var(--ws-line)]">
                <div className="text-xs font-semibold mb-1.5">Attached Documents</div>
                {activeAsset.documents.length === 0 ? (
                  <p className="text-xs text-[var(--ws-text-muted)]">No documents uploaded yet.</p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {activeAsset.documents.map((d) => (
                      <li key={d.id} className="flex justify-between">
                        <span>{d.title}</span>
                        <span className="font-mono-tabular text-[var(--ws-text-muted)]">
                          {d.updatedAt}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--ws-text-muted)]">No matching asset selected.</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
