import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { wattScapeApi } from '../services/apiClient';
import type {
  AiQueryResponse,
  AnnotationComment,
  Asset,
  AuditEvent,
  AutomationRule,
  ConnectorInstance,
  DensityMode,
  EmissionFactor,
  FloorDef,
  ImpactRecord,
  IssueItem,
  Organization,
  OrgMember,
  QualityState,
  ResourceFilter,
  RoomSpace,
  ScenarioAssumption,
  ScreenId,
  Site,
  TelemetryPointItem,
  ThemeMode,
  TwinEdge,
  TwinNode,
  UnitSystem,
  WorkOrder,
} from '../domain/types';
import { DEFAULT_SCENARIO_ASSUMPTIONS } from '../data/demoData';

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  read: boolean;
  targetScreen: ScreenId;
}

export interface Twin3DControlsState {
  exploded: boolean;
  explodeDistance: number; // 0..1
  cutaway: boolean;
  selectedFloorLevel: number | null; // null = all floors
  heatmapMetric: 'energy' | 'water' | 'carbon' | 'temp' | 'none';
  showEnergyFlows: boolean;
  showWaterFlows: boolean;
  anomalyScanActive: boolean;
  anomalyScanIndex: number;
  timeHour: number; // 0..23
  beforeAfterMode: 'live' | 'before_after';
  cameraPreset: 'isometric' | 'top' | 'cutaway_north' | 'plant_focus';
  viewMode: '3d' | '2d';
}

interface WattScapeContextValue {
  screen: ScreenId;
  setScreen: (screen: ScreenId) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  density: DensityMode;
  setDensity: (d: DensityMode) => void;
  unitSystem: UnitSystem;
  setUnitSystem: (u: UnitSystem) => void;
  reducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  resourceFilter: ResourceFilter;
  setResourceFilter: (f: ResourceFilter) => void;

  // Auth & Tenant
  authenticatedUser: { name: string; email: string; role: string } | null;
  signInDemo: (email: string, role: string) => void;
  signOutDemo: () => void;
  organization: Organization;
  updateOrganization: (patch: Partial<Organization>) => void;
  members: OrgMember[];
  inviteMember: (email: string, role: OrgMember['role']) => void;
  revokeMember: (memberId: string) => void;

  // Portfolio & Sites
  sites: Site[];
  activeSiteId: string;
  setActiveSiteId: (id: string) => void;
  activeSite: Site;

  // Twin Graph & Spatial Data
  floors: FloorDef[];
  rooms: RoomSpace[];
  addRoomToTwin: (room: Omit<RoomSpace, 'id' | 'tenantId'>) => void;
  updateRoomState: (roomId: string, patch: Partial<RoomSpace>) => void;
  assets: Asset[];
  placeAssetInRoom: (assetId: string, roomId: string) => void;
  twinNodes: TwinNode[];
  twinEdges: TwinEdge[];

  // Selection & 3D State
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
  selectedAssetId: string | null;
  setSelectedAssetId: (id: string | null) => void;
  twinInspectorTab: 'telemetry' | 'context' | 'graph';
  setTwinInspectorTab: (tab: 'telemetry' | 'context' | 'graph') => void;
  twin3d: Twin3DControlsState;
  setTwin3d: React.Dispatch<React.SetStateAction<Twin3DControlsState>>;
  focusRoomIn3D: (roomId: string) => void;
  focusAssetIn3D: (assetId: string) => void;
  openSpatialGraphIn3D: () => void;

  // Telemetry & Data Quality
  telemetryPoints: TelemetryPointItem[];
  resolveTelemetryPoint: (pointId: string, newState: QualityState, reason: string) => void;

  // Issues, Work Orders, Comments
  issues: IssueItem[];
  advanceIssueStage: (issueId: string, nextStage: IssueItem['stage']) => void;
  workOrders: WorkOrder[];
  createWorkOrder: (wo: Omit<WorkOrder, 'id' | 'tenantId' | 'status' | 'notes'>) => void;
  updateWorkOrderStatus: (woId: string, status: WorkOrder['status']) => void;

