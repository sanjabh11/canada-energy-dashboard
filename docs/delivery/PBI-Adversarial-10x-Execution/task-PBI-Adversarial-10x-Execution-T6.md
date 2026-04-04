# Task: RAG Ingestion Pipeline for Chunking and Embeddings

**ID:** PBI-Adversarial-10x-Execution-T6
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
The repo now contains a canonical `document_embeddings` store and a retrieval endpoint, but lacks a deterministic ingestion pipeline that chunks source content and writes rows with optional embeddings. This task implements the production path for corpus ingestion.

## 2. Scope / Files
- `supabase/functions/_shared/ragChunking.ts` (new)
- `supabase/functions/_shared/ragEmbeddings.ts` (new)
- `supabase/functions/energy-rag-ingest/index.ts` (new)
- `supabase/functions/energy-rag/index.ts`
- `supabase/migrations/20260324003_document_embedding_jobs.sql` (new)

## 3. Acceptance Criteria
- [ ] Shared deterministic chunking exists for corpus ingestion.
- [ ] An ingestion edge function can read corpus sources, chunk them, and upsert `document_embeddings`.
- [ ] Embedding generation is provider-gated and non-destructive when unavailable.
- [ ] Ingestion job status is observable for retries and ops tracking.
- [ ] Existing validation checks remain green.

## 4. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`
4. Manual review of ingestion response payload and resulting DB write contract

## 5. Status History
- 2026-03-24: Task created (Proposed)
- 2026-03-24: Shared rag embedding helper added to authorized scope before implementation
- 2026-03-24: Implementation completed for shared chunking, ingestion orchestration, job logging, and server-side retrieval embeddings
- 2026-03-24: Validation completed with `pnpm exec tsc -b`, `pnpm exec vitest run`, and `pnpm exec vite build`
