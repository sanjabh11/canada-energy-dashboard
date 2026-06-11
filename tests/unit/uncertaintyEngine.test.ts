/**
 * Unit tests for B11 – Uncertainty Quantification Engine
 */
import { describe, it, expect } from 'vitest';
import {
  drawSample,
  computeStatistics,
  UncertaintyEngine,
  CER_UNCERTAIN_PARAMS,
  toUniformUncertain,
} from '../../src/lib/uncertaintyEngine.ts';
import { CER_SENSITIVITY_PARAMS } from '../../src/lib/sensitivityEngine.ts';
import type { UncertainParameter } from '../../src/lib/uncertaintyEngine.ts';

// ── drawSample ──────────────────────────────────────────────────────────────

describe('drawSample', () => {
  it('constant returns exact value', () => {
    const p: UncertainParameter = { name: 'x', distribution: 'constant', params: [42] };
    for (let i = 0; i < 20; i++) expect(drawSample(p)).toBe(42);
  });

  it('uniform stays within [min, max]', () => {
    const p: UncertainParameter = { name: 'x', distribution: 'uniform', params: [2, 8] };
    for (let i = 0; i < 200; i++) {
      const v = drawSample(p);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(8);
    }
  });

  it('normal is clamped to ±3σ', () => {
    const p: UncertainParameter = { name: 'x', distribution: 'normal', params: [100, 10] };
    for (let i = 0; i < 500; i++) {
      const v = drawSample(p);
      expect(v).toBeGreaterThanOrEqual(70);   // 100 - 3*10
      expect(v).toBeLessThanOrEqual(130);      // 100 + 3*10
    }
  });

  it('lognormal is always positive', () => {
    const p: UncertainParameter = { name: 'x', distribution: 'lognormal', params: [0, 0.5] };
    for (let i = 0; i < 200; i++) {
      expect(drawSample(p)).toBeGreaterThan(0);
    }
  });

  it('triangular stays within [a, b]', () => {
    const p: UncertainParameter = { name: 'x', distribution: 'triangular', params: [1, 3, 5] };
    for (let i = 0; i < 200; i++) {
      const v = drawSample(p);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(5);
    }
  });

  it('throws for unknown distribution', () => {
    const p = { name: 'x', distribution: 'beta' as UncertainParameter['distribution'], params: [2, 5] } as UncertainParameter;
    expect(() => drawSample(p)).toThrow('Unknown distribution');
  });
});

// ── computeStatistics ───────────────────────────────────────────────────────

describe('computeStatistics', () => {
  it('computes correct mean for constant samples', () => {
    const stats = computeStatistics([5, 5, 5, 5, 5, 5]);
    expect(stats.mean).toBeCloseTo(5, 5);
    expect(stats.std).toBeCloseTo(0, 5);
  });

  it('p50 is close to median', () => {
    const samples = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const stats = computeStatistics(samples);
    expect(stats.quantiles.p50).toBeCloseTo(5.5, 1);
  });

  it('p5 < p25 < p50 < p75 < p95', () => {
    const samples = Array.from({ length: 100 }, () => Math.random() * 100);
    const stats = computeStatistics(samples);
    const q = stats.quantiles;
    expect(q.p5).toBeLessThan(q.p25);
    expect(q.p25).toBeLessThan(q.p50);
    expect(q.p50).toBeLessThan(q.p75);
    expect(q.p75).toBeLessThan(q.p95);
  });

  it('throws for fewer than 2 samples', () => {
    expect(() => computeStatistics([42])).toThrow();
  });

  it('effectiveSampleSize is ≤ n', () => {
    const samples = Array.from({ length: 200 }, () => Math.random());
    const stats = computeStatistics(samples);
    expect(stats.effectiveSampleSize).toBeLessThanOrEqual(200);
    expect(stats.effectiveSampleSize).toBeGreaterThan(0);
  });
});

// ── UncertaintyEngine ───────────────────────────────────────────────────────

