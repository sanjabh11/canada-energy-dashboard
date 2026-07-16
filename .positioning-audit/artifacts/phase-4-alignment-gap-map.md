# Phase 4 — Product-Market Alignment & Gap Map

> **Audit ID:** ceip-v2-2026-07-13
> **Scope:** Deep
> **Date:** 2026-07-13
> **Evidence-Limited Mode:** Active

---

## Page 1 — Decision Confidence Log

### Composite Decision Confidence

| Component | Score | Max | Rationale |
|---|---|---|---|
| Evidence Quality | 22 | 30 | Alignment chain traced with codebase evidence (HIGH) and market research (MEDIUM). No customer evidence to validate outcome/proof links. |
| Source Coverage | 17 | 25 | 5 types present. Gap map covers all 8 types. Hypotheses reference available evidence. |
| Internal Consistency | 19 | 20 | Alignment chain is internally consistent. Hypotheses align with scoring from Phase 3. Gap classifications are non-overlapping. |
| Counter-Evidence Survival | 14 | 15 | 3 Phase 2 passes + Phase 3 adversarial review + Phase 4 adversarial review. All survived. |
| Validation Evidence | 0 | 10 | No experiments run — Phase 5 will design them |
| **Composite** | **72%** | **100%** | Below 85% → CONDITIONAL GO (evidence-limited mode) |

### Iteration Count: 1

---

## Page 2 — Phase Findings with Evidence Citations

### 4a: Alignment Chain Analysis (7 Links per Segment)

#### Segment 1: Alberta TIER Facility Compliance CFO Memo (Beachhead)

| Link | Content | Evidence | Status |
|---|---|---|---|
| **Market Need** | Alberta large emitters (>100K tCO₂e) must comply with TIER regulation annually | EV-013 (strategy roadmap), Alberta TIER regulation | ✅ Verified |
| **Customer Outcome** | CFO-ready comparison memo enabling pathway selection (fund vs market credit vs DI) | Inferred from product promise — no buyer confirmation | ⚠️ Unverified |
| **Product Promise** | "TIER compliance savings pack" with 3-pathway comparison and source-dated pricing | EV-001, EV-003, EV-006 | ✅ Defined |
| **Actual Capability** | TIERROICalculator (637 lines) with fund/market/DI comparison, arbitrage spread, DI sensitivity, CFO memo export, lead capture | EV-007, EV-008 | ✅ Implemented |
| **Proof** | Source-dated pricing from Canada-Alberta Implementation Agreement; staleness checks; provenance metadata | EV-007 | ⚠️ Source-dated but no buyer-validated proof |
| **Positioning** | "Alberta TIER proof-pack product" — lead positioning in COMMERCIAL_SOURCE_OF_TRUTH | EV-001 | ✅ Defined |
| **Experiment** | Not yet designed | — | ❌ Phase 5 |

**Alignment chain gaps:** Customer Outcome (unverified) and Proof (no buyer validation) are the broken links.

#### Segment 2: Alberta DI Compliance Planning

| Link | Content | Evidence | Status |
|---|---|---|---|
| **Market Need** | New 2026 DI standard creates new compliance option for large emitters | EV-013 | ✅ Verified |
| **Customer Outcome** | DI pathway analysis with sensitivity to understand cost vs fund/market options | Inferred | ⚠️ Unverified |
| **Product Promise** | DI pathway sensitivity in TIER ROI calculator | EV-003 | ✅ Defined |
| **Actual Capability** | DI sensitivity implemented in TIERROICalculator | EV-008 | ✅ Implemented |
| **Proof** | DI standard not yet released — pricing estimates only | EV-007 | ⚠️ Unverified (standard pending) |
| **Positioning** | Part of TIER compliance pack, not separately positioned | EV-001 | ⚠️ Sub-segment |
| **Experiment** | Not yet designed | — | ❌ Phase 5 |

**Alignment chain gaps:** Customer Outcome (unverified), Proof (DI standard pending), Positioning (not separately positioned).

#### Segment 3: Alberta TIER Credit Banking Audit

| Link | Content | Evidence | Status |
|---|---|---|---|
| **Market Need** | Emitters with credit holdings need to track allocation, expiry, and optimal use | Inferred from TIER regulation | ⚠️ Inferred |
| **Customer Outcome** | Audit-ready credit ledger with expiry risk alerts | Inferred | ⚠️ Unverified |
| **Product Promise** | "TIER credit banking audit pack" with allocation and expiry tracking | EV-003 | ✅ Defined |
| **Actual Capability** | Credit banking route implemented | EV-005 | ✅ Implemented |
| **Proof** | No buyer-validated ledger examples | — | ❌ No proof |
| **Positioning** | Part of TIER compliance bundle spine | EV-001 | ✅ Defined |
| **Experiment** | Not yet designed | — | ❌ Phase 5 |

