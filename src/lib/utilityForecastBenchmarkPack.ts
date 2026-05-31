import type { ForecastMetrics } from './demandForecaster';
import {
  buildUtilityForecastPackage,
  generateOntarioPublicUtilitySampleRows,
  ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST,
  type ForecastEvidenceReport,
  type UtilityHistoricalLoadRow,
  type UtilityInputSourceKind,
  type UtilityJurisdiction,
  type UtilityPlanningScenario,
} from './utilityForecasting';

export const UTILITY_MULTI_DATASET_BENCHMARK_VERSION = 'utility-multi-dataset-benchmark-v2';
const NOMINAL_INTERVAL_COVERAGE_PCT = 90;

export type UtilityBenchmarkSourceScope =
  | 'public_system_sample'
  | 'public_benchmark_sample'
  | 'starter_dataset'
  | 'buyer_supplied_anonymized';

export interface PublicOntarioDemandRecord {
  datetime: string;
  total_demand_mw: number;
  hourly_demand_gwh?: number;
  date?: string;
  hour_ending?: number;
}

export interface PublicHouseholdDemandRecord {
  datetime: string;
  household_id: string;
  electricity_demand: number;
  temperature?: number | null;
  location?: string;
  hour?: number;
}

export interface UtilityBenchmarkDatasetInput {
  dataset_id: string;
  label: string;
  jurisdiction: UtilityJurisdiction;
  source_scope: UtilityBenchmarkSourceScope;
  source_kind?: UtilityInputSourceKind;
  source_url?: string;
  source_file?: string;
  rows: UtilityHistoricalLoadRow[];
  scenario: UtilityPlanningScenario;
}

export interface UtilityBenchmarkMethodologyReference {
  label: string;
  url: string;
  use: string;
}

export interface UtilityBenchmarkScientificDiagnostics {
  seasonal_mase: number;
  best_naive_scaled_mae: number;
  scale_free_skill_score_pct: number;
  interval_nominal_coverage_pct: number;
  interval_calibration_gap_pct: number;
  interval_width_to_mae_ratio: number;
  adjudication: 'beats_best_naive' | 'baseline_win_review' | 'insufficient_holdout';
  notes: string[];
}

export interface UtilityBenchmarkDatasetResult {
  dataset_id: string;
  label: string;
  jurisdiction: UtilityJurisdiction;
  source_scope: UtilityBenchmarkSourceScope;
  source_kind: UtilityInputSourceKind;
  source_url?: string;
  source_file?: string;
  manifest_id: string;
  manifest_hash: string;
  sample_size: number;
  metrics: Pick<
    ForecastMetrics,
    | 'mae'
    | 'mape'
    | 'rmse'
    | 'persistence_mae'
    | 'seasonal_naive_mae'
    | 'skill_score_vs_persistence'
    | 'skill_score_vs_seasonal'
    | 'sample_size'
  >;
  rolling_origin_split_count: number;
  conformal_interval_coverage_pct: number;
  conformal_interval_width_mw: number;
  scientific_diagnostics: UtilityBenchmarkScientificDiagnostics;
  champion_challenger: ForecastEvidenceReport['champion_challenger'];
  benchmark_failure_notes: string[];
  warnings: string[];
  buyer_specific_accuracy_claim: false;
}

