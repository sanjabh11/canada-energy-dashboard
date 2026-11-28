import {
  allowedGreenButtonUtilityName,
  createGreenButtonAuthRequest,
  createOwnerDataClient,
  deleteGreenButtonAuthRequest,
  parseCookieHeader,
  requestGreenButtonAuthorizeUrl,
  resolveOrProvisionWhopOwner,
  selectOwnerConnectorAccounts,
  selectOwnerIntervalHistory,
  selectOwnerSyncRuns,
  verifyWhopSessionToken,
  type OwnerConnectorAccount,
  type OwnerSyncRun,
} from './_shared/utilityConnectorOwner';
import { normalizePersistedUtilityIntervalHistory } from '../../src/lib/utilityConnectorHistory';

const COOKIE_NAME = 'whop_session';
const AUTH_REQUEST_TTL_MS = 10 * 60 * 1000;
const LIVE_WINDOW_HOURS = 48;
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://canada-energy.netlify.app',
  'https://ceip.netlify.app',
];

type Jurisdiction = 'Ontario' | 'Alberta';
type FreshnessStatus = 'live' | 'stale' | 'demo' | 'unknown';
type ReadStatus = 'available' | 'stale' | 'empty' | 'invalid' | 'unknown';

interface HandlerEvent {
  httpMethod: string;
  headers: Record<string, string | undefined>;
  body?: string | null;
  queryStringParameters?: Record<string, string | undefined>;
}

interface HandlerResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface HistoryReadResult {
  owner_bound: true;
  read_status: ReadStatus;
  freshness_status: FreshnessStatus;
  source_kind: 'green_button_cmd';
  source_label: string;
  source_observed_at: string | null;
  fetched_at: string | null;
  accounts: Array<Record<string, unknown>>;
  history: Array<Record<string, unknown>>;
  warnings: string[];
}

