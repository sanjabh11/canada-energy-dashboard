import {
  resolveCommercialCommitmentEvidence,
  type CommercialCommitmentStatus,
} from './commercialCommitmentEvidence';
import {
  buildUtilityForecastPackage,
  buildUtilityForecastEvaluationSeries,
  generateOntarioPublicUtilitySampleRows,
  ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST,
  type ForecastEvidenceReport,
  type UtilityHistoricalLoadRow,
  type UtilityInputSourceKind,
  type UtilityJurisdiction,
  type UtilityPlanningScenario,
} from './utilityForecasting';
import {
  DEFAULT_EVALUATION_CONTRACT,
  evaluateAgainstContract,
  type EvaluationHorizon,
  type EvaluationResult,
} from './forecastEvaluationContract';

// v6 schema change: `interval_validation_horizon` (which reported the fold
// test-window length as if it were a forecast horizon) was replaced by
// per-fold `interval_validation_folds` entries carrying `test_window_steps`
// plus the one-based `forecast_lead_start`/`forecast_lead_end` range measured
// from each fold's fit origin. `metrics.seasonal_naive_mae` and
// `aggregate.mean_seasonal_naive_mae` are now nullable when the seasonal
// baseline is unavailable (insufficient history) instead of reporting 0.
export const UTILITY_MULTI_DATASET_BENCHMARK_VERSION = 'utility-multi-dataset-benchmark-v6';
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
  interval_calibration_gap_pct: number | null;
  interval_width_to_mae_ratio: number | null;
  mean_interval_score_mw: number | null;
  interval_score_to_mae_ratio: number | null;
  adjudication: 'beats_best_naive' | 'baseline_win_review' | 'insufficient_holdout';
  notes: string[];
}

export interface UtilityBenchmarkIntervalValidationFold {
  split_id: string;
  /** Length of the fold's scored test window in intervals. */
  test_window_steps: number;
  /**
   * One-based forecast lead of the first test step from the fold's fit origin
   * (end of fit + calibration tail), e.g. 169 for a 24-step test window behind
   * a 168-step calibration tail.
   */
  forecast_lead_start: number;
  /** One-based forecast lead of the last test step from the fit origin. */
  forecast_lead_end: number;
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
  holdout_horizon: EvaluationHorizon;
  /**
   * Per-fold interval-validation geometry. Replaces the former
   * `interval_validation_horizon`, which mislabeled the test-window length as
   * a forecast horizon; these folds report the true one-based lead range.
   */
  interval_validation_folds: UtilityBenchmarkIntervalValidationFold[];
  metrics: {
    mae: number;
    mape: number;
    rmse: number;
    persistence_mae: number;
    /** Null when the seasonal baseline was unavailable (insufficient history). */
    seasonal_naive_mae: number | null;
    skill_score_vs_persistence: number;
    skill_score_vs_seasonal: number;
    sample_size: number;
  };
  rolling_origin_split_count: number;
  interval_status: ForecastEvidenceReport['interval_status'];
  interval_target_coverage_pct: number;
  interval_measured_split_count: number;
  interval_calibration_sample_count: number;
  interval_calibration_sample_uses: number;
  interval_test_sample_count: number;
  empirical_interval_coverage_pct: number | null;
  mean_interval_width_mw: number | null;
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
  evaluation_results: EvaluationResult[];
  aggregate: {
    mean_model_mae: number;
    mean_persistence_mae: number;
    /** Null when no dataset produced a scored seasonal-naive baseline. */
    mean_seasonal_naive_mae: number | null;
    mean_seasonal_mase: number;
    mean_best_naive_scaled_mae: number;
    datasets_beating_best_naive: number;
    baseline_win_count: number;
    datasets_with_three_splits: number;
    minimum_interval_coverage_pct: number | null;
    maximum_interval_calibration_gap_pct: number | null;
    mean_interval_score_mw: number | null;
    mean_interval_score_to_mae_ratio: number | null;
    maximum_interval_score_to_mae_ratio: number | null;
  };
}

