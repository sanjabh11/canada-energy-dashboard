import type { UtilityHistoricalLoadRow, UtilityQualityFlag } from './types/utilityForecasting';

export interface PersistedUtilityIntervalHistoryRow {
  observed_at?: unknown;
  source_kind?: unknown;
  source_system?: unknown;
  geography_level?: unknown;
  geography_id?: unknown;
  customer_class?: unknown;
  demand_mw?: unknown;
  weather_zone?: unknown;
  temperature_c?: unknown;
  net_load_mw?: unknown;
  gross_load_mw?: unknown;
  gross_reconstituted_mw?: unknown;
  customer_count?: unknown;
  feeder_id?: unknown;
  substation_id?: unknown;
  quality_flags?: unknown;
}

export interface UtilityConnectorHistoryNormalizationResult {
  rows: UtilityHistoricalLoadRow[];
  errors: string[];
}

const VALID_GEOGRAPHY_LEVELS = new Set(['system', 'substation', 'feeder']);
const VALID_QUALITY_FLAGS = new Set<UtilityQualityFlag>([
  'duplicate_interval',
  'negative_load',
  'flatline_segment',
  'impossible_spike',
  'load_transfer_jump',
  'customer_count_missing',
  'missing_temperature',
  'net_exceeds_gross',
  'gross_reconstituted',
  'vee_estimated',
  'vee_edited',
  'meter_gap_filled',
  'telemetry_outage',
  'upsampled_15min',
]);

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeOptionalText(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : undefined;
}

function normalizeQualityFlags(value: unknown): UtilityQualityFlag[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (flag): flag is UtilityQualityFlag =>
      typeof flag === 'string' && VALID_QUALITY_FLAGS.has(flag as UtilityQualityFlag),
  );
}

/**
 * Converts service-persisted Green Button interval history into the canonical
 * forecast input contract. The whole batch fails closed when any row is
 * malformed; partial customer history must not look like a complete source.
 */
export function normalizePersistedUtilityIntervalHistory(
  input: unknown,
): UtilityConnectorHistoryNormalizationResult {
  if (!Array.isArray(input) || input.length === 0) {
    return {
      rows: [],
      errors: ['No persisted Green Button interval history was supplied.'],
    };
  }

  const errors: string[] = [];
  const rows: UtilityHistoricalLoadRow[] = [];

  input.forEach((value, index) => {
    const row = (
      value && typeof value === 'object' ? value : {}
    ) as PersistedUtilityIntervalHistoryRow;
    const timestamp = normalizeTimestamp(row.observed_at);
    const sourceKind = String(row.source_kind ?? '').trim();
    const geographyLevel = String(row.geography_level ?? '').trim();
    const geographyId = String(row.geography_id ?? '').trim();
    const customerClass = String(row.customer_class ?? '').trim();
    const demandMw = parseFiniteNumber(row.demand_mw);

    const rowErrors: string[] = [];
    if (sourceKind !== 'green_button_cmd') rowErrors.push('source_kind must be green_button_cmd');
    if (!timestamp) rowErrors.push('observed_at must be a valid timestamp');
    if (!VALID_GEOGRAPHY_LEVELS.has(geographyLevel)) rowErrors.push('geography_level is invalid');
    if (!geographyId) rowErrors.push('geography_id is required');
    if (!customerClass) rowErrors.push('customer_class is required');
    if (demandMw === null || demandMw < 0)
      rowErrors.push('demand_mw must be a finite non-negative number');

    if (rowErrors.length > 0) {
      errors.push(`Row ${index + 1}: ${rowErrors.join('; ')}.`);
      return;
    }

    rows.push({
      timestamp: timestamp!,
      geography_level: geographyLevel as UtilityHistoricalLoadRow['geography_level'],
      geography_id: geographyId,
      customer_class: customerClass,
      demand_mw: demandMw!,
      weather_zone: normalizeOptionalText(row.weather_zone),
      temperature_c: parseFiniteNumber(row.temperature_c),
      net_load_mw: parseFiniteNumber(row.net_load_mw),
      gross_load_mw: parseFiniteNumber(row.gross_load_mw),
      gross_reconstituted_mw: parseFiniteNumber(row.gross_reconstituted_mw),
      customer_count: parseFiniteNumber(row.customer_count),
      source_system: normalizeOptionalText(row.source_system) ?? 'green_button_cmd',
      feeder_id: normalizeOptionalText(row.feeder_id),
      substation_id: normalizeOptionalText(row.substation_id),
      quality_flags: normalizeQualityFlags(row.quality_flags),
    });
  });

  if (errors.length > 0) {
    return { rows: [], errors };
  }

  return {
    rows: rows.sort((left, right) => left.timestamp.localeCompare(right.timestamp)),
    errors: [],
  };
}
