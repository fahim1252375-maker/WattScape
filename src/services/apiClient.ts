import {
  DEMO_AI_PRESETS,
  DEMO_ASSETS,
  DEMO_AUDIT_EVENTS,
  DEMO_AUTOMATION_RULES,
  DEMO_COMMENTS,
  DEMO_CONNECTORS,
  DEMO_EMISSION_FACTORS,
  DEMO_FLOORS,
  DEMO_IMPACT_LEDGER,
  DEMO_ISSUES,
  DEMO_MEMBERS,
  DEMO_ORG,
  DEMO_ROOMS,
  DEMO_SITES,
  DEMO_TELEMETRY_POINTS,
  DEMO_TWIN_EDGES,
  DEMO_TWIN_NODES,
  DEMO_WORK_ORDERS,
} from '../data/demoData';
import type {
  AiQueryResponse,
  AnnotationComment,
  Asset,
  AuditEvent,
  AutomationRule,
  ConnectorInstance,
  EmissionFactor,
  FloorDef,
  ImpactRecord,
  IssueItem,
  Organization,
  OrgMember,
  RoomSpace,
  Site,
  TelemetryPointItem,
  TwinEdge,
  TwinNode,
  WorkOrder,
} from '../domain/types';

export interface WattScapeSnapshot {
  isSyntheticDemo: true;
  organization: Organization;
  members: OrgMember[];
  sites: Site[];
  floors: FloorDef[];
  rooms: RoomSpace[];
  assets: Asset[];
  twinNodes: TwinNode[];
  twinEdges: TwinEdge[];
  telemetryPoints: TelemetryPointItem[];
  issues: IssueItem[];
  workOrders: WorkOrder[];
  impactLedger: ImpactRecord[];
  connectors: ConnectorInstance[];
  automationRules: AutomationRule[];
  aiPresets: AiQueryResponse[];
  emissionFactors: EmissionFactor[];
  comments: AnnotationComment[];
  auditEvents: AuditEvent[];
}

/**
 * Clean service boundary prepared for Node.js/Express + MongoDB + Python FastAPI + Java Edge runtime.
 * Currently resolves deterministic synthetic data in demo mode without pretending live hardware exists.
 */
export const wattScapeApi = {
  fetchInitialWorkspaceSnapshot(): WattScapeSnapshot {
    return {
      isSyntheticDemo: true,
      organization: structuredClone(DEMO_ORG),
      members: structuredClone(DEMO_MEMBERS),
      sites: structuredClone(DEMO_SITES),
      floors: structuredClone(DEMO_FLOORS),
      rooms: structuredClone(DEMO_ROOMS),
      assets: structuredClone(DEMO_ASSETS),
      twinNodes: structuredClone(DEMO_TWIN_NODES),
      twinEdges: structuredClone(DEMO_TWIN_EDGES),
      telemetryPoints: structuredClone(DEMO_TELEMETRY_POINTS),
      issues: structuredClone(DEMO_ISSUES),
      workOrders: structuredClone(DEMO_WORK_ORDERS),
      impactLedger: structuredClone(DEMO_IMPACT_LEDGER),
      connectors: structuredClone(DEMO_CONNECTORS),
      automationRules: structuredClone(DEMO_AUTOMATION_RULES),
      aiPresets: structuredClone(DEMO_AI_PRESETS),
      emissionFactors: structuredClone(DEMO_EMISSION_FACTORS),
      comments: structuredClone(DEMO_COMMENTS),
      auditEvents: structuredClone(DEMO_AUDIT_EVENTS),
    };
  },
};
