import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { verifyExportEntitlement } from "../_shared/exportEntitlement.ts";
import { assertExportAllowedServerSide, type ServerDataSource } from "../_shared/dataConfidenceServer.ts";
import { logExportEvent } from "../_shared/exportTelemetry.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const TEMPLATE_SOURCES: Record<string, ServerDataSource[]> = {
  compliance_pack: ["aeso_pool", "tier_inputs", "compliance_pack"],
  regulatory_filing: ["aeso_pool", "tier_inputs", "compliance_pack"],
  industrial_tier_impact: ["aeso_pool", "tier_inputs"],
  forecast_benchmarking: ["forecast_dataset", "aeso_pool"],
};

function sanitizeTemplate(input: unknown): string {
  if (typeof input !== "string") return "compliance_pack";
  const value = input.trim().toLowerCase();
  if (!value) return "compliance_pack";
  return value.slice(0, 80);
}

function resolveSources(template: string, bodySources: unknown): ServerDataSource[] {
  if (Array.isArray(bodySources) && bodySources.length > 0) {
    const allowed = new Set<ServerDataSource>(["aeso_pool", "forecast_dataset", "tier_inputs", "compliance_pack"]);
    const filtered = bodySources
      .filter((entry): entry is ServerDataSource => typeof entry === "string" && allowed.has(entry as ServerDataSource));
    if (filtered.length > 0) return filtered;
  }

  const mapped = TEMPLATE_SOURCES[template];
  if (mapped) return mapped;
  return ["aeso_pool", "tier_inputs"];
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  const rl = applyRateLimit(req, "create-export-job");
  if (rl.response) return rl.response;

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server is not configured." }), {
      status: 500,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const entitlement = await verifyExportEntitlement(req, supabase);
  if (!entitlement.allowed || !entitlement.principalType || !entitlement.principalId) {
    // Log denial telemetry before returning 403
    await logExportEvent(supabase, {
      jobId: "",
      eventName: "export_denied",
      payload: {
        reason: entitlement.reason ?? "Not entitled for official export.",
        principalType: entitlement.principalType ?? "anonymous",
        principalId: entitlement.principalId ?? "unknown",
        status: entitlement.status || 403,
      },
    });
    return new Response(JSON.stringify({
      error: "Forbidden",
      reason: entitlement.reason ?? "Not entitled for official export.",
    }), {
      status: entitlement.status || 403,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  const idempotencyKey = req.headers.get("Idempotency-Key")?.trim() || "";
  if (!idempotencyKey) {
    return new Response(JSON.stringify({ error: "Idempotency-Key header is required." }), {
      status: 400,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  const template = sanitizeTemplate(body.template);
  const requestSource = typeof body.request_source === "string" ? body.request_source.slice(0, 80) : "ui";
  const requestContext = typeof body.request_context === "object" && body.request_context !== null
    ? body.request_context as Record<string, unknown>
    : {};
  const forceExport = body.force_export === true;
  const priority = typeof body.priority === "number" && Number.isFinite(body.priority)
    ? Math.max(1, Math.min(100, Math.floor(body.priority)))
    : 10;
  const sources = resolveSources(template, body.sources);

  const fpicRequired = requestContext.fpic_required === true;
  const consentArtifactId = typeof requestContext.consent_artifact_id === "string"
    ? requestContext.consent_artifact_id.trim()
    : "";
  const adminOverrideRequested = requestContext.admin_override === true;
  const allowFpicAdminOverride = Deno.env.get("EXPORT_ALLOW_FPIC_ADMIN_OVERRIDE") === "true";
  const canFpicOverride = allowFpicAdminOverride && entitlement.canForceExport && adminOverrideRequested;

  if (fpicRequired && !consentArtifactId && !canFpicOverride) {
    return new Response(JSON.stringify({
      error: "FPIC consent required for this export template.",
      code: "fpic_required",
    }), {
      status: 403,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  const { data: existing } = await supabase
    .from("export_jobs")
    .select("id, status, status_reason, output_signed_url, confidence_snapshot, created_at")
    .eq("principal_type", entitlement.principalType)
    .eq("principal_id", entitlement.principalId)
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({
      jobId: existing.id,
      status: existing.status,
      reason: existing.status_reason,
      outputSignedUrl: existing.output_signed_url,
      confidenceSnapshot: existing.confidence_snapshot,
      deduplicated: true,
      createdAt: existing.created_at,
    }), {
      status: 200,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  const confidenceGate = await assertExportAllowedServerSide({
    template,
    requestContext,
    sources,
    forceExport,
    canForceExport: entitlement.canForceExport,
    supabase,
  });

  if (!confidenceGate.allowed) {
    return new Response(JSON.stringify({
      error: "Export blocked due to low confidence data.",
      code: "blocked_stale",
      confidence: confidenceGate.confidence,
      reason: confidenceGate.reason,
      snapshot: confidenceGate.snapshot,
    }), {
      status: 409,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  const insertPayload = {
    requested_by: entitlement.requestedBy ?? null,
    principal_type: entitlement.principalType,
    principal_id: entitlement.principalId,
    idempotency_key: idempotencyKey,
    request_source: requestSource,
    template,
    request_context: requestContext,
    status: "queued",
    force_export: forceExport,
    confidence_snapshot: confidenceGate.snapshot,
    entitlement_snapshot: entitlement.entitlementSnapshot,
    priority,
  };

  const { data: job, error: insertError } = await supabase
    .from("export_jobs")
    .insert(insertPayload)
    .select("id, status, created_at")
    .single();

  if (insertError || !job) {
    console.error("[create-export-job] Failed to insert export job", insertError);
    return new Response(JSON.stringify({ error: "Failed to queue export job." }), {
      status: 500,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  await logExportEvent(supabase, {
    jobId: job.id,
    eventName: "job_created",
    payload: {
      template,
      request_source: requestSource,
      force_export: forceExport,
      confidence: confidenceGate.confidence,
      decision: confidenceGate.decision,
    },
  });

  return new Response(JSON.stringify({
    jobId: job.id,
    status: job.status,
    confidence: confidenceGate.confidence,
    disclaimerRequired: confidenceGate.disclaimerRequired,
    createdAt: job.created_at,
  }), {
    status: 202,
    headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
  });
});
