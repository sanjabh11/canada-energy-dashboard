import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import {
  authorizeUtilityConnectorRequest,
  decryptConnectorSecret,
  deleteUtilityConnectorTokens,
  encryptConnectorSecret,
  getUtilityConnectorToken,
  getUtilityConnectorClient,
  consumeGreenButtonAuthRequest,
  getGreenButtonAuthRequest,
  getGreenButtonAccountByConnectorRef,
  logUtilityConnectorRun,
  registerUtilityConnectorBridgeNonce,
  sha256Hex,
  upsertUtilityConnectorAccount,
} from "../_shared/utilityConnector.ts";
import {
  buildUtilityConnectorBridgeRequestSignature,
  buildUtilityConnectorBridgeUrl,
  shouldUseUtilityConnectorBridge,
  type UtilityConnectorBridgeVerificationFailure,
  type UtilityConnectorBridgeVerificationSuccess,
  verifyUtilityConnectorBridgeRequestSignature,
} from "../_shared/utilityConnectorBridge.ts";
import {
  buildGreenButtonAuthorizeResponse,
  runGreenButtonCallback,
  runGreenButtonRevoke,
  runGreenButtonSync,
} from "../_shared/utilityConnectorRuntime.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
  const rl = applyRateLimit(req, "utility-connector-green-button");
  if (rl.response) return rl.response;
    return handleCorsOptions(req);
  }

  const corsHeaders = createCorsHeaders(req);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? (req.method === "POST" ? "sync" : "start");

  try {
    if (req.method === "GET" && action === "start") {
      return await handleStart(url, corsHeaders);
    }

    if (req.method === "GET" && action === "callback") {
      return await handleCallback(req, url, corsHeaders);
    }

    if (req.method === "POST" && action === "sync") {
      const authError = authorizeUtilityConnectorRequest(req);
      if (authError) return json({ error: authError }, 401, corsHeaders);
      return await handleSync(req, corsHeaders);
    }

    if (req.method === "POST" && action === "revoke") {
      const authError = authorizeUtilityConnectorRequest(req);
      if (authError) return json({ error: authError }, 401, corsHeaders);
      return await handleRevoke(req, corsHeaders);
    }

    return json({ error: "Unsupported Green Button connector action." }, 405, corsHeaders);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Green Button connector failure." }, 500, corsHeaders);
  }
});

async function handleStart(url: URL, corsHeaders: Record<string, string>) {
  const supabase = getUtilityConnectorClient();
  const connectorId = url.searchParams.get("connector_id") ?? "";
  const authRequest = await getGreenButtonAuthRequest(supabase, connectorId);
  if (!authRequest) {
    return json({ error: "Green Button authorization state is missing, expired, or already used." }, 401, corsHeaders);
  }

  const requestedUtilityName = url.searchParams.get("utility_name");
  if (requestedUtilityName && requestedUtilityName !== authRequest.utility_name) {
    return json({ error: "Green Button authorization utility does not match its owner-bound request." }, 400, corsHeaders);
  }

  const utilityName = authRequest.utility_name;
  const bridgeBaseUrl = Deno.env.get("UTILITY_GREEN_BUTTON_BRIDGE_BASE_URL") ?? "";
  const defaultRedirectUri = shouldUseUtilityConnectorBridge(utilityName, bridgeBaseUrl)
    ? buildUtilityConnectorBridgeUrl(bridgeBaseUrl, "callback", utilityName)
    : Deno.env.get("UTILITY_GREEN_BUTTON_REDIRECT_URI") ?? "";
  const result = buildGreenButtonAuthorizeResponse({
    authorizeUrl: url.searchParams.get("authorize_url") ?? Deno.env.get("UTILITY_GREEN_BUTTON_AUTHORIZE_URL") ?? "",
    clientId: url.searchParams.get("client_id") ?? Deno.env.get("UTILITY_GREEN_BUTTON_CLIENT_ID") ?? "",
    redirectUri: url.searchParams.get("redirect_uri") ?? defaultRedirectUri,
    connectorId: authRequest.connector_id,
    scope: url.searchParams.get("scope") ?? "FB=4_5_15_16",
  });

  return json(result.body, result.status, corsHeaders);
}

