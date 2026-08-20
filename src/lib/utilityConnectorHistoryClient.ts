import type { FreshnessStatus } from './foundation';
import { normalizePersistedUtilityIntervalHistory } from './utilityConnectorHistory';
import type { UtilityConnectorAccount } from './utilityLiveData';
import type { UtilityJurisdiction, UtilitySourceTrustContext } from './types/utilityForecasting';
export type { UtilitySourceTrustContext } from './types/utilityForecasting';

export type UtilityConnectorHistoryReadStatus =
  | 'available'
  | 'stale'
  | 'empty'
  | 'invalid'
  | 'unknown'
  | 'unauthorized'
  | 'owner_unbound'
  | 'unavailable';

export interface UtilityConnectorHistoryReadResult {
  status: UtilityConnectorHistoryReadStatus;
  rows: ReturnType<typeof normalizePersistedUtilityIntervalHistory>['rows'];
  accounts: UtilityConnectorAccount[];
  sourceLabel: string;
  sourceKind: 'green_button_cmd';
  sourceObservedAt: string | null;
  fetchedAt: string | null;
  freshnessStatus: FreshnessStatus;
  ownerBound: boolean;
  sourceTrust: UtilitySourceTrustContext | null;
  warnings: string[];
  error?: string;
}

interface HistoryPayload {
  owner_bound?: unknown;
  read_status?: unknown;
  freshness_status?: unknown;
  source_kind?: unknown;
  source_label?: unknown;
  source_observed_at?: unknown;
  fetched_at?: unknown;
  accounts?: unknown;
  history?: unknown;
  warnings?: unknown;
  error?: unknown;
  authorize_url?: unknown;
  state?: unknown;
  connector_id?: unknown;
  expires_at?: unknown;
}

function responseRecord(value: unknown): HistoryPayload {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as HistoryPayload)
    : {};
}

function textValue(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : null;
}

function parseFreshness(value: unknown): FreshnessStatus {
  return value === 'live' || value === 'stale' || value === 'demo' || value === 'unknown'
    ? value
    : 'unknown';
}

function parseAccounts(value: unknown): UtilityConnectorAccount[] {
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is UtilityConnectorAccount => {
    if (!candidate || typeof candidate !== 'object') return false;
    const account = candidate as Partial<UtilityConnectorAccount>;
    return (
      typeof account.id === 'string' &&
      account.connector_kind === 'ontario_green_button_cmd' &&
      account.source_kind === 'green_button_cmd' &&
      (account.jurisdiction === 'Ontario' || account.jurisdiction === 'Alberta') &&
      typeof account.utility_name === 'string' &&
      typeof account.display_name === 'string'
    );
  });
}

function emptyResult(
  status: UtilityConnectorHistoryReadStatus,
  error?: string,
): UtilityConnectorHistoryReadResult {
  return {
    status,
    rows: [],
    accounts: [],
    sourceLabel: 'Owner-bound Green Button CMD history',
    sourceKind: 'green_button_cmd',
    sourceObservedAt: null,
    fetchedAt: null,
    freshnessStatus: status === 'stale' ? 'stale' : 'unknown',
    ownerBound: false,
    sourceTrust: null,
    warnings: [],
    ...(error ? { error } : {}),
  };
}

async function readPayload(response: Response): Promise<HistoryPayload> {
  try {
    return responseRecord(await response.json());
  } catch {
    return {};
  }
}

