/**
 * Type Definitions for Renewable Energy Forecasting System
 * Aligns with database schema for type safety
 */

// ============================================================================
// FORECAST TYPES
// ============================================================================

export type RenewableSourceType = 'solar' | 'wind' | 'hydro' | 'mixed';
export type ForecastHorizon = 1 | 3 | 6 | 12 | 24 | 48;
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type ModelType = 'persistence' | 'arima' | 'xgboost' | 'lstm' | 'ensemble';

export interface RenewableForecast {
  id: string;
  province: string;
  source_type: RenewableSourceType;
  forecast_horizon_hours: ForecastHorizon;
  predicted_output_mw: number;
  confidence_interval_lower_mw?: number;
  confidence_interval_upper_mw?: number;
  confidence_level?: ConfidenceLevel;
  confidence_score?: number;
  weather_data?: WeatherFeatures;
  model_version: string;
  model_type?: ModelType;
  feature_importance?: Record<string, number>;
  generated_at: string;
  valid_at: string;
  has_actual: boolean;
  error_calculated: boolean;
  notes?: string;
  created_by?: string;
}

export interface ForecastActual {
  id: string;
  forecast_id: string;
  actual_output_mw: number;
  error_mw?: number;
  absolute_error_mw?: number;
  error_percent?: number;
  absolute_percentage_error?: number;
  squared_error?: number;
  data_source?: string;
  recorded_at: string;
  valid_for: string;
  notes?: string;
}

export interface ForecastPerformance {
  id: string;
  province: string;
  source_type: RenewableSourceType;
  horizon_hours: ForecastHorizon;
  model_version: string;
  period_start: string;
  period_end: string;
  mae_mw?: number;
  mae_percent?: number;
  mape_percent?: number; // KEY METRIC FOR AWARD
  rmse_mw?: number;
  bias_mw?: number;
  forecast_count: number;
  avg_predicted_mw?: number;
  avg_actual_mw?: number;
  improvement_vs_baseline?: number; // % improvement for award evidence
  calculated_at: string;
  notes?: string;
}

// ============================================================================
// WEATHER TYPES
// ============================================================================

export type WeatherSource = 'environment_canada' | 'openweathermap' | 'weatherapi';

export interface WeatherFeatures {
  temp_c?: number;
  cloud_cover_pct?: number;
  wind_speed_ms?: number;
  wind_direction_deg?: number;
  precipitation_mm?: number;
  humidity_pct?: number;
  solar_radiation_wm2?: number;
}

export interface WeatherObservation {
  id: string;
  province: string;
  station_id?: string;
  latitude?: number;
  longitude?: number;
  temperature_c?: number;
  humidity_percent?: number;
  wind_speed_ms?: number;
  wind_direction_deg?: number;
  cloud_cover_percent?: number;
  solar_radiation_wm2?: number;
  precipitation_mm?: number;
  condition_code?: string;
  source: WeatherSource;
  observed_at: string;
  received_at: string;
  raw_data?: any;
}

// ============================================================================
// CURTAILMENT TYPES
// ============================================================================

export type CurtailmentReason = 
  | 'transmission_congestion'
  | 'oversupply'
  | 'negative_pricing'
  | 'frequency_regulation'
  | 'voltage_constraint'
  | 'other';

export interface CurtailmentEvent {
  id: string;
  province: string;
  source_type: RenewableSourceType;
  curtailed_mw: number;
  available_capacity_mw?: number;
  curtailment_percent?: number;
  duration_hours?: number;
  total_energy_curtailed_mwh?: number;
  reason: CurtailmentReason;
  reason_detail?: string;
  market_price_cad_per_mwh?: number;
  opportunity_cost_cad?: number; // KEY METRIC FOR AWARD
  grid_demand_mw?: number;
  mitigation_actions?: MitigationAction[];
  mitigation_effective?: boolean;
  occurred_at: string;
  ended_at?: string;
  detected_at: string;
  data_source?: string;
  notes?: string;
}

export interface MitigationAction {
  action: string;
  mw_absorbed?: number;
  cost_cad?: number;
  timestamp?: string;
}

export type RecommendationType = 
  | 'demand_response'
  | 'storage_charge'
  | 'export_intertie'
  | 'industrial_load_shift';

export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationStatus = 'pending' | 'approved' | 'rejected' | 'implemented' | 'failed';

export interface CurtailmentReductionRecommendation {
  id: string;
  curtailment_event_id?: string;
  recommendation_type: RecommendationType;
  target_mw: number;
  expected_reduction_mw: number;
  confidence: number;
  priority: RecommendationPriority;
  reasoning?: string;
  model_version?: string;
  implementation_cost_cad?: number;
  expected_benefit_cad?: number;
  recommendation_status: RecommendationStatus;
  actual_reduction_mw?: number;
  generated_at: string;
  notes?: string;
  // Extended fields for dashboard
  implemented?: boolean;
  estimated_mwh_saved?: number;
  actual_mwh_saved?: number;
  estimated_cost_cad?: number;
  actual_cost_cad?: number;
  estimated_revenue_cad?: number;
  cost_benefit_ratio?: number;
  confidence_score?: number;
  llm_reasoning?: string;
  recommended_actions?: string[];
  implementation_timeline?: string;
  responsible_party?: string;
  effectiveness_rating?: number;
}

// ============================================================================
// STORAGE DISPATCH TYPES
// ============================================================================

export type DispatchAction = 'charge' | 'discharge' | 'hold';
export type GridService = 
  | 'arbitrage'
  | 'peak_shaving'
  | 'frequency_regulation'
  | 'renewable_absorption';
