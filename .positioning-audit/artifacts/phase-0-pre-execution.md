# Phase 0 — Pre-Execution Protocol

> **Audit ID:** ceip-v2-2026-07-13
> **Scope:** Deep
> **Date:** 2026-07-13

---

## Page 1 — Decision Confidence Log

### Composite Decision Confidence

| Component | Score | Max | Rationale |
|---|---|---|---|
| Evidence Quality | 18 | 30 | Codebase evidence is HIGH (verified by code reading); market research is MEDIUM (secondary sources); no customer evidence (LOW/absent) |
| Source Coverage | 15 | 25 | 4 source types present: codebase_evidence, product_promise, competitor_intel, stakeholder_input. Missing: customer_outcome, user_quote, behavioral_observation, support_ticket, analytics_data, sales_data, pricing_signal |
| Internal Consistency | 16 | 20 | Codebase findings are internally consistent. Strategy docs (COMMERCIAL_SOURCE_OF_TRUTH, Top20) are consistent with code. But 28+ stale docs create minor tensions. |
| Counter-Evidence Survival | 8 | 15 | 1 counter-evidence pass completed in previous audit (adversarial USP analysis). 2 more passes needed for deep scope. |
| Validation Evidence | 0 | 10 | No experiments run, no buyer validation |
| **Composite** | **57%** | **100%** | Below 85% GO threshold → CONDITIONAL GO at this stage (expected for Phase 0) |

### Iteration Count: 1

### Evidence Types Present

| Type | Present? | Grade | Source |
|---|---|---|---|
| `product_promise` | ✅ | MEDIUM | `COMMERCIAL_SOURCE_OF_TRUTH.md`, `Top20.md`, `CommercialLandingPage.tsx`, `commercialPositioning.ts` |
| `codebase_evidence` | ✅ | HIGH | `App.tsx` (73 routes), `tierPricing.ts` (provenance), `proof-pack-routes.mjs` (claim boundaries), `TIERROICalculator.tsx` (637 lines) |
| `competitor_intel` | ✅ | MEDIUM | Previous Phase 2 competitor matrix (Orennia, cCarbon, Targray, Itron, Amperon) |
| `stakeholder_input` | ✅ | MEDIUM | `CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md`, `ADVERSARIAL_USP_ANALYSIS.md` |
| `pricing_signal` | ⚠️ Partial | LOW | Pricing tiers defined in code ($9-$5,900/mo) but no buyer WTP data |
| `customer_outcome` | ❌ | — | No buyer has used CEIP to achieve an outcome |
| `user_quote` | ❌ | — | No user interviews or feedback collected |
| `behavioral_observation` | ❌ | — | No analytics, telemetry, or session recordings |
| `support_ticket` | ❌ | — | No support data |
| `analytics_data` | ❌ | — | Plausible Analytics installed but no data reviewed |
| `sales_data` | ❌ | — | No sales pipeline, conversion rates, or win/loss analysis |

### Evidence Limitations

1. **No customer or commercial evidence** — 0 of 7 customer/commercial evidence types present. This triggers **evidence-limited mode** at Gate 1.
2. **No behavioral data reviewed** — Plausible Analytics is installed but data has not been examined for this audit.
3. **Pricing is theoretical** — Tiers are defined in code but no buyer has paid or expressed WTP.
4. **Competitor intelligence is desk-research only** — No competitor product trials, no competitor customer interviews.
5. **Counter-evidence search incomplete** — Only 1 of 3 required passes completed for deep scope.

---

## Page 2 — Phase Findings with Evidence Citations

### 0a: Product-Market Decision Framing

**Decision being informed:** Should CEIP narrow from its current broad "10 proof packs across 5 segments" positioning to a single beachhead market, and if so, which one?

**Specific unknowns that would change positioning:**
1. Which segment has the highest need intensity × urgency × WTP?
2. Does the codebase actually support the beachhead's required capabilities?
3. What is the #1 competitor for the beachhead (software or spreadsheet)?
4. What evidence would a beachhead buyer need to trust CEIP?
5. What price would a beachhead buyer pay, and through what buying process?

**Evidence needed for 95% confidence:**
- At least 1 HIGH-grade customer evidence item (interview, pilot, or paid trial)
- 3+ counter-evidence passes surviving disconfirmation
- 5+ source types in the evidence corpus
- Validation experiment designed for the top hypothesis

**Cost of being wrong:**
- Wrong segment → 6-12 months of misdirected product development and outreach
- Wrong positioning → buyer confusion, no conversion, continued 0% market confidence
- Wrong price → either leaving money on table or pricing above WTP

