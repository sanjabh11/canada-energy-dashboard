# IESO Market Basics

## Scope
Seed reference for Ontario electricity-market concepts needed by dashboards, LLM prompts, and later retrieval pipelines.

## Core Concepts
- The Independent Electricity System Operator (IESO) operates Ontario's bulk electricity system and market administration functions.
- Ontario market context often includes demand, supply mix, imports/exports, reliability conditions, and procurement/resource adequacy mechanisms.
- Operational conditions can differ significantly from Alberta, so prompts and retrieval should not collapse AESO and IESO context into one generic market model.
- Ontario-facing analytics should preserve source identity, timestamps, and any market-design caveats relevant to the queried metric.

## Why It Matters in CEIP
- Ontario demand and transition dashboards need operator-specific language and provenance.
- Future AI responses should distinguish between Alberta pool-price logic and Ontario market/operator context.
- Planned ingestion and freshness work should treat IESO data as a first-class operational source, not a generic provincial feed.

## Retrieval Hints
- Relevant entities: IESO, Ontario demand, resource adequacy, imports, exports, generation mix, market report.
- Relevant user intents: Ontario market summary, reliability conditions, transition KPI explanation, demand trend analysis.

## Primary Source Anchors
- https://www.ieso.ca/
- https://www.ieso.ca/en/Power-Data
- https://www.ieso.ca/en/Sector-Participants/Market-Operations
