# AESO Market Basics

## Scope
High-level reference notes for Alberta power market context used by CEIP dashboards and future RAG features.

## Core Concepts
- The Alberta Electric System Operator (AESO) operates Alberta's interconnected electric system and wholesale electricity market.
- Alberta's energy market is commonly described as an energy-only market with pool-price settlement and balancing/system-operator functions run by AESO.
- Pool price is commonly expressed in dollars per megawatt-hour and is one of the main reference signals for retail, industrial, and optimization workflows.
- Demand, generation mix, outages, congestion, and reserve conditions can materially affect price and dispatch conditions.

## Why It Matters in CEIP
- `src/lib/aesoService.ts` powers Alberta-oriented household and market experiences.
- Rate Watchdog, ROI calculations, and AI explanations need clear separation between live data, cached data, and modeled fallbacks.
- Future ingestion work should prioritize live price, demand, and generation snapshots from authoritative operator sources.

## Retrieval Hints
- Relevant entities: AESO, pool price, Alberta demand, generation mix, transmission constraints, reserve margin.
- Relevant user intents: fixed-vs-RRO comparison, grid optimization, wholesale price explanation, market condition summary.

## Primary Source Anchors
- https://www.aeso.ca/
- https://api.aeso.ca/
- https://www.aeso.ca/market/
