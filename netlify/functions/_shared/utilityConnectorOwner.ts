export interface VerifiedWhopIdentity {
  providerId: string;
  email?: string;
  name?: string;
  verificationSource: 'oauth_userinfo' | 'legacy_me' | 'simulated';
}

export interface WhopSessionVerification {
  valid: boolean;
  identity?: VerifiedWhopIdentity;
  error?: string;
  httpStatus?: number;
  retryable?: boolean;
}

export interface OwnerDataClient {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
  fetchImpl: typeof fetch;
}

export interface WhopOwner {
  userId: string;
  providerId: string;
  email: string | null;
}

export interface WhopEntitlement {
  tier: 'free' | 'basic' | 'pro' | 'team';
  expiryDate: string | null;
}

export interface GreenButtonAuthRequest {
  id: string;
  state: string;
  owner_user_id: string;
  connector_id: string;
  utility_name: string;
  display_name: string;
  expires_at: string;
  used_at: string | null;
}

export interface OwnerConnectorAccount {
  id: string;
  owner_user_id: string;
  connector_kind: string;
  source_kind: string;
  status: string;
  jurisdiction: 'Ontario' | 'Alberta';
  utility_name: string;
  display_name: string;
  account_holder_ref: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface OwnerSyncRun {
  id: string;
  connector_account_id: string | null;
  run_type: string;
  status: string;
  observed_at: string | null;
  row_count: number;
  warning_count: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const GREEN_BUTTON_EDGE_FUNCTION = 'utility-connector-green-button';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function textValue(value: unknown): string | null {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > 0 ? text : null;
}

function responseRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function decodeSimulatedToken(token: string): WhopSessionVerification {
  try {
    const [, encodedPayload] = token.split('.');
    if (!encodedPayload) return { valid: false, error: 'Invalid simulated token format.' };
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as unknown;
    const record = responseRecord(payload);
    const providerId = textValue(record.sub) ?? textValue(record.user_id);
    if (!providerId) return { valid: false, error: 'Simulated token has no provider subject.' };
    return {
      valid: true,
      identity: {
        providerId,
        email: textValue(record.email) ?? undefined,
        name: textValue(record.name) ?? undefined,
        verificationSource: 'simulated',
      },
    };
  } catch {
    return { valid: false, error: 'Invalid simulated token format.' };
  }
}

/**
 * Whop identity verification targets — honest documentation status
 * (Codex audit, 2026-10):
 *
 * - GET /users/{id}: CONFIRMED in official Whop docs for user OAuth tokens,
 *   but unusable as a bootstrap target — the user id is exactly what this
 *   verifier is trying to derive, so it cannot be queried first.
 * - GET /oauth/userinfo: CONFIRMED in official Whop docs for OAuth user
 *   tokens (verified 2026-10-08 against docs.whop.com authentication guide)
 *   — this is the documented PRIMARY verification target and is always
 *   tried first. x-whop-user-token is the documented same-origin iframe
 *   header for the embedded-app journey; /oauth/userinfo is the documented
 *   web OAuth path.
 * - GET /v5/me: LAST-RESORT legacy compatibility fallback — an endpoint
 *   this application has used historically; UNVERIFIED against official
 *   Whop docs and requires owner confirmation before hosted deploy AND
 *   before removal. It is deliberately ordered LAST so the documented
 *   primary target wins whenever it responds.
 *
 * The multi-target fallback chain is kept intentionally (do NOT remove it
 * silently): a target only counts when Whop returns a successful response
 * carrying a subject/id, so the chain never fabricates identity.
 */
export const WHOP_VERIFICATION_TARGETS: ReadonlyArray<{
  url: string;
  verificationSource: VerifiedWhopIdentity['verificationSource'];
  docsStatus: string;
}> = [
  {
    url: 'https://api.whop.com/oauth/userinfo',
    verificationSource: 'oauth_userinfo',
    docsStatus: 'confirmed_in_official_whop_docs_for_oauth_user_tokens',
  },
  {
    // Ordered LAST deliberately: /oauth/userinfo (above) is the documented
    // primary target; /v5/me is last-resort legacy compatibility only.
    url: 'https://api.whop.com/v5/me',
    verificationSource: 'legacy_me',
    docsStatus: 'last_resort_legacy_compatibility_unverified_against_official_whop_docs_requires_owner_confirmation_before_hosted_deploy_and_before_removal',
  },
];

/**
 * Verify the server-held Whop credential. The browser cache and the cookie
 * value itself are never treated as identity proof.
 *
 * Identity is derived exclusively from a successful Whop API response; see
 * WHOP_VERIFICATION_TARGETS for the per-target documentation status. The
 * /v5/me fallback is kept only for the existing application's legacy token
 * flow and still requires a successful Whop response.
 */
export async function verifyWhopSessionToken(
  token: string,
  options: { fetchImpl?: typeof fetch; mode?: string } = {},
): Promise<WhopSessionVerification> {
  const normalizedToken = token.trim();
  if (!normalizedToken) return { valid: false, error: 'Whop session cookie is missing.' };

  const mode = options.mode ?? process.env.WHOP_MODE ?? process.env.VITE_WHOP_MODE ?? 'live';
  if (mode === 'standalone') return { valid: false, error: 'Whop is disabled in standalone mode.' };
  if (mode === 'simulated') return decodeSimulatedToken(normalizedToken);

  const fetchImpl = options.fetchImpl ?? fetch;
  const verificationTargets = WHOP_VERIFICATION_TARGETS;

  let lastStatus: number | undefined;
  let retryable = false;
  for (const target of verificationTargets) {
    try {
      const response = await fetchImpl(target.url, {
        headers: {
          Authorization: `Bearer ${normalizedToken}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(8_000),
      });
      lastStatus = response.status;
      if (!response.ok) continue;

      const payload = responseRecord(await response.json());
      const providerId = textValue(payload.sub) ?? textValue(payload.id) ?? textValue(payload.user_id);
      if (!providerId) continue;

      return {
        valid: true,
        identity: {
          providerId,
          email: textValue(payload.email) ?? undefined,
          name: textValue(payload.name) ?? undefined,
          verificationSource: target.verificationSource,
        },
      };
    } catch {
      retryable = true;
      // Try the compatibility target without exposing verification details.
    }
  }

  return {
    valid: false,
    error: 'Whop session verification failed.',
    ...(lastStatus === undefined ? {} : { httpStatus: lastStatus }),
    retryable: retryable || lastStatus === undefined || lastStatus >= 500 || lastStatus === 408 || lastStatus === 429,
  };
}

export function parseCookieHeader(cookieHeader: string | undefined, cookieName: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const key = part.slice(0, separator).trim();
    if (key !== cookieName) continue;
    const value = part.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value) || null;
    } catch {
      return value || null;
    }
  }
  return null;
}

export function createOwnerDataClient(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): OwnerDataClient {
  const supabaseUrl = (env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY ?? env.SERVICE_ROLE_KEY ?? env.SB_SERVICE_ROLE_KEY ?? '';
  const anonKey = env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server-side Supabase configuration is missing for utility connector ownership.');
  }
  return { supabaseUrl, serviceRoleKey, anonKey, fetchImpl };
}

async function restRequest<T>(
  client: OwnerDataClient,
  table: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    query?: Record<string, string>;
    body?: unknown;
  } = {},
): Promise<T> {
  const url = new URL(`${client.supabaseUrl}/rest/v1/${table}`);
  Object.entries(options.query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await client.fetchImpl(url, {
    method: options.method ?? 'GET',
    headers: {
      apikey: client.serviceRoleKey,
      Authorization: `Bearer ${client.serviceRoleKey}`,
      Accept: 'application/json',
      ...(options.body === undefined ? {} : {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      }),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Utility connector data request failed with status ${response.status}.`);
  }
  if (!responseText.trim()) return [] as T;

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error('Utility connector data request returned invalid JSON.');
  }
}

async function selectRows<T>(client: OwnerDataClient, table: string, query: Record<string, string>): Promise<T[]> {
  const payload = await restRequest<unknown>(client, table, { query });
  return Array.isArray(payload) ? payload as T[] : [];
}

async function insertRows<T>(client: OwnerDataClient, table: string, body: unknown): Promise<T[]> {
  const payload = await restRequest<unknown>(client, table, { method: 'POST', body });
  return Array.isArray(payload) ? payload as T[] : [];
}

async function patchRows<T>(client: OwnerDataClient, table: string, query: Record<string, string>, body: unknown): Promise<T[]> {
  const payload = await restRequest<unknown>(client, table, { method: 'PATCH', query, body });
  return Array.isArray(payload) ? payload as T[] : [];
}

async function deleteRows(client: OwnerDataClient, table: string, query: Record<string, string>): Promise<void> {
  await restRequest<unknown>(client, table, { method: 'DELETE', query });
}

export async function resolveOrProvisionWhopOwner(
  client: OwnerDataClient,
  identity: VerifiedWhopIdentity,
): Promise<WhopOwner> {
  const identityRows = await selectRows<{ user_id: string; provider_id: string; provider_email: string | null }>(
    client,
    'identity_providers',
    {
      select: 'user_id,provider_id,provider_email',
      provider: 'eq.whop',
      provider_id: `eq.${identity.providerId}`,
      limit: '1',
    },
  );
  const existing = identityRows[0];
  if (existing?.user_id) {
    return {
      userId: existing.user_id,
      providerId: existing.provider_id,
      email: existing.provider_email ?? identity.email ?? null,
    };
  }

  const insertedUsers = await insertRows<{ id: string }>(client, 'users', {
    email: identity.email ?? null,
    name: identity.name ?? null,
    last_login_at: new Date().toISOString(),
  });
  const userId = insertedUsers[0]?.id;
  if (!userId) throw new Error('Verified Whop identity could not be assigned an internal owner.');

  try {
    await insertRows(client, 'identity_providers', {
      user_id: userId,
      provider: 'whop',
      provider_id: identity.providerId,
      provider_email: identity.email ?? null,
      metadata: { provisioned_by: 'verified_whop_session', verification_source: identity.verificationSource },
    });
  } catch {
    // A concurrent first request may have created the mapping. Re-read it;
    // never fall back to the just-created UUID when the provider key already exists.
    const concurrentRows = await selectRows<{ user_id: string; provider_id: string; provider_email: string | null }>(
      client,
      'identity_providers',
      {
        select: 'user_id,provider_id,provider_email',
        provider: 'eq.whop',
        provider_id: `eq.${identity.providerId}`,
        limit: '1',
      },
    );
    const concurrent = concurrentRows[0];
    if (!concurrent?.user_id) throw new Error('Verified Whop identity mapping could not be established.');
    return {
      userId: concurrent.user_id,
      providerId: concurrent.provider_id,
      email: concurrent.provider_email ?? identity.email ?? null,
    };
  }

  return { userId, providerId: identity.providerId, email: identity.email ?? null };
}

/**
 * Return the strongest currently valid Whop entitlement recorded by the
 * server. Unknown tiers, expired rows, and inactive rows never grant access.
 */
export async function getCurrentWhopEntitlement(
  client: OwnerDataClient,
  whopUserId: string,
  now = new Date(),
): Promise<WhopEntitlement> {
  const rows = await selectRows<{
    tier: string;
    status: string;
    start_date: string | null;
    expiry_date: string | null;
  }>(client, 'entitlements', {
    select: 'tier,status,start_date,expiry_date',
    provider: 'eq.whop',
    whop_user_id: `eq.${whopUserId}`,
    status: 'in.(active,trialing)',
    order: 'updated_at.desc',
    limit: '100',
  });

  const tierRank: Record<WhopEntitlement['tier'], number> = {
    free: 0,
    basic: 1,
    pro: 2,
    team: 3,
  };
  let best: WhopEntitlement = { tier: 'free', expiryDate: null };

  for (const row of rows) {
    if (!['active', 'trialing'].includes(row.status)) continue;
    const start = row.start_date ? Date.parse(row.start_date) : Number.NEGATIVE_INFINITY;
    const expiry = row.expiry_date ? Date.parse(row.expiry_date) : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(start) && start !== Number.NEGATIVE_INFINITY) continue;
    if (!Number.isFinite(expiry) && expiry !== Number.POSITIVE_INFINITY) continue;
    if (start > now.getTime() || expiry <= now.getTime()) continue;
    if (!Object.prototype.hasOwnProperty.call(tierRank, row.tier)) continue;

    const tier = row.tier as WhopEntitlement['tier'];
    if (tierRank[tier] > tierRank[best.tier]) {
      best = { tier, expiryDate: row.expiry_date };
    }
  }

  return best;
}

export async function createGreenButtonAuthRequest(
  client: OwnerDataClient,
  params: Omit<GreenButtonAuthRequest, 'id' | 'used_at'> & { metadata?: Record<string, unknown> },
): Promise<void> {
  const rows = await insertRows<GreenButtonAuthRequest>(client, 'utility_connector_auth_requests', {
    state: params.state,
    owner_user_id: params.owner_user_id,
    connector_id: params.connector_id,
    utility_name: params.utility_name,
    display_name: params.display_name,
    expires_at: params.expires_at,
    metadata: params.metadata ?? {},
  });
  if (rows.length !== 1) throw new Error('Green Button authorization state could not be persisted.');
}

export async function consumeGreenButtonAuthRequest(
  client: OwnerDataClient,
  state: string,
  now = new Date(),
): Promise<GreenButtonAuthRequest> {
  const rows = await patchRows<GreenButtonAuthRequest>(
    client,
    'utility_connector_auth_requests',
    {
      state: `eq.${state}`,
      used_at: 'is.null',
      expires_at: `gt.${now.toISOString()}`,
    },
    { used_at: now.toISOString() },
  );
  const request = rows[0];
  if (!request) throw new Error('Green Button authorization state is invalid or expired.');
  return request;
}

export async function deleteGreenButtonAuthRequest(client: OwnerDataClient, state: string): Promise<void> {
  await deleteRows(client, 'utility_connector_auth_requests', { state: `eq.${state}` });
}

export async function findGreenButtonAccount(
  client: OwnerDataClient,
  connectorRef: string,
): Promise<OwnerConnectorAccount | null> {
  const select = 'id,owner_user_id,connector_kind,source_kind,status,jurisdiction,utility_name,display_name,account_holder_ref,last_synced_at,last_error,metadata,updated_at';
  const byHolder = await selectRows<OwnerConnectorAccount>(client, 'utility_connector_accounts', {
    select,
    connector_kind: 'eq.ontario_green_button_cmd',
    account_holder_ref: `eq.${connectorRef}`,
    limit: '1',
  });
  if (byHolder[0]) return byHolder[0];

  const byId = await selectRows<OwnerConnectorAccount>(client, 'utility_connector_accounts', {
    select,
    connector_kind: 'eq.ontario_green_button_cmd',
    id: `eq.${connectorRef}`,
    limit: '1',
  });
  return byId[0] ?? null;
}

export function supabaseEdgeFunctionUrl(client: OwnerDataClient, functionName = GREEN_BUTTON_EDGE_FUNCTION): string {
  return `${client.supabaseUrl}/functions/v1/${functionName}`;
}

export async function requestGreenButtonAuthorizeUrl(
  client: OwnerDataClient,
  params: { utilityName: string; connectorId: string },
): Promise<Record<string, unknown>> {
  const url = new URL(supabaseEdgeFunctionUrl(client));
  url.searchParams.set('action', 'start');
  url.searchParams.set('utility_name', params.utilityName);
  url.searchParams.set('connector_id', params.connectorId);
  const response = await client.fetchImpl(url, {
    headers: {
      Accept: 'application/json',
      ...(client.anonKey ? { apikey: client.anonKey, Authorization: `Bearer ${client.anonKey}` } : {}),
    },
  });
  const payload = responseRecord(await response.json().catch(() => ({})));
  if (!response.ok || typeof payload.authorize_url !== 'string') {
    throw new Error('Green Button authorization URL could not be created.');
  }
  return payload;
}

export async function selectOwnerConnectorAccounts(
  client: OwnerDataClient,
  ownerUserId: string,
  jurisdiction: 'Ontario' | 'Alberta',
): Promise<OwnerConnectorAccount[]> {
  return selectRows<OwnerConnectorAccount>(client, 'utility_connector_accounts', {
    select: 'id,owner_user_id,connector_kind,source_kind,status,jurisdiction,utility_name,display_name,account_holder_ref,last_synced_at,last_error,metadata,updated_at',
    owner_user_id: `eq.${ownerUserId}`,
    jurisdiction: `eq.${jurisdiction}`,
    connector_kind: 'eq.ontario_green_button_cmd',
    order: 'updated_at.desc',
  });
}

export async function selectOwnerSyncRuns(
  client: OwnerDataClient,
  accountIds: string[],
): Promise<OwnerSyncRun[]> {
  if (accountIds.length === 0) return [];
  return selectRows<OwnerSyncRun>(client, 'utility_connector_sync_runs', {
    select: 'id,connector_account_id,run_type,status,observed_at,row_count,warning_count,error_message,metadata,created_at',
    connector_account_id: `in.(${accountIds.join(',')})`,
    order: 'created_at.desc',
    limit: '200',
  });
}

export async function selectOwnerIntervalHistory(
  client: OwnerDataClient,
  accountIds: string[],
): Promise<Record<string, unknown>[]> {
  if (accountIds.length === 0) return [];
  return selectRows<Record<string, unknown>>(client, 'utility_interval_history', {
    select: 'connector_account_id,observed_at,source_kind,source_system,geography_level,geography_id,customer_class,demand_mw,weather_zone,temperature_c,net_load_mw,gross_load_mw,gross_reconstituted_mw,customer_count,feeder_id,substation_id,quality_flags',
    connector_account_id: `in.(${accountIds.join(',')})`,
    source_kind: 'eq.green_button_cmd',
    order: 'observed_at.asc',
    limit: '5000',
  });
}

export function allowedGreenButtonUtilityName(value: unknown): 'London Hydro' | 'Alectra Utilities' {
  return value === 'Alectra Utilities' ? 'Alectra Utilities' : 'London Hydro';
}
