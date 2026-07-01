// ============================================================================
// Utility CSV Parser — IESO and generic utility load CSV parsing
//
// Provides CSV parsing for utility historical load data, including
// IESO-specific public demand report format and generic column-mapped CSV.
// ============================================================================

import type {
  UtilityGeographyLevel,
  UtilityHistoricalLoadRow,
  UtilityInputGranularity,
  UtilityJurisdiction,
  UtilityQualityFlag,
  PublicUtilitySampleManifest,
} from './types/utilityForecasting';

export interface ParsedUtilityCsv {
  rows: UtilityHistoricalLoadRow[];
  errors: string[];
}

export const TEMPLATE_HEADERS = [
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

const IESO_DEMAND_HEADER_ALIASES = {
  date: ['date', 'trading_date', 'delivery_date', 'for'],
  hour: ['hour', 'hour_ending', 'hour_ending_est', 'he'],
  marketDemand: ['market_demand', 'market_demand_mw', 'total_market_demand'],
  ontarioDemand: ['ontario_demand', 'ontario_demand_mw'],
} as const;

export const PUBLIC_SOURCE_TRANSFORM_VERSION = 'ieso-apo-derived-transform-v1';

export const ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST: PublicUtilitySampleManifest = {
  id: 'ieso-apo-public-system-sample-2026',
  jurisdiction: 'Ontario',
  label: 'IESO Hourly Demand Report Ontario public system sample',
  source_url: 'https://reports-public.ieso.ca/public/Demand/PUB_Demand_2026.csv',
  source_document: 'IESO Public Reports Site Hourly Demand Report, with Annual Planning Outlook context for planning use',
  source_file: 'PUB_Demand_2026.csv',
  generated_date: '2026-05-29',
  sample_scope: 'public-system-sample',
  source_derivation_note: 'CEIP now supports raw IESO Hourly Demand Report CSV transforms for Date, Hour, Market Demand, and Ontario Demand fields. The bundled public-system starter remains workflow proof and must be refreshed from the official source file during pilots.',
  disclaimer: 'Public-derived workflow proof only. Not customer LDC history, not production utility telemetry, and not a regulator-submitted record.',
};

export function sortRows(rows: UtilityHistoricalLoadRow[]): UtilityHistoricalLoadRow[] {
  return [...rows].sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
}

export function parseUtilityHistoricalLoadCsv(text: string): ParsedUtilityCsv {
  const iesoDemandCsv = tryParseIesoPublicDemandCsv(text);
  if (iesoDemandCsv) return iesoDemandCsv;

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

export function parseIesoPublicDemandCsv(text: string): ParsedUtilityCsv {
  return tryParseIesoPublicDemandCsv(text) ?? {
    rows: [],
    errors: ['CSV must include IESO-style Date, Hour, Ontario Demand, and Market Demand columns.'],
  };
}

function tryParseIesoPublicDemandCsv(text: string): ParsedUtilityCsv | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const headerIndex = lines.findIndex((line) => {
    const headers = splitCsvLine(line).map(normalizeHeader);
    return findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.date) >= 0
      && findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.hour) >= 0
      && findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.ontarioDemand) >= 0
      && findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.marketDemand) >= 0;
  });

  if (headerIndex < 0) return null;

  const headers = splitCsvLine(lines[headerIndex]).map(normalizeHeader);
  const dateIndex = findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.date);
  const hourIndex = findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.hour);
  const ontarioDemandIndex = findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.ontarioDemand);
  const marketDemandIndex = findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.marketDemand);
  const rows: UtilityHistoricalLoadRow[] = [];
  const errors: string[] = [];

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const columns = splitCsvLine(lines[index]);
    const dateValue = readColumn(columns, dateIndex);
    const hourEnding = parseNumeric(readColumn(columns, hourIndex));
    const ontarioDemand = parseNumeric(readColumn(columns, ontarioDemandIndex));
    const marketDemand = parseOptionalNumeric(readColumn(columns, marketDemandIndex));
    const timestamp = buildIesoHourEndingTimestamp(dateValue, hourEnding);

    if (!timestamp || !Number.isFinite(ontarioDemand)) {
      errors.push(`Row ${index + 1} skipped: invalid IESO date/hour or Ontario Demand value.`);
      continue;
    }

    rows.push({
      timestamp,
      geography_level: 'system',
      geography_id: 'IESO-ONTARIO-SYSTEM',
      customer_class: 'mixed',
      demand_mw: ontarioDemand,
      gross_load_mw: marketDemand ?? undefined,
      net_load_mw: ontarioDemand,
      source_system: ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST.id,
      quality_flags: ['missing_temperature', 'customer_count_missing'],
    });
  }

  if (rows.length === 0) {
    errors.push('No valid IESO public demand rows were parsed.');
  }

  return { rows: sortRows(rows), errors };
}

function splitCsvLine(line: string): string[] {
  const columns: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      columns.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  columns.push(current);
  return columns;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
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

function buildIesoHourEndingTimestamp(dateValue: string, hourEnding: number): string | null {
  const normalizedHour = Math.trunc(hourEnding);
  if (!Number.isFinite(normalizedHour) || normalizedHour < 1 || normalizedHour > 24) return null;

  const trimmed = dateValue.trim();
  const ymd = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  const mdy = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  const parsed = ymd
    ? { year: Number(ymd[1]), month: Number(ymd[2]), day: Number(ymd[3]) }
    : mdy
      ? { year: Number(mdy[3]), month: Number(mdy[1]), day: Number(mdy[2]) }
      : null;

  if (!parsed || parsed.month < 1 || parsed.month > 12 || parsed.day < 1 || parsed.day > 31) return null;

  const timestamp = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, normalizedHour - 1, 0, 0));
  return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : null;
}
