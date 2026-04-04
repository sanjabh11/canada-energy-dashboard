# IESO Power Data Basics

## Scope
Short reference notes for Ontario power-data and market context.

## Core Concepts
- IESO power-data pages provide Ontario demand, price, and market context used by CEIP Ontario flows.
- Ontario outputs should preserve timestamps and market-design caveats so they do not get flattened into Alberta-style logic.
- When data is missing, the product should say so instead of implying live certainty.

## Why It Matters in CEIP
- Ontario dashboards and AI responses need operator-specific language.
- Future RAG prompts should retrieve IESO context before generating Ontario market explanations.

## Retrieval Hints
- Relevant entities: IESO, Ontario demand, HOEP, resource adequacy, market operations.
- Relevant user intents: Ontario market summary, reliability conditions, demand trend analysis, price explanation.

## Primary Source Anchors
- https://www.ieso.ca/
- https://www.ieso.ca/en/Power-Data
- https://www.ieso.ca/en/Sector-Participants/Market-Operations
