# CEIP Niche Positioning Audit v2 — Master Report

> **Audit ID:** ceip-v2-2026-07-13
> **Date:** 2026-07-13
> **Scope:** Deep
> **Methodology:** ECC Niche Positioning Audit v5 (8-phase evidence-first framework)
> **Evidence-Limited Mode:** ACTIVE — No customer or commercial evidence available

---

## Executive Summary

This audit was conducted using the updated v5 methodology of the ECC Niche Positioning Audit skill, migrating from the previous 7-phase framework to the new 8-phase evidence-first framework. The audit covers the Canada Energy Intelligence Platform (CEIP), a React/TypeScript SaaS product targeting Canadian energy sector buyers.

**Key finding:** CEIP's positioning as a "Canadian utility and Alberta TIER proof-pack product" is internally consistent and well-supported by codebase evidence (HIGH grade) and market research (MEDIUM grade). The recommended beachhead — Alberta TIER Facility Compliance CFO Memo — is the strongest candidate, scoring 51/70 (adjusted) on the 7-dimension segment scoring model.

**Critical limitation:** The audit was conducted in **evidence-limited mode**. Zero customer or commercial evidence was found — no pilot evidence registers, no outreach response logs, no buyer interviews, no analytics data, no sales data. All 7 positioning hypotheses remain Unresolved. 8 validation experiments have been designed but not executed.

**Final verdict:** CONDITIONAL GO. The positioning direction is sound but unvalidated. The path to GO status requires executing experiments EXP-001 through EXP-004 to add customer evidence types and resolve the primary hypothesis H-TIER-1.

---

## Audit Methodology

### v1 → v2 Migration Summary

| Aspect | v1 (2026-06-04) | v2 (2026-07-13) |
|---|---|---|
| Phases | 7 | 8 (added Pre-execution + Validation) |
| Evidence framework | Implicit | Explicit (11 types, Evidence Corpus) |
| Gap classification | Ad hoc | 8-type taxonomy |
| Hypothesis tracking | None | 7 hypotheses with status |
| Experiments | None | 8 designed with thresholds |
| Adversarial review | 1 pass | 3-persona × 3 phases (9 reviews) |
| Confidence scoring | Single number (95%) | 5-dimension composite (79%) |
| Evidence-limited mode | Not applied | Applied |
| Persistent state | None | 5 JSON files + 8 artifacts |

### 8 Phases Completed

| Phase | Title | Gate | Confidence |
|---|---|---|---|
| 0 | Pre-execution | CONDITIONAL GO | 55% |
| 1 | Product & Evidence Reconnaissance | CONDITIONAL GO | 60% |
| 2 | Ultra-Deep Market Research | CONDITIONAL GO | 69% |
| 3 | Segment & Unmet-Need Triangulation | CONDITIONAL GO | 70% |
| 4 | Product-Market Alignment & Gap Map | CONDITIONAL GO (Approval Gate) | 72% |
| 5 | Validation Plan & Experiments | CONDITIONAL GO | 77% |
| 6 | Codebase Audit & Remediation | CONDITIONAL GO | 79% |
| 7 | Evidence Refresh & Drift Tracking | CONDITIONAL GO | 79% |

---

## Beachhead Selection

### Selected: Alberta TIER Facility Compliance CFO Memo

| Dimension | Score (/10) | Rationale |
|---|---|---|
| Need Intensity | 8 | Annual TIER compliance is legally required |
| Urgency | 9 | Annual deadline + new DI pathway (2026) |
| Reachability | 8 | ~150 facilities identifiable by emissions registry |
| WTP | 6 | Compliance budget exists but no buyer confirmed $1,500/mo |
| Competition | 9 | No direct competitor — whitespace confirmed |
| Product Fit | 8 | TIERROICalculator implemented and production-ready |
| Proof Availability | 3 | Zero buyer proof |
| **Total** | **51/70** | **Adjusted after adversarial review** |

### Target Buyer Profile

- **Who:** Compliance/finance lead at Alberta large emitter facilities (>100K tCO₂e)
- **Scope:** Complex facilities with >1 pathway and/or credit holdings (excludes majors with internal carbon trading desks)
- **Market size:** ~150 large facilities, narrowed to ~80-100 complex facilities
- **#1 competitor:** Spreadsheet (do nothing)
- **Pricing:** $1,500/mo Industrial TIER tier

### Expansion Path

TIER CFO memo → Credit banking audit → Small emitter opt-in → Ontario GA/ICI → Utility forecast

---

## Evidence Corpus Summary

### Evidence Types Present (5 of 11)

