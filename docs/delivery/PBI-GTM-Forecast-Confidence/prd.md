# PRD: Deterministic Forecasts + Data Confidence Gating

## 1. Problem Statement
Forecast fallback logic and cached pool price generation currently use randomized variation, which undermines credibility for GTM demos and export deliverables. There is also no explicit data-confidence gating to prevent exposure calculations when data is stale or fallback-only.

## 2. Goals
1. Replace randomized forecast and pool price fallback logic with deterministic, documented baselines.
2. Expose data confidence metadata (live, cached, stale) for AESO-derived pricing inputs.
3. Gate downstream calculations and UI actions when data is stale or low-confidence.
4. Preserve existing UX while making provenance explicit and audit-friendly.

## 3. Scope
### In Scope
- Deterministic fallback generation in `src/lib/aesoService.ts`.
- Data confidence metadata surfaced from AESO service functions.
- UI gating for rate/forecast-dependent surfaces (RRO Alert System + any direct exposure calculations).
- Updated badges or messaging to signal stale/low-confidence data.

### Out of Scope
- New ML forecasting models.
- External data provider integrations beyond AESO.
- Marketplace export pipeline (handled in separate PBI).

## 4. Success Metrics
- No `Math.random()` usage in AESO fallback or forecast logic.
- Deterministic fallback produces identical outputs for same timestamps.
- Data confidence status visible in UI and prevents export/decision actions when stale.
- Manual QA confirms stale-data lock behavior in target pages.
