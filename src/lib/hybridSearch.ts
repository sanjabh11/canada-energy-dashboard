/**
 * B08 – Hybrid Search & Retrieval V2
 *
 * Combines sparse (keyword BM25) and dense (vector cosine) search
 * for the Canada Energy Dashboard knowledge base.
 *
 * Architecture:
 *   1. Sparse:  Supabase full-text search (tsvector + tsquery, GIN index)
 *   2. Dense:   pgvector (cosine similarity on 1536-dim OpenAI embeddings)
 *   3. Fusion:  Reciprocal Rank Fusion (RRF, k=60) — no score normalisation needed
 *   4. Rerank:  Domain-relevance boost (jurisdiction, recency, trust tier)
 *
 * Based on:
 *   - "Improving Text Embeddings with Large Language Models" (Wang et al., 2024)
 *   - "Reciprocal Rank Fusion outperforms Condorcet" (Cormack et al., 2009)
 *   - Supabase pgvector best practices (2024)
 *
 * Usage:
 *   const searcher = new HybridSearcher(supabaseClient, { embeddingDim: 1536 });
 *   const results = await searcher.search("Alberta coal phase-out 2030", { limit: 10 });
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SearchDocument {
  id: string;
  title: string;
  body: string;
  /** JSON metadata blob */
  metadata?: Record<string, unknown>;
  /** Province/territory code — used for jurisdiction boost */
  jurisdiction?: string;
  /** ISO date string — used for recency boost */
  publishedAt?: string;
  /** Trust tier 1-4 */
  trustTier?: 1 | 2 | 3 | 4;
  /** Pre-computed vector embedding (if available) */
  embedding?: number[];
}

export interface SearchResult {
  id: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  jurisdiction?: string;
  publishedAt?: string;
  trustTier?: 1 | 2 | 3 | 4;
  /** RRF score (higher = more relevant) */
  score: number;
  /** Score breakdown for debugging */
  scoreBreakdown?: {
    sparse: number | null;
    dense: number | null;
    rrf: number;
    domainBoost: number;
  };
}

export interface SearchOptions {
  limit?: number;
  /** Province/territory codes to filter by (e.g. ["AB", "ON"]) */
  jurisdictions?: string[];
  /** Only include documents from after this ISO date */
  afterDate?: string;
  /** Minimum trust tier (1 = highest, 4 = lowest) */
  minTrustTier?: 1 | 2 | 3 | 4;
  /** Weight for sparse vs dense (0 = pure dense, 1 = pure sparse). Default 0.5 */
  sparseWeight?: number;
  /** Include score breakdown in results */
  debug?: boolean;
}

export interface HybridSearchConfig {
  /** Vector embedding dimension. Default 1536 (OpenAI text-embedding-3-small) */
  embeddingDim?: number;
  /** Supabase table name for knowledge base documents */
  tableName?: string;
  /** RRF k constant (default 60 — Cormack 2009 recommendation) */
  rrfK?: number;
  /** Embeddings API URL (or null to skip dense search) */
  embeddingEndpoint?: string | null;
  /** API key for embeddings endpoint */
  embeddingApiKey?: string | null;
}

// ── Reciprocal Rank Fusion ─────────────────────────────────────────────────────

/**
 * Combines two ranked lists using RRF.
 * rrf_score(d) = Σ_i 1 / (k + rank_i(d))
 * where rank_i is the 1-based rank of document d in list i.
 */
function reciprocalRankFusion(
  lists: Array<string[]>,
  k = 60,
): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    for (let i = 0; i < list.length; i++) {
      const id = list[i];
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1));
    }
  }
  return scores;
}

// ── Domain relevance boost ─────────────────────────────────────────────────────

function domainBoost(doc: {
  jurisdiction?: string;
  publishedAt?: string;
  trustTier?: number;
}, queryJurisdictions?: string[]): number {
  let boost = 1.0;

  // Trust tier boost: tier 1 = 1.2×, tier 2 = 1.1×, tier 3 = 1.0×, tier 4 = 0.9×
  const tierBoosts: Record<number, number> = { 1: 1.2, 2: 1.1, 3: 1.0, 4: 0.9 };
  boost *= tierBoosts[doc.trustTier ?? 3] ?? 1.0;

  // Recency boost: exponential decay with 2-year half-life
  if (doc.publishedAt) {
    const ageYears = (Date.now() - new Date(doc.publishedAt).getTime()) / (365.25 * 86_400_000);
    const halfLifeYears = 2;
    boost *= Math.pow(0.5, ageYears / halfLifeYears) * 0.5 + 0.5; // floor at 0.5×
  }

  // Jurisdiction match boost
  if (queryJurisdictions && queryJurisdictions.length > 0 && doc.jurisdiction) {
    if (queryJurisdictions.includes(doc.jurisdiction)) {
      boost *= 1.3;
    }
  }

  return boost;
}

