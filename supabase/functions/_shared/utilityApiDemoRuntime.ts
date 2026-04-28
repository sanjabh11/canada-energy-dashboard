export type UtilityApiDemoScenario =
  | 'commercial'
  | 'residential'
  | 'nointervals'
  | 'partialintervals'
  | 'pending_manual_after'
  | 'wait_to_login_after'
  | 'revoked'
  | 'badlogin'
  | 'badlogin_after'
  | 'empty';

type FetchLike = typeof fetch;

type UtilityApiDemoStage =
  | 'authorization_pending'
  | 'meters_discovered'
  | 'collection_pending'
  | 'collection_ready'
  | 'pending_manual'
  | 'wait_to_login'
  | 'no_intervals'
  | 'errored'
  | 'revoked';

interface UtilityApiDemoPollState {
  stage: UtilityApiDemoStage;
  nextPollAfterSeconds: number | null;
  canActivate: boolean;
  canSync: boolean;
  terminalReason: string | null;
}

interface UtilityApiDemoMeterState {
  uid: string | null;
  status: string | null;
  status_message: string | null;
  status_ts: string | null;
  interval_count: number;
  bill_count: number;
  service_tariff: string | null;
  note_types: string[];
}

export interface UtilityApiDemoRuntimeResponse {
  status: number;
  body: Record<string, unknown>;
}

const DEFAULT_SCENARIO: UtilityApiDemoScenario = 'commercial';
const ALLOWED_SCENARIOS = new Set<UtilityApiDemoScenario>([
  'commercial',
  'residential',
  'nointervals',
  'partialintervals',
  'pending_manual_after',
  'wait_to_login_after',
  'revoked',
  'badlogin',
  'badlogin_after',
  'empty',
]);
const UTILITY_API_BASE_URL = 'https://utilityapi.com';

function jsonHeaders(apiToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  };
}

