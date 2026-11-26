import type {
  EmissionFactor,
  QualityState,
  ScenarioAssumption,
  ScenarioResult,
  TrustBreakdown,
} from './types';

export interface TrustInput {
  hasSourceMapping: boolean;
  mappingConfidencePct: number; // 0-100
  completenessPct: number; // 0-100
  freshnessMinutes: number;
  expectedCadenceMinutes: number;
  continuityAnomalies: number;
  reconciliationDiffPct: number | null; // null if no reconciliation meter
  qualityState: QualityState;
}

/**
 * Computes WattScape Data Trust Score (0-100) across 5 explicit dimensions.
 * Returns total: null ('unknown') when insufficient evidence exists, per spec §4.3.
 */
export function calculateTrustBreakdown(input: TrustInput): TrustBreakdown {
  const reasons: string[] = [];

  if (input.qualityState === 'missing' || input.completenessPct <= 0) {
    return {
      sourceIntegrity: 0,
      completeness: 0,
      freshness: 0,
      continuity: 0,
      reconciliation: 0,
      total: null,
      status: 'unknown',
      reasons: ['Insufficient readings in selected window; trust cannot be scored'],
    };
  }

  // 1. Source/mapping integrity (0-25)
  let sourceIntegrity = input.hasSourceMapping
    ? Math.round((Math.min(100, Math.max(0, input.mappingConfidencePct)) / 100) * 25)
    : 5;
  if (!input.hasSourceMapping) {
    reasons.push('Unresolved canonical point mapping');
  } else if (input.mappingConfidencePct < 80) {
    reasons.push(`Point mapping confidence ${input.mappingConfidencePct}%`);
  }

  // 2. Validation / completeness (0-25)
  const completeness = Math.round((Math.min(100, Math.max(0, input.completenessPct)) / 100) * 25);
  if (input.completenessPct < 90) {
    reasons.push(`Interval completeness ${input.completenessPct}%`);
  }

  // 3. Freshness (0-20)
  const ratio = input.freshnessMinutes / Math.max(1, input.expectedCadenceMinutes);
  let freshness = 20;
  if (ratio > 6) {
    freshness = 4;
    reasons.push(`Stale feed (${input.freshnessMinutes} min since last sample)`);
  } else if (ratio > 2) {
    freshness = 12;
    reasons.push(`Delayed telemetry (${input.freshnessMinutes} min lag)`);
  }

  // 4. Continuity (0-20)
  let continuity = Math.max(0, 20 - input.continuityAnomalies * 5);
  if (input.continuityAnomalies > 0) {
    reasons.push(`${input.continuityAnomalies} gap/spike continuity flag(s)`);
  }

  // 5. Reconciliation (0-10)
  let reconciliation = 8;
  if (input.reconciliationDiffPct === null) {
    reconciliation = 5;
    reasons.push('No secondary utility bill/meter reconciliation link');
  } else if (input.reconciliationDiffPct > 10) {
    reconciliation = 2;
    reasons.push(`Meter-to-bill variance ${input.reconciliationDiffPct.toFixed(1)}%`);
  } else if (input.reconciliationDiffPct <= 3) {
    reconciliation = 10;
  }

  if (input.qualityState === 'estimated') {
    sourceIntegrity = Math.min(sourceIntegrity, 18);
    reasons.push('Contains gap-filled estimated intervals');
  } else if (input.qualityState === 'suspect' || input.qualityState === 'rejected') {
    continuity = Math.min(continuity, 5);
    reasons.push(`Quality state flagged as ${input.qualityState}`);
  } else if (input.qualityState === 'corrected') {
    reasons.push('Human-corrected value with preserved audit trail');
  }

  const total = Math.max(0, Math.min(100, sourceIntegrity + completeness + freshness + continuity + reconciliation));
  const status = total >= 82 ? 'trusted' : total >= 60 ? 'caution' : 'degraded';

  if (reasons.length === 0) {
    reasons.push('Verified mapping, timely cadence, and consistent continuity');
  }

  return {
    sourceIntegrity,
    completeness,
    freshness,
    continuity,
    reconciliation,
    total,
    status,
    reasons,
  };
}

/**
 * Propagates weakest critical input trust to derived metrics (spec §4.3).
 */
export function propagateWeakestTrust(scores: Array<number | null>): number | null {
  if (scores.length === 0 || scores.some((s) => s === null)) {
    return null;
  }
  return Math.min(...(scores as number[]));
}

