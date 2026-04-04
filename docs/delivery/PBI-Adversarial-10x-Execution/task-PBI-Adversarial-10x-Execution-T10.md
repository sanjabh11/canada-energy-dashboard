# Task: Streaming Consumer Normalization (Indigenous, Stakeholder)

**ID:** PBI-Adversarial-10x-Execution-T10
**Tier:** Tier 2 (Feature / Behavioral)
**Status:** Review
**Owner:** AI_Agent

## 1. Context
Two streaming consumers (IndigenousDashboard and StakeholderDashboard) still use binary live/offline logic that misrepresents fallback state as "Offline" when the data stream is actually active using fallback data. This creates a trust gap where users may believe no data is available when fallback data is being served.

## 2. Scope / Files
- `src/components/IndigenousDashboard.tsx`
- `src/components/StakeholderDashboard.tsx`

## 3. Implementation
- Import `DataTrustNotice` component
- Add fallback state detection (`connectionStatus === 'fallback'`)
- Update UI labels to distinguish: Live / Fallback / Offline
- Add explicit trust notice when in fallback mode

## 4. Acceptance Criteria
- [ ] IndigenousDashboard properly shows "Fallback" state when using fallback data
- [ ] StakeholderDashboard properly shows "Fallback" state when using fallback data
- [ ] Both dashboards show `DataTrustNotice` when in fallback mode
- [ ] Existing validation checks remain green

## 5. Test Plan
1. `pnpm exec tsc -b`
2. `pnpm exec vitest run`
3. `pnpm exec vite build`

## 6. Status History
- 2026-03-25: Task created (InProgress)
- 2026-03-25: Implemented streaming consumer normalization for IndigenousDashboard and StakeholderDashboard
- 2026-03-25: Validation completed with `pnpm exec tsc -b`, `pnpm exec vitest run`, `pnpm exec vite build`
