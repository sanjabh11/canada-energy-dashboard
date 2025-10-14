import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const url = new URL(req.url);
    const nowIso = new Date().toISOString();

    const defaultPayload = {
      run_type: "ingestion",
      status: "success",
      started_at: nowIso,
      completed_at: nowIso,
      metadata: null as any,
    };

    let body: Partial<typeof defaultPayload> = {};

    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch (_) {
        // ignore
      }
    }

    const payload = {
      run_type: (url.searchParams.get("run_type") || body.run_type || defaultPayload.run_type).toString(),
      status: (url.searchParams.get("status") || body.status || defaultPayload.status).toString(),
      started_at: (url.searchParams.get("started_at") || body.started_at || defaultPayload.started_at).toString(),
      completed_at: (url.searchParams.get("completed_at") || body.completed_at || defaultPayload.completed_at).toString(),
      metadata: body.metadata ?? null,
    };

    const { data, error } = await supabase
      .from("ops_runs")
      .insert({
        run_type: payload.run_type,
        status: payload.status,
        started_at: payload.started_at,
        completed_at: payload.completed_at,
        metadata: payload.metadata,
      })
      .select("id, run_type, status, completed_at")
      .maybeSingle();

    if (error) {
      console.error("Failed to write heartbeat", error);
      return new Response(JSON.stringify({ error: "Failed to write heartbeat", details: error }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, heartbeat: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ops-heartbeat error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