  // Simulation, Impact, Sustainability, Connect, Automation, Security
  scenarioAssumptions: ScenarioAssumption[];
  setScenarioAssumptions: React.Dispatch<React.SetStateAction<ScenarioAssumption[]>>;
  impactLedger: ImpactRecord[];
  verifyImpactRecord: (impactId: string, notes: string) => void;
  connectors: ConnectorInstance[];
  toggleConnectorDryRun: (connectorId: string) => void;
  automationRules: AutomationRule[];
  toggleAutomationRule: (ruleId: string) => void;
  aiPresets: AiQueryResponse[];
  emissionFactors: EmissionFactor[];
  comments: AnnotationComment[];
  addComment: (anchorType: AnnotationComment['anchorType'], anchorId: string, anchorLabel: string, body: string) => void;
  auditEvents: AuditEvent[];
  appendAudit: (action: string, resource: string, outcome?: 'allowed' | 'denied') => void;

  // Notifications & Global Search
  notifications: NotificationItem[];
  markAllNotificationsRead: () => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (q: string) => void;
}

const WattScapeContext = createContext<WattScapeContextValue | null>(null);

export function WattScapeProvider({ children }: { children: React.ReactNode }) {
  const initialSnapshot = useMemo(() => wattScapeApi.fetchInitialWorkspaceSnapshot(), []);

  // Support ?autostart=1 per ultra-mode skill for immediate workspace entry
  const initialScreen: ScreenId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'twin-viewer';
      }
      const reqScreen = params.get('screen') as ScreenId | null;
      if (reqScreen) return reqScreen;
    }
    return 'landing';
  }, []);

  const [screen, setScreen] = useState<ScreenId>(initialScreen);
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [density, setDensity] = useState<DensityMode>('comfortable');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all');

  const [authenticatedUser, setAuthenticatedUser] = useState<{ name: string; email: string; role: string } | null>({
    name: 'Elena Rostova',
    email: 'elena.rostova@meridian-demo.example',
    role: 'Organization Owner',
  });

  const [organization, setOrganization] = useState<Organization>(initialSnapshot.organization);
  const [members, setMembers] = useState<OrgMember[]>(initialSnapshot.members);
  const [sites] = useState<Site[]>(initialSnapshot.sites);
  const [activeSiteId, setActiveSiteId] = useState<string>(initialSnapshot.sites[0].id);
  const [floors] = useState<FloorDef[]>(initialSnapshot.floors);
  const [rooms, setRooms] = useState<RoomSpace[]>(initialSnapshot.rooms);
  const [assets, setAssets] = useState<Asset[]>(initialSnapshot.assets);
  const [twinNodes] = useState<TwinNode[]>(initialSnapshot.twinNodes);
  const [twinEdges] = useState<TwinEdge[]>(initialSnapshot.twinEdges);
  const [telemetryPoints, setTelemetryPoints] = useState<TelemetryPointItem[]>(initialSnapshot.telemetryPoints);
  const [issues, setIssues] = useState<IssueItem[]>(initialSnapshot.issues);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialSnapshot.workOrders);
  const [scenarioAssumptions, setScenarioAssumptions] = useState<ScenarioAssumption[]>(DEFAULT_SCENARIO_ASSUMPTIONS);
  const [impactLedger, setImpactLedger] = useState<ImpactRecord[]>(initialSnapshot.impactLedger);
  const [connectors, setConnectors] = useState<ConnectorInstance[]>(initialSnapshot.connectors);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(initialSnapshot.automationRules);
  const [aiPresets] = useState<AiQueryResponse[]>(initialSnapshot.aiPresets);
  const [emissionFactors] = useState<EmissionFactor[]>(initialSnapshot.emissionFactors);
  const [comments, setComments] = useState<AnnotationComment[]>(initialSnapshot.comments);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(initialSnapshot.auditEvents);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>('rm_201');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [twinInspectorTab, setTwinInspectorTab] = useState<'telemetry' | 'context' | 'graph'>('telemetry');
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

  const [twin3d, setTwin3d] = useState<Twin3DControlsState>({
    exploded: false,
    explodeDistance: 0,
    cutaway: true,
    selectedFloorLevel: null,
    heatmapMetric: 'energy',
    showEnergyFlows: true,
    showWaterFlows: true,
    anomalyScanActive: false,
    anomalyScanIndex: 0,
    timeHour: 14,
    beforeAfterMode: 'live',
    cameraPreset: 'isometric',
    viewMode: '3d',
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'ntf_1',
      title: 'Overnight DI Water Flow Hypothesis',
      detail: 'ISO-7 Cleanroom Suite A recorded 14.2 L/min sustained flow with 0 occupancy.',
      severity: 'critical',
      timestamp: '06:40 UTC',
      read: false,
      targetScreen: 'twin-viewer',
    },
    {
      id: 'ntf_2',
      title: 'Data Trust Alert: SM-203 Unit Mismatch',
      detail: 'Wet Assay VAV Submeter SM-203 trust dropped to 54/100; queued for operator review.',
      severity: 'warning',
      timestamp: '18:12 UTC',
      read: false,
      targetScreen: 'data-quality',
    },
    {
      id: 'ntf_3',
      title: 'Control Request Held for Approval',
      detail: 'AHU-02 night setback reset requires Site Admin approval before BMS write.',
      severity: 'info',
      timestamp: '21:15 UTC',
      read: true,
      targetScreen: 'automation',
    },
  ]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) {
      root.classList.add('ws-reduced-motion');
    } else {
      root.classList.remove('ws-reduced-motion');
    }
  }, [reducedMotion]);

  const setTheme = (mode: ThemeMode) => setThemeState(mode);
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const activeSite = useMemo(
    () => sites.find((s) => s.id === activeSiteId) ?? sites[0],
    [sites, activeSiteId],
  );

  const appendAudit = (action: string, resource: string, outcome: 'allowed' | 'denied' = 'allowed') => {
    const evt: AuditEvent = {
      id: `aud_${Date.now()}`,
      tenantId: organization.id,
      actor: authenticatedUser ? `${authenticatedUser.name} (${authenticatedUser.role})` : 'System',
      action,
      resource,
      beforeHash: `sha256:${Math.random().toString(16).slice(2, 10)}`,
      afterHash: `sha256:${Math.random().toString(16).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      requestId: `req_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      outcome,
    };
    setAuditEvents((prev) => [evt, ...prev]);
  };

  const signInDemo = (email: string, role: string) => {
    const namePart = email.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = namePart
      .split(' ')
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
    setAuthenticatedUser({ name: formattedName || 'Demo Operator', email, role });
    appendAudit('OIDC_DEMO_SESSION_STARTED', `${email} (${role})`);
    setScreen('workspace');
  };

  const signOutDemo = () => {
    setAuthenticatedUser(null);
    setScreen('auth');
  };

  const updateOrganization = (patch: Partial<Organization>) => {
    setOrganization((prev) => ({ ...prev, ...patch }));
    appendAudit('ORG_SETTINGS_UPDATED', Object.keys(patch).join(', '));
  };

  const inviteMember = (email: string, role: OrgMember['role']) => {
    const newMember: OrgMember = {
      id: `usr_${Date.now()}`,
      tenantId: organization.id,
      name: email.split('@')[0],
      email,
      role,
      siteScopes: ['*'],
      status: 'invited',
      invitedAt: new Date().toISOString(),
    };
    setMembers((prev) => [newMember, ...prev]);
    appendAudit('MEMBER_INVITED', `${email} · ${role}`);
  };

  const revokeMember = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, status: 'revoked' } : m)),
    );
    appendAudit('MEMBER_ACCESS_REVOKED', memberId);
  };

  const addRoomToTwin = (roomInput: Omit<RoomSpace, 'id' | 'tenantId'>) => {
    const newRoom: RoomSpace = {
      ...roomInput,
      id: `rm_${Date.now().toString().slice(-4)}`,
      tenantId: organization.id,
    };
    setRooms((prev) => [...prev, newRoom]);
    setSelectedRoomId(newRoom.id);
    appendAudit('ZERO_BIM_ROOM_CREATED', `${newRoom.code} · ${newRoom.name}`);
  };

  const updateRoomState = (roomId: string, patch: Partial<RoomSpace>) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, ...patch } : r)));
    appendAudit('TWIN_ROOM_UPDATED', roomId);
  };

  const placeAssetInRoom = (assetId: string, roomId: string) => {
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;
    setAssets((prev) =>
      prev.map((a) =>
        a.id === assetId
          ? {
              ...a,
              roomId: targetRoom.id,
              floorId: targetRoom.floorId,
              position3d: [targetRoom.x, targetRoom.level * 4.4 + 0.35, targetRoom.z],
              qualityState: 'valid',
              trustScore: 86,
              efficiencyMetric: `Placed in ${targetRoom.code}`,
            }
          : a,
      ),
    );
    appendAudit('ASSET_SPATIALLY_MAPPED', `${assetId} -> ${targetRoom.code}`);
  };

  const focusRoomIn3D = (roomId: string) => {
    const r = rooms.find((item) => item.id === roomId);
    setSelectedAssetId(null);
    setSelectedRoomId(roomId);
    if (r) {
      setTwin3d((prev) => ({ ...prev, selectedFloorLevel: r.level }));
    }
    setScreen('twin-viewer');
  };

  const focusAssetIn3D = (assetId: string) => {
    const a = assets.find((item) => item.id === assetId);
    setSelectedAssetId(assetId);
    if (a?.roomId) {
      setSelectedRoomId(a.roomId);
      const r = rooms.find((item) => item.id === a.roomId);
      if (r) setTwin3d((prev) => ({ ...prev, selectedFloorLevel: r.level }));
    }
    setScreen('twin-viewer');
  };

  const openSpatialGraphIn3D = () => {
    setSelectedAssetId(null);
    if (!selectedRoomId) setSelectedRoomId('rm_201');
    setTwinInspectorTab('graph');
    setScreen('twin-viewer');
  };

  const resolveTelemetryPoint = (pointId: string, newState: QualityState, reason: string) => {
    setTelemetryPoints((prev) =>
      prev.map((pt) => {
        if (pt.id !== pointId) return pt;
        const entry = {
          timestamp: new Date().toISOString(),
          actor: authenticatedUser?.name ?? 'Operator',
          previousState: pt.qualityState,
          newState,
          reason,
        };
        const nextTotal =
          newState === 'corrected' || newState === 'valid'
            ? 88
            : newState === 'rejected'
              ? 35
              : pt.trust.total;
        return {
          ...pt,
          qualityState: newState,
          trust: {
            ...pt.trust,
            total: nextTotal,
            status: nextTotal !== null && nextTotal >= 82 ? 'trusted' : nextTotal !== null && nextTotal >= 60 ? 'caution' : 'degraded',
            reasons: [reason, ...pt.trust.reasons.slice(0, 2)],
          },
          correctionHistory: [entry, ...pt.correctionHistory],
        };
      }),
    );
    appendAudit('DATA_QUALITY_REVIEW_ACTION', `${pointId} -> ${newState}: ${reason}`);
  };

  const advanceIssueStage = (issueId: string, nextStage: IssueItem['stage']) => {
    setIssues((prev) => prev.map((iss) => (iss.id === issueId ? { ...iss, stage: nextStage } : iss)));
    appendAudit('PROBLEM_TO_PROOF_STAGE_CHANGED', `${issueId} -> ${nextStage}`);
  };

  const createWorkOrder = (wo: Omit<WorkOrder, 'id' | 'tenantId' | 'status' | 'notes'>) => {
    const newWo: WorkOrder = {
      ...wo,
      id: `wo_${Date.now().toString().slice(-4)}`,
      tenantId: organization.id,
      status: 'open',
      notes: [`Created by ${authenticatedUser?.name ?? 'Operator'} in WattScape demo workspace.`],
    };
    setWorkOrders((prev) => [newWo, ...prev]);
    appendAudit('WORK_ORDER_CREATED', `${newWo.id} · ${newWo.title}`);
  };

  const updateWorkOrderStatus = (woId: string, status: WorkOrder['status']) => {
    setWorkOrders((prev) => prev.map((w) => (w.id === woId ? { ...w, status } : w)));
    appendAudit('WORK_ORDER_STATUS_UPDATED', `${woId} -> ${status}`);
  };

  const verifyImpactRecord = (impactId: string, notes: string) => {
    setImpactLedger((prev) =>
      prev.map((rec) =>
        rec.id === impactId
          ? {
              ...rec,
              classification: 'verified',
              reviewer: {
                name: authenticatedUser?.name ?? 'Authorized Reviewer',
                role: authenticatedUser?.role ?? 'Energy/Sustainability Analyst',
                reviewedAt: new Date().toISOString(),
                policy: 'Meridian Internal M&V Standard v2',
                checklistPassed: true,
                notes,
              },
            }
          : rec,
      ),
    );
    appendAudit('IMPACT_RECORD_VERIFIED', impactId);
  };

  const toggleConnectorDryRun = (connectorId: string) => {
    setConnectors((prev) =>
      prev.map((c) =>
        c.id === connectorId
          ? { ...c, lastSyncAt: new Date().toISOString(), syncLagSeconds: c.health === 'disabled' ? 0 : 12 }
          : c,
      ),
    );
    appendAudit('CONNECTOR_DRY_RUN_EXECUTED', connectorId);
  };

  const toggleAutomationRule = (ruleId: string) => {
    setAutomationRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r)),
    );
    appendAudit('AUTOMATION_RULE_TOGGLED', ruleId);
  };

  const addComment = (
    anchorType: AnnotationComment['anchorType'],
    anchorId: string,
    anchorLabel: string,
    body: string,
  ) => {
    const next: AnnotationComment = {
      id: `cmt_${Date.now()}`,
      tenantId: organization.id,
      anchorType,
      anchorId,
      anchorLabel,
      author: authenticatedUser?.name ?? 'Operator',
      role: authenticatedUser?.role ?? 'Facilities Operator',
      createdAt: new Date().toISOString(),
      body,
      mentions: [],
    };
    setComments((prev) => [next, ...prev]);
    appendAudit('COLLAB_COMMENT_POSTED', `${anchorType}:${anchorId}`);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <WattScapeContext.Provider
      value={{
        screen,
        setScreen,
        theme,
        toggleTheme,
        setTheme,
        density,
        setDensity,
        unitSystem,
        setUnitSystem,
        reducedMotion,
        setReducedMotion,
        resourceFilter,
        setResourceFilter,
        authenticatedUser,
        signInDemo,
        signOutDemo,
        organization,
        updateOrganization,
        members,
        inviteMember,
        revokeMember,
        sites,
        activeSiteId,
        setActiveSiteId,
        activeSite,
        floors,
        rooms,
        addRoomToTwin,
        updateRoomState,
        assets,
        placeAssetInRoom,
        twinNodes,
        twinEdges,
        selectedRoomId,
        setSelectedRoomId,
        selectedAssetId,
        setSelectedAssetId,
        twinInspectorTab,
        setTwinInspectorTab,
        twin3d,
        setTwin3d,
        focusRoomIn3D,
        focusAssetIn3D,
        openSpatialGraphIn3D,
        telemetryPoints,
        resolveTelemetryPoint,
        issues,
        advanceIssueStage,
        workOrders,
        createWorkOrder,
        updateWorkOrderStatus,
        scenarioAssumptions,
        setScenarioAssumptions,
        impactLedger,
        verifyImpactRecord,
        connectors,
        toggleConnectorDryRun,
        automationRules,
        toggleAutomationRule,
        aiPresets,
        emissionFactors,
        comments,
        addComment,
        auditEvents,
        appendAudit,
        notifications,
        markAllNotificationsRead,
        globalSearchQuery,
        setGlobalSearchQuery,
      }}
    >
      {children}
    </WattScapeContext.Provider>
  );
}

export function useWattScape() {
  const ctx = useContext(WattScapeContext);
  if (!ctx) throw new Error('useWattScape must be used within WattScapeProvider');
  return ctx;
}
