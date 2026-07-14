# CEIP Market Positioning Audit — Master Report

> **Audit:** CEIP Niche Positioning Audit (Deep Scope)
> **Date:** 2026-06-04
> **Overall Confidence:** 95%
> **Beachhead:** Alberta TIER Facility Compliance CFO Memo
> **Audit Scope:** Deep — All 7 phases + per-feature audit + competitor deep-dive + 30/90/180-day action lists

---

## Executive Summary

CEIP is a production-grade React/TypeScript energy compliance platform with 65+ routes, 151 components, and 86 Edge Functions. The architecture is strong (DNA score 7.2/10), but the market positioning is weak (4.75/10 on the 8-Lens Audit).

**The core problem:** CEIP presents itself as a broad "10 proof packs across 5 segments" catalog when it should present itself as a focused "TIER compliance decision tool" for Alberta industrial emitters.

**The core opportunity:** Alberta TIER compliance is a $45M+ SAM with ~150 facilities, each facing mandatory annual compliance with $100K-$1M+ cash consequences. No competitor produces facility-level TIER compliance CFO memos. The #1 competitor is the spreadsheet.

**The path forward:** Narrow to the TIER beachhead, redesign the homepage and nav for 15-second clarity, rewrite value articulation from features to outcomes, and launch a buyer evidence program to move from 0% to validated market confidence.

---

## 1. Beachhead Selection

### Selected: Alberta TIER Facility Compliance CFO Memo

| Criterion | Result |
|---|---|
| ICP score | 88/100 (highest of 35 candidates) |
| MIT beachhead criteria | 7/7 passed |
| Market size | ~150 facilities emitting >100K tCO₂e/yr |
| Budget per facility | $50K-$500K+ annual compliance spend |
| CEIP price point | $1,500/mo ($18K/yr) — <5% of compliance budget |
| Urgency | Annual TIER filing deadline + new DI pathway (early 2026) |
| Competitor whitespace | Orennia (investors), cCarbon (macro), Targray (trader) — none do facility-level CFO memos |
| Expansion path | TIER → Credit banking → Small emitter opt-in → Ontario GA/ICI → Utility forecast |

### Why Not Other Segments?

| Segment | ICP score | Why not beachhead |
|---|---|---|
| Ontario small LDC forecast | 82/100 | Small LDCs have limited budgets; rate case cycle is slower than TIER annual deadline |
| Utility security procurement | 81/100 | Security contacts hard to identify; procurement cycle is slow |
| Alberta direct investment planning | 80/10 | New pathway — good expansion but DI standard not yet released |
| Ontario GA/ICI 5CP | 78/100 | Ontario-specific, smaller market (~200 Class A), seasonal not annual |

---

## 2. Positioning Audit Results

### 8-Lens Audit Scores

| Lens | Score | Status | Priority |
|---|---|---|---|
| Category Clarity | 4/10 | 🔴 RED | P0 |
| ICP Precision | 5/10 | 🟡 YELLOW | P1 |
| Competitive Alternatives | 7/10 | 🟢 GREEN | P2 |
| Differentiation Defensibility | 5/10 | 🟡 YELLOW | P2 |
| Value Articulation | 3/10 | 🔴 RED | P0 |
| Pricing Power | 6/10 | 🟡 YELLOW | P3 |
| Narrative Consistency | 4/10 | 🔴 RED | P1 |
| Homepage Clarity | 3/10 | 🔴 RED | P0 |
| **Average** | **4.75/10** | **Below 7.0 target** | — |

### Recommended Positioning Canvas

```
CATEGORY: TIER Compliance Decision Tool
AUDIENCE: Alberta industrial compliance lead at facility >100K tCO₂e/yr
PROBLEM: TIER compliance pathway selection is spreadsheet guesswork 
         with $100K+ cash consequences and no audit trail
ALTERNATIVES: (1) Spreadsheet + consultant, (2) cCarbon macro simulator, 
              (3) Targray credit trading desk
CLAIM: CEIP turns TIER compliance from 3 weeks of spreadsheet guesswork 
       into a 3-hour source-dated CFO memo with 3-pathway comparison 
       (fund, market, direct investment) and board-ready export.
PRICING: $1,500/mo — less than 5% of typical compliance budget
EXPANSION: TIER → Credit banking → Small emitter → GA/ICI → Utility forecast
```

---

## 3. Codebase Audit Summary

