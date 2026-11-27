// ============================================================================
// Utility CSV Parser — IESO and generic utility load CSV parsing
//
// Provides CSV parsing for utility historical load data, including
// IESO-specific public demand report format and generic column-mapped CSV.
// ============================================================================

import type {
  UtilityGeographyLevel,
  UtilityHistoricalLoadRow,
  UtilityQualityFlag,
  PublicUtilitySampleManifest,
  UtilityCsvFormatEvidence,
} from './types/utilityForecasting';
import { generateOntarioPublicUtilitySampleRows } from './utilitySampleData';

export type { UtilityCsvFormatEvidence };

export type UtilityCsvSourceUnit = 'unknown' | 'demand_mw' | 'kwh' | 'kw' | 'ieso';
export type UtilityCsvConversionMethod = 'none' | 'kwh_to_average_kw_to_mw' | 'kw_to_mw';

export interface UtilityCsvInputProvenance {
  source_unit: UtilityCsvSourceUnit;
  inferred_interval_minutes: number | null;
  conversion_method: UtilityCsvConversionMethod;
}

export const UTILITY_CSV_FORMAT_EVIDENCE_LABELS: Record<UtilityCsvFormatEvidence, string> = {
  bundled_fixture_hash_match:
    'Bundled synthetic CEIP fixture (deterministic fingerprint match); synthetic disclosure applies',
  ieso_format_detected: 'IESO format recognized; upload origin unverified',
  unverified_upload: 'Unverified upload; no recognized format or bundled-fixture fingerprint',
};

export interface ParsedUtilityCsv {
  rows: UtilityHistoricalLoadRow[];
  errors: string[];
  warnings: string[];
  format_evidence: UtilityCsvFormatEvidence;
  source_unit: UtilityCsvSourceUnit;
  inferred_interval_minutes: number | null;
  conversion_method: UtilityCsvConversionMethod;
}

export interface UtilityCsvParseOptions {
  strictTimezone?: boolean;
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
  kwh: ['kwh', 'interval_kwh', 'usage_kwh'],
  kw: ['kw', 'load_kw', 'demand_kw'],
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

const UNKNOWN_INPUT_PROVENANCE: UtilityCsvInputProvenance = {
  source_unit: 'unknown',
  inferred_interval_minutes: null,
  conversion_method: 'none',
};

export const PUBLIC_SOURCE_TRANSFORM_VERSION = 'ieso-apo-derived-transform-v1';
export const BUNDLED_SYNTHETIC_FIXTURE_VERSION = 'bundled-synthetic-fixture-v1';
export const MAX_UTILITY_CSV_BYTES = 25 * 1024 * 1024;
export const MAX_UTILITY_CSV_DATA_ROWS = 100_000;

function csvInputLimitError(text: string): string | null {
  if (text.length > MAX_UTILITY_CSV_BYTES) {
    return `CSV exceeds the ${MAX_UTILITY_CSV_BYTES / (1024 * 1024)} MiB upload limit.`;
  }

  let byteCount = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    byteCount += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
    if (byteCount > MAX_UTILITY_CSV_BYTES) {
      return `CSV exceeds the ${MAX_UTILITY_CSV_BYTES / (1024 * 1024)} MiB upload limit.`;
    }
  }
  return null;
}

function rejectedUtilityCsv(error: string): ParsedUtilityCsv {
  return {
    rows: [],
    errors: [error],
    warnings: [],
    format_evidence: 'unverified_upload',
    ...UNKNOWN_INPUT_PROVENANCE,
  };
}

export const ONTARIO_PUBLIC_UTILITY_SAMPLE_MANIFEST: PublicUtilitySampleManifest = {
  id: 'ieso-apo-public-system-sample-2026',
  jurisdiction: 'Ontario',
  label: 'Synthetic Ontario system-demand workflow fixture (IESO source reference)',
  source_url: 'https://reports-public.ieso.ca/public/Demand/PUB_Demand_2026.csv',
  source_document:
    'IESO Public Reports Site Hourly Demand Report, listed as a reference for optional raw CSV imports',
  source_file: 'PUB_Demand_2026.csv',
  synthetic_source_id: 'ceip-synthetic-ieso-public-system-fixture-v1',
  synthetic_fixture_version: BUNDLED_SYNTHETIC_FIXTURE_VERSION,
  generated_date: '2026-05-29',
  sample_scope: 'synthetic-public-context',
  source_derivation_note:
    'The bundled values are generated locally by CEIP formulas and are not downloaded, transformed, or validated against the referenced IESO CSV. CEIP separately supports parsing raw IESO Date, Hour, Market Demand, and Ontario Demand columns.',
  disclaimer:
    'Synthetic CEIP workflow proof only. The rows are not IESO measurements, customer LDC history, production utility telemetry, or a regulator-submitted record.',
  synthetic_fixture_attribution_note:
    'Synthetic CEIP fixture: formula-generated values; no IESO observation records are reproduced. The IESO report and terms are linked as references for separate raw-data imports.',
  attribution:
    'Copyright © 2004-2022 Independent Electricity System Operator, all rights reserved. This information is subject to the Terms of Use set out in the IESO’s website.',
  terms_url: 'https://www.ieso.ca/terms-of-use',
};

