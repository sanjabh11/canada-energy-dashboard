import { supabase } from './supabaseClient';

export interface GroundsourceSnapshotPayload {
  source_group: string;
  source_count: number;
  llm_source_count: number;
  heuristic_source_count: number;
  extraction_mode: string;
  fallback_reason: string | null;
  documents: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
  event_count: number;
  provenance_score: number;
  warnings?: string[];
  meta: {
    model_version: string;
    generated_at: string;
    valid_at: string;
    confidence_score: number;
    data_sources: Array<Record<string, unknown>>;
    is_fallback: boolean;
    staleness_status: string;
    methodology: string;
    warnings: string[];
    claim_label: string;
  };
}

export interface GroundsourceSnapshotResult {
  available: boolean;
  snapshotStoredAt: string | null;
  payload: GroundsourceSnapshotPayload;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function buildGroundsourceSnapshotFallback(
  sourceGroup = 'utility_public',
  fallbackReason = 'no_snapshot_available',
): GroundsourceSnapshotPayload {
  const generatedAt = nowIso();
  return {
    source_group: sourceGroup,
    source_count: 0,
    llm_source_count: 0,
    heuristic_source_count: 0,
    extraction_mode: 'snapshot_unavailable',
    fallback_reason: fallbackReason,
    documents: [],
    events: [],
    event_count: 0,
    provenance_score: 0,
    warnings: fallbackReason === 'snapshot_read_failed'
      ? ['Groundsource snapshot could not be read from Supabase; provenance is advisory only.']
      : ['No persisted groundsource snapshot is available yet; provenance is advisory only.'],
    meta: {
      model_version: 'groundsource-miner-v1',
      generated_at: generatedAt,
      valid_at: generatedAt,
      confidence_score: 0,
      data_sources: [],
      is_fallback: true,
      staleness_status: 'unknown',
      methodology: 'Persisted groundsource snapshot read from dashboard_summary_snapshots.',
      warnings: fallbackReason === 'snapshot_read_failed'
        ? ['Groundsource snapshot read failed; resilience map is retaining provenance only.']
        : ['No persisted groundsource snapshot is available yet.'],
      claim_label: 'advisory',
    },
  };
}

export async function getGroundsourceSnapshot(
  sourceGroup = 'utility_public',
): Promise<GroundsourceSnapshotResult> {
  try {
    const { data, error } = await supabase
      .from('dashboard_summary_snapshots')
      .select('summary_payload, snapshot_stored_at, source_updated_at, source_label')
      .eq('dashboard_key', 'groundsource_intelligence')
      .eq('variant_key', sourceGroup)
      .maybeSingle();

    if (error) {
      return {
        available: false,
        snapshotStoredAt: null,
        payload: buildGroundsourceSnapshotFallback(sourceGroup, 'snapshot_read_failed'),
      };
    }

    if (!data?.summary_payload || typeof data.summary_payload !== 'object') {
      return {
        available: false,
        snapshotStoredAt: null,
        payload: buildGroundsourceSnapshotFallback(sourceGroup),
      };
    }

    const summaryPayload = data.summary_payload as Partial<GroundsourceSnapshotPayload>;
    const fallback = buildGroundsourceSnapshotFallback(sourceGroup);
    const generatedAt =
      summaryPayload.meta?.generated_at ??
      data.source_updated_at ??
      data.snapshot_stored_at ??
      nowIso();

    return {
      available: true,
      snapshotStoredAt: data.snapshot_stored_at ?? null,
      payload: {
        ...fallback,
        ...summaryPayload,
        source_group: String(summaryPayload.source_group ?? sourceGroup),
        source_count: Number(summaryPayload.source_count ?? 0),
        llm_source_count: Number(summaryPayload.llm_source_count ?? 0),
        heuristic_source_count: Number(summaryPayload.heuristic_source_count ?? 0),
        extraction_mode: String(summaryPayload.extraction_mode ?? 'snapshot'),
        fallback_reason: summaryPayload.fallback_reason ?? null,
        documents: Array.isArray(summaryPayload.documents) ? summaryPayload.documents : [],
        events: Array.isArray(summaryPayload.events) ? summaryPayload.events : [],
        event_count: Number(summaryPayload.event_count ?? 0),
        provenance_score: Number(summaryPayload.provenance_score ?? 0),
        warnings: Array.isArray(summaryPayload.warnings) ? summaryPayload.warnings : fallback.warnings,
        meta: {
          ...fallback.meta,
          ...(summaryPayload.meta ?? {}),
          generated_at: generatedAt,
          valid_at:
            summaryPayload.meta?.valid_at ??
            data.source_updated_at ??
            data.snapshot_stored_at ??
            generatedAt,
          warnings: Array.isArray(summaryPayload.meta?.warnings)
            ? summaryPayload.meta.warnings
            : fallback.meta.warnings,
          claim_label: String(summaryPayload.meta?.claim_label ?? fallback.meta.claim_label),
        },
      },
    };
  } catch {
    return {
      available: false,
      snapshotStoredAt: null,
      payload: buildGroundsourceSnapshotFallback(sourceGroup, 'snapshot_read_failed'),
    };
  }
}
