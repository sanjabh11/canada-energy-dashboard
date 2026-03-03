# CEIP x Whop Hybrid GTM Execution (90 Days)

## Constraints
- Capacity: 8-12 hrs/week
- Budget: < $500/month
- Motion: Hybrid (Whop wedge + direct closes)
- First ICP: Canadian energy consultancies

## North-Star Goal
Validate repeatable acquisition with >= 2 paid logos by Day 90.

## Sprint 0 (Days 1-3) - Foundation
- Normalize pricing across surfaces via `src/lib/pricingCatalog.ts`
- Enforce attribution contract via `src/lib/gtm.ts`
- Activate intent tracking for acquisition routes
- Confirm channel-role matrix alignment

## Sprint 1 (Days 4-14) - Message Unification
- Whop wedge offer: Rate Watchdog + Energy Benchmark mini-suite
- Consultancy offer: Canadian data pack + forecast benchmark export + monthly analyst brief
- Use one narrative: compliance-risk reduction + freshness + benchmark proof

## Sprint 2 (Days 15-30) - Discovery
- Build 60-account list (30 Whop founders, 30 consultancies)
- Execute 40-60 touches/week
- Discovery prompt: "What do you still do manually that blocks growth/compliance?"
- Taxonomy: acquisition, retention/churn, credibility/compliance, reporting/export

## Sprint 3 (Days 31-50) - Pilots
- Pilot A: consultancy reporting/data export
- Pilot B: founder community energy cost/risk scorecard
- Pilot C: compliance narrative pack for municipal/industrial prospects
- Fixed 14-day scopes, explicit success metric per pilot

## Sprint 4 (Days 51-75) - Scale Winners
- Keep top 2 segments by pipeline efficiency
- Increase outbound only for winning segments
- Add referral asks on successful outcomes

## Sprint 5 (Days 76-90) - Systemize
- Freeze scripts and objection handling
- Lock qualification gates
- Build month-4 pipeline from proven segments

## KPI Gates
- 120+ touches
- 20+ discovery calls
- 6+ pilots
- 2+ paid closes

## Weekly Operating Command
- Run weekly funnel summary:
  - `node scripts/gtm-weekly-report.mjs`
- Use stop-rule outputs to decide keep/kill by segment and message.

## Stop Rules
- Segment stop: after 20 touches if reply rate < 8% and call conversion < 15%
- Message stop: after 30 sends with zero meetings

## Sources (Tiered)
- Tier 1: official docs/reports/regulators
- Tier 2: practitioner case studies and app pages
- Tier 3: community sentiment and discussion threads
