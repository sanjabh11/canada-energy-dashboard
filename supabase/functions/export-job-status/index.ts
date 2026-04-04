import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { verifyExportEntitlement } from "../_shared/exportEntitlement.ts";
import { logExportEvent } from "../_shared/exportTelemetry.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const EXPORT_SIGNED_URL_TTL_SECONDS = Number(Deno.env.get("EXPORT_SIGNED_URL_TTL_SECONDS") || "86400");
const EXPORT_STORAGE_BUCKET = Deno.env.get("EXPORT_STORAGE_BUCKET") || "exports";

function getJobId(url: URL): string {
  return url.searchParams.get("id")?.trim() || "";
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  const rl = applyRateLimit(req, "export-job-status");
  if (rl.response) return rl.response;

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
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
    return new Response(JSON.stringify({
      error: "Forbidden",
      reason: entitlement.reason ?? "Not entitled.",
    }), {
      status: entitlement.status || 403,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const jobId = getJobId(url);
  if (!jobId) {
    return new Response(JSON.stringify({ error: "Missing id query param." }), {
      status: 400,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  const { data: job, error: jobError } = await supabase
    .from("export_jobs")
    .select("id, status, status_reason, created_at, started_at, finished_at, output_signed_url, output_storage_path, confidence_snapshot, template, force_export, principal_type, principal_id")
    .eq("id", jobId)
    .maybeSingle();

  if (jobError || !job) {
    return new Response(JSON.stringify({ error: "Export job not found." }), {
      status: 404,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  if (job.principal_type !== entitlement.principalType || job.principal_id !== entitlement.principalId) {
    return new Response(JSON.stringify({ error: "You do not have access to this export job." }), {
      status: 403,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({
      jobId: job.id,
      status: job.status,
      reason: job.status_reason,
      createdAt: job.created_at,
      startedAt: job.started_at,
      finishedAt: job.finished_at,
      outputSignedUrl: job.status === "success" ? job.output_signed_url : null,
      confidenceSnapshot: job.confidence_snapshot,
      template: job.template,
      forceExport: job.force_export,
    }), {
      status: 200,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
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

  const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
  if (!action) {
    return new Response(JSON.stringify({ error: "Missing action." }), {
      status: 400,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  if (action === "cancel") {
    if (job.status === "success" || job.status === "queued" || job.status === "running") {
      const { error: updateError } = await supabase
        .from("export_jobs")
        .update({
          status: "canceled",
          status_reason: "Revoked by principal request.",
          output_signed_url: null,
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Failed to cancel export job." }), {
          status: 500,
          headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
        });
      }

      await logExportEvent(supabase, {
        jobId,
        eventName: "job_canceled",
        payload: { by: entitlement.principalType, principal_id: entitlement.principalId },
      });
    }

    return new Response(JSON.stringify({ jobId, status: "canceled" }), {
      status: 200,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  if (action === "reissue_url") {
    if (job.status !== "success" || !job.output_storage_path) {
      return new Response(JSON.stringify({ error: "Only successful jobs can reissue URLs." }), {
        status: 400,
        headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
      });
    }

    const storagePath = String(job.output_storage_path);
    const { data: signedData, error: signedError } = await supabase
      .storage
      .from(EXPORT_STORAGE_BUCKET)
      .createSignedUrl(storagePath, EXPORT_SIGNED_URL_TTL_SECONDS);

    if (signedError || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to create a new signed URL." }), {
        status: 500,
        headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("export_jobs")
      .update({ output_signed_url: signedData.signedUrl })
      .eq("id", jobId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to persist reissued URL." }), {
        status: 500,
        headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
      });
    }

    await logExportEvent(supabase, {
      jobId,
      eventName: "signed_url_reissued",
      payload: {
        by: entitlement.principalType,
        principal_id: entitlement.principalId,
        ttl_seconds: EXPORT_SIGNED_URL_TTL_SECONDS,
      },
    });

    return new Response(JSON.stringify({
      jobId,
      status: "success",
      outputSignedUrl: signedData.signedUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Unsupported action." }), {
    status: 400,
    headers: { ...corsHeaders, ...rl.headers, "Content-Type": "application/json" },
  });
});
