/**
 * Data Contracts for Energy Forecasting Pipelines
 *
 * Defines versioned, typed contracts for all data sources used in the
 * forecasting pipeline. Each contract specifies schema, units, timezone,
 * update frequency, latency, and revision policy.
 *
 * References:
 *   - ChatGPT deep research: data governance gaps
 *   - CER data revision policies
 *   - IESO market data documentation
 */

export type DataSourceId =
  | 'ieso_demand'
  | 'ieso_price'
  | 'ieso_generation'
  | 'aeso_pool_price'
  | 'aeso_demand'
  | 'eccc_hrdps'
  | 'eccc_rdps'
  | 'environment_canada'
  | 'aeco_gas_price'
  | 'henry_hub_gas_price'
  | 'nerc_gads'
  | 'supabase_telemetry';

export type DataFreshness = 'realtime' | 'near_realtime' | 'hourly' | 'daily' | 'monthly';

export type Timezone = 'UTC' | 'America/Toronto' | 'America/Edmonton' | 'America/Vancouver' | 'America/Halifax';

export interface DataFieldSchema {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'timestamp' | 'json';
  unit?: string;
  nullable: boolean;
  description: string;
  min?: number;
  max?: number;
  precision?: number;
}

export interface DataContract {
  id: DataSourceId;
  version: string;
  name: string;
  description: string;
  sourceUrl?: string;
  provider: string;
  freshness: DataFreshness;
  updateFrequencyHours: number;
  expectedLatencyMinutes: number;
  timezone: Timezone;
  revisionPolicy: 'no_revisions' | 'append_only' | 'revisions_allowed' | 'frozen_after_24h';
  schema: DataFieldSchema[];
  qualityChecks: DataQualityCheck[];
  provenance: {
    originalSource: string;
    transformationApplied: string[];
    license?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DataQualityCheck {
  name: string;
  type: 'range' | 'completeness' | 'timeliness' | 'consistency' | 'uniqueness' | 'imputation' | 'outlier_detection';
  rule: string;
  severity: 'error' | 'warning' | 'info';
  threshold?: number;
}

export interface DataContractViolation {
  contractId: DataSourceId;
  checkName: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: string;
  value?: unknown;
  expectedValue?: unknown;
  message: string;
}

// ============================================================================
// PREDEFINED DATA CONTRACTS
// ============================================================================

export const DATA_CONTRACTS: Record<DataSourceId, DataContract> = {
  ieso_demand: {
    id: 'ieso_demand',
    version: '2.0.0',
    name: 'IESO Ontario Hourly Demand',
    description: 'Hourly electricity demand for Ontario from IESO (Independent Electricity System Operator).',
    sourceUrl: 'https://reports.ieso.ca/public/Demand/',
    provider: 'IESO',
    freshness: 'hourly',
    updateFrequencyHours: 1,
    expectedLatencyMinutes: 15,
    timezone: 'America/Toronto',
    revisionPolicy: 'frozen_after_24h',
    schema: [
      { name: 'datetime', type: 'timestamp', nullable: false, description: 'Hour-ending timestamp in EST/EDT' },
      { name: 'hour_ending', type: 'number', nullable: false, description: 'Hour of day (1-24)', min: 1, max: 24 },
      { name: 'total_demand_mw', type: 'number', nullable: false, unit: 'MW', description: 'Total Ontario demand', min: 0, precision: 1 },
      { name: 'hourly_demand_gwh', type: 'number', nullable: false, unit: 'GWh', description: 'Energy consumed in the hour', min: 0, precision: 4 },
      { name: 'date', type: 'string', nullable: false, description: 'Date in YYYY-MM-DD format' },
    ],
    qualityChecks: [
      { name: 'demand_positive', type: 'range', rule: 'total_demand_mw > 0', severity: 'error' },
      { name: 'demand_range', type: 'range', rule: '8000 <= total_demand_mw <= 30000', severity: 'warning' },
      { name: 'no_gaps', type: 'completeness', rule: 'consecutive_hours_without_gap <= 0', severity: 'error' },
      { name: 'timely_arrival', type: 'timeliness', rule: 'arrival_delay_minutes <= 30', severity: 'warning', threshold: 30 },
    ],
    provenance: {
      originalSource: 'IESO Public Reports',
      transformationApplied: ['timezone_normalization', 'hour_ending_extraction'],
      license: 'Open Data — IESO',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },

  ieso_price: {
    id: 'ieso_price',
    version: '2.0.0',
    name: 'IESO Hourly Ontario Energy Price (HOEP)',
    description: 'Hourly wholesale electricity price for Ontario.',
    sourceUrl: 'https://reports.ieso.ca/public/Prices/',
    provider: 'IESO',
    freshness: 'hourly',
    updateFrequencyHours: 1,
    expectedLatencyMinutes: 15,
    timezone: 'America/Toronto',
    revisionPolicy: 'frozen_after_24h',
    schema: [
      { name: 'datetime', type: 'timestamp', nullable: false, description: 'Hour-ending timestamp' },
      { name: 'hoep_cad_per_mwh', type: 'number', nullable: false, unit: 'CAD/MWh', description: 'Hourly Ontario Energy Price', min: 0, precision: 2 },
      { name: 'date', type: 'string', nullable: false, description: 'Date in YYYY-MM-DD format' },
    ],
    qualityChecks: [
      { name: 'price_positive', type: 'range', rule: 'hoep_cad_per_mwh >= 0', severity: 'error' },
      { name: 'price_range', type: 'range', rule: '0 <= hoep_cad_per_mwh <= 2000', severity: 'warning' },
    ],
    provenance: {
      originalSource: 'IESO Public Reports',
      transformationApplied: ['timezone_normalization'],
      license: 'Open Data — IESO',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },

  eccc_hrdps: {
    id: 'eccc_hrdps',
    version: '7.1.0',
    name: 'ECCC HRDPS 2.5km NWP',
    description: 'High Resolution Deterministic Prediction System — 2.5km grid, 48h horizon, hourly.',
    sourceUrl: 'https://eccc-msc.github.io/open-data/msc-data/nwp_hrdps/readme_hrdps_en/',
    provider: 'ECCC (Environment and Climate Change Canada)',
    freshness: 'hourly',
    updateFrequencyHours: 1,
    expectedLatencyMinutes: 90,
    timezone: 'UTC',
    revisionPolicy: 'no_revisions',
    schema: [
      { name: 'timestamp', type: 'timestamp', nullable: false, description: 'Forecast valid time (UTC)' },
      { name: 'latitude', type: 'number', nullable: false, unit: 'deg', description: 'Grid point latitude', precision: 4 },
      { name: 'longitude', type: 'number', nullable: false, unit: 'deg', description: 'Grid point longitude', precision: 4 },
      { name: 'temperature_c', type: 'number', nullable: false, unit: '°C', description: '2m air temperature', precision: 1 },
      { name: 'wind_speed_ms', type: 'number', nullable: false, unit: 'm/s', description: '10m wind speed', min: 0, precision: 1 },
      { name: 'wind_direction_deg', type: 'number', nullable: false, unit: 'deg', description: '10m wind direction', min: 0, max: 360, precision: 0 },
      { name: 'precipitation_mm', type: 'number', nullable: false, unit: 'mm', description: 'Accumulated precipitation', min: 0, precision: 1 },
      { name: 'cloud_cover_pct', type: 'number', nullable: false, unit: '%', description: 'Total cloud cover', min: 0, max: 100, precision: 0 },
      { name: 'solar_radiation_wm2', type: 'number', nullable: false, unit: 'W/m²', description: 'Global horizontal irradiance', min: 0, precision: 0 },
    ],
    qualityChecks: [
      { name: 'temp_range', type: 'range', rule: '-60 <= temperature_c <= 50', severity: 'error' },
      { name: 'wind_range', type: 'range', rule: '0 <= wind_speed_ms <= 60', severity: 'error' },
      { name: 'cloud_range', type: 'range', rule: '0 <= cloud_cover_pct <= 100', severity: 'error' },
      { name: 'forecast_horizon', type: 'consistency', rule: 'horizon_hours <= 48', severity: 'warning' },
    ],
    provenance: {
      originalSource: 'ECCC MSC Datamart / Open-Meteo GEM API',
      transformationApplied: ['grid_interpolation', 'unit_normalization'],
      license: 'Open Government License — Canada',
    },
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },

  aeso_pool_price: {
    id: 'aeso_pool_price',
    version: '1.0.0',
    name: 'AESO Alberta Pool Price',
    description: 'Hourly Alberta pool price for wholesale electricity.',
    sourceUrl: 'https://www.aeso.ca/market/market-and-system-reporting-data/',
    provider: 'AESO',
    freshness: 'hourly',
    updateFrequencyHours: 1,
    expectedLatencyMinutes: 20,
    timezone: 'America/Edmonton',
    revisionPolicy: 'frozen_after_24h',
    schema: [
      { name: 'datetime', type: 'timestamp', nullable: false, description: 'Hour-ending timestamp (MST/MDT)' },
      { name: 'pool_price_cad_per_mwh', type: 'number', nullable: false, unit: 'CAD/MWh', description: 'Alberta pool price', min: 0, precision: 2 },
    ],
    qualityChecks: [
      { name: 'price_positive', type: 'range', rule: 'pool_price_cad_per_mwh >= 0', severity: 'error' },
      { name: 'price_range', type: 'range', rule: '0 <= pool_price_cad_per_mwh <= 3000', severity: 'warning' },
    ],
    provenance: {
      originalSource: 'AESO Market Reporting',
      transformationApplied: ['timezone_normalization'],
      license: 'Open Data — AESO',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },

  aeco_gas_price: {
    id: 'aeco_gas_price',
    version: '1.0.0',
    name: 'AECO Daily Natural Gas Price',
    description: 'Daily AECO-C/NIT natural gas spot price in CAD/GJ.',
    provider: 'NGI / AECO',
    freshness: 'daily',
    updateFrequencyHours: 24,
    expectedLatencyMinutes: 120,
    timezone: 'America/Edmonton',
    revisionPolicy: 'revisions_allowed',
    schema: [
      { name: 'date', type: 'string', nullable: false, description: 'Trading date YYYY-MM-DD' },
      { name: 'price_cad_per_gj', type: 'number', nullable: false, unit: 'CAD/GJ', description: 'AECO daily spot price', min: 0, precision: 4 },
    ],
    qualityChecks: [
      { name: 'price_positive', type: 'range', rule: 'price_cad_per_gj > 0', severity: 'error' },
      { name: 'price_range', type: 'range', rule: '0.5 <= price_cad_per_gj <= 20', severity: 'warning' },
    ],
    provenance: {
      originalSource: 'Natural Gas Intelligence',
      transformationApplied: ['currency_conversion'],
      license: 'Subscription',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },

  ieso_generation: {
    id: 'ieso_generation',
    version: '1.0.0',
    name: 'IESO Generation by Fuel Type',
    description: 'Hourly generation output by fuel type for Ontario.',
    provider: 'IESO',
    freshness: 'hourly',
    updateFrequencyHours: 1,
    expectedLatencyMinutes: 20,
    timezone: 'America/Toronto',
    revisionPolicy: 'frozen_after_24h',
    schema: [
      { name: 'datetime', type: 'timestamp', nullable: false, description: 'Hour-ending timestamp' },
      { name: 'fuel_type', type: 'string', nullable: false, description: 'Fuel type (nuclear, hydro, gas, wind, solar, biofuel)' },
      { name: 'output_mw', type: 'number', nullable: false, unit: 'MW', description: 'Generation output', min: 0, precision: 1 },
    ],
    qualityChecks: [
      { name: 'output_positive', type: 'range', rule: 'output_mw >= 0', severity: 'error' },
      { name: 'fuel_type_valid', type: 'consistency', rule: 'fuel_type IN (nuclear, hydro, gas, wind, solar, biofuel)', severity: 'error' },
    ],
    provenance: {
      originalSource: 'IESO Public Reports',
      transformationApplied: ['fuel_type_normalization'],
      license: 'Open Data — IESO',
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },

  // Stubs for remaining sources
  eccc_rdps: {
    id: 'eccc_rdps',
    version: '7.0.0',
    name: 'ECCC RDPS 10km NWP',
    description: 'Regional Deterministic Prediction System — 10km grid, 48h horizon.',
    provider: 'ECCC',
    freshness: 'hourly',
    updateFrequencyHours: 1,
    expectedLatencyMinutes: 120,
    timezone: 'UTC',
    revisionPolicy: 'no_revisions',
    schema: [
      { name: 'timestamp', type: 'timestamp', nullable: false, description: 'Forecast valid time (UTC)' },
      { name: 'temperature_c', type: 'number', nullable: false, unit: '°C', description: '2m air temperature', precision: 1 },
      { name: 'wind_speed_ms', type: 'number', nullable: false, unit: 'm/s', description: '10m wind speed', min: 0, precision: 1 },
    ],
    qualityChecks: [
      { name: 'temp_range', type: 'range', rule: '-60 <= temperature_c <= 50', severity: 'error' },
    ],
    provenance: { originalSource: 'ECCC MSC Datamart', transformationApplied: ['grid_interpolation'], license: 'OGL Canada' },
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  environment_canada: {
    id: 'environment_canada',
    version: '1.0.0',
    name: 'Environment Canada Current Weather',
    description: 'Current weather observations from Environment Canada stations.',
    provider: 'ECCC',
    freshness: 'hourly',
    updateFrequencyHours: 1,
    expectedLatencyMinutes: 60,
    timezone: 'UTC',
    revisionPolicy: 'no_revisions',
    schema: [
      { name: 'temperature_c', type: 'number', nullable: true, unit: '°C', description: 'Current temperature', precision: 1 },
      { name: 'humidity_pct', type: 'number', nullable: true, unit: '%', description: 'Relative humidity', min: 0, max: 100, precision: 0 },
    ],
    qualityChecks: [{ name: 'temp_range', type: 'range', rule: '-60 <= temperature_c <= 50', severity: 'error' }],
    provenance: { originalSource: 'ECCC Weather Office', transformationApplied: [], license: 'OGL Canada' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  aeso_demand: {
    id: 'aeso_demand',
    version: '1.0.0',
    name: 'AESO Alberta Hourly Demand',
    description: 'Hourly electricity demand for Alberta.',
    provider: 'AESO',
    freshness: 'hourly',
    updateFrequencyHours: 1,
    expectedLatencyMinutes: 20,
    timezone: 'America/Edmonton',
    revisionPolicy: 'frozen_after_24h',
    schema: [
      { name: 'datetime', type: 'timestamp', nullable: false, description: 'Hour-ending timestamp' },
      { name: 'total_demand_mw', type: 'number', nullable: false, unit: 'MW', description: 'Total Alberta demand', min: 0, precision: 1 },
    ],
    qualityChecks: [{ name: 'demand_positive', type: 'range', rule: 'total_demand_mw > 0', severity: 'error' }],
    provenance: { originalSource: 'AESO Market Reporting', transformationApplied: ['timezone_normalization'], license: 'Open Data — AESO' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  henry_hub_gas_price: {
    id: 'henry_hub_gas_price',
    version: '1.0.0',
    name: 'Henry Hub Daily Natural Gas Price',
    description: 'Daily Henry Hub natural gas spot price in USD/MMBtu.',
    provider: 'EIA / NYMEX',
    freshness: 'daily',
    updateFrequencyHours: 24,
    expectedLatencyMinutes: 120,
    timezone: 'UTC',
    revisionPolicy: 'revisions_allowed',
    schema: [
      { name: 'date', type: 'string', nullable: false, description: 'Trading date YYYY-MM-DD' },
      { name: 'price_usd_per_mmbtu', type: 'number', nullable: false, unit: 'USD/MMBtu', description: 'Henry Hub spot price', min: 0, precision: 4 },
    ],
    qualityChecks: [{ name: 'price_positive', type: 'range', rule: 'price_usd_per_mmbtu > 0', severity: 'error' }],
    provenance: { originalSource: 'EIA Natural Gas', transformationApplied: ['currency_conversion'], license: 'Open Data — EIA' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  nerc_gads: {
    id: 'nerc_gads',
    version: '1.0.0',
    name: 'NERC GADS Generator Availability Data',
    description: 'Generator availability and outage data from NERC GADS reporting.',
    provider: 'NERC',
    freshness: 'monthly',
    updateFrequencyHours: 720,
    expectedLatencyMinutes: 43200,
    timezone: 'UTC',
    revisionPolicy: 'revisions_allowed',
    schema: [
      { name: 'unit_id', type: 'string', nullable: false, description: 'Generator unit identifier' },
      { name: 'availability_pct', type: 'number', nullable: false, unit: '%', description: 'Unit availability percentage', min: 0, max: 100, precision: 2 },
    ],
    qualityChecks: [{ name: 'availability_range', type: 'range', rule: '0 <= availability_pct <= 100', severity: 'error' }],
    provenance: { originalSource: 'NERC GADS', transformationApplied: [], license: 'NERC License' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  supabase_telemetry: {
    id: 'supabase_telemetry',
    version: '1.0.0',
    name: 'Utility Telemetry (Supabase)',
    description: 'Real-time utility telemetry data ingested via Supabase edge functions.',
    provider: 'Utility Connectors',
    freshness: 'near_realtime',
    updateFrequencyHours: 0.25,
    expectedLatencyMinutes: 5,
    timezone: 'UTC',
    revisionPolicy: 'append_only',
    schema: [
      { name: 'meter_id', type: 'string', nullable: false, description: 'Smart meter identifier' },
      { name: 'consumption_kwh', type: 'number', nullable: false, unit: 'kWh', description: 'Energy consumption', min: 0, precision: 3 },
      { name: 'timestamp', type: 'timestamp', nullable: false, description: 'Reading timestamp (UTC)' },
    ],
    qualityChecks: [
      { name: 'consumption_positive', type: 'range', rule: 'consumption_kwh >= 0', severity: 'error' },
      { name: 'no_duplicates', type: 'uniqueness', rule: 'unique(meter_id, timestamp)', severity: 'error' },
    ],
    provenance: { originalSource: 'Utility API', transformationApplied: ['unit_normalization'], license: 'Internal' },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
};

/**
 * Validate a data record against its contract.
 */
export function validateRecord(
  contractId: DataSourceId,
  record: Record<string, unknown>,
): DataContractViolation[] {
  const contract = DATA_CONTRACTS[contractId];
  if (!contract) return [];

  const violations: DataContractViolation[] = [];
  const now = new Date().toISOString();

  for (const field of contract.schema) {
    const value = record[field.name];

    // Null check
    if (!field.nullable && (value === null || value === undefined)) {
      violations.push({
        contractId,
        checkName: `${field.name}_not_null`,
        severity: 'error',
        timestamp: now,
        value,
        message: `Field '${field.name}' is required but was null/undefined`,
      });
      continue;
    }

    if (value === null || value === undefined) continue;

    // Range checks for numbers
    if (field.type === 'number') {
      const numValue = Number(value);
      if (field.min !== undefined && numValue < field.min) {
        violations.push({
          contractId,
          checkName: `${field.name}_min`,
          severity: 'error',
          timestamp: now,
          value: numValue,
          expectedValue: `>= ${field.min}`,
          message: `Field '${field.name}' value ${numValue} is below minimum ${field.min}`,
        });
      }
      if (field.max !== undefined && numValue > field.max) {
        violations.push({
          contractId,
          checkName: `${field.name}_max`,
          severity: 'error',
          timestamp: now,
          value: numValue,
          expectedValue: `<= ${field.max}`,
          message: `Field '${field.name}' value ${numValue} exceeds maximum ${field.max}`,
        });
      }
    }
  }

  return violations;
}

/**
 * Get a data contract by ID.
 */
export function getContract(id: DataSourceId): DataContract | undefined {
  return DATA_CONTRACTS[id];
}

/**
 * List all available data contracts.
 */
export function listContracts(): DataContract[] {
  return Object.values(DATA_CONTRACTS);
}

// ============================================================================
// Data Quality: Hampel Filter + Imputation
// ============================================================================

export interface HampelFilterResult {
  values: number[];
  outlierIndices: number[];
  outlierOriginalValues: number[];
  outlierReplacedValues: number[];
  nOutliers: number;
  method: string;
}

export interface ImputationResult {
  values: number[];
  imputedIndices: number[];
  nImputed: number;
  method: string;
}

export interface ValidationWithImputationResult {
  violations: DataContractViolation[];
  imputedRecords: Record<string, unknown>[];
  hampelResults: Record<string, HampelFilterResult>;
  imputationResults: Record<string, ImputationResult>;
  totalOutliers: number;
  totalImputed: number;
  summary: string;
}

/**
 * Hampel filter: sliding-window median + MAD outlier detection.
 *
 * Replaces outliers with the window median. Standard in power systems
 * data cleaning (Gemini deep research: LRTC + Hampel + ARIMA pipeline).
 *
 * @param values Input time series
 * @param windowSize Half-window size (default 3 → 7-point window)
 * @param nSigmas Threshold in MAD units (default 3.0)
 */
export function hampelFilter(
  values: number[],
  windowSize: number = 3,
  nSigmas: number = 3.0,
): HampelFilterResult {
  const n = values.length;
  const result: number[] = [...values];
  const outlierIndices: number[] = [];
  const outlierOriginalValues: number[] = [];
  const outlierReplacedValues: number[] = [];

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - windowSize);
    const end = Math.min(n, i + windowSize + 1);
    const window = values.slice(start, end).filter((v) => Number.isFinite(v));

    if (window.length < 3) continue;

    // Median
    const sorted = [...window].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // MAD (Median Absolute Deviation)
    const deviations = window.map((v) => Math.abs(v - median));
    const sortedDevs = [...deviations].sort((a, b) => a - b);
    const mad = sortedDevs[Math.floor(sortedDevs.length / 2)];

    // MAD scale factor: 1.4826 for normal distribution consistency
    const scaledMad = mad * 1.4826;

    if (scaledMad < 1e-10) continue;

    const deviation = Math.abs(values[i] - median);
    if (deviation > nSigmas * scaledMad) {
      outlierIndices.push(i);
      outlierOriginalValues.push(values[i]);
      outlierReplacedValues.push(median);
      result[i] = median;
    }
  }

  return {
    values: result,
    outlierIndices,
    outlierOriginalValues,
    outlierReplacedValues,
    nOutliers: outlierIndices.length,
    method: `Hampel filter (window=${windowSize * 2 + 1}, n_sigmas=${nSigmas})`,
  };
}

/**
 * Impute missing values (null/NaN) in a time series.
 *
 * Methods:
 *   - 'linear': linear interpolation between nearest valid neighbors
 *   - 'forward': forward-fill from last valid value
 *   - 'seasonal': use value from same position in previous cycle
 *
 * @param values Array with null/NaN gaps
 * @param method Imputation method
 * @param seasonalPeriod Period for seasonal imputation (default 24 for hourly)
 */
export function imputeMissing(
  values: (number | null)[],
  method: 'linear' | 'forward' | 'seasonal' = 'linear',
  seasonalPeriod: number = 24,
): ImputationResult {
  const n = values.length;
  const result: number[] = [...values.map((v) => (v === null || !Number.isFinite(v as number) ? NaN : v as number))];
  const imputedIndices: number[] = [];

  for (let i = 0; i < n; i++) {
    if (Number.isFinite(result[i])) continue;

    let imputed: number | null = null;

    if (method === 'forward') {
      // Forward-fill
      for (let j = i - 1; j >= 0; j--) {
        if (Number.isFinite(result[j])) {
          imputed = result[j];
          break;
        }
      }
    } else if (method === 'seasonal') {
      // Seasonal: use value from same position in previous cycle
      if (i >= seasonalPeriod && Number.isFinite(result[i - seasonalPeriod])) {
        imputed = result[i - seasonalPeriod];
      }
    } else {
      // Linear interpolation
      let prevIdx = -1;
      let nextIdx = -1;
      for (let j = i - 1; j >= 0; j--) {
        if (Number.isFinite(result[j])) { prevIdx = j; break; }
      }
      for (let j = i + 1; j < n; j++) {
        if (Number.isFinite(result[j])) { nextIdx = j; break; }
      }

      if (prevIdx >= 0 && nextIdx >= 0) {
        const t = (i - prevIdx) / (nextIdx - prevIdx);
        imputed = result[prevIdx] + t * (result[nextIdx] - result[prevIdx]);
      } else if (prevIdx >= 0) {
        imputed = result[prevIdx]; // Extrapolate forward
      } else if (nextIdx >= 0) {
        imputed = result[nextIdx]; // Extrapolate backward
      }
    }

    if (imputed !== null && Number.isFinite(imputed)) {
      result[i] = imputed;
      imputedIndices.push(i);
    }
  }

  return {
    values: result,
    imputedIndices,
    nImputed: imputedIndices.length,
    method: `${method} imputation${method === 'seasonal' ? ` (period=${seasonalPeriod})` : ''}`,
  };
}

/**
 * Validate records and apply Hampel filter + imputation to numeric fields.
 *
 * Combines contract validation with data quality improvement:
 *   1. Run standard validation (range, completeness, etc.)
 *   2. For each numeric field, apply Hampel filter to detect outliers
 *   3. For each numeric field, impute missing values
 *   4. Return violations + cleaned records + quality metrics
 */
export function validateWithImputation(
  contractId: DataSourceId,
  records: Record<string, unknown>[],
  options?: {
    hampelWindow?: number;
    hampelSigmas?: number;
    imputationMethod?: 'linear' | 'forward' | 'seasonal';
    seasonalPeriod?: number;
  },
): ValidationWithImputationResult {
  const contract = DATA_CONTRACTS[contractId];
  const violations: DataContractViolation[] = [];
  const imputedRecords: Record<string, unknown>[] = [];
  const hampelResults: Record<string, HampelFilterResult> = {};
  const imputationResults: Record<string, ImputationResult> = {};
  let totalOutliers = 0;
  let totalImputed = 0;

  if (!contract) {
    return {
      violations: [{
        contractId,
        checkName: 'contract_not_found',
        severity: 'error',
        timestamp: new Date().toISOString(),
        message: `Data contract '${contractId}' not found`,
      }],
      imputedRecords: records,
      hampelResults: {},
      imputationResults: {},
      totalOutliers: 0,
      totalImputed: 0,
      summary: 'Contract not found; no imputation applied.',
    };
  }

  // Identify numeric fields from schema
  const numericFields = contract.schema
    .filter((f) => f.type === 'number')
    .map((f) => f.name);

  // Extract time series for each numeric field
  for (const field of numericFields) {
    const rawValues: (number | null)[] = records.map((r) => {
      const v = r[field];
      if (v === null || v === undefined) return null;
      const num = Number(v);
      return Number.isFinite(num) ? num : null;
    });

    // Apply imputation first (fill gaps)
    const impResult = imputeMissing(
      rawValues,
      options?.imputationMethod ?? 'linear',
      options?.seasonalPeriod ?? 24,
    );
    imputationResults[field] = impResult;
    totalImputed += impResult.nImputed;

    // Apply Hampel filter on imputed data (detect outliers)
    const hampelResult = hampelFilter(
      impResult.values,
      options?.hampelWindow ?? 3,
      options?.hampelSigmas ?? 3.0,
    );
    hampelResults[field] = hampelResult;
    totalOutliers += hampelResult.nOutliers;
  }

  // Build imputed records with cleaned values
  for (let i = 0; i < records.length; i++) {
    const cleaned: Record<string, unknown> = { ...records[i] };
    for (const field of numericFields) {
      if (hampelResults[field]) {
        cleaned[field] = hampelResults[field].values[i];
      }
    }
    imputedRecords.push(cleaned);
  }

  // Run standard validation on cleaned records
  for (let i = 0; i < imputedRecords.length; i++) {
    const recordViolations = validateRecord(contractId, imputedRecords[i]);
    violations.push(...recordViolations);
  }

  // Add summary violations for outliers/imputed
  if (totalOutliers > 0) {
    violations.push({
      contractId,
      checkName: 'hampel_outliers_detected',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      value: totalOutliers,
      message: `${totalOutliers} outlier(s) detected and replaced by Hampel filter across ${numericFields.length} numeric field(s).`,
    });
  }
  if (totalImputed > 0) {
    violations.push({
      contractId,
      checkName: 'values_imputed',
      severity: 'info',
      timestamp: new Date().toISOString(),
      value: totalImputed,
      message: `${totalImputed} missing value(s) imputed via ${options?.imputationMethod ?? 'linear'} interpolation across ${numericFields.length} numeric field(s).`,
    });
  }

  const summary = `Validated ${records.length} records against '${contractId}': ${violations.length} violation(s), ${totalOutliers} outlier(s) replaced, ${totalImputed} value(s) imputed.`;

  return {
    violations,
    imputedRecords,
    hampelResults,
    imputationResults,
    totalOutliers,
    totalImputed,
    summary,
  };
}
