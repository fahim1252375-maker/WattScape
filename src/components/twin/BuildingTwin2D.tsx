import React from 'react';
import type { Asset, FloorDef, RoomSpace } from '../../domain/types';
import type { Twin3DControlsState } from '../../context/WattScapeContext';
import { TrustLabel } from '../ui/Primitives';

/**
 * Accessible 2D architectural plan & spatial table alternative (spec §1, §5.7, §6.3).
 */
export function BuildingTwin2D({
  floors,
  rooms,
  assets,
  twin3d,
  selectedRoomId,
  selectedAssetId,
  onSelectRoom,
  onSelectAsset,
}: {
  floors: FloorDef[];
  rooms: RoomSpace[];
  assets: Asset[];
  twin3d: Twin3DControlsState;
  selectedRoomId: string | null;
  selectedAssetId: string | null;
  onSelectRoom: (id: string) => void;
  onSelectAsset: (id: string) => void;
}) {
  const activeLevel = twin3d.selectedFloorLevel ?? 1;
  const visibleFloors =
    twin3d.selectedFloorLevel === null
      ? floors
      : floors.filter((f) => f.level === activeLevel);

  return (
    <div
      className="h-full overflow-y-auto p-4 space-y-6 bg-[var(--ws-canvas)]"
      data-testid="wattscape-2d-plan"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--ws-text-secondary)]">
        <span>
          Equivalent 2D Architectural Plan · Keyboard-accessible spatial layout · Hour{' '}
          <span className="font-mono-tabular font-medium text-[var(--ws-text-primary)]">
            {String(twin3d.timeHour).padStart(2, '0')}:00
          </span>
        </span>
        <span>Heatmap: {twin3d.heatmapMetric.toUpperCase()}</span>
      </div>

      {visibleFloors.map((floor) => {
        const floorRooms = rooms.filter((r) => r.level === floor.level);
        return (
          <div
            key={floor.id}
            className="rounded-lg border border-[var(--ws-line)] bg-[var(--ws-surface-1)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-[var(--ws-text-primary)]">
                {floor.name}
              </h3>
              <span className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                {floor.areaSqm.toLocaleString()} m² · Model state: {floor.modelState}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {floorRooms.map((room) => {
                const isSelected = selectedRoomId === room.id;
                const roomAssets = assets.filter((a) => a.roomId === room.id);
                const val =
                  twin3d.heatmapMetric === 'water'
                    ? `${room.hourlyWaterL[twin3d.timeHour] ?? 0} L/h`
                    : twin3d.heatmapMetric === 'carbon'
                      ? `${room.hourlyCarbonKg[twin3d.timeHour] ?? 0} kgCO₂e`
                      : twin3d.heatmapMetric === 'temp'
                        ? `${room.hourlyTempC[twin3d.timeHour] ?? 21} °C`
                        : `${room.hourlyEnergyKwh[twin3d.timeHour] ?? 0} kWh`;

                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => onSelectRoom(room.id)}
                    className={`text-left rounded-md border p-3 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--ws-brand-teal)] ${
                      room.qualityState === 'missing' ? 'ws-hatch-missing ' : ''
                    }${
                      isSelected
                        ? 'border-[var(--ws-brand-teal)] bg-[var(--ws-surface-3)]'
                        : 'border-[var(--ws-line)] bg-[var(--ws-surface-2)] hover:bg-[var(--ws-surface-3)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs font-mono-tabular text-[var(--ws-text-muted)]">
                          {room.code} · {room.areaSqm} m²
                        </div>
                        <div className="text-sm font-medium text-[var(--ws-text-primary)]">
                          {room.name}
                        </div>
                      </div>
                      <span className="text-sm font-mono-tabular font-semibold text-[var(--ws-text-primary)]">
                        {room.qualityState === 'missing' ? 'Missing' : val}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <TrustLabel score={room.trustScore} qualityState={room.qualityState} />
                      {room.hasAnomaly && (
                        <span className="text-xs font-medium text-[var(--ws-danger)]">
                          Anomaly Flagged
                        </span>
                      )}
                    </div>

                    {roomAssets.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[var(--ws-line)] flex flex-wrap gap-2">
                        {roomAssets.map((a) => (
                          <span
                            key={a.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAsset(a.id);
                            }}
                            className={`text-xs font-mono-tabular underline cursor-pointer ${
                              selectedAssetId === a.id
                                ? 'text-[var(--ws-brand-teal)] font-semibold'
                                : 'text-[var(--ws-text-secondary)]'
                            }`}
                          >
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
