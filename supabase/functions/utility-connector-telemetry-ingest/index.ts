import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import {
  authorizeUtilityConnectorRequest,
  getUtilityConnectorClient,
  logUtilityConnectorRun,
  sha256Hex,
  upsertUtilityConnectorAccount,
} from "../_shared/utilityConnector.ts";
import { runTelemetryIngest } from "../_shared/utilityConnectorRuntime.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = createCorsHeaders(req);
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, corsHeaders);
  }

  const authError = authorizeUtilityConnectorRequest(req);
  if (authError) {
    return json({ error: authError }, 401, corsHeaders);
  }

  try {
    const body = await req.json();
    const supabase = getUtilityConnectorClient();
    const result = await runTelemetryIngest({
      body,
      dryRun: body?.dry_run === true,
      utilityName: body?.utility_name ?? "Telemetry gateway",
      displayName: body?.display_name ?? `${String(body?.utility_name ?? "Telemetry gateway").trim()} HTTP gateway`,
      accountHolderRef: body?.account_holder_ref ?? null,
      metadata: body?.metadata ?? {},
    }, {
      sha256Hex,
      upsertAccount: (payload) => upsertUtilityConnectorAccount(supabase, payload),
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
      insertTelemetrySnapshot: async (payload) => {
        const { error } = await supabase.from("utility_telemetry_snapshots").insert({
          connector_account_id: payload.connectorAccountId,
          jurisdiction: payload.snapshot.jurisdiction,
          source_kind: "telemetry_gateway",
          observed_at: payload.snapshot.observed_at,
          geography_level: payload.snapshot.geography_level,
          geography_id: payload.snapshot.geography_id,
          feeder_id: payload.snapshot.feeder_id,
          substation_id: payload.snapshot.substation_id,
          load_mw: payload.snapshot.load_mw,
          voltage_kv: payload.snapshot.voltage_kv,
          transformer_utilization_pct: payload.snapshot.transformer_utilization_pct,
          outage_state: payload.snapshot.outage_state,
          quality_flags: payload.snapshot.quality_flags,
          metadata: {
            source: payload.snapshot.source,
          },
        });
        if (error) throw error;
      },
      logRun: (payload) => logUtilityConnectorRun(supabase, payload),
    });

    return json(result.body, result.status, corsHeaders);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Telemetry ingest failed." }, 500, corsHeaders);
  }
});

function json(body: Record<string, unknown>, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
