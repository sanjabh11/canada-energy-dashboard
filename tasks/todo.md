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

## Acceptance Criteria
- One pricing catalog feeds: `src/lib/whop.ts`, `src/components/PricingPage.tsx`, `src/components/WhopDiscoverPage.tsx`
- GTM attribution events include: `channel`, `segment`, `message_variant`, `cta`, `campaign_id`
- Four key routes emit intent-tagged page-view events
- New migration exists with all required GTM entities
- New docs clearly operationalize Sprint 0-5 execution

## Adversarial Monetization Hardening (March 6, 2026)
- [ ] Audit the weakest monetization assumptions against current repo behavior and identify direct failure modes
- [ ] Fix API monetization leaks by enforcing API-key validation + daily quota checks on paid API endpoints
- [ ] Replace the placeholder API key management UI with the working `api-keys-admin` flow
- [ ] Align upgrade/upsell entry points with canonical pricing so users are not routed into stale Whop/Stripe-era plans
- [ ] Re-run type-check/build validation and update review notes

## Phase 0 Foundation Recovery (April 3, 2026)
- [x] Gate Phase 4 user surfaces (`/ask-data`, `/copilot`, `/agent`) behind a shared foundation-repair flag and explicit banner
- [x] Unify freshness/provenance primitives and collapse duplicate badge logic to one implementation
- [x] Add a shared provenance contract for high-risk UI/API surfaces (`source`, `last_updated`, `freshness_status`, `is_fallback`)
- [x] Wire honest fallback/demo labeling into the initial high-traffic AI and forecasting surfaces
- [x] Remove direct hardcoded Alberta TIER fund pricing from user-facing components and route through canonical pricing metadata
- [ ] Harden CI with explicit install, type-check, build, unit test, migration verification, and Playwright smoke steps
- [x] Add regression tests for provenance states, gating, and migration verification
- [x] Check in repo-verifiable uptime monitor artifacts and align `/status` with the tracked monitor/source registry

## Phase 0 Completion Wave (April 3, 2026)
- [x] Repair the Playwright harness with a deterministic Vite webServer command for smoke tests
- [x] Complete gating across all Phase 4 execution paths, including `/copilot` interaction affordances
- [x] Roll out the shared provenance contract to `stream-ontario-demand`, `stream-ontario-prices`, and `api-v2-analytics-trends`
- [x] Apply trust UI to the tier-1 dashboard set that still relies on fallback or synthetic data
- [x] Extend Alberta stale-data cleanup beyond DIP audit to current-price and snapshot-driven surfaces
- [x] Re-run the stricter Phase 0 verification sequence and document any residual blocker

## Provenance Rollout Wave 2 (April 3, 2026)
- [x] Extend the shared provenance contract to additional high-risk APIs (`stream-provincial-generation`, `ops-health`, `manifest`)
- [x] Apply explicit fallback/demo trust labeling to the next high-traffic dashboards and tools (`EnergyDataDashboard`, `AIDataCentreDashboard`, `InvestmentCards`, selected public FAQ/landing surfaces)
- [x] Replace overstated "real-time" or certainty-language on public pages where data is live-when-available or snapshot-backed
- [x] Re-run verification and summarize the wider adversarial verification matrix after the rollout

## Provenance Rollout Wave 3 (April 3, 2026)
- [x] Extend the shared provenance contract to the remaining stream/data APIs that still expose implicit sample or synthetic fallback behavior
- [x] Sweep the next public and mini-app surfaces for overstated live-data claims and align copy with demo/snapshot semantics
- [x] Add or tighten trust labeling on the remaining fallback-heavy dashboards in this batch
- [x] Re-run verification and publish an updated adversarial pass/fail matrix by phase

## Provenance Rollout Wave 4 (April 3, 2026)
- [x] Normalize the renewable forecast API to emit explicit shared provenance alongside its existing model metadata
- [x] Reword the most visible public/support dashboard surfaces to use live-when-available or operator-sourced language
- [x] Re-run build, unit tests, migration verification, and wording/provenance audits after the last batch

