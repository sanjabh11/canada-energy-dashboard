/**
 * Unit tests for B10 – Sensitivity Analysis Engine
 */
import { describe, it, expect } from 'vitest';
import {
  SensitivityEngine,
  CER_SENSITIVITY_PARAMS,
} from '../../src/lib/sensitivityEngine.ts';
import type { SensitivityParameter } from '../../src/lib/sensitivityEngine.ts';

/** Simple linear model: output = a * x1 + b * x2 */
function linearModel(coeffs: Record<string, number>) {
  return async (params: Record<string, number>): Promise<number> => {
    return Object.entries(params).reduce(
      (acc, [key, val]) => acc + (coeffs[key] ?? 0) * val,
      0,
    );
  };
}

const TWO_PARAM: SensitivityParameter[] = [
  { name: 'x1', value: 10, min: 5, max: 20, category: 'demand' },
  { name: 'x2', value: 5, min: 2, max: 10, category: 'price' },
];

describe('SensitivityEngine – localAnalysis', () => {
  it('ranks more sensitive parameter first in linear model', async () => {
    // model = 3*x1 + 1*x2 → x1 is more sensitive
    const engine = new SensitivityEngine(linearModel({ x1: 3, x2: 1 }));
    const results = await engine.localAnalysis(TWO_PARAM, { delta: 0.05 });
    expect(results[0].parameter).toBe('x1');
    expect(results[1].parameter).toBe('x2');
  });

  it('computes correct elasticity for linear model', async () => {
    // model = 2*x → elasticity should be 1 (output scales 1:1 with input)
    const engine = new SensitivityEngine(async (p) => 2 * p['x1']);
    const params: SensitivityParameter[] = [{ name: 'x1', value: 10 }];
    const results = await engine.localAnalysis(params);
    // Elasticity = (dY/Y) / (dX/X) = 1 for linear model with zero intercept
    expect(Math.abs(results[0].elasticity - 1.0)).toBeLessThan(0.01);
  });

  it('assigns rank 1 to largest absolute impact', async () => {
    const engine = new SensitivityEngine(linearModel({ x1: 10, x2: 1 }));
    const results = await engine.localAnalysis(TWO_PARAM);
    expect(results[0].rank).toBe(1);
    expect(results[0].parameter).toBe('x1');
  });

  it('throws when base output is zero', async () => {
    const engine = new SensitivityEngine(async () => 0);
    await expect(engine.localAnalysis(TWO_PARAM)).rejects.toThrow('base output');
  });

  it('returns results for all parameters', async () => {
    const engine = new SensitivityEngine(linearModel({ x1: 2, x2: 1 }));
    const results = await engine.localAnalysis(TWO_PARAM);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.parameter).sort()).toEqual(['x1', 'x2'].sort());
  });
});

describe('SensitivityEngine – tornadoChart', () => {
  it('returns bars sorted by swing descending', async () => {
    // x1 has wider range [5,20] vs x2 [2,10], same coefficient
    const engine = new SensitivityEngine(linearModel({ x1: 2, x2: 2 }));
    const bars = await engine.tornadoChart(TWO_PARAM);
    expect(bars[0].swing).toBeGreaterThanOrEqual(bars[1].swing);
  });

  it('uses min/max bounds from parameter', async () => {
    const engine = new SensitivityEngine(async (p) => p['x1']);
    const params: SensitivityParameter[] = [{ name: 'x1', value: 10, min: 0, max: 100 }];
    const [bar] = await engine.tornadoChart(params);
    expect(bar.lowValue).toBeCloseTo(0, 1);
    expect(bar.highValue).toBeCloseTo(100, 1);
    expect(bar.swing).toBeCloseTo(100, 1);
  });

  it('returns lowValue ≤ highValue for monotone models', async () => {
    const engine = new SensitivityEngine(linearModel({ x1: 5, x2: 3 }));
    const bars = await engine.tornadoChart(TWO_PARAM);
    for (const bar of bars) {
      expect(bar.lowValue).toBeLessThanOrEqual(bar.highValue);
    }
  });
});

describe('SensitivityEngine – morrisMethod', () => {
  it('returns results for all parameters', async () => {
    const engine = new SensitivityEngine(linearModel({ x1: 3, x2: 1 }));
    const results = await engine.morrisMethod(TWO_PARAM, 5);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.parameter).sort()).toEqual(['x1', 'x2'].sort());
  });

  it('ranks more influential parameter first (muStar)', async () => {
    // x1 coefficient is 10× larger than x2 — should dominate muStar
    const engine = new SensitivityEngine(linearModel({ x1: 10, x2: 1 }));
    const results = await engine.morrisMethod(TWO_PARAM, 10);
    expect(results[0].parameter).toBe('x1');
    expect(results[0].muStar).toBeGreaterThan(results[1].muStar);
  });

  it('assigns ranking 1 to highest muStar', async () => {
    const engine = new SensitivityEngine(linearModel({ x1: 5, x2: 1 }));
    const results = await engine.morrisMethod(TWO_PARAM, 5);
    expect(results[0].ranking).toBe(1);
  });

  it('returns finite numbers for all metrics', async () => {
    const engine = new SensitivityEngine(linearModel({ x1: 2, x2: 3 }));
    const results = await engine.morrisMethod(TWO_PARAM, 5);
    for (const r of results) {
      expect(Number.isFinite(r.mu)).toBe(true);
      expect(Number.isFinite(r.muStar)).toBe(true);
      expect(Number.isFinite(r.sigma)).toBe(true);
    }
  });
});

describe('CER_SENSITIVITY_PARAMS preset', () => {
  it('has 10 parameters with required fields', () => {
    expect(CER_SENSITIVITY_PARAMS).toHaveLength(10);
    for (const p of CER_SENSITIVITY_PARAMS) {
      expect(p.name).toBeTruthy();
      expect(p.value).toBeGreaterThan(0);
      expect(p.min).toBeDefined();
      expect(p.max).toBeDefined();
      expect(p.unit).toBeTruthy();
      expect(p.category).toBeTruthy();
    }
  });

  it('all parameters have min < value < max', () => {
    for (const p of CER_SENSITIVITY_PARAMS) {
      expect(p.min!).toBeLessThan(p.value);
      expect(p.max!).toBeGreaterThan(p.value);
    }
  });
});
