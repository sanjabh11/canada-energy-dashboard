# Phase 6 — Remediation Roadmap & Action Lists

> **Audit:** CEIP Niche Positioning Audit (Deep Scope)
> **Date:** 2026-06-04
> **Confidence:** 95% — Gate cleared
> **Beachhead:** Alberta TIER Facility Compliance CFO Memo

---

## Page 1 — Prioritized Gap Remediation Plan

### P0 — Fix Immediately (0-30 days)

| # | Gap | Current state | Target state | Effort | Owner | Acceptance criteria |
|---|---|---|---|---|---|---|
| P0-1 | Homepage hero redesign | "Sell the energy workflow that owns a budget" + 10 proof packs | "TIER Compliance CFO Memo — 3 pathways, source-dated, board-ready. From $1,500/mo." | 4h | Frontend | 15-sec test: stranger can answer what/who/why |
| P0-2 | Nav structure collapse | 65+ routes, flat nav | TIER ROI, Credit Banking, Solutions (collapsed), Pricing — 4 primary items | 6h | Frontend | Primary nav ≤ 5 items; TIER route is first |
| P0-3 | Orphan route removal from nav | 12 orphan groups visible | Remove solar, RRO, employers, incubators, training, badges, copilot, agent, digital-twin from nav | 2h | Frontend | Nav contains zero orphan routes |
| P0-4 | TIER as front door | `/roi-calculator` is one of 65+ routes | `/roi-calculator` is the primary CTA from homepage, nav, and all sales pages | 3h | Frontend | All CTAs point to `/roi-calculator` first |
| P0-5 | Category language fix | "Proof-pack product" | "TIER compliance software" in all buyer-facing surfaces | 3h | Content | `grep -ri "proof pack" src/components/CommercialLandingPage.tsx` returns 0 buyer-facing instances |

### P1 — Fix Next (30-90 days)

| # | Gap | Current state | Target state | Effort | Owner | Acceptance criteria |
|---|---|---|---|---|---|---|
| P1-1 | Pricing page lead tier | 6 tiers displayed equally | TIER tier ($1,500/mo) as primary card, others as "Also available" | 4h | Frontend | TIER card is first, largest, and has primary CTA |
| P1-2 | Export labeling | Export labeled "planning pack" | Export labeled "CFO-ready TIER compliance memo" | 2h | Frontend | PDF export filename contains "TIER_CFO_Memo" |
| P1-3 | Narrative consistency audit | 65+ routes, 5 narratives | All buyer-facing surfaces use TIER-first narrative | 8h | Content | `pnpm run check:commercial-source` passes with TIER-first source |
| P1-4 | Cross-sell flow (TIER → credit banking) | No CTAs connecting routes | TIER ROI calculator has "Next: Audit your credit banking" CTA | 3h | Frontend | CTA exists and routes to `/credit-banking` |
| P1-5 | Value articulation rewrite | Feature-list USP | Outcome language: "3 weeks → 3 hours, source-dated, board-ready" | 4h | Content | Homepage, pricing, and TIER page all use outcome language |
| P1-6 | Stale docs cleanup | 28+ stale docs in docs/ | Move stale docs to `docs/archive/` | 2h | DevOps | `docs/` root contains only active docs |
| P1-7 | TIER-specific do-not-claim list | Generic do-not-claim | Add: "no guaranteed savings, no live market price, no broker execution, no tax advice" | 1h | Content | `proof-pack-routes.mjs` TIER config has updated `doNotClaim` |

### P2 — Maintain & Deepen (90-180 days)

| # | Gap | Current state | Target state | Effort | Owner | Acceptance criteria |
|---|---|---|---|---|---|---|
| P2-1 | Pricing staleness UI warning | `isPricingStale()` exists but no UI | Display warning banner when pricing >90 days stale | 3h | Frontend | Banner appears when `isPricingStale()` returns true |
| P2-2 | Credit banking claim boundaries | Partially verified | Full do-not-claim list for credit banking route | 2h | Content | `proof-pack-routes.mjs` credit banking config verified |
| P2-3 | DI pathway validation | `DI_CREDIT_RATE = 0.80` estimated | Update when Alberta releases DI standard (early 2026) | 2h | Content | Rate updated with source URL and lastVerifiedAt |
| P2-4 | Security procurement pack buyer review | No buyer has reviewed | Engage 1 TIER facility security lead for review | 20h | Sales | 1 buyer-reviewed security evidence form |
| P2-5 | Testing coverage | 5/10 — no E2E for TIER | E2E test for TIER calculator flow + unit tests for pricing | 16h | QA | `pnpm run test:e2e -- --grep TIER` passes |
| P2-6 | Payment provider consolidation | 3 providers (Whop, Paddle, Stripe) | Consolidate TIER tier to single provider | 8h | Backend | TIER checkout uses 1 provider with clear entitlement |
| P2-7 | Moat deepening — data network effects | Static pricing config | Add Alberta emissions registry data feed for facility benchmarking | 40h | Backend | 1 automated data feed with provenance |