/**
 * Deterministic unit conversions preserving precision.
 */
export function convertUnit(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return value;
  const key = `${fromUnit}->${toUnit}`;
  switch (key) {
    case 'Wh->kWh':
      return value / 1000;
    case 'kWh->MWh':
      return value / 1000;
    case 'kWh->BTU':
      return value * 3412.142;
    case 'L->kL':
      return value / 1000;
    case 'L->gal':
      return value * 0.264172;
    case 'kg->lb':
      return value * 2.20462;
    case 'sqm->sqft':
      return value * 10.7639;
    default:
      return value;
  }
}

/**
 * Computes operational GHG emissions from activity data and explicit versioned factor.
 */
export function calculateEmissionsKg(activityValue: number, factor: EmissionFactor): number {
  return Number((activityValue * factor.value).toFixed(2));
}

/**
 * Computes explicit resource balance with unaccounted delta (spec §3.8).
 */
export function calculateResourceBalance(params: {
  measuredInput: number;
  onsiteGeneration: number;
  meteredConsumption: number;
  knownLosses: number;
}): {
  totalSupply: number;
  accountedOutflow: number;
  unaccounted: number;
  reconciliationPct: number;
} {
  const totalSupply = params.measuredInput + params.onsiteGeneration;
  const accountedOutflow = params.meteredConsumption + params.knownLosses;
  const unaccounted = Number((totalSupply - accountedOutflow).toFixed(2));
  const reconciliationPct = totalSupply > 0 ? Number(((accountedOutflow / totalSupply) * 100).toFixed(1)) : 0;
  return { totalSupply, accountedOutflow, unaccounted, reconciliationPct };
}

/**
 * Resource Trade-off Simulator engine (spec §4.5).
 * Produces modeled deltas + uncertainty ranges across multiple resource objectives.
 */
