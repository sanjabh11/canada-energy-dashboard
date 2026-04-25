import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export type OpsRunKind = "ingestion" | "forecast" | "maintenance" | "retrain" | "other";
export type OpsRunStatus = "running" | "success" | "failure";

export interface JobLogContext {
  jobName: string;
  jobType?: string;
  runType?: OpsRunKind;
  metadata?: Record<string, unknown>;
}

export async function startOpsRun(
  supabase: SupabaseClient,
  context: JobLogContext,
) {
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("ops_runs")
    .insert({
      run_type: context.runType ?? "ingestion",
      job_name: context.jobName,
      status: "running",
      started_at: startedAt,
      metadata: context.metadata ?? {},
    })
    .select("id, started_at")
    .single();

  if (error) {
    throw error;
  }

  return data as { id: string; started_at: string };
}

export async function finishOpsRun(
  supabase: SupabaseClient,
  runId: string,
  status: Exclude<OpsRunStatus, "running">,
  context: {
    jobName: string;
    jobType?: string;
    startedAt?: string;
    metadata?: Record<string, unknown>;
    errorMessage?: string | null;
  },
) {
  const completedAt = new Date().toISOString();
  const durationMs = context.startedAt
    ? Math.max(0, new Date(completedAt).getTime() - new Date(context.startedAt).getTime())
    : undefined;

  await supabase.from("ops_runs").update({
    status,
    completed_at: completedAt,
    duration_ms: durationMs,
    error_message: context.errorMessage ?? null,
    metadata: context.metadata ?? {},
    job_name: context.jobName,
  }).eq("id", runId);

  return { completedAt, durationMs };
}

export async function logJobExecution(
  supabase: SupabaseClient,
  context: {
    jobName: string;
    jobType?: string;
    status: "success" | "failed" | "running" | "pending";
    executedAt?: string;
    completedAt?: string;
    durationMs?: number;
    errorMessage?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const executedAt = context.executedAt ?? new Date().toISOString();
  const payload = {
    job_name: context.jobName,
    job_type: context.jobType ?? "cron",
    status: context.status,
    executed_at: executedAt,
    completed_at: context.completedAt ?? null,
    duration_ms: context.durationMs ?? null,
    error_message: context.errorMessage ?? null,
    metadata: context.metadata ?? {},
  };

  const { error } = await supabase.from("job_execution_log").insert(payload);
  if (error) throw error;
  return payload;
}

export async function logFallbackEvent(
  supabase: SupabaseClient,
  context: {
    jobName: string;
    domain?: string;
    reason: string;
    source?: string;
    modelVersion?: string;
    metadata?: Record<string, unknown>;
  },
) {
  return logJobExecution(supabase, {
    jobName: context.jobName,
    jobType: 'fallback',
    status: 'success',
    errorMessage: null,
    metadata: {
      fallback: true,
      source: context.source ?? 'edge_fallback',
      reason: context.reason,
      domain: context.domain ?? null,
      model_version: context.modelVersion ?? null,
      ...(context.metadata ?? {}),
    },
  });
}
