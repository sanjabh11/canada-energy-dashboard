import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export interface DashboardSummarySnapshotRow<T = Record<string, unknown>> {
  dashboard_key: string;
  variant_key: string;
  summary_payload: T;
  source_label: string | null;
  source_updated_at: string | null;
  snapshot_stored_at: string;
  is_partial: boolean;
  notes: string | null;
}

export async function loadDashboardSummarySnapshot<T>(args: {
  dashboardKey: string;
  variantKey: string;
}): Promise<DashboardSummarySnapshotRow<T> | null> {
  const { data, error } = await supabase
    .from('dashboard_summary_snapshots')
    .select('dashboard_key, variant_key, summary_payload, source_label, source_updated_at, snapshot_stored_at, is_partial, notes')
    .eq('dashboard_key', args.dashboardKey)
    .eq('variant_key', args.variantKey)
    .maybeSingle();

  if (error) throw error;
  return (data as DashboardSummarySnapshotRow<T> | null) ?? null;
}

export async function saveDashboardSummarySnapshot<T>(args: {
  dashboardKey: string;
  variantKey: string;
  summaryPayload: T;
  sourceLabel?: string | null;
  sourceUpdatedAt?: string | null;
  isPartial?: boolean;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase
    .from('dashboard_summary_snapshots')
    .upsert({
      dashboard_key: args.dashboardKey,
      variant_key: args.variantKey,
      summary_payload: args.summaryPayload,
      source_label: args.sourceLabel ?? null,
      source_updated_at: args.sourceUpdatedAt ?? null,
      snapshot_stored_at: new Date().toISOString(),
      is_partial: args.isPartial ?? false,
      notes: args.notes ?? null,
    }, {
      onConflict: 'dashboard_key,variant_key',
    });

  if (error) throw error;
}
