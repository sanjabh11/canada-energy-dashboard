# Phase 1-3 Gap Implementation Plan

## Executive Summary

This document consolidates the verified gap analysis for **Phase 1 (Data Foundation)**, **Phase 2 (Real-Time & Historical Data)**, and **Phase 3 (Help & AI Enablement)**. It translates the open issues identified in `PHASE3_CORRECTED_GAP_ANALYSIS.md`, `PHASE4_CORRECTED_GAP_ANALYSIS.md`, and the most recent Supabase audit into a concrete remediation plan. The aim is to bring the backend into alignment with `docs/Ph2.md` and `docs/Ph3.md` so that Phase 4 feature work can commence on a stable, production-ready base.

**Current reality**

- Frontend coverage is strong: `src/components/` already implements nearly every user story in the PRD.
- Backend services are incomplete: multiple Supabase tables, edge functions, and REST endpoints are missing, unseeded, or still returning mock data.
- Operational controls (migrations, seeds, LLM governance) remain ad hoc; there is no single, authoritative rollout checklist.

The following sections outline the work required to close each gap cluster.

---

## Phase 1 6 Data Foundation

### Gap summary

- Core tables (`help_content`, `help_feedback`, `ontario_hourly_demand`, `provincial_generation`, `alberta_supply_demand`, `weather_data`, `source_health`) exist but lack consistent indexes, foreign keys, and seed data.
- Schema required by the frontend and edge functions (e.g., `grid_status`, `grid_stability_metrics`, `security_incidents`, `threat_models`, `mitigation_strategies`, `consultation_events`) is absent or only defined locally in migrations that were never applied remotely.
- Migration history in `supabase/migrations/` has drifted from the deployed Supabase project `qnymbecjgeaoxsfphrti`.
- Reference data such as stream manifests and enumerations is missing or outdated relative to component expectations.

### Immediate actions

1. **Audit schema**
   - Run `supabase db dump --remote --schema public` and diff against the local migrations directory.
   - Produce a checklist of scripts that have not yet been executed in the cloud project.
2. **Reconcile migrations**
   - Apply pending SQL scripts with idempotent guards (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO UPDATE`).
   - Author new migrations covering any missing tables, indexes, policies, or RPC helpers.
3. **Seed reference data**
   - Populate `help_content` and `help_feedback` so they match the `LOCAL_FALLBACK` entries in `src/components/HelpButton.tsx`.
   - Insert baseline rows for `source_health`, `stream_manifest`, and any enumerations consumed by the UI.
4. **Document environment requirements**
   - Update `.env.example` with all required keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_EDGE_BASE`, etc.).
   - Record deployment steps in `docs/operations/migrations.md` (new file if necessary).

### Deliverables

- Supabase migration history reconciled with the repo.
- Seed scripts (SQL or TypeScript) checked in for canonical reference data.
- Updated operations documentation describing the Phase 1 rollout workflow.

---

## Phase 2 6 Real-Time & Historical Data Integration

### Gap summary

- Edge functions under `supabase/functions/stream-*` still emit mock payloads and do not call real providers (IESO, AESO, Kaggle, HuggingFace).
- There is no persistence layer for streamed data (snapshots, error logs, health metrics) to support charts or analytics.
- REST endpoints referenced by the frontend (`/api/grid/status`, `/api/security/threat-models`, etc.) are missing entirely.
- Feature flags in `src/lib/config.ts` (`VITE_USE_STREAMING_DATASETS`, `VITE_ENABLE_LIVE_STREAMING`) are enabled without working backends, forcing UI components to fall back to placeholders.

### Immediate actions

1. **Implement live integrations**
   - Replace mock data in each streaming function with real API calls, including retry/backoff logic and graceful error handling.
   - Normalise responses and persist them to Supabase tables for historical analysis.
2. **Backfill historical datasets**
   - Create batch loaders (scheduled edge functions or CLI scripts) that ingest Kaggle and HuggingFace data into Supabase.
