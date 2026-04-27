export type UtilityConnectorBridgeRoute = 'callback' | 'token' | 'feed' | 'revoke';

export interface UtilityConnectorBridgeNonceRecord {
  direction: 'bridge_to_supabase' | 'supabase_to_bridge';
  signingKeyId: string;
  nonce: string;
  issuer: string;
  requestId: string | null;
  expiresAt: string;
  metadata?: Record<string, unknown>;
}

export interface UtilityConnectorBridgeVerificationSuccess {
  ok: true;
  metadata: {
    signingKeyId: string;
    issuer: string;
    nonce: string;
    timestamp: string;
    requestId: string | null;
    originalHost: string;
    originalProto: string | null;
    clientIp: string | null;
    bodySha256: string;
  };
}

export interface UtilityConnectorBridgeVerificationFailure {
  ok: false;
  error: string;
}

type HeadersLike = Pick<Headers, 'get'> | Record<string, string | undefined>;

function normalizeUrl(raw?: string | null): string {
  return String(raw ?? '').trim().replace(/\/$/, '');
}

function normalizeHeaderValue(value?: string | null): string {
  return String(value ?? '').trim();
}

function getHeader(headers: HeadersLike, name: string): string {
  const normalizedName = name.toLowerCase();
  if (typeof (headers as Headers).get === 'function') {
    return normalizeHeaderValue((headers as Headers).get(name) ?? (headers as Headers).get(normalizedName));
  }

  const record = headers as Record<string, string | undefined>;
  return normalizeHeaderValue(record[name] ?? record[normalizedName]);
}

export function shouldUseUtilityConnectorBridge(utilityName?: string | null, bridgeBaseUrl?: string | null): boolean {
  return String(utilityName ?? '').trim() === 'London Hydro' && normalizeUrl(bridgeBaseUrl).length > 0;
}

export function buildUtilityConnectorBridgeUrl(
  bridgeBaseUrl: string,
  route: UtilityConnectorBridgeRoute,
  utilityName?: string | null,
): string {
  const normalizedBaseUrl = normalizeUrl(bridgeBaseUrl);
  if (!normalizedBaseUrl) return '';

  if (route === 'callback') {
    const callbackUrl = new URL(`${normalizedBaseUrl}/cmd/callback`);
    if (utilityName) {
      callbackUrl.searchParams.set('utility_name', utilityName);
    }
    return callbackUrl.toString();
  }

  return `${normalizedBaseUrl}/cmd/${route}`;
}

export function buildUtilityConnectorBridgeHeaders(sharedSecret?: string | null): Record<string, string> {
  const normalizedSharedSecret = String(sharedSecret ?? '').trim();
  if (!normalizedSharedSecret) return {};
  return {
    'x-utility-connector-bridge-secret': normalizedSharedSecret,
  };
}

export async function buildUtilityConnectorBridgeRequestSignature(params: {
  method: string;
  requestUrl: string;
  bodyText?: string | null;
  signingSecret: string;
  signingKeyId: string;
  issuer: string;
  originalHost: string;
  originalProto?: string | null;
  clientIp?: string | null;
  requestId?: string | null;
  timestamp?: string | null;
  nonce?: string | null;
}): Promise<Record<string, string>> {
  const requestUrl = new URL(params.requestUrl);
  const method = String(params.method ?? 'GET').trim().toUpperCase();
  const timestamp = normalizeHeaderValue(params.timestamp) || new Date().toISOString();
  const nonce = normalizeHeaderValue(params.nonce) || crypto.randomUUID();
  const requestId = normalizeHeaderValue(params.requestId) || crypto.randomUUID();
  const bodySha256 = await sha256Hex(String(params.bodyText ?? ''));
  const originalHost = normalizeHeaderValue(params.originalHost) || requestUrl.host;
  const issuer = normalizeHeaderValue(params.issuer);
  const signingKeyId = normalizeHeaderValue(params.signingKeyId);
  const canonical = buildUtilityConnectorBridgeCanonicalString({
    method,
    path: requestUrl.pathname,
    query: requestUrl.search,
    timestamp,
    nonce,
    bodySha256,
    originalHost,
    issuer,
  });
  const signature = await hmacSha256Hex(String(params.signingSecret ?? ''), canonical);

  return {
    'x-utility-connector-bridge-key-id': signingKeyId,
    'x-utility-connector-bridge-issuer': issuer,
    'x-utility-connector-bridge-timestamp': timestamp,
    'x-utility-connector-bridge-nonce': nonce,
    'x-utility-connector-bridge-body-sha256': bodySha256,
    'x-utility-connector-bridge-signature': signature,
    'x-utility-connector-original-host': originalHost,
    'x-utility-connector-original-proto': normalizeHeaderValue(params.originalProto),
    'x-utility-connector-client-ip': normalizeHeaderValue(params.clientIp),
    'x-utility-connector-request-id': requestId,
  };
}