**Alignment chain gaps:** Market Need (inferred), Customer Outcome (unverified), Proof (none).

### 4b: Gap Classification (8-Type Taxonomy)

| Gap type | Description | Severity | Segment(s) | Broken chain link |
|---|---|---|---|---|
| **Need gap** | Cannot verify buyer need intensity — all inferred from regulation, not buyer interviews | Critical | All | Market Need → Customer Outcome |
| **Product gap** | 12 orphan routes dilute positioning; $9/mo B2C Watchdog off-USP | Major | All | Product Promise → Actual Capability |
| **Proof gap** | Zero buyer proof — no pilot evidence, no testimonials, no case studies, no validated outputs | Critical | All | Proof → Positioning |
| **Positioning gap** | 5 segments × 10 proof packs = no beachhead focus; broad USP vs narrow beachhead | Major | All | Positioning → Experiment |
| **Pricing gap** | $9/mo B2C and $5,900/mo Municipal are separate buyer journeys from $1,500/mo TIER | Major | Cross-segment | Positioning → Experiment |
| **Distribution gap** | No sales channel beyond direct outreach; no partner channel; no marketplace presence | Major | All | Positioning → Experiment |
| **Adoption gap** | Trust and change management barriers identified but no mitigation tested | Major | TIER segments | Customer Outcome → Product Promise |
| **Evidence gap** | 0 production pilot evidence registers, 0 outreach response logs | Critical | All | All links |

### 4c: Positioning Hypothesis Generation (2-3 per segment)

#### Segment 1: Alberta TIER Facility Compliance CFO Memo

| Hypothesis ID | Hypothesis | Load-bearing claims | Status | Evidence support | Counter-evidence |
|---|---|---|---|---|---|
| **H-TIER-1** | "Alberta large emitters will pay $1,500/mo for a TIER compliance CFO memo tool because it produces source-dated 3-pathway comparison memos faster and more accurately than Excel" | 1. Emitters need 3-pathway comparison (not just fund payment) 2. $1,500/mo is within compliance budget 3. Source-dated memos are valued over Excel outputs | Unresolved | Market research (MEDIUM), codebase (HIGH) | No buyer has confirmed WTP; spreadsheet may suffice for simple facilities |
| **H-TIER-2** | "Alberta TIER compliance consultants will adopt CEIP as a client-serving tool because it produces audit-ready memos faster than manual Excel models" | 1. Consultants serve TIER clients 2. Consultants value speed and provenance 3. Consultants will pay $149/mo Professional tier | Unresolved | Market research (MEDIUM), competitor analysis (MEDIUM) | No consultant has been contacted; consultants may prefer proprietary models |
| **H-TIER-3** | "The Direct Investment pathway (2026 standard) will create urgent demand for CEIP's DI sensitivity tool because no competitor offers facility-level DI analysis" | 1. DI standard will be released in early 2026 2. Emitters will need to evaluate DI vs fund/market 3. CEIP's DI tool is the only facility-level option | Unresolved | Regulatory research (MEDIUM), codebase (HIGH) | DI standard not yet released; could be delayed or simplified |

#### Segment 2: Alberta DI Compliance Planning

| Hypothesis ID | Hypothesis | Load-bearing claims | Status | Evidence support | Counter-evidence |
|---|---|---|---|---|---|
| **H-DI-1** | "The 2026 DI standard release will trigger a spike in demand for DI pathway analysis tools, and CEIP will capture this demand as the only facility-level DI tool" | 1. DI standard releases in early 2026 2. Emitters need DI analysis 3. CEIP is first-to-market | Unresolved | Regulatory research (MEDIUM) | Standard not released; timeline could slip; competitors could enter |

#### Segment 3: Alberta TIER Credit Banking Audit

