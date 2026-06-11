/**
 * B10 – Sensitivity Analysis Engine
 *
 * Computes how scenario outcome metrics vary with respect to changes in
 * individual assumption parameters. Supports three analysis modes:
 *
 *   1. Local (One-at-a-time):  Vary each parameter ±δ while holding others fixed.
 *      Produces first-order partial derivative approximation (finite difference).
 *   2. Global (Morris Method):  Compute Morris elementary effects across
 *      the full parameter space for importance ranking.
 *   3. Tornado Chart:  Sort local sensitivities by absolute impact magnitude.
 *
 * Mathematical basis:
 *   - Saltelli et al. "Sensitivity Analysis in Practice" (2004) — Morris (1991)
 *   - Helton & Davis "Latin Hypercube Sampling" (2003) — parameter space sampling
 *   - IPCC AR6 scenario sensitivity standards
 *
 * Usage:
 *   const engine = new SensitivityEngine(modelFn);
 *   const result = await engine.localAnalysis(baseParams, { delta: 0.05 });
 *   const tornado = engine.tornadoChart(result);
 */

// ── Types ──────────────────────────────────────────────────────────────────────

/** A named scalar parameter with bounds */
export interface SensitivityParameter {
  name: string;
  value: number;
  /** Lower bound for sampling */
  min?: number;
  /** Upper bound for sampling */
  max?: number;
  /** Units for display */
  unit?: string;
  /** Category for grouping (e.g. "demand", "price", "policy") */
  category?: string;
}

export interface LocalSensitivityResult {
  parameter: string;
  baseValue: number;
  /** Absolute output change for +δ perturbation */
  positiveImpact: number;
  /** Absolute output change for -δ perturbation */
  negativeImpact: number;
  /** Normalised sensitivity: (dY/dX) * (X/Y) */
  elasticity: number;
  /** Rank by absolute impact (1 = most impactful) */
  rank: number;
  unit?: string;
  category?: string;
}

export interface LocalAnalysisOptions {
  /** Relative perturbation fraction (default 0.05 = 5%) */
  delta?: number;
  /** Metric key to extract from model output (default 'value') */
  outputMetric?: string;
}

export interface TornadoBar {
  parameter: string;
  lowValue: number;   // output when parameter is at lower bound
  highValue: number;  // output when parameter is at upper bound
  swing: number;      // highValue - lowValue
  category?: string;
}

export interface MorrisResult {
  parameter: string;
  mu: number;         // mean elementary effect
  muStar: number;     // mean absolute elementary effect
  sigma: number;      // std dev of elementary effects (interaction indicator)
  ranking: number;    // rank by muStar (1 = most influential)
}

// ── Model function type ────────────────────────────────────────────────────────

/** The model to be analysed: maps parameter values → output metric. */
export type ModelFunction = (params: Record<string, number>) => number | Promise<number>;

// ── Sensitivity Engine ─────────────────────────────────────────────────────────

export class SensitivityEngine {
  constructor(private readonly model: ModelFunction) {}

  /**
   * Local (one-at-a-time) sensitivity analysis via finite differences.
   * Perturbs each parameter ±delta while holding others at base values.
   */
  async localAnalysis(
    parameters: SensitivityParameter[],
    options: LocalAnalysisOptions = {},
  ): Promise<LocalSensitivityResult[]> {
    const delta = options.delta ?? 0.05;

    // Base model evaluation
    const baseParams = Object.fromEntries(parameters.map((p) => [p.name, p.value]));
    const baseOutput = await this.model(baseParams);

    if (!Number.isFinite(baseOutput) || baseOutput === 0) {
      throw new Error(
        `SensitivityEngine: base output is ${baseOutput} — cannot compute elasticity. ` +
        'Ensure model returns a non-zero finite value.',
      );
    }

    const results: LocalSensitivityResult[] = [];

    for (const param of parameters) {
      const perturbedUp = { ...baseParams, [param.name]: param.value * (1 + delta) };
      const perturbedDn = { ...baseParams, [param.name]: param.value * (1 - delta) };

      const [outputUp, outputDn] = await Promise.all([
        this.model(perturbedUp),
        this.model(perturbedDn),
      ]);

      const positiveImpact = outputUp - baseOutput;
      const negativeImpact = outputDn - baseOutput;

      // Elasticity: (ΔY/Y) / (ΔX/X) — uses central difference
      const dY = outputUp - outputDn;
      const dX = param.value * 2 * delta;
      const elasticity = dX !== 0 ? (dY / baseOutput) / (dX / param.value) : 0;

      results.push({
        parameter: param.name,
        baseValue: param.value,
        positiveImpact,
        negativeImpact,
        elasticity,
        rank: 0, // filled in below
        unit: param.unit,
        category: param.category,
      });
    }

    // Rank by absolute impact
    results.sort((a, b) =>
      Math.max(Math.abs(b.positiveImpact), Math.abs(b.negativeImpact)) -
      Math.max(Math.abs(a.positiveImpact), Math.abs(a.negativeImpact)),
    );
    results.forEach((r, i) => { r.rank = i + 1; });

    return results;
  }