| Type | Count | Grades |
|---|---|---|
| product_promise | 4 | MEDIUM ×4 |
| codebase_evidence | 7 | HIGH ×7 |
| competitor_intel | 1 | MEDIUM ×1 |
| stakeholder_input | 2 | MEDIUM ×2 |
| pricing_signal | 1 | LOW ×1 |

### Evidence Types Missing (6 of 11 — ALL customer/commercial)

| Type | Impact |
|---|---|
| customer_outcome | Cannot verify any buyer has achieved an outcome |
| user_quote | Cannot verify buyer language or pain framing |
| behavioral_observation | Cannot verify actual usage patterns |
| support_ticket | Cannot identify friction points |
| analytics_data | Cannot verify traffic or engagement |
| sales_data | Cannot verify WTP or pipeline |

**Evidence-limited mode activated.** All gates capped at CONDITIONAL GO.

---

## Gap Map (8-Type Classification)

| Gap type | Severity | Description | Addressed by |
|---|---|---|---|
| **Need gap** | Critical | Cannot verify buyer need — all inferred from regulation | EXP-001, EXP-003 |
| **Product gap** | Major | 12 orphan routes, $9/mo B2C off-USP | P2 remediation |
| **Proof gap** | Critical | Zero buyer proof | EXP-004 (pilot) |
| **Positioning gap** | Major | 5 segments × 10 proof packs = no beachhead focus | P0 remediation |
| **Pricing gap** | Major | No WTP data, $9/mo and $5,900/mo off-beachhead | EXP-002 |
| **Distribution gap** | Major | No sales channel beyond direct outreach | EXP-005 |
| **Adoption gap** | Major | Trust/change management untested | EXP-004 |
| **Evidence gap** | Critical | 0 pilot evidence, 0 outreach responses | EXP-001 through EXP-004 |

**Total: 3 Critical, 5 Major, 0 Minor**

---

## Positioning Hypotheses

| ID | Hypothesis | Status | Priority |
|---|---|---|---|
| H-TIER-1 | Emitters pay $1,500/mo for TIER CFO memo tool | Unresolved | Primary |
| H-TIER-2 | Consultants adopt CEIP as client-serving tool ($149/mo) | Unresolved | Secondary |
| H-TIER-3 | DI standard creates urgent demand for CEIP's DI tool | Unresolved | Catalyst |
| H-DI-1 | DI standard release triggers demand spike | Unresolved | Catalyst |
| H-CREDIT-1 | Emitters pay for credit banking audit tool | Unresolved | Cross-sell |
| H-CREDIT-2 | Credit banking is natural cross-sell from CFO memo | Unresolved | Cross-sell |
| H-CONTRA-1 | Anti-spreadsheet positioning resonates more than current | Unresolved | Contrarian |

---

## Validation Experiments

8 experiments designed, 0 executed. Priority ranking (cheapest-falsification-first):

| Priority | Exp ID | Claim tested | Fidelity | Duration | Cost |
|---|---|---|---|---|---|
| 1 | EXP-001 | Emitters need 3-pathway comparison | Low | 30 days | $0 |
| 2 | EXP-002 | $1,500/mo is within budget | Medium | 14 days | $0 |
| 3 | EXP-003 | Source-dated memos valued over Excel | Medium | 14 days | $0 |
| 4 | EXP-004 | Emitter produces board-ready CFO memo | High | 2-4 weeks | $0 |
| 5 | EXP-005 | Consultants adopt CEIP | Medium | 14 days | $0 |
| 6 | EXP-006 | Credit banking demand | Low | 30 days | $0 |
| 7 | EXP-007 | DI standard triggers demand | Low | Ongoing | $0 |
| 8 | EXP-008 | Anti-spreadsheet positioning | Low | 30 days | $0 |

**Path out of evidence-limited mode:** EXP-001 → EXP-002 → EXP-003 → EXP-004. If all pass, 4 new evidence types added, evidence-limited mode deactivated, gates can reach GO.

---

## Remediation Roadmap

### P0 — Launch Blockers (Before EXP-001)

1. Create `/tier-compliance` landing page with 3-pathway comparison value prop
2. Add TIER-focused hero section on homepage

### P1 — High Priority (30-day)

1. Reorder navigation to feature TIER first
2. Feature $1,500/mo TIER tier on pricing page
3. Update `commercialPositioning.ts` to narrow primary positioning
4. Archive 28+ stale docs

### P2 — Medium Priority (90-day)

1. Remove or redirect 12 orphan route groups
2. De-emphasize $9/mo B2C Watchdog
3. Add scenario persistence to TIER calculator
4. Create `/for-consultants` page

### P3 — Low Priority (180-day)

1. Evaluate payment provider consolidation
2. Review Plausible analytics data
3. Monitor EHS platforms for TIER modules
4. Prepare DI-specific landing page