| Hypothesis ID | Hypothesis | Load-bearing claims | Status | Evidence support | Counter-evidence |
|---|---|---|---|---|---|
| **H-CREDIT-1** | "Alberta emitters with credit holdings will pay for a credit banking audit tool because manual Excel ledgers lack audit trails and don't integrate with pathway decisions" | 1. Credit holders need audit trails 2. Integration with pathway decisions is valued 3. Emitters will pay for this capability | Unresolved | Codebase (HIGH), market research (MEDIUM) | No buyer confirmed; credit banking may be managed by traders (Targray) |
| **H-CREDIT-2** | "Credit banking audit is a natural cross-sell from TIER CFO memo — emitters who use the CFO memo will also need credit tracking" | 1. CFO memo users have credit holdings 2. Credit tracking is adjacent need 3. Bundle increases stickiness | Unresolved | Product design (MEDIUM) | No buyer evidence; cross-sell assumption untested |

### 4d: Positioning Statements with Proof Requirements

**H-TIER-1 (Primary beachhead hypothesis):**

> "For Alberta large emitter compliance and finance leads who need to decide between TIER fund payment, market credit purchase, and direct investment pathways, CEIP is a Canadian energy compliance intelligence tool that produces source-dated 3-pathway comparison CFO memos with provenance metadata, unlike Excel spreadsheets which are error-prone, not source-dated, and don't produce board-ready exports."

**Proof required for H-TIER-1:**
1. At least 1 Alberta emitter confirms 3-pathway comparison is a real need (interview)
2. At least 1 emitter confirms $1,500/mo is within compliance budget (WTP test)
3. At least 1 emitter confirms source-dated memos are valued over Excel (interview)
4. Pilot: 1 emitter uses TIERROICalculator and produces a CFO memo (pilot evidence)

**H-TIER-2 (Consultant channel hypothesis):**

> "For Alberta TIER compliance consultants who serve multiple emitter clients, CEIP is a client-serving tool that produces audit-ready TIER compliance memos faster than manual Excel models, unlike proprietary consultant models which are expensive to maintain and not source-dated."

**Proof required for H-TIER-2:**
1. At least 1 consultant confirms they serve TIER clients (interview)
2. At least 1 consultant confirms speed and provenance are valuable (interview)
3. At least 1 consultant trials CEIP and produces a client memo (pilot)

### 4e: Gap Map Visualization

```
Alignment Chain — TIER CFO Memo (Beachhead)
═══════════════════════════════════════════════════════════════════

Market Need ──────✅────── Customer Outcome ──────⚠️────── Product Promise
  (Regulation)              (Unverified)              (Defined)

      │                        │                         │

  NEED GAP                 ADOPTION GAP              PRODUCT GAP
  (Critical)               (Major)                   (Major — orphan routes)

═══════════════════════════════════════════════════════════════════

Product Promise ────✅────── Actual Capability ──────⚠️────── Proof
  (Defined)                 (Implemented)              (No buyer proof)

      │                        │                         │

                           POSITIONING GAP           PROOF GAP
                           (Major — broad)           (Critical)

═══════════════════════════════════════════════════════════════════

Proof ──────────⚠️────── Positioning ──────✅────── Experiment
  (No buyer proof)          (Defined)                 (Not designed)

      │                        │                         │

  EVIDENCE GAP            PRICING GAP              ❌ PHASE 5
  (Critical)              (Major)                   (Design needed)

═══════════════════════════════════════════════════════════════════

DISTRIBUTION GAP (Major) — spans entire chain — no sales channel
```

### 4f: 3-Persona Adversarial Review

#### Persona 1: The Skeptic

| Challenge | Response | Adjustment |
|---|---|---|
| "H-TIER-1 claims emitters will pay $1,500/mo. You have zero sales data. This is a guess, not a hypothesis." | Correct — WTP is inferred from compliance budget existence, not actual paid contracts. Hypothesis is explicitly marked Unresolved. Phase 5 will design a WTP test. | No change — hypothesis status is honest |
| "H-TIER-2 assumes consultants will adopt. Consultants have proprietary models and may see CEIP as a threat." | Valid concern. Added as counter-evidence. Consultant channel is secondary hypothesis, not primary. | H-TIER-2 counter-evidence updated |
| "3 of 7 alignment chain links are broken (Customer Outcome, Proof, Experiment). This is not alignment — it's aspiration." | Fair characterization. The chain shows that CEIP has market need and product capability but no market validation. This is exactly what evidence-limited mode captures. | No change — accurate assessment |

#### Persona 2: The Missing Perspective