export async function verifyUtilityConnectorBridgeRequestSignature(params: {
  method: string;
  requestUrl: string;
  bodyText?: string | null;
  headers: HeadersLike;
  signingSecret: string;
  expectedKeyId?: string | null;
  expectedIssuer?: string | null;
  expectedHost?: string | null;
  allowedClockSkewSec?: number;
  now?: () => Date;
  registerNonce?: (record: UtilityConnectorBridgeNonceRecord) => Promise<boolean> | boolean;
  direction: UtilityConnectorBridgeNonceRecord['direction'];
}): Promise<UtilityConnectorBridgeVerificationSuccess | UtilityConnectorBridgeVerificationFailure> {
  const signingKeyId = getHeader(params.headers, 'x-utility-connector-bridge-key-id');
  const issuer = getHeader(params.headers, 'x-utility-connector-bridge-issuer');
  const timestamp = getHeader(params.headers, 'x-utility-connector-bridge-timestamp');
  const nonce = getHeader(params.headers, 'x-utility-connector-bridge-nonce');
  const signature = getHeader(params.headers, 'x-utility-connector-bridge-signature');
  const suppliedBodySha256 = getHeader(params.headers, 'x-utility-connector-bridge-body-sha256');
  const originalHost = getHeader(params.headers, 'x-utility-connector-original-host');
  const originalProto = getHeader(params.headers, 'x-utility-connector-original-proto') || null;
  const clientIp = getHeader(params.headers, 'x-utility-connector-client-ip') || null;
  const requestId = getHeader(params.headers, 'x-utility-connector-request-id') || null;

  if (!signingKeyId || !issuer || !timestamp || !nonce || !signature || !suppliedBodySha256 || !originalHost) {
    return { ok: false, error: 'Missing bridge provenance headers.' };
  }

  const expectedKeyId = normalizeHeaderValue(params.expectedKeyId);
  if (expectedKeyId && expectedKeyId !== signingKeyId) {
    return { ok: false, error: 'Unexpected bridge signing key identifier.' };
  }

  const expectedIssuer = normalizeHeaderValue(params.expectedIssuer);
  if (expectedIssuer && expectedIssuer !== issuer) {
    return { ok: false, error: 'Unexpected bridge issuer.' };
  }

  const expectedHost = normalizeHeaderValue(params.expectedHost);
  if (expectedHost && expectedHost !== originalHost) {
    return { ok: false, error: 'Unexpected original host for bridge provenance.' };
  }

  const bodySha256 = await sha256Hex(String(params.bodyText ?? ''));
  if (!constantTimeEqual(suppliedBodySha256, bodySha256)) {
    return { ok: false, error: 'Bridge payload digest mismatch.' };
  }

  const requestUrl = new URL(params.requestUrl);
  const canonical = buildUtilityConnectorBridgeCanonicalString({
    method: String(params.method ?? 'GET').trim().toUpperCase(),
    path: requestUrl.pathname,
    query: requestUrl.search,
    timestamp,
    nonce,
    bodySha256,
    originalHost,
    issuer,
  });
  const expectedSignature = await hmacSha256Hex(String(params.signingSecret ?? ''), canonical);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return { ok: false, error: 'Invalid bridge signature.' };
  }

  const allowedClockSkewSec = Number.isFinite(params.allowedClockSkewSec) ? Number(params.allowedClockSkewSec) : 300;
  const now = params.now ?? (() => new Date());
  const issuedAt = Date.parse(timestamp);
  if (!Number.isFinite(issuedAt)) {
    return { ok: false, error: 'Bridge timestamp is invalid.' };
  }
  const skewMs = Math.abs(now().getTime() - issuedAt);
  if (skewMs > allowedClockSkewSec * 1000) {
    return { ok: false, error: 'Bridge timestamp is outside the allowed clock-skew window.' };
  }

  if (params.registerNonce) {
    const accepted = await params.registerNonce({
      direction: params.direction,
      signingKeyId,
      nonce,
      issuer,
      requestId,
      expiresAt: new Date(issuedAt + allowedClockSkewSec * 1000).toISOString(),
      metadata: {
        original_host: originalHost,
        original_proto: originalProto,
        client_ip: clientIp,
      },
    });
    if (!accepted) {
      return { ok: false, error: 'Bridge nonce replay detected.' };
    }
  }

  return {
    ok: true,
    metadata: {
      signingKeyId,
      issuer,
      nonce,
      timestamp,
      requestId,
      originalHost,
      originalProto,
      clientIp,
      bodySha256,
    },
  };
}

export function buildUtilityConnectorBridgeCanonicalString(params: {
  method: string;
  path: string;
  query?: string | null;
  timestamp: string;
  nonce: string;
  bodySha256: string;
  originalHost: string;
  issuer: string;
}): string {
  return [
    String(params.method ?? '').trim().toUpperCase(),
    normalizeHeaderValue(params.path) || '/',
    String(params.query ?? '').trim(),
    normalizeHeaderValue(params.timestamp),
    normalizeHeaderValue(params.nonce),
    normalizeHeaderValue(params.bodySha256),
    normalizeHeaderValue(params.originalHost),
    normalizeHeaderValue(params.issuer),
  ].join('\n');
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(secret: string, input: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  return Array.from(new Uint8Array(signature))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  if (leftBytes.length !== rightBytes.length) return false;

  let result = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    result |= leftBytes[index] ^ rightBytes[index];
  }
  return result === 0;
}