export type DispatchSource = 'ai_optimization' | 'manual' | 'pre_scheduled';
export type ExecutionStatus = 'pending' | 'executing' | 'completed' | 'failed';

export interface StorageDispatchLog {
  id: string;
  battery_id: string;
  battery_name?: string;
  province: string;
  decision_timestamp: string;
  action: DispatchAction;
  magnitude_mw?: number;
  duration_minutes?: number;
  soc_before_percent?: number;
  soc_after_percent?: number;
  capacity_mwh?: number;
  grid_price_cad_per_mwh?: number;
  grid_demand_mw?: number;
  renewable_curtailment_risk?: boolean;
  grid_service_provided?: GridService;
  energy_mwh?: number;
  revenue_impact_cad?: number; // KEY METRIC FOR AWARD
  round_trip_efficiency_percent?: number; // KEY METRIC FOR AWARD
  decision_source?: DispatchSource;
  model_version?: string;
  confidence_score?: number;
  reasoning?: string;
  execution_status?: ExecutionStatus;
  created_at: string;
  notes?: string;
}

export interface BatteryState {
  soc_percent: number;
  capacity_mwh: number;
  max_charge_mw: number;
  max_discharge_mw: number;
  round_trip_efficiency: number;
}

export interface DispatchDecision {
  action: DispatchAction;
  magnitude_mw: number;
  duration_minutes: number;
  reasoning: string;
  expected_revenue_cad: number;
  grid_service_type: GridService;
  confidence: number;
}

// ============================================================================
// CAPACITY REGISTRY TYPES
// ============================================================================

export type FacilityType = 'solar_farm' | 'wind_farm' | 'hydro_dam' | 'battery_storage';
export type OperationalStatus = 'operational' | 'under_construction' | 'planned';

export interface RenewableCapacityRegistry {
  id: string;
  province: string;
  facility_name: string;
  facility_type?: FacilityType;
  nameplate_capacity_mw: number;
  technology?: string;
  latitude?: number;
  longitude?: number;
  operational_status?: OperationalStatus;
  commissioned_date?: string;
  owner_name?: string;
  is_indigenous_owned?: boolean;
  typical_capacity_factor?: number;
  created_at: string;
  updated_at: string;
  notes?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES FOR APIs
// ============================================================================

export interface ForecastGenerationRequest {
  province: string;
  source_type: RenewableSourceType;
  horizon_hours: ForecastHorizon;
  weather_data?: WeatherFeatures;
  model_type?: ModelType;
}

export interface ForecastGenerationResponse {
  success: boolean;
  forecast?: RenewableForecast;
  error?: string;
  performance_hint?: string;
}

export interface PerformanceMetricsRequest {
  province: string;
  source_type: RenewableSourceType;
  horizon_hours?: ForecastHorizon;
  start_date: string;
  end_date: string;
}

export interface PerformanceMetricsResponse {
  success: boolean;
  metrics?: ForecastPerformance[];
  summary?: {
    total_forecasts: number;
    avg_mape: number;
    improvement_vs_baseline: number;
  };
  error?: string;
}

export interface CurtailmentAnalysisRequest {
  province: string;
  start_date: string;
  end_date: string;
  source_type?: RenewableSourceType;
}

export interface CurtailmentAnalysisResponse {
  success: boolean;
  events?: CurtailmentEvent[];
  summary?: {
    total_curtailed_mwh: number;
    total_opportunity_cost_cad: number;
    avg_curtailment_duration_hours: number;
    most_common_reason: CurtailmentReason;
  };
  recommendations?: CurtailmentReductionRecommendation[];
  error?: string;
}

export interface StorageOptimizationRequest {
  battery_id: string;
  battery_state: BatteryState;
  grid_conditions: {
    demand_mw: number;
    renewable_output_mw: number;
    price_cad_per_mwh: number;
    curtailment_risk: boolean;
  };
  forecast_horizon_hours?: number;
}

export interface StorageOptimizationResponse {
  success: boolean;
  decision?: DispatchDecision;
  schedule?: Array<{
    hour: number;
    action: DispatchAction;
    magnitude_mw: number;
    expected_soc: number;
  }>;
  expected_daily_revenue_cad?: number;
  error?: string;
}

// ============================================================================
// AWARD EVIDENCE METRICS (For Nomination Documentation)
// ============================================================================

export interface AwardEvidenceMetrics {
  // Forecasting Performance
  solar_forecast_mae_percent: number; // Target: <6%
  wind_forecast_mae_percent: number; // Target: <8%
  forecast_improvement_vs_baseline_percent: number; // Target: >50%
  
  // Curtailment Reduction
  monthly_curtailment_avoided_mwh: number; // Target: >500 MWh
  monthly_opportunity_cost_recovered_cad: number; // Target: >$25,000
  curtailment_reduction_percent: number; // vs baseline
  
  // Storage Optimization
  avg_round_trip_efficiency_percent: number; // Target: >88%
  monthly_arbitrage_revenue_cad: number;
  storage_dispatch_accuracy_percent: number;
  
  // Grid Stability
  renewable_penetration_increase_percent: number; // Target: >5%
  frequency_deviation_improvement_percent: number;
  grid_reliability_score: number; // 0-100
  
  // Operational
  forecast_count: number;
  data_points_processed: number;
  uptime_percent: number;
  
  // Time period
  period_start: string;
  period_end: string;
  calculated_at: string;
}

// All types are exported individually above - no default export needed
