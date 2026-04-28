import { calculatePersistenceBaseline, calculateSeasonalNaiveBaseline } from './forecastBaselines';
import { DemandForecaster, type DemandRecord, type ForecastMetrics } from './demandForecaster';
import {
  buildLiveSurfaceContract,
  type LiveSurfaceContract,
  type LiveSurfaceSourceKind,
  UTILITY_ASSUMPTION_PACK_VERSION,
} from './liveSurfaceContract';
import { createProvenance, type ProvenanceMetadata } from './types/provenance';
import type {
  AUC_DSP_DataSchedule_Row,
  OEB_DSP_LoadForecast_Row,
  OEB_DSP_Reliability_Row,
  OEB_DSP_ScenarioMatrix_Row,
} from './regulatoryTemplates';

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

export interface UtilityForecastPackage {
  jurisdiction: UtilityJurisdiction;
  generated_at: string;
  provenance: ProvenanceMetadata;
  source_label: string;
  summary: UtilityDataSummary;
  scenario: UtilityPlanningScenario;
  benchmark: ForecastMetrics;
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

interface ParsedUtilityCsv {
  rows: UtilityHistoricalLoadRow[];
  errors: string[];
}

interface AggregatedIntervalPoint {
  timestamp: string;
  demand_mw: number;
  customer_count: number;
  temperature_c: number | null;
  gross_demand_mw: number;
  quality_flags: UtilityQualityFlag[];
}

interface UtilityQualityAssessment {
  qualityCounts: Array<{ flag: UtilityQualityFlag; count: number }>;
  warnings: string[];
  grossReconstitutionApplied: boolean;
  totalFlags: number;
}

const TEMPLATE_HEADERS = [
  'timestamp',
  'geography_level',
  'geography_id',
  'customer_class',
  'demand_mw',
  'weather_zone',
  'temperature_c',
  'net_load_mw',
  'gross_load_mw',
  'customer_count',
  'source_system',
  'feeder_id',
  'substation_id',
] as const;

const HEADER_ALIASES: Record<string, string[]> = {
  timestamp: ['timestamp', 'datetime', 'date_time', 'interval_start', 'date'],
  geography_level: ['geography_level', 'level', 'asset_level'],
  geography_id: ['geography_id', 'zone', 'zone_id', 'feeder', 'substation', 'system_id'],
  customer_class: ['customer_class', 'class', 'rate_class', 'customer_segment'],
  demand_mw: ['demand_mw', 'mw', 'peak_mw', 'load_mw', 'demand'],
  weather_zone: ['weather_zone', 'weather', 'temperature_zone'],
  temperature_c: ['temperature_c', 'temp_c', 'temperature'],
  net_load_mw: ['net_load_mw', 'net_mw'],
  gross_load_mw: ['gross_load_mw', 'gross_mw'],
  customer_count: ['customer_count', 'customers', 'account_count'],
  source_system: ['source_system', 'system_source', 'connector'],
  feeder_id: ['feeder_id', 'feeder_name'],
  substation_id: ['substation_id', 'substation_name'],
};

const DEFAULT_PLANNING_YEARS = [1, 5, 10];
const DEFAULT_HOSTING_CAPACITY_LIMIT_MW = 3.5;

export function parseUtilityHistoricalLoadCsv(text: string): ParsedUtilityCsv {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length < 2) {
    return { rows: [], errors: ['CSV must include a header row and at least one data row.'] };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const errors: string[] = [];
  const rows: UtilityHistoricalLoadRow[] = [];

  const columnIndexes = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([key, aliases]) => [
      key,
      headers.findIndex((header) => aliases.includes(header)),
    ]),
  ) as Record<keyof typeof HEADER_ALIASES, number>;

  if (columnIndexes.timestamp < 0 || columnIndexes.demand_mw < 0) {
    return {
      rows: [],
      errors: ['CSV must include timestamp/datetime and demand_mw/load_mw columns.'],
    };
  }

  for (let index = 1; index < lines.length; index += 1) {
    const columns = splitCsvLine(lines[index]);
    const timestamp = readColumn(columns, columnIndexes.timestamp);
    const demandMw = parseNumeric(readColumn(columns, columnIndexes.demand_mw));

    if (!timestamp || !Number.isFinite(new Date(timestamp).getTime()) || !Number.isFinite(demandMw)) {
      errors.push(`Row ${index + 1} skipped: invalid timestamp or demand value.`);
      continue;
    }

    const geographyId = readColumn(columns, columnIndexes.geography_id) || 'system';
    const geographyLevel = normalizeGeographyLevel(readColumn(columns, columnIndexes.geography_level), geographyId);
    const customerClass = readColumn(columns, columnIndexes.customer_class) || 'mixed';
    const netLoad = parseOptionalNumeric(readColumn(columns, columnIndexes.net_load_mw));
    const grossLoad = parseOptionalNumeric(readColumn(columns, columnIndexes.gross_load_mw));
    const qualityFlags: UtilityQualityFlag[] = [];
    if (demandMw < 0) qualityFlags.push('negative_load');
    if (!Number.isFinite(Number(readColumn(columns, columnIndexes.temperature_c)))) qualityFlags.push('missing_temperature');
    if (!readColumn(columns, columnIndexes.customer_count)) qualityFlags.push('customer_count_missing');
    if (netLoad !== null && grossLoad !== null && netLoad > grossLoad) qualityFlags.push('net_exceeds_gross');

    rows.push({
      timestamp: new Date(timestamp).toISOString(),
      geography_level: geographyLevel,
      geography_id: geographyId,
      customer_class: customerClass,
      demand_mw: demandMw,
      weather_zone: readColumn(columns, columnIndexes.weather_zone) || undefined,
      temperature_c: parseOptionalNumeric(readColumn(columns, columnIndexes.temperature_c)),
      net_load_mw: netLoad,
      gross_load_mw: grossLoad,
      customer_count: parseOptionalNumeric(readColumn(columns, columnIndexes.customer_count)),
      source_system: readColumn(columns, columnIndexes.source_system) || undefined,
      feeder_id: readColumn(columns, columnIndexes.feeder_id) || undefined,
      substation_id: readColumn(columns, columnIndexes.substation_id) || undefined,
      quality_flags: qualityFlags,
    });
  }

  return { rows: sortRows(rows), errors };
}

export function buildUtilityStarterCsv(
  jurisdiction: UtilityJurisdiction,
  granularity: UtilityInputGranularity = 'hourly',
): string {
  return utilityRowsToCsv(generateUtilityLoadSampleRows(jurisdiction, granularity));
}

export function utilityRowsToCsv(rows: UtilityHistoricalLoadRow[]): string {
  const header = TEMPLATE_HEADERS.join(',');
  const body = rows.map((row) => [
    row.timestamp,
    row.geography_level,
    row.geography_id,
    row.customer_class,
    round(row.demand_mw, 3),
    row.weather_zone ?? '',
    row.temperature_c ?? '',
    row.net_load_mw ?? '',
    row.gross_load_mw ?? '',
    row.customer_count ?? '',
    row.source_system ?? '',
    row.feeder_id ?? '',
    row.substation_id ?? '',
  ].join(','));

  return [header, ...body].join('\n');
}