### P3 — Long-term (180+ days)

| # | Gap | Current state | Target state | Effort | Owner | Acceptance criteria |
|---|---|---|---|---|---|---|
| P3-1 | SOC 2 preparation | No SOC 2 | Begin SOC 2 Type 1 readiness assessment | 80h | Security | Gap analysis complete |
| P3-2 | Buyer evidence program | 0% market confidence | 3 paid TIER pilots with evidence register entries | Ongoing | Sales | 3 entries in pilot evidence register |
| P3-3 | Expansion to Ontario GA/ICI | Route exists, no cross-sell | Active cross-sell from TIER to GA/ICI for Alberta industrials with Ontario ops | 16h | Frontend | CTA flow from TIER to GA/ICI |
| P3-4 | Consultant channel program | No consultant channel | Consultant tier with API access + multi-client proof packs | 40h | Product | 2 consultants using CEIP for client work |
| P3-5 | Regulatory embedding | Proof-pack format | Embed proof-pack format in OEB/AUC filing templates | 80h | Product | 1 filing template accepted by regulator |

---

## Page 2 — 30/90/180-Day Action Lists

### 30-Day Action List

| Week | Action | Deliverable | Gate |
|---|---|---|---|
| W1 | Redesign CommercialLandingPage hero for TIER | New hero with TIER-focused headline, subhead, CTA | 15-sec test passed |
| W1 | Collapse nav to 4 primary items | Nav with TIER ROI, Credit Banking, Solutions, Pricing | Nav ≤ 5 items |
| W2 | Remove 12 orphan route groups from nav | Clean nav with zero orphan routes | `grep` confirms removal |
| W2 | Make `/roi-calculator` the front door CTA | All CTAs point to TIER calculator first | CTA audit passes |
| W3 | Fix category language — "TIER compliance software" | All buyer-facing surfaces use correct category | `grep` confirms |
| W3 | Rewrite value articulation to outcome language | Homepage, pricing, TIER page use "3 weeks → 3 hours" | Content review passes |
| W4 | Update TIER-specific do-not-claim list | `proof-pack-routes.mjs` TIER config updated | Claim-boundary check passes |
| W4 | Run `pnpm run check:claim-boundaries` + `pnpm run check:commercial-source` | Both guards pass | ✅ Exit gate |

### 90-Day Action List

| Month | Action | Deliverable | Gate |
|---|---|---|---|
| M2 | Redesign PricingPage — TIER as lead tier | TIER card first, largest, primary CTA | Pricing page review |
| M2 | Rename export to "CFO-ready TIER compliance memo" | PDF filename + title updated | Export test passes |
| M2 | Add cross-sell CTA (TIER → credit banking) | CTA component on TIER page | CTA click routes correctly |
| M2 | Move 28+ stale docs to `docs/archive/` | Clean docs root | `ls docs/*.md` shows only active |
| M3 | Narrative consistency audit across all surfaces | All surfaces use TIER-first narrative | Commercial-source check passes |
| M3 | Add pricing staleness UI warning | Banner appears when pricing >90 days old | Staleness test passes |
| M3 | Begin E2E test for TIER calculator flow | Playwright test for full TIER flow | `pnpm run test:e2e -- --grep TIER` passes |
| M3 | Engage 1 TIER facility for security procurement review | Buyer-reviewed security evidence form | 1 evidence entry |
| M3 | Consolidate TIER payment to single provider | TIER checkout uses 1 provider | Checkout test passes |

### 180-Day Action List

| Quarter | Action | Deliverable | Gate |
|---|---|---|---|
| Q2 | Update DI pathway rate when standard releases | `tierPricing.ts` updated with source | Rate has source URL + lastVerifiedAt |
| Q2 | Launch buyer evidence program — 3 paid TIER pilots | 3 pilot evidence register entries | 3 entries with buyer signatures |
| Q2 | Deepen moat — Alberta emissions registry data feed | Automated facility benchmarking data | 1 data feed with provenance |
| Q3 | Begin SOC 2 Type 1 readiness assessment | Gap analysis report | Report complete |
| Q3 | Launch consultant channel program | Consultant tier with API access | 2 consultants onboarded |
| Q3 | Cross-sell expansion to Ontario GA/ICI | Active CTA flow from TIER to GA/ICI | CTA flow tested |
| Q3 | Credit banking full claim boundary verification | Complete do-not-claim list | Claim-boundary check passes |
| Q3 | Regulatory embedding — OEB/AUC filing template | 1 filing template draft | Template reviewed by 1 utility |

