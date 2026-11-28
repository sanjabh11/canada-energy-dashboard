export function parseFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export interface ObservedGridStatusRow {
  region: string;
  demand_mw: number | null;
  supply_mw: number | null;
  reserve_margin: number | null;
  frequency_hz: number | null;
  voltage_kv: number | null;
  congestion_index: number | null;
  data_source: string;
  status: string | null;
  captured_at: string;
}

export function normalizeAuthoritativeTimestamp(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}[-/]\d{2}[-/]\d{2}(?:$|[T\s])/.test(trimmed)) return null;

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Maps an already fetched provider row without manufacturing grid measurements.
 * Missing source metrics remain null and a missing source timestamp invalidates
 * the row rather than falling back to the ingestion clock.
 */
export function buildObservedGridStatusRow(
  row: Record<string, unknown>,
  defaults: { region: string; dataSource: string },
): ObservedGridStatusRow | null {
  const capturedAt = normalizeAuthoritativeTimestamp(row.timestamp);
  if (!capturedAt) return null;

  const demand = parseFiniteNumber(row.demand_mw);
  const supply = parseFiniteNumber(row.supply_mw);
  const region = typeof row.region === 'string' && row.region.trim().length > 0
    ? row.region.trim()
    : defaults.region;
  const dataSource = typeof row.source === 'string' && row.source.trim().length > 0
    ? row.source.trim()
    : defaults.dataSource;
  const status = typeof row.status === 'string' && row.status.trim().length > 0
    ? row.status.trim()
    : null;

  return {
    region,
    demand_mw: demand,
    supply_mw: supply,
    reserve_margin: demand !== null && supply !== null && demand > 0
      ? (supply - demand) / demand
      : null,
    frequency_hz: parseFiniteNumber(row.frequency_hz),
    voltage_kv: parseFiniteNumber(row.voltage_kv),
    congestion_index: parseFiniteNumber(row.congestion_index),
    data_source: dataSource,
    status,
    captured_at: capturedAt,
  };
}

export function classifySourceBatch(
  rows: unknown[],
  source: string,
): { usable: boolean; message: string | null } {
  if (rows.length === 0) {
    return { usable: false, message: `${source} returned no usable records.` };
  }

  const missingTimestamp = rows.some((row) => {
    if (!row || typeof row !== 'object') return true;
    const candidate = row as Record<string, unknown>;
    return normalizeAuthoritativeTimestamp(
      candidate.timestamp
      ?? candidate.observed_at
      ?? candidate.last_updated_datetime
      ?? candidate.begin_datetime_mpt,
    ) === null;
  });

  if (missingTimestamp) {
    return {
      usable: false,
      message: `${source} returned a record without an authoritative source timestamp.`,
    };
  }

  return { usable: true, message: null };
}