export function generateUtilityLoadSampleRows(
  jurisdiction: UtilityJurisdiction,
  granularity: UtilityInputGranularity = 'hourly',
): UtilityHistoricalLoadRow[] {
  if (granularity === 'monthly') {
    return generateMonthlySampleRows(jurisdiction);
  }

  const feederProfiles = jurisdiction === 'Ontario'
    ? [
        { geography_id: 'ON-FEEDER-1', customer_class: 'residential', share: 0.34, temperatureBias: 1.15, customerCount: 5100 },
        { geography_id: 'ON-FEEDER-2', customer_class: 'commercial', share: 0.26, temperatureBias: 0.85, customerCount: 1850 },
        { geography_id: 'ON-FEEDER-3', customer_class: 'industrial', share: 0.22, temperatureBias: 0.55, customerCount: 240 },
        { geography_id: 'ON-FEEDER-4', customer_class: 'mixed', share: 0.18, temperatureBias: 0.90, customerCount: 1320 },
      ]
    : [
        { geography_id: 'AB-FEEDER-1', customer_class: 'residential', share: 0.29, temperatureBias: 1.25, customerCount: 4800 },
        { geography_id: 'AB-FEEDER-2', customer_class: 'commercial', share: 0.23, temperatureBias: 0.92, customerCount: 1710 },
        { geography_id: 'AB-FEEDER-3', customer_class: 'industrial', share: 0.31, temperatureBias: 0.65, customerCount: 190 },
        { geography_id: 'AB-FEEDER-4', customer_class: 'mixed', share: 0.17, temperatureBias: 0.95, customerCount: 1180 },
      ];

  const rows: UtilityHistoricalLoadRow[] = [];
  const start = Date.UTC(2025, 0, 1, 0, 0, 0);
  const hours = 24 * 45;
  const baseMw = jurisdiction === 'Ontario' ? 82 : 74;

  for (let hourIndex = 0; hourIndex < hours; hourIndex += 1) {
    const timestamp = new Date(start + hourIndex * 3600_000);
    const month = timestamp.getUTCMonth();
    const hour = timestamp.getUTCHours();
    const weekday = timestamp.getUTCDay();

    const temperature = buildSampleTemperature(jurisdiction, month, hourIndex);
    const seasonalMultiplier = 1 + Math.sin((month / 12) * Math.PI * 2) * (jurisdiction === 'Ontario' ? 0.05 : 0.04);
    const dailyProfile = 0.82
      + Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI) * 0.28)
      + Math.max(0, Math.sin(((hour - 15) / 24) * Math.PI) * 0.18);
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.91 : 1;
    const weatherSensitivity = jurisdiction === 'Ontario'
      ? Math.max(0, 18 - temperature) * 0.55 + Math.max(0, temperature - 24) * 0.25
      : Math.max(0, 16 - temperature) * 0.48 + Math.max(0, temperature - 25) * 0.22;
    const totalDemand = baseMw * seasonalMultiplier * dailyProfile * weekendFactor + weatherSensitivity;

    for (const feeder of feederProfiles) {
      const feederDemand = totalDemand * feeder.share * (1 + weatherSensitivity * 0.002 * feeder.temperatureBias);
      const grossLoad = feederDemand * 1.03;
      const netLoad = grossLoad - (jurisdiction === 'Ontario' ? 0.6 : 0.8) * Math.max(0, Math.sin(((hour - 10) / 24) * Math.PI));

      rows.push({
        timestamp: timestamp.toISOString(),
        geography_level: 'feeder',
        geography_id: feeder.geography_id,
        customer_class: feeder.customer_class,
        demand_mw: round(feederDemand, 3),
        weather_zone: jurisdiction === 'Ontario' ? 'south' : 'central',
        temperature_c: round(temperature, 2),
        net_load_mw: round(netLoad, 3),
        gross_load_mw: round(grossLoad, 3),
        customer_count: feeder.customerCount,
        source_system: 'starter_dataset',
        feeder_id: feeder.geography_id,
        quality_flags: [],
      });
    }
  }

  return rows;
}

export function buildUtilityForecastPackage(params: {
  rows: UtilityHistoricalLoadRow[];
  scenario: UtilityPlanningScenario;
  sourceLabel: string;
  isSampleData?: boolean;
  sourceKind?: UtilityInputSourceKind;
  liveSurfaces?: LiveSurfaceContract[];
}): UtilityForecastPackage {
  const rows = prepareRows(sortRows(params.rows));
  const qualityAssessment = assessInputQuality(rows);
  const highlightedYears = uniqueSortedYears(params.scenario.planning_horizon_years ?? DEFAULT_PLANNING_YEARS);
  const summary = summarizeRows(rows);
  const aggregated = aggregateIntervals(rows);
  const benchmarkResult = buildBenchmarkMetricsWithFallback(aggregated, summary.granularity);
  const benchmark = benchmarkResult.metrics;
  const weatherFactor = estimateWeatherFactor(aggregated, params.scenario.weather_case, params.scenario.stress_test_mode ?? 'none');
  const maxYear = Math.max(...highlightedYears, 10);
  const capacityMw = round(summary.baseline_peak_mw * (1 + params.scenario.capacity_buffer_pct / 100), 2);
  const sourceKind = params.sourceKind ?? (params.isSampleData ? 'fallback_starter' : 'uploaded_historical');

  const expectedCase = buildForecastCase({
    label: 'expected',
    aggregated,
    summary,
    scenario: params.scenario,
    annualGrowthPct: params.scenario.annual_load_growth_pct,
    weatherFactor,
    maxYear,
    capacityMw,
  });
  const lowCase = buildForecastCase({
    label: 'low',
    aggregated,
    summary,
    scenario: params.scenario,
    annualGrowthPct: Math.max(0, params.scenario.annual_load_growth_pct - 0.75),
    weatherFactor: Math.max(0.98, weatherFactor - 0.02),
    maxYear,
    capacityMw,
  });
  const highCase = buildForecastCase({
    label: 'high',
    aggregated,
    summary,
    scenario: params.scenario,
    annualGrowthPct: params.scenario.annual_load_growth_pct + 0.75,
    weatherFactor: weatherFactor + 0.03,
    maxYear,
    capacityMw,
  });

  const scenarioMatrix: UtilityScenarioMatrix = {
    low: lowCase,
    base: expectedCase,
    high: highCase,
  };
  const deferredPeakLoadMw = computeDeferredPeakLoad(params.scenario);
  const geographyAllocations = reconcileGeographyAllocations(
    rows,
    expectedCase,
    highlightedYears,
    params.scenario,
    params.scenario.hosting_capacity_limit_mw ?? DEFAULT_HOSTING_CAPACITY_LIMIT_MW,
  );
  const reliabilityProxy = buildReliabilityProxy(
    expectedCase,
    capacityMw,
    weatherFactor,
    qualityAssessment,
    params.scenario.stress_test_mode ?? 'none',
  );
  const oebRows = buildOebRows(params.scenario.jurisdiction, expectedCase, capacityMw);
  const reliabilityRows = buildReliabilityRows(reliabilityProxy);
  const scenarioMatrixRows = buildScenarioMatrixRows(scenarioMatrix, reliabilityProxy);
  const albertaDspRows = buildAucDspRows(expectedCase, geographyAllocations, params.scenario, reliabilityProxy);
  const hostingCapacityWarnings = buildHostingCapacityWarnings(
    geographyAllocations,
    params.scenario,
    highlightedYears,
  );
  const profiles8760 = build8760Profiles(
    aggregated,
    summary,
    scenarioMatrix,
    highlightedYears,
    params.scenario,
  );
  const warnings: string[] = [...benchmarkResult.warnings];

  if (summary.granularity === 'monthly') {
    warnings.push('Monthly input runs on a planning-timescale model; 8,760-hour profiles are synthesized from seasonal shape assumptions.');
  }
  if (summary.interval_count < 12) {
    warnings.push('Forecast confidence is limited because fewer than 12 intervals are available.');
  }
  if (params.isSampleData) {
    warnings.push('Starter data is illustrative and should be replaced with utility history for production use.');
  }
  if (qualityAssessment.warnings.length > 0) {
    warnings.push(...qualityAssessment.warnings);
  }
  if (hostingCapacityWarnings.length > 0) {
    warnings.push(`Hosting capacity review required for ${hostingCapacityWarnings.length} projected feeder scenario(s).`);
  }

  const assumptions = [
    `${params.scenario.jurisdiction} utility planning lane uses a transparent statistical forecast, not an AI-only model.`,
    `${params.scenario.weather_case === 'extreme' ? 'Extreme' : 'Median'} weather case applies a ${(weatherFactor * 100).toFixed(1)}% peak multiplier based on observed temperature sensitivity${params.scenario.stress_test_mode && params.scenario.stress_test_mode !== 'none' ? ` under ${params.scenario.stress_test_mode.replace(/_/g, ' ')} stress assumptions` : ''}.`,
    `Base case assumes ${params.scenario.annual_load_growth_pct.toFixed(2)}% annual load growth plus explicit overlays for committed load, EVs, heat pumps, DER offsets, demand response, and ToU shifts.`,
    `Geography allocations are reconciled to the top-line forecast using recent interval shares across ${summary.geography_count} ${summary.geography_count === 1 ? 'geography' : 'geographies'}.`,
    `Benchmark proof is derived from a holdout backtest against persistence and seasonal-naive baselines.`,
    `Live-surface contract version ${UTILITY_ASSUMPTION_PACK_VERSION} captures source, observed_at, freshness_status, is_fallback, quality_flags, and assumption pack version.`,
  ];
  if ((params.scenario.large_point_loads?.length ?? 0) > 0) {
    assumptions.push(`Large point-load overlay adds ${(params.scenario.large_point_loads ?? []).reduce((sum, item) => sum + item.mw, 0).toFixed(1)} MW of named non-organic demand.`);
  }
  if ((params.scenario.industrial_opt_outs?.length ?? 0) > 0) {
    assumptions.push(`Industrial opt-out overlay removes ${(params.scenario.industrial_opt_outs ?? []).reduce((sum, item) => sum + item.mw, 0).toFixed(1)} MW from the grid-served planning case.`);
  }

  const inputSurface = buildLiveSurfaceContract({
    source: params.sourceLabel,
    observedAt: summary.date_range.end,
    isFallback: sourceKind === 'fallback_starter' || params.isSampleData,
    qualityFlags: qualityAssessment.qualityCounts.filter((entry) => entry.count > 0).map((entry) => entry.flag),
    sourceKind,
    assumptionPackVersion: UTILITY_ASSUMPTION_PACK_VERSION,
    staleAfterHours: sourceKind === 'telemetry_gateway'
      ? 24
      : sourceKind === 'utility_system_batch' || sourceKind === 'utility_settlement_batch'
        ? 24 * 7
        : sourceKind === 'green_button_cmd'
          ? 24 * 2
          : 24 * 30,
    notes: sourceKind === 'utility_system_batch'
      ? 'Normalized batch snapshot from utility operational systems.'
      : sourceKind === 'utility_settlement_batch'
        ? 'Settlement or MDM-compatible batch normalized into the utility planning contract.'
        : sourceKind === 'green_button_cmd'
          ? 'Ontario Green Button Connect My Data interval history normalized into the planning contract.'
          : sourceKind === 'telemetry_gateway'
            ? 'Northbound telemetry gateway snapshot from external SCADA or edge integration.'
            : sourceKind === 'uploaded_historical'
              ? 'User-provided historical utility dataset.'
              : 'Starter dataset for workflow validation.',
  });
  const liveSurfaces = [inputSurface, ...(params.liveSurfaces ?? [])];
  const inputProvenanceSummary: UtilityInputProvenanceSummary = {
    source_kind: sourceKind,
    assumption_pack_version: UTILITY_ASSUMPTION_PACK_VERSION,
    live_surfaces: liveSurfaces,
    quality_counts: qualityAssessment.qualityCounts,
    gross_reconstitution_applied: qualityAssessment.grossReconstitutionApplied,
    source_systems: Array.from(new Set(rows.map((row) => row.source_system).filter(Boolean) as string[])).sort(),
    total_quality_flags: qualityAssessment.totalFlags,
  };

  const provenance = createProvenance(
    params.isSampleData
      ? 'mock'
      : sourceKind === 'utility_system_batch' || sourceKind === 'utility_settlement_batch' || sourceKind === 'green_button_cmd'
        ? 'calibrated'
        : 'historical_archive',
    params.sourceLabel,
    params.isSampleData
      ? 0.58
      : sourceKind === 'utility_system_batch' || sourceKind === 'utility_settlement_batch'
        ? 0.9
        : sourceKind === 'green_button_cmd'
          ? 0.88
          : sourceKind === 'telemetry_gateway'
            ? 0.84
            : 0.87,
    {
      completeness: 1,
      notes: params.isSampleData
        ? 'Utility planning starter dataset loaded locally for workflow validation.'
        : sourceKind === 'utility_system_batch'
          ? 'Utility operational batch snapshot normalized into the planning contract.'
          : sourceKind === 'utility_settlement_batch'
            ? 'Settlement or MDM-compatible utility export used to build the planning forecast package.'
            : sourceKind === 'green_button_cmd'
              ? 'Green Button Connect My Data interval history used to build the planning forecast package.'
              : sourceKind === 'telemetry_gateway'
                ? 'Telemetry gateway snapshot blended into the planning truth contract for live utility context.'
                : 'Uploaded utility historical load data used to build the planning forecast package.',
    },
  );

  return {
    jurisdiction: params.scenario.jurisdiction,
    generated_at: new Date().toISOString(),
    provenance,
    source_label: params.sourceLabel,
    summary,
    scenario: params.scenario,
    benchmark,
    cases: {
      low: lowCase,
      expected: expectedCase,
      high: highCase,
    },
    scenario_matrix: scenarioMatrix,
    highlighted_years: highlightedYears,
    geography_allocations: geographyAllocations,
    reliability_proxy: reliabilityProxy,
    profiles_8760: profiles8760,
    deferred_peak_load_mw: deferredPeakLoadMw,
    hosting_capacity_warnings: hostingCapacityWarnings,
    input_provenance_summary: inputProvenanceSummary,
    regulatory_exports: {
      ontario: {
        load_forecast_rows: oebRows,
        reliability_rows: reliabilityRows,
        scenario_matrix_rows: scenarioMatrixRows,
      },
      alberta: {
        data_schedule_rows: albertaDspRows,
      },
    },
    assumptions,
    warnings,
    oeb_rows: oebRows,
  };
}