## Provenance Rollout Wave 5 (April 3, 2026)
- [x] Sweep the remaining public-facing employer, support, and upsell surfaces for unsupported real-time claims
- [x] Continue the wording cleanup only on visible user copy, not internal component names or comments
- [x] Re-run the narrower verification loop after the final wording batch

## Review
- Completed the corpus expansion and workflow-doc wave:
  - Expanded `docs/energy-corpus` to 11 focused source-backed docs.
  - Added `docs/ops/ingestion-runbook.md` and `docs/ops/freshness-matrix.md` to document the existing AESO, Ontario, weather, manifest, ops-health, and RAG topology.
  - Tightened the last visible live/real-time wording on `RetrievedEvidencePanel`, `DigitalTwinDashboard`, `DataSource`, `InteractiveAnnotation`, and `GuidedTour`.
  - Verification:
    - `pnpm vitest run` passed.
    - `pnpm run build` passed.
    - Targeted grep only surfaced internal comments and archived/docs wording outside the touched surfaces.
- Phase 1-3 backbone plan drafted from current repo state:
  - [ ] Expand the curated corpus with a focused second wave of source-anchored documents for AESO, IESO, ECCC, and filing/regulatory context.
  - [ ] Formalize the existing cron/manifest/ops-health topology into docs that explain what already exists and what remains missing.
  - [ ] Tighten remaining user-facing real-time wording only on rendered copy where it still implies live guarantees.
  - [ ] Add/extend tests only where they lock the new doc/prompt/corpus behavior and prevent regression.
  - [ ] Re-run build, unit tests, and a targeted wording/provenance audit after the slice lands.
- Added `src/lib/promptTemplates.ts` as the frontend prompt-template shim for the six domain prompts called out in the adversarial plan.
- Added `docs/data-lineage.md` and `docs/SCHEMA.md` as the missing human-readable lineage/schema references.
- Expanded the curated corpus seed set with `aeso-pool-price-basics.md` and `eccc-emissions-basics.md`, and updated the corpus README.
- Verification:
  - `pnpm vitest run tests/unit/promptTemplates.test.ts` passed.
  - `pnpm run build` passed.
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
- Adversarial monetization hardening round:
  - Replaced the dead placeholder API key UI in [src/components/ApiKeysPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/ApiKeysPage.tsx) with the real `api-keys-admin` flow so key creation/listing is operational for consultant/data-pack monetization.
  - Extended [supabase/functions/api-keys-admin/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/api-keys-admin/index.ts) to return `tier`, `daily_limit`, and `last_used_at`, making commercial limits visible in the UI.
  - Added shared API-key quota enforcement in [supabase/functions/_shared/apiKeyAccess.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/_shared/apiKeyAccess.ts) and wired it into [supabase/functions/api-v2-esg-finance/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/api-v2-esg-finance/index.ts) and [supabase/functions/api-v2-industrial-decarb/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/api-v2-industrial-decarb/index.ts).
  - Replaced the stale Stripe-era upsell path in [src/components/auth/UpgradeModal.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/auth/UpgradeModal.tsx) with canonical routing to `/pricing`, `/enterprise`, and `/whop/discover`.
  - Verification:
    - `pnpm exec tsc --noEmit` passed.
    - `pnpm run build` passed.