### 0b: Evidence Requirements Definition

| Evidence type needed | Available? | Gap | Risk if missing |
|---|---|---|---|
| Customer outcome | ❌ | No buyer has used CEIP | Cannot validate product-market fit |
| User quote | ❌ | No interviews conducted | Cannot verify buyer language |
| Behavioral observation | ❌ | No analytics reviewed | Cannot verify actual usage patterns |
| Sales data | ❌ | No sales pipeline | Cannot verify WTP |
| Product promise | ✅ | Available from docs and code | — |
| Codebase evidence | ✅ | Available from code reading | — |
| Competitor intel | ⚠️ Partial | Desk research only | May miss competitor moves |
| Pricing signal | ⚠️ Partial | Tiers defined, no buyer data | May misprice |

**Counter-evidence to search for:**
- "Why TIER compliance software fails"
- "Alberta industrial emitters prefer spreadsheets"
- "SaaS compliance tools don't work for TIER"
- "Orennia cCarbon Targray better than CEIP"
- Negative reviews of similar compliance tools

### 0c: Research Question Tree

Stored in `research-questions.json`. Root question: "Is CEIP's current positioning the optimal strategic direction, or should it narrow to a specific beachhead?"

5 Level-1 questions, each with 2-3 Level-2 sub-questions. Depth: 4 levels (deep scope). Coverage: all uncovered. Counter-evidence: not searched.

### 0d: Per-Phase Skill Selection

| Phase | Selected skill | Rationale | Re-evaluation trigger |
|---|---|---|---|
| 1 | Manual evidence assembly + codebase-onboarding | Codebase present → inventory capabilities; but primary task is Evidence Corpus assembly | If customer evidence found → add interview synthesis |
| 2 | deep-research + market-research | Market sizing, competitor analysis, counter-evidence search | If new competitors discovered → add competitor-extra |
| 3 | market-research + deep-research | Segment scoring, triangulation, negative ICP | If segments fail triangulation → re-research |
| 4 | ecc-plan | Alignment chain, gap classification, hypothesis generation | If hypotheses conflict → ecc-advisor for second opinion |
| 5 | ecc-plan + ecc-verify | Experiment design, validation plan | If experiments too costly → redesign with lower fidelity |
| 6 | codebase-onboarding | Positioning-to-implementation gap audit | If no codebase → skip |
| 7 | ecc-verify | Drift tracking, hypothesis status update | If no previous audit → skip drift comparison (but we have one) |

### 0e: Execution Visualization

**Likely trouble spots:**
1. Phase 1: Evidence corpus will be thin — 0 customer evidence → evidence-limited mode
2. Phase 3: Segment triangulation may fail on "customer evidence" leg for all segments
3. Phase 5: Validation experiments cannot be run within audit timeframe → experiments designed but not executed

**Recycling paths:**
- If Phase 2 finds no viable segments → recycle to Phase 1 for broader evidence gathering
- If Phase 3 triangulation fails for all segments → recycle to Phase 2 for new segment hypotheses
- If Phase 4 hypotheses all fail adversarial review → recycle to Phase 3 for new segments

**Time estimates:**
- Phase 0: 30 min ✅ (completing now)
- Phase 1: 45 min
- Phase 2: 30 min (reusing previous market research)
- Phase 3: 45 min
- Phase 4: 45 min
- Phase 5: 30 min
- Phase 6: 20 min (reusing previous codebase audit)
- Phase 7: 30 min

### 0f: Plan Refinement

- **Scope adjustment:** None needed — deep scope is appropriate
- **Thin-evidence areas:** Customer evidence is completely absent. Plan for evidence-limited mode throughout. Phase 5 validation experiments become the critical path out of evidence-limited mode.
- **Stop conditions:**
  1. If codebase is fundamentally incompatible with beachhead positioning → STOP
  2. If no segment scores above 5/10 on need intensity → STOP
  3. If all positioning hypotheses fail adversarial review → RECYCLE to Phase 3

### 0g: Confidence Baseline

- **Starting confidence:** 0% — no evidence gathered yet
- **95% target definition:** At least 1 HIGH-grade customer evidence + 3 counter-evidence passes survived + 5+ source types + validation experiment designed
- **RECYCLE trigger:** Confidence < 60% of target at any gate
- **STOP trigger:** Confidence < 40% OR fundamental assumption disproven

---

## Page 3 — Research Question Tree Update

### Coverage Status After Phase 0

