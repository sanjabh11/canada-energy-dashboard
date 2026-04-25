import type { DemandRecord } from './demandForecaster';
import { rankFeaturesSvmRfeV2, type SvmRfeResult } from './advancedForecasting';

export const FEATURE_RANKING_BENCHMARK_VERSION = 'feature-ranking-parity-v1';
export const FEATURE_RANKING_BENCHMARK_SEED = 42;
export const FEATURE_RANKING_OVERLAP_FLOOR = 0.75;
export const FEATURE_RANKING_TARGET_KEY = 'target_demand_mw';

export interface FeatureRankingBenchmarkDataset {
  version: string;
  seed: number;
  targetKey: string;
  sampleCount: number;
  featureNames: string[];
  targetThreshold: number;
  dateRange: {
    start: string;
    end: string;
  };
  rows: Array<Record<string, number>>;
}

export interface FeatureRankingReferenceSummary {
  modelVersion: string;
  sampleCount: number;
  targetThreshold: number;
  retainedFeatures: string[];
  droppedFeatures: string[];
  rankings: Array<{
    feature: string;
    rank: number;
    retained: boolean;
    score: number;
  }>;
}

export interface FeatureRankingParityArtifact {
  version: string;
  seed: number;
  generatedAt: string;
  datasetFingerprint: string;
  sampleCount: number;
  targetKey: string;
  targetThreshold: number;
  overlapFloor: number;
  overlapRatio: number;
  parityPassed: boolean;
  tsModelVersion: string;
  referenceModelVersion: string;
  tsRetainedFeatures: string[];
  referenceRetainedFeatures: string[];
  rankingDeltas: Array<{
    feature: string;
    tsRank: number | null;
    referenceRank: number | null;
    retainedByTs: boolean;
    retainedByReference: boolean;
    tsScore: number | null;
    referenceScore: number | null;
  }>;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const mid = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[mid - 1] + ordered[mid]) / 2
    : ordered[mid];
}

function toHourOfWeek(record: DemandRecord): number {
  const date = new Date(record.datetime);
  return date.getDay() * 24 + date.getHours();
}

function rollingWindow(records: DemandRecord[], endExclusive: number, length: number): DemandRecord[] {
  return records.slice(Math.max(0, endExclusive - length), endExclusive);
}

export function buildFeatureRankingBenchmarkDataset(records: DemandRecord[]): FeatureRankingBenchmarkDataset {
  const ordered = [...records].sort(
    (left, right) => new Date(left.datetime).getTime() - new Date(right.datetime).getTime(),
  );
  const minimumLookback = 24 * 7;
  const rows: Array<Record<string, number>> = [];

  for (let index = minimumLookback; index < ordered.length; index += 1) {
    const current = ordered[index];
    const previousHour = ordered[index - 1];
    const previousDay = ordered[index - 24];
    const previousWeek = ordered[index - minimumLookback];
    if (!current || !previousHour || !previousDay || !previousWeek) continue;

    const last24 = rollingWindow(ordered, index, 24);
    const last168 = rollingWindow(ordered, index, minimumLookback);
    const currentDate = new Date(current.datetime);
    const hour = currentDate.getHours();
    const day = currentDate.getDay();
    const month = currentDate.getMonth();

    rows.push({
      previous_hour_mw: previousHour.total_demand_mw,
      previous_day_same_hour_mw: previousDay.total_demand_mw,
      previous_week_same_hour_mw: previousWeek.total_demand_mw,
      previous_hourly_gwh: previousHour.hourly_demand_gwh,
      rolling_24h_mean_mw: mean(last24.map((entry) => entry.total_demand_mw)),
      rolling_24h_std_mw: std(last24.map((entry) => entry.total_demand_mw)),
      rolling_168h_mean_mw: mean(last168.map((entry) => entry.total_demand_mw)),
      rolling_168h_std_mw: std(last168.map((entry) => entry.total_demand_mw)),
      delta_prev_hour_mw: previousHour.total_demand_mw - previousDay.total_demand_mw,
      delta_prev_week_mw: previousWeek.total_demand_mw - previousDay.total_demand_mw,
      hour_of_day: hour,
      hour_of_week: toHourOfWeek(current),
      month_of_year: month,
      weekend_flag: day === 0 || day === 6 ? 1 : 0,
      hour_sin: Math.sin((hour / 24) * Math.PI * 2),
      hour_cos: Math.cos((hour / 24) * Math.PI * 2),
      target_demand_mw: current.total_demand_mw,
    });
  }

  const targetValues = rows.map((row) => row[FEATURE_RANKING_TARGET_KEY] ?? 0);
  const featureNames = Object.keys(rows[0] ?? {}).filter((key) => key !== FEATURE_RANKING_TARGET_KEY);

  return {
    version: FEATURE_RANKING_BENCHMARK_VERSION,
    seed: FEATURE_RANKING_BENCHMARK_SEED,
    targetKey: FEATURE_RANKING_TARGET_KEY,
    sampleCount: rows.length,
    featureNames,
    targetThreshold: median(targetValues),
    dateRange: {
      start: ordered[minimumLookback]?.datetime ?? '',
      end: ordered[ordered.length - 1]?.datetime ?? '',
    },
    rows,
  };
}

