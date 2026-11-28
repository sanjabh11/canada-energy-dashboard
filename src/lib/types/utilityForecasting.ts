// ============================================================================
// Utility Forecasting — Shared Type Definitions
//
// All shared types for the utility forecasting subsystem.
// Consumers can import from here directly or via re-exports from
// utilityForecasting.ts for backward compatibility.
// ============================================================================

import type { ForecastMetrics } from '../demandForecaster';
import type { FreshnessStatus } from '../foundation';
import type { LiveSurfaceContract, LiveSurfaceSourceKind } from '../liveSurfaceContract';
import type { ProvenanceMetadata } from './provenance';
import type {
  AUC_DSP_DataSchedule_Row,
  OEB_DSP_LoadForecast_Row,
  OEB_DSP_Reliability_Row,
  OEB_DSP_ScenarioMatrix_Row,
} from '../regulatoryTemplates';

export type UtilityJurisdiction = 'Ontario' | 'Alberta';
export type UtilityInputGranularity = 'hourly' | 'monthly';
export type UtilityTimeAxisStatus =
  'regular_hourly' | 'regular_monthly' | 'unsupported' | 'insufficient_history';
export type UtilityWeatherCase = 'median' | 'extreme';
export type UtilityGeographyLevel = 'system' | 'substation' | 'feeder';
export type UtilityInputSourceKind = LiveSurfaceSourceKind;
export type UtilityStressTestMode = 'none' | 'polar_vortex' | 'heat_wave' | 'ice_storm';

export type UtilityQualityFlag =
  | 'duplicate_interval'
  | 'negative_load'
  | 'flatline_segment'
  | 'impossible_spike'
  | 'load_transfer_jump'
  | 'customer_count_missing'
  | 'missing_temperature'
  | 'net_exceeds_gross'
  | 'gross_reconstituted'
  | 'vee_estimated'
  | 'vee_edited'
  | 'meter_gap_filled'
  | 'telemetry_outage'
  | 'upsampled_15min'
  | 'timezone_ambiguous';

export interface UtilityHistoricalLoadRow {
  timestamp: string;
  geography_level: UtilityGeographyLevel;
  geography_id: string;
  customer_class: string;
  demand_mw: number;
  weather_zone?: string;
  temperature_c?: number | null;
  net_load_mw?: number | null;
  gross_load_mw?: number | null;
  customer_count?: number | null;
  source_system?: string;
  feeder_id?: string;
  substation_id?: string;
  quality_flags?: UtilityQualityFlag[];
  gross_reconstituted_mw?: number | null;
}

export interface UtilityLargePointLoad {
  name: string;
  geography_id: string;
  geography_level: UtilityGeographyLevel;
  mw: number;
  load_factor_pct: number;
}

export interface UtilityIndustrialOptOut {
  name: string;
  geography_id: string;
  geography_level: UtilityGeographyLevel;
  mw: number;
}

export interface UtilityTouShiftRule {
  name: string;
  from_hour_start: number;
  from_hour_end: number;
  to_hour_start: number;
  to_hour_end: number;
  shift_pct: number;
}

export interface UtilityPlanningScenario {
  jurisdiction: UtilityJurisdiction;
  planning_horizon_years?: number[];
  weather_case: UtilityWeatherCase;
  annual_load_growth_pct: number;
  committed_load_mw: number;
  ev_growth_mw: number;
  heat_pump_growth_mw: number;
  der_offset_mw: number;
  demand_response_reduction_mw: number;
  demand_response_shift_pct: number;
  capacity_buffer_pct: number;
  large_point_loads?: UtilityLargePointLoad[];
  industrial_opt_outs?: UtilityIndustrialOptOut[];
  tou_shift_rules?: UtilityTouShiftRule[];
  stress_test_mode?: UtilityStressTestMode;
  hosting_capacity_limit_mw?: number;
}

export interface UtilityDataSummary {
  row_count: number;
  interval_count: number;
  granularity: UtilityInputGranularity;
  date_range: { start: string; end: string };
  geography_count: number;
  geographies: string[];
  customer_classes: string[];
  latest_customer_count: number;
  baseline_peak_mw: number;
  baseline_energy_gwh: number;
  weather_zones: string[];
}

export interface UtilityForecastYear {
  year: number;
  peak_demand_mw: number;
  annual_energy_gwh: number;
  customer_count: number;
  growth_rate_pct: number;
  scenario_delta_mw: number;
  utilization_pct: number;
  weather_factor: number;
}

export interface UtilityForecastCase {
  label: 'low' | 'expected' | 'high';
  annual_growth_pct: number;
  yearly: UtilityForecastYear[];
}