export function sortRows(rows: UtilityHistoricalLoadRow[]): UtilityHistoricalLoadRow[] {
  return [...rows].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

function fnv1aHex(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Stable fingerprint over canonical row content — exact-match, not heuristic.
 * Field order, separators, and normalization are fixed here; quality flags and
 * derived fields are excluded because they are recomputed during parsing.
 */
export function fingerprintUtilityLoadRows(rows: UtilityHistoricalLoadRow[]): string {
  // Total-order canonical sort so the fingerprint is independent of row order:
  // timestamp, then geography, then customer class.
  const serialized = [...rows]
    .sort((left, right) => {
      const byTime = new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
      if (byTime !== 0) return byTime;
      const byGeography = left.geography_id.localeCompare(right.geography_id);
      if (byGeography !== 0) return byGeography;
      return left.customer_class.localeCompare(right.customer_class);
    })
    .map((row) =>
      [
        row.timestamp,
        row.geography_level,
        row.geography_id,
        row.customer_class,
        row.demand_mw,
        row.weather_zone ?? '',
        row.temperature_c ?? '',
        row.net_load_mw ?? '',
        row.gross_load_mw ?? '',
        row.customer_count ?? '',
        row.source_system ?? '',
        row.feeder_id ?? '',
        row.substation_id ?? '',
      ].join('|'),
    )
    .join('\n');
  return `fnv1a-${fnv1aHex(`${rows.length}\n${serialized}`)}`;
}

// Lazily fingerprinted so the fixture generator only runs when an upload is
// actually parsed; the generator is deterministic, so one computation serves
// every comparison in the session.
let bundledFixtureFingerprintCache: string | null = null;
function getBundledFixtureFingerprint(): string {
  if (bundledFixtureFingerprintCache === null) {
    bundledFixtureFingerprintCache = fingerprintUtilityLoadRows(
      generateOntarioPublicUtilitySampleRows(),
    );
  }
  return bundledFixtureFingerprintCache;
}

/**
 * Exact-match check: every canonical field of every parsed row must reproduce
 * the bundled synthetic fixture. Caller-supplied `source_system` labels alone
 * never qualify — only the content fingerprint does.
 */
export function isBundledFixtureContent(rows: UtilityHistoricalLoadRow[]): boolean {
  return rows.length > 0 && fingerprintUtilityLoadRows(rows) === getBundledFixtureFingerprint();
}

function classifyGenericUploadEvidence(rows: UtilityHistoricalLoadRow[]): UtilityCsvFormatEvidence {
  return isBundledFixtureContent(rows) ? 'bundled_fixture_hash_match' : 'unverified_upload';
}

export function parseUtilityHistoricalLoadCsv(
  text: string,
  options: UtilityCsvParseOptions = {},
): ParsedUtilityCsv {
  const inputLimitError = csvInputLimitError(text);
  if (inputLimitError) return rejectedUtilityCsv(inputLimitError);

  const iesoDemandCsv = tryParseIesoPublicDemandCsv(text);
  if (iesoDemandCsv) return iesoDemandCsv;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ['CSV must include a header row and at least one data row.'],
      warnings: [],
      format_evidence: 'unverified_upload',
      ...UNKNOWN_INPUT_PROVENANCE,
    };
  }

  if (lines.length - 1 > MAX_UTILITY_CSV_DATA_ROWS) {
    return rejectedUtilityCsv(
      `CSV exceeds the ${MAX_UTILITY_CSV_DATA_ROWS.toLocaleString()} data-row limit.`,
    );
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const errors: string[] = [];
  const warnings: string[] = [];
  const rows: UtilityHistoricalLoadRow[] = [];

  const columnIndexes = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([key, aliases]) => [
      key,
      headers.findIndex((header) => aliases.includes(header)),
    ]),
  ) as Record<keyof typeof HEADER_ALIASES, number>;

  const loadCandidates = (['demand_mw', 'kwh', 'kw'] as const)
    .filter((unit) => columnIndexes[unit] >= 0)
    .map((unit) => ({ unit, index: columnIndexes[unit] }));

  if (columnIndexes.timestamp < 0 || loadCandidates.length === 0) {
    return {
      rows: [],
      errors: [
        'CSV must include timestamp/datetime and exactly one load column: demand_mw/load_mw, kwh/interval_kwh/usage_kwh, or kw.',
      ],
      warnings: [],
      format_evidence: 'unverified_upload',
      ...UNKNOWN_INPUT_PROVENANCE,
    };
  }

  if (loadCandidates.length > 1) {
    return rejectedUtilityCsv(
      `CSV has competing load columns (${loadCandidates.map(({ unit }) => unit).join(', ')}); provide exactly one unit column.`,
    );
  }

  const sourceUnit = loadCandidates[0]?.unit ?? 'unknown';
  const loadColumnIndex = loadCandidates[0]?.index ?? -1;
  const strictTimezone = options.strictTimezone === true;
  const pendingRows: Array<{
    timestamp: string;
    timestampMs: number;
    rawValue: number;
    columns: string[];
    seriesKey: string;
  }> = [];

  for (let index = 1; index < lines.length; index += 1) {
    const columns = splitCsvLine(lines[index]);
    const timestamp = readColumn(columns, columnIndexes.timestamp);
    const rawValue = parseNumeric(readColumn(columns, loadColumnIndex));
    const timestampMs = new Date(timestamp).getTime();

    if (!timestamp || !Number.isFinite(timestampMs) || !Number.isFinite(rawValue)) {
      errors.push(`Row ${index + 1} skipped: invalid timestamp or ${sourceUnit} value.`);
      continue;
    }

    if (sourceUnit !== 'demand_mw' && rawValue < 0) {
      errors.push(`Row ${index + 1} skipped: ${sourceUnit} values must be non-negative.`);
      continue;
    }

    const hasClockTime = /[T ]\d{2}:\d{2}/.test(timestamp);
    const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
    if (sourceUnit !== 'demand_mw' && !hasExplicitTimezone) {
      if (!hasClockTime) {
        errors.push(
          `Row ${index + 1} skipped: ${sourceUnit} timestamps must include a clock time and explicit timezone.`,
        );
      } else if (strictTimezone) {
        errors.push(
          `Row ${index + 1} skipped: ${sourceUnit} timestamps must include an explicit timezone in strict mode.`,
        );
      } else {
        warnings.push(
          `Row ${index + 1}: timezone_ambiguous ${sourceUnit} timestamp; confirm the source timezone before interpreting demand.`,
        );
      }
    }

    const geographyId = readColumn(columns, columnIndexes.geography_id) || 'system';
    const customerClass = readColumn(columns, columnIndexes.customer_class) || 'mixed';
    pendingRows.push({
      timestamp,
      timestampMs,
      rawValue,
      columns,
      seriesKey: `${geographyId}\u0000${customerClass}`,
    });
  }

  const timestampsBySeries = new Map<string, number[]>();
  for (const pending of pendingRows) {
    const timestamps = timestampsBySeries.get(pending.seriesKey) ?? [];
    timestamps.push(pending.timestampMs);
    timestampsBySeries.set(pending.seriesKey, timestamps);
  }
  const intervalResult = inferRegularIntervalMinutes([...timestampsBySeries.values()]);
  if (sourceUnit !== 'demand_mw' && intervalResult.error) {
    errors.push(intervalResult.error);
  }
  const inferredIntervalMinutes = intervalResult.minutes;

  const conversionMethod =
    sourceUnit === 'kwh' ? 'kwh_to_average_kw_to_mw' : sourceUnit === 'kw' ? 'kw_to_mw' : 'none';
  if (sourceUnit !== 'demand_mw' && errors.length > 0) {
    return {
      rows: [],
      errors,
      warnings,
      format_evidence: 'unverified_upload',
      source_unit: sourceUnit,
      inferred_interval_minutes: inferredIntervalMinutes,
      conversion_method: conversionMethod,
    };
  }

  for (const pending of pendingRows) {
    const { timestamp, rawValue, columns } = pending;
    const demandMw =
      sourceUnit === 'kwh'
        ? inferredIntervalMinutes && inferredIntervalMinutes > 0
          ? rawValue / (inferredIntervalMinutes / 60) / 1000
          : Number.NaN
        : sourceUnit === 'kw'
          ? rawValue / 1000
          : rawValue;

    if (!Number.isFinite(demandMw)) continue;

    const geographyId = readColumn(columns, columnIndexes.geography_id) || 'system';
    const geographyLevel = normalizeGeographyLevel(
      readColumn(columns, columnIndexes.geography_level),
      geographyId,
    );
    const customerClass = readColumn(columns, columnIndexes.customer_class) || 'mixed';
    const netLoad = parseOptionalNumeric(readColumn(columns, columnIndexes.net_load_mw));
    const grossLoad = parseOptionalNumeric(readColumn(columns, columnIndexes.gross_load_mw));
    const qualityFlags: UtilityQualityFlag[] = [];
    const hasExplicitTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
    if (!hasExplicitTimezone) qualityFlags.push('timezone_ambiguous');
    if (demandMw < 0) qualityFlags.push('negative_load');
    if (!Number.isFinite(Number(readColumn(columns, columnIndexes.temperature_c))))
      qualityFlags.push('missing_temperature');
    if (!readColumn(columns, columnIndexes.customer_count))
      qualityFlags.push('customer_count_missing');
    if (netLoad !== null && grossLoad !== null && netLoad > grossLoad)
      qualityFlags.push('net_exceeds_gross');

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

  const sortedRows = sortRows(rows);
  return {
    rows: sortedRows,
    errors,
    warnings,
    format_evidence: classifyGenericUploadEvidence(sortedRows),
    source_unit: sourceUnit,
    inferred_interval_minutes: inferredIntervalMinutes,
    conversion_method: conversionMethod,
  };
}

