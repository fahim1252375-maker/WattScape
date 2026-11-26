import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ACESFilmicToneMapping, CatmullRomCurve3, Color, DoubleSide, FogExp2, MathUtils, PMREMGenerator, SRGBColorSpace, TubeGeometry, Vector3, type Group, type Mesh, type Scene, type Texture } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Asset, RoomSpace, ThemeMode, TwinEdge } from '../../domain/types';
import type { Twin3DControlsState } from '../../context/WattScapeContext';

// Detect software WebGL once per module load (never from user-agent)
const IS_SOFTWARE_GL: boolean = (() => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
})();

// React Three Fiber owns this scene object; these helpers are invoked only from
// effects where imperative renderer configuration belongs.
function configureSceneEnvironment(scene: Scene, environment: Texture) {
  scene.environment = environment;
}

function configureSceneAppearance(scene: Scene, color: string) {
  scene.background = new Color(color);
  scene.fog = new FogExp2(color, 0.01);
}

function getRoomHeatmapColor(
  room: RoomSpace,
  metric: Twin3DControlsState['heatmapMetric'],
  hour: number,
  beforeAfterMode: Twin3DControlsState['beforeAfterMode'],
  isDark: boolean,
): { color: string; intensity: number; missing: boolean } {
  if (room.qualityState === 'missing') {
    return { color: isDark ? '#243A4E' : '#C8D8E0', intensity: 0.16, missing: true };
  }
  if (metric === 'none') {
    return {
      color: isDark ? '#182D42' : '#D5E3EA',
      intensity: 0.25,
      missing: false,
    };
  }

  let val = 0;
  let maxRef = 1;
  if (metric === 'energy') {
    val = room.hourlyEnergyKwh[hour] ?? 0;
    if (beforeAfterMode === 'before_after') val *= 0.78;
    maxRef = 95;
  } else if (metric === 'water') {
    val = room.hourlyWaterL[hour] ?? 0;
    if (beforeAfterMode === 'before_after') val *= 0.74;
    maxRef = 320;
  } else if (metric === 'carbon') {
    val = room.hourlyCarbonKg[hour] ?? 0;
    if (beforeAfterMode === 'before_after') val *= 0.72;
    maxRef = 28;
  } else if (metric === 'temp') {
    val = room.hourlyTempC[hour] ?? 21;
    maxRef = 26;
  }

  const norm =
    metric === 'temp'
      ? MathUtils.clamp((val - 18) / (26 - 18), 0, 1)
      : MathUtils.clamp(val / maxRef, 0, 1);

  const c = new Color();
  if (metric === 'energy') {
    c.set('#145C5A').lerp(new Color('#FFB45E'), norm);
  } else if (metric === 'water') {
    c.set('#124A6D').lerp(new Color('#40B9E8'), norm);
  } else if (metric === 'carbon') {
    c.set('#26543A').lerp(new Color('#9DDB83'), norm);
  } else {
    c.set('#3B82F6').lerp(new Color('#FF7185'), norm);
  }

  return { color: `#${c.getHexString()}`, intensity: 0.38 + norm * 0.65, missing: false };
}

/**
 * Composite 3-8 part procedural equipment mesh group (never single primitive placeholders).
 */