  /**
   * Tornado chart data: sorts parameters by total swing (high - low output).
   * Uses parameter min/max if provided; otherwise falls back to ±delta.
   */
  async tornadoChart(
    parameters: SensitivityParameter[],
    delta = 0.20,
  ): Promise<TornadoBar[]> {
    const baseParams = Object.fromEntries(parameters.map((p) => [p.name, p.value]));
    const baseOutput = await this.model(baseParams);

    const bars: TornadoBar[] = [];

    for (const param of parameters) {
      const low = param.min ?? param.value * (1 - delta);
      const high = param.max ?? param.value * (1 + delta);

      const [lowOutput, highOutput] = await Promise.all([
        this.model({ ...baseParams, [param.name]: low }),
        this.model({ ...baseParams, [param.name]: high }),
      ]);

      bars.push({
        parameter: param.name,
        lowValue: Math.min(lowOutput, highOutput),
        highValue: Math.max(lowOutput, highOutput),
        swing: Math.abs(highOutput - lowOutput),
        category: param.category,
      });
    }

    // Sort descending by swing (widest bar first)
    bars.sort((a, b) => b.swing - a.swing);
    return bars;
  }

  /**
   * Morris Method global sensitivity analysis.
   * Estimates μ*, σ for each parameter across random trajectories.
   * r = number of trajectories (default 20); higher = more accurate but slower.
   *
   * Based on Morris (1991) and Campolongo et al. (2007) improved sampling.
   */
  async morrisMethod(
    parameters: SensitivityParameter[],
    r = 20,
    levels = 4,
  ): Promise<MorrisResult[]> {
    const k = parameters.length;
    const elementaryEffects: Record<string, number[]> = {};
    for (const p of parameters) elementaryEffects[p.name] = [];

    const delta = 1 / (2 * (levels - 1)); // Morris Δ

    for (let run = 0; run < r; run++) {
      // Random starting point in [0, 1-Δ]^k
      const x0 = parameters.map((p) => {
        const range = (p.max ?? p.value * 2) - (p.min ?? 0);
        const base = p.min ?? 0;
        return base + Math.random() * range * (1 - delta);
      });

      // Random permutation of parameters
      const order = [...Array(k).keys()].sort(() => Math.random() - 0.5);

      let xCurrent = [...x0];
      let yCurrent = await this.model(
        Object.fromEntries(parameters.map((p, i) => [p.name, xCurrent[i]])),
      );

      for (const idx of order) {
        const xNext = [...xCurrent];
        const range = (parameters[idx].max ?? parameters[idx].value * 2) - (parameters[idx].min ?? 0);
        xNext[idx] += delta * range;

        const yNext = await this.model(
          Object.fromEntries(parameters.map((p, i) => [p.name, xNext[i]])),
        );

        // Elementary effect: (f(x+Δei) - f(x)) / Δ
        const ee = (yNext - yCurrent) / (delta * range || 1);
        elementaryEffects[parameters[idx].name].push(ee);

        xCurrent = xNext;
        yCurrent = yNext;
      }
    }

    const results: MorrisResult[] = parameters.map((p) => {
      const ees = elementaryEffects[p.name];
      const n = ees.length;
      if (n === 0) return { parameter: p.name, mu: 0, muStar: 0, sigma: 0, ranking: 0 };
      const mu = ees.reduce((s, e) => s + e, 0) / n;
      const muStar = ees.reduce((s, e) => s + Math.abs(e), 0) / n;
      const variance = ees.reduce((s, e) => s + (e - mu) ** 2, 0) / n;
      return { parameter: p.name, mu, muStar, sigma: Math.sqrt(variance), ranking: 0 };
    });

    // Rank by muStar
    results.sort((a, b) => b.muStar - a.muStar);
    results.forEach((r, i) => { r.ranking = i + 1; });
    return results;
  }
}

// ── Preset scenario parameter sets ────────────────────────────────────────────

/**
 * Standard CER 2026 Energy Futures sensitivity parameters for Canadian
 * electricity dispatch modelling.
 */
export const CER_SENSITIVITY_PARAMS: SensitivityParameter[] = [
  { name: 'natural_gas_price_cad_gj', value: 4.5, min: 2.0, max: 12.0, unit: 'CAD/GJ', category: 'price' },
  { name: 'carbon_price_cad_t', value: 65, min: 20, max: 170, unit: 'CAD/tCO2e', category: 'policy' },
  { name: 'electricity_demand_twh', value: 660, min: 540, max: 900, unit: 'TWh', category: 'demand' },
  { name: 'wind_capacity_factor', value: 0.38, min: 0.28, max: 0.48, unit: 'fraction', category: 'technology' },
  { name: 'solar_capacity_factor', value: 0.17, min: 0.12, max: 0.24, unit: 'fraction', category: 'technology' },
  { name: 'coal_retirement_gw', value: 8.0, min: 4.0, max: 12.0, unit: 'GW', category: 'policy' },
  { name: 'ev_adoption_rate', value: 0.45, min: 0.25, max: 0.70, unit: 'fraction', category: 'demand' },
  { name: 'gdp_growth_rate', value: 0.022, min: 0.010, max: 0.035, unit: 'fraction/yr', category: 'demand' },
  { name: 'transmission_expansion_gw', value: 15.0, min: 5.0, max: 30.0, unit: 'GW', category: 'infrastructure' },
  { name: 'smr_unit_cost_cad_kw', value: 8500, min: 5000, max: 15000, unit: 'CAD/kW', category: 'technology' },
];
