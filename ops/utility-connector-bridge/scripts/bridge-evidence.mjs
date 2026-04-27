#!/usr/bin/env node

import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const [, , command, ...argv] = process.argv;

if (!command || command === '--help' || command === '-h') {
  printHelp();
  process.exit(0);
}

try {
  if (command === 'layer-a') {
    await runLayerA(parseArgs(argv));
    process.exit(0);
  }

  if (command === 'layer-b') {
    await runLayerB(parseArgs(argv));
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function printHelp() {
  console.log(`Utility bridge evidence helper

Usage:
  node ops/utility-connector-bridge/scripts/bridge-evidence.mjs layer-a --bridge-base-url https://gb-staging.example.dev --utility-name "London Hydro"
  node ops/utility-connector-bridge/scripts/bridge-evidence.mjs layer-b --request-url https://gb-staging.example.dev/cmd/feed --secret "$UTILITY_CONNECTOR_SUPABASE_TO_BRIDGE_SIGNING_SECRET" --key-id "$UTILITY_CONNECTOR_BRIDGE_SIGNING_KEY_ID" --issuer "$UTILITY_CONNECTOR_BRIDGE_EXPECTED_ISSUER" --original-host gb-staging.example.dev

Commands:
  layer-a   Capture callback reachability against /cmd/callback
  layer-b   Capture signed bridge-contract evidence against /cmd/token, /cmd/feed, or /cmd/revoke
`);
}

function parseArgs(args) {
  const result = { _: [] };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--')) {
      result._.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      result[key] = 'true';
      continue;
    }

    if (result[key] === undefined) {
      result[key] = next;
    } else if (Array.isArray(result[key])) {
      result[key].push(next);
    } else {
      result[key] = [result[key], next];
    }
    index += 1;
  }

  return result;
}

async function runLayerA(args) {
  const bridgeBaseUrl = readString(args['bridge-base-url']);
  const explicitUrl = readString(args.url);
  const utilityName = readString(args['utility-name']) || 'London Hydro';
  const code = readString(args.code) || 'staging-smoke-code';
  const state = readString(args.state) || 'staging-smoke-state';
  const connectorId = readString(args['connector-id']) || 'staging-smoke-connector';
  const displayName = readString(args['display-name']) || `${utilityName} staging smoke test`;
  const expectStatus = parseExpectedStatuses(args['expect-status']);

  const requestUrl = explicitUrl || buildCallbackUrl({
    bridgeBaseUrl,
    utilityName,
    code,
    state,
    connectorId,
    displayName,
  });

  if (!requestUrl) {
    throw new Error('Provide --bridge-base-url or --url for layer-a.');
  }

  const response = await fetch(requestUrl, { method: 'GET', redirect: 'manual' });
  const responseText = await response.text();

  console.log(`Layer A request URL: ${requestUrl}`);
  console.log(`HTTP status: ${response.status}`);
  console.log(`Content-Type: ${response.headers.get('content-type') || '<none>'}`);
  console.log(`Location: ${response.headers.get('location') || '<none>'}`);
  console.log('Body preview:');
  console.log(trimPreview(responseText));

  if (expectStatus.size > 0 && !expectStatus.has(response.status)) {
    throw new Error(`Layer A expected one of [${[...expectStatus].join(', ')}] but received ${response.status}.`);
  }
}

async function runLayerB(args) {
  const requestUrl = readString(args['request-url']) || buildRouteUrl({
    bridgeBaseUrl: readString(args['bridge-base-url']),
    route: readString(args.route),
  });
  if (!requestUrl) {
    throw new Error('Provide --request-url or --bridge-base-url with --route for layer-b.');
  }

  const method = (readString(args.method) || inferMethodFromUrl(requestUrl)).toUpperCase();
  const secret = readString(args.secret) || process.env.UTILITY_CONNECTOR_SUPABASE_TO_BRIDGE_SIGNING_SECRET || '';
  const keyId = readString(args['key-id']) || process.env.UTILITY_CONNECTOR_BRIDGE_SIGNING_KEY_ID || '';
  const issuer = readString(args.issuer) || process.env.UTILITY_CONNECTOR_BRIDGE_EXPECTED_ISSUER || 'supabase-utility-connector-green-button';
  const originalHost = readString(args['original-host']) || process.env.UTILITY_CONNECTOR_BRIDGE_EXPECTED_HOST || new URL(requestUrl).host;
  const originalProto = readString(args['original-proto']) || 'https';
  const clientIp = readString(args['client-ip']) || '127.0.0.1';
  const requestId = readString(args['request-id']) || randomUUID();
  const bodyText = await resolveBodyText(args);
  const extraHeaders = parseHeaders(args.header);
  const expectStatus = parseExpectedStatuses(args['expect-status']);
  const dryRun = String(args['dry-run'] ?? 'false') === 'true';

  if (!secret || !keyId) {
    throw new Error('Layer B requires --secret and --key-id (or matching env vars).');
  }

  const signatureHeaders = buildSignatureHeaders({
    method,
    requestUrl,
    bodyText,
    secret,
    keyId,
    issuer,
    originalHost,
    originalProto,
    clientIp,
    requestId,
  });
  const requestHeaders = {
    ...signatureHeaders,
    ...extraHeaders,
  };

  console.log(`Layer B request URL: ${requestUrl}`);
  console.log(`Method: ${method}`);
  console.log(`Original host: ${originalHost}`);
  console.log(`Request ID: ${requestId}`);
  console.log('Signed headers:');
  for (const [key, value] of Object.entries(signatureHeaders)) {
    console.log(`  ${key}: ${value}`);
  }

  if (dryRun) {
    return;
  }

  const response = await fetch(requestUrl, {
    method,
    headers: requestHeaders,
    body: shouldSendBody(method, bodyText) ? bodyText : undefined,
  });
  const responseText = await response.text();

  console.log(`HTTP status: ${response.status}`);
  console.log(`Content-Type: ${response.headers.get('content-type') || '<none>'}`);
  console.log('Body preview:');
  console.log(trimPreview(responseText));

  if (expectStatus.size > 0 && !expectStatus.has(response.status)) {
    throw new Error(`Layer B expected one of [${[...expectStatus].join(', ')}] but received ${response.status}.`);
  }
}