// ── HybridSearcher class ───────────────────────────────────────────────────────

export class HybridSearcher {
  private readonly config: Required<HybridSearchConfig>;
  private readonly supabase: unknown;

  constructor(
    supabaseClient: unknown,
    config: HybridSearchConfig = {},
  ) {
    this.supabase = supabaseClient;
    this.config = {
      embeddingDim: config.embeddingDim ?? 1536,
      tableName: config.tableName ?? 'knowledge_base',
      rrfK: config.rrfK ?? 60,
      embeddingEndpoint: config.embeddingEndpoint ?? null,
      embeddingApiKey: config.embeddingApiKey ?? null,
    };
  }

  // ── Embed query ──────────────────────────────────────────────────────────────

  private async embedQuery(query: string): Promise<number[] | null> {
    if (!this.config.embeddingEndpoint) return null;
    try {
      const resp = await fetch(this.config.embeddingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.embeddingApiKey
            ? { Authorization: `Bearer ${this.config.embeddingApiKey}` }
            : {}),
        },
        body: JSON.stringify({ input: query, model: 'text-embedding-3-small' }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) {
        console.warn(`[HybridSearcher] Embedding API error: HTTP ${resp.status}`);
        return null;
      }
      const json = await resp.json() as { data?: Array<{ embedding: number[] }> };
      return json.data?.[0]?.embedding ?? null;
    } catch (err) {
      console.warn('[HybridSearcher] Embedding API unreachable:', err);
      return null;
    }
  }

  // ── Sparse search (Supabase full-text) ───────────────────────────────────────

  private async sparseSearch(
    query: string,
    limit: number,
    jurisdictions?: string[],
    minTrustTier?: number,
  ): Promise<string[]> {
    const client = this.supabase as {
      from: (t: string) => {
        select: (cols: string) => {
          textSearch: (col: string, query: string, opts: unknown) => {
            in?: (...args: unknown[]) => unknown;
            gte?: (...args: unknown[]) => unknown;
            lte?: (...args: unknown[]) => unknown;
            limit: (n: number) => { then: Function };
          };
          in: (col: string, vals: string[]) => unknown;
          gte: (col: string, val: unknown) => unknown;
          lte: (col: string, val: unknown) => unknown;
          limit: (n: number) => { then: Function };
        };
        rpc: (fn: string, params: unknown) => Promise<{ data: unknown[]; error: unknown }>;
      };
      rpc: (fn: string, params: unknown) => Promise<{ data: unknown[] | null; error: unknown }>;
    };

    try {
      const tsQuery = query.trim().split(/\s+/).join(' & ');
      const { data, error } = await client.rpc('search_knowledge_base_sparse', {
        query_text: tsQuery,
        limit_count: limit,
        jurisdiction_filter: jurisdictions ?? null,
        trust_tier_max: minTrustTier ?? 4,
      });

      if (error) {
        console.warn('[HybridSearcher] Sparse search error:', error);
        return [];
      }
      return ((data as Array<{ id: string }>) ?? []).map((r) => r.id);
    } catch (err) {
      console.warn('[HybridSearcher] Sparse search threw:', err);
      return [];
    }
  }

  // ── Dense search (pgvector) ──────────────────────────────────────────────────

  private async denseSearch(
    embedding: number[],
    limit: number,
    jurisdictions?: string[],
    minTrustTier?: number,
  ): Promise<string[]> {
    const client = this.supabase as {
      rpc: (fn: string, params: unknown) => Promise<{ data: unknown[] | null; error: unknown }>;
    };

    try {
      const { data, error } = await client.rpc('search_knowledge_base_dense', {
        query_embedding: embedding,
        limit_count: limit,
        jurisdiction_filter: jurisdictions ?? null,
        trust_tier_max: minTrustTier ?? 4,
      });

      if (error) {
        console.warn('[HybridSearcher] Dense search error:', error);
        return [];
      }
      return ((data as Array<{ id: string }>) ?? []).map((r) => r.id);
    } catch (err) {
      console.warn('[HybridSearcher] Dense search threw:', err);
      return [];
    }
  }

  // ── Fetch full documents by IDs ───────────────────────────────────────────────

  private async fetchDocuments(ids: string[]): Promise<SearchDocument[]> {
    if (ids.length === 0) return [];
    const client = this.supabase as {
      from: (t: string) => {
        select: (cols: string) => {
          in: (col: string, vals: string[]) => Promise<{ data: SearchDocument[] | null; error: unknown }>;
        };
      };
    };
    const { data, error } = await client
      .from(this.config.tableName)
      .select('id,title,body,metadata,jurisdiction,published_at,trust_tier')
      .in('id', ids);

    if (error) {
      console.warn('[HybridSearcher] fetchDocuments error:', error);
      return [];
    }
    return (data ?? []) as SearchDocument[];
  }

  // ── Main search entry point ───────────────────────────────────────────────────

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {
      limit = 10,
      jurisdictions,
      afterDate,
      minTrustTier,
      sparseWeight = 0.5,
      debug = false,
    } = options;

    const fetchLimit = limit * 3; // over-fetch to allow RRF fusion and filtering

    // 1. Parallel sparse + embedding
    const [embedding, sparseIds] = await Promise.all([
      this.embedQuery(query),
      this.sparseSearch(query, fetchLimit, jurisdictions, minTrustTier),
    ]);

    // 2. Dense search (only if embedding succeeded)
    const denseIds = embedding
      ? await this.denseSearch(embedding, fetchLimit, jurisdictions, minTrustTier)
      : [];

    // 3. Weighted RRF
    const lists: string[][] = [];
    if (sparseIds.length > 0) {
      for (let i = 0; i < Math.round(sparseWeight * 2); i++) lists.push(sparseIds);
    }
    if (denseIds.length > 0) {
      for (let i = 0; i < Math.round((1 - sparseWeight) * 2); i++) lists.push(denseIds);
    }
    if (lists.length === 0) return [];

    const rrfScores = reciprocalRankFusion(lists, this.config.rrfK);

    // 4. Fetch full documents for top candidates
    const topIds = Array.from(rrfScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, fetchLimit)
      .map(([id]) => id);

    const docs = await this.fetchDocuments(topIds);
    const docMap = new Map(docs.map((d) => [d.id, d]));

    // 5. Apply domain boost and finalize ranking
    const results: SearchResult[] = topIds
      .map((id) => {
        const doc = docMap.get(id);
        if (!doc) return null;
        // Date filter
        if (afterDate && doc.publishedAt && doc.publishedAt < afterDate) return null;

        const rrf = rrfScores.get(id) ?? 0;
        const boost = domainBoost(
          { jurisdiction: doc.jurisdiction, publishedAt: doc.publishedAt, trustTier: doc.trustTier },
          jurisdictions,
        );
        const score = rrf * boost;

        return {
          ...doc,
          score,
          ...(debug
            ? {
                scoreBreakdown: {
                  sparse: sparseIds.indexOf(id) >= 0 ? 1 / (this.config.rrfK + sparseIds.indexOf(id) + 1) : null,
                  dense: denseIds.indexOf(id) >= 0 ? 1 / (this.config.rrfK + denseIds.indexOf(id) + 1) : null,
                  rrf,
                  domainBoost: boost,
                },
              }
            : {}),
        } as SearchResult;
      })
      .filter(Boolean)
      .sort((a, b) => (b!.score - a!.score)) as SearchResult[];

    return results.slice(0, limit);
  }
}

// ── SQL functions required by the searcher (companion migration) ───────────────
// See: supabase/migrations/20260610003_hybrid_search.sql
// These are documented here for reference:
//
// search_knowledge_base_sparse(query_text, limit_count, jurisdiction_filter, trust_tier_max)
//   → Full-text search using tsvector/tsquery with GIN index
//
// search_knowledge_base_dense(query_embedding, limit_count, jurisdiction_filter, trust_tier_max)
//   → Vector cosine similarity search using pgvector IVFFlat index
