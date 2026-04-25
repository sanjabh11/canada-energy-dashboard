import { supabase } from './supabaseClient';

export interface FallbackEvent {
  jobName: string;
  reason: string;
  source?: string;
  domain?: string;
  modelVersion?: string;
  metadata?: Record<string, unknown>;
}

export async function logFallbackEvent(context: FallbackEvent): Promise<void> {
  try {
    const completedAt = new Date().toISOString();
    await supabase.from('job_execution_log').insert({
      job_name: context.jobName,
      job_type: 'fallback',
      status: 'success',
      executed_at: completedAt,
      completed_at: completedAt,
      duration_ms: 0,
      error_message: null,
      metadata: {
        fallback: true,
        source: context.source ?? 'local_fallback',
        reason: context.reason,
        domain: context.domain ?? null,
        model_version: context.modelVersion ?? null,
        ...(context.metadata ?? {}),
      },
    });
  } catch {
    // Fallback telemetry is best-effort; never block the caller.
  }
}