export interface UtilityForecastTrustRetainedEvidenceExtractParams {
  recordDate: string;
  route?: '/utility-demand-forecast' | '/forecast-benchmarking';
  proofPackId?: string;
  artifactTitle?: string;
  piiScreenResult?:
    'no personal data' | 'no personal data or meter identifiers found' | 'redacted' | 'screened';
  buyerDataCoveragePct: number;
  timeToArtifactHours: number;
  reviewerRole: string;
  reviewerAcceptance: 'accepted' | 'approved' | 'signed';
  reviewerFeedbackStatus: 'complete' | 'accepted' | 'approved' | 'signed';
  day14Decision: 'proceed' | 'park' | 'pivot' | 'reject' | 'pending';
  commercialCommitmentStatus: CommercialCommitmentStatus;
  commercialCommitmentEvidence?: string;
  datasetId?: string;
  claimBoundary?: string;
  doNotClaim?: string;
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatOptionalMetric(value: number | null | undefined, digits = 2): string {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : 'not available';
}

/**
 * Read empirical coverage from a dataset result, tolerating pack JSON written
 * before the field was renamed from `conformal_interval_coverage_pct`.
 */
function readEmpiricalIntervalCoveragePct(dataset: UtilityBenchmarkDatasetResult): number | null {
  const legacy = (dataset as { conformal_interval_coverage_pct?: number })
    .conformal_interval_coverage_pct;
  const value = dataset.empirical_interval_coverage_pct ?? legacy ?? null;
  return Number.isFinite(value) ? Number(value) : null;
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
    use: 'Adds a central 90% interval score from rolling-origin splits so interval evidence penalizes both width and misses; this remains technical evidence, not buyer-specific accuracy proof.',
  },
  {
    label: 'Nixtla conformal prediction for time series',
    url: 'https://nixtlaverse.nixtla.io/statsforecast/docs/tutorials/conformalprediction.html',
    use: 'Reference context for time-series calibration; this pack reports empirical chronological coverage and makes no formal conformal coverage guarantee.',
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
      temperature_c: Number.isFinite(record.temperature ?? Number.NaN)
        ? (record.temperature ?? null)
        : null,
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

function inferSeasonalPeriod(series: Array<{ timestamp: string; demand_mw: number }>): number {
  if (series.length < 3) return 1;
  const deltasHours: number[] = [];
  for (let index = 1; index < series.length; index += 1) {
    const deltaHours =
      (new Date(series[index].timestamp).getTime() -
        new Date(series[index - 1].timestamp).getTime()) /
      3600_000;
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
  rollingOriginSplits: ForecastEvidenceReport['rolling_origin_splits'],
  empiricalIntervalCoveragePct: number | null,
  meanIntervalWidthMw: number | null,
  meanIntervalScoreMw: number | null,
): UtilityBenchmarkScientificDiagnostics {
  const rollingOriginSplitCount = rollingOriginSplits.length;
  const series = buildUtilityForecastEvaluationSeries(input.rows);
  const holdoutSize = Math.min(series.length, Math.max(0, metrics.sample_size));
  const inSampleSeries =
    holdoutSize > 0 && series.length > holdoutSize
      ? series.slice(0, series.length - holdoutSize)
      : series;
  const seasonalPeriod = inferSeasonalPeriod(series);
  const seasonalScale =
    meanAbsoluteSeasonalDifference(inSampleSeries, seasonalPeriod) ||
    meanAbsoluteSeasonalDifference(inSampleSeries, 1);
  const baselineMaes = [metrics.persistence_mae, metrics.seasonal_naive_mae].filter(
    (value): value is number => Number.isFinite(value) && value > 0,
  );
  const bestNaiveMae = baselineMaes.length > 0 ? Math.min(...baselineMaes) : 0;
  const bestNaiveScaledMae = bestNaiveMae > 0 ? metrics.mae / bestNaiveMae : 0;
  const seasonalMase = seasonalScale > 0 ? metrics.mae / seasonalScale : 0;
  const intervalCalibrationGap =
    empiricalIntervalCoveragePct === null
      ? null
      : Math.abs(empiricalIntervalCoveragePct - NOMINAL_INTERVAL_COVERAGE_PCT);
  const intervalWidthToMaeRatio =
    meanIntervalWidthMw === null || metrics.mae <= 0 ? null : meanIntervalWidthMw / metrics.mae;
  const intervalScoreToMaeRatio =
    meanIntervalScoreMw === null || metrics.mae <= 0 ? null : meanIntervalScoreMw / metrics.mae;
  const adjudication =
    metrics.sample_size <= 0 || bestNaiveMae <= 0
      ? 'insufficient_holdout'
      : bestNaiveScaledMae <= 1
        ? 'beats_best_naive'
        : 'baseline_win_review';

  return {
    seasonal_mase: round(seasonalMase, 3),
    best_naive_scaled_mae: round(bestNaiveScaledMae, 3),
    scale_free_skill_score_pct: bestNaiveMae > 0 ? round((1 - bestNaiveScaledMae) * 100, 2) : 0,
    interval_nominal_coverage_pct: NOMINAL_INTERVAL_COVERAGE_PCT,
    interval_calibration_gap_pct:
      intervalCalibrationGap === null ? null : round(intervalCalibrationGap, 2),
    interval_width_to_mae_ratio:
      intervalWidthToMaeRatio === null ? null : round(intervalWidthToMaeRatio, 3),
    mean_interval_score_mw: meanIntervalScoreMw === null ? null : round(meanIntervalScoreMw, 2),
    interval_score_to_mae_ratio:
      intervalScoreToMaeRatio === null ? null : round(intervalScoreToMaeRatio, 3),
    adjudication,
    notes: [
      `Seasonal MASE uses the ${seasonalPeriod}-interval seasonal naive scale from the same hierarchy-selected, normalized series used for holdout evaluation; when that scale is zero, a one-interval naive scale is used.`,
      'Best-naive scaled MAE below 1.0 means the transparent model beats the strongest naive challenger on the holdout diagnostic.',
      'Empirical interval coverage compares untouched chronological test observations with the nominal target; temporal dependence means it is descriptive, not a general coverage guarantee.',
      ...(meanIntervalScoreMw === null
        ? [
            'Interval diagnostics are unavailable because history did not support fit, calibration, and test windows.',
          ]
        : [
            'Mean interval score is weighted by the number of untouched test observations; lower is better.',
          ]),
      ...(rollingOriginSplitCount < 3
        ? [
            'Fewer than three rolling-origin splits: treat interval diagnostics as pilot-readiness evidence only.',
          ]
        : []),
      ...(adjudication === 'baseline_win_review'
        ? [
            'Best naive baseline wins: attach failure note before any buyer-facing forecast accuracy discussion.',
          ]
        : []),
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
      seasonal_naive_mae: Number.isFinite(forecastPackage.benchmark.seasonal_naive_mae)
        ? forecastPackage.benchmark.seasonal_naive_mae
        : null,
      skill_score_vs_persistence: forecastPackage.benchmark.skill_score_vs_persistence,
      skill_score_vs_seasonal: forecastPackage.benchmark.skill_score_vs_seasonal,
      sample_size: forecastPackage.benchmark.sample_size,
    };
    const rollingOriginSplits = forecastPackage.evidence_report.rolling_origin_splits;
    const rollingOriginSplitCount = rollingOriginSplits.length;
    const empiricalIntervalCoveragePct =
      forecastPackage.evidence_report.empirical_interval_coverage_pct;
    const meanIntervalWidthMw = forecastPackage.evidence_report.mean_interval_width_mw;
    const meanIntervalScoreMw = forecastPackage.evidence_report.mean_interval_score_mw;

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
      holdout_horizon: formatHoldoutHorizon(
        forecastPackage.summary.granularity,
        forecastPackage.benchmark.sample_size,
      ),
      interval_validation_folds: rollingOriginSplits.map((split) => ({
        split_id: split.split_id,
        test_window_steps: split.test_window_steps,
        forecast_lead_start: split.forecast_lead_start,
        forecast_lead_end: split.forecast_lead_end,
      })),
      metrics,
      rolling_origin_split_count: rollingOriginSplitCount,
      interval_status: forecastPackage.evidence_report.interval_status,
      interval_target_coverage_pct: forecastPackage.evidence_report.interval_target_coverage_pct,
      interval_measured_split_count: forecastPackage.evidence_report.interval_measured_split_count,
      interval_calibration_sample_count:
        forecastPackage.evidence_report.interval_calibration_sample_count,
      interval_calibration_sample_uses:
        forecastPackage.evidence_report.interval_calibration_sample_uses,
      interval_test_sample_count: forecastPackage.evidence_report.interval_test_sample_count,
      empirical_interval_coverage_pct: empiricalIntervalCoveragePct,
      mean_interval_width_mw: meanIntervalWidthMw,
      scientific_diagnostics: buildScientificDiagnostics(
        input,
        metrics,
        rollingOriginSplits,
        empiricalIntervalCoveragePct,
        meanIntervalWidthMw,
        meanIntervalScoreMw,
      ),
      champion_challenger: forecastPackage.evidence_report.champion_challenger,
      benchmark_failure_notes: forecastPackage.evidence_report.benchmark_failure_notes,
      warnings: forecastPackage.warnings,
      buyer_specific_accuracy_claim: false as const,
    };
  });

  const datasetCount = datasets.length || 1;
  const measuredIntervalCoverage = datasets
    .map((dataset) => dataset.empirical_interval_coverage_pct)
    .filter((value): value is number => value !== null);
  const measuredIntervalGaps = datasets
    .map((dataset) => dataset.scientific_diagnostics.interval_calibration_gap_pct)
    .filter((value): value is number => value !== null);
  const measuredIntervalScores = datasets
    .map((dataset) => dataset.scientific_diagnostics.mean_interval_score_mw)
    .filter((value): value is number => value !== null);
  const measuredIntervalScoreRatios = datasets
    .map((dataset) => dataset.scientific_diagnostics.interval_score_to_mae_ratio)
    .filter((value): value is number => value !== null);
  return {
    version: UTILITY_MULTI_DATASET_BENCHMARK_VERSION,
    generated_at: generatedAt,
    dataset_count: datasets.length,
    buyer_specific_accuracy_claim: false,
    confidence_boundary:
      'Public/sample benchmark evidence supports model discipline only; buyer-specific accuracy remains blocked until accepted buyer data and reviewer evidence are attached.',
    methodology_references: methodologyReferences,
    datasets,
    aggregate: {
      mean_model_mae: round(
        datasets.reduce((sum, dataset) => sum + dataset.metrics.mae, 0) / datasetCount,
      ),
      mean_persistence_mae: round(
        datasets.reduce((sum, dataset) => sum + dataset.metrics.persistence_mae, 0) / datasetCount,
      ),
      // Average over scored seasonal-naive baselines only; unavailable
      // baselines are null and must not drag the mean toward zero.
      mean_seasonal_naive_mae: (() => {
        const scored = datasets
          .map((dataset) => dataset.metrics.seasonal_naive_mae)
          .filter((value): value is number => Number.isFinite(value));
        return scored.length > 0
          ? round(scored.reduce((sum, value) => sum + value, 0) / scored.length)
          : null;
      })(),
      mean_seasonal_mase: round(
        datasets.reduce((sum, dataset) => sum + dataset.scientific_diagnostics.seasonal_mase, 0) /
          datasetCount,
        3,
      ),
      mean_best_naive_scaled_mae: round(
        datasets.reduce(
          (sum, dataset) => sum + dataset.scientific_diagnostics.best_naive_scaled_mae,
          0,
        ) / datasetCount,
        3,
      ),
      datasets_beating_best_naive: datasets.filter(
        (dataset) => dataset.scientific_diagnostics.adjudication === 'beats_best_naive',
      ).length,
      baseline_win_count: datasets.filter((dataset) => dataset.benchmark_failure_notes.length > 0)
        .length,
      datasets_with_three_splits: datasets.filter(
        (dataset) => dataset.rolling_origin_split_count >= 3,
      ).length,
      minimum_interval_coverage_pct:
        measuredIntervalCoverage.length > 0 ? Math.min(...measuredIntervalCoverage) : null,
      maximum_interval_calibration_gap_pct:
        measuredIntervalGaps.length > 0 ? Math.max(...measuredIntervalGaps) : null,
      mean_interval_score_mw:
        measuredIntervalScores.length > 0
          ? round(
              measuredIntervalScores.reduce((sum, value) => sum + value, 0) /
                measuredIntervalScores.length,
            )
          : null,
      mean_interval_score_to_mae_ratio:
        measuredIntervalScoreRatios.length > 0
          ? round(
              measuredIntervalScoreRatios.reduce((sum, value) => sum + value, 0) /
                measuredIntervalScoreRatios.length,
              3,
            )
          : null,
      maximum_interval_score_to_mae_ratio:
        measuredIntervalScoreRatios.length > 0
          ? round(Math.max(...measuredIntervalScoreRatios), 3)
          : null,
    },
    evaluation_results: buildPackEvaluationResults(datasets),
  };
}

function buildPackEvaluationResults(datasets: UtilityBenchmarkDatasetResult[]): EvaluationResult[] {
  if (datasets.length === 0) return [];
  const horizonMetrics = datasets.map((dataset) => ({
    horizon: dataset.holdout_horizon,
    metrics: {
      mae: dataset.metrics.mae,
      mape: dataset.metrics.mape,
      rmse: dataset.metrics.rmse,
      skill_score: dataset.metrics.skill_score_vs_persistence / 100,
    },
  }));
  const results = evaluateAgainstContract(
    DEFAULT_EVALUATION_CONTRACT,
    horizonMetrics,
    'transparent_trend_seasonal',
    'seasonal_decomposition',
  );
  return results.map((result) => {
    const hasConfiguredThresholds = DEFAULT_EVALUATION_CONTRACT.acceptanceThresholds.some(
      (threshold) => threshold.horizon === result.horizon,
    );
    return {
      ...result,
      passedThresholds: hasConfiguredThresholds && result.passedThresholds,
      failedThresholds: hasConfiguredThresholds
        ? result.failedThresholds
        : [
            `No acceptance thresholds are configured for ${result.horizon}; metrics are descriptive only.`,
          ],
      // This record reports the primary fixed-origin holdout. Rolling splits
      // are reported separately as interval-validation evidence.
      rollingOriginFolds: 0,
    };
  });
}

function formatHoldoutHorizon(
  granularity: 'hourly' | 'monthly',
  intervalCount: number,
): EvaluationHorizon {
  return `${intervalCount}${granularity === 'hourly' ? 'h' : 'm'}`;
}

function intervalFoldLeadRange(folds: UtilityBenchmarkIntervalValidationFold[] | undefined): {
  test_window_steps: number;
  forecast_lead_start: number;
  forecast_lead_end: number;
} | null {
  // Tolerates pack JSON produced before the v6 fold schema existed.
  if (!folds || folds.length === 0) return null;
  return {
    test_window_steps: folds[0].test_window_steps,
    forecast_lead_start: Math.min(...folds.map((fold) => fold.forecast_lead_start)),
    forecast_lead_end: Math.max(...folds.map((fold) => fold.forecast_lead_end)),
  };
}

function formatIntervalValidationFolds(
  folds: UtilityBenchmarkIntervalValidationFold[] | undefined,
): string {
  const range = intervalFoldLeadRange(folds);
  if (!range) return 'not available';
  return `${range.test_window_steps}-step test windows at forecast leads ${range.forecast_lead_start}-${range.forecast_lead_end}`;
}

function formatSeasonalNaiveMae(value: number | null | undefined): string {
  return Number.isFinite(value) ? `${Number(value)} MW` : 'not available (insufficient history)';
}

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null) return 'not_available';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function utilityMultiDatasetBenchmarkPackToCsv(
  pack: UtilityMultiDatasetBenchmarkPack,
): string {
  const header = [
    'dataset_id',
    'label',
    'jurisdiction',
    'source_scope',
    'source_kind',
    'sample_size',
    'holdout_horizon',
    'interval_test_window_steps',
    'interval_forecast_lead_start',
    'interval_forecast_lead_end',
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
    'interval_status',
    'interval_target_coverage_pct',
    'interval_measured_split_count',
    'interval_calibration_sample_count',
    'interval_calibration_sample_uses',
    'interval_test_sample_count',
    'empirical_interval_coverage_pct',
    'mean_interval_width_mw',
    'interval_calibration_gap_pct',
    'interval_width_to_mae_ratio',
    'mean_interval_score_mw',
    'interval_score_to_mae_ratio',
    'adjudication',
    'challenger_model',
    'benchmark_failure_notes',
    'buyer_specific_accuracy_claim',
  ];

  return [
    header.join(','),
    ...pack.datasets.map((dataset) =>
      [
        dataset.dataset_id,
        dataset.label,
        dataset.jurisdiction,
        dataset.source_scope,
        dataset.source_kind,
        dataset.sample_size,
        dataset.holdout_horizon,
        intervalFoldLeadRange(dataset.interval_validation_folds)?.test_window_steps ?? null,
        intervalFoldLeadRange(dataset.interval_validation_folds)?.forecast_lead_start ?? null,
        intervalFoldLeadRange(dataset.interval_validation_folds)?.forecast_lead_end ?? null,
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
        dataset.interval_status,
        dataset.interval_target_coverage_pct,
        dataset.interval_measured_split_count,
        dataset.interval_calibration_sample_count,
        dataset.interval_calibration_sample_uses,
        dataset.interval_test_sample_count,
        dataset.empirical_interval_coverage_pct,
        dataset.mean_interval_width_mw,
        dataset.scientific_diagnostics.interval_calibration_gap_pct,
        dataset.scientific_diagnostics.interval_width_to_mae_ratio,
        dataset.scientific_diagnostics.mean_interval_score_mw,
        dataset.scientific_diagnostics.interval_score_to_mae_ratio,
        dataset.scientific_diagnostics.adjudication,
        dataset.champion_challenger.challenger,
        dataset.benchmark_failure_notes.join(' | ') || 'none',
        dataset.buyer_specific_accuracy_claim,
      ]
        .map(csvCell)
        .join(','),
    ),
  ].join('\n');
}

