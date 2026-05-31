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

export const UTILITY_MULTI_DATASET_BENCHMARK_VERSION = 'utility-multi-dataset-benchmark-v1';

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
  >;
  rolling_origin_split_count: number;
  conformal_interval_coverage_pct: number;
  conformal_interval_width_mw: number;
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
  datasets: UtilityBenchmarkDatasetResult[];
  aggregate: {
    mean_model_mae: number;
    mean_persistence_mae: number;
    mean_seasonal_naive_mae: number;
    baseline_win_count: number;
    datasets_with_three_splits: number;
    minimum_interval_coverage_pct: number;
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
      metrics: {
        mae: forecastPackage.benchmark.mae,
        mape: forecastPackage.benchmark.mape,
        rmse: forecastPackage.benchmark.rmse,
        persistence_mae: forecastPackage.benchmark.persistence_mae,
        seasonal_naive_mae: forecastPackage.benchmark.seasonal_naive_mae,
        skill_score_vs_persistence: forecastPackage.benchmark.skill_score_vs_persistence,
        skill_score_vs_seasonal: forecastPackage.benchmark.skill_score_vs_seasonal,
      },
      rolling_origin_split_count: forecastPackage.evidence_report.rolling_origin_splits.length,
      conformal_interval_coverage_pct: forecastPackage.evidence_report.conformal_interval_coverage_pct,
      conformal_interval_width_mw: forecastPackage.evidence_report.conformal_interval_width_mw,
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
    datasets,
    aggregate: {
      mean_model_mae: round(datasets.reduce((sum, dataset) => sum + dataset.metrics.mae, 0) / datasetCount),
      mean_persistence_mae: round(datasets.reduce((sum, dataset) => sum + dataset.metrics.persistence_mae, 0) / datasetCount),
      mean_seasonal_naive_mae: round(datasets.reduce((sum, dataset) => sum + dataset.metrics.seasonal_naive_mae, 0) / datasetCount),
      baseline_win_count: datasets.filter((dataset) => dataset.benchmark_failure_notes.length > 0).length,
      datasets_with_three_splits: datasets.filter((dataset) => dataset.rolling_origin_split_count >= 3).length,
      minimum_interval_coverage_pct: datasets.length > 0
        ? Math.min(...datasets.map((dataset) => dataset.conformal_interval_coverage_pct))
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
    'rolling_origin_split_count',
    'interval_coverage_pct',
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
      dataset.rolling_origin_split_count,
      dataset.conformal_interval_coverage_pct,
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
    `- Datasets with >=3 rolling-origin splits: ${pack.aggregate.datasets_with_three_splits}`,
    '',
    '| Dataset | Scope | MAE | Persistence MAE | Seasonal-naive MAE | Rolling splits | Interval coverage | Challenger | Failure notes |',
    '|---|---|---:|---:|---:|---:|---:|---|---|',
    ...pack.datasets.map((dataset) => [
      dataset.label,
      dataset.source_scope,
      dataset.metrics.mae.toFixed(2),
      dataset.metrics.persistence_mae.toFixed(2),
      dataset.metrics.seasonal_naive_mae.toFixed(2),
      dataset.rolling_origin_split_count,
      `${dataset.conformal_interval_coverage_pct.toFixed(1)}%`,
      dataset.champion_challenger.challenger,
      dataset.benchmark_failure_notes.join(' ') || 'none',
    ].join(' | ')).map((row) => `| ${row} |`),
    '',
    '## Boundaries',
    '- This pack compares forecast discipline across public or sample datasets only.',
    '- It must not be used as buyer-specific forecast accuracy evidence.',
    '- The 95% buyer-confidence gate still requires accepted buyer-supplied evidence and reviewer notes.',
  ].join('\n');
}