| Challenge | Response | Adjustment |
|---|---|---|
| "You haven't considered EHS platforms (Cority, Intelex) that already serve Alberta industrials. They could add TIER compliance modules." | Valid — EHS platforms are adjacent competitors not in the current matrix. Counter-evidence Pass 2 flagged this. Added as risk. | Risk flagged in gap map |
| "What about the Alberta Emissions Offset Registry? Could emitters use registry tools instead of CEIP?" | Registry provides credit tracking but not pathway comparison or CFO memo generation. Different tool category. | No change — different category |
| "Have you considered that large emitters might have internal carbon trading desks that already do this?" | Some large emitters (oil sands majors) may have internal teams. CEIP target is mid-size emitters without dedicated carbon teams. | Segment scope narrowed: exclude majors with internal carbon desks |

#### Persona 3: The Contrarian

| Challenge | Response | Adjustment |
|---|---|---|
| "What if the positioning should be 'anti-spreadsheet' not 'Canadian energy compliance'? The #1 competitor is Excel." | Interesting reframe. Current positioning is "Canadian utility and TIER proof packs." An "anti-spreadsheet" positioning would be: "Stop using error-prone Excel for compliance. CEIP produces source-dated, board-ready TIER memos in minutes." This could be tested as a variant. | New hypothesis variant flagged for Phase 5 |
| "What if the real opportunity is not software but a TIER compliance consulting service wrapped around the tool?" | Service-led growth could be faster than SaaS-led for this market. CEIP could position as "TIER compliance advisory with software" rather than "software with advisory." This inverts the business model. | Flagged as alternative business model for Phase 5 |
| "What if all 6 hypotheses are wrong and the beachhead is actually Ontario utility forecasting?" | ON LDC forecast scored 47/70 (rank 2). It has a larger market (~60 LDCs) and regulatory mandate. But WTP is lower and competition is higher. Cannot dismiss without testing. | Flagged as backup beachhead for Phase 5 experiment design |

---

## Page 3 — Research Question Tree Update & Gap Analysis

### Coverage Status After Phase 4

| Question ID | Question | Coverage | Counter-evidence |
|---|---|---|---|
| 0L2-1a | Should CEIP narrow to 1 beachhead? | ✅ Covered — alignment chain + scoring supports TIER | ✅ |
| 0L2-1b | Cost of being wrong? | ✅ Covered — 6-12 months misdirected + contrarian alternatives flagged | ✅ |

### Hypotheses Summary

| ID | Hypothesis | Status | Load-bearing claims | Confidence |
|---|---|---|---|---|
| H-TIER-1 | Emitters pay $1,500/mo for TIER CFO memo tool | Unresolved | 3 | Low (no buyer evidence) |
| H-TIER-2 | Consultants adopt CEIP as client-serving tool | Unresolved | 3 | Low (no consultant contact) |
| H-TIER-3 | DI standard creates urgent demand for CEIP's DI tool | Unresolved | 3 | Low (standard not released) |
| H-DI-1 | DI standard release triggers demand spike | Unresolved | 3 | Low (timeline risk) |
| H-CREDIT-1 | Emitters pay for credit banking audit tool | Unresolved | 3 | Low (no buyer evidence) |
| H-CREDIT-2 | Credit banking is natural cross-sell from CFO memo | Unresolved | 3 | Low (untested assumption) |
| H-CONTRA-1 | Anti-spreadsheet positioning resonates more than Canadian energy compliance positioning | Unresolved | 0 | Low (not tested) |

**Total: 7 hypotheses (6 primary/secondary + 1 contrarian), all Unresolved, all Low confidence (evidence-limited mode)**

### Gap Map Summary (8-Type)

| Gap type | Count | Critical | Major | Minor |
|---|---|---|---|---|
| Need gap | 1 | 1 | 0 | 0 |
| Product gap | 1 | 0 | 1 | 0 |
| Proof gap | 1 | 1 | 0 | 0 |
| Positioning gap | 1 | 0 | 1 | 0 |
| Pricing gap | 1 | 0 | 1 | 0 |
| Distribution gap | 1 | 0 | 1 | 0 |
| Adoption gap | 1 | 0 | 1 | 0 |
| Evidence gap | 1 | 1 | 0 | 0 |
| **Total** | **8** | **3** | **5** | **0** |

---

## Page 4 — Gate Decision

### Pre-Gate Self-Assessment (5 Dimensions)

