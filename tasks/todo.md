# CEIP x Whop Hybrid GTM Implementation Todo (March 3, 2026)

## Objective
Implement the 90-day Hybrid GTM plan in code and documentation with minimal, production-safe changes.

## Plan Checklist
- [x] Create execution artifacts (`tasks/todo.md`, `tasks/lessons.md`)
- [x] Add canonical pricing source-of-truth and eliminate cross-surface pricing drift
- [x] Add GTM channel-role matrix + attribution contract in code
- [x] Add route-intent tracking to acquisition routes (`/whop/discover`, `/watchdog`, `/pricing`, `/enterprise`)
- [x] Add GTM pipeline data model migration (`leads`, `accounts`, `outreach_events`, `discovery_notes`, `pilot_outcomes`, `offers`, `attribution_events`)
- [x] Add implementation docs/playbooks for 90-day execution and outreach
- [x] Verify with type-check/build-level checks (as feasible)
- [x] Update review section and capture outcomes

## QA Countercheck Plan (March 4, 2026)
- [x] Countercheck reported production QA findings against current code state
- [x] Harden Netlify SPA fallback rules to eliminate direct-route blank states
- [x] Make annual toggle state visibly obvious on pricing cards and CTAs
- [x] Resolve demo CTA semantic mismatch (calendar vs form scroll)
- [x] Verify with type-check and adversarial bug replay

## Payment Workflow Research Plan (March 4, 2026)
- [x] Inventory all active and latent payment workflows across frontend, adapters, and edge functions
- [x] Validate environment/dependency readiness for each gateway (Paddle, Whop, Stripe, Lemon Squeezy, manual sales)
- [x] Cross-check monetization flows against lead capture + attribution persistence paths
- [x] Validate Whop viability using latest official Whop docs/guidelines (2026)
- [x] Build 1-5 cost/benefit scoring matrix and retention recommendations
- [x] Produce practical implementation plan for gateway consolidation and Whop strategy

## Tier-2 Confidence Gating Plan (March 4, 2026)
- [x] Add centralized confidence policy module (`src/config/dataConfidenceConfig.ts`, `src/lib/dataConfidence.ts`)
- [x] Gate Compliance Pack export path (UI-side official vs draft gating on `BankReadyExport` + `RegulatoryFilingExport`)
- [x] Gate Industrial TIER revenue actions in `TIERROICalculator` (low-confidence disables official export/share)
- [x] Gate Forecast Benchmarking official exports while preserving interactive analysis
- [x] Gate Forecast Evaluation API export behavior for stale/low-confidence datasets (`api-v2-forecast-performance` evaluate/evaluate-export)
- [x] Add targeted telemetry events for blocked export attempts (`export_blocked_low_confidence`, `export_attempt`, `export_job_created`, `refresh_request`)
- [x] Verify via type-check/build and update review section

## Tier-3 Server Hardening Plan (March 4, 2026)
- [x] Add DB migration for `export_jobs`, `export_job_events`, and `export_alert_runs` with idempotency uniqueness
- [x] Implement shared server modules (`exportEntitlement`, `dataConfidenceServer`, `exportTelemetry`)
- [x] Add edge functions: `create-export-job`, `export-job-status`, `process-export-jobs`, `alert-export-health`
- [x] Add frontend client helper `src/lib/exportJobsClient.ts` for create + poll job flows
- [x] Integrate async official export job flow in BankReadyExport, RegulatoryFilingExport, TIERROICalculator, and ForecastBenchmarkingPage
- [x] Preserve draft exports and enforce low-confidence + FPIC hard-stop server rules
- [x] Run type-check/build validation and update review notes

## Tier-3 QA Gap Fixes (March 5, 2026)
- [x] Remove localhost edge-fetch false negative when Supabase env is configured
- [x] Make low-confidence official export forcing opt-in (not implicit in DEV)
- [x] Add Bank Export dev ownership probe to cover TC-08 from UI
- [x] Re-run type-check/build and update review notes

## Acceptance Criteria
- One pricing catalog feeds: `src/lib/whop.ts`, `src/components/PricingPage.tsx`, `src/components/WhopDiscoverPage.tsx`
- GTM attribution events include: `channel`, `segment`, `message_variant`, `cta`, `campaign_id`
- Four key routes emit intent-tagged page-view events
- New migration exists with all required GTM entities
- New docs clearly operationalize Sprint 0-5 execution