function buildCallbackUrl(params) {
  if (!params.bridgeBaseUrl) return '';
  const url = new URL('/cmd/callback', `${trimTrailingSlash(params.bridgeBaseUrl)}/`);
  url.searchParams.set('utility_name', params.utilityName);
  url.searchParams.set('code', params.code);
  url.searchParams.set('state', params.state);
  url.searchParams.set('connector_id', params.connectorId);
  url.searchParams.set('display_name', params.displayName);
  return url.toString();
}

function buildRouteUrl(params) {
  if (!params.bridgeBaseUrl || !params.route) return '';
  const route = String(params.route).replace(/^\/+/, '');
  return `${trimTrailingSlash(params.bridgeBaseUrl)}/cmd/${route}`;
}

function inferMethodFromUrl(requestUrl) {
  const pathname = new URL(requestUrl).pathname;
  if (pathname.endsWith('/token')) return 'POST';
  if (pathname.endsWith('/revoke')) return 'POST';
  return 'GET';
}

async function resolveBodyText(args) {
  const inlineBody = readString(args.body);
  const bodyFile = readString(args['body-file']);
  if (inlineBody) return inlineBody;
  if (bodyFile) return await readFile(bodyFile, 'utf8');
  return '';
}

function parseHeaders(value) {
  const entries = Array.isArray(value) ? value : value ? [value] : [];
  return entries.reduce((accumulator, entry) => {
    const separator = String(entry).indexOf(':');
    if (separator === -1) throw new Error(`Invalid --header value: ${entry}`);
    const key = entry.slice(0, separator).trim();
    const rawValue = entry.slice(separator + 1).trim();
    if (!key) throw new Error(`Invalid --header value: ${entry}`);
    accumulator[key] = rawValue;
    return accumulator;
  }, {});
}

function parseExpectedStatuses(value) {
  if (!value) return new Set();
  return new Set(
    String(value)
      .split(',')
      .map((entry) => Number(entry.trim()))
      .filter((entry) => Number.isInteger(entry)),
  );
}

function buildSignatureHeaders(params) {
  const timestamp = new Date().toISOString();
  const nonce = randomUUID();
  const bodySha256 = sha256Hex(params.bodyText);
  const requestUrl = new URL(params.requestUrl);
  const canonical = [
    params.method.toUpperCase(),
    requestUrl.pathname,
    requestUrl.search,
    timestamp,
    nonce,
    bodySha256,
    params.originalHost,
    params.issuer,
  ].join('\n');
  const signature = hmacSha256Hex(params.secret, canonical);

  return {
    'x-utility-connector-bridge-key-id': params.keyId,
    'x-utility-connector-bridge-issuer': params.issuer,
    'x-utility-connector-bridge-timestamp': timestamp,
    'x-utility-connector-bridge-nonce': nonce,
    'x-utility-connector-bridge-body-sha256': bodySha256,
    'x-utility-connector-bridge-signature': signature,
    'x-utility-connector-original-host': params.originalHost,
    'x-utility-connector-original-proto': params.originalProto,
    'x-utility-connector-client-ip': params.clientIp,
    'x-utility-connector-request-id': params.requestId,
  };
}

function hmacSha256Hex(secret, value) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function sha256Hex(value) {
  return createHash('sha256').update(value).digest('hex');
}

function trimPreview(value) {
  const normalized = String(value ?? '').trim();
  if (normalized.length <= 600) return normalized || '<empty>';
  return `${normalized.slice(0, 600)}...`;
}

function shouldSendBody(method, bodyText) {
  return bodyText.length > 0 && method !== 'GET' && method !== 'HEAD';
}

function trimTrailingSlash(value) {
  return String(value).replace(/\/$/, '');
}

function readString(value) {
  if (Array.isArray(value)) return String(value.at(-1) ?? '').trim();
  return String(value ?? '').trim();
}