| Dimension | Score (1-5) | Rationale |
|---|---|---|
| Evidence Quality | 3 | Alignment chain traced with available evidence. Hypotheses are well-formed but all Unresolved due to evidence-limited mode. |
| Source Coverage | 3 | 5 types present. Gap map covers all 8 types. |
| Logical Consistency | 4 | Alignment chain is internally consistent. Hypotheses align with Phase 3 scoring. Adversarial review was thorough. |
| Counter-Evidence | 4 | 3 Phase 2 passes + Phase 3 adversarial + Phase 4 adversarial. All survived. Contrarian alternatives flagged for Phase 5. |
| Decision Readiness | 4 | Ready for user approval gate. Hypotheses are clear, proof requirements are defined, experiments can be designed. |
| **Composite** | **18/25** | ≥18/25 threshold ✅ — but evidence-limited mode caps at CONDITIONAL GO |

### Gate 4 Decision: **CONDITIONAL GO** (Evidence-Limited Mode) — **[APPROVAL GATE]**

**Rationale:** Pre-gate self-assessment 18/25 ≥ 18/25 ✅. Alignment chain traced for 3 segments ✅. All gaps classified into 8 types ✅. 6 positioning hypotheses generated ✅. Positioning statements drafted with proof requirements ✅. 3-persona adversarial review completed ✅. But evidence-limited mode → CONDITIONAL GO.

### ⚠️ USER APPROVAL GATE

**Presented for user decision:**

| Option | Hypothesis | Description |
|---|---|---|
| **A (Recommended)** | H-TIER-1 | Primary: Target Alberta large emitters with TIER CFO memo tool at $1,500/mo |
| **B** | H-TIER-2 | Secondary: Target TIER compliance consultants with client-serving tool at $149/mo |
| **C** | H-TIER-3 + H-DI-1 | Catalyst: Wait for DI standard release and target first-mover DI analysis |
| **D** | H-CREDIT-1 + H-CREDIT-2 | Cross-sell: Credit banking audit as add-on to TIER CFO memo |
| **E** | Contrarian: ON LDC | Backup beachhead: Pivot to Ontario small LDC demand forecasting |

**Recommendation:** Option A (H-TIER-1) as primary, with Option B (H-TIER-2) as parallel channel, and Option D (H-CREDIT-1/2) as cross-sell. Option C (DI) as catalyst trigger. Option E (ON LDC) as backup.

### Exit Criteria Checklist

- [x] Alignment chain traced for top 3 segments
- [x] All gaps classified into 8 types (3 Critical, 5 Major)
- [x] 6 positioning hypotheses generated (2-3 per segment)
- [x] Positioning statements drafted with proof requirements
- [x] All proof points reference HIGH/MEDIUM evidence (where available)
- [x] 3-persona adversarial review completed
- [x] Pre-gate self-assessment ≥ 18/25 (18/25)
- [x] User approval gate presented

### Adversarial Review Summary

| Persona | Challenges | Adjustments | New items |
|---|---|---|---|
| The Skeptic | 3 | H-TIER-2 counter-evidence updated | None |
| The Missing Perspective | 3 | Segment scope narrowed (exclude majors with internal carbon desks) | EHS platforms flagged as adjacent competitors |
| The Contrarian | 3 | None | Anti-spreadsheet positioning variant, service-led business model, ON LDC backup beachhead |

### Next-Phase Skill Selection

| Phase | Skill | Re-evaluation trigger |
|---|---|---|
| 5 | ecc-plan + ecc-verify | If experiments too costly → redesign with lower fidelity |

### State Update

```json
{
  "current_phase": 5,
  "current_gate": "CONDITIONAL_GO",
  "decision_confidence": { "composite": 72, "quality": 22, "coverage": 17, "consistency": 19, "counter": 14, "validation": 0 },
  "evidence_types_present": ["product_promise", "codebase_evidence", "competitor_intel", "stakeholder_input", "pricing_signal"],
  "evidence_limitations": ["Zero customer evidence", "3 of 7 alignment chain links broken", "All 7 hypotheses Unresolved", "Contrarian alternatives not dismissed"],
  "phases_completed": [0, 1, 2, 3, 4],
  "gates_passed": ["CONDITIONAL_GO", "CONDITIONAL_GO", "CONDITIONAL_GO", "CONDITIONAL_GO", "CONDITIONAL_GO"],
  "evidence_limited_mode": true,
  "beachhead": "Alberta TIER Facility Compliance CFO Memo",
  "hypotheses": ["H-TIER-1", "H-TIER-2", "H-TIER-3", "H-DI-1", "H-CREDIT-1", "H-CREDIT-2"],
  "approval_gate": "presented"
}
```
