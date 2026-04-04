# Task: Runtime Fallback Transparency and Mock Data Disclosure

**ID:** PBI-Adversarial-10x-Execution-T9
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
The adversarial execution work improved freshness, provenance, and retrieval trust, but some runtime paths still degrade into fallback or mock data without a strong and consistent user-facing disclosure. This task closes the highest-leverage remaining trust gap by making fallback state first-class in shared runtime hooks and by surfacing explicit disclosure in key user-facing dashboards.

## 2. Scope / Files
- `src/lib/data/streamingService.ts`
- `src/hooks/useStreamingData.ts`
- `src/components/DataTrustNotice.tsx` (new)
- `src/components/InvestmentCards.tsx`
- `src/components/GridOptimizationDashboard.tsx`
- `src/components/SecurityDashboard.tsx`
- `src/components/InnovationSearch.tsx`

## 3. Acceptance Criteria
- [ ] Shared streaming fallback is represented explicitly rather than being collapsed into a healthy connected state.
- [ ] Key dashboards display a clear trust notice when using fallback or illustrative data.
- [ ] Innovation discovery UI no longer silently presents mock/demo content as if it were live production data.
- [ ] Existing validation checks remain green.

## 4. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`
4. Manual review of fallback/mock notices in the updated dashboards

## 5. Status History
- 2026-03-25: Task created (InProgress)
- 2026-03-25: Implemented first-class fallback stream state plus explicit fallback/mock notices in scoped user-facing dashboards
- 2026-03-25: Validation completed with `pnpm exec tsc -b`, `pnpm exec vitest run`, and `pnpm exec vite build`
