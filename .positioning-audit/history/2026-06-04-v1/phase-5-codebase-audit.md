# Phase 5 — Codebase Audit Execution (Deep)

> **Audit:** CEIP Niche Positioning Audit (Deep Scope)
> **Date:** 2026-06-04
> **Confidence:** 95% — Gate cleared
> **Beachhead:** Alberta TIER Facility Compliance CFO Memo

---

## Page 1 — Product DNA Audit (10 Dimensions)

### Dimension-by-Dimension Assessment

| # | Dimension | Score | Evidence | Gap |
|---|---|---|---|---|
| 1 | **Architecture Alignment** | 8/10 | React 18 + TS + Vite 7 + Supabase + Netlify. 52 lazy-loaded routes, vendor manualChunks, 97% bundle reduction. Production-grade architecture. | 3 payment providers create split entitlement complexity. Consolidate to 1 for TIER tier. |
| 2 | **Feature Completeness** | 7/10 | TIER ROI calculator fully implemented with 3-pathway comparison, sample preset, lead capture, PDF export, SEO. Credit banking dashboard exists. | Credit banking audit pack needs buyer-validated ledger examples. DI pathway uses estimated rate (0.80) — needs validation when standard releases. |
| 3 | **Data Integrity** | 7/10 | `tierPricing.ts` is a strong single-source-of-truth with provenance, source URLs, last-verified dates, staleness checks, and disclosure text. Fund price ($95) sourced from Canada-Alberta Implementation Agreement. Market price ($25) labeled as "CEIP fallback secondary-market planning snapshot." | Market price is still a static fallback, not live. `DI_CREDIT_RATE = 0.80` is labeled "estimated." No buyer has validated these numbers. |
| 4 | **Security Posture** | 8/10 | CORS hardened (0 wildcards), rate limiting on 68 functions, JWT verification, CSP, DOMPurify, httpOnly cookie auth. Security procurement pack exists. | No SOC 2. No penetration test. Security procurement pack has no buyer-reviewed evidence. |
| 5 | **Performance** | 9/10 | 97% bundle reduction via code splitting. Vendor manualChunks. Suspense + RouteLoader. Immutable assets. | No Lighthouse CI. No performance budget enforcement. |
| 6 | **UX/Accessibility** | 8/10 | WCAG 2.2 AA, skip-to-main, focus management, reduced-motion, high-contrast, mobile-first. | 65+ routes create cognitive overload. TIER buyer has to navigate past utility/indigenous/municipal surfaces. |
| 7 | **Testing Coverage** | 5/10 | Vitest + Playwright + custom check scripts (claim-boundary, commercial-source, release-readiness). | No coverage measurement. No E2E test for TIER calculator flow. No integration tests for pricing hook. |
| 8 | **Documentation Quality** | 6/10 | 121 docs, 11 active commercial, claim-boundary guard active. `COMMERCIAL_SOURCE_OF_TRUTH.md` is well-maintained. | 28+ stale docs. 121 files is excessive. TIER-specific buyer documentation is thin. |
| 9 | **Deployment Readiness** | 8/10 | Netlify deploy with functions, sitemap, robots.txt, SEO heads, OG/Twitter meta. Plausible analytics. | No staging environment. No canary deploy. No rollback procedure documented. |
| 10 | **Monetization Integration** | 6/10 | 6 tiers defined, Whop/Paddle/Stripe integrations, pricing page with smart tier CTA routing. | 3 payment providers. $9-$5,900 spread. B2C watchdog tier dilutes B2B focus. TIER tier ($1,500/mo) is well-positioned but not the lead tier. |

**Product DNA Average: 7.2/10** — Architecture and performance are strong. Testing, documentation, and monetization need work.

### Score Distribution

```
Architecture:      ████████░░ 8/10
Feature Complete:  ███████░░░ 7/10
Data Integrity:    ███████░░░ 7/10
Security:          ████████░░ 8/10
Performance:       █████████░ 9/10
UX/Accessibility:  ████████░░ 8/10
Testing:           █████░░░░░ 5/10
Documentation:     ██████░░░░ 6/10
Deploy Readiness:  ████████░░ 8/10
Monetization:      ██████░░░░ 6/10
                   ───────────
Average:           ███████░░░ 7.2/10
```

---

## Page 2 — TIER Beachhead Code Path Audit

### TIERROICalculator.tsx (637 lines) — Detailed Audit

