# Task: Ops Health + Freshness Backbone Unification

**ID:** PBI-Adversarial-10x-Execution-T5
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
The repo already has an `ops-health` function plus frontend health UI, but the current panel is synthesizing metrics from unrelated endpoints instead of using the authoritative health contract. This task unifies the backend and frontend path so freshness and operational status are surfaced consistently.

## 2. Scope / Files
- `supabase/functions/ops-health/index.ts`
- `src/components/OpsHealthPanel.tsx`

## 3. Acceptance Criteria
- [ ] `ops-health` uses the correct server-side credentials and authoritative source tables.
- [ ] `OpsHealthPanel` consumes the `ops-health` endpoint directly instead of reconstructing metrics from unrelated APIs.
- [ ] Freshness and monitoring status are surfaced consistently in the panel.
- [ ] Existing validation checks remain green.

## 4. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`
4. Manual spot-check of the Ops Health UI payload contract

## 5. Status History
- 2026-03-24: Task created (InProgress)
- 2026-03-24: Unified `ops-health` with authoritative backend tables and switched `OpsHealthPanel` to the direct endpoint contract; validation passed (`pnpm exec tsc -b`, `pnpm exec vitest run`, `pnpm exec vite build`) and task moved to Review
