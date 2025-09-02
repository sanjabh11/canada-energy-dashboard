# PBI-EDSI-MVP: Energy Data Streaming Integration MVP

This mini-PRD references the root `prd.md` for the broader product context and constrains scope to streaming integration for the dashboard datasets.

Scope:
- Centralize Supabase config and edge function access.
- Unified streaming feature flag.
- Standardized endpoint variants (dashed and nested) for edge functions.
- Normalized fallback handling.
- UI shows actual data source (stream vs fallback).
- Add minimal IndexedDB caching and wire to data manager.
- Add abort handling in dashboard to prevent overlapping loads.
- Provide environment example and setup docs.
- Provide compact test plan and evidence.

Acceptance Criteria:
- When `VITE_USE_STREAMING_DATASETS=true` and envs are valid, datasets stream successfully and UI shows Source: Stream.
- When streaming fails or is disabled, fallback JSON loads and UI shows Source: Fallback.
- Endpoint style changes (dashed/nested) do not break streaming.
- IndexedDB persists last successful load and can be used when both stream and fallback fail.
- AbortController prevents overlapping loads and no UI glitches occur.
- README documents envs and security expectations; .env.example exists.
- Test evidence captured for the above.
