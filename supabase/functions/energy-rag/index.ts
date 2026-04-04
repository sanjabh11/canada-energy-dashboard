import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit, getClientId, logApiUsage } from "../_shared/rateLimit.ts";
import { createGeminiEmbedding, EMBEDDING_DIMENSION, isEmbeddingProviderConfigured, vectorLiteral } from "../_shared/ragEmbeddings.ts";
import { chunkCorpusDocument, getSeedCorpusDocuments } from "../_shared/ragChunking.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MAX_LIMIT = 10;
const MAX_QUERY_LENGTH = 500;
const MAX_SOURCE_TYPES = 10;
const LOCAL_CORPUS_CHUNKS = getSeedCorpusDocuments().flatMap((document) => chunkCorpusDocument(document));

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

function jsonResponse(req: Request, status: number, body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...createCorsHeaders(req),
      ...extraHeaders,
    },
  });
}

function normalizeSourceTypes(input: unknown): string[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  const normalized = input
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_SOURCE_TYPES);

  return normalized.length > 0 ? normalized : null;
}

function normalizeEmbedding(input: unknown): number[] | null {
  if (!Array.isArray(input) || input.length !== EMBEDDING_DIMENSION) {
    return null;
  }

  const values = input.map((value) => Number(value));
  return values.every((value) => Number.isFinite(value)) ? values : null;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function searchSeedCorpus(query: string, limit: number, sourceTypes: string[] | null): unknown[] {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) {
    return [];
  }

  return LOCAL_CORPUS_CHUNKS
    .filter((chunk) => !sourceTypes || sourceTypes.length === 0 || sourceTypes.includes(chunk.sourceType))
    .map((chunk) => {
      const haystack = `${chunk.title} ${chunk.content} ${JSON.stringify(chunk.metadata)}`;
      const hayTokens = tokenize(haystack);
      let score = 0;
      for (const token of hayTokens) {
        if (queryTokens.has(token)) score += 1;
      }

      return {
        id: chunk.chunkId,
        source_type: chunk.sourceType,
        source_id: chunk.sourceId,
        chunk_index: chunk.chunkIndex,
        title: chunk.title,
        content: chunk.content,
        source_url: chunk.sourceUrl,
        source_updated_at: chunk.sourceUpdatedAt,
        metadata: chunk.metadata,
        rank: score,
      };
    })
    .filter((row) => row.rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}

serve(async (req: Request) => {
  // Handle CORS preflight FIRST - before any processing
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const corsHeaders = createCorsHeaders(req);
  const rl = applyRateLimit(req, 'energy-rag');
  if (rl.response) return rl.response;

  const startedAt = Date.now();
  const clientId = getClientId(req);
  const apiKey = clientId.startsWith('key:') ? clientId.slice(4) : null;
  const ipAddress = clientId.startsWith('ip:') ? clientId.slice(3) : null;

  try {
    if (req.method !== 'POST') {
      return jsonResponse(req, 405, { error: 'Method not allowed' }, { ...corsHeaders, ...rl.headers });
    }

    if (!supabase) {
      return jsonResponse(req, 503, { error: 'Supabase service configuration missing' }, { ...corsHeaders, ...rl.headers });
    }

    const body = await req.json().catch(() => ({}));
    const query = typeof body?.query === 'string' ? body.query.trim() : '';
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(body?.limit) || 5));
    const sourceTypes = normalizeSourceTypes(body?.sourceTypes);
    let queryEmbedding = normalizeEmbedding(body?.queryEmbedding);

    if (!query || query.length > MAX_QUERY_LENGTH) {
      return jsonResponse(req, 400, { error: 'query must be a non-empty string up to 500 characters' }, { ...corsHeaders, ...rl.headers });
    }

    if (!queryEmbedding && isEmbeddingProviderConfigured()) {
      queryEmbedding = await createGeminiEmbedding(query, 'RETRIEVAL_QUERY').catch(() => null);
    }

    let mode: 'vector' | 'lexical' = 'lexical';
    let fallbackReason: string | null = null;
    let results: unknown[] = [];

    if (queryEmbedding) {
      const { data, error } = await supabase.rpc('match_document_embeddings', {
        query_embedding: vectorLiteral(queryEmbedding),
        match_count: limit,
        filter_source_types: sourceTypes,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        mode = 'vector';
        results = data;
      } else {
        fallbackReason = error?.message ?? 'no_vector_results';
      }
    } else {
      fallbackReason = 'query_embedding_unavailable';
    }

    if (mode === 'lexical') {
      const { data, error } = await supabase.rpc('search_document_embeddings_lexical', {
        search_query: query,
        match_count: limit,
        filter_source_types: sourceTypes,
      });

      if (error) {
        await logApiUsage({
          endpoint: 'energy-rag',
          method: req.method,
          statusCode: 500,
          apiKey,
          ipAddress,
          responseTimeMs: Date.now() - startedAt,
          extra: { queryLength: query.length, limit, fallbackReason: error.message },
        });

        const localResults = searchSeedCorpus(query, limit, sourceTypes);
        if (localResults.length === 0) {
          return jsonResponse(req, 200, {
            query,
            mode: 'lexical',
            results: [],
            meta: {
              usedEmbedding: Boolean(queryEmbedding),
              fallbackReason: error.message,
              limit,
              resultCount: 0,
              sourceTypes: sourceTypes ?? [],
            },
          }, { ...corsHeaders, ...rl.headers });
        }

        mode = 'lexical';
        fallbackReason = `${error.message};local_seed_corpus`;
        results = localResults;
      } else {
        results = Array.isArray(data) ? data : [];
      }
    }

    await logApiUsage({
      endpoint: 'energy-rag',
      method: req.method,
      statusCode: 200,
      apiKey,
      ipAddress,
      responseTimeMs: Date.now() - startedAt,
      extra: {
        mode,
        queryLength: query.length,
        limit,
        resultCount: results.length,
        sourceTypes,
        fallbackReason,
      },
    });

    return jsonResponse(req, 200, {
      query,
      mode,
      results,
      meta: {
        usedEmbedding: Boolean(queryEmbedding),
        fallbackReason,
        limit,
        resultCount: results.length,
        sourceTypes: sourceTypes ?? [],
      },
    }, { ...corsHeaders, ...rl.headers });
  } catch (error) {
    await logApiUsage({
      endpoint: 'energy-rag',
      method: req.method,
      statusCode: 500,
      apiKey,
      ipAddress,
      responseTimeMs: Date.now() - startedAt,
      extra: { error: String(error) },
    });

    return jsonResponse(req, 500, { error: String(error) }, { ...corsHeaders, ...rl.headers });
  }
});