describe('UncertaintyEngine – runMonteCarlo', () => {
  // Simple linear model: output = natural_gas_price * 100 + carbon_price
  const model = async (p: Record<string, number>) =>
    p['natural_gas_price_cad_gj'] * 100 + p['carbon_price_cad_t'];

  const params: UncertainParameter[] = [
    { name: 'natural_gas_price_cad_gj', distribution: 'uniform', params: [2, 8] },
    { name: 'carbon_price_cad_t', distribution: 'uniform', params: [20, 170] },
  ];

  it('returns correct number of samples', async () => {
    const engine = new UncertaintyEngine(model);
    const result = await engine.runMonteCarlo(params, {}, { nSamples: 100 });
    expect(result.samples).toHaveLength(100);
    expect(result.parameterDraws).toHaveLength(100);
  });

  it('output statistics are finite', async () => {
    const engine = new UncertaintyEngine(model);
    const result = await engine.runMonteCarlo(params, {}, { nSamples: 100 });
    expect(Number.isFinite(result.output.mean)).toBe(true);
    expect(Number.isFinite(result.output.std)).toBe(true);
    expect(result.output.std).toBeGreaterThan(0);
  });

  it('output range matches model range for uniform inputs', async () => {
    const engine = new UncertaintyEngine(model);
    const result = await engine.runMonteCarlo(params, {}, { nSamples: 500 });
    // min: 2*100 + 20 = 220; max: 8*100 + 170 = 970
    expect(result.output.min).toBeGreaterThanOrEqual(220);
    expect(result.output.max).toBeLessThanOrEqual(970);
  });

  it('fixed parameters are passed through to the model', async () => {
    const fixedModel = async (p: Record<string, number>) => p['x'] + p['fixed_param'];
    const engine = new UncertaintyEngine(fixedModel);
    const result = await engine.runMonteCarlo(
      [{ name: 'x', distribution: 'constant', params: [10] }],
      { fixed_param: 5 },
      { nSamples: 20 },
    );
    // All samples should be exactly 15
    expect(result.samples.every((s) => Math.abs(s - 15) < 1e-10)).toBe(true);
  });

  it('warns when nSamples is low', async () => {
    const engine = new UncertaintyEngine(model);
    const result = await engine.runMonteCarlo(params, {}, { nSamples: 50 });
    expect(result.warnings.some((w) => w.includes('low'))).toBe(true);
  });

  it('calls progressCallback', async () => {
    const engine = new UncertaintyEngine(model);
    let lastProgress = 0;
    await engine.runMonteCarlo(params, {}, {
      nSamples: 60,
      concurrency: 20,
      progressCallback: (done) => { lastProgress = done; },
    });
    expect(lastProgress).toBe(60);
  });
});

describe('UncertaintyEngine – varianceDecomposition', () => {
  it('returns one entry per parameter', async () => {
    const model = async (p: Record<string, number>) => p['a'] * 5 + p['b'];
    const params: UncertainParameter[] = [
      { name: 'a', distribution: 'uniform', params: [1, 3] },
      { name: 'b', distribution: 'uniform', params: [1, 3] },
    ];
    const engine = new UncertaintyEngine(model);
    const result = await engine.varianceDecomposition(params, {}, 100);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.parameter).sort()).toEqual(['a', 'b']);
  });

  it('s1Approx for dominant parameter is larger', async () => {
    // a contributes 10× more than b to output variance
    const model = async (p: Record<string, number>) => p['a'] * 10 + p['b'];
    const params: UncertainParameter[] = [
      { name: 'a', distribution: 'uniform', params: [0, 2] },
      { name: 'b', distribution: 'uniform', params: [0, 2] },
    ];
    const engine = new UncertaintyEngine(model);
    const result = await engine.varianceDecomposition(params, {}, 200);
    expect(result[0].parameter).toBe('a');
    expect(result[0].s1Approx).toBeGreaterThan(result[1].s1Approx);
  });
});

// ── Preset & Converters ─────────────────────────────────────────────────────

describe('CER_UNCERTAIN_PARAMS', () => {
  it('has 7 parameters with valid distributions', () => {
    expect(CER_UNCERTAIN_PARAMS).toHaveLength(7);
    const validDists = ['uniform', 'normal', 'lognormal', 'triangular', 'constant'];
    for (const p of CER_UNCERTAIN_PARAMS) {
      expect(validDists).toContain(p.distribution);
      expect(p.params.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('toUniformUncertain', () => {
  it('converts SensitivityParameter to uniform UncertainParameter', () => {
    const sp = CER_SENSITIVITY_PARAMS[0];
    const up = toUniformUncertain(sp);
    expect(up.distribution).toBe('uniform');
    expect(up.params[0]).toBe(sp.min);
    expect(up.params[1]).toBe(sp.max);
    expect(up.name).toBe(sp.name);
  });
});
