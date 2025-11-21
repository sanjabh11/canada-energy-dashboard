import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Lazily created Supabase client for logging only
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

export interface ApiUsageLogInput {
  endpoint: string;
  method: string;
  statusCode: number;
  apiKey?: string | null;
  ipAddress?: string | null;
  responseTimeMs?: number | null;
  extra?: Record<string, unknown> | null;
}

export async function logApiUsage(input: ApiUsageLogInput): Promise<void> {
  if (!supabase) {
    // If we cannot create a client (e.g. missing env vars), fail silently.
    return;
  }

  const payload = {
    endpoint: input.endpoint,
    method: input.method,
    status_code: input.statusCode,
    api_key: input.apiKey ?? null,
    ip_address: input.ipAddress ?? null,
    response_time_ms: input.responseTimeMs ?? null,
    extra: input.extra ?? null,
  };

  const { error } = await supabase.from("api_usage").insert(payload);

  if (error) {
    console.error("Failed to insert api_usage log:", error);
  }
}
