export interface FallbackEvent {
  jobName: string;
  reason: string;
  source?: string;
  domain?: string;
  modelVersion?: string;
  metadata?: Record<string, unknown>;
}

export async function logFallbackEvent(context: FallbackEvent): Promise<void> {
  // Operational logs must be written only by trusted server-side jobs. The
  // browser's anon key must never receive permission to populate this table.
  if (import.meta.env.DEV) {
    console.info('[local fallback]', context);
  }
}