| Question ID | Question | Coverage | Counter-evidence |
|---|---|---|---|
| 0L1-1 | What product-market decision is this audit informing? | ✅ Covered (0a) | Not needed (framing question) |
| 0L1-2 | What evidence is available vs missing? | ✅ Covered (0b) | Not needed (inventory question) |
| 0L1-3 | What counter-evidence would disconfirm? | ⚠️ Partial (listed, not yet searched) | Not searched |
| 0L1-4 | What stop conditions should trigger aborting? | ✅ Covered (0f) | Not needed (process question) |
| 0L1-5 | What would 95% confidence look like? | ✅ Covered (0g) | Not needed (target question) |

### New Sub-Questions Generated

| ID | Question | Phase to address |
|---|---|---|
| 0L2-1a | Should CEIP narrow from 5 segments to 1 beachhead? | Phase 3 |
| 0L2-1b | What is the cost of being wrong about the beachhead? | Phase 4 |
| 0L2-2a | What customer/commercial evidence exists? | Phase 1 |
| 0L2-2b | What codebase evidence exists? | Phase 1 |
| 0L2-2c | What market research evidence exists? | Phase 2 |
| 0L2-3a | Is there evidence that TIER compliance software is a bad category? | Phase 2 |
| 0L2-3b | Is there evidence that Alberta industrials won't buy SaaS compliance tools? | Phase 2 |

### Gap Analysis for Phase 0

| Gap type | Description | Severity |
|---|---|---|
| Evidence gap | No customer evidence available — cannot determine if positioning matches buyer needs | Critical |
| Evidence gap | No behavioral data reviewed — cannot verify actual usage patterns | Major |
| Evidence gap | No sales data — cannot verify WTP | Major |

---

## Page 4 — Gate Decision

### Pre-Gate Self-Assessment (5 Dimensions)

| Dimension | Score (1-5) | Rationale |
|---|---|---|
| Evidence Quality | 3 | Mix of MEDIUM (docs, market research) and LOW (no customer evidence). Codebase evidence is HIGH but is only 1 type. |
| Source Coverage | 3 | 4 source types present (product_promise, codebase_evidence, competitor_intel, stakeholder_input). Target is 5+. |
| Logical Consistency | 4 | No contradictions in available evidence. Strategy docs are consistent with code. Minor tensions from stale docs. |
| Counter-Evidence | 2 | Only 1 pass completed. 2 more needed for deep scope. |
| Decision Readiness | 4 | Ready to proceed with framing complete. Evidence-limited mode expected. |
| **Composite** | **16/25** | ≥18/25 threshold for deep scope — **CONDITIONAL GO** (below threshold by 2 points) |

### Gate 0 Decision: **CONDITIONAL GO**

**Rationale:** Composite 16/25 is below the 18/25 threshold for deep scope. However, the 2-point gap is due to counter-evidence search being incomplete (will be addressed in Phase 2) and source coverage being 4 instead of 5+ (will be addressed in Phase 1). The framing, evidence requirements, research question tree, and execution plan are all complete. Proceeding with documented limitations.

**Conditions:**
1. Counter-evidence search must complete 3 passes by end of Phase 2
2. Source coverage must reach 5+ types by end of Phase 1
3. Evidence-limited mode will be activated at Gate 1 if no customer evidence is found

### Exit Criteria Checklist

- [x] Product-market decision is explicitly framed
- [x] Evidence requirements are defined with available/missing marked
- [x] Research question tree is constructed to appropriate depth (4 levels)
- [x] Per-phase skill selection is completed
- [x] Execution is visualized with risk points identified
- [x] Stop conditions are defined
- [x] Confidence baseline is set with 95% target defined
- [ ] Pre-gate self-assessment composite ≥ 18/25 (16/25 — CONDITIONAL GO)

### Adversarial Review (Not required for Phase 0 — mandatory from Phase 3)

### Next-Phase Skill Selection

| Phase | Skill | Re-evaluation trigger |
|---|---|---|
| 1 | Manual evidence assembly + codebase-onboarding | If customer evidence found → add interview synthesis |

### State Update

```json
{
  "current_phase": 1,
  "current_gate": "CONDITIONAL_GO",
  "decision_confidence": { "composite": 57, "quality": 18, "coverage": 15, "consistency": 16, "counter": 8, "validation": 0 },
  "evidence_types_present": ["product_promise", "codebase_evidence", "competitor_intel", "stakeholder_input"],
  "evidence_limitations": ["No customer evidence", "No behavioral data", "No sales data", "Counter-evidence incomplete"],
  "phases_completed": [0],
  "gates_passed": ["CONDITIONAL_GO"],
  "evidence_limited_mode": false
}
```
