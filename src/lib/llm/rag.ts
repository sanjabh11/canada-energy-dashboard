// RAG Client
// Retrieval-Augmented Generation specific functions

import { ENDPOINTS } from '../constants';
import { fetchEdgePostJson, type EdgeFetchOptions } from '../edge';
import { isEdgeFetchEnabled } from '../config';
import type { RagSearchResponse, RagSearchResult, RagSearchMeta } from './types';

export async function searchEnergyRag(
  query: string,
  params: { limit?: number; sourceTypes?: string[] } = {},
  options: EdgeFetchOptions = {}
): Promise<RagSearchResponse> {
  const normalizedQuery = query.trim();
  const limit = Math.min(10, Math.max(1, params.limit || 5));
  const sourceTypes = Array.isArray(params.sourceTypes) ? params.sourceTypes.filter(Boolean) : [];

  if (!normalizedQuery || !isEdgeFetchEnabled()) {
    return {
      query: normalizedQuery,
      mode: 'lexical',
      results: [],
      meta: {
        usedEmbedding: false,
        fallbackReason: normalizedQuery ? 'edge_fetch_disabled' : 'empty_query',
        limit,
        resultCount: 0,
        sourceTypes,
      },
    };
  }

  const { json } = await fetchEdgePostJson(
    [ENDPOINTS.RAG.ENERGY_SEARCH],
    { query: normalizedQuery, limit, sourceTypes },
    options
  );

  return {
    query: typeof json?.query === 'string' ? json.query : normalizedQuery,
    mode: json?.mode === 'vector' ? 'vector' : 'lexical',
    results: Array.isArray(json?.results) ? json.results as RagSearchResult[] : [],
    meta: {
      usedEmbedding: Boolean(json?.meta?.usedEmbedding),
      fallbackReason: json?.meta?.fallbackReason ?? null,
      limit: Number(json?.meta?.limit) || limit,
      resultCount: Number(json?.meta?.resultCount) || (Array.isArray(json?.results) ? json.results.length : 0),
      sourceTypes: Array.isArray(json?.meta?.sourceTypes) ? json.meta.sourceTypes.filter((value: unknown): value is string => typeof value === 'string') : sourceTypes,
    },
  };
}

// Re-export type for convenience
export type { RagSearchResponse, RagSearchResult, RagSearchMeta } from './types';
