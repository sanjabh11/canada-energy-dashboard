# Data Lineage

This is the lightweight, human-readable lineage view for the CEIP codebase.
It intentionally tracks the highest-value source-to-surface paths without requiring heavyweight metadata tooling.

## Core Lineage

```mermaid
graph TD
  AESO[AESO / Alberta market sources] --> AESOService[src/lib/aesoService.ts]
  AESOService --> Watchdog[Rate Watchdog / ROI / Alberta dashboards]

  IESO[IESO / Ontario market sources] --> OntarioFns[supabase/functions/stream-ontario-*.ts]
  OntarioFns --> OntarioUI[Ontario dashboards and grid views]

  Corp[docs/energy-corpus/*.md] --> RagIngest[supabase/functions/energy-rag-ingest/index.ts]
  RagIngest --> RagTables[(document_embeddings / document_embedding_jobs)]
  RagTables --> RagSearch[supabase/functions/energy-rag/index.ts]
  RagSearch --> Copilot[LLM and copilot surfaces]

  GridOps[supabase operational tables] --> LlmApp[supabase/functions/llm/llm_app.ts]
  LlmApp --> Analytics[Analytics / transition / optimization dashboards]

  LeadUI[public pricing / contact flows] --> LeadCapture[supabase/functions/lead-capture/index.ts]
  LeadCapture --> Leads[(lead lifecycle and intake tables)]
```

## Notes
- `source`, `last_updated`, `freshness_status`, and `is_fallback` are the shared contract for high-risk live-data surfaces.
- Seed corpus documents are deliberately short and source-anchored so future RAG ingestion can keep provenance stable.
- The layout is intentionally smaller than a full data-catalog tool; the repo does not yet justify that overhead.

## Next Expansion
- Add AESO/IESO/ECCC ingestion tables to this map as Phase 3 matures.
- Add more corpus documents as the curated set grows.
- Expand this document only when the lineage changes materially for a user-facing flow.
