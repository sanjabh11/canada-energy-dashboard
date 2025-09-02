# PRD: Community Energy Planning Assistant

## Overview
Templates for local energy plans, customized incentives mapping, community-facing UI.

## Acceptance Criteria
- LLM can auto-generate a draft local plan (starter text, steps, funding sources).
- Must provide citations and require human review.
- Endpoint /api/llm/community-plan that uses manifest + local data fragments.

## User Stories
- As a municipal planner, I want draft energy plans for my community.

## Technical Requirements
- Endpoint /api/llm/community-plan.
- Use manifest + local data.
- UI for plan display.

## Risks
- Require human review.

## Success Metrics
- Draft plans are useful and cited.