function corsHeaders(origin: string | undefined): Record<string, string> {
  const resolvedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': resolvedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

function json(body: unknown, statusCode: number, headers: Record<string, string>): HandlerResponse {
  return {
    statusCode,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function parseJurisdiction(value: unknown): Jurisdiction {
  return value === 'Alberta' ? 'Alberta' : 'Ontario';
}

function parseBody(event: HandlerEvent): Record<string, unknown> {
  if (!event.body) return {};
  try {
    const value = JSON.parse(event.body) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function hoursSince(value: string | null | undefined, now: Date): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, now.getTime() - timestamp) / 3_600_000;
}

function latestRunByAccount(runs: OwnerSyncRun[], status: string): Map<string, OwnerSyncRun> {
  const result = new Map<string, OwnerSyncRun>();
  runs
    .filter((run) => run.status === status && run.run_type === 'sync')
    .forEach((run) => {
      const accountId = String(run.connector_account_id ?? '');
      if (!accountId || result.has(accountId)) return;
      result.set(accountId, run);
    });
  return result;
}

function sanitizeAccount(account: OwnerConnectorAccount): Record<string, unknown> {
  return {
    id: account.id,
    connector_kind: account.connector_kind,
    source_kind: account.source_kind,
    status: account.status,
    jurisdiction: account.jurisdiction,
    utility_name: account.utility_name,
    display_name: account.display_name,
    account_holder_ref: account.account_holder_ref,
    last_synced_at: account.last_synced_at,
    last_error: account.last_error,
    metadata: account.metadata ?? {},
    updated_at: account.updated_at,
  };
}

export function buildOwnerBoundHistoryRead(params: {
  accounts: OwnerConnectorAccount[];
  runs: OwnerSyncRun[];
  history: Array<Record<string, unknown>>;
  now?: Date;
}): HistoryReadResult {
  const now = params.now ?? new Date();
  const accounts = params.accounts;
  const accountIds = new Set(accounts.map((account) => account.id));
  const runs = params.runs.filter((run) => accountIds.has(String(run.connector_account_id ?? '')));
  const latestSuccess = latestRunByAccount(runs, 'success');
  const latestFailure = latestRunByAccount(runs, 'failure');
  const historyByAccount = new Map<string, Array<Record<string, unknown>>>();

  params.history.forEach((row) => {
    const accountId = String(row.connector_account_id ?? '');
    if (!accountIds.has(accountId)) return;
    const current = historyByAccount.get(accountId) ?? [];
    current.push(row);
    historyByAccount.set(accountId, current);
  });

  const eligibleAccountIds = new Set<string>();
  const warnings: string[] = [];
  accounts.forEach((account) => {
    const accountId = account.id;
    const success = latestSuccess.get(accountId);
    const rows = historyByAccount.get(accountId) ?? [];
    if (account.last_error) warnings.push(`${account.display_name}: ${account.last_error}`);
    if (!success || success.row_count <= 0 || rows.length === 0) return;
    const latestObserved = rows.reduce<string | null>((latest, row) => {
      const observedAt = typeof row.observed_at === 'string' ? row.observed_at : null;
      if (!observedAt) return latest;
      return !latest || observedAt > latest ? observedAt : latest;
    }, null);
    const isLive = account.status === 'active'
      && hoursSince(success.created_at, now) <= LIVE_WINDOW_HOURS
      && hoursSince(latestObserved, now) <= LIVE_WINDOW_HOURS;
    if (isLive) eligibleAccountIds.add(accountId);
  });

  const eligibleHistory = params.history.filter((row) => eligibleAccountIds.has(String(row.connector_account_id ?? '')));
  const normalized = normalizePersistedUtilityIntervalHistory(eligibleHistory);
  const allHistory = normalizePersistedUtilityIntervalHistory(params.history);

  const sourceObservedAt = normalized.rows.at(-1)?.timestamp ?? null;
  const eligibleRuns = Array.from(eligibleAccountIds)
    .map((accountId) => latestSuccess.get(accountId))
    .filter((run): run is OwnerSyncRun => Boolean(run));
  const fetchedAt = eligibleRuns
    .map((run) => run.created_at)
    .sort()
    .at(-1) ?? null;

  let readStatus: ReadStatus = 'unknown';
  let freshnessStatus: FreshnessStatus = 'unknown';
  let history: Array<Record<string, unknown>> = [];

  if (params.history.length === 0 || allHistory.errors.some((error) => error.includes('No persisted'))) {
    readStatus = 'empty';
  } else if (eligibleAccountIds.size === 0) {
    readStatus = 'stale';
    freshnessStatus = 'stale';
    warnings.push('No owner-bound Green Button account has a recent successful sync with current interval readings.');
  } else if (normalized.errors.length > 0) {
    readStatus = 'invalid';
    warnings.push(...normalized.errors);
  } else if (normalized.rows.length === 0) {
    readStatus = 'empty';
  } else {
    readStatus = 'available';
    freshnessStatus = 'live';
    history = eligibleHistory;
  }

  if (readStatus !== 'available' && params.history.length > 0 && allHistory.errors.length > 0) {
    warnings.push(...allHistory.errors.slice(0, 5));
  }
  latestFailure.forEach((run) => {
    if (run.error_message) warnings.push(run.error_message);
  });

  const sourceLabel = accounts.length === 1
    ? `${accounts[0]?.utility_name ?? 'Utility'} owner-bound Green Button CMD history`
    : 'Owner-bound Green Button CMD utility history';

  return {
    owner_bound: true,
    read_status: readStatus,
    freshness_status: freshnessStatus,
    source_kind: 'green_button_cmd',
    source_label: sourceLabel,
    source_observed_at: sourceObservedAt,
    fetched_at: fetchedAt,
    accounts: accounts.map(sanitizeAccount),
    history,
    warnings: Array.from(new Set(warnings)),
  };
}

async function verifyOwner(event: HandlerEvent) {
  const token = parseCookieHeader(event.headers.cookie ?? event.headers.Cookie, COOKIE_NAME);
  const verification = await verifyWhopSessionToken(token ?? '');
  if (!verification.valid || !verification.identity) return null;
  const client = createOwnerDataClient();
  const owner = await resolveOrProvisionWhopOwner(client, verification.identity);
  return { client, owner };
}

async function handleRead(event: HandlerEvent, headers: Record<string, string>) {
  const verified = await verifyOwner(event);
  if (!verified) {
    return json({ owner_bound: false, read_status: 'unauthorized', error: 'Authenticated Whop session required.' }, 401, headers);
  }

  const jurisdiction = parseJurisdiction(event.queryStringParameters?.jurisdiction);
  const accounts = await selectOwnerConnectorAccounts(verified.client, verified.owner.userId, jurisdiction);
  const accountIds = accounts.map((account) => account.id);
  const [runs, history] = await Promise.all([
    selectOwnerSyncRuns(verified.client, accountIds),
    selectOwnerIntervalHistory(verified.client, accountIds),
  ]);
  return json(buildOwnerBoundHistoryRead({ accounts, runs, history }), 200, headers);
}

async function handleStart(event: HandlerEvent, headers: Record<string, string>) {
  const verified = await verifyOwner(event);
  if (!verified) {
    return json({ owner_bound: false, error: 'Authenticated Whop session required.' }, 401, headers);
  }

  const body = parseBody(event);
  const utilityName = allowedGreenButtonUtilityName(body.utility_name ?? event.queryStringParameters?.utility_name);
  const connectorId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + AUTH_REQUEST_TTL_MS).toISOString();
  await createGreenButtonAuthRequest(verified.client, {
    state: connectorId,
    owner_user_id: verified.owner.userId,
    connector_id: connectorId,
    utility_name: utilityName,
    display_name: `${utilityName} Green Button`,
    expires_at: expiresAt,
    metadata: { created_by: 'utility-connector-history' },
  });

  try {
    const authorizePayload = await requestGreenButtonAuthorizeUrl(verified.client, {
      utilityName,
      connectorId,
    });
    return json({
      ok: true,
      owner_bound: true,
      authorize_url: authorizePayload.authorize_url,
      state: connectorId,
      connector_id: connectorId,
      expires_at: expiresAt,
    }, 200, headers);
  } catch {
    await deleteGreenButtonAuthRequest(verified.client, connectorId).catch(() => undefined);
    return json({ owner_bound: true, error: 'Green Button authorization could not be started.' }, 502, headers);
  }
}

const handler = async (event: HandlerEvent, _context: unknown): Promise<HandlerResponse | { statusCode: number; headers: Record<string, string>; body: string }> => {
  const headers = corsHeaders(event.headers.origin ?? event.headers.Origin);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    if (event.httpMethod === 'GET') return await handleRead(event, headers);
    if (event.httpMethod === 'POST') {
      const body = parseBody(event);
      return body.action === 'start' ? await handleStart(event, headers) : json({ error: 'Unsupported utility connector action.' }, 405, headers);
    }
    return json({ error: 'Method not allowed.' }, 405, headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Utility connector history request failed.';
    if (message.includes('Server-side Supabase configuration') || message.includes('Supabase configuration')) {
      return json({ error: 'Utility connector service is not configured.' }, 503, headers);
    }
    return json({ error: 'Utility connector history request failed.' }, 503, headers);
  }
};

export { handler };