export function utilityForecastPackageToCsv(forecastPackage: UtilityForecastPackage): string {
  const lines = [
    '# Utility Demand Forecast Package',
    `# Jurisdiction: ${forecastPackage.jurisdiction}`,
    `# Generated: ${forecastPackage.generated_at}`,
    `# Source: ${forecastPackage.source_label}`,
    `# Provenance: ${forecastPackage.provenance.type}`,
    `# Assumption Pack: ${forecastPackage.input_provenance_summary.assumption_pack_version}`,
    '',
    'case,year,peak_demand_mw,annual_energy_gwh,customer_count,growth_rate_pct,scenario_delta_mw,utilization_pct,weather_factor',
  ];

  for (const [caseKey, forecastCase] of Object.entries(forecastPackage.cases)) {
    for (const year of forecastCase.yearly) {
      lines.push([
        caseKey,
        year.year,
        year.peak_demand_mw,
        year.annual_energy_gwh,
        year.customer_count,
        year.growth_rate_pct,
        year.scenario_delta_mw,
        year.utilization_pct,
        year.weather_factor,
      ].join(','));
    }
  }

  lines.push('', 'reliability_proxy_horizon,score,band,peak_utilization_pct,reserve_headroom_mw,weather_stress_pct');
  forecastPackage.reliability_proxy.horizon_scores.forEach((row) => {
    lines.push([
      row.horizon_year,
      row.score,
      row.band,
      row.peak_utilization_pct,
      row.reserve_headroom_mw,
      row.weather_stress_pct,
    ].join(','));
  });

  lines.push('', 'live_surface_source,observed_at,freshness_status,is_fallback,source_kind,quality_flags');
  forecastPackage.input_provenance_summary.live_surfaces.forEach((surface) => {
    lines.push([
      surface.source,
      surface.observed_at ?? '',
      surface.freshness_status,
      surface.is_fallback,
      surface.source_kind,
      `"${surface.quality_flags.join('|')}"`,
    ].join(','));
  });

  lines.push('', 'hosting_capacity_horizon,geography_id,geography_level,projected_der_mw,limit_mw,severity,message');
  forecastPackage.hosting_capacity_warnings.forEach((warning) => {
    lines.push([
      warning.horizon_year,
      warning.geography_id,
      warning.geography_level,
      warning.projected_der_mw,
      warning.limit_mw,
      warning.severity,
      `"${warning.message.replace(/"/g, '""')}"`,
    ].join(','));
  });

  lines.push('', 'assumption');
  forecastPackage.assumptions.forEach((assumption) => {
    lines.push(`"${assumption.replace(/"/g, '""')}"`);
  });

  return lines.join('\n');
}

export function utilityForecastPackageToAlbertaCsv(forecastPackage: UtilityForecastPackage): string {
  const lines = [
    '# Alberta Distribution Plan Data Schedule',
    `# Generated: ${forecastPackage.generated_at}`,
    `# Source: ${forecastPackage.source_label}`,
    '',
    'horizon_year,geography_id,geography_level,peak_demand_mw,annual_energy_gwh,customer_count,growth_rate_pct,large_point_load_mw,industrial_opt_out_mw,der_offset_mw,deferred_peak_load_mw,reliability_proxy_score,hosting_capacity_limit_mw,notes',
  ];

  forecastPackage.regulatory_exports.alberta.data_schedule_rows.forEach((row) => {
    lines.push([
      row.horizon_year,
      row.geography_id,
      row.geography_level,
      row.peak_demand_mw,
      row.annual_energy_gwh,
      row.customer_count,
      row.growth_rate_pct,
      row.large_point_load_mw,
      row.industrial_opt_out_mw,
      row.der_offset_mw,
      row.deferred_peak_load_mw,
      row.reliability_proxy_score,
      row.hosting_capacity_limit_mw,
      `"${row.notes.replace(/"/g, '""')}"`,
    ].join(','));
  });

  return lines.join('\n');
}

function buildOebRows(
  jurisdiction: UtilityJurisdiction,
  expectedCase: UtilityForecastCase,
  capacityMw: number,
): OEB_DSP_LoadForecast_Row[] {
  const rows = expectedCase.yearly
    .filter((year) => year.year <= 5)
    .map((year) => ({
      year: new Date().getUTCFullYear() + year.year,
      zone: jurisdiction === 'Ontario' ? 'Primary planning zone' : 'Distribution planning zone',
      peak_demand_mw: year.peak_demand_mw,
      energy_gwh: year.annual_energy_gwh,
      customer_count: year.customer_count,
      growth_rate_pct: year.growth_rate_pct,
      capacity_mw: capacityMw,
      utilization_pct: year.utilization_pct,
      load_transfer_capability_mw: round(capacityMw * 0.15, 2),
      notes: year.utilization_pct >= 80 ? 'Planning review trigger: utilization exceeds 80%.' : '',
    }));

  return rows;
}

