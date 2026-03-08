import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { assertExportAllowedServerSide, type ServerDataSource } from "../_shared/dataConfidenceServer.ts";
import { logExportEvent } from "../_shared/exportTelemetry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const EXPORT_BUCKET = Deno.env.get("EXPORT_STORAGE_BUCKET") || "exports";
const BATCH_SIZE = Number(Deno.env.get("EXPORT_PROCESS_BATCH_SIZE") || "5");
const EXPORT_SIGNED_URL_TTL_SECONDS = Number(Deno.env.get("EXPORT_SIGNED_URL_TTL_SECONDS") || "86400");

type ExportJobRow = {
  id: string;
  template: string;
  request_context: Record<string, unknown>;
  confidence_snapshot: Record<string, unknown>;
  force_export: boolean;
  status: string;
  max_attempts: number;
  attempt_count: number;
  principal_type: string;
  principal_id: string;
  request_source: string;
};

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const xCron = req.headers.get("x-supabase-cron");
  if (xCron === "true") return true;
  if (!authHeader) return false;
  if (authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) return true;
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true;
  return false;
}

function parseSources(snapshot: Record<string, unknown>): ServerDataSource[] | undefined {
  const raw = snapshot.required_sources;
  if (!Array.isArray(raw)) return undefined;
  const allowed = new Set<ServerDataSource>(["aeso_pool", "forecast_dataset", "tier_inputs", "compliance_pack"]);
  const filtered = raw.filter((entry): entry is ServerDataSource =>
    typeof entry === "string" && allowed.has(entry as ServerDataSource)
  );
  return filtered.length > 0 ? filtered : undefined;
}

function buildReportPayload(job: ExportJobRow, confidenceSnapshot: Record<string, unknown>) {
  const generatedAt = new Date().toISOString();
  const decision = String(confidenceSnapshot.decision ?? "allow");
  const confidence = String(confidenceSnapshot.confidence ?? "unknown");
  const disclaimerRequired = decision === "allow_with_disclaimer" || job.force_export === true;
  const disclaimer = disclaimerRequired
    ? "Limited confidence export: verify source freshness before external submission."
    : null;

  return {
    report_type: "official_export_artifact",
    template: job.template,
    generated_at: generatedAt,
    data_confidence: confidence,
    decision,
    disclaimer,
    force_export: job.force_export,
    request_source: job.request_source,
    principal_type: job.principal_type,
    request_context: job.request_context,
    confidence_snapshot: confidenceSnapshot,
  };
}

function buildReportHtml(report: Record<string, unknown>): string {
  const confidence = String(report.data_confidence ?? "unknown");
  const disclaimer = report.disclaimer ? `<p><strong>Disclaimer:</strong> ${String(report.disclaimer)}</p>` : "";
  const contextJson = JSON.stringify(report.request_context ?? {}, null, 2);
  const confidenceJson = JSON.stringify(report.confidence_snapshot ?? {}, null, 2);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>CEIP Export Artifact</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #0f172a; }
      h1 { margin-bottom: 8px; }
      .meta { color: #475569; margin-bottom: 18px; }
      .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e2e8f0; font-size: 12px; }
      pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; overflow: auto; }
    </style>
  </head>
  <body>
    <h1>CEIP Official Export Artifact</h1>
    <div class="meta">
      <div><strong>Template:</strong> ${String(report.template ?? "unknown")}</div>
      <div><strong>Generated at:</strong> ${String(report.generated_at ?? "unknown")}</div>
      <div><strong>Confidence:</strong> <span class="badge">${confidence}</span></div>
      <div><strong>Decision:</strong> ${String(report.decision ?? "allow")}</div>
      <div><strong>Force export:</strong> ${String(report.force_export ?? false)}</div>
    </div>
    ${disclaimer}
    <h2>Request Context</h2>
    <pre>${contextJson}</pre>
    <h2>Confidence Snapshot</h2>
    <pre>${confidenceJson}</pre>
  </body>