export interface UtilityScenarioMatrix {
  low: UtilityForecastCase;
  base: UtilityForecastCase;
  high: UtilityForecastCase;
}

export interface UtilityGeographyAllocation {
  horizon_year: number;
  geography_id: string;
  geography_level: UtilityGeographyLevel;
  customer_class: string;
  share_pct: number;
  peak_demand_mw: number;
  constrained: boolean;
}

export interface Utility8760ProfilePoint {
  timestamp: string;
  forecast_mw: number;
  point_load_mw: number;
  industrial_opt_out_mw: number;
  der_offset_mw: number;
  demand_response_mw: number;
  tou_shift_delta_mw: number;
}

export interface Utility8760Profile {
  case_label: UtilityForecastCase['label'];
  horizon_year: number;
  points: Utility8760ProfilePoint[];
}

export interface UtilityReliabilityHorizon {
  horizon_year: number;
  score: number;
  band: 'stable' | 'watch' | 'strained' | 'critical';
  peak_utilization_pct: number;
  reserve_headroom_mw: number;
  weather_stress_pct: number;
}

export interface UtilityReliabilityProxy {
  current_score: number;
  horizon_scores: UtilityReliabilityHorizon[];
  baseline_saidi_minutes: number;
  baseline_saifi: number;
}

export interface UtilityHostingCapacityWarning {
  horizon_year: number;
  geography_id: string;
  geography_level: UtilityGeographyLevel;
  projected_der_mw: number;
  limit_mw: number;
  severity: 'warning' | 'critical';
  message: string;
}

export interface UtilityInputProvenanceSummary {
  source_kind: UtilityInputSourceKind;
  assumption_pack_version: string;
  live_surfaces: LiveSurfaceContract[];
  quality_counts: Array<{ flag: UtilityQualityFlag; count: number }>;
  gross_reconstitution_applied: boolean;
  source_systems: string[];
  total_quality_flags: number;
}

export interface UtilitySourceTrustContext {
  owner_bound: boolean;
  freshness_status: FreshnessStatus;
  fetched_at: string | null;
  observed_at: string | null;
  connector_account_id?: string;
}

export interface UtilityRegulatoryExports {
  ontario: {
    load_forecast_rows: OEB_DSP_LoadForecast_Row[];
    reliability_rows: OEB_DSP_Reliability_Row[];
    scenario_matrix_rows: OEB_DSP_ScenarioMatrix_Row[];
  };
  alberta: {
    data_schedule_rows: AUC_DSP_DataSchedule_Row[];
  };
}

/**
 * Deterministic evidence about what an uploaded CSV actually is. Emitted by the
 * parser so upload transports cannot silently lose (or invent) provenance:
 * - `bundled_fixture_hash_match`: the parsed rows exactly reproduce the bundled
 *   synthetic CEIP fixture (stable fingerprint over canonical row content).
 * - `ieso_format_detected`: headers/shape match the IESO public-demand export
 *   format. Format detection only — the upload origin remains UNVERIFIED.
 * - `unverified_upload`: everything else.
 */
export type UtilityCsvFormatEvidence =
  'bundled_fixture_hash_match' | 'ieso_format_detected' | 'unverified_upload';

export interface PublicSourceManifest {
  id: string;
  sourceUrl: string;
  sourceFile: string;
  fetchedAt: string | null;
  isSyntheticFixture: boolean;
  sourceAttribution: string | null;
  sourceTermsUrl: string | null;
  hash: string;
  transformVersion: string;
  sourceKind: UtilityInputSourceKind;
  disclaimer: string;
  /**
   * Parser-produced evidence for uploaded CSVs. `null` when the package was
   * not built from an upload recognized by the parser — it never upgrades
   * provenance by itself.
   */
  formatEvidence: UtilityCsvFormatEvidence | null;
}

/**
 * Completeness scope for the canonical geography level selected for forecast
 * aggregation:
 * - `complete_system`: a system-level series covers every observed timestamp,
 *   so the measured total cannot silently omit a child geography.
 * - `observed_entities`: a feeder/substation level covers every observed
 *   entity x timestamp slot, but the input carries no authoritative entity
 *   inventory — a wholly absent feeder/substation would not be detected.
 * - `unknown`: even the observed entity x timestamp grid has missing slots.
 */
export type UtilityHierarchyCompletenessScope = 'complete_system' | 'observed_entities' | 'unknown';