### Product DNA: 7.2/10

| Strong (8-9) | Moderate (5-7) |
|---|---|
| Architecture (8), Performance (9), Security (8), UX/A11y (8), Deploy (8) | Features (7), Data (7), Testing (5), Docs (6), Monetization (6) |

### TIER Implementation Quality: 8/10

- `tierPricing.ts` is a strong single-source-of-truth with provenance, source URLs, last-verified dates, staleness checks, and 5 policy notes
- 3-pathway comparison (fund $95/t, market ~$25/t, DI estimated) is fully implemented
- Claim boundaries are active and conservative ("scenario-based, must be refreshed with buyer-specific pricing")
- Export pipeline produces source-dated PDF/CSV with metadata
- Lead capture exists but stores to localStorage (risk: data loss)

### Key Code Gaps

| Gap | Priority | Impact |
|---|---|---|
| Homepage tells different story than TIER positioning | P0 | Buyers can't identify what CEIP is in 15 seconds |
| Nav has 65+ routes, 12 orphan groups | P0 | Cognitive overload dilutes TIER focus |
| Export labeled "planning pack" not "CFO memo" | P1 | Misses buyer mental model |
| Pricing page shows 6 tiers equally | P1 | Signals lack of focus |
| No E2E test for TIER calculator flow | P2 | Regression risk |
| 3 payment providers | P2 | Entitlement complexity |

---

## 4. Competitor Landscape

### Feature Matrix Summary

| Competitor | Type | TIER facility-level | CFO memo export | Canadian focus | Proof-pack format | Price |
|---|---|---|---|---|---|---|
| **CEIP** | SaaS | ✅ | ✅ | ✅ | ✅ | $1,500/mo |
| Orennia | SaaS | ❌ | ❌ | ✅ | ❌ | $10-30K/yr |
| cCarbon | Free tool | ⚠️ Macro only | ❌ | ✅ | ❌ | Free |
| Targray | Trader | ❌ | ❌ | ✅ | ❌ | N/A |
| Itron | Enterprise | ❌ | ❌ | ❌ (global) | ❌ | $50K+ |
| Amperon | SaaS | ❌ | ❌ | ❌ (US) | ❌ | $50K+ |
| **Spreadsheet** | DIY | ⚠️ Manual | ❌ | N/A | ❌ | $0 |

**Key insight:** CEIP has no direct software competitor for facility-level TIER compliance CFO memos. The #1 competitor is the spreadsheet.

---

## 5. Buyer Evidence Status

### 8 Confidence Gates

| Gate | Status | TIER criticality |
|---|---|---|
| Buyer load history | ❌ Not started | HIGH |
| Forecast champion/challenger | ❌ Not started | MEDIUM |
| TIER buyer case | ❌ Not started | **CRITICAL** |
| Invoice proof | ❌ Not started | LOW |
| Security evidence | ⚠️ Partial | MEDIUM |
| Commercial commitment | ❌ Not started | **CRITICAL** |
| Fast pilot delivery | ⚠️ Partial | HIGH |
| Stale-doc control | ✅ Passed | LOW |

**Market confidence: 0%** — CEIP is pre-PMF. The problem is real and urgent, but no buyer has validated the solution.

---

## 6. Remediation Roadmap

### 30-Day Actions (P0 — Fix Immediately)

1. **Redesign homepage hero** — TIER-focused headline, subhead, CTA (4h)
2. **Collapse nav to 4 items** — TIER ROI, Credit Banking, Solutions, Pricing (6h)
3. **Remove 12 orphan route groups from nav** — solar, RRO, employers, incubators, training, badges, copilot, agent, digital-twin (2h)
4. **Make `/roi-calculator` the front door** — all CTAs point to TIER first (3h)
5. **Fix category language** — "TIER compliance software" not "proof-pack product" (3h)
6. **Rewrite value articulation** — "3 weeks → 3 hours, source-dated, board-ready" (4h)
7. **Update TIER do-not-claim list** — add guaranteed savings, live price, broker execution (1h)

**30-day target: positioning score 4.75 → 6.75**

### 90-Day Actions (P1 — Fix Next)

