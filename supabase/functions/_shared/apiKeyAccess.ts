import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type ApiKeyRow = {
  id: string;
  api_key: string;
  tier: string | null;
  daily_limit: number | null;
  is_active: boolean;
  expires_at: string | null;
  usage_count: number | null;
  last_used_at: string | null;
};

export interface ApiKeyAccessResult {
  allowed: boolean;
  status: number;
  error?: string;
  message?: string;
  apiKey?: string | null;
  keyId?: string | null;
  tier?: string | null;
  dailyLimit?: number | null;
  remaining?: number | null;
  isPlatformAnon?: boolean;
}

function getConfiguredAnonKeys(): string[] {
  return [
    Deno.env.get("EDGE_SUPABASE_ANON_KEY") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  ].filter(Boolean);
}

function getCredentialFromRequest(req: Request): { value: string; source: string } | null {
  const xApiKey = req.headers.get("x-api-key")?.trim() || "";
  if (xApiKey) return { value: xApiKey, source: "x-api-key" };

  const xExportApiKey = req.headers.get("x-export-api-key")?.trim() || "";
  if (xExportApiKey) return { value: xExportApiKey, source: "x-export-api-key" };

  const apiKey = req.headers.get("apikey")?.trim() || "";
  if (apiKey) return { value: apiKey, source: "apikey" };

  const authHeader = req.headers.get("authorization")?.trim() || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return { value: token, source: "authorization" };
  }

  return null;
}

async function fallbackCheckRateLimit(
  supabase: SupabaseClient,
  keyRow: ApiKeyRow,
): Promise<{ allowed: boolean; remaining: number; dailyLimit: number }> {
  const dailyLimit = Math.max(0, Number(keyRow.daily_limit ?? 100));
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("api_usage")
    .select("request_count")
    .eq("api_key_id", keyRow.id)
    .eq("date", today);

  if (error) {
    return { allowed: true, remaining: dailyLimit, dailyLimit };
  }

  const used = (data ?? []).reduce((sum, row) => sum + Number((row as { request_count?: number }).request_count ?? 0), 0);
  return {
    allowed: used < dailyLimit,
    remaining: Math.max(0, dailyLimit - used),
    dailyLimit,
  };
}

async function fallbackRecordUsage(
  supabase: SupabaseClient,
  keyRow: ApiKeyRow,
  endpoint: string,
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await supabase
    .from("api_usage")
    .upsert({
      api_key_id: keyRow.id,
      endpoint,
      date: today,
      request_count: 1,
    }, {
      onConflict: "api_key_id,endpoint,date",
      ignoreDuplicates: false,
    });

  await supabase
    .from("api_keys")
    .update({
      last_used_at: new Date().toISOString(),
      usage_count: Number(keyRow.usage_count ?? 0) + 1,
    })
    .eq("id", keyRow.id);
}

export async function validateApiKeyAccess(
  req: Request,
  supabase: SupabaseClient,
  endpoint: string,
): Promise<ApiKeyAccessResult> {
  const credential = getCredentialFromRequest(req);
  if (!credential) {
    return {
      allowed: false,
      status: 401,
      error: "Unauthorized",
      message: "Missing API key",
    };
  }

  const configuredAnonKeys = getConfiguredAnonKeys();
  if (configuredAnonKeys.includes(credential.value)) {
    return {
      allowed: true,
      status: 200,
      apiKey: credential.value,
      isPlatformAnon: true,
      tier: "first_party",
      dailyLimit: null,
      remaining: null,
    };
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, api_key, tier, daily_limit, is_active, expires_at, usage_count, last_used_at")
    .eq("api_key", credential.value)
    .maybeSingle();

  const keyRow = data as ApiKeyRow | null;

  if (error || !keyRow || !keyRow.is_active) {
    return {
      allowed: false,
      status: 401,
      error: "Unauthorized",
      message: "Missing or invalid API key",
    };
  }

  if (keyRow.expires_at && new Date(keyRow.expires_at).getTime() <= Date.now()) {
    return {
      allowed: false,
      status: 401,
      error: "Unauthorized",
      message: "API key expired",
      keyId: keyRow.id,
      tier: keyRow.tier,
    };
  }

  let limitResult: { allowed: boolean; remaining: number; dailyLimit: number } | null = null;

  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("check_api_rate_limit", {
      p_api_key: credential.value,
    });

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      const row = rpcData[0] as { allowed?: boolean; remaining?: number; daily_limit?: number };
      limitResult = {
        allowed: row.allowed !== false,
        remaining: Number(row.remaining ?? 0),
        dailyLimit: Number(row.daily_limit ?? keyRow.daily_limit ?? 100),
      };
    }
  } catch {
    // Fall back to direct table queries if RPC is not present.
  }

  if (!limitResult) {
    limitResult = await fallbackCheckRateLimit(supabase, keyRow);
  }

  if (!limitResult.allowed) {
    return {
      allowed: false,
      status: 429,
      error: "Rate limit exceeded",
      message: "API daily limit reached for this key",
      apiKey: credential.value,
      keyId: keyRow.id,
      tier: keyRow.tier,
      dailyLimit: limitResult.dailyLimit,
      remaining: 0,
    };
  }

  try {
    const { error: recordError } = await supabase.rpc("record_api_usage", {
      p_api_key: credential.value,
      p_endpoint: endpoint,
    });

    if (recordError) {
      await fallbackRecordUsage(supabase, keyRow, endpoint);
    }
  } catch {
    await fallbackRecordUsage(supabase, keyRow, endpoint);
  }

  return {
    allowed: true,
    status: 200,
    apiKey: credential.value,
    keyId: keyRow.id,
    tier: keyRow.tier,
    dailyLimit: limitResult.dailyLimit,
    remaining: Math.max(0, limitResult.remaining - 1),
    isPlatformAnon: false,
  };
}