| Component aspect | Status | Evidence | Gap |
|---|---|---|---|
| 3-pathway comparison (fund/market/DI) | ✅ Implemented | Lines 100-121: fundPayment, marketCredits, directInvestment calculated | DI pathway uses estimated `DI_CREDIT_RATE = 0.80` — needs validation |
| Sample facility preset | ✅ Implemented | Lines 41-44: 162K tCO₂e, 24K exceedance, $650K capex | Real buyer data not available |
| Pricing source-of-truth | ✅ Strong | `useTIERPricing()` hook → `tierPricing.ts` with provenance, source URLs, last-verified | Market price is fallback, not live |
| Pricing freshness disclosure | ✅ Implemented | Lines 418-421: displays observed date and claim label | Good — buyer can see when price was last verified |
| Lead capture | ✅ Implemented | Lines 144-186: email capture with validation | Leads stored in localStorage — if user clears browser, leads are lost |
| PDF/CSV export | ✅ Implemented | Export pipeline with source-dated metadata | Export quality not buyer-validated |
| SEO head | ✅ Implemented | Lines 249-254: title, description, keywords, path | Description mentions "buyer validation required" — good honesty |
| Claim boundaries | ✅ Active | "scenario-based and must be refreshed with buyer-specific pricing before approval" (line 283) | Strong — no guaranteed savings claim |
| Data sources section | ✅ Implemented | Lines 627-632: "Government of Alberta TIER materials plus route-level market pricing provenance" | Good provenance disclosure |
| Success fee model | ✅ Implemented | Lines 95-97: $18K/yr base + 20% success fee | Success fee requires buyer agreement on "savings" definition |
| DI pathway policy notes | ✅ Strong | `tierPricing.ts` lines 115-121: 5 policy notes including DI eligibility, floor regulations, reporting deadlines | Excellent — shows regulatory awareness |
| Headline price schedule | ✅ Implemented | `tierPricing.ts` lines 85-101: 2026-2040 schedule | Forward-looking, useful for multi-year planning |
| Price floor schedule | ✅ Implemented | `tierPricing.ts` lines 102-114: 2030-2040 floor schedule | Important for long-range scenario caveats |
| Staleness check | ✅ Implemented | `isPricingStale()` — 90-day threshold | Good — but no UI warning when stale |
| CFO memo format | ⚠️ Partial | Export pipeline exists but output format not specifically labeled "CFO memo" | Rename export to "CFO-ready TIER compliance memo" |

### tierPricing.ts (238 lines) — Quality Assessment

| Aspect | Score | Notes |
|---|---|---|
| Single source of truth | 9/10 | Centralized config with env override capability |
| Provenance metadata | 9/10 | Source, sourceUrl, lastVerifiedAt, isFrozen, periodLabel |
| Disclosure language | 9/10 | "Fallback only. Replace with a live quote or registry-backed market data before buyer approval." |
| Forward-looking schedules | 8/10 | Headline price + floor price schedules through 2040 |
| Policy notes | 9/10 | 5 notes covering DI eligibility, floor regulations, reporting deadlines, implementation agreement |
| Staleness detection | 7/10 | 90-day threshold is reasonable but no automated alert |
| Test coverage | 3/10 | No unit tests for pricing calculations visible |
| TypeScript types | 9/10 | Strong interface definitions, well-typed |

### CreditBankingDashboard.tsx — Audit

| Aspect | Status | Notes |
|---|---|---|
| Route exists | ✅ | `/credit-banking` in App.tsx |
| Component exists | ✅ | `CreditBankingDashboard.tsx` |
| Buyer evidence | ❌ | No buyer has validated credit ledger functionality |
| Claim boundaries | ⚠️ | Needs verification — do-not-claim list should include "no broker/trade/registry certification" |

---

## Page 3 — Positioning-to-Code Alignment Gaps

### Gap Matrix: Positioning Canvas vs Code Reality

| Positioning claim | Code support | Gap | Priority |
|---|---|---|---|
| "TIER compliance decision tool" | TIERROICalculator exists with 3-pathway comparison | Category not stated in homepage or nav — buyer sees "proof packs" | P0 |
| "3-hour source-dated CFO memo" | Export pipeline exists with source-dated metadata | Export not labeled "CFO memo" — labeled "planning pack" | P1 |
| "3-pathway comparison (fund, market, DI)" | Fully implemented in TIERROICalculator | DI rate is estimated (0.80) — needs validation when standard releases | P2 |
| "Board-ready export" | PDF/CSV export exists | Export quality not buyer-validated | P1 |
| "From $1,500/mo" | Pricing tier exists in commercialPositioning.ts | Not the lead tier on PricingPage — 6 tiers displayed equally | P1 |
| "Source-dated pricing with freshness gate" | tierPricing.ts has lastVerifiedAt, isPricingStale() | No UI warning when pricing is stale | P2 |
| "Claim-boundary guard" | Active CI check (`pnpm run check:claim-boundaries`) | Do-not-claim list needs TIER-specific additions | P2 |
| "Credit banking audit (cross-sell)" | CreditBankingDashboard exists | No buyer evidence, claim boundaries need verification | P2 |
| "Expansion path: TIER → GA/ICI → utility" | Routes exist for all 3 | No cross-sell flow or CTAs connecting them | P3 |