## Review
- Added durable lead intake flow (`lead_intake_submissions`) and persistence on enterprise, municipal, and ROI capture paths.
- Fixed enterprise CTA tracking bug where handlers were not attached as JSX attributes.
- Improved annual billing integrity on `/pricing` with sales-assisted routing for non-self-serve annual plans.
- Added explicit Whop-to-enterprise handoff CTA on `/whop/discover` for B2B intent routing.
- Enriched attribution persistence with UTM/referrer/user-agent metadata.
- Added weekly GTM operational summary view (`gtm_weekly_funnel_summary`) and report script (`scripts/gtm-weekly-report.mjs`).
- Hardened trust-language to reduce diligence risk in marketing surfaces (`AboutPage`, `MunicipalLandingPage`, `EnterprisePage`).
- Verification:
  - `pnpm exec tsc --noEmit` passed.
  - `node --check scripts/gtm-weekly-report.mjs` passed.
  - `pnpm exec vite build` passed (after dependency resolution for `dompurify` import used by `HelpButton.tsx`).
- QA countercheck round:
  - Hardened SPA rewrites in [netlify.toml](/Users/sanjayb/minimax/canada-energy-dashboard/netlify.toml) and [public/_redirects](/Users/sanjayb/minimax/canada-energy-dashboard/public/_redirects).
  - Made annual mode unmistakable on pricing page (visual banner + CTA label change).
  - Converted demo CTA into true calendar link when `VITE_BOOK_DEMO_URL` is configured, otherwise explicit callback request wording.
  - Re-ran production build and verified generated `dist/_redirects` no longer forces SPA fallback over static assets.
- Tier-2 confidence-gating round:
  - Added shared confidence policy + thresholds in [src/config/dataConfidenceConfig.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/config/dataConfidenceConfig.ts) and [src/lib/dataConfidence.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/dataConfidence.ts).
  - Added reusable blocked-export workflow modal in [src/components/ExportBlockedModal.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/ExportBlockedModal.tsx).
  - Gated official compliance exports in [src/components/BankReadyExport.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/BankReadyExport.tsx) and [src/components/RegulatoryFilingExport.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/RegulatoryFilingExport.tsx).
  - Gated industrial “Impact Today” export/share actions in [src/components/TIERROICalculator.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/TIERROICalculator.tsx) while keeping interactive calculation live.
  - Added official/draft export controls and confidence gating to [src/components/ForecastBenchmarkingPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/ForecastBenchmarkingPage.tsx).
  - Added API-side evaluation/export gating branch in [supabase/functions/api-v2-forecast-performance/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/api-v2-forecast-performance/index.ts) for `evaluate` / `evaluate-export` and base route compatibility.
  - Verification:
    - `pnpm exec tsc --noEmit` passed.
    - `pnpm exec vite build` passed.
- Tier-3 server hardening round:
  - Added export lifecycle persistence tables and idempotency uniqueness in [supabase/migrations/20260304002_export_jobs_lifecycle.sql](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/migrations/20260304002_export_jobs_lifecycle.sql).
  - Added shared server authority modules in [supabase/functions/_shared/exportEntitlement.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/_shared/exportEntitlement.ts), [supabase/functions/_shared/dataConfidenceServer.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/_shared/dataConfidenceServer.ts), and [supabase/functions/_shared/exportTelemetry.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/_shared/exportTelemetry.ts).
  - Added queue APIs + schedulers in [supabase/functions/create-export-job/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/create-export-job/index.ts), [supabase/functions/export-job-status/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/export-job-status/index.ts), [supabase/functions/process-export-jobs/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/process-export-jobs/index.ts), and [supabase/functions/alert-export-health/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/alert-export-health/index.ts).
  - Added frontend async export client in [src/lib/exportJobsClient.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/exportJobsClient.ts).
  - Routed official export/share flows through server queue on [src/components/BankReadyExport.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/BankReadyExport.tsx), [src/components/RegulatoryFilingExport.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/RegulatoryFilingExport.tsx), [src/components/TIERROICalculator.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/TIERROICalculator.tsx), and [src/components/ForecastBenchmarkingPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/ForecastBenchmarkingPage.tsx).
  - Verification:
    - `pnpm exec tsc --noEmit` passed.
    - `pnpm exec tsc -b` passed.
    - `pnpm run build` passed.
- Tier-3 QA gap-fix round:
  - Updated localhost edge-fetch fallback in [src/lib/config.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/config.ts) so local edge calls are enabled when Supabase env vars are present.
  - Changed Bank Export force-export behavior to explicit env-driven opt-in (`VITE_ALLOW_LOW_CONFIDENCE_EXPORTS`) in [src/components/BankReadyExport.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/BankReadyExport.tsx), allowing confidence-block QA in dev without hidden bypass.
  - Added TC-08 ownership probe controls in dev QA panel (job id + optional probe API key + direct ownership check result) in [src/components/BankReadyExport.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/BankReadyExport.tsx).
  - Verification:
    - `pnpm exec tsc --noEmit` passed.