export function parseIesoPublicDemandCsv(text: string): ParsedUtilityCsv {
  const inputLimitError = csvInputLimitError(text);
  if (inputLimitError) return rejectedUtilityCsv(inputLimitError);

  return (
    tryParseIesoPublicDemandCsv(text) ?? {
      rows: [],
      errors: [
        'CSV must include IESO-style Date, Hour, Ontario Demand, and Market Demand columns.',
      ],
      warnings: [],
      format_evidence: 'unverified_upload',
      ...UNKNOWN_INPUT_PROVENANCE,
    }
  );
}

function tryParseIesoPublicDemandCsv(text: string): ParsedUtilityCsv | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const headerIndex = lines.findIndex((line) => {
    const headers = splitCsvLine(line).map(normalizeHeader);
    return (
      findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.date) >= 0 &&
      findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.hour) >= 0 &&
      findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.ontarioDemand) >= 0 &&
      findHeaderIndex(headers, IESO_DEMAND_HEADER_ALIASES.marketDemand) >= 0
    );
  });

  if (headerIndex < 0) return null;

  if (lines.length - headerIndex - 1 > MAX_UTILITY_CSV_DATA_ROWS) {
    return rejectedUtilityCsv(
      `CSV exceeds the ${MAX_UTILITY_CSV_DATA_ROWS.toLocaleString()} data-row limit.`,
    );
  }

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

  return {
    rows: sortRows(rows),
    errors,
    warnings: [],
    format_evidence: 'ieso_format_detected',
    source_unit: 'ieso',
    inferred_interval_minutes: 60,
    conversion_method: 'none',
  };
}