export interface UtilityMultiDatasetBenchmarkPack {
  version: string;
  generated_at: string;
  dataset_count: number;
  buyer_specific_accuracy_claim: false;
  confidence_boundary: string;
  methodology_references: UtilityBenchmarkMethodologyReference[];
  datasets: UtilityBenchmarkDatasetResult[];
  aggregate: {
    mean_model_mae: number;
    mean_persistence_mae: number;
    mean_seasonal_naive_mae: number;
    mean_seasonal_mase: number;
    mean_best_naive_scaled_mae: number;
    datasets_beating_best_naive: number;
    baseline_win_count: number;
    datasets_with_three_splits: number;
    minimum_interval_coverage_pct: number;
    maximum_interval_calibration_gap_pct: number;
  };
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toIsoTimestamp(value: string): string {
  const parsed = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function sourceKindForScope(scope: UtilityBenchmarkSourceScope): UtilityInputSourceKind {
  if (scope === 'public_system_sample') return 'public_system_sample';
  if (scope === 'public_benchmark_sample') return 'public_enrichment';
  if (scope === 'buyer_supplied_anonymized') return 'uploaded_historical';
  return 'fallback_starter';
}

const methodologyReferences: UtilityBenchmarkMethodologyReference[] = [
  {
    label: 'Hyndman and Koehler forecast accuracy measures',
    url: 'https://robjhyndman.com/publications/another-look-at-measures-of-forecast-accuracy/',
    use: 'Adds scale-free seasonal MASE so public/sample datasets with different load magnitudes can be compared without relying only on MW-scale MAE.',
  },
  {
    label: 'Gneiting and Raftery proper scoring rules',
    url: 'https://stat.uw.edu/research/tech-reports/strictly-proper-scoring-rules-prediction-and-estimation-revised',
    use: 'Keeps interval quality visible through calibration gap and sharpness diagnostics, while avoiding a full proper interval-score claim until split-level buyer backtests are retained.',
  },
  {
    label: 'Nixtla conformal prediction for time series',
    url: 'https://nixtlaverse.nixtla.io/statsforecast/docs/tutorials/conformalprediction.html',
    use: 'Supports the coverage-calibration framing for conformal intervals and the need for cross-validation windows.',
  },
];

export function buildBenchmarkScenario(jurisdiction: UtilityJurisdiction): UtilityPlanningScenario {
  return {
    jurisdiction,
    planning_horizon_years: [1, 5, 10],
    weather_case: 'median',
    annual_load_growth_pct: jurisdiction === 'Ontario' ? 1.4 : 1.7,
    committed_load_mw: 4,
    ev_growth_mw: 3,
    heat_pump_growth_mw: 2,
    der_offset_mw: 1.5,
    demand_response_reduction_mw: 1,
    demand_response_shift_pct: 4,
    capacity_buffer_pct: 18,
  };
}

export function ontarioDemandRecordsToUtilityRows(
  records: PublicOntarioDemandRecord[],
  sourceSystem = 'ontario-demand-public-benchmark-sample',
): UtilityHistoricalLoadRow[] {
  return records
    .filter((record) => Number.isFinite(record.total_demand_mw) && record.datetime)
    .map((record) => ({
      timestamp: toIsoTimestamp(record.datetime),
      geography_level: 'system',
      geography_id: 'ONTARIO-SYSTEM-PUBLIC-BENCHMARK',
      customer_class: 'system',
      demand_mw: record.total_demand_mw,
      net_load_mw: record.total_demand_mw,
      gross_load_mw: record.total_demand_mw,
      source_system: sourceSystem,
      quality_flags: ['missing_temperature', 'customer_count_missing'],
    }));
}

export function householdDemandRecordsToUtilityRows(
  records: PublicHouseholdDemandRecord[],
  sourceSystem = 'household-demand-public-benchmark-sample',
): UtilityHistoricalLoadRow[] {
  return records
    .filter((record) => Number.isFinite(record.electricity_demand) && record.datetime)
    .map((record) => ({
      timestamp: toIsoTimestamp(record.datetime),
      geography_level: 'feeder',
      geography_id: record.location ?? 'HOUSEHOLD-BENCHMARK',
      customer_class: 'residential',
      demand_mw: round(Math.max(record.electricity_demand, 0) / 1000, 6),
      temperature_c: Number.isFinite(record.temperature ?? Number.NaN) ? record.temperature ?? null : null,
      customer_count: 1,
      source_system: sourceSystem,
      feeder_id: record.household_id,
      quality_flags: [],
    }));
}

export function buildDefaultUtilityBenchmarkInputs(): UtilityBenchmarkDatasetInput[] {
  return [
    {
      dataset_id: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.id,
      label: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.label,
      jurisdiction: 'Ontario',
      source_scope: 'public_system_sample',
      source_kind: 'public_system_sample',
      source_url: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_url,
      source_file: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.source_file,
      rows: generateOntarioPublicUtilitySampleRows(),
      scenario: buildBenchmarkScenario('Ontario'),
    },
  ];
}

function buildAggregatedSeries(rows: UtilityHistoricalLoadRow[]): Array<{ timestamp: string; demand_mw: number }> {
  const byTimestamp = new Map<string, number>();
  rows.forEach((row) => {
    byTimestamp.set(row.timestamp, (byTimestamp.get(row.timestamp) ?? 0) + Math.max(row.demand_mw, 0));
  });
  return Array.from(byTimestamp.entries())
    .map(([timestamp, demand_mw]) => ({ timestamp, demand_mw }))
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}

function inferSeasonalPeriod(series: Array<{ timestamp: string; demand_mw: number }>): number {
  if (series.length < 3) return 1;
  const deltasHours: number[] = [];
  for (let index = 1; index < series.length; index += 1) {
    const deltaHours = (new Date(series[index].timestamp).getTime() - new Date(series[index - 1].timestamp).getTime()) / 3600_000;
    if (deltaHours > 0) deltasHours.push(deltaHours);
  }
  if (deltasHours.length === 0) return 1;
  const sorted = [...deltasHours].sort((left, right) => left - right);
  const medianHours = sorted[Math.floor(sorted.length / 2)];
  return medianHours >= 24 * 20 ? 12 : 24;
}

function meanAbsoluteSeasonalDifference(
  series: Array<{ timestamp: string; demand_mw: number }>,
  period: number,
): number {
  if (series.length <= period) return 0;
  const differences: number[] = [];
  for (let index = period; index < series.length; index += 1) {
    differences.push(Math.abs(series[index].demand_mw - series[index - period].demand_mw));
  }
  if (differences.length === 0) return 0;
  return differences.reduce((sum, value) => sum + value, 0) / differences.length;
}

function buildScientificDiagnostics(
  input: UtilityBenchmarkDatasetInput,
  metrics: UtilityBenchmarkDatasetResult['metrics'],
  rollingOriginSplitCount: number,
  conformalIntervalCoveragePct: number,
  conformalIntervalWidthMw: number,
): UtilityBenchmarkScientificDiagnostics {
  const series = buildAggregatedSeries(input.rows);
  const holdoutSize = Math.min(series.length, Math.max(0, metrics.sample_size));
  const inSampleSeries = holdoutSize > 0 && series.length > holdoutSize
    ? series.slice(0, series.length - holdoutSize)
    : series;
  const seasonalPeriod = inferSeasonalPeriod(series);
  const seasonalScale = meanAbsoluteSeasonalDifference(inSampleSeries, seasonalPeriod)
    || meanAbsoluteSeasonalDifference(inSampleSeries, 1);
  const baselineMaes = [metrics.persistence_mae, metrics.seasonal_naive_mae]
    .filter((value) => Number.isFinite(value) && value > 0);
  const bestNaiveMae = baselineMaes.length > 0 ? Math.min(...baselineMaes) : 0;
  const bestNaiveScaledMae = bestNaiveMae > 0 ? metrics.mae / bestNaiveMae : 0;
  const seasonalMase = seasonalScale > 0 ? metrics.mae / seasonalScale : 0;
  const intervalCalibrationGap = Math.abs(conformalIntervalCoveragePct - NOMINAL_INTERVAL_COVERAGE_PCT);
  const intervalWidthToMaeRatio = metrics.mae > 0 ? conformalIntervalWidthMw / metrics.mae : 0;
  const adjudication = metrics.sample_size <= 0 || bestNaiveMae <= 0
    ? 'insufficient_holdout'
    : bestNaiveScaledMae <= 1
      ? 'beats_best_naive'
      : 'baseline_win_review';

  return {
    seasonal_mase: round(seasonalMase, 3),
    best_naive_scaled_mae: round(bestNaiveScaledMae, 3),
    scale_free_skill_score_pct: bestNaiveMae > 0 ? round((1 - bestNaiveScaledMae) * 100, 2) : 0,
    interval_nominal_coverage_pct: NOMINAL_INTERVAL_COVERAGE_PCT,
    interval_calibration_gap_pct: round(intervalCalibrationGap, 2),
    interval_width_to_mae_ratio: round(intervalWidthToMaeRatio, 3),
    adjudication,
    notes: [
      `Seasonal MASE uses an in-sample ${seasonalPeriod}-interval seasonal naive scale from the public/sample source series.`,
      'Best-naive scaled MAE below 1.0 means the transparent model beats the strongest naive challenger on the holdout diagnostic.',
      'Interval calibration gap compares rolling-origin coverage with nominal 90% coverage; width/MAE ratio is a sharpness diagnostic, not a buyer-specific uncertainty guarantee.',
      ...(rollingOriginSplitCount < 3 ? ['Fewer than three rolling-origin splits: treat interval diagnostics as pilot-readiness evidence only.'] : []),
      ...(adjudication === 'baseline_win_review' ? ['Best naive baseline wins: attach failure note before any buyer-facing forecast accuracy discussion.'] : []),
    ],
  };
}

export function buildUtilityMultiDatasetBenchmarkPack(
  inputs: UtilityBenchmarkDatasetInput[],
  generatedAt = new Date().toISOString(),
): UtilityMultiDatasetBenchmarkPack {
  const datasets = inputs.map((input) => {
    const sourceKind = input.source_kind ?? sourceKindForScope(input.source_scope);
    const forecastPackage = buildUtilityForecastPackage({
      rows: input.rows,
      scenario: input.scenario,
      sourceLabel: input.label,
      isSampleData: input.source_scope === 'starter_dataset',
      sourceKind,
    });

    const metrics = {
      mae: forecastPackage.benchmark.mae,
      mape: forecastPackage.benchmark.mape,
      rmse: forecastPackage.benchmark.rmse,
      persistence_mae: forecastPackage.benchmark.persistence_mae,
      seasonal_naive_mae: forecastPackage.benchmark.seasonal_naive_mae,
      skill_score_vs_persistence: forecastPackage.benchmark.skill_score_vs_persistence,
      skill_score_vs_seasonal: forecastPackage.benchmark.skill_score_vs_seasonal,
      sample_size: forecastPackage.benchmark.sample_size,
    };
    const rollingOriginSplitCount = forecastPackage.evidence_report.rolling_origin_splits.length;
    const conformalIntervalCoveragePct = forecastPackage.evidence_report.conformal_interval_coverage_pct;
    const conformalIntervalWidthMw = forecastPackage.evidence_report.conformal_interval_width_mw;

    return {
      dataset_id: input.dataset_id,
      label: input.label,
      jurisdiction: input.jurisdiction,
      source_scope: input.source_scope,
      source_kind: sourceKind,
      source_url: input.source_url,
      source_file: input.source_file,
      manifest_id: forecastPackage.source_manifest.id,
      manifest_hash: forecastPackage.source_manifest.hash,
      sample_size: forecastPackage.benchmark.sample_size,
      metrics,
      rolling_origin_split_count: rollingOriginSplitCount,
      conformal_interval_coverage_pct: conformalIntervalCoveragePct,
      conformal_interval_width_mw: conformalIntervalWidthMw,
      scientific_diagnostics: buildScientificDiagnostics(
        input,
        metrics,
        rollingOriginSplitCount,
        conformalIntervalCoveragePct,
        conformalIntervalWidthMw,
      ),
      champion_challenger: forecastPackage.evidence_report.champion_challenger,
      benchmark_failure_notes: forecastPackage.evidence_report.benchmark_failure_notes,
      warnings: forecastPackage.warnings,
      buyer_specific_accuracy_claim: false as const,
    };
  });

  const datasetCount = datasets.length || 1;
  return {
    version: UTILITY_MULTI_DATASET_BENCHMARK_VERSION,
    generated_at: generatedAt,
    dataset_count: datasets.length,
    buyer_specific_accuracy_claim: false,
    confidence_boundary: 'Public/sample benchmark evidence supports model discipline only; buyer-specific accuracy remains blocked until accepted buyer data and reviewer evidence are attached.',
    methodology_references: methodologyReferences,
    datasets,
    aggregate: {
      mean_model_mae: round(datasets.reduce((sum, dataset) => sum + dataset.metrics.mae, 0) / datasetCount),
      mean_persistence_mae: round(datasets.reduce((sum, dataset) => sum + dataset.metrics.persistence_mae, 0) / datasetCount),
      mean_seasonal_naive_mae: round(datasets.reduce((sum, dataset) => sum + dataset.metrics.seasonal_naive_mae, 0) / datasetCount),
      mean_seasonal_mase: round(datasets.reduce((sum, dataset) => sum + dataset.scientific_diagnostics.seasonal_mase, 0) / datasetCount, 3),
      mean_best_naive_scaled_mae: round(datasets.reduce((sum, dataset) => sum + dataset.scientific_diagnostics.best_naive_scaled_mae, 0) / datasetCount, 3),
      datasets_beating_best_naive: datasets.filter((dataset) => dataset.scientific_diagnostics.adjudication === 'beats_best_naive').length,
      baseline_win_count: datasets.filter((dataset) => dataset.benchmark_failure_notes.length > 0).length,
      datasets_with_three_splits: datasets.filter((dataset) => dataset.rolling_origin_split_count >= 3).length,
      minimum_interval_coverage_pct: datasets.length > 0
        ? Math.min(...datasets.map((dataset) => dataset.conformal_interval_coverage_pct))
        : 0,
      maximum_interval_calibration_gap_pct: datasets.length > 0
        ? Math.max(...datasets.map((dataset) => dataset.scientific_diagnostics.interval_calibration_gap_pct))
        : 0,
    },
  };
}

function csvCell(value: string | number | boolean | undefined): string {
  if (value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function utilityMultiDatasetBenchmarkPackToCsv(pack: UtilityMultiDatasetBenchmarkPack): string {
  const header = [
    'dataset_id',
    'label',
    'jurisdiction',
    'source_scope',
    'source_kind',
    'sample_size',
    'mae',
    'mape',
    'rmse',
    'persistence_mae',
    'seasonal_naive_mae',
    'skill_score_vs_persistence_pct',
    'skill_score_vs_seasonal_naive_pct',
    'seasonal_mase',
    'best_naive_scaled_mae',
    'scale_free_skill_score_pct',
    'rolling_origin_split_count',
    'interval_coverage_pct',
    'interval_calibration_gap_pct',
    'interval_width_to_mae_ratio',
    'adjudication',
    'challenger_model',
    'benchmark_failure_notes',
    'buyer_specific_accuracy_claim',
  ];

  return [
    header.join(','),
    ...pack.datasets.map((dataset) => [
      dataset.dataset_id,
      dataset.label,
      dataset.jurisdiction,
      dataset.source_scope,
      dataset.source_kind,
      dataset.sample_size,
      dataset.metrics.mae,
      dataset.metrics.mape,
      dataset.metrics.rmse,
      dataset.metrics.persistence_mae,
      dataset.metrics.seasonal_naive_mae,
      dataset.metrics.skill_score_vs_persistence,
      dataset.metrics.skill_score_vs_seasonal,
      dataset.scientific_diagnostics.seasonal_mase,
      dataset.scientific_diagnostics.best_naive_scaled_mae,
      dataset.scientific_diagnostics.scale_free_skill_score_pct,
      dataset.rolling_origin_split_count,
      dataset.conformal_interval_coverage_pct,
      dataset.scientific_diagnostics.interval_calibration_gap_pct,
      dataset.scientific_diagnostics.interval_width_to_mae_ratio,
      dataset.scientific_diagnostics.adjudication,
      dataset.champion_challenger.challenger,
      dataset.benchmark_failure_notes.join(' | ') || 'none',
      dataset.buyer_specific_accuracy_claim,
    ].map(csvCell).join(',')),
  ].join('\n');
}

export function utilityMultiDatasetBenchmarkPackToMarkdown(pack: UtilityMultiDatasetBenchmarkPack): string {
  return [
    '# Utility multi-dataset benchmark pack',
    '',
    `- Version: ${pack.version}`,
    `- Generated: ${pack.generated_at}`,
    `- Dataset count: ${pack.dataset_count}`,
    `- Buyer-specific accuracy claim: ${pack.buyer_specific_accuracy_claim ? 'yes' : 'no'}`,
    `- Confidence boundary: ${pack.confidence_boundary}`,
    `- Baseline-win count: ${pack.aggregate.baseline_win_count}`,
    `- Datasets beating best naive challenger: ${pack.aggregate.datasets_beating_best_naive}`,
    `- Mean seasonal MASE: ${pack.aggregate.mean_seasonal_mase.toFixed(3)}`,
    `- Mean best-naive scaled MAE: ${pack.aggregate.mean_best_naive_scaled_mae.toFixed(3)}`,
    `- Max interval calibration gap: ${pack.aggregate.maximum_interval_calibration_gap_pct.toFixed(1)}%`,
    `- Datasets with >=3 rolling-origin splits: ${pack.aggregate.datasets_with_three_splits}`,
    '',
    '| Dataset | Scope | MAE | Seasonal MASE | Best-naive scaled MAE | Interval gap | Width/MAE | Rolling splits | Challenger | Adjudication | Failure notes |',
    '|---|---|---:|---:|---:|---:|---:|---:|---|---|---|',
    ...pack.datasets.map((dataset) => [
      dataset.label,
      dataset.source_scope,
      dataset.metrics.mae.toFixed(2),
      dataset.scientific_diagnostics.seasonal_mase.toFixed(3),
      dataset.scientific_diagnostics.best_naive_scaled_mae.toFixed(3),
      `${dataset.scientific_diagnostics.interval_calibration_gap_pct.toFixed(1)}%`,
      dataset.scientific_diagnostics.interval_width_to_mae_ratio.toFixed(3),
      dataset.rolling_origin_split_count,
      dataset.champion_challenger.challenger,
      dataset.scientific_diagnostics.adjudication,
      dataset.benchmark_failure_notes.join(' ') || 'none',
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
    '## Methodology references',
    ...pack.methodology_references.map((reference) => `- ${reference.label}: ${reference.url} — ${reference.use}`),
    '',
    '## Boundaries',
    '- This pack compares forecast discipline across public or sample datasets only.',
    '- It must not be used as buyer-specific forecast accuracy evidence.',
    '- Scale-free and interval diagnostics are adversarial review aids; they do not replace retained buyer backtests or reviewer acceptance.',
    '- The 95% buyer-confidence gate still requires accepted buyer-supplied evidence and reviewer notes.',
  ].join('\n');
}
