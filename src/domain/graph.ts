import type { TwinEdge, TwinNode } from './types';

export interface GraphTraversalResult {
  node: TwinNode;
  incoming: Array<{ edge: TwinEdge; source: TwinNode | undefined }>;
  outgoing: Array<{ edge: TwinEdge; target: TwinNode | undefined }>;
}

/**
 * Validates that a TwinEdge cannot link nodes across different tenants or dangle (spec §4.2).
 */
export function validateTenantEdge(
  edge: TwinEdge,
  nodesById: Map<string, TwinNode>,
): { valid: boolean; reason?: string } {
  const fromNode = nodesById.get(edge.fromId);
  const toNode = nodesById.get(edge.toId);
  if (!fromNode || !toNode) {
    return { valid: false, reason: 'Dangling node reference in TwinEdge' };
  }
  if (fromNode.tenantId !== edge.tenantId || toNode.tenantId !== edge.tenantId) {
    return { valid: false, reason: 'Cross-tenant graph edge prohibited' };
  }
  return { valid: true };
}

/**
 * Returns direct incoming and outgoing relationships for any node in the Unified Spatial Resource Graph.
 */
export function inspectNodeConnections(
  nodeId: string,
  tenantId: string,
  nodes: TwinNode[],
  edges: TwinEdge[],
): GraphTraversalResult | null {
  const nodesById = new Map(nodes.filter((n) => n.tenantId === tenantId).map((n) => [n.id, n]));
  const node = nodesById.get(nodeId);
  if (!node) return null;

  const tenantEdges = edges.filter((e) => e.tenantId === tenantId);
  const incoming = tenantEdges
    .filter((e) => e.toId === nodeId)
    .map((edge) => ({ edge, source: nodesById.get(edge.fromId) }));
  const outgoing = tenantEdges
    .filter((e) => e.fromId === nodeId)
    .map((edge) => ({ edge, target: nodesById.get(edge.toId) }));

  return { node, incoming, outgoing };
}
