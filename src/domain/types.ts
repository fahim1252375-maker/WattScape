export type ThemeMode = 'dark' | 'light';
export type DensityMode = 'comfortable' | 'compact';
export type UnitSystem = 'metric' | 'imperial';
export type ResourceFilter = 'all' | 'energy' | 'water' | 'waste' | 'carbon' | 'operations';

export type ScreenId =
  | 'landing'
  | 'auth'
  | 'workspace'
  | 'portfolio-overview'
  | 'twin-viewer'
  | 'twin-editor'
  | 'floor-explorer'
  | 'assets'
  | 'monitoring'
  | 'data-quality'
  | 'maintenance'
  | 'collaboration'
  | 'analytics'
  | 'ai-intelligence'
  | 'simulation'
  | 'sustainability'
  | 'impact-ledger'
  | 'integrations'
  | 'automation'
  | 'security'
  | 'settings';

export type NavGroupId =
  | 'portfolio'
  | 'twin'
  | 'monitor'
  | 'work'
  | 'analyze'
  | 'connect'
  | 'admin';

export type QualityState =
  | 'valid'
  | 'estimated'
  | 'suspect'
  | 'stale'
  | 'missing'
  | 'corrected'
  | 'rejected';

export type ModelConfidenceState = 'draft' | 'needs_review' | 'reviewed' | 'superseded';

export type ProvenanceMode = 'observed' | 'calculated' | 'inferred';

export type ImpactClassification = 'modeled' | 'observed' | 'reviewed' | 'verified' | 'reversed';

export type ProblemToProofStage =
  | 'candidate'
  | 'triaged'
  | 'baseline_locked'
  | 'approved'
  | 'action_in_progress'
  | 'measurement_window'
  | 'review'
  | 'closed'
  | 'reopened';

export interface TrustBreakdown {
  sourceIntegrity: number; // 0-25
  completeness: number; // 0-25
  freshness: number; // 0-20
  continuity: number; // 0-20
  reconciliation: number; // 0-10
  total: number | null; // null => 'unknown'
  status: 'trusted' | 'caution' | 'degraded' | 'unknown';
  reasons: string[];
}

export interface Organization {
  id: string;
  name: string;
  legalName: string;
  defaultCurrency: 'USD' | 'EUR' | 'GBP';
  unitSystem: UnitSystem;
  timeZonePolicy: string;
  locale: string;
  retentionDays: number;
  region: string;
}

export interface OrgMember {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role:
    | 'Organization Owner'
    | 'Organization Admin'
    | 'Site Admin'
    | 'Facilities Operator'
    | 'Energy/Sustainability Analyst'
    | 'Technician'
    | 'Auditor/Read Only';
  siteScopes: string[]; // ['*'] or site IDs
  status: 'active' | 'invited' | 'revoked';
  invitedAt?: string;
}

export interface Site {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  regionTag: string;
  address: string;
  timeZone: string;
  buildingUse: string;
  areaSqm: number;
  floorsCount: number;
  status: 'operational' | 'commissioning' | 'needs_mapping';
  coordinates: { lat: number; lng: number; x3d: number; z3d: number };
  summaryMetrics: {
    electricityKwh24h: number;
    waterLiters24h: number;
    wasteKg24h: number;
    carbonKgCo2e24h: number;
    trustScore: number;
    openIssues: number;
    coveragePct: number;
  };
}

export interface FloorDef {
  id: string;
  siteId: string;
  level: number; // 0 = Ground/L1, 1 = L2, 2 = L3
  name: string;
  elevationM: number;
  areaSqm: number;
  modelState: ModelConfidenceState;
}

export interface RoomSpace {
  id: string;
  tenantId: string;
  siteId: string;
  floorId: string;
  level: number;
  name: string;
  code: string;
  zoneType: 'lab' | 'office' | 'plant' | 'lobby' | 'storage' | 'server' | 'corridor';
  areaSqm: number;
  // 3D local bounds relative to building center (meters)
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  modelState: ModelConfidenceState;
  provenance: string;
  // Hourly 24h series (index 0..23)
  hourlyEnergyKwh: number[];
  hourlyWaterL: number[];
  hourlyCarbonKg: number[];
  hourlyTempC: number[];
  hourlyCo2Ppm: number[];
  qualityState: QualityState;
  trustScore: number | null;
  adjacentRoomIds: string[];
  hasAnomaly?: boolean;
  anomalySummary?: string;
}

