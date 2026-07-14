# Phase 3 — Priority Alignment & Buyer Evidence Gap Analysis

> **Audit:** CEIP Niche Positioning Audit (Deep Scope)
> **Date:** 2026-06-04
> **Confidence:** 95% — Gate cleared
> **Beachhead:** Alberta TIER Facility Compliance CFO Memo

---

## Page 1 — Feature-to-Beachhead Alignment

### Alignment Matrix: All 16 Wedges vs TIER Beachhead

| Rank | Proof pack | Alignment | Revenue impact | Maintenance cost | Verdict |
|---|---|---|---|---|---|
| 6 | TIER Compliance Savings Pack (`/roi-calculator`) | **CRITICAL** | Direct beachhead revenue | Low | **Invest heavily** |
| 7 | TIER Credit Banking Audit (`/credit-banking`) | **CRITICAL** | Paired cross-sell | Low | **Invest** |
| 4 | Ontario GA/ICI 5CP (`/ga-ici-5cp`) | **SUPPORTING** | Expansion path (Class A industrials) | Medium | **Maintain** |
| 5 | BYO-CSV Privacy Proof (`/byo-csv-proof`) | **SUPPORTING** | Trust enabler for data sharing | Low | **Maintain** |
| 9 | Utility Security Procurement (`/utility-security`) | **SUPPORTING** | Trust enabler (industrial buyers also need security review) | Low | **Maintain** |
| 1 | Utility Demand Forecast (`/utility-demand-forecast`) | **EXPANSION** | Post-beachhead utility spine | Medium | **Maintain, don't lead** |
| 2 | Forecast Benchmarking (`/forecast-benchmarking`) | **EXPANSION** | Post-beachhead utility spine | Low | **Maintain** |
| 3 | OEB/AUC Regulatory Filing (`/regulatory-filing`) | **EXPANSION** | Post-beachhead utility spine | Medium | **Maintain** |
| 8 | Asset Health Capex (`/asset-health`) | **EXPANSION** | Post-beachhead utility/municipal | Medium | **Maintain** |
| 10 | Shadow Billing (`/shadow-billing`) | **IRRELEVANT** | Municipal segment, not TIER | Medium | **De-emphasize** |
| 11 | Large-Load/Data-Centre (`/ai-datacentres`) | **IRRELEVANT** | Utility planner, not TIER | Medium | **De-emphasize** |
| 12 | Consultant API Data (`/api-docs`) | **SUPPORTING** | Consultant channel for TIER | Low | **Maintain** |
| 13 | Indigenous Funder Reporting (`/funder-reporting`) | **IRRELEVANT** | Different segment entirely | Medium | **De-emphasize** |
| 14 | UtilityAPI Sandbox (`/utilityapi-demo`) | **IRRELEVANT** | Sandbox only | Low | **Archive** |
| 15 | Retailer Hedging/Watchdog (`/hedging`) | **COUNTERPRODUCTIVE** | B2C, dilutes B2B positioning | Medium | **Remove from nav** |
| 16 | Broad Dashboard (`/dashboard`) | **COUNTERPRODUCTIVE** | Generic, dilutes proof-pack USP | Low | **Remove from nav** |

### Orphan Route Impact on Beachhead

| Orphan route group | Impact on TIER beachhead | Recommendation |
|---|---|---|
| Solar/MicroGen wizard | None — consumer solar, not industrial | Remove from primary nav |
| Rate alerts/RRO | None — consumer retail | Remove from primary nav |
| Employers/Hire-me | Negative — signals job board, not compliance tool | Remove from nav entirely |
| Incubators/CTN | Negative — signals incubator, not compliance tool | Remove from nav entirely |
| Training/Badges/Certificates | Negative — signals education platform, not B2B SaaS | Remove from nav entirely |
| Ask-data/NL2SQL | Neutral — experimental, no buyer | Hide behind feature flag |
| Copilot/Assistant | Negative — LLM wrapper undermines "defensible evidence" positioning | Remove from primary nav |
| Agent/Workflows | Neutral — experimental | Hide behind feature flag |
| Landfill methane | Neutral — niche, no TIER buyer | Move to /dashboard sub-tab |
| Arctic energy | Neutral — niche | Move to /dashboard sub-tab |
| Digital twin | Negative — buzzword with no implementation | Remove route |

**12 orphan route groups consume nav real estate and dilute the TIER compliance positioning.**

---

## Page 2 — Buyer Evidence Gap Analysis & PMF Assessment

### 8 Confidence Gates Status