function authorizationHeaders(apiToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiToken}`,
  };
}

function normalizeScenario(input: unknown): UtilityApiDemoScenario {
  const value = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (!value) return DEFAULT_SCENARIO;
  if (ALLOWED_SCENARIOS.has(value as UtilityApiDemoScenario)) {
    return value as UtilityApiDemoScenario;
  }
  throw new Error(`Unsupported UtilityAPI demo scenario: ${String(input)}.`);
}

function ensureConfigured(apiToken: string, formUid: string) {
  if (!apiToken.trim()) {
    throw new Error('UTILITYAPI_DEMO_API_TOKEN is not configured.');
  }
  if (!formUid.trim()) {
    throw new Error('UTILITYAPI_DEMO_FORM_UID is not configured.');
  }
}

function listItems(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  }
  if (!payload || typeof payload !== 'object') return [];
  const objectPayload = payload as Record<string, unknown>;
  const candidates = [
    objectPayload.items,
    objectPayload.results,
    objectPayload.data,
    objectPayload.authorizations,
    objectPayload.meters,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }
  }
  return [];
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function extractAuthorization(payload: unknown): Record<string, unknown> | null {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const objectPayload = payload as Record<string, unknown>;
    const uid = stringValue(objectPayload.uid) ?? stringValue(objectPayload.authorization_uid);
    if (uid) return objectPayload;
  }
  return listItems(payload)[0] ?? null;
}

function extractMeters(payload: unknown, authorization: Record<string, unknown>): Record<string, unknown>[] {
  const authMeters = authorization.meters;
  if (Array.isArray(authMeters)) {
    return authMeters.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
  }
  if (authMeters && typeof authMeters === 'object') {
    const nestedMeters = listItems(authMeters);
    if (nestedMeters.length > 0) {
      return nestedMeters;
    }
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const objectPayload = payload as Record<string, unknown>;
    if (Array.isArray(objectPayload.included)) {
      return objectPayload.included.filter((item): item is Record<string, unknown> => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Record<string, unknown>;
        const itemType = stringValue(record.type);
        const kind = stringValue(record.kind);
        return itemType === 'meter' || kind === 'meter' || record.interval_count !== undefined;
      });
    }
  }

  return [];
}

function collectStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        return stringValue(record.type)
          ?? stringValue(record.note_type)
          ?? stringValue(record.code)
          ?? stringValue(record.status)
          ?? stringValue(record.message);
      }
      return null;
    })
    .filter((item): item is string => Boolean(item));
}

function collectNoteMessages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      return stringValue(record.msg)
        ?? stringValue(record.message)
        ?? stringValue(record.note)
        ?? stringValue(record.status_message);
    })
    .filter((item): item is string => Boolean(item));
}

function normalizeStatusSignal(value: string | null): string {
  return value?.toLowerCase().replace(/[_-]+/g, ' ') ?? '';
}

function includesSignal(signals: string[], pattern: RegExp): boolean {
  return signals.some((signal) => pattern.test(signal));
}

function extractMeterState(meter: Record<string, unknown>): UtilityApiDemoMeterState {
  return {
    uid: stringValue(meter.uid),
    status: stringValue(meter.status) ?? stringValue(meter.collection_status) ?? stringValue(meter.user_status),
    status_message: stringValue(meter.status_message) ?? stringValue(meter.message) ?? stringValue(meter.note),
    status_ts: stringValue(meter.status_ts) ?? stringValue(meter.updated) ?? stringValue(meter.modified),
    interval_count: numberValue(meter.interval_count) ?? 0,
    bill_count: numberValue(meter.bill_count) ?? 0,
    service_tariff: stringValue(meter.service_tariff),
    note_types: Array.from(new Set([
      ...collectStringList(meter.note_types),
      ...collectStringList(meter.notes),
    ])),
  };
}

function derivePollState(
  authorization: Record<string, unknown>,
  meterStates: UtilityApiDemoMeterState[],
  revoked: boolean,
): UtilityApiDemoPollState {
  if (revoked) {
    return {
      stage: 'revoked',
      nextPollAfterSeconds: null,
      canActivate: false,
      canSync: false,
      terminalReason: 'revoked',
    };
  }

  const authorizationSignals = [
    normalizeStatusSignal(stringValue(authorization.status)),
    normalizeStatusSignal(stringValue(authorization.status_message)),
    normalizeStatusSignal(stringValue(authorization.user_status)),
    normalizeStatusSignal(stringValue(authorization.note)),
    ...collectStringList(authorization.note_types).map(normalizeStatusSignal),
    ...collectStringList(authorization.notes).map(normalizeStatusSignal),
  ].filter(Boolean);
  const meterSignals = meterStates.flatMap((meter) => [
    normalizeStatusSignal(meter.status),
    normalizeStatusSignal(meter.status_message),
    ...meter.note_types.map(normalizeStatusSignal),
  ]).filter(Boolean);
  const combinedSignals = [...authorizationSignals, ...meterSignals];
  const totalIntervals = meterStates.reduce((sum, meter) => sum + meter.interval_count, 0);
  const meterCount = meterStates.length;

  if (includesSignal(combinedSignals, /\bpending manual\b/)) {
    return {
      stage: 'pending_manual',
      nextPollAfterSeconds: 30,
      canActivate: false,
      canSync: false,
      terminalReason: 'pending_manual_after',
    };
  }

  if (includesSignal(combinedSignals, /\bwait to login\b|\blogin required\b|\blogin pending\b/)) {
    return {
      stage: 'wait_to_login',
      nextPollAfterSeconds: 30,
      canActivate: false,
      canSync: false,
      terminalReason: 'wait_to_login_after',
    };
  }

  if (includesSignal(combinedSignals, /\bbad ?login\b|\binvalid credential\b|\bauthorization failed\b|\berrored\b|\bfailed\b|\berror\b/)) {
    return {
      stage: 'errored',
      nextPollAfterSeconds: null,
      canActivate: false,
      canSync: false,
      terminalReason: includesSignal(combinedSignals, /\bbad ?login\b/) ? 'badlogin_after' : 'errored',
    };
  }

  if (meterCount === 0) {
    return {
      stage: 'authorization_pending',
      nextPollAfterSeconds: 2,
      canActivate: false,
      canSync: false,
      terminalReason: null,
    };
  }

  if (includesSignal(combinedSignals, /\bcollect(ing|ion)?\b|\bprocessing\b|\bpending\b|\bqueued\b|\brefreshing\b|\brunning\b/)) {
    return {
      stage: 'collection_pending',
      nextPollAfterSeconds: 5,
      canActivate: true,
      canSync: false,
      terminalReason: null,
    };
  }

  if (totalIntervals > 0) {
    return {
      stage: 'collection_ready',
      nextPollAfterSeconds: null,
      canActivate: true,
      canSync: true,
      terminalReason: null,
    };
  }

  if (includesSignal(combinedSignals, /\bno intervals?\b|\bintervals? empty\b|\bno usage\b|\bno historical\b|\bempty\b/)) {
    return {
      stage: 'no_intervals',
      nextPollAfterSeconds: null,
      canActivate: true,
      canSync: true,
      terminalReason: 'no_intervals',
    };
  }

  return {
    stage: 'meters_discovered',
    nextPollAfterSeconds: 2,
    canActivate: true,
    canSync: false,
    terminalReason: null,
  };
}

function assertDemoAuthorization(authorization: Record<string, unknown>): { uid: string; revoked: boolean } {
  const utility = stringValue(authorization.utility);
  const isTest = boolValue(authorization.is_test);
  const uid = stringValue(authorization.uid) ?? stringValue(authorization.authorization_uid);
  const userStatus = stringValue(authorization.user_status) ?? stringValue(authorization.status);
  const accessValid = boolValue(authorization.access_valid);
  const isExpired = boolValue(authorization.is_expired);

  if (!uid) {
    throw new Error('UtilityAPI authorization UID is missing.');
  }
  if (utility !== 'DEMO') {
    throw new Error('UtilityAPI demo route only supports DEMO utility authorizations.');
  }
  if (isTest === false) {
    throw new Error('UtilityAPI demo route refuses non-test authorizations.');
  }

  return {
    uid,
    revoked: userStatus === 'revoked' || accessValid === false || isExpired === true,
  };
}

async function fetchJson(
  fetchImpl: FetchLike,
  apiToken: string,
  url: string,
): Promise<{ response: Response; json: unknown }> {
  const response = await fetchImpl(url, {
    headers: authorizationHeaders(apiToken),
  });

  const text = await response.text();
  const json = text.length > 0 ? JSON.parse(text) as unknown : {};
  return { response, json };
}

async function fetchAuthorizationByUid(
  fetchImpl: FetchLike,
  apiToken: string,
  authorizationUid: string,
  includeMeters = false,
): Promise<{ authorization: Record<string, unknown>; meters: Record<string, unknown>[] }> {
  const url = new URL(`${UTILITY_API_BASE_URL}/api/v2/authorizations/${encodeURIComponent(authorizationUid)}`);
  if (includeMeters) {
    url.searchParams.set('include', 'meters');
  }

  const { response, json } = await fetchJson(fetchImpl, apiToken, url.toString());
  if (!response.ok) {
    throw new Error(`UtilityAPI authorization lookup failed: ${response.status}.`);
  }
  const authorization = extractAuthorization(json);
  if (!authorization) {
    throw new Error('UtilityAPI authorization lookup returned no authorization.');
  }
  const meters = includeMeters ? extractMeters(json, authorization) : [];
  return { authorization, meters };
}

function buildPollBody(
  authorization: Record<string, unknown>,
  meterStates: UtilityApiDemoMeterState[],
  revoked: boolean,
): Record<string, unknown> {
  const authorizationUid = stringValue(authorization.uid) ?? stringValue(authorization.authorization_uid);
  const meterUids = meterStates.map((meter) => meter.uid).filter((value): value is string => Boolean(value));
  const intervalCount = meterStates.reduce((sum, meter) => sum + meter.interval_count, 0);
  const pollState = derivePollState(authorization, meterStates, revoked);
  const authorizationNoteTypes = Array.from(new Set([
    ...collectStringList(authorization.note_types),
    ...collectStringList(authorization.notes),
  ]));
  const authorizationNoteMessages = collectNoteMessages(authorization.notes);

  return {
    ok: pollState.stage !== 'errored',
    authorization_uid: authorizationUid,
    authorization_status: stringValue(authorization.status),
    authorization_status_message:
      stringValue(authorization.status_message)
      ?? stringValue(authorization.note)
      ?? authorizationNoteMessages.at(-1)
      ?? null,
    authorization_note_types: authorizationNoteTypes,
    referral: stringValue(authorization.referral),
    utility: stringValue(authorization.utility),
    is_test: boolValue(authorization.is_test) ?? true,
    revoked,
    stage: pollState.stage,
    meter_count: meterUids.length,
    meter_uids: meterUids,
    interval_count: intervalCount,
    meter_states: meterStates,
    meters: meterStates,
    user_status: stringValue(authorization.user_status) ?? stringValue(authorization.status),
    next_poll_after_seconds: pollState.nextPollAfterSeconds,
    can_activate: pollState.canActivate,
    can_sync: pollState.canSync,
    terminal_reason: pollState.terminalReason,
  };
}

export async function runStartUtilityApiDemo(
  params: { scenario?: unknown },
  deps: {
    apiToken: string;
    formUid: string;
    fetchImpl?: FetchLike;
  },
): Promise<UtilityApiDemoRuntimeResponse> {
  ensureConfigured(deps.apiToken, deps.formUid);
  const scenario = normalizeScenario(params.scenario);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `${UTILITY_API_BASE_URL}/api/v2/forms/${encodeURIComponent(deps.formUid)}/test-submit`,
    {
      method: 'POST',
      headers: jsonHeaders(deps.apiToken),
      body: JSON.stringify({
        utility: 'DEMO',
        scenario,
      }),
    },
  );

  const body = await response.json();
  if (!response.ok) {
    return {
      status: response.status,
      body: {
        error: typeof body?.error === 'string' ? body.error : `UtilityAPI demo start failed: ${response.status}.`,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      utility: 'DEMO',
      scenario,
      referral: body?.referral ?? null,
      stage: 'authorization_pending',
      next_poll_after_seconds: 2,
      can_activate: false,
      can_sync: false,
    },
  };
}

export async function runPollUtilityApiDemo(
  params: { referral?: unknown; authorization_uid?: unknown },
  deps: {
    apiToken: string;
    formUid: string;
    fetchImpl?: FetchLike;
  },
): Promise<UtilityApiDemoRuntimeResponse> {
  ensureConfigured(deps.apiToken, deps.formUid);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const authorizationUid = stringValue(params.authorization_uid);

  if (authorizationUid) {
    const { authorization, meters } = await fetchAuthorizationByUid(fetchImpl, deps.apiToken, authorizationUid, true);
    const demoAuth = assertDemoAuthorization(authorization);
    const meterStates = meters.map(extractMeterState);
    return {
      status: 200,
      body: buildPollBody(authorization, meterStates, demoAuth.revoked),
    };
  }

  const referral = stringValue(params.referral);
  if (!referral) {
    return {
      status: 400,
      body: { error: 'referral or authorization_uid is required.' },
    };
  }

  const url = new URL(`${UTILITY_API_BASE_URL}/api/v2/authorizations`);
  url.searchParams.set('referrals', referral);
  url.searchParams.set('include', 'meters');
  const { response, json } = await fetchJson(fetchImpl, deps.apiToken, url.toString());
  if (!response.ok) {
    return {
      status: response.status,
      body: {
        error: `UtilityAPI authorization lookup failed: ${response.status}.`,
      },
    };
  }

  const authorization = extractAuthorization(json);
  if (!authorization) {
    return {
      status: 202,
      body: {
        ok: false,
        pending: true,
        stage: 'authorization_pending',
        referral,
        next_poll_after_seconds: 2,
        can_activate: false,
        can_sync: false,
        meter_states: [],
        meter_uids: [],
      },
    };
  }

  const demoAuth = assertDemoAuthorization(authorization);
  const meterStates = extractMeters(json, authorization).map(extractMeterState);
  return {
    status: 200,
    body: buildPollBody(authorization, meterStates, demoAuth.revoked),
  };
}

export async function runActivateUtilityApiDemo(
  params: { authorization_uid?: unknown; meter_uids?: unknown },
  deps: {
    apiToken: string;
    formUid: string;
    fetchImpl?: FetchLike;
  },
): Promise<UtilityApiDemoRuntimeResponse> {
  ensureConfigured(deps.apiToken, deps.formUid);
  const authorizationUid = stringValue(params.authorization_uid);
  if (!authorizationUid) {
    return {
      status: 400,
      body: { error: 'authorization_uid is required.' },
    };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const { authorization } = await fetchAuthorizationByUid(fetchImpl, deps.apiToken, authorizationUid);
  assertDemoAuthorization(authorization);

  const meterUids = Array.isArray(params.meter_uids)
    ? params.meter_uids.map((value) => stringValue(value)).filter((value): value is string => Boolean(value))
    : [];

  if (meterUids.length === 0) {
    return {
      status: 400,
      body: { error: 'meter_uids is required.' },
    };
  }

  const response = await fetchImpl(`${UTILITY_API_BASE_URL}/api/v2/meters/historical-collection`, {
    method: 'POST',
    headers: jsonHeaders(deps.apiToken),
    body: JSON.stringify({
      meters: meterUids,
      collection_duration: 3,
    }),
  });
  const body = await response.json();

  if (!response.ok) {
    return {
      status: response.status,
      body: {
        error: typeof body?.error === 'string' ? body.error : `UtilityAPI historical collection failed: ${response.status}.`,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      authorization_uid: authorizationUid,
      meter_uids: meterUids,
      collection_duration_months: 3,
      stage: 'collection_pending',
      next_poll_after_seconds: 5,
      can_activate: true,
      can_sync: false,
    },
  };
}

export async function runSyncUtilityApiDemo(
  params: { authorization_uid?: unknown },
  deps: {
    apiToken: string;
    formUid: string;
    fetchImpl?: FetchLike;
  },
): Promise<UtilityApiDemoRuntimeResponse> {
  ensureConfigured(deps.apiToken, deps.formUid);
  const authorizationUid = stringValue(params.authorization_uid);
  if (!authorizationUid) {
    return {
      status: 400,
      body: { error: 'authorization_uid is required.' },
    };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const { authorization, meters } = await fetchAuthorizationByUid(fetchImpl, deps.apiToken, authorizationUid, true);
  const demoAuth = assertDemoAuthorization(authorization);
  const meterStates = meters.map(extractMeterState);
  const pollState = derivePollState(authorization, meterStates, demoAuth.revoked);

  if (pollState.stage === 'authorization_pending' || pollState.stage === 'meters_discovered' || pollState.stage === 'collection_pending') {
    return {
      status: 202,
      body: {
        ok: false,
        pending: true,
        stage: pollState.stage,
        retry_after_seconds: pollState.nextPollAfterSeconds ?? 5,
        can_activate: pollState.canActivate,
        can_sync: pollState.canSync,
      },
    };
  }

  if (pollState.stage === 'pending_manual' || pollState.stage === 'wait_to_login' || pollState.stage === 'errored' || pollState.stage === 'revoked') {
    return {
      status: 409,
      body: {
        ok: false,
        stage: pollState.stage,
        terminal_reason: pollState.terminalReason,
        error: `UtilityAPI demo sync blocked while authorization is in ${pollState.stage}.`,
      },
    };
  }

  const response = await fetchImpl(
    `${UTILITY_API_BASE_URL}/DataCustodian/espi/1_1/resource/Batch/Subscription/${encodeURIComponent(authorizationUid)}`,
    {
      headers: authorizationHeaders(deps.apiToken),
    },
  );

  if (response.status === 202) {
    return {
      status: 202,
      body: {
        ok: false,
        pending: true,
        stage: pollState.stage,
        retry_after_seconds: Number(response.headers.get('Retry-After') ?? '5'),
        can_activate: pollState.canActivate,
        can_sync: pollState.canSync,
      },
    };
  }

  const rawXml = await response.text();
  if (!response.ok) {
    return {
      status: response.status,
      body: {
        error: `UtilityAPI Green Button XML sync failed: ${response.status}.`,
        stage: pollState.stage,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      authorization_uid: authorizationUid,
      raw_xml: rawXml,
      content_length: rawXml.length,
      stage: pollState.stage,
      meter_uids: meterStates.map((meter) => meter.uid).filter((value): value is string => Boolean(value)),
      meter_states: meterStates,
      can_sync: false,
    },
  };
}

export async function runRevokeUtilityApiDemo(
  params: { authorization_uid?: unknown },
  deps: {
    apiToken: string;
    formUid: string;
    fetchImpl?: FetchLike;
  },
): Promise<UtilityApiDemoRuntimeResponse> {
  ensureConfigured(deps.apiToken, deps.formUid);
  const authorizationUid = stringValue(params.authorization_uid);
  if (!authorizationUid) {
    return {
      status: 400,
      body: { error: 'authorization_uid is required.' },
    };
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const { authorization } = await fetchAuthorizationByUid(fetchImpl, deps.apiToken, authorizationUid);
  assertDemoAuthorization(authorization);

  const response = await fetchImpl(
    `${UTILITY_API_BASE_URL}/api/v2/authorizations/${encodeURIComponent(authorizationUid)}/revoke`,
    {
      method: 'POST',
      headers: authorizationHeaders(deps.apiToken),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    return {
      status: response.status,
      body: {
        error: text || `UtilityAPI revoke failed: ${response.status}.`,
      },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      authorization_uid: authorizationUid,
      revoked: true,
      stage: 'revoked',
      terminal_reason: 'revoked',
    },
  };
}