export interface Asset {
  id: string;
  tenantId: string;
  siteId: string;
  floorId: string;
  roomId: string | null; // null => explicitly unlocated
  systemName: string;
  assetClass: 'Chiller' | 'AHU' | 'Boiler' | 'Switchgear' | 'Pump' | 'SolarInverter' | 'Submeter' | 'CoolingTower' | 'PVArray';
  name: string;
  manufacturer: string;
  model: string;
  serial: string;
  commissionDate: string;
  status: 'running' | 'standby' | 'warning' | 'fault' | 'maintenance';
  criticality: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  sourceId: string;
  qualityState: QualityState;
  trustScore: number | null;
  // 3D position relative to building center
  position3d: [number, number, number];
  powerKw: number;
  waterFlowLpm: number;
  efficiencyMetric: string;
  documents: { id: string; title: string; type: string; updatedAt: string }[];
}

export type TwinNodeKind =
  | 'organization'
  | 'site'
  | 'building'
  | 'floor'
  | 'space'
  | 'asset'
  | 'system'
  | 'meter'
  | 'point'
  | 'resource_stream'
  | 'issue'
  | 'work_order'
  | 'scenario'
  | 'impact_record';

export type TwinEdgeType =
  | 'contains'
  | 'located_in'
  | 'feeds'
  | 'serves'
  | 'measures'
  | 'derived_from'
  | 'supplied_by'
  | 'connected_to'
  | 'has_issue'
  | 'addressed_by'
  | 'uses_factor'
  | 'evidenced_by'
  | 'supersedes';

export interface TwinNode {
  id: string;
  tenantId: string;
  siteId?: string;
  kind: TwinNodeKind;
  name: string;
  lifecycleState: 'active' | 'draft' | 'needs_review' | 'retired';
  sourceRefs: string[];
}

export interface TwinEdge {
  id: string;
  tenantId: string;
  fromId: string;
  type: TwinEdgeType;
  toId: string;
  status: 'confirmed' | 'imported' | 'inferred' | 'disputed';
  provenance: string;
  resourceType?: 'energy' | 'water' | 'carbon';
  flowMagnitude?: number;
}

export interface TelemetryPointItem {
  id: string;
  tenantId: string;
  siteId: string;
  nodeId: string;
  nodeName: string;
  metric: string;
  sourceSystem: string;
  sourceKey: string;
  eventTime: string;
  ingestedAt: string;
  originalValue: number | null;
  originalUnit: string;
  normalizedValue: number | null;
  normalizedUnit: string;
  transformVersion: string;
  qualityState: QualityState;
  dataTag: 'actual' | 'estimated' | 'calculated' | 'forecast' | 'missing';
  trust: TrustBreakdown;
  coveragePct: number;
  uncertaintyPct: number;
  correctionHistory: {
    timestamp: string;
    actor: string;
    previousState: QualityState;
    newState: QualityState;
    reason: string;
  }[];
}

export interface IssueItem {
  id: string;
  tenantId: string;
  siteId: string;
  roomId: string | null;
  assetId: string | null;
  title: string;
  category: 'energy_drift' | 'water_leak_hypothesis' | 'comfort_deviation' | 'meter_gap' | 'equipment_fault';
  severity: 'critical' | 'high' | 'medium' | 'low';
  stage: ProblemToProofStage;
  owner: string;
  createdAt: string;
  detectedMetric: string;
  estimatedWasteKwhOrL: string;
  confidenceLabel: 'High' | 'Moderate' | 'Low';
  evidenceWindow: string;
  contextSignals: {
    label: string;
    detail: string;
    mode: ProvenanceMode;
    source: string;
  }[];
  baselineValue: string;
  observedAfterValue?: string;
}

export interface WorkOrder {
  id: string;
  tenantId: string;
  siteId: string;
  issueId?: string;
  assetId: string;
  roomId: string | null;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'awaiting_review' | 'completed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  assignee: string;
  dueDate: string;
  externalCmmsId?: string;
  closureCode?: string;
  notes: string[];
}

export interface ScenarioAssumption {
  key: string;
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  source: 'user' | 'baseline';
  uncertaintyPct: number;
}

export interface ScenarioResult {
  scenarioId: string;
  name: string;
  baselineWindow: { start: string; end: string };
  boundary: string[];
  modelVersion: string;
  assumptions: ScenarioAssumption[];
  outcomes: {
    metric: 'electricity' | 'water' | 'carbon' | 'cost' | 'comfort' | 'reliability' | 'waste_diversion';
    label: string;
    unit: string;
    baselineValue: number;
    modeledValue: number;
    delta: number;
    range: [number, number];
    status: 'modeled' | 'not_modeled';
  }[];
  capexUsd: number;
  simplePaybackYears: number | null;
  trustSummary: {
    status: 'good' | 'limited';
    reasons: string[];
  };
}