export function utilityMultiDatasetBenchmarkPackToMarkdown(
  pack: UtilityMultiDatasetBenchmarkPack,
): string {
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
    `- Mean seasonal MASE: ${formatOptionalMetric(pack.aggregate.mean_seasonal_mase, 3)}`,
    `- Mean best-naive scaled MAE: ${formatOptionalMetric(pack.aggregate.mean_best_naive_scaled_mae, 3)}`,
    `- Max empirical interval gap: ${formatOptionalMetric(pack.aggregate.maximum_interval_calibration_gap_pct, 1)}%`,
    `- Mean empirical 90% interval score: ${formatOptionalMetric(pack.aggregate.mean_interval_score_mw)} MW`,
    `- Mean interval-score/MAE ratio: ${formatOptionalMetric(pack.aggregate.mean_interval_score_to_mae_ratio, 3)}`,
    `- Datasets with >=3 rolling-origin splits: ${pack.aggregate.datasets_with_three_splits}`,
    '',
    '| Dataset | Scope | MAE | Seasonal MASE | Best-naive scaled MAE | Interval gap | Width/MAE | Interval score | Score/MAE | Rolling splits | Challenger | Adjudication | Failure notes |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|',
    ...pack.datasets
      .map((dataset) =>
        [
          dataset.label,
          dataset.source_scope,
          formatOptionalMetric(dataset.metrics.mae, 2),
          formatOptionalMetric(dataset.scientific_diagnostics.seasonal_mase, 3),
          formatOptionalMetric(dataset.scientific_diagnostics.best_naive_scaled_mae, 3),
          `${formatOptionalMetric(dataset.scientific_diagnostics.interval_calibration_gap_pct, 1)}%`,
          formatOptionalMetric(dataset.scientific_diagnostics.interval_width_to_mae_ratio, 3),
          formatOptionalMetric(dataset.scientific_diagnostics.mean_interval_score_mw),
          formatOptionalMetric(dataset.scientific_diagnostics.interval_score_to_mae_ratio, 3),
          dataset.rolling_origin_split_count,
          dataset.champion_challenger.challenger,
          dataset.scientific_diagnostics.adjudication,
          dataset.benchmark_failure_notes.join(' ') || 'none',
        ].join(' | '),
      )
      .map((row) => `| ${row} |`),
    '',
    '## Horizon interpretation',
    ...pack.datasets.map(
      (dataset) =>
        `- ${dataset.label}: Primary holdout horizon: ${dataset.holdout_horizon}; interval validation: ${formatIntervalValidationFolds(dataset.interval_validation_folds)}.`,
    ),
    'Primary-holdout accuracy metrics and rolling-fold interval diagnostics are reported on their respective horizons.',
    '',
    '## Methodology references',
    ...pack.methodology_references.map(
      (reference) => `- ${reference.label}: ${reference.url} — ${reference.use}`,
    ),
    '',
    '## Boundaries',
    '- This pack compares forecast discipline across public or sample datasets only.',
    '- It must not be used as buyer-specific forecast accuracy evidence.',
    '- Scale-free and interval diagnostics are adversarial review aids; they do not replace retained buyer backtests or reviewer acceptance.',
    '- The 95% buyer-confidence gate still requires accepted buyer-supplied evidence and reviewer notes.',
  ].join('\n');
}

