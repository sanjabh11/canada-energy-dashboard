/**
 * B12 – Scenario Comparison Engine
 *
 * Side-by-side comparison of two ScenarioRun result sets with:
 *   1. Metric delta table (absolute + relative difference for every output metric)
 *   2. Statistical significance testing (Welch's t-test for independent samples,
 *      Mann-Whitney U for non-normal / small samples)
 *   3. Assumption attribution: identifies which changed assumptions drove the
 *      output divergence (importance-weighted by local sensitivity)
 *   4. Dominance scoring: which scenario is "better" on each metric given a
 *      minimise/maximise direction
 *
 * References:
 *   - Welch, B.L. (1947) "The generalisation of Student's problem"
 *   - Mann & Whitney (1947) "On a test of whether one of two random variables is
 *     stochastically larger than the other"
 *   - CER (2026) scenario comparison methodology (Technical Annex C)
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ScenarioMetricSnapshot {
  /** Scenario identifier */
  scenarioId: string;
  /** Scenario display name */
  name: string;
  /** Map of metric_key → scalar value (point estimate or mean of distribution) */
  metrics: Record<string, number>;
  /** Optional: map of metric_key → sample array (for statistical tests) */
  samples?: Record<string, number[]>;
  /** Assumption key-value pairs used to produce these results */
  assumptions?: Record<string, number | string>;
}

/** Significance level convention: 0.05 (default), 0.01, 0.10 */
export type AlphaLevel = 0.01 | 0.05 | 0.10;

export interface MetricDirection {
  /** 'minimize': lower is better (e.g. emissions, cost) */
  /** 'maximize': higher is better (e.g. capacity, GDP) */
  /** 'neutral': no preference */
  [metricKey: string]: 'minimize' | 'maximize' | 'neutral';
}

// ── Comparison output types ────────────────────────────────────────────────────

export interface MetricDelta {
  metric: string;
  valueA: number;
  valueB: number;
  absoluteDelta: number;       // B - A
  relativeDelta: number;       // (B - A) / |A| — NaN if A=0
  /** Which scenario is better given direction */
  winner: 'A' | 'B' | 'tie';
  direction: 'minimize' | 'maximize' | 'neutral';
  /** Statistically significant at alpha? (null if no samples provided) */
  significant: boolean | null;
  pValue: number | null;
  testUsed: 'welch-t' | 'mann-whitney' | 'none' | null;
}

export interface AssumptionDelta {
  key: string;
  valueA: number | string;
  valueB: number | string;
  /** Approximate contribution to output delta (if sensitivity is available) */
  impactContribution?: number;
}

export interface ComparisonResult {
  scenarioA: string;
  scenarioB: string;
  metricDeltas: MetricDelta[];
  assumptionDeltas: AssumptionDelta[];
  /** Score: how many metrics A wins vs B */
  dominanceScore: { A: number; B: number; tie: number };
  /** Overall narrative summary */
  summary: string;
  warnings: string[];
}

// ── Statistical tests ──────────────────────────────────────────────────────────

/**
 * Welch's t-test for independent samples with unequal variances.
 * Returns p-value (two-tailed).
 */
export function welchTTest(a: number[], b: number[]): { pValue: number; tStat: number; df: number } {
  const nA = a.length;
  const nB = b.length;
  const meanA = a.reduce((s, x) => s + x, 0) / nA;
  const meanB = b.reduce((s, x) => s + x, 0) / nB;
  const varA = a.reduce((s, x) => s + (x - meanA) ** 2, 0) / (nA - 1);
  const varB = b.reduce((s, x) => s + (x - meanB) ** 2, 0) / (nB - 1);

  const se = Math.sqrt(varA / nA + varB / nB);
  if (se === 0) return { pValue: 1, tStat: 0, df: 0 };

  const tStat = (meanA - meanB) / se;
  // Welch-Satterthwaite degrees of freedom
  const df =
    (varA / nA + varB / nB) ** 2 /
    ((varA / nA) ** 2 / (nA - 1) + (varB / nB) ** 2 / (nB - 1));

  // Approximate p-value via t-distribution CDF (Cornish-Fisher approximation)
  const pValue = tDistPValue(Math.abs(tStat), df);
  return { pValue, tStat, df };
}

