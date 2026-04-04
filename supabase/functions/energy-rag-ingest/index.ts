import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { applyRateLimit } from "../_shared/rateLimit.ts";
import { chunkCorpusDocument, getSeedCorpusDocuments, type ChunkedCorpusDocument } from "../_shared/ragChunking.ts";
import { createGeminiEmbedding, EMBEDDING_MODEL, isEmbeddingProviderConfigured, vectorLiteral } from "../_shared/ragEmbeddings.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
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

function isAuthorized(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  return authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    || authHeader === `Bearer ${CRON_SECRET}`
    || req.headers.get("x-supabase-cron") === "true";
}

async function logOpsRun(status: "success" | "failure", metadata: Record<string, unknown>, startedAt: number) {
  if (!supabase) return;
  await supabase.from("ops_runs").insert({
    run_type: "rag_ingestion",
    status,
    started_at: new Date(startedAt).toISOString(),
    completed_at: new Date().toISOString(),
    metadata,
  });
}

serve(async (req: Request) => {
  const rl = applyRateLimit(req, "energy-rag-ingest");
  if (rl.response) return rl.response;

  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  if (!supabase) {
    return jsonResponse(req, 503, { error: "Supabase service configuration missing" }, rl.headers);
  }

  if (!isAuthorized(req)) {
    return jsonResponse(req, 401, { error: "Unauthorized" }, rl.headers);
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("document_embedding_jobs")
      .select("id, job_type, status, source_type, source_id, chunks_total, chunks_embedded, metadata, started_at, completed_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return jsonResponse(req, 500, { error: error.message }, rl.headers);
    }

    return jsonResponse(req, 200, { jobs: data ?? [] }, rl.headers);
  }

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" }, rl.headers);
  }

  const startedAt = Date.now();
  const body = await req.json().catch(() => ({}));
  const sourceIds = Array.isArray(body?.sourceIds)
    ? body.sourceIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
    : null;
  const forceReembed = Boolean(body?.forceReembed);
  const maxChars = Number(body?.maxChars) > 200 ? Number(body.maxChars) : undefined;
  const overlapChars = Number(body?.overlapChars) > 0 ? Number(body.overlapChars) : undefined;
  const requester = req.headers.get("x-rag-requester") || "system";

  const documents = getSeedCorpusDocuments().filter((document) => !sourceIds || sourceIds.includes(document.sourceId));
  if (documents.length === 0) {
    return jsonResponse(req, 400, { error: "No corpus sources matched the request" }, rl.headers);
  }

  const jobInsert = await supabase
    .from("document_embedding_jobs")
    .insert({
      job_type: "ingest",
      status: "running",
      source_type: "energy_corpus",
      source_id: sourceIds?.join(",") || null,
      requested_by: requester,
      metadata: { sourceCount: documents.length, forceReembed, maxChars: maxChars ?? null, overlapChars: overlapChars ?? null },
      started_at: new Date(startedAt).toISOString(),
    })
    .select("id")
    .maybeSingle();

  const jobId = jobInsert.data?.id ?? null;

  try {
    const existingRowsResp = await supabase
      .from("document_embeddings")
      .select("source_type, source_id, chunk_index, content, embedding, embedding_model")
      .eq("source_type", "energy_corpus")
      .in("source_id", documents.map((document) => document.sourceId));

    if (existingRowsResp.error) {
      throw new Error(existingRowsResp.error.message);
    }

    const existingMap = new Map<string, { content: string; embedding: unknown; embedding_model: string | null }>();
    for (const row of existingRowsResp.data ?? []) {
      existingMap.set(`${row.source_type}:${row.source_id}:${row.chunk_index}`, {
        content: row.content,
        embedding: row.embedding,
        embedding_model: row.embedding_model,
      });
    }

    const allChunks: ChunkedCorpusDocument[] = documents.flatMap((document) => chunkCorpusDocument(document, { maxChars, overlapChars }));
    const rowsToUpsert: Array<Record<string, unknown>> = [];
    let chunksEmbedded = 0;

    for (const chunk of allChunks) {
      const existing = existingMap.get(`${chunk.sourceType}:${chunk.sourceId}:${chunk.chunkIndex}`);
      let embeddingLiteral: string | null = null;
      let embeddingModel: string | null = null;

      if (!forceReembed && existing && existing.content === chunk.content && existing.embedding) {
        embeddingLiteral = typeof existing.embedding === "string" ? existing.embedding : JSON.stringify(existing.embedding);
        embeddingModel = existing.embedding_model || EMBEDDING_MODEL;
      } else {
        const embedding = await createGeminiEmbedding(chunk.content, "RETRIEVAL_DOCUMENT").catch(() => null);
        if (embedding) {
          embeddingLiteral = vectorLiteral(embedding);
          embeddingModel = EMBEDDING_MODEL;
          chunksEmbedded += 1;
        }
      }

      rowsToUpsert.push({
        source_type: chunk.sourceType,
        source_id: chunk.sourceId,
        chunk_index: chunk.chunkIndex,
        title: chunk.title,
        content: chunk.content,
        source_url: chunk.sourceUrl || null,
        source_updated_at: chunk.sourceUpdatedAt,
        embedding: embeddingLiteral,
        embedding_model: embeddingModel,
        metadata: chunk.metadata,
      });
    }

    if (rowsToUpsert.length > 0) {
      const { error } = await supabase.from("document_embeddings").upsert(rowsToUpsert, {
        onConflict: "source_type,source_id,chunk_index"
      });
      if (error) {
        throw new Error(error.message);
      }
    }

    for (const document of documents) {
      const nextChunkCount = allChunks.filter((chunk) => chunk.sourceId === document.sourceId).length;
      const staleRows = (existingRowsResp.data ?? []).filter((row) => row.source_id === document.sourceId && row.chunk_index >= nextChunkCount);
      if (staleRows.length > 0) {
        const { error } = await supabase
          .from("document_embeddings")
          .delete()
          .eq("source_type", document.sourceType)
          .eq("source_id", document.sourceId)
          .gte("chunk_index", nextChunkCount);
        if (error) {
          throw new Error(error.message);
        }
      }
    }

    if (jobId) {
      await supabase
        .from("document_embedding_jobs")
        .update({
          status: "success",
          chunks_total: allChunks.length,
          chunks_embedded: chunksEmbedded,
          completed_at: new Date().toISOString(),
          metadata: {
            sourceIds: documents.map((document) => document.sourceId),
            forceReembed,
            embeddingModel: EMBEDDING_MODEL,
            embeddingProviderConfigured: isEmbeddingProviderConfigured(),
          },
        })
        .eq("id", jobId);
    }

    await logOpsRun("success", {
      jobId,
      sourceIds: documents.map((document) => document.sourceId),
      chunkCount: allChunks.length,
      chunksEmbedded,
      forceReembed,
      durationMs: Date.now() - startedAt,
    }, startedAt);

    return jsonResponse(req, 200, {
      ok: true,
      jobId,
      sourceIds: documents.map((document) => document.sourceId),
      chunksTotal: allChunks.length,
      chunksEmbedded,
      embeddingProviderConfigured: isEmbeddingProviderConfigured(),
      durationMs: Date.now() - startedAt,
    }, rl.headers);
  } catch (error) {
    if (jobId) {
      await supabase
        .from("document_embedding_jobs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          metadata: { error: String(error), forceReembed, sourceIds: documents.map((document) => document.sourceId) },
        })
        .eq("id", jobId);
    }

    await logOpsRun("failure", {
      jobId,
      sourceIds: documents.map((document) => document.sourceId),
      error: String(error),
      durationMs: Date.now() - startedAt,
    }, startedAt);

    return jsonResponse(req, 500, { error: String(error), jobId }, rl.headers);
  }
});