export function runResourceTradeoffSimulation(params: {
  scenarioId: string;
  name: string;
  baselineKwhYear: number;
  baselineWaterLYear: number;
  baselineCostUsdYear: number;
  baselineCarbonKgYear: number;
  assumptions: ScenarioAssumption[];
  includeWaterModel?: boolean;
}): ScenarioResult {
  const getVal = (key: string, fallback: number) =>
    params.assumptions.find((a) => a.key === key)?.value ?? fallback;

  const chillerCop = getVal('hvac.chiller_cop', 4.2); // baseline 4.2
  const scheduleHoursTrim = getVal('hvac.schedule_trim_hrs', 0); // 0..4 hrs/day
  const setpointDeadbandC = getVal('hvac.deadband_c', 1.5); // 1.0..3.5 C
  const solarCapacityKw = getVal('renewables.pv_kw', 120); // baseline 120 kW
  const waterReusePct = getVal('water.greywater_reuse_pct', 0); // 0..45%
  const wasteDiversionPct = getVal('waste.diversion_pct', 42); // baseline 42%

  // Energy impact
  const copFactor = (4.2 - chillerCop) * 0.055; // negative = savings
  const scheduleFactor = -scheduleHoursTrim * 0.042;
  const deadbandFactor = -(setpointDeadbandC - 1.5) * 0.038;
  const solarDeltaKwh = -(solarCapacityKw - 120) * 1450; // 1450 kWh/kW-yr

  const hvacPctDelta = copFactor + scheduleFactor + deadbandFactor;
  const energyDelta = Math.round(params.baselineKwhYear * hvacPctDelta + solarDeltaKwh);
  const modeledKwh = Math.max(0, params.baselineKwhYear + energyDelta);

  // Water impact
  const waterDelta = params.includeWaterModel !== false
    ? Math.round(-params.baselineWaterLYear * (waterReusePct / 100) * 0.68)
    : 0;
  const modeledWater = Math.max(0, params.baselineWaterLYear + waterDelta);

  // Carbon impact (grid factor 0.285 kgCO2e/kWh + water pumping factor)
  const carbonDelta = Math.round(energyDelta * 0.285 + waterDelta * 0.0004);
  const modeledCarbon = Math.max(0, params.baselineCarbonKgYear + carbonDelta);

  // Cost impact ($0.19/kWh + $0.0024/L)
  const costDelta = Math.round(energyDelta * 0.19 + waterDelta * 0.0024);
  const modeledCost = Math.max(0, params.baselineCostUsdYear + costDelta);

  // Comfort score (0-100; deadband > 2.5 C reduces thermal comfort score)
  const baselineComfort = 92;
  const comfortDelta = Number((-(Math.max(0, setpointDeadbandC - 2.0) * 4.5) - scheduleHoursTrim * 0.8).toFixed(1));
  const modeledComfort = Math.max(50, Math.min(100, Number((baselineComfort + comfortDelta).toFixed(1))));

  // Reliability index (higher COP and PV storage buffer slightly improves resilience)
  const reliabilityDelta = Number(((chillerCop - 4.2) * 1.4 + (solarCapacityKw - 120) * 0.015).toFixed(1));

  // Capex estimate
  const capexUsd = Math.round(
    Math.max(0, chillerCop - 4.2) * 28000 +
      Math.max(0, solarCapacityKw - 120) * 1650 +
      waterReusePct * 950 +
      (scheduleHoursTrim > 0 ? 4200 : 0),
  );
  const annualSavings = Math.max(0, -costDelta);
  const simplePaybackYears = annualSavings > 0 && capexUsd > 0 ? Number((capexUsd / annualSavings).toFixed(1)) : null;

  return {
    scenarioId: params.scenarioId,
    name: params.name,
    baselineWindow: { start: '2025-11-01T00:00:00Z', end: '2026-10-31T23:59:59Z' },
    boundary: ['site_meridian_north'],
    modelVersion: 'sim-tradeoff-v1.4',
    assumptions: params.assumptions,
    capexUsd,
    simplePaybackYears,
    outcomes: [
      {
        metric: 'electricity',
        label: 'Electricity Use',
        unit: 'kWh/yr',
        baselineValue: params.baselineKwhYear,
        modeledValue: modeledKwh,
        delta: energyDelta,
        range: [Math.round(energyDelta * 1.18), Math.round(energyDelta * 0.78)],
        status: 'modeled',
      },
      {
        metric: 'water',
        label: 'Potable Water',
        unit: 'L/yr',
        baselineValue: params.baselineWaterLYear,
        modeledValue: modeledWater,
        delta: waterDelta,
        range: [Math.round(waterDelta * 1.22), Math.round(waterDelta * 0.75)],
        status: params.includeWaterModel !== false ? 'modeled' : 'not_modeled',
      },
      {
        metric: 'carbon',
        label: 'Operational Carbon',
        unit: 'kgCO2e/yr',
        baselineValue: params.baselineCarbonKgYear,
        modeledValue: modeledCarbon,
        delta: carbonDelta,
        range: [Math.round(carbonDelta * 1.2), Math.round(carbonDelta * 0.75)],
        status: 'modeled',
      },
      {
        metric: 'cost',
        label: 'Annual Utility Spend',
        unit: 'USD/yr',
        baselineValue: params.baselineCostUsdYear,
        modeledValue: modeledCost,
        delta: costDelta,
        range: [Math.round(costDelta * 1.2), Math.round(costDelta * 0.76)],
        status: 'modeled',
      },
      {
        metric: 'comfort',
        label: 'Thermal Comfort Index',
        unit: 'pts',
        baselineValue: baselineComfort,
        modeledValue: modeledComfort,
        delta: comfortDelta,
        range: [Number((comfortDelta - 2.2).toFixed(1)), Number((comfortDelta + 1.5).toFixed(1))],
        status: 'modeled',
      },
      {
        metric: 'reliability',
        label: 'Grid & Plant Resilience',
        unit: 'pts',
        baselineValue: 86,
        modeledValue: Number((86 + reliabilityDelta).toFixed(1)),
        delta: reliabilityDelta,
        range: [Number((reliabilityDelta - 1.5).toFixed(1)), Number((reliabilityDelta + 2.0).toFixed(1))],
        status: 'modeled',
      },
      {
        metric: 'waste_diversion',
        label: 'Waste Diversion Rate',
        unit: '%',
        baselineValue: 42,
        modeledValue: wasteDiversionPct,
        delta: Number((wasteDiversionPct - 42).toFixed(1)),
        range: [Number((wasteDiversionPct - 45).toFixed(1)), Number((wasteDiversionPct - 39).toFixed(1))],
        status: 'modeled',
      },
    ],
    trustSummary: {
      status: 'limited',
      reasons: [
        'Modeled forecast only — not verified savings',
        'Occupancy schedule coverage 78% across Level 2 & Level 3',
      ],
    },
  };
}
