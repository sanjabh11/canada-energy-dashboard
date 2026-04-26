import { calculatePersistenceBaseline, calculateSeasonalNaiveBaseline } from './forecastBaselines';
import { DemandForecaster, type DemandRecord, type ForecastMetrics } from './demandForecaster';
import { createProvenance, type ProvenanceMetadata } from './types/provenance';
import type { OEB_DSP_LoadForecast_Row } from './regulatoryTemplates';

export type UtilityJurisdiction = 'Ontario' | 'Alberta';
export type UtilityInputGranularity = 'hourly' | 'monthly';
export type UtilityWeatherCase = 'median' | 'extreme';
export type UtilityGeographyLevel = 'system' | 'substation' | 'feeder';

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

export interface UtilityGeographyAllocation {
  horizon_year: number;
  geography_id: string;
  geography_level: UtilityGeographyLevel;
  customer_class: string;
  share_pct: number;
  peak_demand_mw: number;
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
  highlighted_years: number[];
  geography_allocations: UtilityGeographyAllocation[];
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
};

const DEFAULT_PLANNING_YEARS = [1, 5, 10];

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

    rows.push({
      timestamp: new Date(timestamp).toISOString(),
      geography_level: geographyLevel,
      geography_id: geographyId,
      customer_class: customerClass,
      demand_mw: demandMw,
      weather_zone: readColumn(columns, columnIndexes.weather_zone) || undefined,
      temperature_c: parseOptionalNumeric(readColumn(columns, columnIndexes.temperature_c)),
      net_load_mw: parseOptionalNumeric(readColumn(columns, columnIndexes.net_load_mw)),
      gross_load_mw: parseOptionalNumeric(readColumn(columns, columnIndexes.gross_load_mw)),
      customer_count: parseOptionalNumeric(readColumn(columns, columnIndexes.customer_count)),
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
}): UtilityForecastPackage {
  const rows = sortRows(params.rows);
  const highlightedYears = uniqueSortedYears(params.scenario.planning_horizon_years ?? DEFAULT_PLANNING_YEARS);
  const summary = summarizeRows(rows);
  const aggregated = aggregateIntervals(rows);
  const benchmark = buildBenchmarkMetrics(aggregated, summary.granularity);
  const weatherFactor = estimateWeatherFactor(aggregated, params.scenario.weather_case);
  const maxYear = Math.max(...highlightedYears, 10);
  const capacityMw = round(summary.baseline_peak_mw * (1 + params.scenario.capacity_buffer_pct / 100), 2);

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

  const geographyAllocations = reconcileGeographyAllocations(rows, expectedCase, highlightedYears);
  const oebRows = buildOebRows(params.scenario.jurisdiction, expectedCase, capacityMw);
  const warnings: string[] = [];

  if (summary.granularity === 'monthly') {
    warnings.push('Monthly input runs on a planning-timescale model; hourly operational detail is not inferred.');
  }
  if (summary.interval_count < 12) {
    warnings.push('Forecast confidence is limited because fewer than 12 intervals are available.');
  }
  if (params.isSampleData) {
    warnings.push('Starter data is illustrative and should be replaced with utility history for production use.');
  }

  const assumptions = [
    `${params.scenario.jurisdiction} utility planning lane uses a transparent statistical forecast, not an AI-only model.`,
    `${params.scenario.weather_case === 'extreme' ? 'Extreme' : 'Median'} weather case applies a ${(weatherFactor * 100).toFixed(1)}% peak multiplier based on observed temperature sensitivity.`,
    `Expected case assumes ${params.scenario.annual_load_growth_pct.toFixed(2)}% annual load growth plus explicit overlays for committed load, EVs, heat pumps, DER offsets, and demand response.`,
    `Geography allocations are reconciled to the top-line forecast using recent interval shares across ${summary.geography_count} ${summary.geography_count === 1 ? 'geography' : 'geographies'}.`,
    `Benchmark proof is derived from a holdout backtest against persistence and seasonal-naive baselines.`,
  ];

  const provenance = createProvenance(
    params.isSampleData ? 'mock' : 'historical_archive',
    params.sourceLabel,
    params.isSampleData ? 0.58 : 0.87,
    {
      completeness: 1,
      notes: params.isSampleData
        ? 'Utility planning starter dataset loaded locally for workflow validation.'
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
    highlighted_years: highlightedYears,
    geography_allocations: geographyAllocations,
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

  lines.push('', 'assumption');
  forecastPackage.assumptions.forEach((assumption) => {
    lines.push(`"${assumption.replace(/"/g, '""')}"`);
  });

  return lines.join('\n');
}

export function utilityForecastPackageToAlbertaCsv(forecastPackage: UtilityForecastPackage): string {
  const lines = [
    '# Alberta Utility Planning Summary',
    `# Generated: ${forecastPackage.generated_at}`,
    `# Source: ${forecastPackage.source_label}`,
    '',
    'horizon,expected_peak_mw,expected_energy_gwh,expected_utilization_pct,weather_case,committed_load_mw,ev_growth_mw,heat_pump_growth_mw,der_offset_mw,demand_response_reduction_mw',
  ];

  for (const year of forecastPackage.highlighted_years) {
    const expected = forecastPackage.cases.expected.yearly.find((row) => row.year === year);
    if (!expected) continue;
    lines.push([
      `${year}y`,
      expected.peak_demand_mw,
      expected.annual_energy_gwh,
      expected.utilization_pct,
      forecastPackage.scenario.weather_case,
      forecastPackage.scenario.committed_load_mw,
      forecastPackage.scenario.ev_growth_mw,
      forecastPackage.scenario.heat_pump_growth_mw,
      forecastPackage.scenario.der_offset_mw,
      forecastPackage.scenario.demand_response_reduction_mw,
    ].join(','));
  }

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

function reconcileGeographyAllocations(
  rows: UtilityHistoricalLoadRow[],
  expectedCase: UtilityForecastCase,
  highlightedYears: number[],
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

    let allocatedMw = 0;
    const entries = Array.from(shares.entries());
    entries.forEach(([key, value], index) => {
      const share = value.peak / totalPeak;
      const exactMw = target.peak_demand_mw * share;
      const peakMw = index === entries.length - 1
        ? round(target.peak_demand_mw - allocatedMw, 3)
        : round(exactMw, 3);

      allocatedMw += peakMw;
      const [, geographyId, customerClass] = key.split('|');
      allocations.push({
        horizon_year: horizonYear,
        geography_id: geographyId,
        geography_level: value.geography_level,
        customer_class: customerClass,
        share_pct: round(share * 100, 2),
        peak_demand_mw: peakMw,
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
  const additiveMwPerYear = (
    params.scenario.committed_load_mw
    + params.scenario.ev_growth_mw
    + params.scenario.heat_pump_growth_mw
    - params.scenario.der_offset_mw
    - params.scenario.demand_response_reduction_mw
  ) / Math.max(params.maxYear, 1);
  const customerGrowthFactor = 1 + params.annualGrowthPct * 0.004;
  const drShiftAdjustment = 1 - params.scenario.demand_response_shift_pct / 400;

  const yearly: UtilityForecastYear[] = [];
  for (let year = 1; year <= params.maxYear; year += 1) {
    const growthMultiplier = Math.pow(1 + params.annualGrowthPct / 100, year);
    const additiveMw = additiveMwPerYear * year;
    const peakDemand = round(
      params.summary.baseline_peak_mw * growthMultiplier * params.weatherFactor * drShiftAdjustment + additiveMw,
      2,
    );
    const annualEnergy = round(
      params.summary.baseline_energy_gwh * Math.pow(1 + params.annualGrowthPct / 100, year)
        + additiveMw * 8.76 * 0.44,
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
): number {
  if (weatherCase === 'median') return 1;

  const withTemperature = aggregated.filter((point) => Number.isFinite(point.temperature_c ?? Number.NaN));
  if (withTemperature.length < 24) return 1.04;

  const meanDemand = withTemperature.reduce((sum, point) => sum + point.demand_mw, 0) / withTemperature.length;
  const weatherDriven = withTemperature.reduce((sum, point) => {
    const delta = Math.abs((point.temperature_c ?? 18) - 18);
    return sum + delta * point.demand_mw;
  }, 0) / withTemperature.length;

  const normalizedStress = meanDemand > 0 ? weatherDriven / meanDemand : 0.04;
  return round(1 + Math.min(0.09, normalizedStress * 0.0035), 4);
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
    };

    existing.demand_mw += row.demand_mw;
    existing.customer_count += Number(row.customer_count ?? 0);
    if (existing.temperature_c === null && Number.isFinite(row.temperature_c ?? Number.NaN)) {
      existing.temperature_c = row.temperature_c ?? null;
    }

    points.set(key, existing);
  }

  return Array.from(points.values()).sort((left, right) =>
    new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
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