async function handleCallback(req: Request, url: URL, corsHeaders: Record<string, string>) {
  const supabase = getUtilityConnectorClient();
  const state = url.searchParams.get("state") ?? "";
  const authRequest = await consumeGreenButtonAuthRequest(supabase, state);
  if (!authRequest) {
    return json({ error: "Green Button callback is not bound to an authenticated owner." }, 401, corsHeaders);
  }

  const requestedUtilityName = url.searchParams.get("utility_name");
  if (requestedUtilityName && requestedUtilityName !== authRequest.utility_name) {
    return json({ error: "Green Button callback utility does not match its authenticated owner binding." }, 400, corsHeaders);
  }

  const utilityName = authRequest.utility_name;
  const displayName = authRequest.display_name;
  const connectorId = authRequest.connector_id;
  const ownerUserId = authRequest.owner_user_id;
  const bridgeBaseUrl = Deno.env.get("UTILITY_GREEN_BUTTON_BRIDGE_BASE_URL") ?? "";
  const bridgeEnabled = shouldUseUtilityConnectorBridge(utilityName, bridgeBaseUrl);
  let bridgeMetadata: UtilityConnectorBridgeVerificationSuccess['metadata'] | null = null;
  if (bridgeEnabled) {
    const bridgeVerification = await verifyBridgeCallbackProvenance(req, url, supabase);
    if ('error' in bridgeVerification) {
      return json({ error: bridgeVerification.error }, 401, corsHeaders);
    }
    bridgeMetadata = bridgeVerification.metadata;
  }
  const tokenEndpoint = bridgeEnabled
    ? buildUtilityConnectorBridgeUrl(bridgeBaseUrl, "token")
    : url.searchParams.get("token_url") ?? Deno.env.get("UTILITY_GREEN_BUTTON_TOKEN_URL") ?? "";
  const redirectUri = bridgeEnabled
    ? buildUtilityConnectorBridgeUrl(bridgeBaseUrl, "callback", utilityName)
    : url.searchParams.get("redirect_uri") ?? Deno.env.get("UTILITY_GREEN_BUTTON_REDIRECT_URI") ?? "";
  const tokenBody = buildTokenExchangeBody({
    code: url.searchParams.get("code") ?? "",
    redirectUri,
    clientId: url.searchParams.get("client_id") ?? Deno.env.get("UTILITY_GREEN_BUTTON_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("UTILITY_GREEN_BUTTON_CLIENT_SECRET") ?? "",
  });
  const bridgeHeaders = bridgeEnabled
    ? await buildBridgeToSignerHeaders({
      method: "POST",
      requestUrl: tokenEndpoint,
      bodyText: tokenBody,
    })
    : undefined;
  const result = await runGreenButtonCallback({
    code: url.searchParams.get("code") ?? "",
    state: authRequest.state,
    connectorId,
    ownerUserId,
    tokenEndpoint,
    clientId: url.searchParams.get("client_id") ?? Deno.env.get("UTILITY_GREEN_BUTTON_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("UTILITY_GREEN_BUTTON_CLIENT_SECRET") ?? "",
    redirectUri,
    utilityName,
    displayName,
    metadata: bridgeMetadata ? {
      bridge_request_id: bridgeMetadata.requestId,
      bridge_original_host: bridgeMetadata.originalHost,
      bridge_original_proto: bridgeMetadata.originalProto,
      bridge_client_ip: bridgeMetadata.clientIp,
      bridge_signing_key_id: bridgeMetadata.signingKeyId,
    } : undefined,
    tokenRequestHeaders: bridgeEnabled ? bridgeHeaders : undefined,
  }, {
    upsertAccount: (payload) => upsertUtilityConnectorAccount(supabase, payload),
    logRun: (payload) => logUtilityConnectorRun(supabase, payload),
    upsertToken: async (payload) => {
      const { error } = await supabase.from("utility_connector_tokens").upsert(payload, {
        onConflict: "connector_account_id,token_label",
      });
      if (error) throw error;
    },
    encryptSecret: encryptConnectorSecret,
  });

  return json(result.body, result.status, corsHeaders);
}

async function handleSync(req: Request, corsHeaders: Record<string, string>) {
  const body = await req.json();
  const supabase = getUtilityConnectorClient();
  const connectorRef = typeof body?.connector_account_id === "string" ? body.connector_account_id : "";
  const account = await getGreenButtonAccountByConnectorRef(supabase, connectorRef);
  if (!account) {
    return json({ error: "Green Button connector account was not found." }, 404, corsHeaders);
  }
  if (!account.owner_user_id) {
    return json({ error: "Green Button connector account is quarantined because it has no owner binding." }, 409, corsHeaders);
  }
  if (account.status === "revoked") {
    return json({ error: "Green Button connector account is revoked." }, 409, corsHeaders);
  }

  const utilityName = String(account.utility_name ?? "Ontario Green Button Utility");
  const displayName = String(account.display_name ?? utilityName);
  const connectorId = String(account.account_holder_ref ?? account.id);
  const bridgeBaseUrl = Deno.env.get("UTILITY_GREEN_BUTTON_BRIDGE_BASE_URL") ?? "";
  const bridgeEnabled = shouldUseUtilityConnectorBridge(utilityName, bridgeBaseUrl);
  const bridgeFeedUrl = bridgeEnabled ? buildUtilityConnectorBridgeUrl(bridgeBaseUrl, "feed") : null;
  const bridgeHeaders = bridgeEnabled && bridgeFeedUrl
    ? await buildBridgeToSignerHeaders({
      method: "GET",
      requestUrl: bridgeFeedUrl,
      bodyText: "",
    })
    : undefined;
  const result = await runGreenButtonSync({
    connectorId,
    ownerUserId: String(account.owner_user_id),
    utilityName,
    displayName,
    xmlPayload: typeof body?.xml_payload === "string" ? body.xml_payload : null,
    feedUrl: typeof body?.feed_url === "string"
      ? body.feed_url
      : bridgeFeedUrl,
    accessToken: typeof body?.access_token === "string" ? body.access_token : null,
    geographyId: typeof body?.geography_id === "string" ? body.geography_id : null,
    metadata: body?.metadata ?? {},
    requestHeaders: bridgeEnabled ? bridgeHeaders : undefined,
  }, {
    sha256Hex,
    upsertAccount: (payload) => upsertUtilityConnectorAccount(supabase, payload),
    logRun: (payload) => logUtilityConnectorRun(supabase, payload),
    auditPayload: async (payload) => {
      const { error } = await supabase.from("utility_connector_payload_audit").insert({
        connector_account_id: payload.connectorAccountId,
        payload_kind: payload.payloadKind,
        payload_sha256: payload.payloadSha256,
        raw_payload: payload.rawPayload,
        metadata: payload.metadata ?? {},
      });
      if (error) throw error;
    },
    insertIntervalHistory: async (payload) => {
      const { error } = await supabase.from("utility_interval_history").insert(payload.rows.map((row) => ({
        connector_account_id: payload.connectorAccountId,
        jurisdiction: "Ontario",
        source_kind: "green_button_cmd",
        source_system: "green_button_cmd",
        observed_at: row.observed_at,
        geography_level: row.geography_level,
        geography_id: row.geography_id,
        customer_class: row.customer_class,
        demand_mw: row.demand_mw,
        weather_zone: "south",
        temperature_c: null,
        net_load_mw: null,
        gross_load_mw: null,
        gross_reconstituted_mw: null,
        customer_count: null,
        feeder_id: null,
        substation_id: null,
        quality_flags: row.quality_flags,
        metadata: {
          imported_via: "utility-connector-green-button",
        },
      })));
      if (error) throw error;
    },
    parseGreenButtonXml,
  });

  return json(result.body, result.status, corsHeaders);
}

async function handleRevoke(req: Request, corsHeaders: Record<string, string>) {
  const body = await req.json();
  const supabase = getUtilityConnectorClient();
  const connectorAccountRef = typeof body?.connector_account_id === "string" ? body.connector_account_id : "";
  const account = await getGreenButtonAccountByConnectorRef(supabase, connectorAccountRef);
  if (!account) {
    return json({ error: "Green Button connector account was not found." }, 404, corsHeaders);
  }
  if (!account.owner_user_id) {
    return json({ error: "Green Button connector account is quarantined because it has no owner binding." }, 409, corsHeaders);
  }
  const connectorAccountId = String(account.id);
  const tokenLabel = typeof body?.token_label === "string" ? body.token_label : "default";
  const utilityName = String(account.utility_name ?? "Ontario Green Button Utility");
  const displayName = String(account.display_name ?? utilityName);
  const connectorId = String(account.account_holder_ref ?? account.id);
  const bridgeBaseUrl = Deno.env.get("UTILITY_GREEN_BUTTON_BRIDGE_BASE_URL") ?? "";
  const bridgeEnabled = shouldUseUtilityConnectorBridge(utilityName, bridgeBaseUrl);
  const bridgeRevokeUrl = bridgeEnabled ? buildUtilityConnectorBridgeUrl(bridgeBaseUrl, "revoke") : null;
  const bridgeHeaders = bridgeEnabled && bridgeRevokeUrl
    ? await buildBridgeToSignerHeaders({
      method: "POST",
      requestUrl: bridgeRevokeUrl,
      bodyText: "",
    })
    : undefined;

  const result = await runGreenButtonRevoke({
    connectorId,
    ownerUserId: String(account.owner_user_id),
    utilityName,
    displayName,
    revocationMode: body?.revocation_mode === "api" ? "api" : "portal_redirect",
    revokeUrl: typeof body?.revoke_url === "string"
      ? body.revoke_url
      : bridgeRevokeUrl,
    manageConnectionsUrl: typeof body?.manage_connections_url === "string" ? body.manage_connections_url : null,
    accessToken: typeof body?.access_token === "string" ? body.access_token : null,
    actor: typeof body?.actor === "string" ? body.actor : "ceip",
    confirmRevoked: Boolean(body?.confirm_revoked),
    metadata: body?.metadata ?? {},
    requestHeaders: bridgeEnabled ? bridgeHeaders : undefined,
  }, {
    upsertAccount: (payload) => upsertUtilityConnectorAccount(supabase, payload),
    logRun: (payload) => logUtilityConnectorRun(supabase, payload),
    deleteTokens: async (payload) => {
      await deleteUtilityConnectorTokens(supabase, payload.connectorAccountId);
    },
    resolveAccessToken: async () => {
      if (!connectorAccountId) return null;
      const token = await getUtilityConnectorToken(supabase, connectorAccountId, tokenLabel);
      const ciphertext = typeof token?.access_token_ciphertext === "string" ? token.access_token_ciphertext : "";
      if (!ciphertext) return null;
      return await decryptConnectorSecret(ciphertext);
    },
  });

  return json(result.body, result.status, corsHeaders);
}

function parseGreenButtonXml(xml: string, geographyId?: string | null) {
  const powerMultiplier = Number(readXmlTag(xml, "powerOfTenMultiplier") ?? 0);
  const uom = readXmlTag(xml, "uom") ?? "72";
  const usagePointId = geographyId ?? readXmlTag(xml, "mRID") ?? "ON-GREEN-BUTTON-1";

  return Array.from(xml.matchAll(/<[^>]*:?IntervalReading\b[^>]*>([\s\S]*?)<\/[^>]*:?IntervalReading>/gi))
    .map((match) => {
      const fragment = match[1] ?? "";
      const startSeconds = Number(readXmlTag(fragment, "start"));
      const durationSeconds = Number(readXmlTag(fragment, "duration") ?? 3600);
      const rawValue = Number(readXmlTag(fragment, "value"));
      if (!Number.isFinite(startSeconds) || !Number.isFinite(durationSeconds) || !Number.isFinite(rawValue)) return null;

      return {
        observed_at: new Date(startSeconds * 1000).toISOString(),
        geography_level: "system",
        geography_id: usagePointId,
        customer_class: "mixed",
        demand_mw: convertToMw(rawValue, durationSeconds, powerMultiplier, uom),
        quality_flags: ["missing_temperature", "customer_count_missing"],
      };
    })
    .filter(Boolean) as Array<{
      observed_at: string;
      geography_level: "system";
      geography_id: string;
      customer_class: string;
      demand_mw: number;
      quality_flags: string[];
    }>;
}

function readXmlTag(xml: string, localName: string): string | null {
  const match = new RegExp(`<[^>]*:?${localName}>([\\s\\S]*?)<\\/[^>]*:?${localName}>`, "i").exec(xml);
  return match ? match[1].trim() : null;
}

async function buildBridgeToSignerHeaders(params: {
  method: string;
  requestUrl: string;
  bodyText: string;
}) {
  const signingSecret = Deno.env.get("UTILITY_CONNECTOR_SUPABASE_TO_BRIDGE_SIGNING_SECRET") ?? "";
  const signingKeyId = Deno.env.get("UTILITY_CONNECTOR_BRIDGE_SIGNING_KEY_ID") ?? "";
  if (!signingSecret || !signingKeyId) {
    throw new Error("Bridge signing configuration missing for Supabase-to-bridge requests.");
  }

  const requestUrl = new URL(params.requestUrl);
  return await buildUtilityConnectorBridgeRequestSignature({
    method: params.method,
    requestUrl: requestUrl.toString(),
    bodyText: params.bodyText,
    signingSecret,
    signingKeyId,
    issuer: "supabase-utility-connector-green-button",
    originalHost: requestUrl.host,
    originalProto: requestUrl.protocol.replace(":", ""),
  });
}

async function verifyBridgeCallbackProvenance(
  req: Request,
  url: URL,
  supabase: any,
): Promise<UtilityConnectorBridgeVerificationSuccess | UtilityConnectorBridgeVerificationFailure> {
  const bridgeBaseUrl = Deno.env.get("UTILITY_GREEN_BUTTON_BRIDGE_BASE_URL") ?? "";
  const signingSecret = Deno.env.get("UTILITY_CONNECTOR_BRIDGE_TO_SUPABASE_SIGNING_SECRET") ?? "";
  const signingKeyId = Deno.env.get("UTILITY_CONNECTOR_BRIDGE_SIGNING_KEY_ID") ?? "";
  if (!signingSecret || !signingKeyId) {
    return {
      ok: false as const,
      error: "Bridge provenance verification is required, but signing configuration is incomplete.",
    };
  }

  const verification = await verifyUtilityConnectorBridgeRequestSignature({
    method: req.method,
    requestUrl: url.toString(),
    bodyText: "",
    headers: req.headers,
    signingSecret,
    expectedKeyId: signingKeyId,
    expectedIssuer: Deno.env.get("UTILITY_CONNECTOR_BRIDGE_EXPECTED_ISSUER") ?? "utility-connector-bridge-signer",
    expectedHost: Deno.env.get("UTILITY_CONNECTOR_BRIDGE_EXPECTED_HOST") ?? (bridgeBaseUrl ? new URL(bridgeBaseUrl).host : ""),
    allowedClockSkewSec: Number(Deno.env.get("UTILITY_CONNECTOR_BRIDGE_ALLOWED_CLOCK_SKEW_SEC") ?? "300"),
    direction: "bridge_to_supabase",
    registerNonce: async (record) => await registerUtilityConnectorBridgeNonce(supabase, {
      direction: record.direction,
      signing_key_id: record.signingKeyId,
      nonce: record.nonce,
      issuer: record.issuer,
      request_id: record.requestId,
      expires_at: record.expiresAt,
      metadata: record.metadata,
    }),
  });

  if ('error' in verification) {
    return {
      ok: false as const,
      error: verification.error,
    };
  }

  return {
    ok: true as const,
    metadata: verification.metadata,
  };
}

function buildTokenExchangeBody(params: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    client_secret: params.clientSecret,
  }).toString();
}

function convertToMw(value: number, durationSeconds: number, powerMultiplier: number, uom: string): number {
  const scaledValue = value * (10 ** powerMultiplier);
  const normalizedUom = String(uom).toLowerCase();
  const mwh = normalizedUom === "mwh"
    ? scaledValue
    : normalizedUom === "kwh"
      ? scaledValue / 1000
      : scaledValue / 1_000_000;
  const hours = Math.max(durationSeconds / 3600, 1 / 60);
  return Number((mwh / hours).toFixed(6));
}

function json(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
