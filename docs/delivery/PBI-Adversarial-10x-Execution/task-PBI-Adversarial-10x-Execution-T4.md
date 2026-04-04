# Task: Prompt Grounding with Retrieved Corpus Context

**ID:** PBI-Adversarial-10x-Execution-T4
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
The retrieval scaffold exists, but Phase 3 value is only realized when LLM prompts use retrieved corpus context. This task grounds key LLM handlers with curated corpus snippets so AI outputs are more source-aware and less likely to hallucinate generic market or regulatory guidance.

## 2. Scope / Files
- `supabase/functions/llm/llm_app.ts`

## 3. Acceptance Criteria
- [ ] Key LLM handlers retrieve relevant corpus snippets before generating responses.
- [ ] Retrieved corpus context is injected into prompts in a consistent, bounded format.
- [ ] Response provenance includes the retrieved corpus references alongside existing data/grid sources.
- [ ] Existing validation checks remain green.

## 4. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`
4. Manual spot-check of one LLM response payload for corpus-backed sources

## 5. Status History
- 2026-03-24: Task created (InProgress)
- 2026-03-24: Added corpus-grounded prompt retrieval in key LLM handlers; validation passed (`pnpm exec tsc -b`, `pnpm exec vitest run`, `pnpm exec vite build`) and task moved to Review
