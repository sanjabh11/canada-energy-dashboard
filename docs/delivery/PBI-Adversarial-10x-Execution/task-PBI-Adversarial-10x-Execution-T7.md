# Task: Retrieval-Aware Client and UI Integration

**ID:** PBI-Adversarial-10x-Execution-T7
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
The retrieval backend exists, but frontend consumers cannot directly inspect or reuse retrieval output. This task exposes `energy-rag` through the client layer and adds a trustworthy evidence surface in key AI panels.

## 2. Scope / Files
- `src/lib/constants.ts`
- `src/lib/llmClient.ts`
- `src/components/RetrievedEvidencePanel.tsx` (new)
- `src/components/TransitionReportPanel.tsx`
- `src/components/DataQualityPanel.tsx`

## 3. Acceptance Criteria
- [ ] A typed frontend client exists for `energy-rag`.
- [ ] At least two existing AI panels can display retrieved evidence/snippets.
- [ ] Retrieval UI degrades safely when edge fetch is unavailable.
- [ ] Existing validation checks remain green.

## 4. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`
4. Manual review of evidence panel rendering and retrieval payload contract

## 5. Status History
- 2026-03-24: Task created (Proposed)
- 2026-03-24: Implementation started for typed retrieval client and reusable evidence UI
- 2026-03-24: Implementation completed for typed `energy-rag` client support and evidence rendering in primary AI panels
- 2026-03-24: Validation completed with `pnpm exec tsc -b`, `pnpm exec vitest run`, and `pnpm exec vite build`