- Phase 0 foundation recovery round:
  - Added a shared foundation gate for `/ask-data`, `/copilot`, and `/agent`, with standard-user gating and explicit repair-mode messaging.
  - Unified freshness handling behind shared provenance helpers and one badge implementation, including `live`, `stale`, `demo`, and `unknown` states.
  - Added repo-verifiable monitor/source registries and surfaced them on `/status`.
  - Removed the direct hardcoded TIER fund price from [src/components/DIPAuditTrailGenerator.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/DIPAuditTrailGenerator.tsx) in favor of canonical pricing metadata.
  - Added migration verification and provenance-focused unit/browser tests.
  - Verification:
    - `node scripts/verify-supabase-migrations.mjs` passed.
    - `pnpm exec tsc -b` passed.
    - `pnpm vitest run` passed.
    - `pnpm run build` passed.
    - `pnpm exec playwright test tests/component/foundation-phase0.spec.ts --project=chromium` passed after fixing the Playwright server command, removing the dev-mode gate bypass, and reinstalling Chromium.
 - Provenance rollout wave 2:
   - Extended the shared provenance contract to [supabase/functions/stream-provincial-generation/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/stream-provincial-generation/index.ts), [supabase/functions/ops-health/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/ops-health/index.ts), and [supabase/functions/manifest/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/manifest/index.ts).
   - Added explicit trust/freshness disclosure to [src/components/AIDataCentreDashboard.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/AIDataCentreDashboard.tsx), [src/components/InvestmentCards.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/InvestmentCards.tsx), and [src/components/EnergyDataDashboard.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/EnergyDataDashboard.tsx).
   - Rewrote overstated live-data copy on [src/components/AboutPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/AboutPage.tsx), [src/components/ContactPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/ContactPage.tsx), [src/components/MunicipalLandingPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/MunicipalLandingPage.tsx), and [supabase/functions/walkthroughs/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/walkthroughs/index.ts).
   - Verification:
     - `node scripts/verify-supabase-migrations.mjs` passed.
     - `pnpm vitest run` passed.
     - `pnpm run build` passed.
- Provenance rollout wave 3:
  - Extended the shared provenance contract to [supabase/functions/stream-hf-electricity-demand/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/stream-hf-electricity-demand/index.ts), [supabase/functions/api-v2-analytics-provincial-metrics/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/api-v2-analytics-provincial-metrics/index.ts), and [supabase/functions/stream-aeso-grid-data/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/stream-aeso-grid-data/index.ts).
  - Tightened demo and live-when-available copy on [src/components/whop-mini/WhopMiniApp.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/whop-mini/WhopMiniApp.tsx), [src/components/whop-mini/DashboardDemo.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/whop-mini/DashboardDemo.tsx), [src/components/whop-mini/EnergyTrader.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/whop-mini/EnergyTrader.tsx), [src/components/WhopDiscoverPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/WhopDiscoverPage.tsx), [src/components/PricingPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/PricingPage.tsx), [src/components/TrainingCoordinatorsPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/TrainingCoordinatorsPage.tsx), [src/components/StatusPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/StatusPage.tsx), [src/components/SEOHead.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/SEOHead.tsx), and [src/components/legal/TermsOfService.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/legal/TermsOfService.tsx).
  - Verified that the remaining fallback-heavy dashboards in this batch already render trust notices or explicit demo messaging, so no duplicate warning component was added unnecessarily.
  - Verification:
    - `node scripts/verify-supabase-migrations.mjs` passed.
    - `pnpm vitest run` passed.
    - `pnpm run build` passed.
    - `pnpm exec playwright test tests/component/foundation-phase0.spec.ts --project=chromium` passed.
- Provenance rollout wave 4:
  - Normalized [supabase/functions/api-v2-renewable-forecast/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/supabase/functions/api-v2-renewable-forecast/index.ts) to emit the shared provenance envelope alongside existing forecast metadata.
  - Reworded the highest-visibility public/support dashboard copy on [src/components/RealTimeDashboard.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/RealTimeDashboard.tsx), [src/components/AboutPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/AboutPage.tsx), [src/components/whop/WatchdogApp.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/whop/WatchdogApp.tsx), [src/components/whop/WelcomeModal.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/whop/WelcomeModal.tsx), and [src/components/monetization/MonetizationReport.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/monetization/MonetizationReport.tsx).
  - Verification:
    - `node scripts/verify-supabase-migrations.mjs` passed.
    - `pnpm vitest run` passed.
    - `pnpm run build` passed.
