# Task: Freshness Metadata + Phase 1 Knowledge Foundation

**ID:** PBI-Adversarial-10x-Execution-T2
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
The repo already contains partial prompt and knowledge groundwork, so the next verified Phase 1 priority is not “start from zero.” It is to make AI responses more honest and traceable via freshness metadata, and to create the corpus/lineage assets needed for trustworthy Phase 2 RAG work.

## 2. Scope / Files
- `supabase/functions/llm/llm_app.ts`
- `supabase/functions/llm-lite/index.ts`
- `src/lib/llmClient.ts`
- `tests/unit/llmClient.test.ts`
- `docs/energy-corpus/README.md` (new)
- `docs/energy-corpus/aeso-market-basics.md` (new)
- `docs/energy-corpus/ieso-market-basics.md` (new)
- `docs/energy-corpus/alberta-tier-basics.md` (new)
- `docs/energy-corpus/oeb-chapter-5-basics.md` (new)
- `docs/DATA_LINEAGE.md` (new)

## 3. Acceptance Criteria
- [ ] Core LLM response payloads include a consistent `meta` envelope with freshness/source/fallback context.
- [ ] Frontend client types accept the new metadata contract without breaking existing consumers.
- [ ] `docs/energy-corpus/` exists with initial authoritative source documents for later embedding/RAG work.
- [ ] A Mermaid lineage document exists for major source → function → dashboard flows.

## 4. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`
4. Manual payload check against one LLM endpoint response shape

## 5. Status History
- 2026-03-24: Task created (InProgress)
- 2026-03-24: Added LLM response metadata contract, corpus seed docs, and lineage doc; validation passed (`pnpm exec tsc -b`, `pnpm exec vitest run`, `pnpm exec vite build`) and task moved to Review