1. Redesign PricingPage — TIER as lead tier (4h)
2. Rename export to "CFO-ready TIER compliance memo" (2h)
3. Add cross-sell CTA (TIER → credit banking) (3h)
4. Move 28+ stale docs to `docs/archive/` (2h)
5. Narrative consistency audit (8h)
6. Add pricing staleness UI warning (3h)
7. Begin E2E test for TIER flow (16h)
8. Engage 1 TIER facility for security review (20h)
9. Consolidate TIER payment to single provider (8h)

**90-day target: positioning score 6.75 → 8.0**

### 180-Day Actions (P2/P3 — Maintain & Deepen)

1. Update DI pathway rate when standard releases (2h)
2. Launch buyer evidence program — 3 paid TIER pilots (ongoing)
3. Deepen moat — Alberta emissions registry data feed (40h)
4. Begin SOC 2 Type 1 readiness (80h)
5. Launch consultant channel program (40h)
6. Cross-sell expansion to Ontario GA/ICI (16h)
7. Regulatory embedding — OEB/AUC filing template (80h)

**180-day target: positioning score 8.0 → 8.88**

---

## 7. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| No buyer responds to TIER pilot outreach | HIGH | CRITICAL | Free TIER assessment funnel; Alberta emissions registry cold outreach |
| TIER regulation changes (Dec 2026 review) | MEDIUM | MEDIUM | Monitor Alberta.ca; update pricing within 48h |
| Competitor adds facility-level TIER tools | LOW | MEDIUM | First-mover + proof-pack format + claim-boundary trust |
| DI pathway standard delayed | MEDIUM | LOW | Keep "estimated" label; focus on fund vs market |
| Payment consolidation breaks checkout | LOW | MEDIUM | Test thoroughly; maintain fallback |

---

## 8. What Should NOT Change

| Element | Why preserve |
|---|---|
| Proof-pack concept | Genuinely differentiated — no competitor produces buyer-ready artifact exports |
| Claim-boundary guard | Critical for maintaining trust and preventing overclaims |
| Source-dated evidence | Core differentiator vs spreadsheet |
| `tierPricing.ts` infrastructure | 9/10 quality — provenance, staleness, policy notes |
| Bundle spine concept | Natural expansion path post-beachhead |
| Green color theme | Brand consistency (user constraint) |
| Canadian energy domain | User constraint |
| Open-source MIT license | Differentiator vs proprietary incumbents |
| React/Supabase/Netlify stack | Production-grade, no need to change |

---

## 9. Audit Artifacts

| Phase | Artifact | Location |
|---|---|---|
| Phase 0 | Pre-Execution Protocol Research Summary | `.positioning-audit/phase-0-research-summary.md` |
| Phase 1 | Codebase Reconnaissance & Feature Inventory | `.positioning-audit/phase-1-codebase-inventory.md` |
| Phase 2 | Market Deep Research & Niche Segmentation | `.positioning-audit/phase-2-market-research.md` |
| Phase 3 | Priority Alignment & Buyer Evidence Gap Analysis | `.positioning-audit/phase-3-gap-analysis.md` |
| Phase 4 | Positioning Strategy & 8-Lens Scoring | `.positioning-audit/phase-4-positioning-strategy.md` |
| Phase 5 | Codebase Audit Execution (Deep) | `.positioning-audit/phase-5-codebase-audit.md` |
| Phase 6 | Remediation Roadmap & Action Lists | `.positioning-audit/phase-6-remediation-roadmap.md` |
| Master | This report | `.positioning-audit/CEIP_POSITIONING_AUDIT_2026-06-04.md` |

---

## 10. Final Verdict

**CEIP has a strong technical foundation (7.2/10 DNA) serving a well-defined, urgent, and underserved market (Alberta TIER compliance, 88/100 ICP score). The positioning is currently too broad (4.75/10) but can reach 6.75/10 in 30 days by narrowing the homepage, nav, and value language to the TIER beachhead. The path to 8.88/10 requires buyer evidence, moat deepening, and channel expansion over 180 days.**

**The #1 action: Redesign the homepage so a TIER compliance lead can answer "what is this, who is it for, and why should I care?" in 15 seconds.**

---

*Audit conducted using: Stratridge 8-Lens Positioning Audit (2026), Positioning Expert 9-Point Audit, April Dunford 5-Component Positioning, MIT Disciplined Entrepreneurship Beachhead Selection, Prospeo/GrowLeads ICP Scoring Rubric, ProductQuant Product DNA Audit, Lumni PMF Assessment Framework, and Stratridge 5-Layer Positioning Framework.*
