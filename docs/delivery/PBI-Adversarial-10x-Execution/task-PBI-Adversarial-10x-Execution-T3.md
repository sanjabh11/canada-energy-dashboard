# Task: pgvector Document Embeddings + Retrieval Scaffold

**ID:** PBI-Adversarial-10x-Execution-T3
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
With Phase 0-1 foundations in place, the next verified Phase 2 step is to add the database and edge-function scaffolding required for real document retrieval. This task focuses on enabling `pgvector`, creating a canonical `document_embeddings` store, and exposing a retrieval endpoint that can support both vector and lexical fallback paths.

## 2. Scope / Files
- `supabase/migrations/20260324002_document_embeddings.sql` (new)
- `supabase/functions/energy-rag/index.ts` (new)

## 3. Acceptance Criteria
- [ ] Supabase migration enables `vector` support and creates a canonical `document_embeddings` table.
- [ ] A SQL search function exists for similarity retrieval over embedded documents.
- [ ] A Supabase Edge function exposes retrieval over the new table with safe request validation and lexical fallback when embeddings are unavailable.
- [ ] The new scaffold does not break existing type-check, tests, or build.

## 4. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`
4. Review generated SQL and edge function request/response shape

## 5. Status History
- 2026-03-24: Task created (InProgress)
- 2026-03-24: Added `document_embeddings` migration and `energy-rag` edge function; validation passed (`pnpm exec tsc -b`, `pnpm exec vitest run`, `pnpm exec vite build`) and task moved to Review
