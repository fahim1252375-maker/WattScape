/// <reference types="node" />
// Node built-in test-runner typings for this file only. tsconfig limits global
// types to vite/client so browser code cannot silently use Node globals.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateEmissionsKg,
  calculateResourceBalance,
  calculateTrustBreakdown,
  convertUnit,
  propagateWeakestTrust,
  runResourceTradeoffSimulation,
} from './calculations';
import { inspectNodeConnections, validateTenantEdge } from './graph';
import type { TwinEdge, TwinNode } from './types';

test('Data Trust Score returns unknown (null) when telemetry is missing', () => {
  const res = calculateTrustBreakdown({
    hasSourceMapping: true,
    mappingConfidencePct: 95,
    completenessPct: 0,
    freshnessMinutes: 5,
    expectedCadenceMinutes: 5,
    continuityAnomalies: 0,
    reconciliationDiffPct: 1.5,
    qualityState: 'missing',
  });
  assert.equal(res.total, null);
  assert.equal(res.status, 'unknown');
});

test('Data Trust Score degrades on stale feed and suspect quality', () => {
  const healthy = calculateTrustBreakdown({
    hasSourceMapping: true,
    mappingConfidencePct: 98,
    completenessPct: 99,
    freshnessMinutes: 2,
    expectedCadenceMinutes: 5,
    continuityAnomalies: 0,
    reconciliationDiffPct: 1.2,
    qualityState: 'valid',
  });
  assert.ok(healthy.total !== null && healthy.total >= 90);
  assert.equal(healthy.status, 'trusted');

  const degraded = calculateTrustBreakdown({
    hasSourceMapping: true,
    mappingConfidencePct: 90,
    completenessPct: 75,
    freshnessMinutes: 45,
    expectedCadenceMinutes: 5,
    continuityAnomalies: 2,
    reconciliationDiffPct: 14,
    qualityState: 'suspect',
  });
  assert.ok(degraded.total !== null && degraded.total < 60);
  assert.equal(degraded.status, 'degraded');
});

test('propagateWeakestTrust inherits minimum or null if any critical input is unknown', () => {
  assert.equal(propagateWeakestTrust([94, 88, 62]), 62);
  assert.equal(propagateWeakestTrust([94, null, 88]), null);
});

test('Unit conversions and resource balance compute unaccounted delta accurately', () => {
  assert.equal(convertUnit(153720, 'Wh', 'kWh'), 153.72);
  assert.equal(convertUnit(5000, 'L', 'kL'), 5);

  const balance = calculateResourceBalance({
    measuredInput: 1000,
    onsiteGeneration: 200,
    meteredConsumption: 1080,
    knownLosses: 40,
  });
  assert.equal(balance.totalSupply, 1200);
  assert.equal(balance.accountedOutflow, 1120);
  assert.equal(balance.unaccounted, 80);
  assert.equal(balance.reconciliationPct, 93.3);
});

test('Emissions calculation applies explicit versioned factor', () => {
  const kg = calculateEmissionsKg(1000, {
    id: 'ef_1',
    region: 'US-WECC-CAMX',
    resource: 'electricity',
    method: 'location_based',
    source: 'EPA eGRID',
    vintage: '2025',
    value: 0.285,
    unit: 'kgCO2e/kWh',
    version: 'v2025.2',
  });
  assert.equal(kg, 285);
});

test('Resource Trade-off Simulator produces modeled deltas and respects not_modeled flag', () => {
  const sim = runResourceTradeoffSimulation({
    scenarioId: 'scn_test',
    name: 'Chiller Retrofit + PV',
    baselineKwhYear: 1200000,
    baselineWaterLYear: 4500000,
    baselineCostUsdYear: 240000,
    baselineCarbonKgYear: 342000,
    includeWaterModel: false,
    assumptions: [
      { key: 'hvac.chiller_cop', label: 'Chiller COP', value: 5.4, unit: 'COP', min: 3.5, max: 6.2, step: 0.1, source: 'user', uncertaintyPct: 8 },
      { key: 'renewables.pv_kw', label: 'Rooftop PV', value: 220, unit: 'kW', min: 0, max: 400, step: 10, source: 'user', uncertaintyPct: 5 },
    ],
  });
  const elec = sim.outcomes.find((o) => o.metric === 'electricity');
  const water = sim.outcomes.find((o) => o.metric === 'water');
  assert.ok(elec && elec.delta < 0);
  assert.equal(water?.status, 'not_modeled');
  assert.equal(sim.trustSummary.status, 'limited');
});

test('Unified Spatial Resource Graph blocks cross-tenant edges', () => {
  const nodes: TwinNode[] = [
    { id: 'n1', tenantId: 'org_a', kind: 'site', name: 'Site A', lifecycleState: 'active', sourceRefs: [] },
    { id: 'n2', tenantId: 'org_b', kind: 'asset', name: 'Chiller B', lifecycleState: 'active', sourceRefs: [] },
    { id: 'n3', tenantId: 'org_a', kind: 'asset', name: 'Chiller A', lifecycleState: 'active', sourceRefs: [] },
  ];
  const map = new Map(nodes.map((n) => [n.id, n]));
  const crossEdge: TwinEdge = {
    id: 'e_bad',
    tenantId: 'org_a',
    fromId: 'n1',
    type: 'contains',
    toId: 'n2',
    status: 'confirmed',
    provenance: 'test',
  };
  assert.equal(validateTenantEdge(crossEdge, map).valid, false);

  const goodEdge: TwinEdge = {
    id: 'e_ok',
    tenantId: 'org_a',
    fromId: 'n1',
    type: 'contains',
    toId: 'n3',
    status: 'confirmed',
    provenance: 'test',
  };
  assert.equal(validateTenantEdge(goodEdge, map).valid, true);
  const traversal = inspectNodeConnections('n1', 'org_a', nodes, [goodEdge]);
  assert.equal(traversal?.outgoing.length, 1);
  assert.equal(traversal?.outgoing[0].target?.name, 'Chiller A');
});
