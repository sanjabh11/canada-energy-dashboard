# CEIP Adversarial GTM Analysis and Patch Plan (March 3, 2026)

## Objective Under Test
Hit the 90-day monetization target (2+ paid logos) by running Hybrid GTM (Whop wedge + direct B2B closes) using the current CEIP product and codebase.

## Scope Audited
- Acquisition surfaces:
  - `/whop/discover`
  - `/whop/watchdog`
  - `/pricing`
  - `/enterprise`
- GTM runtime layers:
  - pricing consistency
  - attribution persistence
  - checkout resilience
  - lead capture durability
  - weekly decision visibility

## Top Weak Steps (Assumption -> Counterexample -> Failure Mode)

| # | Weak Step | Hidden Assumption | Counterexample that Breaks Objective | Failure Mode | Status |
|---|---|---|---|---|---|
| 1 | Enterprise hero CTA tracking | CTA events are being captured | `onClick` handler rendered as plain text in hero buttons | No signal on highest-intent B2B clicks | Fixed |
| 2 | Lead capture storage | LocalStorage is enough for pipeline ops | User submits on mobile/private browser; data disappears | Lost high-intent inbound leads | Fixed |
| 3 | Annual billing behavior | Annual toggle reflects executable checkout path | User selects annual, but checkout only has monthly IDs | Trust drop + funnel leakage | Fixed (sales-assisted annual routing) |
| 4 | Attribution completeness | Event names alone are enough to optimize | Campaign source/medium missing from DB events | Cannot rank channels/messages correctly | Fixed |
| 5 | Stop-rule execution | Team can decide weekly with ad hoc inspection | No weekly summary by channel/segment/campaign | Slow pivots, wasted outreach cycles | Fixed |
| 6 | Compliance trust narrative | Strong claims always increase conversion | Buyer asks for evidence of certification status | Late-stage deal friction/disqualification | Partially fixed (major claims toned down) |
| 7 | Whop-to-B2B handoff | Checkout always succeeds in browser context | Token missing/ad blocker/CSP blocks Paddle | High-intent users churn before contact | Fixed |
| 8 | Pricing coherence | One source of truth exists across surfaces | Hardcoded prices drift across pages/adapters | Confusion + objection in sales calls | Fixed |
| 9 | Segment clarity in enterprise | One enterprise path fits all inbound tiers | Municipal/indigenous/consulting intent mixed with no structured storage | Hard to prioritize fastest-close subsegments | Partially fixed (lead intake schema captures segment) |
| 10 | Message consistency with USP | “AI analytics” framing converts equally well | Buyer needs compliance risk reduction + freshness proof | Low reply-to-call conversion | In progress (copy tightening ongoing) |

## Implemented Patches in Codebase

1. Durable lead intake (browser-safe)
- Added `src/lib/leadIntake.ts`.
- Added `lead_intake_submissions` table + policies in:
  - `supabase/migrations/20260303001_gtm_pipeline_entities.sql`
- Enterprise form now writes to Supabase and keeps local backup.
- Municipal baseline-audit capture and Industrial ROI email capture now also persist to Supabase.

2. CTA bug fix on enterprise hero
- Corrected CTA handlers in:
  - `src/components/enterprise/EnterprisePage.tsx`

3. Annual checkout truthfulness + routing
- Updated annual behavior in:
  - `src/components/PricingPage.tsx`
- Sales-assisted annual flow now routes high-intent users to consult path.

4. Attribution signal quality
- Enriched persisted attribution metadata (utm/referrer/user-agent) in:
  - `src/lib/attributionPipeline.ts`

5. Weekly operating visibility
- Added SQL view:
  - `public.gtm_weekly_funnel_summary`
- Included in:
  - `supabase/migrations/20260303001_gtm_pipeline_entities.sql`

6. Enterprise pricing coherence
- Replaced stale enterprise entry pricing copy with canonical source:
  - `src/components/enterprise/EnterprisePage.tsx`

7. Trust-language hardening
- Softened high-risk claim wording on:
  - `src/components/AboutPage.tsx`
  - `src/components/MunicipalLandingPage.tsx`

## Gap Analysis by Approach

## A) Whop Wedge Motion
- What now works:
  - route intent tracking is in place
  - checkout fallback exists
  - pricing catalog is centralized
- Remaining risk:
  - distribution is still platform-dependent
  - creator-first positioning may under-qualify for B2B use cases
- Plug strategy:
  - prioritize Whop for wedge/trials only
  - force high-intent annual/compliance conversations into direct consult path
  - monitor weekly conversion from Whop-originated sessions to lead submissions

## B) Direct B2B Motion
- What now works:
  - enterprise route has stronger event capture
  - submissions can persist server-side
  - annual quote path is explicit
- Remaining risk:
  - compliance trust language still needs strict evidence hygiene across all pages
  - no standardized outbound execution dashboard in product UI yet
- Plug strategy:
  - run weekly report against `gtm_weekly_funnel_summary`
  - keep claims in “readiness/alignment” wording unless independently audited
  - add simple operator script + checklist for stop-rules

## Cross-Approach Critical Gaps (Highest ROI Next)
1. Build an operator script for weekly KPI extraction and stop-rule flags.
2. Add CTA parity tracking on remaining high-intent pages (`/municipal`, `/roi-calculator`).
3. Standardize trust-language lint pass for marketing pages.
4. Add outbound execution table workflow (accounts/leads/outreach notes) in lightweight admin view or script.

## Practical Forward Plan (90 Days)

## Days 1-14
1. Deploy GTM migration and verify `lead_intake_submissions` write path.
2. Validate weekly summary view with real traffic.
3. Run first weekly stop-rule review (channel + segment + campaign).

## Days 15-45
1. Execute 40-60 touches/week (consultancy + Whop founder cohorts).
2. Code discovery calls using taxonomy (acquisition/retention/compliance/reporting).
3. Launch 14-day pilots with explicit target metric and decision date.

## Days 46-90
1. Keep only top 2 segments by call-to-pilot and pilot-to-paid.
2. Freeze losing message variants based on stop-rules.
3. Convert pilot winners with standardized proposals and referral asks.

## Required Acceptance Gates
- Pricing coherence: no cross-surface drift.
- Attribution integrity: all key events carry `channel/segment/message_variant/cta/campaign_id`.
- Lead durability: enterprise submissions persist in Supabase.
- Weekly decisioning: `gtm_weekly_funnel_summary` supports segment stop/go.

## Confidence (Post-Patch)
- Funnel observability: High
- Pricing coherence: High
- Checkout resilience: Medium-High
- Message-market fit execution: Medium
- 2-logo/90-day target under current constraints: Medium
