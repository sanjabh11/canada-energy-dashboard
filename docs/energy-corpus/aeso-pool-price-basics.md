# AESO Pool Price Basics

## Scope
Short reference notes for Alberta pool-price and market context.

## Core Concepts
- AESO pool price is the main Alberta wholesale electricity market signal surfaced by CEIP pricing and optimization flows.
- Pool-price outputs should always be paired with a source and a freshness timestamp.
- Snapshot or fallback values must be labeled honestly so they do not read as live market data.

## Why It Matters in CEIP
- Rate Watchdog, ROI tools, and Alberta market explanations depend on this context.
- Future RAG prompts should anchor price explanations to the market signal, not marketing language.

## Retrieval Hints
- Relevant entities: AESO, pool price, demand, generation mix, reserve margin.
- Relevant user intents: current price explanation, market condition summary, retail comparison, optimization opportunity.

## Primary Source Anchors
- https://www.aeso.ca/
- https://api.aeso.ca/
- https://www.aeso.ca/market/market-reports-and-publications/market-data/