3. **Expose REST endpoints**
   - Build `supabase/functions/api-v2-*` handlers (or PostgREST views/RPCs) that serve curated datasets to the frontend components.
4. **Introduce health monitoring**
   - Add tables such as `stream_health` and `edge_invocation_log`, plus `/health` endpoints, to track uptime and error rates.
5. **Manage feature flags**
   - Keep streaming-related flags disabled until all endpoints are verified end-to-end, then document the enablement procedure.

### Deliverables

- Production-ready streaming functions with updated entries in `supabase/config.toml`.
- New migrations covering snapshot/history tables and health monitoring artifacts.
- Integration test suite (curl/Postman) that validates every REST and streaming endpoint.
- Runbook detailing data flows, expected update cadence, and recovery steps.

---

## Phase 3 6 Help System & AI Enablement

### Gap summary

- `help_content` exists but remains partially populated; the UI still relies on hard-coded `LOCAL_FALLBACK` strings.
- `supabase/functions/help/index.ts` returns 404 for most IDs because the database is empty or inconsistent.
- LLM services (`supabase/functions/llm/*` and tables prefixed with `llm_`) lack logging, rate limiting, and prompt governance aligned with `docs/Ph3.md`.
- `PHASE3_PROGRESS.md` is outdated and does not reflect the latest findings or priorities.

### Immediate actions

1. **Seed help entries**
   - Import canonical markdown for every help ID and verify via `/help/api/help/manifest` + `/help/api/help/{id}`.
2. **Admin workflow**
   - Provide a secure way to add or edit help content (edge function plus service role key or controlled SQL scripts) and document the process.
3. **LLM governance**
   - Ensure every inference logs to `llm_call_log`, enforce quotas using `llm_rate_limit`, and capture feedback in `llm_feedback`.
4. **Update progress tracker**
   - Rewrite `PHASE3_PROGRESS.md` to reflect completed analysis, remaining tasks, and the new sequencing.

### Deliverables

- Fully seeded help tables with supporting scripts.
- Documented content-edit workflow and access controls.
- LLM observability checklist, including rate limiting and feedback loops.
- Updated Phase 3 tracker aligned with the remediation plan.

---

## Cross-Cutting Workstreams

### Testing & reliability

- Expand automated coverage for edge functions, REST endpoints, and Supabase RPCs.
- Add timeouts to integration tests that call external services (`tests/test_llm_endpoints.js`, `tests/cloud_health.mjs`) to prevent CI hangs.
- Introduce smoke tests that run after every deploy to validate data availability and API behaviour.

### Tooling & operations

- Standardise Supabase CLI usage (`supabase login`, `supabase db push`, `supabase functions deploy`) and capture the workflow in docs.
- Maintain environment parity with `.env.local.example` and `.env.production`; keep secrets out of version control.
- Consider automating migrations and edge-function deployments via CI once manual steps are stable.

### Documentation & tracking

- Replace references to the old Phase 4 summary in `prd.md` with the new file name `docs/PHASE1-3_GAP_IMPLEMENTATION_PLAN.md`.
- Keep progress trackers (`PHASE3_PROGRESS.md`, future Phase 4 logs) synchronised with actual work.
- Maintain a running changelog (`docs/operations/changelog.md`) noting migration executions and data seeding events.

---

## Implementation Checklist

- **Phase 1 (Foundation)**
  - Dump remote schema, reconcile migrations, seed reference data, and verify Supabase REST access/RLS.
- **Phase 2 (Data Integration)**
  - Replace mock payloads with live integrations, backfill history, expose REST endpoints, and add health monitoring.
- **Phase 3 (Help & AI)**
  - Seed help content, implement admin tooling, add LLM governance controls, and refresh `PHASE3_PROGRESS.md`.

Completion of this checklist will unlock Phase 4 work defined in `docs/Ph4.md`, ensuring new features launch on a reliable, fully instrumented backend.
