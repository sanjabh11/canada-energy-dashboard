import { getFreshnessStatus, type FreshnessStatus } from './foundation';

export type LiveSurfaceSourceKind =
  | 'fallback_starter'
  | 'uploaded_historical'
  | 'utility_system_batch'
  | 'public_enrichment'
  | 'green_button_cmd'
  | 'utility_settlement_batch'
  | 'telemetry_gateway';

export interface LiveSurfaceContract {
  source: string;
  observed_at: string | null;
  freshness_status: FreshnessStatus;
  is_fallback: boolean;
  quality_flags: string[];
  assumption_pack_version: string;
  source_kind: LiveSurfaceSourceKind;
  notes?: string;
}

export const UTILITY_ASSUMPTION_PACK_VERSION = 'utility-live-surface-v2';

export function buildLiveSurfaceContract(params: {
  source: string;
  observedAt?: string | null;
  isFallback?: boolean;
  qualityFlags?: string[];
  assumptionPackVersion?: string;
  sourceKind: LiveSurfaceSourceKind;
  staleAfterHours?: number;
  notes?: string;
}): LiveSurfaceContract {
  return {
    source: params.source,
    observed_at: params.observedAt ?? null,
    freshness_status: getFreshnessStatus({
      lastUpdated: params.observedAt ?? null,
      isFallback: params.isFallback ?? false,
      staleAfterHours: params.staleAfterHours ?? 24 * 30,
    }),
    is_fallback: params.isFallback ?? false,
    quality_flags: params.qualityFlags ?? [],
    assumption_pack_version: params.assumptionPackVersion ?? UTILITY_ASSUMPTION_PACK_VERSION,
    source_kind: params.sourceKind,
    notes: params.notes,
  };
}
