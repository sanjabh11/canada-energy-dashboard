---
phase: "Phase 2"
updated: "2025-08-27"
story_points_progress: 15
summary: "Post-MVP gaps and tracking for Energy Data Streaming + LLM integration"
---

# Phase 2 Gap Analysis and Tracking

This document tracks gaps identified after MVP and the LLM Edge Function rollout, with status and owners. It complements the PRD in `prd.md` and PBI artifacts under `docs/delivery/`.

## Completed since MVP (counted towards 15 SP)

- Native Gemini integration in `supabase/functions/llm/call_llm_adapter.ts` with per-endpoint model selection
- Atomic rate limiter via RPC `public.llm_rl_increment` + `X-RateLimit-*` headers on responses
- Schema updates: `redaction_summary`, retention purge, `mv_llm_daily_spend` + refresh func
- `.env.example` created with client/server vars; README updated with Cloud setup and testing
- Tests updated with header assertions; optional 429 rate-limit test added (guarded by `TEST_RATE_LIMIT=1`)

## Open gaps (Phase 2 backlog)

- Strict JSON responses from LLM
  - Status: Proposed
  - Notes: consider `responseMimeType` or constrained JSON schema with safety. Add schema validation and fallbacks.

- Actual token usage logging
  - Status: Proposed
  - Notes: If Gemini usage metrics available, persist `input_tokens`, `output_tokens`, and compute exact `token_cost`.

- Cron-based maintenance
  - Status: Proposed
  - Notes: Create a scheduled function to call retention purge and refresh the daily spend materialized view.

- CI test workflow
  - Status: Proposed
  - Notes: GitHub Actions to run `pnpm exec tsc -b`, unit tests, and endpoint tests against a preview environment.

- Secrets management
  - Status: Proposed
  - Notes: Ensure `.env` not committed with real keys; use Supabase Secrets for Functions. Rotate existing keys.

- LLM Test Plan evidence (T10)
  - Status: In Progress
  - Notes: Capture curl outputs and header evidence; store in `docs/delivery/PBI-LLM-Gemini/test_evidence.md`.

- Cache module enhancements (T7)
  - Status: Proposed
  - Notes: Add cache versioning and eviction policy; expose cache hit/miss metrics.

- AbortController cleanup (T8)
  - Status: In Progress
  - Notes: Verify proper abort on component unmount and overlapping requests; ensure no dangling listeners.

## Acceptance checkpoints

- All endpoints return correct headers and safety codes (200/403/451/429) under test
- Database artifacts present; sanity SQL checks pass
- README and `.env.example` up to date; CI green

## Evidence pointers

- Code: `supabase/functions/llm/*`, `tests/test_llm_endpoints.js`
- Migrations: `supabase/migrations/20250827_llm_schemas.sql`
- Docs: `README.md`, this `Phase-2.md`