function selectTrustDataset(
  pack: UtilityMultiDatasetBenchmarkPack,
  datasetId?: string,
): UtilityBenchmarkDatasetResult {
  if (datasetId) {
    const selected = pack.datasets.find((dataset) => dataset.dataset_id === datasetId);
    if (!selected) throw new Error(`Dataset not found in benchmark pack: ${datasetId}`);
    return selected;
  }
  const selected =
    pack.datasets.find((dataset) => dataset.source_scope === 'buyer_supplied_anonymized') ??
    pack.datasets[0];
  if (!selected) throw new Error('Benchmark pack does not contain datasets.');
  return selected;
}

function buildForecastDiagnosticSentence(dataset: UtilityBenchmarkDatasetResult): string {
  return [
    `MAE ${dataset.metrics.mae} MW`,
    `MAPE ${dataset.metrics.mape}%`,
    `RMSE ${dataset.metrics.rmse} MW`,
    `persistence MAE ${dataset.metrics.persistence_mae} MW`,
    `seasonal-naive MAE ${formatSeasonalNaiveMae(dataset.metrics.seasonal_naive_mae)}`,
    `primary holdout horizon ${dataset.holdout_horizon ?? 'not available'}`,
    `interval validation ${formatIntervalValidationFolds(dataset.interval_validation_folds)}`,
    `rolling-origin split count ${dataset.rolling_origin_split_count}`,
    `empirical interval coverage ${readEmpiricalIntervalCoveragePct(dataset) === null ? 'not available' : `${readEmpiricalIntervalCoveragePct(dataset)}%`}`,
    `CEIP champion ${dataset.champion_challenger.champion} vs ${dataset.champion_challenger.challenger} challenger`,
  ].join('; ');
}

