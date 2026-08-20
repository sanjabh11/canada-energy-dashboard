import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export function getUtilityConnectorClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role configuration missing for utility connectors.");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as any;
}

export function authorizeUtilityConnectorRequest(req: Request): string | null {
  const configuredKey = Deno.env.get("UTILITY_CONNECTOR_INGEST_KEY") ?? "";
  if (!configuredKey) return "Utility connector ingest authorization is not configured.";

  const candidate = req.headers.get("x-utility-connector-key")
    ?? req.headers.get("x-ingest-token")
    ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? "";

  return candidate === configuredKey ? null : "Missing or invalid utility connector ingest key.";
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function encryptConnectorSecret(plaintext: string): Promise<string> {
  const secret = Deno.env.get("UTILITY_CONNECTOR_TOKEN_SECRET") ?? "";
  if (!secret) {
    throw new Error("UTILITY_CONNECTOR_TOKEN_SECRET is not configured.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const saltBuffer = toArrayBuffer(salt);
  const ivBuffer = toArrayBuffer(iv);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuffer, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: ivBuffer }, key, encoder.encode(plaintext));
  return `${toBase64(salt)}.${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptConnectorSecret(ciphertext: string): Promise<string> {
  const secret = Deno.env.get("UTILITY_CONNECTOR_TOKEN_SECRET") ?? "";
  if (!secret) {
    throw new Error("UTILITY_CONNECTOR_TOKEN_SECRET is not configured.");
  }

  const [saltPart, ivPart, payloadPart] = String(ciphertext ?? "").split(".");
  if (!saltPart || !ivPart || !payloadPart) {
    throw new Error("Connector secret ciphertext is malformed.");
  }

  const salt = fromBase64(saltPart);
  const iv = fromBase64(ivPart);
  const payload = fromBase64(payloadPart);
  const saltBuffer = toArrayBuffer(salt);
  const ivBuffer = toArrayBuffer(iv);
  const payloadBuffer = toArrayBuffer(payload);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuffer, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, payloadBuffer);
  return decoder.decode(plaintext);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function upsertUtilityConnectorAccount(
  supabase: any,
  payload: {
    connector_kind: string;
    source_kind: string;
    status: string;
    jurisdiction: "Ontario" | "Alberta";
    utility_name: string;
    display_name: string;
    owner_user_id?: string | null;
    account_holder_ref?: string | null;
    last_synced_at?: string | null;
    last_error?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  if (payload.connector_kind === "ontario_green_button_cmd" && !payload.owner_user_id) {
    throw new Error("Green Button connector accounts require a verified owner binding.");
  }

  const accountPayload = {
    ...payload,
    metadata: payload.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  if (payload.owner_user_id) {
    const { data, error } = await supabase
      .from("utility_connector_accounts")
      .upsert(accountPayload, { onConflict: "owner_user_id,jurisdiction,connector_kind,display_name" })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data: existing, error: lookupError } = await supabase
    .from("utility_connector_accounts")
    .select("id")
    .eq("jurisdiction", payload.jurisdiction)
    .eq("connector_kind", payload.connector_kind)
    .eq("display_name", payload.display_name)
    .is("owner_user_id", null)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const query = existing?.id
    ? supabase.from("utility_connector_accounts").update(accountPayload).eq("id", existing.id)
    : supabase.from("utility_connector_accounts").insert(accountPayload);
  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function getGreenButtonAccountByConnectorRef(
  supabase: any,
  connectorRef: string,
) {
  const normalizedRef = String(connectorRef ?? "").trim();
  if (!normalizedRef) return null;

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizedRef)) {
    const { data: byId, error: idError } = await supabase
      .from("utility_connector_accounts")
      .select("*")
      .eq("connector_kind", "ontario_green_button_cmd")
      .eq("id", normalizedRef)
      .maybeSingle();

    if (idError) throw idError;
    if (byId) return byId;
  }

  const { data: byConnectorRef, error: connectorRefError } = await supabase
    .from("utility_connector_accounts")
    .select("*")
    .eq("connector_kind", "ontario_green_button_cmd")
    .eq("account_holder_ref", normalizedRef)
    .maybeSingle();

  if (connectorRefError) throw connectorRefError;
  return byConnectorRef;
}

export async function getGreenButtonAuthRequest(
  supabase: any,
  connectorId: string,
  now = new Date(),
) {
  const normalizedConnectorId = String(connectorId ?? "").trim();
  if (!normalizedConnectorId) return null;

  const { data, error } = await supabase
    .from("utility_connector_auth_requests")
    .select("id,state,owner_user_id,connector_id,utility_name,display_name,expires_at,used_at")
    .eq("connector_id", normalizedConnectorId)
    .is("used_at", null)
    .gt("expires_at", now.toISOString())
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function consumeGreenButtonAuthRequest(
  supabase: any,
  state: string,
  now = new Date(),
) {
  const normalizedState = String(state ?? "").trim();
  if (!normalizedState) return null;

  const nowIso = now.toISOString();
  const { data, error } = await supabase
    .from("utility_connector_auth_requests")
    .update({ used_at: nowIso })
    .eq("state", normalizedState)
    .is("used_at", null)
    .gt("expires_at", nowIso)
    .select("id,state,owner_user_id,connector_id,utility_name,display_name,expires_at,used_at");

  if (error) throw error;
  return Array.isArray(data) && data.length === 1 ? data[0] : null;
}

export async function getUtilityConnectorToken(
  supabase: any,
  connectorAccountId: string,
  tokenLabel = "default",
) {
  const { data, error } = await supabase
    .from("utility_connector_tokens")
    .select("*")
    .eq("connector_account_id", connectorAccountId)
    .eq("token_label", tokenLabel)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteUtilityConnectorTokens(
  supabase: any,
  connectorAccountId: string,
) {
  const { error } = await supabase
    .from("utility_connector_tokens")
    .delete()
    .eq("connector_account_id", connectorAccountId);

  if (error) throw error;
}

export async function logUtilityConnectorRun(
  supabase: any,
  payload: {
    connector_account_id?: string | null;
    run_type: "auth" | "sync" | "revoke" | "batch_import" | "telemetry_ingest";
    status: "success" | "failure";
    observed_at?: string | null;
    row_count?: number;
    warning_count?: number;
    error_message?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("utility_connector_sync_runs").insert({
    connector_account_id: payload.connector_account_id ?? null,
    run_type: payload.run_type,
    status: payload.status,
    observed_at: payload.observed_at ?? null,
    row_count: payload.row_count ?? 0,
    warning_count: payload.warning_count ?? 0,
    error_message: payload.error_message ?? null,
    metadata: payload.metadata ?? {},
  });

  if (error) throw error;
}

export async function registerUtilityConnectorBridgeNonce(
  supabase: any,
  payload: {
    direction: 'bridge_to_supabase' | 'supabase_to_bridge';
    signing_key_id: string;
    nonce: string;
    issuer: string;
    request_id?: string | null;
    expires_at: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error: cleanupError } = await supabase
    .from("utility_connector_bridge_nonces")
    .delete()
    .lt("expires_at", new Date().toISOString());

  if (cleanupError) throw cleanupError;

  const { error } = await supabase
    .from("utility_connector_bridge_nonces")
    .insert({
      direction: payload.direction,
      signing_key_id: payload.signing_key_id,
      nonce: payload.nonce,
      issuer: payload.issuer,
      request_id: payload.request_id ?? null,
      expires_at: payload.expires_at,
      metadata: payload.metadata ?? {},
    });

  if (!error) return true;

  if (String(error.code ?? '') === '23505') {
    return false;
  }

  throw error;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