function AssetAssembly({
  asset,
  floorOffsetY,
  isSelected,
  onSelect,
}: {
  asset: Asset;
  floorOffsetY: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const statusColor =
    asset.status === 'fault'
      ? '#FF7185'
      : asset.status === 'warning'
        ? '#FFB45E'
        : asset.status === 'standby'
          ? '#40B9E8'
          : '#61E6C2';

  const localY = (asset.position3d[1] % 4.4) + floorOffsetY;

  return (
    <group
      position={[asset.position3d[0], localY, asset.position3d[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(asset.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* Steel mounting skid base */}
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.16, 1.4]} />
        <meshStandardMaterial color="#2C3539" roughness={0.75} metalness={0.55} />
      </mesh>

      {asset.assetClass === 'Chiller' && (
        <group>
          {/* Twin cylindrical evaporator & condenser barrels */}
          <mesh position={[0, 0.55, -0.28]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 1.7, 16]} />
            <meshStandardMaterial color="#3E5C6E" roughness={0.32} metalness={0.78} />
          </mesh>
          <mesh position={[0, 0.55, 0.28]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.26, 0.26, 1.7, 16]} />
            <meshStandardMaterial color="#4B6F82" roughness={0.32} metalness={0.78} />
          </mesh>
          {/* Compressor dome */}
          <mesh position={[0.35, 1.02, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.3, 0.48, 14]} />
            <meshStandardMaterial color="#1F2933" roughness={0.45} metalness={0.85} />
          </mesh>
          {/* VFD cabinet */}
          <mesh position={[-0.75, 0.72, 0]} castShadow>
            <boxGeometry args={[0.38, 1.1, 0.9]} />
            <meshStandardMaterial color="#D5DCE0" roughness={0.45} metalness={0.25} />
          </mesh>
        </group>
      )}

      {asset.assetClass === 'Boiler' && (
        <group>
          <mesh position={[-0.2, 0.78, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.42, 1.25, 18]} />
            <meshStandardMaterial color="#8A4B38" roughness={0.4} metalness={0.65} />
          </mesh>
          <mesh position={[0.45, 0.5, 0]} castShadow>
            <boxGeometry args={[0.55, 0.65, 0.65]} />
            <meshStandardMaterial color="#27323A" roughness={0.5} metalness={0.7} />
          </mesh>
          {/* Flue exhaust stack */}
          <mesh position={[-0.2, 1.65, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.14, 0.7, 12]} />
            <meshStandardMaterial color="#9BA8B0" roughness={0.28} metalness={0.9} />
          </mesh>
        </group>
      )}

      {asset.assetClass === 'Pump' && (
        <group>
          {[-0.55, 0, 0.55].map((px, idx) => (
            <group key={idx} position={[px, 0, 0]}>
              <mesh position={[0, 0.55, 0]} castShadow>
                <cylinderGeometry args={[0.14, 0.16, 0.78, 12]} />
                <meshStandardMaterial color="#1D6FA3" roughness={0.35} metalness={0.75} />
              </mesh>
              <mesh position={[0, 1.06, 0]} castShadow>
                <cylinderGeometry args={[0.16, 0.16, 0.25, 12]} />
                <meshStandardMaterial color="#1B2529" roughness={0.45} metalness={0.8} />
              </mesh>
            </group>
          ))}
          {/* Header manifold */}
          <mesh position={[0, 0.35, 0.42]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 1.65, 10]} />
            <meshStandardMaterial color="#5CC7F2" roughness={0.3} metalness={0.8} />
          </mesh>
        </group>
      )}

      {asset.assetClass === 'Switchgear' && (
        <group>
          {[-0.6, 0, 0.6].map((bx, idx) => (
            <mesh key={idx} position={[bx, 0.85, 0]} castShadow>
              <boxGeometry args={[0.54, 1.4, 0.92]} />
              <meshStandardMaterial color="#4B5961" roughness={0.42} metalness={0.62} />
            </mesh>
          ))}
          {/* Copper busway top collar */}
          <mesh position={[0, 1.62, 0]}>
            <boxGeometry args={[1.65, 0.16, 0.5]} />
            <meshStandardMaterial color="#B87333" roughness={0.28} metalness={0.92} />
          </mesh>
        </group>
      )}

      {(asset.assetClass === 'AHU' || asset.assetClass === 'Submeter') && (
        <group>
          <mesh position={[0, 0.68, 0]} castShadow>
            <boxGeometry args={[1.8, 1.05, 1.1]} />
            <meshStandardMaterial color="#7B8C94" roughness={0.48} metalness={0.45} />
          </mesh>
          <mesh position={[0.65, 0.85, 0.58]}>
            <boxGeometry args={[0.42, 0.56, 0.1]} />
            <meshStandardMaterial color="#1B252A" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[-0.45, 1.32, 0]}>
            <boxGeometry args={[0.7, 0.25, 0.7]} />
            <meshStandardMaterial color="#55656D" roughness={0.5} metalness={0.5} />
          </mesh>
        </group>
      )}

      {asset.assetClass === 'PVArray' && (
        <group>
          {[-0.55, 0.55].map((rz, idx) => (
            <group key={idx} position={[0, 0.45, rz * 0.9]} rotation={[-0.28, 0, 0]}>
              <mesh castShadow>
                <boxGeometry args={[3.6, 0.08, 1.35]} />
                <meshStandardMaterial color="#182C4A" roughness={0.2} metalness={0.85} />
              </mesh>
              <mesh position={[0, -0.06, 0]}>
                <boxGeometry args={[3.68, 0.05, 1.42]} />
                <meshStandardMaterial color="#A8B5BC" roughness={0.35} metalness={0.85} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {/* Status beacon + selection ring */}
      <mesh position={[0, 1.85, 0]}>
        <octahedronGeometry args={[isSelected || hovered ? 0.24 : 0.16, 0]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isSelected ? 1.4 : 0.65}
          roughness={0.25}
        />
      </mesh>

      {(isSelected || hovered) && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.25, 1.48, 32]} />
          <meshBasicMaterial color={isSelected ? '#61E6C2' : '#40B9E8'} side={DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Animated resource flow tube + traveling pulse beads along graph edges.
 */
function ResourceFlowConduit({
  from,
  to,
  color,
  animate,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  animate: boolean;
}) {
  const pulseRef = useRef<Mesh>(null);
  const curve = useMemo(() => {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 0.9;
    return new CatmullRomCurve3([start, mid, end]);
  }, [from, to]);

  const tubeGeo = useMemo(() => new TubeGeometry(curve, 20, 0.065, 8, false), [curve]);

  useEffect(() => {
    return () => {
      tubeGeo.dispose();
    };
  }, [tubeGeo]);

  useFrame((state) => {
    if (!pulseRef.current || !animate) return;
    const t = (state.clock.getElapsedTime() * 0.42) % 1;
    curve.getPointAt(t, pulseRef.current.position);
  });

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.45}
          transparent
          opacity={0.72}
          roughness={0.3}
        />
      </mesh>
      <mesh ref={pulseRef} position={from}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#FFFFFF" emissive={color} emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

function SceneContent({
  rooms,
  assets,
  edges,
  twin3d,
  selectedRoomId,
  selectedAssetId,
  onSelectRoom,
  onSelectAsset,
  theme,
}: {
  rooms: RoomSpace[];
  assets: Asset[];
  edges: TwinEdge[];
  twin3d: Twin3DControlsState;
  selectedRoomId: string | null;
  selectedAssetId: string | null;
  onSelectRoom: (id: string) => void;
  onSelectAsset: (id: string) => void;
  theme: ThemeMode;
}) {
  const { gl, scene, camera, invalidate } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const isDark = theme === 'dark';

  // Animated floor Y offsets driven smoothly by GSAP
  const floorGroupRefs = useRef<Record<number, Group | null>>({});

  // Setup Studio RoomEnvironment & Tone Mapping once
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    configureSceneEnvironment(scene, env);
    return () => {
      pmrem.dispose();
      env.dispose();
    };
  }, [gl, scene]);

  // Sync background & fog with Midnight Resource Intelligence theme
  useEffect(() => {
    const bgHex = isDark ? '#07121F' : '#EAF1F4';
    configureSceneAppearance(scene, bgHex);
    invalidate();
  }, [isDark, scene, invalidate]);

  // Smooth GSAP exploded-floor transition
  useEffect(() => {
    const levels = [0, 1, 2];
    levels.forEach((lvl) => {
      const grp = floorGroupRefs.current[lvl];
      if (!grp) return;
      const baseElevation = lvl * 4.4;
      const explodeBonus = twin3d.exploded ? lvl * (3.6 * Math.max(0.35, twin3d.explodeDistance || 1)) : 0;
      const targetY = baseElevation + explodeBonus;
      gsap.to(grp.position, {
        y: targetY,
        duration: 0.65,
        ease: 'power3.out',
        onUpdate: () => invalidate(),
      });
    });
  }, [twin3d.exploded, twin3d.explodeDistance, invalidate]);

  // Smooth GSAP camera preset choreography
  useEffect(() => {
    if (!controlsRef.current) return;
    const targetMap: Record<
      Twin3DControlsState['cameraPreset'],
      { pos: [number, number, number]; target: [number, number, number] }
    > = {
      isometric: { pos: [28, 22, 28], target: [0, 4.5, 0] },
      top: { pos: [0.1, 42, 0.1], target: [0, 4, 0] },
      cutaway_north: { pos: [0, 14, 34], target: [0, 4.5, 0] },
      plant_focus: { pos: [14, 8, 16], target: [5.5, 1.2, 4.5] },
    };
    const preset = targetMap[twin3d.cameraPreset];
    gsap.to(camera.position, {
      x: preset.pos[0],
      y: preset.pos[1],
      z: preset.pos[2],
      duration: 0.75,
      ease: 'power3.out',
      onUpdate: () => {
        controlsRef.current?.update();
        invalidate();
      },
    });
    gsap.to(controlsRef.current.target, {
      x: preset.target[0],
      y: preset.target[1],
      z: preset.target[2],
      duration: 0.75,
      ease: 'power3.out',
    });
  }, [twin3d.cameraPreset, camera, invalidate]);

  // Pace software-WebGL invalidation gently when flow animation is running
  useEffect(() => {
    if (!twin3d.showEnergyFlows && !twin3d.showWaterFlows) return;
    const intervalMs = IS_SOFTWARE_GL ? 140 : 33;
    const id = window.setInterval(() => {
      invalidate();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [twin3d.showEnergyFlows, twin3d.showWaterFlows, invalidate]);

  const explodeMult = twin3d.exploded ? 3.6 * Math.max(0.35, twin3d.explodeDistance || 1) : 0;

  // Lookup node world coordinates for resource flow conduits
  const nodeCoordMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    rooms.forEach((r) => {
      const y = r.level * (4.4 + explodeMult) + 1.0;
      map.set(r.id, [r.x, y, r.z]);
    });
    assets.forEach((a) => {
      const lvl = a.floorId === 'flr_mnl_3' ? 2 : a.floorId === 'flr_mnl_2' ? 1 : 0;
      const y = (a.position3d[1] % 4.4) + lvl * (4.4 + explodeMult) + 1.2;
      map.set(a.id, [a.position3d[0], y, a.position3d[2]]);
    });
    return map;
  }, [rooms, assets, explodeMult]);

  const anomalyRooms = useMemo(() => rooms.filter((r) => r.hasAnomaly), [rooms]);
  const activeScanRoomId = twin3d.anomalyScanActive
    ? anomalyRooms[twin3d.anomalyScanIndex % Math.max(1, anomalyRooms.length)]?.id
    : null;

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enableDamping={!IS_SOFTWARE_GL}
        dampingFactor={0.07}
        minDistance={12}
        maxDistance={65}
        maxPolarAngle={Math.PI / 2 - 0.05}
        onChange={() => invalidate()}
      />

      {/* Warm Key / Cool Fill Studio Architectural Lighting */}
      <hemisphereLight
        args={[isDark ? '#8ACAE6' : '#E3F2F9', isDark ? '#091524' : '#94ABB8', 0.92]}
      />
      <directionalLight
        position={[24, 34, 20]}
        intensity={1.7}
        color="#FFF5E6"
        castShadow={!IS_SOFTWARE_GL}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-20, 16, -18]} intensity={0.62} color="#40B9E8" />

      {/* Grounded Architectural Plinth & Subtle Topographic Landscape Grid */}
      <group position={[0, -0.35, 0]}>
        <mesh receiveShadow position={[0, -0.25, 0]}>
          <boxGeometry args={[32, 0.5, 24]} />
          <meshStandardMaterial
            color={isDark ? '#0D1B2A' : '#CBD8E0'}
            roughness={0.82}
            metalness={0.14}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.52, 0]}>
          <planeGeometry args={[140, 140]} />
          <meshStandardMaterial
            color={isDark ? '#07121F' : '#DCE7ED'}
            roughness={0.95}
            metalness={0.05}
          />
        </mesh>
        <gridHelper
          args={[84, 42, isDark ? '#284255' : '#AEC2CE', isDark ? '#12263A' : '#C9D8E0']}
          position={[0, -0.49, 0]}
        />
      </group>

      {/* Building Floors 0, 1, 2 */}
      {[0, 1, 2].map((lvl) => {
        const isFloorVisible =
          twin3d.selectedFloorLevel === null || twin3d.selectedFloorLevel === lvl;
        const floorRooms = rooms.filter((r) => r.level === lvl);
        const floorAssets = assets.filter((a) => {
          const aLvl = a.floorId === 'flr_mnl_3' ? 2 : a.floorId === 'flr_mnl_2' ? 1 : 0;
          return aLvl === lvl;
        });

        return (
          <group
            key={lvl}
            ref={(el) => {
              floorGroupRefs.current[lvl] = el;
            }}
            position={[0, lvl * 4.4, 0]}
            visible={isFloorVisible}
          >
            {/* Structural Concrete Slab + Edge Banding */}
            <mesh receiveShadow position={[0, 0, -0.5]}>
              <boxGeometry args={[24.6, 0.34, 21.0]} />
              <meshStandardMaterial
                color={isDark ? '#12263A' : '#DDE8ED'}
                roughness={0.72}
                metalness={0.2}
              />
            </mesh>
            <mesh position={[0, 0.175, -0.5]}>
              <boxGeometry args={[24.7, 0.045, 21.1]} />
              <meshStandardMaterial
                color={isDark ? '#284255' : '#9CB4C2'}
                roughness={0.45}
                metalness={0.48}
              />
            </mesh>

            {/* Architectural Perimeter Columns (4 corners + midpoints) */}
            {[
              [-12, -10.8],
              [0, -10.8],
              [12, -10.8],
              [-12, 9.8],
              [12, 9.8],
            ].map(([cx, cz], i) => (
              <mesh key={i} position={[cx, 1.9, cz]} castShadow>
                <boxGeometry args={[0.42, 3.8, 0.42]} />
                <meshStandardMaterial color={isDark ? '#38576E' : '#7D96A6'} roughness={0.36} metalness={0.68} />
              </mesh>
            ))}

            {/* Translucent Curtain Wall Shell (toggled by cutaway) */}
            {!twin3d.cutaway && (
              <mesh position={[0, 1.95, -0.5]}>
                <boxGeometry args={[24.4, 3.7, 20.8]} />
                <meshStandardMaterial
                  color={isDark ? '#40B9E8' : '#8FB7CC'}
                  transparent
                  opacity={0.14}
                  roughness={0.14}
                  metalness={0.22}
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* Room Spatial Volumes */}
            {floorRooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const isScanned = activeScanRoomId === room.id;
              const heat = getRoomHeatmapColor(
                room,
                twin3d.heatmapMetric,
                twin3d.timeHour,
                twin3d.beforeAfterMode,
                isDark,
              );

              return (
                <group
                  key={room.id}
                  position={[room.x, 0.2, room.z]}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRoom(room.id);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = 'default';
                  }}
                >
                  {/* Floor Heatmap Plate (offset +0.025 on Y to prevent Z-fighting) */}
                  <mesh position={[0, 0.025, 0]} receiveShadow>
                    <boxGeometry args={[room.width - 0.35, 0.08, room.depth - 0.35]} />
                    <meshStandardMaterial
                      color={heat.color}
                      emissive={isSelected || isScanned ? '#61E6C2' : heat.color}
                      emissiveIntensity={isSelected ? 0.58 : isScanned ? 0.88 : heat.intensity * 0.25}
                      roughness={0.55}
                      metalness={0.1}
                    />
                  </mesh>

                  {/* Translucent Room Boundary Volume */}
                  <mesh position={[0, room.height * 0.42, 0]}>
                    <boxGeometry args={[room.width - 0.4, room.height * 0.82, room.depth - 0.4]} />
                    <meshStandardMaterial
                      color={isSelected ? '#61E6C2' : isScanned ? '#FF7185' : heat.color}
                      transparent
                      opacity={isSelected ? 0.28 : isScanned ? 0.32 : heat.missing ? 0.08 : 0.14}
                      roughness={0.35}
                      depthWrite={false}
                    />
                  </mesh>

                  {/* Wireframe / Selection Perimeter Rim */}
                  {(isSelected || isScanned || room.hasAnomaly) && (
                    <mesh position={[0, 0.1, 0]}>
                      <boxGeometry args={[room.width - 0.3, 0.14, room.depth - 0.3]} />
                      <meshBasicMaterial
                        color={isScanned || room.hasAnomaly ? '#FF7185' : '#61E6C2'}
                        wireframe
                      />
                    </mesh>
                  )}
                </group>
              );
            })}

            {/* Equipment Assemblies on this floor */}
            {floorAssets.map((asset) => (
              <AssetAssembly
                key={asset.id}
                asset={asset}
                floorOffsetY={0}
                isSelected={selectedAssetId === asset.id}
                onSelect={onSelectAsset}
              />
            ))}

            {/* Roof PV Support Deck on Level 3 */}
            {lvl === 2 && !twin3d.cutaway && (
              <mesh position={[0, 3.85, -0.5]} receiveShadow>
                <boxGeometry args={[24.6, 0.28, 21.0]} />
                <meshStandardMaterial color={isDark ? '#0D1B2A' : '#CBD8E0'} roughness={0.78} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Animated Resource Flow Conduits */}
      {edges.map((edge) => {
        if (edge.resourceType === 'energy' && !twin3d.showEnergyFlows) return null;
        if (edge.resourceType === 'water' && !twin3d.showWaterFlows) return null;
        if (!edge.resourceType) return null;
        const fromPos = nodeCoordMap.get(edge.fromId);
        const toPos = nodeCoordMap.get(edge.toId);
        if (!fromPos || !toPos) return null;
        return (
          <ResourceFlowConduit
            key={edge.id}
            from={fromPos}
            to={toPos}
            color={edge.resourceType === 'water' ? '#40B9E8' : '#FFB45E'}
            animate={!twin3d.exploded}
          />
        );
      })}
    </>
  );
}

export function BuildingTwin3D({
  rooms,
  assets,
  edges,
  twin3d,
  selectedRoomId,
  selectedAssetId,
  onSelectRoom,
  onSelectAsset,
  theme,
  onFallbackTo2D,
}: {
  rooms: RoomSpace[];
  assets: Asset[];
  edges: TwinEdge[];
  twin3d: Twin3DControlsState;
  selectedRoomId: string | null;
  selectedAssetId: string | null;
  onSelectRoom: (id: string) => void;
  onSelectAsset: (id: string) => void;
  theme: ThemeMode;
  onFallbackTo2D: () => void;
}) {
  const [contextLost, setContextLost] = useState(false);

  if (contextLost) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[var(--ws-surface-2)]">
        <p className="text-sm font-medium text-[var(--ws-text-primary)]">
          WebGL rendering context paused or unavailable on this device.
        </p>
        <p className="mt-1 text-xs text-[var(--ws-text-secondary)]">
          WattScape preserves complete spatial navigation via the synchronized 2D architectural plan.
        </p>
        <button
          type="button"
          onClick={onFallbackTo2D}
          className="mt-4 px-4 py-2 text-xs font-medium rounded-md bg-[var(--ws-brand-teal)] text-[var(--ws-brand-teal-fg)]"
        >
          Open Equivalent 2D Spatial View
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full" data-testid="wattscape-3d-canvas-wrap">
      <Canvas
        frameloop="demand"
        shadows={!IS_SOFTWARE_GL}
        dpr={IS_SOFTWARE_GL ? 1 : [1, 2]}
        camera={{ position: [28, 22, 28], fov: 40, near: 0.5, far: 250 }}
        gl={{
          antialias: !IS_SOFTWARE_GL,
          powerPreference: 'high-performance',
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = SRGBColorSpace;
          const dom = gl.domElement;
          dom.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setContextLost(true);
          });
          dom.addEventListener('webglcontextrestored', () => {
            setContextLost(false);
          });
        }}
      >
        <SceneContent
          rooms={rooms}
          assets={assets}
          edges={edges}
          twin3d={twin3d}
          selectedRoomId={selectedRoomId}
          selectedAssetId={selectedAssetId}
          onSelectRoom={onSelectRoom}
          onSelectAsset={onSelectAsset}
          theme={theme}
        />
      </Canvas>
    </div>
  );
}
