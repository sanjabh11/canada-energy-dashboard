# PRD: Carbon Emissions Tracking & Planner

## Overview
Sector-level emissions computations, policy impact modelling, reduction scenario comparison.

## Acceptance Criteria
- LLM can propose multi-scenario narratives.
- Translate numeric scenarios into policy briefs.
- Generate comms-friendly text for stakeholders.
- Endpoint /api/llm/emissions-planner; server computes numeric models, feeds results to Gemini for narrative descriptions and policy options.

## User Stories
- As a policy analyst, I want to track carbon emissions by sector to understand impact.
- As a planner, I want scenario comparisons for reduction strategies.

## Technical Requirements
- Integrate with Kaggle/HF emissions datasets.
- Server-side computation for numeric models.
- LLM for narrative generation.
- UI component for planner interface.

## Risks
- Data accuracy for emissions models.
- LLM not to give financial advice.

## Success Metrics
- Planner generates actionable policy briefs.
- UI loads emissions data correctly.