---

## Page 3 — Positioning Score Projection

### Current vs Target Scores

| Lens | Current | 30-day target | 90-day target | 180-day target |
|---|---|---|---|---|
| Category Clarity | 4/10 | **7/10** | 8/10 | 9/10 |
| ICP Precision | 5/10 | **8/10** | 9/10 | 9/10 |
| Competitive Alternatives | 7/10 | 7/10 | **8/10** | 9/10 |
| Differentiation Defensibility | 5/10 | 5/10 | **7/10** | 8/10 |
| Value Articulation | 3/10 | **7/10** | 8/10 | 9/10 |
| Pricing Power | 6/10 | 6/10 | **8/10** | 9/10 |
| Narrative Consistency | 4/10 | **7/10** | 8/10 | 9/10 |
| Homepage Clarity | 3/10 | **7/10** | 8/10 | 9/10 |
| **Average** | **4.75/10** | **6.75/10** | **8.00/10** | **8.88/10** |

### Projection Rationale

- **30-day:** P0 fixes (homepage, nav, category, value language) address 4 of the 3 RED scores → average jumps from 4.75 to 6.75
- **90-day:** P1 fixes (pricing lead, export labeling, narrative consistency, cross-sell) push 4 lenses from 7→8 → average reaches 8.0
- **180-day:** P2/P3 fixes (moat deepening, buyer evidence, SOC 2, consultant channel) push all lenses toward 9 → average reaches 8.88

### Risk Factors

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| No buyer responds to TIER pilot outreach | HIGH | CRITICAL — blocks all evidence gates | Offer free TIER assessment as activation funnel; leverage Alberta emissions registry for cold outreach |
| TIER regulation changes (statutory review Dec 2026) | MEDIUM | MEDIUM — may change thresholds or pathways | Monitor Alberta.ca TIER page; update `tierPricing.ts` within 48h of any change |
| Competitor (Orennia/cCarbon) adds facility-level TIER tools | LOW | MEDIUM — would erode whitespace | First-mover advantage + proof-pack format + claim-boundary trust |
| DI pathway standard delayed beyond "early 2026" | MEDIUM | LOW — DI is 1 of 3 pathways | Keep DI rate labeled "estimated"; focus messaging on fund vs market comparison |
| Payment provider consolidation breaks checkout | LOW | MEDIUM — blocks revenue | Test thoroughly before cutover; maintain fallback provider |

---

## Page 4 — Phase 6 Gate & Audit Completion

### Phase 6 Gate

| Criterion | Status |
|---|---|
| Prioritized gap remediation plan | ✅ 5 P0, 7 P1, 7 P2, 5 P3 — 24 total gaps |
| 30/90/180-day action lists | ✅ 8 weekly + 9 monthly + 8 quarterly actions |
| Positioning score projection | ✅ 4.75 → 6.75 → 8.0 → 8.88 over 180 days |
| Risk factors identified | ✅ 5 risks with probability, impact, mitigation |
| Acceptance criteria defined | ✅ Every gap has measurable acceptance criteria |

### Audit Completion Summary

| Phase | Artifact | Confidence | Status |
|---|---|---|---|
| Phase 0 | `phase-0-research-summary.md` | 96% | ✅ Complete |
| Phase 1 | `phase-1-codebase-inventory.md` | 96% | ✅ Complete |
| Phase 2 | `phase-2-market-research.md` | 95% | ✅ Complete |
| Phase 3 | `phase-3-gap-analysis.md` | 95% | ✅ Complete |
| Phase 4 | `phase-4-positioning-strategy.md` | 95% | ✅ Complete |
| Phase 5 | `phase-5-codebase-audit.md` | 95% | ✅ Complete |
| Phase 6 | `phase-6-remediation-roadmap.md` | 95% | ✅ Complete |

**Overall Audit Confidence: 95%**
**All 7 phases complete. Master report to follow.**

### Key Audit Conclusions

1. **Beachhead:** Alberta TIER facility compliance CFO memo (ICP 88/100, 7/7 MIT criteria)
2. **Positioning score:** 4.75/10 (below 7.0 target) — needs P0 fixes immediately
3. **Product DNA:** 7.2/10 — architecture strong, positioning alignment weak
4. **Buyer evidence:** 0% — 5 of 8 confidence gates not started
5. **#1 competitor:** Spreadsheet (do nothing) — not another software platform
6. **#1 gap:** Homepage tells a completely different story than the TIER positioning
7. **Path to 8.0/10:** Execute 30-day P0 actions (homepage, nav, category, value language)
8. **Path to 8.88/10:** Execute 180-day P2/P3 actions (buyer evidence, moat, SOC 2, consultant channel)
