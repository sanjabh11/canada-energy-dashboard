# Task: High-Visibility Mock Data Disclosure (Renewable, Compliance, RealTime)

**ID:** PBI-Adversarial-10x-Execution-T11
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
Three high-visibility components contain significant mock data usage without explicit user disclosure. This creates a trust risk where users may interpret demonstration data as production data.

Components:
- RenewableOptimizationHub: 21 mock data references (forecasts, performance metrics)
- ComplianceDashboard: 11 mock data references (violations, compliance scores)
- RealTimeDashboard: 2 mock data references ("real-time" data)

## 2. Scope / Files
- `src/components/RenewableOptimizationHub.tsx`
- `src/components/ComplianceDashboard.tsx`
- `src/components/RealTimeDashboard.tsx`

## 3. Implementation
- Track when mock data is being used (add `usingMockData` state)
- Import and use `DataTrustNotice` with `mode="mock"`
- Update loading/fallback logic to set mock state correctly
- Add clear messaging that data is illustrative/demo only

## 4. Acceptance Criteria
- [ ] RenewableOptimizationHub shows mock disclosure when using sample forecasts
- [ ] ComplianceDashboard shows mock disclosure when using sample violations
- [ ] RealTimeDashboard shows mock disclosure when using sample data
- [ ] All components clearly distinguish between live production data and illustrative data
- [ ] Existing validation checks remain green

## 5. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`

## 6. Status History
- 2026-03-25: Task created (InProgress)
- 2026-03-25: Implemented mock data disclosure for RenewableOptimizationHub, ComplianceDashboard, and RealTimeDashboard
- 2026-03-25: Validation completed with `pnpm exec tsc -b`, `pnpm exec vitest run`, `pnpm exec vite build`