export async function fetchUtilityConnectorHistory(
  jurisdiction: UtilityJurisdiction,
  fetchImpl: typeof fetch = fetch,
): Promise<UtilityConnectorHistoryReadResult> {
  const url = `/api/utility-connector-history?jurisdiction=${encodeURIComponent(jurisdiction)}`;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } catch {
    return emptyResult('unavailable', 'Utility connector history service is unavailable.');
  }

  const payload = await readPayload(response);
  if (response.status === 401)
    return emptyResult(
      'unauthorized',
      textValue(payload.error) ?? 'Authenticated Whop session required.',
    );
  if (response.status === 403)
    return emptyResult(
      'owner_unbound',
      textValue(payload.error) ?? 'Verified owner binding is required.',
    );
  if (!response.ok)
    return emptyResult(
      'unavailable',
      textValue(payload.error) ?? 'Utility connector history could not be read.',
    );

  const ownerBound = payload.owner_bound === true;
  const freshnessStatus = parseFreshness(payload.freshness_status);
  const accounts = parseAccounts(payload.accounts);
  const sourceLabel = textValue(payload.source_label) ?? 'Owner-bound Green Button CMD history';
  const sourceObservedAt = textValue(payload.source_observed_at);
  const fetchedAt = textValue(payload.fetched_at);
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((warning): warning is string => typeof warning === 'string')
    : [];

  if (!ownerBound)
    return emptyResult('owner_unbound', 'Owner-bound connector history is required.');
  if (payload.source_kind !== 'green_button_cmd') {
    return {
      ...emptyResult('invalid', 'Connector history source kind is invalid.'),
      accounts,
      ownerBound: true,
      sourceLabel,
      freshnessStatus,
      sourceObservedAt,
      fetchedAt,
      warnings,
    };
  }

  const serverReadStatus =
    payload.read_status === 'available'
      ? 'available'
      : payload.read_status === 'stale'
        ? 'stale'
        : payload.read_status === 'empty'
          ? 'empty'
          : payload.read_status === 'invalid'
            ? 'invalid'
            : 'unknown';
  if (
    serverReadStatus === 'empty' &&
    (!Array.isArray(payload.history) || payload.history.length === 0)
  ) {
    return {
      status: 'empty',
      rows: [],
      accounts,
      sourceLabel,
      sourceKind: 'green_button_cmd',
      sourceObservedAt,
      fetchedAt,
      freshnessStatus,
      ownerBound: true,
      sourceTrust: null,
      warnings,
    };
  }

  const normalization = normalizePersistedUtilityIntervalHistory(payload.history);
  if (normalization.errors.length > 0) {
    return {
      status: 'invalid',
      rows: [],
      accounts,
      sourceLabel,
      sourceKind: 'green_button_cmd',
      sourceObservedAt,
      fetchedAt,
      freshnessStatus,
      ownerBound: true,
      sourceTrust: null,
      warnings: [...warnings, ...normalization.errors],
      error: 'Persisted Green Button history failed canonical validation.',
    };
  }

  const status: UtilityConnectorHistoryReadStatus =
    serverReadStatus === 'available' &&
    freshnessStatus === 'live' &&
    normalization.rows.length > 0 &&
    Boolean(fetchedAt)
      ? 'available'
      : serverReadStatus;
  const sourceTrust =
    status === 'available'
      ? {
          owner_bound: true,
          freshness_status: freshnessStatus,
          fetched_at: fetchedAt,
          observed_at: sourceObservedAt,
          ...(accounts.length === 1 ? { connector_account_id: accounts[0]?.id } : {}),
        }
      : null;

  return {
    status,
    rows: status === 'available' ? normalization.rows : [],
    accounts,
    sourceLabel,
    sourceKind: 'green_button_cmd',
    sourceObservedAt,
    fetchedAt,
    freshnessStatus,
    ownerBound: true,
    sourceTrust,
    warnings,
    ...(textValue(payload.error) ? { error: textValue(payload.error)! } : {}),
  };
}

export async function startUtilityConnectorAuthorization(
  utilityName: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ authorize_url: string; state: string; connector_id: string; expires_at?: string }> {
  let response: Response;
  try {
    response = await fetchImpl('/api/utility-connector-history', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ action: 'start', utility_name: utilityName }),
    });
  } catch {
    throw new Error('Utility connector authorization service is unavailable.');
  }

  const payload = responseRecord(await response.json().catch(() => ({})));
  if (
    !response.ok ||
    typeof payload.authorize_url !== 'string' ||
    typeof payload.state !== 'string' ||
    typeof payload.connector_id !== 'string'
  ) {
    throw new Error(textValue(payload.error) ?? 'Green Button authorization could not be started.');
  }
  return {
    authorize_url: payload.authorize_url,
    state: payload.state,
    connector_id: payload.connector_id,
    ...(typeof payload.expires_at === 'string' ? { expires_at: payload.expires_at } : {}),
  };
}
