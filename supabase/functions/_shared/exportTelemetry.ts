export async function logExportEvent(
  supabase: any,
  args: {
    jobId: string;
    eventName: string;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase
    .from("export_job_events")
    .insert({
      job_id: args.jobId,
      event_name: args.eventName,
      payload: args.payload ?? {},
    });

  if (error) {
    console.error("[exportTelemetry] Failed to insert export_job_events row", error);
  }
}

export function floorToUtcHour(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    0,
    0,
    0
  ));
}
