# PRD: Adversarial Analysis 10x Execution (Phases 0-4)

## 1. Problem Statement
The adversarial analysis correctly identifies that the platform will not achieve a 10x improvement by layering more AI on top of weak foundations. However, the current repository state is mixed:
- Some assumptions in `docs/ADVERSARIAL_TOOLS_ANALYSIS.md` are stale because the repo already contains prompt-template groundwork, a knowledge-base module, freshness UI, ops-health UI, and lead lifecycle schema/functions.
- The highest-risk foundational gaps are still real: there is no GitHub Actions CI, no real Vitest or Playwright test infrastructure, and no pgvector/RAG pipeline.
- Lead capture still stores PII in browser `localStorage` and posts to an incorrect path instead of the deployed Netlify function.
- Netlify lead persistence currently uses browser-facing Supabase env names/keys instead of a server-side trust model.
- Data freshness transparency exists in parts of the stack but is not yet a consistent contract across user-facing data endpoints.

## 2. Goals
1. Establish a verified Phase 0-4 execution path based on the live codebase rather than stale assumptions.
2. Land the highest-leverage Phase 0 foundation work first: test infrastructure, CI, and secure lead capture.
3. Build toward Phase 1-2 prerequisites for trustworthy AI: explicit prompt infrastructure, freshness metadata, and a corpus/RAG foundation.
4. Keep all work scoped through explicit Tier 2 delivery records before touching broader Phase 2-4 surfaces.

## 3. Scope
### In Scope
- Verification-driven implementation of the adversarial plan across Phases 0-4.
- Phase 0 initial slice: Vitest setup, first unit tests, GitHub Actions CI, lead capture hardening, and server-side persistence fixes.
- Task-scoped follow-on work for Phase 1-4 items such as prompt-template consolidation, freshness metadata, corpus, lineage docs, pgvector, embeddings, and RAG.

### Out of Scope
- Python-side dbt, GE, PySpark, Streamlit, or FastAPI adoption.
- Full Phase 2-4 implementation in a single unscoped task.
- Production deployment or environment provisioning.

## 4. Success Metrics
- GitHub Actions CI exists and runs build, type-check, and unit tests on push/PR.
- Vitest is configured and covers the first critical libraries named in Phase 0.
- Email capture no longer persists captured emails in browser storage and resolves to the correct server function path.
- Lead persistence uses server-side credentials compatible with the existing `lead_intent` / `lead_lifecycle` schema and RLS expectations.
- Subsequent Phase 1-4 work is attached to task records before touching new file groups.