export function runTsFeatureRankingBenchmark(dataset: FeatureRankingBenchmarkDataset): SvmRfeResult {
  return rankFeaturesSvmRfeV2(dataset.rows, dataset.targetKey, {
    minFeatures: 4,
    maxIterations: 10,
    positiveThreshold: dataset.targetThreshold,
  });
}

export function calculateRetainedFeatureOverlap(left: string[], right: string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);
  if (union.size === 0) return 1;
  const intersectionCount = [...leftSet].filter((feature) => rightSet.has(feature)).length;
  return intersectionCount / union.size;
}

export function buildFeatureRankingParityArtifact(input: {
  dataset: FeatureRankingBenchmarkDataset;
  datasetFingerprint: string;
  overlapFloor?: number;
  generatedAt?: string;
  tsResult: SvmRfeResult;
  reference: FeatureRankingReferenceSummary;
}): FeatureRankingParityArtifact {
  const overlapFloor = input.overlapFloor ?? FEATURE_RANKING_OVERLAP_FLOOR;
  const overlapRatio = calculateRetainedFeatureOverlap(
    input.tsResult.retainedFeatures,
    input.reference.retainedFeatures,
  );

  const tsRanks = new Map(
    input.tsResult.rankings.map((ranking, index) => [
      ranking.feature,
      { rank: index + 1, score: Number(ranking.score ?? 0), retained: ranking.retained },
    ]),
  );
  const referenceRanks = new Map(
    input.reference.rankings.map((ranking) => [
      ranking.feature,
      { rank: ranking.rank, score: Number(ranking.score ?? 0), retained: ranking.retained },
    ]),
  );
  const orderedFeatures = Array.from(
    new Set([
      ...input.dataset.featureNames,
      ...input.tsResult.rankings.map((ranking) => ranking.feature),
      ...input.reference.rankings.map((ranking) => ranking.feature),
    ]),
  ).sort((left, right) => left.localeCompare(right));

  return {
    version: FEATURE_RANKING_BENCHMARK_VERSION,
    seed: input.dataset.seed,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    datasetFingerprint: input.datasetFingerprint,
    sampleCount: input.dataset.sampleCount,
    targetKey: input.dataset.targetKey,
    targetThreshold: input.dataset.targetThreshold,
    overlapFloor,
    overlapRatio,
    parityPassed: overlapRatio >= overlapFloor,
    tsModelVersion: input.tsResult.modelVersion,
    referenceModelVersion: input.reference.modelVersion,
    tsRetainedFeatures: input.tsResult.retainedFeatures,
    referenceRetainedFeatures: input.reference.retainedFeatures,
    rankingDeltas: orderedFeatures.map((feature) => ({
      feature,
      tsRank: tsRanks.get(feature)?.rank ?? null,
      referenceRank: referenceRanks.get(feature)?.rank ?? null,
      retainedByTs: tsRanks.get(feature)?.retained ?? false,
      retainedByReference: referenceRanks.get(feature)?.retained ?? false,
      tsScore: tsRanks.get(feature)?.score ?? null,
      referenceScore: referenceRanks.get(feature)?.score ?? null,
    })),
  };
}
