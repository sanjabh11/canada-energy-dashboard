import { readFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { randomUUID } from 'node:crypto';
import {
  buildUtilityConnectorBridgeRequestSignature,
  verifyUtilityConnectorBridgeRequestSignature,
} from '../../../supabase/functions/_shared/utilityConnectorBridge.ts';

const BRIDGE_SIGNER_PORT = Number(process.env.BRIDGE_SIGNER_PORT ?? '8787');
const CALLBACK_BASE_URL = String(process.env.SUPABASE_GREEN_BUTTON_CALLBACK_URL_BASE ?? '').trim();
const SIGNING_KEY_ID = String(process.env.UTILITY_CONNECTOR_BRIDGE_SIGNING_KEY_ID ?? '').trim();
const BRIDGE_TO_SUPABASE_SECRET = String(process.env.UTILITY_CONNECTOR_BRIDGE_TO_SUPABASE_SIGNING_SECRET ?? '').trim();
const SUPABASE_TO_BRIDGE_SECRET = String(process.env.UTILITY_CONNECTOR_SUPABASE_TO_BRIDGE_SIGNING_SECRET ?? '').trim();
const ALLOWED_CLOCK_SKEW_SEC = Number(process.env.UTILITY_CONNECTOR_BRIDGE_ALLOWED_CLOCK_SKEW_SEC ?? '300');
const EXPECTED_HOST = String(process.env.UTILITY_CONNECTOR_BRIDGE_EXPECTED_HOST ?? '').trim();
const EXPECTED_ISSUER = String(process.env.UTILITY_CONNECTOR_BRIDGE_EXPECTED_ISSUER ?? 'supabase-utility-connector-green-button').trim();
const UPSTREAM_TLS_MODE = String(process.env.UTILITY_BRIDGE_UPSTREAM_TLS_MODE ?? 'server_tls').trim() === 'mtls_upstream'
  ? 'mtls_upstream'
  : 'server_tls';

const upstreamConfig = {
  token: String(process.env.LONDON_HYDRO_TOKEN_URL ?? '').trim(),
  feed: String(process.env.LONDON_HYDRO_FEED_URL ?? '').trim(),
  revoke: String(process.env.LONDON_HYDRO_REVOKE_URL ?? '').trim(),
  tlsServerName: String(process.env.LONDON_HYDRO_TLS_SERVER_NAME ?? '').trim(),
  clientCert: optionalFile(process.env.LONDON_HYDRO_CLIENT_CERT_FILE),
  clientKey: optionalFile(process.env.LONDON_HYDRO_CLIENT_KEY_FILE),
  caBundle: optionalFile(process.env.LONDON_HYDRO_CA_BUNDLE_FILE),
};

const replayCache = new Map<string, number>();

const server = createServer(async (req, res) => {
  try {
    if (!req.url) {
      respondJson(res, 400, { error: 'Missing request URL.' });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    if (req.method === 'GET' && url.pathname === '/cmd/callback') {
      await handleCallback(req, res, url);
      return;
    }

    if (url.pathname === '/cmd/token' || url.pathname === '/cmd/feed' || url.pathname === '/cmd/revoke') {
      await handlePrivateBridgeRoute(req, res, url);
      return;
    }

    respondJson(res, 404, { error: 'Unknown bridge route.' });
  } catch (error) {
    respondJson(res, 500, {
      error: error instanceof Error ? error.message : 'Bridge signer failure.',
    });
  }
});

server.listen(BRIDGE_SIGNER_PORT, '127.0.0.1', () => {
  console.log(`Utility connector signer listening on http://127.0.0.1:${BRIDGE_SIGNER_PORT}`);
});

async function handleCallback(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (!CALLBACK_BASE_URL || !SIGNING_KEY_ID || !BRIDGE_TO_SUPABASE_SECRET) {
    respondJson(res, 500, { error: 'Callback signing configuration is incomplete.' });
    return;
  }

  const bodyText = await readRequestBody(req);
  const callbackTarget = mergeCallbackUrl(CALLBACK_BASE_URL, url);
  const originalHost = getOriginalHost(req, url);
  const requestId = randomUUID();
  const signedHeaders = await buildUtilityConnectorBridgeRequestSignature({
    method: 'GET',
    requestUrl: callbackTarget.toString(),
    bodyText,
    signingSecret: BRIDGE_TO_SUPABASE_SECRET,
    signingKeyId: SIGNING_KEY_ID,
    issuer: 'utility-connector-bridge-signer',
    originalHost,
    originalProto: getOriginalProto(req),
    clientIp: getClientIp(req),
    requestId,
  });

  const response = await fetch(callbackTarget, {
    method: 'GET',
    headers: signedHeaders,
  });
  await copyFetchResponse(res, response);
}

async function handlePrivateBridgeRoute(req: IncomingMessage, res: ServerResponse, url: URL) {
  if (!SIGNING_KEY_ID || !SUPABASE_TO_BRIDGE_SECRET || !EXPECTED_HOST) {
    respondJson(res, 500, { error: 'Signer verification configuration is incomplete.' });
    return;
  }

  const bodyText = await readRequestBody(req);
  const publicRequestUrl = new URL(`https://${EXPECTED_HOST}${url.pathname}${url.search}`);
  const verification = await verifyUtilityConnectorBridgeRequestSignature({
    method: req.method ?? 'GET',
    requestUrl: publicRequestUrl.toString(),
    bodyText,
    headers: nodeHeadersToRecord(req),
    signingSecret: SUPABASE_TO_BRIDGE_SECRET,
    expectedKeyId: SIGNING_KEY_ID,
    expectedIssuer: EXPECTED_ISSUER,
    expectedHost: EXPECTED_HOST,
    allowedClockSkewSec: ALLOWED_CLOCK_SKEW_SEC,
    direction: 'supabase_to_bridge',
    registerNonce: async (record) => registerReplayNonce(record.direction, record.signingKeyId, record.nonce, record.expiresAt),
  });

  if (!verification.ok) {
    respondJson(res, 401, { error: verification.error });
    return;
  }

  const upstreamUrl = resolveUpstreamUrl(url.pathname);
  if (!upstreamUrl) {
    respondJson(res, 500, { error: 'Upstream bridge route is not configured.' });
    return;
  }

  const headers = buildUpstreamHeaders(req);
  const response = await proxyUpstreamRequest({
    requestUrl: upstreamUrl,
    method: req.method ?? 'GET',
    bodyText,
    headers,
  });
  await copyRawResponse(res, response);
}

function mergeCallbackUrl(baseUrl: string, incomingUrl: URL) {
  const callbackTarget = new URL(baseUrl);
  incomingUrl.searchParams.forEach((value, key) => {
    callbackTarget.searchParams.set(key, value);
  });
  return callbackTarget;
}

function resolveUpstreamUrl(pathname: string) {
  if (pathname === '/cmd/token') return upstreamConfig.token;
  if (pathname === '/cmd/feed') return upstreamConfig.feed;
  if (pathname === '/cmd/revoke') return upstreamConfig.revoke;
  return '';
}

function buildUpstreamHeaders(req: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  const authorization = normalizeHeader(req.headers.authorization);
  const contentType = normalizeHeader(req.headers['content-type']);
  const accept = normalizeHeader(req.headers.accept);

  if (authorization) headers.authorization = authorization;
  if (contentType) headers['content-type'] = contentType;
  if (accept) headers.accept = accept;

  return headers;
}

async function proxyUpstreamRequest(params: {
  requestUrl: string;
  method: string;
  bodyText: string;
  headers: Record<string, string>;
}) {
  if (UPSTREAM_TLS_MODE === 'mtls_upstream') {
    return await sendRawRequest(params.requestUrl, {
      method: params.method,
      headers: params.headers,
      bodyText: params.bodyText,
      tlsServerName: upstreamConfig.tlsServerName,
      clientCert: upstreamConfig.clientCert,
      clientKey: upstreamConfig.clientKey,
      caBundle: upstreamConfig.caBundle,
    });
  }

  const response = await fetch(params.requestUrl, {
    method: params.method,
    headers: params.headers,
    body: shouldSendBody(params.method, params.bodyText) ? params.bodyText : undefined,
  });
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.text(),
  };
}

async function sendRawRequest(
  requestUrl: string,
  options: {
    method: string;
    headers: Record<string, string>;
    bodyText: string;
    tlsServerName?: string;
    clientCert?: string | null;
    clientKey?: string | null;
    caBundle?: string | null;
  },
) {
  const url = new URL(requestUrl);
  const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
  const headers = {
    ...options.headers,
  };
  if (shouldSendBody(options.method, options.bodyText)) {
    headers['content-length'] = Buffer.byteLength(options.bodyText).toString();
  }

  return await new Promise<{ status: number; headers: Record<string, string>; body: string }>((resolve, reject) => {
    const request = transport(url, {
      method: options.method,
      headers,
      servername: options.tlsServerName || undefined,
      cert: options.clientCert || undefined,
      key: options.clientKey || undefined,
      ca: options.caBundle || undefined,
    }, async (response) => {
      try {
        const body = await readNodeResponseBody(response);
        resolve({
          status: response.statusCode ?? 502,
          headers: normalizeResponseHeaders(response.headers),
          body,
        });
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
    if (shouldSendBody(options.method, options.bodyText)) {
      request.write(options.bodyText);
    }
    request.end();
  });
}

function registerReplayNonce(direction: string, signingKeyId: string, nonce: string, expiresAt: string) {
  const now = Date.now();
  for (const [key, expiry] of replayCache.entries()) {
    if (expiry <= now) {
      replayCache.delete(key);
    }
  }

  const cacheKey = `${direction}:${signingKeyId}:${nonce}`;
  if (replayCache.has(cacheKey)) {
    return false;
  }

  replayCache.set(cacheKey, Date.parse(expiresAt));
  return true;
}

function getOriginalHost(req: IncomingMessage, fallbackUrl: URL) {
  return normalizeHeader(req.headers['x-forwarded-host'])
    || normalizeHeader(req.headers.host)
    || fallbackUrl.host;
}

function getOriginalProto(req: IncomingMessage) {
  return normalizeHeader(req.headers['x-forwarded-proto']) || 'https';
}

function getClientIp(req: IncomingMessage) {
  const forwardedFor = normalizeHeader(req.headers['x-forwarded-for']);
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }
  return req.socket.remoteAddress ?? null;
}

function normalizeHeader(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? '').trim();
  return String(value ?? '').trim();
}

function nodeHeadersToRecord(req: IncomingMessage): Record<string, string> {
  return Object.fromEntries(
    Object.entries(req.headers).map(([key, value]) => [key, normalizeHeader(value)]),
  );
}

function normalizeResponseHeaders(headers: IncomingMessage['headers']) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, normalizeHeader(value)]),
  );
}

function shouldSendBody(method: string, bodyText: string) {
  return method.toUpperCase() !== 'GET' && bodyText.length > 0;
}

async function readRequestBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readNodeResponseBody(response: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of response) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function copyFetchResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  const contentType = response.headers.get('content-type');
  if (contentType) {
    res.setHeader('content-type', contentType);
  }
  res.end(await response.text());
}

async function copyRawResponse(
  res: ServerResponse,
  response: { status: number; headers: Record<string, string>; body: string },
) {
  res.statusCode = response.status;
  const contentType = response.headers['content-type'];
  if (contentType) {
    res.setHeader('content-type', contentType);
  }
  res.end(response.body);
}

function respondJson(res: ServerResponse, status: number, body: Record<string, unknown>) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function optionalFile(filePath?: string) {
  const normalizedPath = String(filePath ?? '').trim();
  if (!normalizedPath) return null;
  return readFileSync(normalizedPath, 'utf8');
}