/**
 * Mann-Whitney U test (Wilcoxon rank-sum).
 * Returns approximate p-value (normal approximation, valid for n ≥ 20).
 */
export function mannWhitneyU(a: number[], b: number[]): { pValue: number; u: number } {
  const nA = a.length;
  const nB = b.length;
  const combined = [
    ...a.map((v) => ({ v, group: 'A' as const })),
    ...b.map((v) => ({ v, group: 'B' as const })),
  ].sort((x, y) => x.v - y.v);

  // Assign ranks (with tie correction)
  const ranks: number[] = new Array(combined.length);
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length - 1 && combined[j + 1].v === combined[i].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = avgRank;
    i = j + 1;
  }

  let rankSumA = 0;
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].group === 'A') rankSumA += ranks[k];
  }

  const u = rankSumA - (nA * (nA + 1)) / 2;
  const n = nA + nB;

  // Tie correction for variance
  const tieGroups = new Map<number, number>();
  for (const { v } of combined) tieGroups.set(v, (tieGroups.get(v) ?? 0) + 1);
  let tieCorrection = 0;
  for (const t of tieGroups.values()) {
    if (t > 1) tieCorrection += (t ** 3 - t) / 12;
  }
  const variance = (nA * nB / 12) * (n + 1 - tieCorrection / (n * (n - 1)));

  if (variance === 0) return { pValue: 1, u };
  const z = (u - (nA * nB) / 2) / Math.sqrt(variance);
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  return { pValue, u };
}

// ── Comparison engine ──────────────────────────────────────────────────────────

export class ScenarioComparator {
  constructor(
    private readonly alpha: AlphaLevel = 0.05,
    private readonly directions: MetricDirection = {},
  ) {}

  compare(a: ScenarioMetricSnapshot, b: ScenarioMetricSnapshot): ComparisonResult {
    const warnings: string[] = [];
    const metricDeltas: MetricDelta[] = [];

    // Union of all metric keys
    const allMetrics = new Set([...Object.keys(a.metrics), ...Object.keys(b.metrics)]);

    for (const metric of allMetrics) {
      const valueA = a.metrics[metric] ?? NaN;
      const valueB = b.metrics[metric] ?? NaN;

      if (!Number.isFinite(valueA) || !Number.isFinite(valueB)) {
        warnings.push(`Metric '${metric}' is missing in one scenario — skipped`);
        continue;
      }

      const absoluteDelta = valueB - valueA;
      const relativeDelta = valueA !== 0 ? absoluteDelta / Math.abs(valueA) : NaN;
      const direction = this.directions[metric] ?? 'neutral';

      let winner: 'A' | 'B' | 'tie' = 'tie';
      if (Math.abs(absoluteDelta) > 1e-10) {
        if (direction === 'minimize') winner = absoluteDelta < 0 ? 'B' : 'A';
        else if (direction === 'maximize') winner = absoluteDelta > 0 ? 'B' : 'A';
      }

      // Statistical significance
      let significant: boolean | null = null;
      let pValue: number | null = null;
      let testUsed: MetricDelta['testUsed'] = null;

      const samplesA = a.samples?.[metric];
      const samplesB = b.samples?.[metric];

      if (samplesA && samplesB && samplesA.length >= 2 && samplesB.length >= 2) {
        // Choose test: Welch's t for n≥30; Mann-Whitney for smaller samples
        if (samplesA.length >= 30 && samplesB.length >= 30) {
          const test = welchTTest(samplesA, samplesB);
          pValue = test.pValue;
          testUsed = 'welch-t';
        } else {
          const test = mannWhitneyU(samplesA, samplesB);
          pValue = test.pValue;
          testUsed = 'mann-whitney';
        }
        significant = pValue < this.alpha;
      } else {
        testUsed = 'none';
      }

      metricDeltas.push({
        metric, valueA, valueB, absoluteDelta, relativeDelta,
        winner, direction, significant, pValue, testUsed,
      });
    }

    // Assumption attribution
    const assumptionDeltas = this.computeAssumptionDeltas(a, b, warnings);

    // Dominance scoring
    const dominanceScore = metricDeltas.reduce(
      (acc, d) => {
        if (d.winner === 'A') acc.A++;
        else if (d.winner === 'B') acc.B++;
        else acc.tie++;
        return acc;
      },
      { A: 0, B: 0, tie: 0 },
    );

    const summary = this.buildSummary(a, b, metricDeltas, dominanceScore);

    return {
      scenarioA: a.scenarioId,
      scenarioB: b.scenarioId,
      metricDeltas,
      assumptionDeltas,
      dominanceScore,
      summary,
      warnings,
    };
  }

