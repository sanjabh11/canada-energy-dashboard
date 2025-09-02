# PRD: Energy Market Intelligence Platform

## Overview
Price forecasting models, trading signal support, risk alerts.

## Acceptance Criteria
- LLM can summarize market drivers, generate plain-language briefings, and produce scenario narratives.
- Do not use LLM for automated trading signals.
- Integrate short RAG context from recent news (Perplexity) & market data.

## User Stories
- As a market analyst, I want to see price forecasts and risk alerts.
- As a trader, I want plain-language briefings on market drivers.

## Technical Requirements
- Endpoint /api/llm/market-brief.
- Integrate with Perplexity for news RAG.
- UI for market intelligence display.

## Risks
- Do not give trading advice.

## Success Metrics
- Briefings are plain-language and accurate.
- UI loads market data correctly.