---

## Competitor Landscape

| Competitor | Lane | Foreclose risk | CEIP whitespace |
|---|---|---|---|
| Spreadsheet (do nothing) | Manual compliance | **HIGH** — #1 competitor | Automation + provenance + export |
| Orennia | Investor/developer analytics | LOW | Facility-level TIER compliance |
| cCarbon | Macro TIER supply/demand | LOW | Facility-level 3-pathway comparison |
| Targray | Carbon credit trading | LOW | Pre-trade analysis tool |
| Itron | Utility metering/AMI | LOW | Planning + filing proof packs |
| Amperon | Load forecasting (US) | MEDIUM | Canadian regulatory specificity |
| EnergyCAP | Energy accounting (US) | LOW | Forecast + filing + compliance |
| EHS platforms (Cority, Intelex) | EHS management | MEDIUM (adjacent) | TIER-specific compliance (not in EHS) |

---

## Risk Register

| Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|
| Zero buyer evidence — all hypotheses Unresolved | Critical | Certain | Execute EXP-001 through EXP-004 |
| Contrarian "spreadsheet is optimal" cannot be dismissed | Critical | Unknown | EXP-003 and EXP-004 test this directly |
| DI standard timeline could slip | Medium | Possible | EXP-007 monitors; don't block on DI |
| EHS platforms add TIER modules | Medium | Low | Monitor; CEIP's TIER specificity is defensible |
| TIER regulation changes (Dec 2026 review) | Low-Medium | Low | Alberta committed to carbon pricing |
| Consultant channel fails (H-TIER-2) | Medium | Possible | Consultant is secondary, not primary |
| Pricing too high ($1,500/mo) | Medium | Unknown | EXP-002 tests WTP directly |

---

## Audit Disclaimer

**This audit was conducted in evidence-limited mode.** No direct customer or commercial evidence was available — no buyer interviews, no pilot evidence, no outreach responses, no analytics data, no sales data. All findings are based on codebase evidence (HIGH grade), market research (MEDIUM grade), and stakeholder strategy documents (MEDIUM grade).

The 79% composite confidence score reflects the strength of available evidence but is capped at CONDITIONAL GO because 6 of 11 evidence types are missing. The previous audit's 95% confidence was overstated because it did not apply evidence-limited mode.

**This audit does not constitute market validation.** The recommended beachhead, positioning direction, and pricing model are analytically sound but empirically unverified. Execute the validation experiments before making significant commercial commitments.

---

## Artifacts Produced

| File | Phase | Description |
|---|---|---|
| `state.json` | All | Persistent audit state |
| `evidence-corpus.json` | 1 | 15 evidence items, 5 types present |
| `research-questions.json` | 0 | Research question tree |
| `hypotheses.json` | 4 | 7 hypotheses (all Unresolved) |
| `experiments.json` | 5 | 8 experiments with thresholds |
| `extras/domain-extra.md` | 0 | Canadian energy domain sources |
| `artifacts/phase-0-pre-execution.md` | 0 | Pre-execution artifact |
| `artifacts/phase-1-evidence-reconnaissance.md` | 1 | Evidence corpus + product truth |
| `artifacts/phase-2-market-research.md` | 2 | Market research + counter-evidence |
| `artifacts/phase-3-segment-triangulation.md` | 3 | Segment scoring + adversarial review |
| `artifacts/phase-4-alignment-gap-map.md` | 4 | Alignment chain + gap map + hypotheses |
| `artifacts/phase-5-validation-plan.md` | 5 | Experiment design + priority ranking |
| `artifacts/phase-6-codebase-remediation.md` | 6 | Codebase audit + remediation roadmap |
| `artifacts/phase-7-drift-tracking.md` | 7 | Drift comparison + portfolio update |
| `CEIP_POSITIONING_AUDIT_v2_2026-07-13.md` | Final | This master report |

---

## Next Steps

1. **Implement P0 remediation** — Create TIER landing page and homepage prominence (2-3 hours)
2. **Execute EXP-001** — Launch landing page test, monitor for 30 days
3. **Execute EXP-002** — Begin outreach to 20 Alberta emitter compliance leads with pricing
4. **Execute EXP-003** — Recruit 5 emitter compliance leads for interviews
5. **Review Plausible Analytics** — Check traffic and engagement data
6. **Archive stale docs** — Clean up 28+ stale documents
7. **Next audit refresh** — October 13, 2026 (90 days) or after EXP-004 completion

---

*Audit conducted using ECC Niche Positioning Audit v5 methodology. All artifacts stored in `.positioning-audit/`. Previous audit archived in `.positioning-audit/history/2026-06-04-v1/`.*