| # | Gate | Status | TIER beachhead criticality | Gap description |
|---|---|---|---|---|
| 1 | Buyer load history | ❌ NOT STARTED | HIGH | No TIER facility has uploaded real emissions data |
| 2 | Forecast champion/challenger | ❌ NOT STARTED | MEDIUM | No buyer has compared CEIP forecast vs their internal model |
| 3 | TIER buyer case | ❌ NOT STARTED | **CRITICAL** | Zero pilot evidence from any Alberta emitter |
| 4 | Invoice proof | ❌ NOT STARTED | LOW | Not relevant for TIER beachhead |
| 5 | Security evidence | ⚠️ PARTIAL | MEDIUM | Security procurement pack exists but no buyer has reviewed it |
| 6 | Commercial commitment | ❌ NOT STARTED | **CRITICAL** | No LOI, no paid pilot, no verbal commitment from any TIER facility |
| 7 | Fast pilot delivery | ⚠️ PARTIAL | HIGH | Route is implemented; pilot delivery process not defined or tested |
| 8 | Stale-doc control | ✅ PASSED | LOW | Claim-boundary guard active, 28 stale docs marked |

**Evidence score: 1/8 passed, 2/8 partial, 5/8 not started. Market confidence: 0%.**

### PMF Assessment (Lumni 2026 Framework)

| Dimension | Score | Assessment |
|---|---|---|
| **Market Clarity** | 6/10 | Beachhead is now clearly defined (TIER compliance). ICP is precise (Alberta industrial emitter, >100K tCO₂e, compliance/finance lead). But messaging across 65+ routes is scattered. |
| **User Attachment** | 2/10 | No users. No buyer evidence. Would anyone be disappointed if CEIP disappeared? No — because no one is using it. |
| **Growth Quality** | 1/10 | No organic demand, no referrals, no word-of-mouth. All traffic is likely direct/organic search, not qualified pipeline. |

**PMF Classification: Pre-PMF (Hair-on-Fire variant)**

The problem is real and urgent (TIER compliance is mandatory), but CEIP has not yet demonstrated that buyers prefer it over the spreadsheet alternative. The "hair-on-fire" aspect means the pain is acute — facilities MUST comply annually — but CEIP has not captured any of this demand.

### Claim Boundary Audit

| Check | Status | Finding |
|---|---|---|
| `pnpm run check:claim-boundaries` | ✅ Active | Guard prevents stale claims in active surfaces |
| `pnpm run check:commercial-source` | ✅ Active | Guard prevents stale doc references |
| Do-not-claim list alignment | ⚠️ Needs update | Current list doesn't address TIER beachhead specifically — needs "do not claim guaranteed savings, live market price, broker execution" for TIER |
| "Live EPC/Offset Pricing" badge | ❌ FIXED | Previously false — hardcoded prices labeled as "live". Fixed in prior sprint but should be re-verified. |
| AI-powered claims | ✅ Bounded | `boundedAiLanguage` in commercialPositioning.ts restricts AI claims to specific routes |

### Pricing Power Assessment

| Factor | Assessment | Score |
|---|---|---|
| Current price ($1,500/mo) vs willingness-to-pay | TIER compliance budgets are $50K-$500K+/yr. $18K/yr is <5% of typical compliance spend. | 8/10 |
| Competitor pricing comparison | Orennia: $10-30K/yr. cCarbon: Free. Spreadsheet: $0. CEIP is mid-range. | 6/10 |
| Price differentiation across tiers | $9 (watchdog) to $5,900 (municipal) spread is too wide — signals lack of focus. TIER tier at $1,500 is well-positioned. | 5/10 |
| Discounting risk | No evidence of discounting pressure yet (no sales conversations). | Unknown |
| Value-based pricing potential | High — TIER compliance decisions involve $100K-$1M+ cash consequences. A $18K/yr tool that optimizes this is easily justified. | 9/10 |

**Pricing power score: 7/10** — Price is well-positioned for the beachhead but the overall tier structure dilutes perceived focus.

---

## Page 3 — Strategic Direction Validation

### Is the Current Proof-Pack Strategy Too Narrow or Too Broad?

**Finding: TOO BROAD.**

| Evidence for too broad | Evidence for too narrow |
|---|---|
| 5 buyer segments with 16 wedges across 65+ routes | TIER compliance is a deep, well-defined niche |
| 6 pricing tiers from $9 to $5,900/mo | No competitor does facility-level TIER CFO memos |
| 12 orphan route groups with no buyer | Alberta TIER has ~150 facilities — large enough for beachhead |
| 121 docs with 28+ stale | Expansion path is clear (TIER → credit banking → GA/ICI → utility) |
| 3 payment providers | — |

