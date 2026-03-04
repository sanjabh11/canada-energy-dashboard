# Task: Deterministic Forecasts + Data Confidence Gating

**ID:** PBI-GTM-Forecast-Confidence-T1  
**Tier:** Tier 2 (Feature / Behavioral)  
**Status:** InProgress  
**Owner:** AI_Agent

## 1. Context
GTM demos and compliance exports depend on AESO-derived pricing. Current fallback logic uses random variation, which undermines credibility and makes outputs non-auditable. We need deterministic baseline forecasts and explicit data-confidence gating that disables decision or export actions when data is stale or fallback-only.

## 2. Scope / Files
- `src/lib/aesoService.ts`
- `src/components/RROAlertSystem.tsx`
- `src/components/DataFreshnessBadge.tsx` (if new confidence UI needed)

## 3. Acceptance Criteria
- [ ] No `Math.random()` usage in AESO pool price fallback or forecast generation.
- [ ] Deterministic fallback outputs identical values for identical timestamps.
- [ ] Data confidence metadata is exposed for AESO-derived data.
- [ ] RRO/forecast UI reflects low-confidence or stale data and gates actions accordingly.
- [ ] Manual QA verifies stale-data lock behavior and consistent forecasts.

## 4. Test Plan
1. Manual QA:
   - Simulate API failure (offline) → fallback uses deterministic values.
   - Forecast outputs remain stable between refreshes.
   - UI shows low-confidence / stale badge and disables export/decision CTA if needed.
2. Build check: `pnpm run build`.

## 5. Status History
- 2026-03-04: Task created (InProgress)