</html>`;
}

async function ensureBucket(supabase: any): Promise<void> {
  const { data } = await supabase.storage.listBuckets();
  const exists = (data ?? []).some((bucket: { name: string }) => bucket.name === EXPORT_BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(EXPORT_BUCKET, { public: false });
  }
}

async function claimQueuedJobs(supabase: any, limit: number): Promise<ExportJobRow[]> {
  const { data: queued, error } = await supabase
    .from("export_jobs")
    .select("id, template, request_context, confidence_snapshot, force_export, status, max_attempts, attempt_count, principal_type, principal_id, request_source")
    .eq("status", "queued")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !queued || queued.length === 0) return [];

  const claimed: ExportJobRow[] = [];
  for (const job of queued as ExportJobRow[]) {
    const { data: updated } = await supabase
      .from("export_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        attempt_count: (job.attempt_count ?? 0) + 1,
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id, template, request_context, confidence_snapshot, force_export, status, max_attempts, attempt_count, principal_type, principal_id, request_source")
      .maybeSingle();

    if (updated) claimed.push(updated as ExportJobRow);
  }

  return claimed;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server is not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized - cron/service only." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase: any = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  await ensureBucket(supabase);

  const jobs = await claimQueuedJobs(supabase, Math.max(1, Math.min(20, BATCH_SIZE)));
  const processed = {
    claimed: jobs.length,
    success: 0,
    blocked: 0,
    failed: 0,
    requeued: 0,
  };

  for (const job of jobs) {
    try {
      await logExportEvent(supabase, {
        jobId: job.id,
        eventName: "job_processing_started",
        payload: { attempt_count: job.attempt_count, template: job.template },
      });

      const gate = await assertExportAllowedServerSide({
        template: job.template,
        requestContext: job.request_context,
        sources: parseSources(job.confidence_snapshot),
        forceExport: job.force_export,
        canForceExport: true,
        supabase,
      });

      if (!gate.allowed) {
        await supabase
          .from("export_jobs")
          .update({
            status: "blocked_stale",
            status_reason: gate.reason ?? "Export blocked by server confidence re-check.",
            confidence_snapshot: gate.snapshot,
            finished_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        await logExportEvent(supabase, {
          jobId: job.id,
          eventName: "job_blocked_stale",
          payload: { reason: gate.reason, confidence: gate.confidence },
        });
        processed.blocked += 1;
        continue;
      }

      const report = buildReportPayload(job, gate.snapshot);
      const reportJson = JSON.stringify(report, null, 2);
      const reportHtml = buildReportHtml(report);

      const jsonPath = `export-jobs/${job.id}/report.json`;
      const htmlPath = `export-jobs/${job.id}/report.html`;

      const jsonUpload = await supabase.storage
        .from(EXPORT_BUCKET)
        .upload(jsonPath, new TextEncoder().encode(reportJson), {
          upsert: true,
          contentType: "application/json",
        });

      if (jsonUpload.error) throw jsonUpload.error;

      const htmlUpload = await supabase.storage
        .from(EXPORT_BUCKET)
        .upload(htmlPath, new TextEncoder().encode(reportHtml), {
          upsert: true,
          contentType: "text/html",
        });

      if (htmlUpload.error) throw htmlUpload.error;

      const signed = await supabase.storage
        .from(EXPORT_BUCKET)
        .createSignedUrl(htmlPath, EXPORT_SIGNED_URL_TTL_SECONDS);

      if (signed.error || !signed.data?.signedUrl) {
        throw signed.error ?? new Error("Failed to create signed URL");
      }

      await supabase
        .from("export_jobs")
        .update({
          status: "success",
          status_reason: null,
          output_storage_path: htmlPath,
          output_signed_url: signed.data.signedUrl,
          confidence_snapshot: gate.snapshot,
          finished_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await logExportEvent(supabase, {
        jobId: job.id,
        eventName: "job_success",
        payload: {
          output_storage_path: htmlPath,
          json_path: jsonPath,
          confidence: gate.confidence,
          decision: gate.decision,
        },
      });

      processed.success += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const exhausted = (job.attempt_count ?? 0) >= (job.max_attempts ?? 3);

      if (exhausted) {
        await supabase
          .from("export_jobs")
          .update({
            status: "failed",
            status_reason: message,
            finished_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        processed.failed += 1;
      } else {
        await supabase
          .from("export_jobs")
          .update({
            status: "queued",
            status_reason: `Retry scheduled after failure: ${message}`,
            priority: Math.max(1, 10 - (job.attempt_count ?? 0)),
          })
          .eq("id", job.id);
        processed.requeued += 1;
      }

      await logExportEvent(supabase, {
        jobId: job.id,
        eventName: exhausted ? "job_failed" : "job_requeued",
        payload: { error: message, exhausted },
      });
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    processed,
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