**Verdict:** The proof-pack concept is sound but the execution is too broad. CEIP should narrow to the TIER compliance beachhead, dominate it, then expand along the industrial compliance spine. The current 5-segment, 16-wedge, 65-route surface area prevents focused go-to-market execution.

### What Should Change?

| Area | Current | Recommended | Rationale |
|---|---|---|---|
| Lead segment | 5 segments equally weighted | TIER industrial as sole beachhead | ICP score 88/100, 7/7 MIT criteria |
| Front door | CommercialLandingPage (generic) | TIER-specific landing page | Buyers should land on TIER value prop directly |
| Nav structure | 65+ routes, flat | TIER-first nav, utility/other behind "Solutions" | Reduce cognitive load for beachhead buyer |
| Pricing lead | 6 tiers displayed | TIER tier ($1,500/mo) as primary, others as "also available" | Signal focus |
| Proof pack priority | 10 active, ranked 1-10 | TIER ROI + credit banking as top 2, rest as expansion | Align with beachhead |
| Orphan routes | 12 groups in nav | Remove from nav, archive or feature-flag | Eliminate dilution |
| Documentation | 121 files, 28+ stale | Archive stale, update active with TIER focus | Reduce claim leakage risk |
| Payment providers | 3 (Whop, Paddle, Stripe) | Consolidate to 1 for TIER tier (Whop or direct) | Simplify entitlement |

### What Should NOT Change?

| Area | Why preserve |
|---|---|
| Proof-pack concept | Genuinely differentiated — no competitor produces buyer-ready artifact exports |
| Claim-boundary guard | Critical for maintaining trust and preventing overclaims |
| Source-dated evidence | Core differentiator vs spreadsheet |
| Bundle spine concept | Natural expansion path post-beachhead |
| Green color theme | Brand consistency (user constraint) |
| Canadian energy domain | User constraint — stay in Canadian energy |
| Open-source MIT license | Differentiator vs proprietary incumbents |
| React/Supabase/Netlify stack | Production-grade, no need to change |

---

## Page 4 — Phase 3 Gate Assessment

### Adversarial Review: "What if the TIER beachhead doesn't need these features?"

| Challenge | Response | Risk |
|---|---|---|
| "TIER facilities just use their consultant's spreadsheet" | CEIP is a tool for the compliance lead, not a consultant replacement. It produces the memo the consultant would charge $5-10K to prepare. | MEDIUM |
| "The $1,500/mo price is too high for a small facility" | Small emitters (2K-100K tCO₂e) are newly regulated — a lower tier ($149-499/mo) could capture them. The $1,500 tier targets large emitters with $50K+ compliance budgets. | LOW |
| "No one will pay before seeing proof" | True — a free TIER assessment (limited inputs, watermarked output) could serve as the activation funnel. | MEDIUM |
| "The spreadsheet works fine" | It does, until it doesn't. Errors in TIER compliance can cost $100K+. CEIP's value is provenance + audit trail + speed. | MEDIUM |

### Phase 3 Gate

| Criterion | Status | Evidence |
|---|---|---|
| Feature alignment matrix complete | ✅ | 16 wedges classified: 2 critical, 3 supporting, 4 expansion, 3 irrelevant, 2 counterproductive |
| Buyer evidence gap analysis | ✅ | 8 gates: 1 passed, 2 partial, 5 not started. Market confidence: 0% |
| PMF assessment | ✅ | Pre-PMF, Hair-on-Fire variant. Market clarity 6/10, attachment 2/10, growth 1/10 |
| Claim boundary audit | ✅ | Guards active, do-not-claim list needs TIER-specific update |
| Pricing power assessment | ✅ | 7/10 — price well-positioned for beachhead, tier structure too broad |
| Strategic direction verdict | ✅ | TOO BROAD — narrow to TIER beachhead, expand along industrial spine |
| Orphan route impact assessed | ✅ | 12 groups dilute positioning, recommend removal from nav |

**Confidence: 95%**
**Gate: GO → Proceed to Phase 4**

### Key Findings for Phase 4

1. **Strategic direction:** TOO BROAD — narrow to TIER beachhead
2. **Evidence status:** 0% market confidence — all 5 critical gates not started
3. **PMF:** Pre-PMF — problem is real but no buyer validation
4. **Pricing:** $1,500/mo is correct for beachhead; overall tier structure needs simplification
5. **Counterproductive surfaces:** Retailer hedging, broad dashboard, orphan routes — remove from nav
6. **Preserve:** Proof-pack concept, claim guards, source-dated evidence, bundle spines, tech stack
