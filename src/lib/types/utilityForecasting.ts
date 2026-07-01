// ============================================================================
// Utility Forecasting — Shared Type Definitions
//
// All shared types for the utility forecasting subsystem.
// Consumers can import from here directly or via re-exports from
// utilityForecasting.ts for backward compatibility.
// ============================================================================

import type { ForecastMetrics } from '../demandForecaster';
import type {
  LiveSurfaceContract,
  LiveSurfaceSourceKind,
} from '../liveSurfaceContract';
import type { ProvenanceMetadata } from './provenance';
import type {
  AUC_DSP_DataSchedule_Row,
  OEB_DSP_LoadForecast_Row,
  OEB_DSP_Reliability_Row,
  OEB_DSP_ScenarioMatrix_Row,
} from '../regulatoryTemplates';

export type UtilityJurisdiction = 'Ontario' | 'Alberta';
export type UtilityInputGranularity = 'hourly' | 'monthly';
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
  | 'upsampled_15min';

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

export interface PublicSourceManifest {
  id: string;
  sourceUrl: string;
  sourceFile: string;
  fetchedAt: string;
  hash: string;
  transformVersion: string;
  sourceKind: UtilityInputSourceKind;
  disclaimer: string;
}

export interface ForecastEvidenceSplit {
  split_id: string;
  train_start: string;
  train_end: string;
  test_start: string;
  test_end: string;
  train_count: number;
  test_count: number;
  mae: number;
  mape: number;
  rmse: number;
  persistence_mae: number;
  seasonal_naive_mae: number;
  interval_coverage_pct: number;
  mean_interval_score_mw: number;
}

export interface ForecastEvidenceReport {
  model_version: string;
  validation_method: 'rolling_origin_cv';
  rolling_origin_splits: ForecastEvidenceSplit[];
  conformal_interval_coverage_pct: number;
  conformal_interval_width_mw: number;
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
  generated_date: string;
  sample_scope: string;
  source_derivation_note: string;
  disclaimer: string;
}
