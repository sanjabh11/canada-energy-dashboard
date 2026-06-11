/**
 * Unit tests for B12 – Scenario Comparison Engine
 */
import { describe, it, expect } from 'vitest';
import {
  ScenarioComparator,
  welchTTest,
  mannWhitneyU,
} from '../../src/lib/scenarioComparator.ts';
import type { ScenarioMetricSnapshot } from '../../src/lib/scenarioComparator.ts';

function makeScenario(
  id: string,
  name: string,
  metrics: Record<string, number>,
  assumptions?: Record<string, number | string>,
  samples?: Record<string, number[]>,
): ScenarioMetricSnapshot {
  return { scenarioId: id, name, metrics, assumptions, samples };
}

// ── Statistical tests ────────────────────────────────────────────────────────

describe('welchTTest', () => {
  it('returns p ≈ 1 for identical distributions', () => {
    const a = Array.from({ length: 50 }, () => 5);
    const b = Array.from({ length: 50 }, () => 5);
    // All values identical — se=0 → returns pValue=1
    const result = welchTTest(a, b);
    expect(result.pValue).toBe(1);
  });

  it('returns p < 0.05 for clearly separated distributions', () => {
    const a = Array.from({ length: 50 }, () => 1 + Math.random() * 0.1);
    const b = Array.from({ length: 50 }, () => 100 + Math.random() * 0.1);
    const result = welchTTest(a, b);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it('t-statistic is positive when meanA > meanB (with variance)', () => {
    // Use arrays with small variance so se > 0 and tStat is well-defined
    const a = Array.from({ length: 30 }, (_, i) => 10 + (i % 3) * 0.01);
    const b = Array.from({ length: 30 }, (_, i) => 5 + (i % 3) * 0.01);
    const result = welchTTest(a, b);
    expect(result.tStat).toBeGreaterThan(0); // a > b → positive t (meanA - meanB > 0)
  });

  it('returns finite values', () => {
    const a = Array.from({ length: 20 }, (_, i) => i);
    const b = Array.from({ length: 20 }, (_, i) => i + 3);
    const result = welchTTest(a, b);
    expect(Number.isFinite(result.pValue)).toBe(true);
    expect(Number.isFinite(result.tStat)).toBe(true);
  });
});

describe('mannWhitneyU', () => {
  it('returns p = 1 for identical arrays', () => {
    const a = [1, 2, 3, 4, 5];
    const result = mannWhitneyU(a, a);
    // z = 0 → p = 1
    expect(result.pValue).toBeCloseTo(1, 1);
  });

  it('returns p < 0.05 for clearly separated groups', () => {
    const a = Array.from({ length: 30 }, (_, i) => i);
    const b = Array.from({ length: 30 }, (_, i) => i + 100);
    const result = mannWhitneyU(a, b);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it('returns finite u statistic', () => {
    const a = [3, 1, 4, 1, 5];
    const b = [2, 6, 5, 3, 5];
    const result = mannWhitneyU(a, b);
    expect(Number.isFinite(result.u)).toBe(true);
  });
});

// ── ScenarioComparator ───────────────────────────────────────────────────────

describe('ScenarioComparator – basic comparison', () => {
  const comparator = new ScenarioComparator(0.05, {
    ghg_mt: 'minimize',
    capacity_gw: 'maximize',
    cost_bn: 'minimize',
  });

  const scenarioA = makeScenario('s1', 'Reference', {
    ghg_mt: 500, capacity_gw: 120, cost_bn: 80,
  });
  const scenarioB = makeScenario('s2', 'Accelerated Transition', {
    ghg_mt: 350, capacity_gw: 200, cost_bn: 95,
  });

  it('returns a result with metricDeltas for all shared metrics', () => {
    const result = comparator.compare(scenarioA, scenarioB);
    expect(result.metricDeltas).toHaveLength(3);
    const keys = result.metricDeltas.map((d) => d.metric);
    expect(keys).toContain('ghg_mt');
    expect(keys).toContain('capacity_gw');
    expect(keys).toContain('cost_bn');
  });

  it('correctly computes absolute and relative deltas', () => {
    const result = comparator.compare(scenarioA, scenarioB);
    const ghg = result.metricDeltas.find((d) => d.metric === 'ghg_mt')!;
    expect(ghg.absoluteDelta).toBeCloseTo(-150, 5); // 350 - 500
    expect(ghg.relativeDelta).toBeCloseTo(-0.30, 5); // -150 / 500
  });

  it('assigns winner B for minimize metric where B is lower', () => {
    const result = comparator.compare(scenarioA, scenarioB);
    const ghg = result.metricDeltas.find((d) => d.metric === 'ghg_mt')!;
    expect(ghg.winner).toBe('B'); // B has lower GHG
  });

  it('assigns winner B for maximize metric where B is higher', () => {
    const result = comparator.compare(scenarioA, scenarioB);
    const cap = result.metricDeltas.find((d) => d.metric === 'capacity_gw')!;
    expect(cap.winner).toBe('B'); // B has higher capacity
  });

  it('assigns winner A for minimize metric where A is lower', () => {
    const result = comparator.compare(scenarioA, scenarioB);
    const cost = result.metricDeltas.find((d) => d.metric === 'cost_bn')!;
    expect(cost.winner).toBe('A'); // A has lower cost
  });

  it('dominance score sums to metricDeltas length', () => {
    const result = comparator.compare(scenarioA, scenarioB);
    const { A, B, tie } = result.dominanceScore;
    expect(A + B + tie).toBe(result.metricDeltas.length);
  });

  it('summary contains scenario names', () => {
    const result = comparator.compare(scenarioA, scenarioB);
    expect(result.summary).toContain('Reference');
    expect(result.summary).toContain('Accelerated Transition');
  });
});

describe('ScenarioComparator – statistical significance', () => {
  const comparator = new ScenarioComparator(0.05, { output: 'minimize' });

  it('uses welch-t for large samples (≥30) and marks significant differences', () => {
    const aVals = Array.from({ length: 50 }, () => 10 + Math.random() * 0.5);
    const bVals = Array.from({ length: 50 }, () => 20 + Math.random() * 0.5);
    const sA = makeScenario('a', 'A', { output: 10 }, {}, { output: aVals });
    const sB = makeScenario('b', 'B', { output: 20 }, {}, { output: bVals });
    const result = comparator.compare(sA, sB);
    const delta = result.metricDeltas[0];
    expect(delta.testUsed).toBe('welch-t');
    expect(delta.significant).toBe(true);
    expect(delta.pValue).toBeLessThan(0.05);
  });

  it('uses mann-whitney for small samples (<30)', () => {
    const aVals = [1, 2, 3, 4, 5];
    const bVals = [10, 11, 12, 13, 14];
    const sA = makeScenario('a', 'A', { output: 3 }, {}, { output: aVals });
    const sB = makeScenario('b', 'B', { output: 12 }, {}, { output: bVals });
    const result = comparator.compare(sA, sB);
    const delta = result.metricDeltas[0];
    expect(delta.testUsed).toBe('mann-whitney');
  });

  it('marks significant as null when no samples provided', () => {
    const sA = makeScenario('a', 'A', { output: 10 });
    const sB = makeScenario('b', 'B', { output: 20 });
    const result = comparator.compare(sA, sB);
    expect(result.metricDeltas[0].significant).toBeNull();
    expect(result.metricDeltas[0].pValue).toBeNull();
    expect(result.metricDeltas[0].testUsed).toBe('none');
  });
});

describe('ScenarioComparator – assumption deltas', () => {
  it('detects changed assumptions', () => {
    const sA = makeScenario('a', 'A', { m: 1 }, { carbon_price: 65, gas_price: 4.5 });
    const sB = makeScenario('b', 'B', { m: 2 }, { carbon_price: 170, gas_price: 4.5 });
    const comparator = new ScenarioComparator();
    const result = comparator.compare(sA, sB);
    expect(result.assumptionDeltas).toHaveLength(1);
    expect(result.assumptionDeltas[0].key).toBe('carbon_price');
    expect(result.assumptionDeltas[0].valueA).toBe(65);
    expect(result.assumptionDeltas[0].valueB).toBe(170);
  });

  it('returns empty assumption deltas when scenarios have same assumptions', () => {
    const sA = makeScenario('a', 'A', { m: 1 }, { param: 10 });
    const sB = makeScenario('b', 'B', { m: 2 }, { param: 10 });
    const comparator = new ScenarioComparator();
    const result = comparator.compare(sA, sB);
    expect(result.assumptionDeltas).toHaveLength(0);
  });

  it('warns about metrics missing in one scenario', () => {
    const sA = makeScenario('a', 'A', { m1: 1, m2: 2 });
    const sB = makeScenario('b', 'B', { m1: 5 }); // m2 missing
    const comparator = new ScenarioComparator();
    const result = comparator.compare(sA, sB);
    expect(result.warnings.some((w) => w.includes('m2'))).toBe(true);
  });
});