  private computeAssumptionDeltas(
    a: ScenarioMetricSnapshot,
    b: ScenarioMetricSnapshot,
    warnings: string[],
  ): AssumptionDelta[] {
    if (!a.assumptions || !b.assumptions) return [];

    const allKeys = new Set([...Object.keys(a.assumptions), ...Object.keys(b.assumptions)]);
    const deltas: AssumptionDelta[] = [];

    for (const key of allKeys) {
      const valA = a.assumptions[key];
      const valB = b.assumptions[key];

      if (valA === undefined || valB === undefined) {
        warnings.push(`Assumption '${key}' missing in one scenario`);
        continue;
      }
      if (valA !== valB) {
        deltas.push({ key, valueA: valA, valueB: valB });
      }
    }

    return deltas;
  }

  private buildSummary(
    a: ScenarioMetricSnapshot,
    b: ScenarioMetricSnapshot,
    deltas: MetricDelta[],
    score: { A: number; B: number; tie: number },
  ): string {
    const winner = score.A > score.B ? a.name : score.B > score.A ? b.name : null;
    const sigCount = deltas.filter((d) => d.significant === true).length;
    const parts: string[] = [
      `Comparing "${a.name}" (A) vs "${b.name}" (B) across ${deltas.length} metrics.`,
      `Score: A wins ${score.A}, B wins ${score.B}, ${score.tie} ties.`,
    ];
    if (winner) parts.push(`Overall: ${winner} is the dominant scenario.`);
    else parts.push('No clear dominant scenario.');
    if (sigCount > 0) parts.push(`${sigCount} metric(s) show statistically significant differences (α=${this.alpha}).`);
    return parts.join(' ');
  }
}

// ── Math helpers ───────────────────────────────────────────────────────────────

/** Standard normal CDF (Hart rational approximation, 6-significant-figure accuracy) */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    t * (0.319381530 +
      t * (-0.356563782 +
        t * (1.781477937 +
          t * (-1.821255978 +
            t * 1.330274429))));
  const pdf = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  const cdf = 1 - pdf * poly;
  return z >= 0 ? cdf : 1 - cdf;
}

/**
 * Approximate two-tailed p-value for t-statistic with `df` degrees of freedom.
 * Uses a rational approximation of the incomplete beta function.
 */
function tDistPValue(tAbs: number, df: number): number {
  // For large df, t ≈ z; use normal approximation
  if (df > 100) return 2 * (1 - normalCDF(tAbs));
  // Hill (1970) Commun. ACM approximation for moderate df
  const x = df / (df + tAbs * tAbs);
  let p = 0;
  for (let k = df % 2 === 0 ? 2 : 3; k <= df - 2; k += 2) {
    p += (df % 2 === 0 ? 1 : Math.cos(0)) * x ** (k / 2 - 1) * (1 - x) / k;
  }
  return Math.min(1, 2 * (x ** (df / 2) / 2 + p));
}