export interface ImpactRecord {
  id: string;
  tenantId: string;
  siteId: string;
  title: string;
  issueId: string;
  workOrderId?: string;
  scenarioId?: string;
  classification: ImpactClassification;
  boundary: string;
  baselinePeriod: string;
  measurementPeriod: string;
  adjustmentMethod: string;
  factorSource: string;
  factorVersion: string;
  formulaVersion: string;
  energyDeltaKwh: number;
  waterDeltaL: number;
  carbonDeltaKg: number;
  costDeltaUsd: number;
  uncertaintyPct: number;
  hashDigest: string;
  supersedesId?: string;
  reviewer?: {
    name: string;
    role: string;
    reviewedAt: string;
    policy: string;
    checklistPassed: boolean;
    notes: string;
  };
}

export interface ConnectorInstance {
  id: string;
  tenantId: string;
  name: string;
  vendor: string;
  protocol: 'CSV/XLSX' | 'REST Webhook' | 'MQTT' | 'Java Edge Runtime' | 'BACnet/IP' | 'Modbus TCP' | 'OPC UA' | 'ENERGY STAR API';
  catalogStatus: 'built_and_tested' | 'customer_configured' | 'planned';
  readWriteScope: 'read_only' | 'approval_gated_write';
  siteScopes: string[];
  health: 'healthy' | 'lagging' | 'error' | 'disabled';
  lastSyncAt: string;
  syncLagSeconds: number;
  acceptedCount24h: number;
  rejectedCount24h: number;
  deadLetterCount: number;
  remediationHint?: string;
  pointMappings: {
    sourceKey: string;
    twinNodeName: string;
    canonicalMetric: string;
    sourceUnit: string;
    canonicalUnit: string;
    status: 'mapped' | 'needs_review' | 'error';
  }[];
}

export interface AutomationRule {
  id: string;
  tenantId: string;
  name: string;
  owner: string;
  version: string;
  enabled: boolean;
  scope: string;
  triggerType: 'threshold' | 'missing_data' | 'anomaly_candidate' | 'schedule' | 'work_order_state';
  triggerCondition: string;
  actionType: 'notify' | 'create_task' | 'create_work_order' | 'request_approval' | 'request_control_change';
  requiresHumanApproval: boolean;
  rateCapPerHour: number;
  loopGuardMaxDepth: number;
  controlBounds?: {
    allowListedPoint: string;
    minVal: number;
    maxVal: number;
    unit: string;
    maxRateOfChange: string;
    expiryMinutes: number;
  };
  lastRunAt: string;
  lastResult: 'executed_safely' | 'held_for_approval' | 'rejected_by_guardrail' | 'dry_run_ok';
}

export interface AiQueryResponse {
  id: string;
  question: string;
  abstained: boolean;
  abstentionReason?: string;
  answerTitle: string;
  summary: string;
  confidenceLabel: 'Calibrated High' | 'Calibrated Moderate' | 'Insufficient Evidence — Abstained';
  graphPath: string[];
  evidenceRecords: {
    id: string;
    label: string;
    window: string;
    value: string;
    qualityState: QualityState;
  }[];
  assumptions: string[];
  counterEvidence: string;
  whatWouldChange: string;
  proposedAction?: {
    type: 'create_work_order' | 'schedule_review' | 'policy_control_request';
    label: string;
    approvalRequired: string;
  };
}

export interface EmissionFactor {
  id: string;
  region: string;
  resource: 'electricity' | 'natural_gas' | 'water_supply' | 'landfill_waste';
  method: 'location_based' | 'market_based';
  source: string;
  vintage: string;
  value: number;
  unit: string;
  version: string;
}

export interface AnnotationComment {
  id: string;
  tenantId: string;
  anchorType: 'room' | 'asset' | 'issue' | 'scenario';
  anchorId: string;
  anchorLabel: string;
  author: string;
  role: string;
  createdAt: string;
  body: string;
  mentions: string[];
  edited?: boolean;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  actor: string;
  action: string;
  resource: string;
  beforeHash: string;
  afterHash: string;
  timestamp: string;
  requestId: string;
  outcome: 'allowed' | 'denied';
}