export function buildUtilityForecastTrustRetainedEvidenceExtract(
  pack: UtilityMultiDatasetBenchmarkPack,
  params: UtilityForecastTrustRetainedEvidenceExtractParams,
): string {
  const dataset = selectTrustDataset(pack, params.datasetId);
  const route = params.route ?? '/forecast-benchmarking';
  const proofPackId =
    params.proofPackId ??
    (route === '/utility-demand-forecast'
      ? 'utility_forecast_planning_pack'
      : 'forecast_benchmark_provenance');
  const piiScreenResult = params.piiScreenResult ?? 'redacted';
  const claimBoundary =
    params.claimBoundary ??
    'Buyer supplied redacted forecast benchmarking workflow only; no production onboarding, live telemetry, or buyer-specific accuracy claim without accepted reviewer evidence.';
  const doNotClaim =
    params.doNotClaim ??
    'Do not claim guaranteed accuracy, forecast superiority, production utility approval, live telemetry, or control-room readiness.';
  const diagnostic = buildForecastDiagnosticSentence(dataset);
  const sourceBoundary =
    dataset.source_scope === 'buyer_supplied_anonymized'
      ? 'buyer-supplied anonymized benchmark dataset'
      : `${dataset.source_scope} benchmark dataset; does not move buyer confidence by itself`;
  const commercialCommitmentEvidence = resolveCommercialCommitmentEvidence(
    params.commercialCommitmentStatus,
    params.commercialCommitmentEvidence,
  );

  return [
    `# ${params.artifactTitle ?? 'CEIP forecast trust retained evidence extract'}`,
    '',
    'This retained artifact is a text-inspectable trust report extract. Sensitive originals stay outside the repository.',
    'It converts benchmark metrics into the exact diagnostic evidence required by the pilot evidence validator.',
    '',
    `record_date: ${params.recordDate}`,
    `route: ${route}`,
    `proof_pack_id: ${proofPackId}`,
    `source_label: ${dataset.label}`,
    `source_scope: ${dataset.source_scope}`,
    `source_boundary: ${sourceBoundary}`,
    `pii_screen_result: ${piiScreenResult}`,
    `buyer_data_coverage_pct: ${params.buyerDataCoveragePct}`,
    `time_to_artifact_hours: ${params.timeToArtifactHours}`,
    `reviewer_role: ${params.reviewerRole}`,
    `reviewer_acceptance: ${params.reviewerAcceptance}`,
    `reviewer_feedback_status: ${params.reviewerFeedbackStatus}`,
    `day_14_decision: ${params.day14Decision}`,
    `commercial_commitment_status: ${params.commercialCommitmentStatus}`,
    `commercial_commitment_evidence: ${commercialCommitmentEvidence}`,
    `claim_boundary: ${claimBoundary}`,
    `do_not_claim: ${doNotClaim}`,
    '',
    '## Forecast Trust Diagnostic',
    diagnostic,
    '',
    '## Numeric Forecast Evidence',
    `- MAE ${dataset.metrics.mae} MW`,
    `- MAPE ${dataset.metrics.mape}%`,
    `- RMSE ${dataset.metrics.rmse} MW`,
    `- persistence MAE ${dataset.metrics.persistence_mae} MW`,
    `- seasonal-naive MAE ${formatSeasonalNaiveMae(dataset.metrics.seasonal_naive_mae)}`,
    `- rolling-origin split count ${dataset.rolling_origin_split_count}`,
    `- primary holdout horizon ${dataset.holdout_horizon ?? 'not available'}`,
    `- interval validation ${formatIntervalValidationFolds(dataset.interval_validation_folds)}`,
    `- empirical interval coverage ${readEmpiricalIntervalCoveragePct(dataset) === null ? 'not available' : `${readEmpiricalIntervalCoveragePct(dataset)}%`}`,
    `- champion model: ${dataset.champion_challenger.champion}`,
    `- challenger model: ${dataset.champion_challenger.challenger}`,
    `- champion/challenger decision: ${dataset.champion_challenger.decision_reason}`,
    '',
    '## Scientific Diagnostics',
    `- seasonal MASE: ${dataset.scientific_diagnostics.seasonal_mase}`,
    `- best-naive scaled MAE: ${dataset.scientific_diagnostics.best_naive_scaled_mae}`,
    `- scale-free skill score pct: ${dataset.scientific_diagnostics.scale_free_skill_score_pct}`,
    `- interval calibration gap pct: ${formatOptionalMetric(dataset.scientific_diagnostics.interval_calibration_gap_pct)}`,
    `- interval width to MAE ratio: ${formatOptionalMetric(dataset.scientific_diagnostics.interval_width_to_mae_ratio)}`,
    `- mean empirical 90pct interval score MW: ${formatOptionalMetric(dataset.scientific_diagnostics.mean_interval_score_mw)}`,
    `- interval score to MAE ratio: ${formatOptionalMetric(dataset.scientific_diagnostics.interval_score_to_mae_ratio)}`,
    `- adjudication: ${dataset.scientific_diagnostics.adjudication}`,
    '',
    '## Benchmark Failure Notes',
    ...(dataset.benchmark_failure_notes.length > 0
      ? dataset.benchmark_failure_notes.map((note) => `- ${note}`)
      : ['- none']),
    '',
    '## Trust Report Boundaries',
    `- buyer-specific accuracy claim: ${dataset.buyer_specific_accuracy_claim ? 'yes' : 'no'}`,
    `- pack confidence boundary: ${pack.confidence_boundary}`,
    '- Reviewer acceptance and buyer source approval remain required before this artifact can move buyer-proven market confidence.',
    '',
    '## Methodology References',
    ...pack.methodology_references.map((reference) => `- ${reference.label}: ${reference.url}`),
    '',
  ].join('\n');
}
