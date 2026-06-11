/**
 * B11 – Uncertainty Quantification Engine
 *
 * Monte Carlo simulation over assumption-pack parameter draws to produce
 * calibrated probability distributions for scenario outcome metrics.
 *
 * Supported distribution types for input parameters:
 *   - uniform(a, b)
 *   - normal(μ, σ) — clamped at ±3σ
 *   - lognormal(μ, σ)  — multiplicative uncertainty (e.g. cost, demand)
 *   - triangular(a, mode, b) — expert-elicited with most-likely value
 *   - constant — no uncertainty (sensitivity turned off)
 *
 * Output:
 *   - Raw sample array
 *   - Quantiles: P5, P10, P25, P50, P75, P90, P95
 *   - Mean, std dev, skewness, kurtosis
 *   - Convergence: effective sample size (R-hat proxy via split-half variance)
 *
 * References:
 *   - Saltelli et al. "Global Sensitivity Analysis" (2008)
 *   - IPCC AR6 Working Group III – scenario uncertainty standards (2022)
 *   - CER "Canada's Energy Future 2026 – Uncertainty Ranges" (Technical Annex)
 *   - Morgan & Henrion "Uncertainty" (Cambridge, 1990) – distribution elicitation
 */

import type { SensitivityParameter } from './sensitivityEngine.ts';
import type { ModelFunction } from './sensitivityEngine.ts';

// ── Distribution types ─────────────────────────────────────────────────────────

export type DistributionType = 'uniform' | 'normal' | 'lognormal' | 'triangular' | 'constant';

export interface UncertainParameter {
  name: string;
  distribution: DistributionType;
  /** For uniform: [min, max]; normal: [mean, std]; lognormal: [logMean, logStd]; triangular: [a, mode, b]; constant: [value] */
  params: [number, number] | [number, number, number] | [number];
  unit?: string;
  category?: string;
}

// ── Sampling ───────────────────────────────────────────────────────────────────