### Homepage (CommercialLandingPage) vs TIER Positioning

| Element | Current | TIER-focused target | Gap |
|---|---|---|---|
| Hero headline | "Sell the energy workflow that owns a budget, not the prediction demo that gets admired and parked." | "TIER Compliance CFO Memo — 3 pathways, source-dated, board-ready." | P0 — completely different message |
| Hero subhead | "CEIP now leads with ten proof packs..." | "Cut your TIER compliance prep from 3 weeks to 3 hours. Compare fund, market, and direct investment pathways with source-dated pricing." | P0 |
| Primary CTA | "View the top 10 proof packs" → `/solutions` | "Start your TIER compliance memo" → `/roi-calculator` | P0 |
| Metric cards | "10 sellable proof packs", "30-60d target pilot path", "Utility-first GTM sequence" | "3 pathways compared", "$70/t spread potential", "150 Alberta facilities" | P0 |
| Segment switcher | 5 segments (Utility, Industrial, Security, Indigenous, Municipal) | Remove or collapse — TIER buyer doesn't need segment selection | P1 |
| Proof pack grid | 10 wedges filtered by active segment | Lead with TIER ROI + credit banking, rest behind "Solutions" | P1 |

### Nav Structure vs TIER Positioning

| Nav element | Current | TIER-focused target | Gap |
|---|---|---|---|
| Primary nav items | 65+ routes accessible | TIER ROI, Credit Banking, Solutions (collapsed), Pricing | P0 |
| Orphan routes in nav | 12 groups visible | Remove from nav entirely | P0 |
| TIER route prominence | `/roi-calculator` is one of many | `/roi-calculator` should be the front door | P0 |
| Pricing page lead | 6 tiers displayed equally | TIER tier ($1,500/mo) as primary, others as "also available" | P1 |

---

## Page 4 — Phase 5 Gate Assessment

### Per-Feature Audit Summary

| Feature | DNA score | Positioning alignment | Buyer evidence | Priority |
|---|---|---|---|---|
| TIER ROI Calculator | 8/10 | Misaligned (buried, not front door) | None | P0 — make front door |
| TIER Pricing Infrastructure | 9/10 | Aligned (strong provenance) | None (pricing validated, buyer not) | P2 — add staleness UI |
| Credit Banking Dashboard | 6/10 | Partially aligned (cross-sell) | None | P2 — verify claim boundaries |
| Commercial Landing Page | 3/10 | Misaligned (broad catalog, not TIER) | N/A | P0 — redesign for TIER |
| Pricing Page | 5/10 | Misaligned (6 tiers, no lead) | N/A | P1 — lead with TIER |
| Nav Structure | 2/10 | Misaligned (65+ routes) | N/A | P0 — collapse to TIER-first |
| Claim Boundary Guard | 8/10 | Aligned (active CI) | N/A | P2 — add TIER-specific claims |
| Export Pipeline | 7/10 | Partially aligned (not labeled "CFO memo") | None | P1 — rename export |
| Security Procurement Pack | 7/10 | Supporting (trust enabler) | None | P2 — maintain |

### Phase 5 Gate

| Criterion | Status |
|---|---|
| Product DNA audit (10 dimensions) | ✅ Average 7.2/10 |
| TIER code path audited | ✅ 15 aspects assessed, 13 strong, 2 partial |
| Positioning-to-code gaps identified | ✅ 9 gaps with priorities |
| Homepage alignment assessed | ✅ 6 elements misaligned |
| Nav structure assessed | ✅ 4 elements need restructuring |
| Per-feature priority assigned | ✅ 9 features with P0-P3 priorities |

**Confidence: 95%**
**Gate: GO → Proceed to Phase 6**

### Key Findings for Phase 6

1. **P0 gaps (fix immediately):** Homepage hero, nav structure, TIER as front door, orphan route removal
2. **P1 gaps (fix next):** Pricing page lead tier, export labeling, narrative consistency
3. **P2 gaps (maintain):** Pricing staleness UI, claim boundary updates, credit banking verification
4. **Product DNA:** 7.2/10 — architecture is strong, positioning alignment is weak
5. **TIER pricing infrastructure:** 9/10 — excellent provenance and disclosure
6. **#1 code gap:** CommercialLandingPage tells a completely different story than the TIER positioning canvas