function inferRegularIntervalMinutes(seriesTimestamps: number[][]): {
  minutes: number | null;
  error?: string;
} {
  if (
    seriesTimestamps.length === 0 ||
    seriesTimestamps.some((timestamps) => timestamps.length < 2)
  ) {
    return {
      minutes: null,
      error: 'At least two timestamped rows are required to infer the interval length.',
    };
  }

  const deltas = seriesTimestamps.flatMap((timestamps) =>
    timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]!),
  );
  if (deltas.some((delta) => delta <= 0)) {
    return { minutes: null, error: 'Timestamp deltas must be strictly positive.' };
  }

  const sortedDeltas = [...deltas].sort((left, right) => left - right);
  const middle = Math.floor(sortedDeltas.length / 2);
  const medianMs =
    sortedDeltas.length % 2 === 0
      ? (sortedDeltas[middle - 1]! + sortedDeltas[middle]!) / 2
      : sortedDeltas[middle]!;
  const toleranceMs = Math.max(60_000, medianMs * 0.01);
  if (deltas.some((delta) => Math.abs(delta - medianMs) > toleranceMs)) {
    return {
      minutes: null,
      error: 'Timestamp intervals are irregular; provide a consistently sampled kWh/kW series.',
    };
  }

  return { minutes: Number((medianMs / 60_000).toFixed(3)) };
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
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
}

function findHeaderIndex(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((header) => aliases.includes(header));
}

function readColumn(columns: string[], index: number): string {
  if (index < 0 || index >= columns.length) return '';
  return columns[index]?.trim() ?? '';
}

function parseNumeric(value: string): number {
  if (!value) return Number.NaN;
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

  if (!parsed || parsed.month < 1 || parsed.month > 12 || parsed.day < 1 || parsed.day > 31)
    return null;

  const timestamp = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day, normalizedHour - 1, 0, 0),
  );
  return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : null;
}
