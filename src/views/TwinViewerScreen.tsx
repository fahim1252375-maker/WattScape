import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Droplets,
  Eye,
  Layers,
  ScanSearch,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { useWattScape } from '../context/WattScapeContext';
import { BuildingTwin2D } from '../components/twin/BuildingTwin2D';
import {
  Panel,
  SeverityText,
  TimeSeriesChart,
  TrustLabel,
} from '../components/ui/Primitives';
import { inspectNodeConnections } from '../domain/graph';

const LazyBuildingTwin3D = lazy(() =>
  import('../components/twin/BuildingTwin3D').then((m) => ({
    default: m.BuildingTwin3D,
  })),
);

export function TwinViewerScreen() {
  const {
    theme,
    activeSite,
    floors,
    rooms,
    assets,
    twinNodes,
    twinEdges,
    issues,
    selectedRoomId,
    setSelectedRoomId,
    selectedAssetId,
    setSelectedAssetId,
    twinInspectorTab: inspectorTab,
    setTwinInspectorTab: setInspectorTab,
    twin3d,
    setTwin3d,
    setScreen,
    organization,
  } = useWattScape();

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);

  const siteRooms = useMemo(
    () => rooms.filter((r) => r.siteId === 'site_meridian_north'),
    [rooms],
  );
  const siteAssets = useMemo(
    () => assets.filter((a) => a.siteId === 'site_meridian_north'),
    [assets],
  );

  const selectedRoom = useMemo(
    () => siteRooms.find((r) => r.id === selectedRoomId) ?? null,
    [siteRooms, selectedRoomId],
  );
  const selectedAsset = useMemo(
    () => siteAssets.find((a) => a.id === selectedAssetId) ?? null,
    [siteAssets, selectedAssetId],
  );

  const anomalyRooms = useMemo(() => siteRooms.filter((r) => r.hasAnomaly), [siteRooms]);

  // Anomaly scan stepping
  useEffect(() => {
    if (!twin3d.anomalyScanActive || anomalyRooms.length === 0) return;
    const target = anomalyRooms[twin3d.anomalyScanIndex % anomalyRooms.length];
    if (target) {
      setSelectedRoomId(target.id);
      setSelectedAssetId(null);
    }
  }, [twin3d.anomalyScanActive, twin3d.anomalyScanIndex, anomalyRooms, setSelectedRoomId, setSelectedAssetId]);

  const activeGraphId = selectedAsset?.id ?? selectedRoom?.id ?? null;
  const graphConnections = useMemo(() => {
    if (!activeGraphId) return null;
    return inspectNodeConnections(activeGraphId, organization.id, twinNodes, twinEdges);
  }, [activeGraphId, organization.id, twinNodes, twinEdges]);

  const hourLabels = useMemo(
    () => Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`),
    [],
  );

  const roomSeries = useMemo(() => {
    if (!selectedRoom) return [];
    if (twin3d.heatmapMetric === 'water') return selectedRoom.hourlyWaterL;
    if (twin3d.heatmapMetric === 'carbon') return selectedRoom.hourlyCarbonKg;
    if (twin3d.heatmapMetric === 'temp') return selectedRoom.hourlyTempC;
    return selectedRoom.hourlyEnergyKwh;
  }, [selectedRoom, twin3d.heatmapMetric]);

  const roomBaselineSeries = useMemo(() => {
    if (twin3d.beforeAfterMode !== 'before_after') return undefined;
    return roomSeries.map((v) => Number((v * 1.18).toFixed(1)));
  }, [roomSeries, twin3d.beforeAfterMode]);

  const currentMetricUnit =
    twin3d.heatmapMetric === 'water'
      ? 'L/h'
      : twin3d.heatmapMetric === 'carbon'
        ? 'kgCO₂e/h'
        : twin3d.heatmapMetric === 'temp'
          ? '°C'
          : 'kWh';

  const linkedIssue = useMemo(
    () =>
      issues.find(
        (i) =>
          (selectedAsset && i.assetId === selectedAsset.id) ||
          (selectedRoom && i.roomId === selectedRoom.id),
      ) ?? null,
    [issues, selectedAsset, selectedRoom],
  );

  return (
    <div className="flex flex-col lg:h-[calc(100vh-64px)] lg:min-h-[620px] lg:overflow-hidden bg-[var(--ws-canvas)]">
      {/* Compact Workspace Sub-toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-[var(--ws-line)] bg-[var(--ws-surface-1)] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setTreeOpen((v) => !v)}
            className="hidden lg:inline-flex px-2.5 py-1.5 text-xs font-medium rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)] hover:bg-[var(--ws-surface-3)] whitespace-nowrap"
          >
            {treeOpen ? 'Hide Tree' : 'Spatial Tree'}
          </button>
          <div className="text-xs text-[var(--ws-text-secondary)] truncate">
            <span className="font-semibold text-[var(--ws-text-primary)]">
              {activeSite.name}
            </span>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
            <span>
              {twin3d.selectedFloorLevel === null
                ? 'All 3 Floors'
                : floors.find((f) => f.level === twin3d.selectedFloorLevel)?.name}
            </span>
            {selectedRoom && (
              <>
                <span className="mx-1.5" aria-hidden="true">
                  /
                </span>
                <span className="text-[var(--ws-brand-teal)] font-medium">
                  {selectedRoom.code} · {selectedRoom.name}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center p-0.5 rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-2)]">
            <button
              type="button"
              onClick={() => setTwin3d((p) => ({ ...p, viewMode: '3d' }))}
              className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                twin3d.viewMode === '3d'
                  ? 'bg-[var(--ws-surface-1)] text-[var(--ws-text-primary)]'
                  : 'text-[var(--ws-text-secondary)]'
              }`}
            >
              3D Scene
            </button>
            <button
              type="button"
              onClick={() => setTwin3d((p) => ({ ...p, viewMode: '2d' }))}
              className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap ${
                twin3d.viewMode === '2d'
                  ? 'bg-[var(--ws-surface-1)] text-[var(--ws-text-primary)]'
                  : 'text-[var(--ws-text-secondary)]'
              }`}
            >
              Open in 2D
            </button>
          </div>

          <button
            type="button"
            onClick={() => setScreen('twin-editor')}
            className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)] hover:bg-[var(--ws-surface-3)] whitespace-nowrap"
          >
            Edit Twin Geometry
          </button>
        </div>
      </div>

      {/* Main 3-Pane Twin Workspace */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 lg:overflow-hidden">
        {/* Left Synchronized Accessible Object Tree */}
        {treeOpen && (
          <aside
            aria-label="Spatial Object Hierarchy"
            className="hidden lg:flex flex-col w-64 shrink-0 border-r border-[var(--ws-line)] bg-[var(--ws-surface-1)] overflow-y-auto"
          >
            <div className="p-3 border-b border-[var(--ws-line)]">
              <div className="text-xs font-semibold text-[var(--ws-text-primary)]">
                Spatial Resource Tree
              </div>
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setTwin3d((p) => ({ ...p, selectedFloorLevel: null }))}
                  className={`px-2 py-1 text-xs rounded ${
                    twin3d.selectedFloorLevel === null
                      ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] font-medium'
                      : 'bg-[var(--ws-surface-2)] text-[var(--ws-text-secondary)]'
                  }`}
                >
                  All
                </button>
                {floors.map((flr) => (
                  <button
                    key={flr.id}
                    type="button"
                    onClick={() => setTwin3d((p) => ({ ...p, selectedFloorLevel: flr.level }))}
                    className={`px-2 py-1 text-xs rounded font-mono-tabular ${
                      twin3d.selectedFloorLevel === flr.level
                        ? 'bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)] font-medium'
                        : 'bg-[var(--ws-surface-2)] text-[var(--ws-text-secondary)]'
                    }`}
                  >
                    L{flr.level + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-2 space-y-3">
              {floors.map((flr) => {
                if (
                  twin3d.selectedFloorLevel !== null &&
                  twin3d.selectedFloorLevel !== flr.level
                ) {
                  return null;
                }
                const fRooms = siteRooms.filter((r) => r.level === flr.level);
                return (
                  <div key={flr.id}>
                    <div className="px-2 py-1 text-xs font-medium text-[var(--ws-text-muted)]">
                      L{flr.level + 1} · {flr.modelState === 'reviewed' ? 'Reviewed' : 'Needs Review'}
                    </div>
                    <div className="space-y-0.5">
                      {fRooms.map((r) => {
                        const isSel = selectedRoomId === r.id && !selectedAssetId;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedAssetId(null);
                              setSelectedRoomId(r.id);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between gap-2 transition-colors ${
                              isSel
                                ? 'bg-[var(--ws-surface-3)] text-[var(--ws-brand-teal)] font-medium'
                                : 'text-[var(--ws-text-primary)] hover:bg-[var(--ws-surface-2)]'
                            }`}
                          >
                            <span className="truncate">
                              <span className="font-mono-tabular text-[var(--ws-text-muted)] mr-1.5">
                                {r.code}
                              </span>
                              {r.name}
                            </span>
                            {r.hasAnomaly && (
                              <span className="text-[10px] font-mono-tabular text-[var(--ws-danger)] shrink-0">
                                !
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 border-t border-[var(--ws-line)]">
                <div className="px-2 py-1 text-xs font-medium text-[var(--ws-text-muted)]">
                  Equipment & Meters ({siteAssets.length})
                </div>
                <div className="space-y-0.5">
                  {siteAssets.map((a) => {
                    const isSel = selectedAssetId === a.id;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(a.id);
                          if (a.roomId) setSelectedRoomId(a.roomId);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between gap-2 ${
                          isSel
                            ? 'bg-[var(--ws-surface-3)] text-[var(--ws-brand-teal)] font-medium'
                            : 'text-[var(--ws-text-secondary)] hover:bg-[var(--ws-surface-2)]'
                        }`}
                      >
                        <span className="truncate">{a.name}</span>
                        <span className="font-mono-tabular text-[11px] shrink-0">
                          {a.powerKw < 0 ? `${a.powerKw}kW` : `${a.powerKw}kW`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Center 3D / 2D Spatial Viewport + Integrated Control Strip */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="relative h-[360px] sm:h-[420px] lg:h-auto lg:flex-1 min-w-0 min-h-0">
            {twin3d.viewMode === '3d' ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full text-sm text-[var(--ws-text-secondary)]">
                    Loading 3D Resource Twin scene...
                  </div>
                }
              >
                <LazyBuildingTwin3D
                  rooms={siteRooms}
                  assets={siteAssets}
                  edges={twinEdges}
                  twin3d={twin3d}
                  selectedRoomId={selectedRoomId}
                  selectedAssetId={selectedAssetId}
                  onSelectRoom={(id: string) => {
                    setSelectedAssetId(null);
                    setSelectedRoomId(id);
                  }}
                  onSelectAsset={(id: string) => {
                    setSelectedAssetId(id);
                    const ast = siteAssets.find((a) => a.id === id);
                    if (ast?.roomId) setSelectedRoomId(ast.roomId);
                  }}
                  theme={theme}
                  onFallbackTo2D={() => setTwin3d((p) => ({ ...p, viewMode: '2d' }))}
                />
              </Suspense>
            ) : (
              <BuildingTwin2D
                floors={floors}
                rooms={siteRooms}
                assets={siteAssets}
                twin3d={twin3d}
                selectedRoomId={selectedRoomId}
                selectedAssetId={selectedAssetId}
                onSelectRoom={(id) => {
                  setSelectedAssetId(null);
                  setSelectedRoomId(id);
                }}
                onSelectAsset={(id) => setSelectedAssetId(id)}
              />
            )}

            {/* Top-Left Heatmap Legend & Before/After Indicator */}
            <div className="absolute top-3 left-3 z-10 pointer-events-auto max-w-[calc(100%-24px)] rounded-md border border-[var(--ws-line)] bg-[var(--ws-surface-1)] px-3 py-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="font-medium text-[var(--ws-text-primary)]">
                  {twin3d.heatmapMetric === 'none'
                    ? 'Architectural Layer'
                    : `Heatmap: ${twin3d.heatmapMetric.toUpperCase()} (${currentMetricUnit})`}
                </span>
                <span className="text-[var(--ws-text-muted)] font-mono-tabular">
                  {String(twin3d.timeHour).padStart(2, '0')}:00
                </span>
                {twin3d.beforeAfterMode === 'before_after' && (
                  <span className="font-medium text-[var(--ws-brand-teal)]">
                    Modeled Post-Intervention (-22% est.)
                  </span>
                )}
              </div>
              {twin3d.heatmapMetric !== 'none' && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--ws-text-secondary)]">
                  <span>Low</span>
                  <div
                    className="h-2 w-20 sm:w-24 rounded-sm"
                    style={{
                      background:
                        twin3d.heatmapMetric === 'water'
                          ? 'linear-gradient(90deg, #124A6D, #40B9E8)'
                          : twin3d.heatmapMetric === 'carbon'
                            ? 'linear-gradient(90deg, #26543A, #9DDB83)'
                            : twin3d.heatmapMetric === 'temp'
                              ? 'linear-gradient(90deg, #3B82F6, #FF7185)'
                              : 'linear-gradient(90deg, #145C5A, #FFB45E)',
                    }}
                  />
                  <span>Peak</span>
                  <span className="ml-1 inline-flex items-center gap-1">
                    <span className="inline-block w-3 h-2.5 border border-[var(--ws-line)] ws-hatch-missing" />
                    <span>Missing</span>
                  </span>
                </div>
              )}
            </div>

            {/* Anomaly Scan Active Callout (only when active) */}
            {twin3d.anomalyScanActive && anomalyRooms.length > 0 && (
              <div className="absolute top-3 right-3 z-10 max-w-xs rounded-md border border-[var(--ws-danger)] bg-[var(--ws-surface-1)] p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--ws-danger)]">
                    Candidate Anomaly {(twin3d.anomalyScanIndex % anomalyRooms.length) + 1} of{' '}
                    {anomalyRooms.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setTwin3d((p) => ({ ...p, anomalyScanIndex: p.anomalyScanIndex + 1 }))
                      }
                      className="px-2 py-0.5 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)]"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() => setTwin3d((p) => ({ ...p, anomalyScanActive: false }))}
                      className="px-2 py-0.5 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-secondary)]"
                    >
                      Stop
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-[var(--ws-text-primary)] font-medium">
                  {anomalyRooms[twin3d.anomalyScanIndex % anomalyRooms.length].name}
                </p>
                <p className="mt-1 text-[var(--ws-text-secondary)]">
                  {anomalyRooms[twin3d.anomalyScanIndex % anomalyRooms.length].anomalySummary}
                </p>
              </div>
            )}
          </div>

          {/* Integrated Non-Occluding Spatial Control Strip */}
          <div className="border-t border-[var(--ws-line)] bg-[var(--ws-surface-1)] px-3 py-2 shrink-0">
            <div className="flex items-center justify-between gap-2 lg:hidden mb-1.5">
              <span className="text-[11px] font-medium text-[var(--ws-text-secondary)]">
                3D Scene Controls
              </span>
              <button
                type="button"
                onClick={() => setDockCollapsed((c) => !c)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-secondary)]"
              >
                {dockCollapsed ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Show</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>Hide</span>
                  </>
                )}
              </button>
            </div>

            {!dockCollapsed && (
              <div className="space-y-1.5">
                {/* Row 1: Spatial, Flows & Heatmap Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setTwin3d((p) => ({
                          ...p,
                          exploded: !p.exploded,
                          explodeDistance: !p.exploded ? 1 : 0,
                        }))
                      }
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                        twin3d.exploded
                          ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)] text-[var(--ws-brand-teal)]'
                          : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)]'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{twin3d.exploded ? 'Restore' : 'Explode'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTwin3d((p) => ({ ...p, cutaway: !p.cutaway }))}
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                        twin3d.cutaway
                          ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)] text-[var(--ws-brand-teal)]'
                          : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Cutaway</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTwin3d((p) => ({ ...p, showEnergyFlows: !p.showEnergyFlows }))
                      }
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                        twin3d.showEnergyFlows
                          ? 'border-[var(--ws-energy)] bg-[var(--ws-surface-3)] text-[var(--ws-energy)]'
                          : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-muted)]'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Energy</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTwin3d((p) => ({ ...p, showWaterFlows: !p.showWaterFlows }))
                      }
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                        twin3d.showWaterFlows
                          ? 'border-[var(--ws-water)] bg-[var(--ws-surface-3)] text-[var(--ws-water)]'
                          : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-muted)]'
                      }`}
                    >
                      <Droplets className="w-3.5 h-3.5" />
                      <span>Water</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setTwin3d((p) => ({
                          ...p,
                          anomalyScanActive: !p.anomalyScanActive,
                        }))
                      }
                      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                        twin3d.anomalyScanActive
                          ? 'border-[var(--ws-danger)] bg-[var(--ws-surface-3)] text-[var(--ws-danger)]'
                          : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)]'
                      }`}
                    >
                      <ScanSearch className="w-3.5 h-3.5" />
                      <span>Scan</span>
                    </button>
                  </div>

                  {/* Heatmap Selector */}
                  <div className="flex items-center gap-0.5 p-0.5 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] overflow-x-auto max-w-full">
                    {(
                      [
                        ['energy', 'Energy'],
                        ['water', 'Water'],
                        ['carbon', 'Carbon'],
                        ['temp', 'Temp'],
                        ['none', 'Off'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTwin3d((p) => ({ ...p, heatmapMetric: key }))}
                        className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                          twin3d.heatmapMetric === key
                            ? 'bg-[var(--ws-surface-1)] text-[var(--ws-text-primary)] font-medium'
                            : 'text-[var(--ws-text-secondary)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 2: Time Slider, Before/After, Camera Presets */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5 border-t border-[var(--ws-line)]">
                  <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                    <label
                      htmlFor="twin-time-slider"
                      className="text-xs font-medium text-[var(--ws-text-secondary)] whitespace-nowrap"
                    >
                      History
                    </label>
                    <input
                      id="twin-time-slider"
                      type="range"
                      min={0}
                      max={23}
                      value={twin3d.timeHour}
                      onChange={(e) =>
                        setTwin3d((p) => ({ ...p, timeHour: Number(e.target.value) }))
                      }
                      className="w-full accent-[var(--ws-brand-teal)]"
                    />
                    <span className="text-xs font-mono-tabular text-[var(--ws-text-primary)] w-11 text-right">
                      {String(twin3d.timeHour).padStart(2, '0')}:00
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setTwin3d((p) => ({
                          ...p,
                          beforeAfterMode:
                            p.beforeAfterMode === 'live' ? 'before_after' : 'live',
                        }))
                      }
                      className={`px-2 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                        twin3d.beforeAfterMode === 'before_after'
                          ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)] text-[var(--ws-brand-teal)]'
                          : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-secondary)]'
                      }`}
                    >
                      {twin3d.beforeAfterMode === 'before_after'
                        ? 'After Sim'
                        : 'Before / After'}
                    </button>

                    <div className="flex items-center gap-0.5">
                      <Camera className="w-3.5 h-3.5 text-[var(--ws-text-muted)] mr-0.5" />
                      {(
                        [
                          ['isometric', 'Iso'],
                          ['top', 'Plan'],
                          ['cutaway_north', 'Front'],
                          ['plant_focus', 'Plant'],
                        ] as const
                      ).map(([preset, lbl]) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTwin3d((p) => ({ ...p, cameraPreset: preset }))}
                          className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                            twin3d.cameraPreset === preset
                              ? 'bg-[var(--ws-surface-3)] text-[var(--ws-text-primary)] font-medium'
                              : 'text-[var(--ws-text-secondary)] hover:bg-[var(--ws-surface-2)]'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Contextual Inspector Drawer (340px) */}
        <aside
          aria-label="Selection Inspector"
          className="w-full lg:w-88 shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--ws-line)] bg-[var(--ws-surface-1)] lg:overflow-y-auto p-4 space-y-4"
        >
          {selectedAsset ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                    {selectedAsset.assetClass} · {selectedAsset.sourceId}
                  </div>
                  <h2 className="mt-0.5 text-base font-semibold text-[var(--ws-text-primary)]">
                    {selectedAsset.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAssetId(null)}
                  className="text-xs text-[var(--ws-text-secondary)] hover:text-[var(--ws-text-primary)] underline"
                >
                  Room View
                </button>
              </div>

              <TrustLabel
                score={selectedAsset.trustScore}
                qualityState={selectedAsset.qualityState}
              />

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--ws-line)]">
                <div className="rounded bg-[var(--ws-surface-2)] p-2.5">
                  <div className="text-xs text-[var(--ws-text-muted)]">Active Power</div>
                  <div className="mt-1 text-base font-mono-tabular font-semibold">
                    {selectedAsset.powerKw} kW
                  </div>
                </div>
                <div className="rounded bg-[var(--ws-surface-2)] p-2.5">
                  <div className="text-xs text-[var(--ws-text-muted)]">Water Flow</div>
                  <div className="mt-1 text-base font-mono-tabular font-semibold">
                    {selectedAsset.waterFlowLpm} L/min
                  </div>
                </div>
              </div>

              <div className="text-xs space-y-1.5 text-[var(--ws-text-secondary)]">
                <div className="flex justify-between">
                  <span>Manufacturer</span>
                  <span className="text-[var(--ws-text-primary)] font-medium">
                    {selectedAsset.manufacturer} {selectedAsset.model}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>System</span>
                  <span className="text-[var(--ws-text-primary)]">{selectedAsset.systemName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Performance</span>
                  <span className="font-mono-tabular text-[var(--ws-text-primary)]">
                    {selectedAsset.efficiencyMetric}
                  </span>
                </div>
              </div>

              {selectedAsset.documents.length > 0 && (
                <div className="pt-2 border-t border-[var(--ws-line)]">
                  <div className="text-xs font-medium text-[var(--ws-text-primary)] mb-1.5">
                    Linked Documents ({selectedAsset.documents.length})
                  </div>
                  <ul className="space-y-1">
                    {selectedAsset.documents.map((doc) => (
                      <li
                        key={doc.id}
                        className="text-xs text-[var(--ws-text-secondary)] flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{doc.title}</span>
                        <span className="font-mono-tabular text-[var(--ws-text-muted)] shrink-0">
                          {doc.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : selectedRoom ? (
            <>
              <div>
                <div className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                  {selectedRoom.code} · {selectedRoom.areaSqm} m² · Model: {selectedRoom.modelState}
                </div>
                <h2 className="mt-0.5 text-base font-semibold text-[var(--ws-text-primary)]">
                  {selectedRoom.name}
                </h2>
                <div className="mt-1.5">
                  <TrustLabel
                    score={selectedRoom.trustScore}
                    qualityState={selectedRoom.qualityState}
                  />
                </div>
              </div>

              {/* Inspector Tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)]">
                {(
                  [
                    ['telemetry', 'Telemetry'],
                    ['context', 'Context'],
                    ['graph', 'Graph'],
                  ] as const
                ).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInspectorTab(t)}
                    className={`flex-1 py-1 text-xs font-medium rounded ${
                      inspectorTab === t
                        ? 'bg-[var(--ws-surface-1)] text-[var(--ws-text-primary)]'
                        : 'text-[var(--ws-text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {inspectorTab === 'telemetry' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded bg-[var(--ws-surface-2)] p-2.5">
                      <div className="text-xs text-[var(--ws-text-muted)]">
                        Hour {String(twin3d.timeHour).padStart(2, '0')}:00
                      </div>
                      <div className="mt-1 text-lg font-mono-tabular font-semibold text-[var(--ws-text-primary)]">
                        {selectedRoom.qualityState === 'missing'
                          ? 'Missing'
                          : `${roomSeries[twin3d.timeHour] ?? 0} ${currentMetricUnit}`}
                      </div>
                    </div>
                    <div className="rounded bg-[var(--ws-surface-2)] p-2.5">
                      <div className="text-xs text-[var(--ws-text-muted)]">Indoor IAQ</div>
                      <div className="mt-1 text-sm font-mono-tabular text-[var(--ws-text-primary)]">
                        {selectedRoom.hourlyTempC[twin3d.timeHour]}°C ·{' '}
                        {selectedRoom.hourlyCo2Ppm[twin3d.timeHour]} ppm
                      </div>
                    </div>
                  </div>

                  {selectedRoom.qualityState === 'missing' ? (
                    <div className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-3 text-xs text-[var(--ws-text-secondary)]">
                      No submeter telemetry mapped for {selectedRoom.code}. Missing feeds are never shown as zero consumption.
                    </div>
                  ) : (
                    <Panel className="p-2">
                      <div className="flex items-center justify-between text-[11px] text-[var(--ws-text-muted)] mb-1 px-1">
                        <span>24h Profile ({currentMetricUnit})</span>
                        <span>{twin3d.beforeAfterMode === 'before_after' ? 'Dashed = Baseline' : 'Observed'}</span>
                      </div>
                      <TimeSeriesChart
                        data={roomSeries}
                        baselineData={roomBaselineSeries}
                        labels={hourLabels}
                        unit={currentMetricUnit}
                        height={135}
                        highlightIndex={twin3d.timeHour}
                        strokeColor={
                          twin3d.heatmapMetric === 'water'
                            ? 'var(--ws-water)'
                            : twin3d.heatmapMetric === 'carbon'
                              ? 'var(--ws-carbon)'
                              : 'var(--ws-energy)'
                        }
                      />
                    </Panel>
                  )}

                  <div className="text-xs text-[var(--ws-text-secondary)]">
                    <span className="font-medium text-[var(--ws-text-primary)]">Provenance:</span>{' '}
                    {selectedRoom.provenance}
                  </div>
                </div>
              )}

              {inspectorTab === 'context' && (
                <div className="space-y-3 text-xs">
                  {linkedIssue ? (
                    <div className="rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <SeverityText severity={linkedIssue.severity} />
                        <span className="font-mono-tabular text-[var(--ws-text-muted)]">
                          {linkedIssue.stage.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="font-medium text-[var(--ws-text-primary)]">
                        {linkedIssue.title}
                      </div>
                      <div className="space-y-1.5 pt-1 border-t border-[var(--ws-line)]">
                        {linkedIssue.contextSignals.map((sig, i) => (
                          <div key={i} className="text-[var(--ws-text-secondary)]">
                            <span className="font-medium text-[var(--ws-text-primary)]">
                              [{sig.mode}]
                            </span>{' '}
                            {sig.label}: {sig.detail}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[var(--ws-text-secondary)]">
                      No active anomalies flagged for {selectedRoom.name}.
                    </p>
                  )}
                </div>
              )}

              {inspectorTab === 'graph' && (
                <div className="space-y-2 text-xs">
                  <div className="text-[var(--ws-text-secondary)]">
                    Unified Spatial Resource Graph links for <strong className="text-[var(--ws-text-primary)]">{selectedRoom.name}</strong>:
                  </div>
                  {graphConnections && (graphConnections.incoming.length > 0 || graphConnections.outgoing.length > 0) ? (
                    <div className="space-y-1.5">
                      {graphConnections.incoming.map(({ edge, source }) => (
                        <div key={edge.id} className="rounded bg-[var(--ws-surface-2)] p-2">
                          <span className="font-medium text-[var(--ws-brand-teal)]">{source?.name}</span>{' '}
                          <span className="font-mono-tabular text-[var(--ws-text-muted)]">
                            --{edge.type}--&gt;
                          </span>{' '}
                          <span>This space ({edge.status})</span>
                        </div>
                      ))}
                      {graphConnections.outgoing.map(({ edge, target }) => (
                        <div key={edge.id} className="rounded bg-[var(--ws-surface-2)] p-2">
                          <span>This space</span>{' '}
                          <span className="font-mono-tabular text-[var(--ws-text-muted)]">
                            --{edge.type}--&gt;
                          </span>{' '}
                          <span className="font-medium text-[var(--ws-brand-blue)]">{target?.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[var(--ws-text-muted)]">
                      Contains {siteAssets.filter((a) => a.roomId === selectedRoom.id).length} mapped equipment asset(s).
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-[var(--ws-text-secondary)]">
              Select any room or mechanical asset in the 3D scene or spatial tree to inspect telemetry, trust lineage, and operational context.
            </div>
          )}

          {/* Contextual Workflow Actions */}
          <div className="pt-3 border-t border-[var(--ws-line)] grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScreen('maintenance')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-[var(--ws-line)] bg-[var(--ws-surface-2)] text-[var(--ws-text-primary)] hover:bg-[var(--ws-surface-3)]"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Work Order</span>
            </button>
            <button
              type="button"
              onClick={() => setScreen('ai-intelligence')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explainable AI</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
