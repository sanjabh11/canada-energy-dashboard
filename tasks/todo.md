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
  - Full `pnpm run build` not run due network-constrained dependency install behavior in this environment.