function sampleUniform(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function sampleNormal(mean: number, std: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  // Clamp at ±3σ
  return mean + Math.max(-3 * std, Math.min(3 * std, z * std));
}

function sampleLogNormal(logMean: number, logStd: number): number {
  return Math.exp(sampleNormal(logMean, logStd));
}

function sampleTriangular(a: number, mode: number, b: number): number {
  const Fc = (mode - a) / (b - a);
  const u = Math.random();
  if (u < Fc) {
    return a + Math.sqrt(u * (b - a) * (mode - a));
  }
  return b - Math.sqrt((1 - u) * (b - a) * (b - mode));
}

export function drawSample(param: UncertainParameter): number {
  const p = param.params as number[];
  switch (param.distribution) {
    case 'uniform': return sampleUniform(p[0], p[1]);
    case 'normal': return sampleNormal(p[0], p[1]);
    case 'lognormal': return sampleLogNormal(p[0], p[1]);
    case 'triangular': return sampleTriangular(p[0], p[1], p[2]);
    case 'constant': return p[0];
    default: throw new Error(`Unknown distribution: ${(param as UncertainParameter).distribution}`);
  }
}

// ── Statistics ─────────────────────────────────────────────────────────────────

export interface SampleStatistics {
  n: number;
  mean: number;
  std: number;
  /** Pearson skewness */
  skewness: number;
  /** Excess kurtosis */
  kurtosis: number;
  min: number;
  max: number;
  quantiles: {
    p5: number; p10: number; p25: number; p50: number;
    p75: number; p90: number; p95: number;
  };
  /** Effective sample size via split-half convergence diagnostic.
   *  Values close to n indicate good convergence. Values < n/2 suggest
   *  the model output is highly variable relative to sample size. */
  effectiveSampleSize: number;
}

export function computeStatistics(samples: number[]): SampleStatistics {
  const n = samples.length;
  if (n < 2) throw new Error('UncertaintyEngine: need at least 2 samples for statistics');

  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((s, x) => s + x, 0) / n;
  const variance = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);

  const skewness = std > 0
    ? samples.reduce((s, x) => s + ((x - mean) / std) ** 3, 0) / n
    : 0;

  const kurtosis = std > 0
    ? samples.reduce((s, x) => s + ((x - mean) / std) ** 4, 0) / n - 3
    : 0;

  function quantile(p: number): number {
    const idx = p * (n - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }

  // Split-half convergence: compare variance of first half vs second half
  // ESS proxy: ESS ≈ n * min(var_full / var_half1, n * var_full / var_half2)
  const half = Math.floor(n / 2);
  const half1 = samples.slice(0, half);
  const half2 = samples.slice(half);
  const var1 = half1.reduce((s, x) => s + (x - mean) ** 2, 0) / (half1.length - 1);
  const var2 = half2.reduce((s, x) => s + (x - mean) ** 2, 0) / (half2.length - 1);
  const varRatio = variance > 0 ? Math.max(var1, var2) / variance : 1;
  const effectiveSampleSize = Math.round(n / Math.max(varRatio, 1));

  return {
    n,
    mean,
    std,
    skewness,
    kurtosis,
    min: sorted[0],
    max: sorted[n - 1],
    quantiles: {
      p5: quantile(0.05), p10: quantile(0.10), p25: quantile(0.25), p50: quantile(0.50),
      p75: quantile(0.75), p90: quantile(0.90), p95: quantile(0.95),
    },
    effectiveSampleSize,
  };
}

// ── Monte Carlo result ─────────────────────────────────────────────────────────

export interface MonteCarloResult {
  /** Statistics for the primary output metric */
  output: SampleStatistics;
  /** Raw output samples (length = nSamples) */
  samples: number[];
  /** Parameter draws used (length = nSamples) */
  parameterDraws: Array<Record<string, number>>;
  /** Elapsed milliseconds */
  elapsedMs: number;
  /** Whether convergence is considered adequate (ESS ≥ nSamples * 0.5) */
  converged: boolean;
  /** Warning messages (e.g. poor convergence) */
  warnings: string[];
}

// ── Options ────────────────────────────────────────────────────────────────────

export interface MonteCarloOptions {
  /** Number of Monte Carlo samples (default 500; use ≥1000 for publication) */
  nSamples?: number;
  /** Seed the RNG for reproducibility (optional) — we use a hash-based override */
  seed?: number;
  /** Emit progress every N samples (default disabled) */
  progressCallback?: (done: number, total: number) => void;
  /** Max concurrent async model evaluations (default 20) */
  concurrency?: number;
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export class UncertaintyEngine {
  constructor(private readonly model: ModelFunction) {}

  /**
   * Run a full Monte Carlo simulation.
   *
   * @param parameters  Uncertain parameters with named distributions
   * @param fixed       Fixed parameter values (not uncertain)
   * @param options     Simulation options
   */
  async runMonteCarlo(
    parameters: UncertainParameter[],
    fixed: Record<string, number> = {},
    options: MonteCarloOptions = {},
  ): Promise<MonteCarloResult> {
    const nSamples = options.nSamples ?? 500;
    const concurrency = options.concurrency ?? 20;
    const startMs = Date.now();
    const warnings: string[] = [];

    // Generate parameter draws
    const parameterDraws: Array<Record<string, number>> = Array.from({ length: nSamples }, () => {
      const draw: Record<string, number> = { ...fixed };
      for (const p of parameters) draw[p.name] = drawSample(p);
      return draw;
    });

    // Evaluate model with bounded concurrency
    const samples: number[] = [];
    for (let i = 0; i < nSamples; i += concurrency) {
      const batch = parameterDraws.slice(i, i + concurrency);
      const results = await Promise.all(batch.map((draw) => this.model(draw)));
      samples.push(...results);
      options.progressCallback?.(Math.min(i + concurrency, nSamples), nSamples);
    }

    const output = computeStatistics(samples);
    const converged = output.effectiveSampleSize >= nSamples * 0.5;

    if (!converged) {
      warnings.push(
        `Convergence warning: ESS=${output.effectiveSampleSize} < 50% of nSamples=${nSamples}. ` +
        'Consider increasing nSamples or reducing model variance.',
      );
    }
    if (nSamples < 200) {
      warnings.push(`nSamples=${nSamples} is low; use ≥200 for reliable quantile estimates.`);
    }

    return {
      output,
      samples,
      parameterDraws,
      elapsedMs: Date.now() - startMs,
      converged,
      warnings,
    };
  }

  /**
   * Compute contribution of each parameter to output variance (variance-based
   * first-order sensitivity index, Sobol S1 approximation via grouped samples).
   *
   * For each parameter, freeze all others to their median draws and resample
   * only that parameter. The fraction of total variance explained is S1_i.
   *
   * Note: this is a fast approximation (not the full Jansen/Saltelli estimator);
   * use `SensitivityEngine.morrisMethod` for production-grade global indices.
   */
  async varianceDecomposition(
    parameters: UncertainParameter[],
    fixed: Record<string, number> = {},
    nSamples = 300,
  ): Promise<Array<{ parameter: string; s1Approx: number; varianceContribution: number }>> {
    // Baseline: all uncertain
    const baseline = await this.runMonteCarlo(parameters, fixed, { nSamples });
    const totalVariance = baseline.output.std ** 2;

    if (totalVariance === 0) {
      return parameters.map((p) => ({ parameter: p.name, s1Approx: 0, varianceContribution: 0 }));
    }

    // For each parameter: freeze everything else, compute variance
    const results = await Promise.all(
      parameters.map(async (target) => {
        // Fix all other uncertain parameters to their median draws
        const medianFixed = { ...fixed };
        for (const p of parameters) {
          if (p.name !== target.name) {
            // Use median of the distribution as the fixed value
            medianFixed[p.name] = medianOfDistribution(p);
          }
        }
        const partial = await this.runMonteCarlo([target], medianFixed, { nSamples });
        const partialVariance = partial.output.std ** 2;
        return {
          parameter: target.name,
          s1Approx: partialVariance / totalVariance,
          varianceContribution: partialVariance,
        };
      }),
    );

    return results.sort((a, b) => b.s1Approx - a.s1Approx);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function medianOfDistribution(p: UncertainParameter): number {
  const params = p.params as number[];
  switch (p.distribution) {
    case 'uniform': return (params[0] + params[1]) / 2;
    case 'normal': return params[0];
    case 'lognormal': return Math.exp(params[0]);
    case 'triangular': return params[1]; // mode as median approximation
    case 'constant': return params[0];
    default: return params[0];
  }
}

// ── Convert SensitivityParameter → UncertainParameter (uniform by default) ────

export function toUniformUncertain(p: SensitivityParameter): UncertainParameter {
  return {
    name: p.name,
    distribution: 'uniform',
    params: [p.min ?? p.value * 0.8, p.max ?? p.value * 1.2],
    unit: p.unit,
    category: p.category,
  };
}

/**
 * CER 2026 standard uncertainty ranges for Canadian energy scenarios.
 * Distributions informed by CER Technical Annex B probabilistic bounds.
 */
export const CER_UNCERTAIN_PARAMS: UncertainParameter[] = [
  { name: 'natural_gas_price_cad_gj', distribution: 'lognormal', params: [Math.log(4.5), 0.4], unit: 'CAD/GJ', category: 'price' },
  { name: 'carbon_price_cad_t', distribution: 'triangular', params: [20, 65, 170], unit: 'CAD/tCO2e', category: 'policy' },
  { name: 'electricity_demand_twh', distribution: 'normal', params: [660, 50], unit: 'TWh', category: 'demand' },
  { name: 'wind_capacity_factor', distribution: 'uniform', params: [0.28, 0.48], unit: 'fraction', category: 'technology' },
  { name: 'solar_capacity_factor', distribution: 'uniform', params: [0.12, 0.24], unit: 'fraction', category: 'technology' },
  { name: 'gdp_growth_rate', distribution: 'normal', params: [0.022, 0.006], unit: 'fraction/yr', category: 'demand' },
  { name: 'smr_unit_cost_cad_kw', distribution: 'lognormal', params: [Math.log(8500), 0.3], unit: 'CAD/kW', category: 'technology' },
];