function prepareRows(rows: UtilityHistoricalLoadRow[]): UtilityHistoricalLoadRow[] {
  const merged = new Map<string, UtilityHistoricalLoadRow & { _count: number }>();

  rows.forEach((inputRow) => {
    const normalizedFlags = new Set<UtilityQualityFlag>(inputRow.quality_flags ?? []);
    const effectiveGross = Number.isFinite(inputRow.gross_load_mw ?? Number.NaN)
      ? Number(inputRow.gross_load_mw)
      : null;
    const useGross = effectiveGross !== null && effectiveGross > 0 && effectiveGross >= inputRow.demand_mw;
    const preparedRow: UtilityHistoricalLoadRow = {
      ...inputRow,
      demand_mw: useGross ? round(effectiveGross ?? inputRow.demand_mw, 3) : round(inputRow.demand_mw, 3),
      gross_reconstituted_mw: useGross ? round(effectiveGross ?? inputRow.demand_mw, 3) : inputRow.gross_reconstituted_mw ?? null,
      quality_flags: Array.from(
        useGross ? normalizedFlags.add('gross_reconstituted') : normalizedFlags,
      ),
    };
    const key = `${preparedRow.timestamp}|${preparedRow.geography_level}|${preparedRow.geography_id}|${preparedRow.customer_class}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...preparedRow, _count: 1 });
      return;
    }

    const nextCount = existing._count + 1;
    const mergedFlags = new Set<UtilityQualityFlag>([
      ...(existing.quality_flags ?? []),
      ...(preparedRow.quality_flags ?? []),
      'duplicate_interval',
    ]);
    merged.set(key, {
      ...existing,
      demand_mw: round((existing.demand_mw * existing._count + preparedRow.demand_mw) / nextCount, 3),
      net_load_mw: averageOptional(existing.net_load_mw, preparedRow.net_load_mw, existing._count, nextCount),
      gross_load_mw: averageOptional(existing.gross_load_mw, preparedRow.gross_load_mw, existing._count, nextCount),
      gross_reconstituted_mw: averageOptional(
        existing.gross_reconstituted_mw,
        preparedRow.gross_reconstituted_mw,
        existing._count,
        nextCount,
      ),
      temperature_c: averageOptional(existing.temperature_c, preparedRow.temperature_c, existing._count, nextCount),
      customer_count: Math.max(Number(existing.customer_count ?? 0), Number(preparedRow.customer_count ?? 0)),
      source_system: existing.source_system ?? preparedRow.source_system,
      feeder_id: existing.feeder_id ?? preparedRow.feeder_id,
      substation_id: existing.substation_id ?? preparedRow.substation_id,
      quality_flags: Array.from(mergedFlags),
      _count: nextCount,
    });
  });

  return sortRows(Array.from(merged.values()).map(({ _count: _ignored, ...row }) => row));
}

function assessInputQuality(rows: UtilityHistoricalLoadRow[]): UtilityQualityAssessment {
  const counts = new Map<UtilityQualityFlag, number>();
  const grouped = new Map<string, UtilityHistoricalLoadRow[]>();

  const increment = (flag: UtilityQualityFlag, amount = 1) => {
    counts.set(flag, (counts.get(flag) ?? 0) + amount);
  };

  rows.forEach((row) => {
    (row.quality_flags ?? []).forEach((flag) => increment(flag));
    const groupKey = `${row.geography_level}|${row.geography_id}|${row.customer_class}`;
    const group = grouped.get(groupKey) ?? [];
    group.push(row);
    grouped.set(groupKey, group);
  });

  grouped.forEach((groupRows) => {
    const sorted = sortRows(groupRows);
    let flatlineRun = 1;
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      const previousDemand = previous.gross_reconstituted_mw ?? previous.demand_mw;
      const currentDemand = current.gross_reconstituted_mw ?? current.demand_mw;
      const ratio = previousDemand > 0 ? currentDemand / previousDemand : 1;
      const absoluteDelta = Math.abs(currentDemand - previousDemand);
      const temperatureDelta = Math.abs((current.temperature_c ?? 0) - (previous.temperature_c ?? 0));
      const priorCustomers = Number(previous.customer_count ?? 0);
      const currentCustomers = Number(current.customer_count ?? 0);

      if (Math.abs(currentDemand - previousDemand) < 0.02) {
        flatlineRun += 1;
      } else {
        flatlineRun = 1;
      }
      if (flatlineRun === 8) {
        increment('flatline_segment');
      }

      if (previousDemand > 0 && absoluteDelta > Math.max(6, previousDemand * 0.55) && (ratio > 1.75 || ratio < 0.35)) {
        increment('impossible_spike');
      }
      if (previousDemand > 0 && absoluteDelta > Math.max(4, previousDemand * 0.28) && temperatureDelta < 3 && Math.abs(currentCustomers - priorCustomers) < Math.max(25, priorCustomers * 0.02)) {
        increment('load_transfer_jump');
      }
    }
  });

  const qualityCounts = ([
    'duplicate_interval',
    'negative_load',
    'flatline_segment',
    'impossible_spike',
    'load_transfer_jump',
    'customer_count_missing',
    'missing_temperature',
    'net_exceeds_gross',
    'gross_reconstituted',
  ] as UtilityQualityFlag[]).map((flag) => ({ flag, count: counts.get(flag) ?? 0 }));

  const warnings = qualityCounts
    .filter((entry) => entry.count > 0)
    .map((entry) => {
      switch (entry.flag) {
        case 'duplicate_interval':
          return `${entry.count} duplicate interval row(s) were merged before forecasting.`;
        case 'flatline_segment':
          return `${entry.count} flatline segment(s) were detected in historical load data.`;
        case 'impossible_spike':
          return `${entry.count} potential spike anomaly/anomalies exceed expected load-step thresholds.`;
        case 'load_transfer_jump':
          return `${entry.count} potential load-transfer jump(s) were detected with limited weather/customer explanation.`;
        case 'gross_reconstituted':
          return `${entry.count} row(s) used gross-load reconstitution to restore behind-the-meter suppressed baseline demand.`;
        default:
          return `${entry.count} ${entry.flag.replace(/_/g, ' ')} issue(s) detected in the input dataset.`;
      }
    });

  return {
    qualityCounts,
    warnings,
    grossReconstitutionApplied: (counts.get('gross_reconstituted') ?? 0) > 0,
    totalFlags: qualityCounts.reduce((sum, entry) => sum + entry.count, 0),
  };
}

function reconcileGeographyAllocations(
  rows: UtilityHistoricalLoadRow[],
  expectedCase: UtilityForecastCase,
  highlightedYears: number[],
  scenario: UtilityPlanningScenario,
  hostingCapacityLimitMw: number,
): UtilityGeographyAllocation[] {
  const recentRows = rows.slice(-Math.min(rows.length, 24 * 14 * 6));
  const shares = new Map<string, { peak: number; geography_level: UtilityGeographyLevel; customer_class: string }>();
  let totalPeak = 0;

  for (const row of recentRows) {
    const key = `${row.geography_level}|${row.geography_id}|${row.customer_class}`;
    const existing = shares.get(key) ?? {
      peak: 0,
      geography_level: row.geography_level,
      customer_class: row.customer_class,
    };
    existing.peak += row.demand_mw;
    shares.set(key, existing);
    totalPeak += row.demand_mw;
  }

  if (totalPeak <= 0) return [];

  const allocations: UtilityGeographyAllocation[] = [];
  for (const horizonYear of highlightedYears) {
    const target = expectedCase.yearly.find((year) => year.year === horizonYear);
    if (!target) continue;

    const entries = Array.from(shares.entries());
    const rawAllocations = entries.map(([key, value]) => {
      const share = value.peak / totalPeak;
      const [, geographyId, customerClass] = key.split('|');
      const pointLoadMw = (scenario.large_point_loads ?? [])
        .filter((item) => item.geography_id === geographyId && item.geography_level === value.geography_level)
        .reduce((sum, item) => sum + item.mw, 0);
      const industrialOptOutMw = (scenario.industrial_opt_outs ?? [])
        .filter((item) => item.geography_id === geographyId && item.geography_level === value.geography_level)
        .reduce((sum, item) => sum + item.mw, 0);
      const projectedDerMw = Math.max(0, scenario.der_offset_mw * share);

      return {
        geographyId,
        geographyLevel: value.geography_level,
        customerClass,
        sharePct: round(share * 100, 2),
        rawPeakMw: target.peak_demand_mw * share + pointLoadMw - industrialOptOutMw,
        constrained: projectedDerMw > hostingCapacityLimitMw || pointLoadMw > hostingCapacityLimitMw * 3,
      };
    });

    const rawTotal = rawAllocations.reduce((sum, entry) => sum + Math.max(0, entry.rawPeakMw), 0);
    let allocatedMw = 0;
    rawAllocations.forEach((entry, index) => {
      const normalizedPeak = rawTotal > 0 ? target.peak_demand_mw * (Math.max(0, entry.rawPeakMw) / rawTotal) : 0;
      const peakMw = index === rawAllocations.length - 1
        ? round(target.peak_demand_mw - allocatedMw, 3)
        : round(normalizedPeak, 3);
      allocatedMw += peakMw;
      allocations.push({
        horizon_year: horizonYear,
        geography_id: entry.geographyId,
        geography_level: entry.geographyLevel,
        customer_class: entry.customerClass,
        share_pct: entry.sharePct,
        peak_demand_mw: peakMw,
        constrained: entry.constrained,
      });
    });
  }

  return allocations;
}

function buildForecastCase(params: {
  label: UtilityForecastCase['label'];
  aggregated: AggregatedIntervalPoint[];
  summary: UtilityDataSummary;
  scenario: UtilityPlanningScenario;
  annualGrowthPct: number;
  weatherFactor: number;
  maxYear: number;
  capacityMw: number;
}): UtilityForecastCase {
  const pointLoadMw = (params.scenario.large_point_loads ?? []).reduce(
    (sum, item) => sum + item.mw * Math.max(0.25, item.load_factor_pct / 100),
    0,
  );
  const industrialOptOutMw = (params.scenario.industrial_opt_outs ?? []).reduce((sum, item) => sum + item.mw, 0);
  const touPeakShiftMw = (params.scenario.tou_shift_rules ?? []).reduce((sum, rule) => {
    const fromHours = Math.max(1, rule.from_hour_end - rule.from_hour_start + 1);
    const toHours = Math.max(1, rule.to_hour_end - rule.to_hour_start + 1);
    const shiftableMw = params.scenario.ev_growth_mw * (rule.shift_pct / 100);
    return sum + Math.max(0, shiftableMw * (1 / fromHours - 0.35 / toHours));
  }, 0);
  const additiveMwPerYear = (
    params.scenario.committed_load_mw
    + params.scenario.ev_growth_mw
    + params.scenario.heat_pump_growth_mw
    + pointLoadMw
    - params.scenario.der_offset_mw
    - params.scenario.demand_response_reduction_mw
    - industrialOptOutMw
    - touPeakShiftMw
  ) / Math.max(params.maxYear, 1);
  const customerGrowthFactor = 1 + params.annualGrowthPct * 0.004;
  const drShiftAdjustment = 1 - (params.scenario.demand_response_shift_pct / 400 + touPeakShiftMw / Math.max(params.summary.baseline_peak_mw, 1));
  const weatherStressAdder = params.scenario.stress_test_mode === 'polar_vortex'
    ? 0.035
    : params.scenario.stress_test_mode === 'heat_wave'
      ? 0.02
      : params.scenario.stress_test_mode === 'ice_storm'
        ? 0.025
        : 0;

  const yearly: UtilityForecastYear[] = [];
  for (let year = 1; year <= params.maxYear; year += 1) {
    const growthMultiplier = Math.pow(1 + params.annualGrowthPct / 100, year);
    const additiveMw = additiveMwPerYear * year;
    const peakDemand = round(
      params.summary.baseline_peak_mw * growthMultiplier * (params.weatherFactor + weatherStressAdder) * Math.max(0.76, drShiftAdjustment) + additiveMw,
      2,
    );
    const annualEnergy = round(
      params.summary.baseline_energy_gwh * Math.pow(1 + params.annualGrowthPct / 100, year)
        + additiveMw * 8.76 * 0.44
        + pointLoadMw * 8.76 * 0.52
        - industrialOptOutMw * 8.76 * 0.38,
      2,
    );
    const customerCount = round(
      params.summary.latest_customer_count > 0
        ? params.summary.latest_customer_count * Math.pow(customerGrowthFactor, year)
        : 0,
      0,
    );
    const utilization = params.capacityMw > 0 ? round((peakDemand / params.capacityMw) * 100, 1) : 0;

    yearly.push({
      year,
      peak_demand_mw: peakDemand,
      annual_energy_gwh: annualEnergy,
      customer_count: customerCount,
      growth_rate_pct: round(params.annualGrowthPct, 2),
      scenario_delta_mw: round(additiveMw, 2),
      utilization_pct: utilization,
      weather_factor: round(params.weatherFactor, 4),
    });
  }

  return {
    label: params.label,
    annual_growth_pct: round(params.annualGrowthPct, 2),
    yearly,
  };
}

function estimateWeatherFactor(
  aggregated: AggregatedIntervalPoint[],
  weatherCase: UtilityWeatherCase,
  stressTestMode: UtilityStressTestMode,
): number {
  if (weatherCase === 'median' && stressTestMode === 'none') return 1;

  const withTemperature = aggregated.filter((point) => Number.isFinite(point.temperature_c ?? Number.NaN));
  if (withTemperature.length < 24) {
    return round(1.01 + (weatherCase === 'extreme' ? 0.03 : 0) + stressModeAdder(stressTestMode), 4);
  }

  const meanDemand = withTemperature.reduce((sum, point) => sum + point.demand_mw, 0) / withTemperature.length;
  const weatherDriven = withTemperature.reduce((sum, point) => {
    const delta = Math.abs((point.temperature_c ?? 18) - 18);
    return sum + delta * point.demand_mw;
  }, 0) / withTemperature.length;

  const normalizedStress = meanDemand > 0 ? weatherDriven / meanDemand : 0.04;
  const caseAdder = weatherCase === 'extreme' ? 0.018 : 0;
  return round(1 + Math.min(0.09, normalizedStress * 0.0035) + caseAdder + stressModeAdder(stressTestMode), 4);
}

function summarizeRows(rows: UtilityHistoricalLoadRow[]): UtilityDataSummary {
  if (rows.length === 0) {
    throw new Error('At least one historical load row is required.');
  }

  const aggregated = aggregateIntervals(rows);
  const demandValues = aggregated.map((point) => point.demand_mw);
  const customerClasses = Array.from(new Set(rows.map((row) => row.customer_class))).sort();
  const geographies = Array.from(new Set(rows.map((row) => row.geography_id))).sort();
  const latestCustomerCount = aggregated.at(-1)?.customer_count ?? 0;
  const granularity = detectGranularity(aggregated);
  const hoursPerInterval = granularity === 'monthly' ? 730 : 1;
  const totalEnergyMwh = aggregated.reduce((sum, point) => sum + point.demand_mw * hoursPerInterval, 0);

  return {
    row_count: rows.length,
    interval_count: aggregated.length,
    granularity,
    date_range: {
      start: aggregated[0].timestamp,
      end: aggregated[aggregated.length - 1].timestamp,
    },
    geography_count: geographies.length,
    geographies,
    customer_classes: customerClasses,
    latest_customer_count: round(latestCustomerCount, 0),
    baseline_peak_mw: round(Math.max(...demandValues), 2),
    baseline_energy_gwh: round(totalEnergyMwh / 1000, 2),
    weather_zones: Array.from(new Set(rows.map((row) => row.weather_zone).filter(Boolean) as string[])).sort(),
  };
}

function aggregateIntervals(rows: UtilityHistoricalLoadRow[]): AggregatedIntervalPoint[] {
  const points = new Map<string, AggregatedIntervalPoint>();

  for (const row of rows) {
    const key = row.timestamp;
    const existing = points.get(key) ?? {
      timestamp: row.timestamp,
      demand_mw: 0,
      customer_count: 0,
      temperature_c: null,
      gross_demand_mw: 0,
      quality_flags: [],
    };

    const effectiveDemand = row.gross_reconstituted_mw ?? row.demand_mw;
    existing.demand_mw += effectiveDemand;
    existing.gross_demand_mw += row.gross_load_mw ?? effectiveDemand;
    existing.customer_count += Number(row.customer_count ?? 0);
    if (existing.temperature_c === null && Number.isFinite(row.temperature_c ?? Number.NaN)) {
      existing.temperature_c = row.temperature_c ?? null;
    }
    existing.quality_flags = Array.from(new Set([...existing.quality_flags, ...(row.quality_flags ?? [])]));

    points.set(key, existing);
  }

  return Array.from(points.values()).sort((left, right) =>
    new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

function buildBaseHourlyShape(
  aggregated: AggregatedIntervalPoint[],
  summary: UtilityDataSummary,
): number[] {
  if (summary.granularity === 'hourly' && aggregated.length > 0) {
    const trimmed = aggregated.slice(0, Math.min(aggregated.length, 8760)).map((point) => point.demand_mw);
    if (trimmed.length >= 24) return trimmed;
  }

  const series: number[] = [];
  const seasonalByMonth = [0.9, 0.88, 0.92, 0.97, 1, 1.03, 1.08, 1.06, 1.01, 0.98, 0.95, 0.91];
  for (let day = 0; day < 365; day += 1) {
    const month = Math.min(11, Math.floor(day / 30.5));
    for (let hour = 0; hour < 24; hour += 1) {
      const morningShoulder = Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI) * 0.2);
      const eveningPeak = Math.max(0, Math.sin(((hour - 15) / 24) * Math.PI) * 0.26);
      const overnightFloor = 0.68;
      series.push(round(summary.baseline_peak_mw * seasonalByMonth[month] * (overnightFloor + morningShoulder + eveningPeak), 3));
    }
  }
  return series;
}

function computeDeferredPeakLoad(scenario: UtilityPlanningScenario): number {
  const touDeferral = (scenario.tou_shift_rules ?? []).reduce(
    (sum, rule) => sum + scenario.ev_growth_mw * (rule.shift_pct / 100) * 0.12,
    0,
  );
  return round(Math.max(0, scenario.demand_response_reduction_mw + touDeferral), 2);
}

function buildReliabilityProxy(
  expectedCase: UtilityForecastCase,
  capacityMw: number,
  weatherFactor: number,
  qualityAssessment: UtilityQualityAssessment,
  stressTestMode: UtilityStressTestMode,
): UtilityReliabilityProxy {
  const baselineSaidiMinutes = expectedCase.label === 'expected' ? 106 : 110;
  const baselineSaifi = 1.14;
  const qualityPenalty = Math.min(18, qualityAssessment.totalFlags * 0.45);
  const stressPenalty = stressModeAdder(stressTestMode) * 100;

  const horizonScores = expectedCase.yearly.map((year) => {
    const reserveHeadroomMw = round(capacityMw - year.peak_demand_mw, 2);
    const utilizationPenalty = Math.max(0, year.utilization_pct - 72) * 0.85;
    const score = clamp(round(91 - utilizationPenalty - qualityPenalty - stressPenalty - Math.max(0, (weatherFactor - 1) * 85), 1), 30, 96);
    const band: UtilityReliabilityHorizon['band'] = score >= 82
      ? 'stable'
      : score >= 68
        ? 'watch'
        : score >= 52
          ? 'strained'
          : 'critical';

    return {
      horizon_year: year.year,
      score,
      band,
      peak_utilization_pct: year.utilization_pct,
      reserve_headroom_mw: reserveHeadroomMw,
      weather_stress_pct: round((weatherFactor - 1 + stressModeAdder(stressTestMode)) * 100, 2),
    };
  });

  return {
    current_score: horizonScores[0]?.score ?? 0,
    horizon_scores: horizonScores,
    baseline_saidi_minutes: baselineSaidiMinutes,
    baseline_saifi: baselineSaifi,
  };
}

function buildReliabilityRows(reliabilityProxy: UtilityReliabilityProxy): OEB_DSP_Reliability_Row[] {
  const first = reliabilityProxy.horizon_scores[0];
  const last = reliabilityProxy.horizon_scores.at(-1);
  const trend: OEB_DSP_Reliability_Row['trend'] = (last?.score ?? 0) >= (first?.score ?? 0)
    ? 'stable'
    : (last?.score ?? 0) >= (first?.score ?? 0) - 6
      ? 'declining'
      : 'declining';

  return [
    {
      metric: 'SAIDI proxy',
      unit: 'minutes/customer',
      current_year: round(reliabilityProxy.baseline_saidi_minutes, 1),
      prior_year_1: round(reliabilityProxy.baseline_saidi_minutes - 4, 1),
      prior_year_2: round(reliabilityProxy.baseline_saidi_minutes - 7, 1),
      prior_year_3: round(reliabilityProxy.baseline_saidi_minutes - 9, 1),
      oeb_target: 90,
      industry_avg: 104,
      trend,
    },
    {
      metric: 'SAIFI proxy',
      unit: 'interruptions/customer',
      current_year: round(reliabilityProxy.baseline_saifi, 2),
      prior_year_1: round(reliabilityProxy.baseline_saifi - 0.04, 2),
      prior_year_2: round(reliabilityProxy.baseline_saifi - 0.08, 2),
      prior_year_3: round(reliabilityProxy.baseline_saifi - 0.1, 2),
      oeb_target: 1,
      industry_avg: 1.12,
      trend,
    },
    {
      metric: 'Peak utilization proxy',
      unit: 'percent',
      current_year: first?.peak_utilization_pct ?? 0,
      prior_year_1: Math.max(0, (first?.peak_utilization_pct ?? 0) - 2),
      prior_year_2: Math.max(0, (first?.peak_utilization_pct ?? 0) - 4),
      prior_year_3: Math.max(0, (first?.peak_utilization_pct ?? 0) - 6),
      oeb_target: 80,
      industry_avg: 76,
      trend,
    },
  ];
}

function buildScenarioMatrixRows(
  scenarioMatrix: UtilityScenarioMatrix,
  reliabilityProxy: UtilityReliabilityProxy,
): OEB_DSP_ScenarioMatrix_Row[] {
  const exportedYears = uniqueSortedYears(
    scenarioMatrix.base.yearly
      .map((row) => row.year)
      .filter((year) => year === 1 || year === 5 || year === 10 || year === scenarioMatrix.base.yearly.at(-1)?.year),
  );
  const cases: Array<{ key: 'low' | 'base' | 'high'; forecast: UtilityForecastCase }> = [
    { key: 'low', forecast: scenarioMatrix.low },
    { key: 'base', forecast: scenarioMatrix.base },
    { key: 'high', forecast: scenarioMatrix.high },
  ];

  return exportedYears.flatMap((horizonYear) => {
    const baseYear = scenarioMatrix.base.yearly.find((row) => row.year === horizonYear);
    const reliability = reliabilityProxy.horizon_scores.find((row) => row.horizon_year === horizonYear);

    return cases.map(({ key, forecast }) => {
      const scenarioYear = forecast.yearly.find((row) => row.year === horizonYear);
      return {
        horizon_year: horizonYear,
        scenario: key,
        peak_demand_mw: scenarioYear?.peak_demand_mw ?? 0,
        annual_energy_gwh: scenarioYear?.annual_energy_gwh ?? 0,
        delta_vs_base_mw: round((scenarioYear?.peak_demand_mw ?? 0) - (baseYear?.peak_demand_mw ?? 0), 2),
        reliability_proxy_score: reliability?.score ?? reliabilityProxy.current_score,
        notes: key === 'base'
          ? 'Primary planning case.'
          : key === 'high'
            ? 'High-electrification / stress planning case.'
            : 'Conservative downside planning case.',
      };
    });
  });
}

function buildAucDspRows(
  expectedCase: UtilityForecastCase,
  allocations: UtilityGeographyAllocation[],
  scenario: UtilityPlanningScenario,
  reliabilityProxy: UtilityReliabilityProxy,
): AUC_DSP_DataSchedule_Row[] {
  return allocations.map((allocation) => {
    const year = expectedCase.yearly.find((entry) => entry.year === allocation.horizon_year);
    const reliability = reliabilityProxy.horizon_scores.find((entry) => entry.horizon_year === allocation.horizon_year);
    const share = allocation.share_pct / 100;
    const largePointLoadMw = (scenario.large_point_loads ?? [])
      .filter((item) => item.geography_id === allocation.geography_id && item.geography_level === allocation.geography_level)
      .reduce((sum, item) => sum + item.mw, 0);
    const industrialOptOutMw = (scenario.industrial_opt_outs ?? [])
      .filter((item) => item.geography_id === allocation.geography_id && item.geography_level === allocation.geography_level)
      .reduce((sum, item) => sum + item.mw, 0);
    const deferredPeakLoadMw = round(computeDeferredPeakLoad(scenario) * share, 2);

    return {
      horizon_year: allocation.horizon_year,
      geography_id: allocation.geography_id,
      geography_level: allocation.geography_level,
      peak_demand_mw: allocation.peak_demand_mw,
      annual_energy_gwh: round((year?.annual_energy_gwh ?? 0) * share, 2),
      customer_count: round((year?.customer_count ?? 0) * share, 0),
      growth_rate_pct: year?.growth_rate_pct ?? 0,
      large_point_load_mw: round(largePointLoadMw, 2),
      industrial_opt_out_mw: round(industrialOptOutMw, 2),
      der_offset_mw: round(scenario.der_offset_mw * share, 2),
      deferred_peak_load_mw: deferredPeakLoadMw,
      reliability_proxy_score: reliability?.score ?? reliabilityProxy.current_score,
      hosting_capacity_limit_mw: round(scenario.hosting_capacity_limit_mw ?? DEFAULT_HOSTING_CAPACITY_LIMIT_MW, 2),
      notes: allocation.constrained
        ? 'Review local constraints before filing the DSP schedule.'
        : 'Allocation reconciled from utility-wide planning case.',
    };
  });
}

function buildHostingCapacityWarnings(
  allocations: UtilityGeographyAllocation[],
  scenario: UtilityPlanningScenario,
  highlightedYears: number[],
): UtilityHostingCapacityWarning[] {
  const limit = scenario.hosting_capacity_limit_mw ?? DEFAULT_HOSTING_CAPACITY_LIMIT_MW;
  return allocations
    .filter((allocation) => highlightedYears.includes(allocation.horizon_year))
    .map((allocation) => {
      const projectedDerMw = round(scenario.der_offset_mw * (allocation.share_pct / 100), 2);
      const severity: UtilityHostingCapacityWarning['severity'] =
        projectedDerMw > limit * 1.25 || allocation.constrained ? 'critical' : 'warning';
      return {
        horizon_year: allocation.horizon_year,
        geography_id: allocation.geography_id,
        geography_level: allocation.geography_level,
        projected_der_mw: projectedDerMw,
        limit_mw: round(limit, 2),
        severity,
        message: projectedDerMw > limit
          ? `Projected DER of ${projectedDerMw.toFixed(2)} MW exceeds the planning hosting-capacity limit of ${limit.toFixed(2)} MW.`
          : '',
      };
    })
    .filter((warning) => warning.projected_der_mw > warning.limit_mw);
}

function build8760Profiles(
  aggregated: AggregatedIntervalPoint[],
  summary: UtilityDataSummary,
  scenarioMatrix: UtilityScenarioMatrix,
  highlightedYears: number[],
  scenario: UtilityPlanningScenario,
): Utility8760Profile[] {
  const profileHours = 8760;
  const baseSeries = buildBaseHourlyShape(aggregated, summary);
  const cases: UtilityForecastCase[] = [scenarioMatrix.low, scenarioMatrix.base, scenarioMatrix.high];

  return cases.flatMap((forecastCase) =>
    highlightedYears.map((horizonYear) => {
      const year = forecastCase.yearly.find((entry) => entry.year === horizonYear);
      const baselinePeak = Math.max(summary.baseline_peak_mw, 1);
      const scale = (year?.peak_demand_mw ?? baselinePeak) / baselinePeak;
      const pointLoadMw = (scenario.large_point_loads ?? []).reduce(
        (sum, item) => sum + item.mw * Math.max(0.25, item.load_factor_pct / 100),
        0,
      );
      const industrialOptOutMw = (scenario.industrial_opt_outs ?? []).reduce((sum, item) => sum + item.mw, 0);
      const points: Utility8760ProfilePoint[] = [];

      for (let hourIndex = 0; hourIndex < profileHours; hourIndex += 1) {
        const baseMw = baseSeries[hourIndex % baseSeries.length] * scale;
        const timestamp = new Date(Date.UTC(new Date().getUTCFullYear() + horizonYear, 0, 1, 0, 0, 0) + hourIndex * 3600_000).toISOString();
        const hour = new Date(timestamp).getUTCHours();
        const demandResponseMw = hour >= 16 && hour <= 20 ? scenario.demand_response_reduction_mw : 0;
        const derOffsetMw = hour >= 10 && hour <= 16 ? scenario.der_offset_mw * 0.72 : scenario.der_offset_mw * 0.08;
        const touShiftDeltaMw = (scenario.tou_shift_rules ?? []).reduce((sum, rule) => {
          const shiftMw = scenario.ev_growth_mw * (rule.shift_pct / 100);
          if (hour >= rule.from_hour_start && hour <= rule.from_hour_end) return sum - shiftMw / Math.max(1, rule.from_hour_end - rule.from_hour_start + 1);
          if (hour >= rule.to_hour_start && hour <= rule.to_hour_end) return sum + shiftMw / Math.max(1, rule.to_hour_end - rule.to_hour_start + 1);
          return sum;
        }, 0);
        const forecastMw = round(
          Math.max(0, baseMw + pointLoadMw - industrialOptOutMw - derOffsetMw - demandResponseMw + touShiftDeltaMw),
          3,
        );

        points.push({
          timestamp,
          forecast_mw: forecastMw,
          point_load_mw: round(pointLoadMw, 3),
          industrial_opt_out_mw: round(industrialOptOutMw, 3),
          der_offset_mw: round(derOffsetMw, 3),
          demand_response_mw: round(demandResponseMw, 3),
          tou_shift_delta_mw: round(touShiftDeltaMw, 3),
        });
      }

      return {
        case_label: forecastCase.label,
        horizon_year: horizonYear,
        points,
      };
    }),
  );
}

function buildBenchmarkMetrics(
  aggregated: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): ForecastMetrics {
  if (granularity === 'hourly' && aggregated.length >= 24 * 14) {
    const records: DemandRecord[] = aggregated.map((point) => ({
      datetime: point.timestamp,
      hour_ending: new Date(point.timestamp).getUTCHours(),
      total_demand_mw: point.demand_mw,
      hourly_demand_gwh: point.demand_mw / 1000,
      date: point.timestamp.slice(0, 10),
    }));
    const forecaster = new DemandForecaster();
    const backtestHours = Math.min(24 * 7, Math.max(24 * 3, Math.floor(records.length * 0.2)));
    return forecaster.backtest(records, backtestHours).metrics;
  }

  return buildSimpleSeriesMetrics(aggregated, granularity);
}

function buildBenchmarkMetricsWithFallback(
  aggregated: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): { metrics: ForecastMetrics; warnings: string[] } {
  try {
    return {
      metrics: buildBenchmarkMetrics(aggregated, granularity),
      warnings: [],
    };
  } catch (error) {
    const reason = error instanceof Error && error.message.trim()
      ? error.message.trim()
      : 'unknown benchmark failure';
    return {
      metrics: buildSimpleSeriesMetrics(aggregated, granularity),
      warnings: [`Benchmark backtest fallback applied: ${reason}.`],
    };
  }
}

function buildSimpleSeriesMetrics(
  aggregated: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): ForecastMetrics {
  const series = aggregated.map((point) => point.demand_mw);
  const seasonalPeriod = granularity === 'monthly' ? 12 : 24;
  const testSize = Math.min(
    granularity === 'monthly' ? 12 : 72,
    Math.max(granularity === 'monthly' ? 3 : 24, Math.floor(series.length * 0.25)),
  );

  if (series.length <= testSize + 2) {
    return zeroMetrics();
  }

  const train = aggregated.slice(0, aggregated.length - testSize);
  const test = aggregated.slice(aggregated.length - testSize);
  const trainValues = train.map((point) => point.demand_mw);

  const { slope, intercept } = linearRegression(trainValues.map((_, index) => index), trainValues);
  const seasonal = buildSeasonalProfile(train, granularity);
  const modelPredictions = test.map((point, index) => {
    const trend = intercept + slope * (train.length + index);
    return round(trend + lookupSeasonalComponent(point.timestamp, seasonal, granularity), 2);
  });
  const actuals = test.map((point) => point.demand_mw);
  const persistenceMetrics = calculatePersistenceBaseline(series, 1);
  const seasonalMetrics = calculateSeasonalNaiveBaseline(series, 1, seasonalPeriod);

  return computeMetrics(
    actuals,
    modelPredictions,
    persistenceMetrics,
    seasonalMetrics,
  );
}

function buildSeasonalProfile(
  rows: AggregatedIntervalPoint[],
  granularity: UtilityInputGranularity,
): number[] {
  const size = granularity === 'monthly' ? 12 : 24;
  const values = new Array<number>(size).fill(0);
  const counts = new Array<number>(size).fill(0);
  const mean = rows.reduce((sum, row) => sum + row.demand_mw, 0) / Math.max(rows.length, 1);

  rows.forEach((row) => {
    const dt = new Date(row.timestamp);
    const key = granularity === 'monthly' ? dt.getUTCMonth() : dt.getUTCHours();
    values[key] += row.demand_mw - mean;
    counts[key] += 1;
  });

  return values.map((value, index) => (counts[index] > 0 ? value / counts[index] : 0));
}

function lookupSeasonalComponent(
  timestamp: string,
  profile: number[],
  granularity: UtilityInputGranularity,
): number {
  const dt = new Date(timestamp);
  return granularity === 'monthly' ? profile[dt.getUTCMonth()] : profile[dt.getUTCHours()];
}

function detectGranularity(aggregated: AggregatedIntervalPoint[]): UtilityInputGranularity {
  if (aggregated.length < 3) return 'hourly';

  const deltasHours: number[] = [];
  for (let index = 1; index < aggregated.length; index += 1) {
    const hours = (new Date(aggregated[index].timestamp).getTime() - new Date(aggregated[index - 1].timestamp).getTime()) / 3600_000;
    if (hours > 0) deltasHours.push(hours);
  }

  if (deltasHours.length === 0) return 'hourly';
  const median = deltasHours.sort((left, right) => left - right)[Math.floor(deltasHours.length / 2)];
  return median >= 24 * 20 ? 'monthly' : 'hourly';
}

function generateMonthlySampleRows(jurisdiction: UtilityJurisdiction): UtilityHistoricalLoadRow[] {
  const rows: UtilityHistoricalLoadRow[] = [];
  const feeders = jurisdiction === 'Ontario'
    ? [
        { geography_id: 'ON-SUB-1', customer_class: 'residential', share: 0.4, customerCount: 5200 },
        { geography_id: 'ON-SUB-2', customer_class: 'commercial', share: 0.35, customerCount: 1800 },
        { geography_id: 'ON-SUB-3', customer_class: 'industrial', share: 0.25, customerCount: 230 },
      ]
    : [
        { geography_id: 'AB-SUB-1', customer_class: 'residential', share: 0.36, customerCount: 4700 },
        { geography_id: 'AB-SUB-2', customer_class: 'commercial', share: 0.28, customerCount: 1650 },
        { geography_id: 'AB-SUB-3', customer_class: 'industrial', share: 0.36, customerCount: 195 },
      ];
  const start = Date.UTC(2024, 0, 1, 0, 0, 0);
  const baseDemand = jurisdiction === 'Ontario' ? 79 : 71;

  for (let monthIndex = 0; monthIndex < 24; monthIndex += 1) {
    const timestamp = new Date(Date.UTC(2024 + Math.floor(monthIndex / 12), monthIndex % 12, 1)).toISOString();
    const seasonal = 1 + Math.sin(((monthIndex % 12) / 12) * Math.PI * 2) * 0.07;
    const trend = 1 + monthIndex * 0.006;

    for (const feeder of feeders) {
      rows.push({
        timestamp,
        geography_level: 'substation',
        geography_id: feeder.geography_id,
        customer_class: feeder.customer_class,
        demand_mw: round(baseDemand * seasonal * trend * feeder.share, 3),
        weather_zone: jurisdiction === 'Ontario' ? 'south' : 'central',
        temperature_c: null,
        net_load_mw: null,
        gross_load_mw: null,
        customer_count: feeder.customerCount,
        source_system: 'starter_dataset',
        substation_id: feeder.geography_id,
        quality_flags: [],
      });
    }
  }

  return rows;
}

function computeMetrics(
  actuals: number[],
  predictions: number[],
  persistence: { mae: number; mape: number; rmse: number },
  seasonal: { mae: number; mape: number; rmse: number },
): ForecastMetrics {
  if (actuals.length === 0 || predictions.length === 0) {
    return zeroMetrics();
  }

  const mae = meanAbsoluteError(actuals, predictions);
  const mape = meanAbsolutePercentageError(actuals, predictions);
  const rmse = rootMeanSquaredError(actuals, predictions);
  const meanActual = actuals.reduce((sum, value) => sum + value, 0) / actuals.length;
  const ssRes = actuals.reduce((sum, actual, index) => sum + (actual - predictions[index]) ** 2, 0);
  const ssTot = actuals.reduce((sum, actual) => sum + (actual - meanActual) ** 2, 0);

  return {
    mae: round(mae, 2),
    mape: round(mape, 2),
    rmse: round(rmse, 2),
    persistence_mae: round(persistence.mae, 2),
    persistence_mape: round(persistence.mape, 2),
    persistence_rmse: round(persistence.rmse, 2),
    seasonal_naive_mae: round(seasonal.mae, 2),
    seasonal_naive_mape: round(seasonal.mape, 2),
    seasonal_naive_rmse: round(seasonal.rmse, 2),
    skill_score_vs_persistence: persistence.mae > 0 ? round((1 - mae / persistence.mae) * 100, 2) : 0,
    skill_score_vs_seasonal: seasonal.mae > 0 ? round((1 - mae / seasonal.mae) * 100, 2) : 0,
    r_squared: ssTot > 0 ? round(1 - ssRes / ssTot, 2) : 0,
    sample_size: actuals.length,
  };
}

function zeroMetrics(): ForecastMetrics {
  return {
    mae: 0,
    mape: 0,
    rmse: 0,
    persistence_mae: 0,
    persistence_mape: 0,
    persistence_rmse: 0,
    seasonal_naive_mae: 0,
    seasonal_naive_mape: 0,
    seasonal_naive_rmse: 0,
    skill_score_vs_persistence: 0,
    skill_score_vs_seasonal: 0,
    r_squared: 0,
    sample_size: 0,
  };
}

function meanAbsoluteError(actuals: number[], predictions: number[]): number {
  return actuals.reduce((sum, actual, index) => sum + Math.abs(actual - predictions[index]), 0) / actuals.length;
}

function meanAbsolutePercentageError(actuals: number[], predictions: number[]): number {
  return (
    actuals.reduce((sum, actual, index) => {
      if (actual === 0) return sum;
      return sum + Math.abs((actual - predictions[index]) / actual);
    }, 0) / actuals.length
  ) * 100;
}

function rootMeanSquaredError(actuals: number[], predictions: number[]): number {
  return Math.sqrt(
    actuals.reduce((sum, actual, index) => sum + (actual - predictions[index]) ** 2, 0) / actuals.length,
  );
}

function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  if (x.length === 0 || y.length === 0 || x.length !== y.length) {
    return { slope: 0, intercept: 0 };
  }

  const count = x.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let index = 0; index < count; index += 1) {
    sumX += x[index];
    sumY += y[index];
    sumXY += x[index] * y[index];
    sumXX += x[index] * x[index];
  }

  const denominator = count * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    return { slope: 0, intercept: sumY / count };
  }

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;
  return { slope, intercept };
}

function buildSampleTemperature(
  jurisdiction: UtilityJurisdiction,
  month: number,
  hourIndex: number,
): number {
  const seasonalBase = jurisdiction === 'Ontario'
    ? [-6, -4, 1, 8, 15, 20, 24, 23, 18, 11, 4, -2][month] ?? 10
    : [-8, -6, 0, 7, 13, 18, 22, 21, 16, 9, 1, -5][month] ?? 9;
  const synopticWave = Math.sin(hourIndex / 36) * 3.2;
  const dailyWave = Math.sin((hourIndex % 24) / 24 * Math.PI * 2) * 4.5;
  return seasonalBase + synopticWave + dailyWave;
}

function uniqueSortedYears(years: number[]): number[] {
  return Array.from(new Set(years.filter((year) => year > 0))).sort((left, right) => left - right);
}

function sortRows(rows: UtilityHistoricalLoadRow[]): UtilityHistoricalLoadRow[] {
  return [...rows].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function readColumn(columns: string[], index: number): string {
  if (index < 0 || index >= columns.length) return '';
  return columns[index]?.trim() ?? '';
}

function parseNumeric(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseOptionalNumeric(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGeographyLevel(value: string, geographyId: string): UtilityGeographyLevel {
  const normalized = normalizeHeader(value);
  if (normalized === 'system') return 'system';
  if (normalized === 'substation') return 'substation';
  if (normalized === 'feeder') return 'feeder';
  if (geographyId.toLowerCase().includes('sub')) return 'substation';
  if (geographyId.toLowerCase().includes('feed')) return 'feeder';
  return 'system';
}

function splitCsvLine(line: string): string[] {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      columns.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  columns.push(current);
  return columns;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function averageOptional(
  left: number | null | undefined,
  right: number | null | undefined,
  priorCount: number,
  nextCount: number,
): number | null {
  const leftValue = Number.isFinite(left ?? Number.NaN) ? Number(left) : null;
  const rightValue = Number.isFinite(right ?? Number.NaN) ? Number(right) : null;
  if (leftValue === null && rightValue === null) return null;
  if (leftValue === null) return rightValue;
  if (rightValue === null) return leftValue;
  return round((leftValue * priorCount + rightValue) / nextCount, 3);
}

function stressModeAdder(mode: UtilityStressTestMode): number {
  switch (mode) {
    case 'polar_vortex':
      return 0.035;
    case 'heat_wave':
      return 0.02;
    case 'ice_storm':
      return 0.025;
    default:
      return 0;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
