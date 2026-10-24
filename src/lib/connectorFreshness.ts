export interface ConnectorFreshnessRow {
  connector_id?: unknown;
  last_run_at?: unknown;
  last_run_status?: unknown;
  freshness_status?: unknown;
}

export interface ConnectorFreshnessResult {
  available: boolean;
  lastRunMap: Record<string, string | null>;
  error: string | null;
}

interface ConnectorFreshnessQuery {
  select: (columns: string) => PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>;
}

export interface ConnectorFreshnessClient {
  from: (table: string) => ConnectorFreshnessQuery;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function buildLastSuccessfulRunMap(
  rows: ConnectorFreshnessRow[],
): Record<string, string | null> {
  return rows.reduce<Record<string, string | null>>((map, row) => {
    const connectorId = typeof row.connector_id === 'string' ? row.connector_id : null;
    if (!connectorId) return map;

    const status = row.last_run_status === 'success' && row.freshness_status !== 'demo';
    map[connectorId] = status ? normalizeTimestamp(row.last_run_at) : null;
    return map;
  }, {});
}

export async function fetchConnectorFreshness(
  client: ConnectorFreshnessClient,
): Promise<ConnectorFreshnessResult> {
  try {
    const { data, error } = await client
      .from('connector_freshness')
      .select('connector_id,last_run_at,last_run_status,freshness_status');

    if (error) {
      return {
        available: false,
        lastRunMap: {},
        error: error.message ?? 'Persisted connector freshness read failed.',
      };
    }

    if (!Array.isArray(data)) {
      return {
        available: false,
        lastRunMap: {},
        error: 'Persisted connector freshness returned an invalid payload.',
      };
    }

    return {
      available: true,
      lastRunMap: buildLastSuccessfulRunMap(data as ConnectorFreshnessRow[]),
      error: null,
    };
  } catch (error) {
    return {
      available: false,
      lastRunMap: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
