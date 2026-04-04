# Ingestion Runbook

This runbook documents the ingestion topology that already exists in the repo.
It is intentionally descriptive first: it explains current source -> function -> storage -> UI lineage before any new runtime work is added.

## Topology Summary

### AESO
- Source: AESO market and grid APIs
- Cron wrapper: `supabase/functions/aeso-ingestion-cron/index.ts`
- Stream function: `supabase/functions/stream-aeso-grid-data/index.ts`
- Supporting tables: operational logs, stream health, and market/grid storage used by Alberta dashboards
- UI surfaces: Alberta rate, queue, optimization, and market views

### Ontario
- Source: IESO market and power data
- Stream functions: `supabase/functions/stream-ontario-demand/index.ts`, `supabase/functions/stream-ontario-prices/index.ts`
- Supporting tables: Ontario demand, price, and stream health tables
- UI surfaces: Ontario demand, price, and analytics dashboards

### Weather / Open-Meteo observations with ECCC context
- Source: Open-Meteo weather observations used for the current cron job, with ECCC weather and climate context used in supporting docs and prompts
- Cron wrapper: `supabase/functions/weather-ingestion-cron/index.ts`
- Supporting tables: weather observations and weather-derived features
- UI surfaces: forecast, emissions, and weather-informed dashboards

### RAG / corpus
- Source: `docs/energy-corpus/*.md`
- Ingest function: `supabase/functions/energy-rag-ingest/index.ts`
- Retrieval function: `supabase/functions/energy-rag/index.ts`
- Supporting tables: `document_embeddings`, `document_embedding_jobs`
- UI surfaces: evidence panels, copilot flows, and future corpus-grounded AI

### System observability
- Manifest: `supabase/functions/manifest/index.ts`
- Health: `supabase/functions/ops-health/index.ts`
- UI surface: `/status`

## What Already Exists
- AESO cron and stream plumbing already exists.
- Ontario stream plumbing already exists.
- Weather ingestion plumbing already exists.
- RAG ingest/search plumbing already exists.
- Manifest and ops-health plumbing already exists.

## What Is Still Missing or Only Partially Scheduled
- A dedicated IESO cron wrapper if the team decides Ontario needs a cron-owned schedule rather than stream-only calls.
- A dedicated ECCC cron wrapper if weather needs a separate operational schedule beyond the current weather ingestion job.
- A more complete curated corpus before broader RAG tuning.

## Operating Rules
- Do not add a new cron/function unless the current topology proves a concrete gap.
- All user-facing outputs that consume these flows must preserve provenance and freshness metadata where available.
- If a surface cannot guarantee live data, it must say so explicitly.