export interface ForecastEvidenceSplit {
  split_id: string;
  train_start: string;
  train_end: string;
  calibration_start: string | null;
  calibration_end: string | null;
  test_start: string;
  test_end: string;
  train_count: number;
  calibration_count: number;
  test_count: number;
  /** Length of the scored test window in intervals (== test_count). */
  test_window_steps: number;
  /**
   * One-based forecast lead of the first test step, measured from the fit
   * origin (end of the fit window). Because the predictor is fit before the
   * calibration tail, a 24-step test window behind a 168-step calibration
   * tail is forecast at leads 169-192, not 1-24.
   */
  forecast_lead_start: number;
  /** One-based forecast lead of the last test step from the fit origin. */
  forecast_lead_end: number;
  mae: number;
  mape: number;
  rmse: number;
  persistence_mae: number;
  /**
   * Null when the seasonal-naive baseline could not be scored on this fold
   * (e.g. fit window shorter than the seasonal period). Never interpret a
   * missing baseline as zero error.
   */
  seasonal_naive_mae: number | null;
  /**
   * `measured` when the seasonal-naive challenger was scored on the fold's
   * test window; `insufficient_history` when it was unavailable and is
   * excluded from skill/challenger comparisons.
   */
  baseline_status: 'measured' | 'insufficient_history';
  interval_status: 'measured' | 'insufficient_history';
  interval_covered_count: number | null;
  interval_coverage_pct: number | null;
  interval_width_mw: number | null;
  mean_interval_score_mw: number | null;
}

export interface ForecastEvidenceReport {
  model_version: string;
  validation_method: 'rolling_origin_cv';
  rolling_origin_splits: ForecastEvidenceSplit[];
  time_axis_status: UtilityTimeAxisStatus;
  time_axis_note: string;
  /**
   * `measured` when the primary holdout benchmark scored the seasonal-naive
   * baseline; `insufficient_history` when the seasonal baseline was
   * unavailable (its benchmark metrics are non-finite) and it was excluded
   * from skill scores and champion/challenger comparisons.
   */
  baseline_status: 'measured' | 'insufficient_history' | 'unsupported_time_axis';
  /**
   * Completeness scope of the canonical geography level that fed forecast
   * aggregation. UI consumers must not render a "complete" hierarchy claim
   * unless this is `complete_system`.
   */
  hierarchy_completeness_scope: UtilityHierarchyCompletenessScope;
  interval_status: 'measured' | 'insufficient_history' | 'unsupported_time_axis';
  interval_method: 'chronological_tail_calibration';
  interval_method_note: string;
  interval_target_coverage_pct: number;
  interval_measured_split_count: number;
  interval_calibration_sample_count: number;
  interval_calibration_sample_uses: number;
  interval_test_sample_count: number;
  empirical_interval_coverage_pct: number | null;
  mean_interval_width_mw: number | null;
  mean_interval_score_mw: number | null;
  benchmark_failure_notes: string[];
  champion_challenger: {
    champion: 'transparent_trend_seasonal';
    challenger: 'persistence' | 'seasonal_naive';
    decision_reason: string;
  };
  hierarchy_reconciliation: {
    status: 'reconciled' | 'single_geography' | 'needs_review';
    max_reconciliation_error_mw: number;
    geography_count: number;
  };
  warnings: string[];
}

export interface UtilityForecastPackage {
  jurisdiction: UtilityJurisdiction;
  generated_at: string;
  provenance: ProvenanceMetadata;
  source_label: string;
  source_manifest: PublicSourceManifest;
  summary: UtilityDataSummary;
  scenario: UtilityPlanningScenario;
  benchmark: ForecastMetrics;
  evidence_report: ForecastEvidenceReport;
  cases: {
    low: UtilityForecastCase;
    expected: UtilityForecastCase;
    high: UtilityForecastCase;
  };
  scenario_matrix: UtilityScenarioMatrix;
  highlighted_years: number[];
  geography_allocations: UtilityGeographyAllocation[];
  reliability_proxy: UtilityReliabilityProxy;
  profiles_8760: Utility8760Profile[];
  deferred_peak_load_mw: number;
  hosting_capacity_warnings: UtilityHostingCapacityWarning[];
  input_provenance_summary: UtilityInputProvenanceSummary;
  regulatory_exports: UtilityRegulatoryExports;
  assumptions: string[];
  warnings: string[];
  oeb_rows: OEB_DSP_LoadForecast_Row[];
}

export interface PublicUtilitySampleManifest {
  id: string;
  jurisdiction: UtilityJurisdiction;
  label: string;
  source_url: string;
  source_document: string;
  source_file: string;
  synthetic_source_id: string;
  synthetic_fixture_version: string;
  generated_date: string;
  sample_scope: string;
  source_derivation_note: string;
  disclaimer: string;
  synthetic_fixture_attribution_note: string;
  attribution: string;
  terms_url: string;
}
