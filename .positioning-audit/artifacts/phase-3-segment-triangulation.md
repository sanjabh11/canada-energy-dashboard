# Phase 3 — Segment & Unmet-Need Triangulation

> **Audit ID:** ceip-v2-2026-07-13
> **Scope:** Deep
> **Date:** 2026-07-13
> **Evidence-Limited Mode:** Active

---

## Page 1 — Decision Confidence Log

### Composite Decision Confidence

| Component | Score | Max | Rationale |
|---|---|---|---|
| Evidence Quality | 22 | 30 | Market research solid (MEDIUM-HIGH). Segment scoring based on desk research + codebase evidence. No customer evidence to validate scoring. |
| Source Coverage | 17 | 25 | 5 types present. Triangulation attempted on 4 legs but customer evidence leg is empty for all segments. |
| Internal Consistency | 18 | 20 | 7-dimension scoring is internally consistent. Top 3 segments align with previous audit's beachhead selection. Negative ICP is consistent with orphan route analysis. |
| Counter-Evidence Survival | 13 | 15 | 3 counter-evidence passes from Phase 2 + 3-persona adversarial review in this phase. All survived. |
| Validation Evidence | 0 | 10 | No experiments run |
| **Composite** | **70%** | **100%** | Below 85% → CONDITIONAL GO (evidence-limited mode) |

### Iteration Count: 1

### Evidence Types Present (5 of 11 — unchanged)

No new evidence types added. Triangulation could not add customer evidence leg.

---

## Page 2 — Phase Findings with Evidence Citations

### 3a: Segment Hypothesis Generation

35 candidates from previous Phase 2 reframed as hypotheses. Top 15 carried forward for 7-dimension scoring.

### 3b: Segment Scoring (7-Dimension Model, 1-10 each)

| Rank | # | Segment | Need Intensity | Urgency | Reachability | WTP | Competition | Product Fit | Proof Avail | Total /70 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 13 | Alberta TIER facility compliance CFO memo | 9 | 9 | 8 | 8 | 9 | 9 | 3 | **55** |
| 2 | 1 | Ontario small LDC demand forecast planning | 8 | 7 | 7 | 6 | 8 | 8 | 3 | **47** |
| 3 | 8 | Utility security procurement evidence pack | 8 | 8 | 5 | 5 | 9 | 7 | 3 | **45** |
| 4 | 16 | Alberta DI compliance planning | 8 | 9 | 7 | 7 | 9 | 7 | 3 | **50** |
| 5 | 3 | Ontario mid-size LDC regulatory filing prep | 7 | 7 | 7 | 7 | 7 | 8 | 3 | **46** |
| 6 | 10 | Ontario GA/ICI 5CP decision-support | 8 | 8 | 6 | 6 | 7 | 7 | 3 | **45** |
| 7 | 14 | Alberta TIER credit banking audit | 7 | 6 | 7 | 7 | 9 | 8 | 3 | **47** |
| 8 | 21 | Alberta municipality climate tool (MCCAC) | 6 | 5 | 8 | 7 | 7 | 6 | 3 | **42** |
| 9 | 6 | Ontario LDC asset health capex justification | 6 | 5 | 6 | 6 | 7 | 7 | 3 | **40** |
| 10 | 18 | EPC/compliance advisor TIER toolset | 7 | 6 | 6 | 5 | 7 | 7 | 3 | **41** |

**Scoring notes:**
- **Proof Availability** is 3/10 for ALL segments — no buyer evidence exists for any segment [EV-013]
- **Competition** scores high (8-9) meaning LOW competition — whitespace is real
- **Need Intensity** and **Urgency** are scored from regulatory mandates and deadlines, not buyer interviews
- **WTP** is inferred from budget thresholds and pricing tiers, not buyer data

### 3c: Negative ICP Definition

**Who should NOT be targeted:**

| Negative ICP | Reason | Evidence |
|---|---|---|
| Alberta rate watchdog B2C consumers ($9/mo) | Off-USP for B2B proof-pack product; B2C wedge dilutes positioning | EV-011, EV-001 |
| Energy educators/training providers | Non-commercial, off-strategy; no compliance or planning pain | EV-009 (orphan routes) |
| Community energy co-ops | Small market, low urgency, low WTP | Previous Phase 2 scoring |
| Provincial government ministries | Long sales cycle, political, not compliance-driven | Previous Phase 2 scoring |
| School boards | Low budget, low urgency, not TIER-regulated | Previous Phase 2 scoring |
| Carbon offset project developers | Niche, low frequency, different buyer journey | Previous Phase 2 scoring |
| DER integration planners | Early market, few buyers ready, infrastructure not deployed | Previous Phase 2 scoring |

**Trap segments (high pain but no WTP or inaccessible):**

| Trap segment | Pain | Why it's a trap |
|---|---|---|
| Alberta small emitters (2K-100K tCO₂e) | TIER compliance newly required | WTP likely <$25K; may prefer manual compliance over SaaS |
| Indigenous energy planning co-design | Real energy planning need | Trust-gated, long cycle, requires relationship investment |
| Indigenous utility sovereignty vault | Data governance need | Conceptual, implementation gap, no budget allocated |

### 3d: Unmet-Need Statements (JTBD Format)

**Top 3 segments:**

| Segment | Unmet-need statement |
|---|---|
| **Alberta TIER facility compliance CFO memo** | "Alberta large emitters need to decide between TIER fund payment, market credit purchase, and direct investment pathways because each has different cost, risk, and timing implications, but current Excel-based calculations are error-prone, not source-dated, and don't produce board-ready comparison memos." |
| **Alberta DI compliance planning** | "Alberta large emitters need to evaluate the new Direct Investment pathway because the 2026 standard creates a new compliance option with different cost structures, but no tool exists that models DI sensitivity alongside fund and market credit pathways with source-dated evidence." |
| **Alberta TIER credit banking audit** | "Alberta emitters with credit holdings need to track credit lot allocation, expiry risk, and optimal use timing because credits have fiscal value and mismanagement costs money, but Excel ledgers lack audit trails and don't integrate with compliance pathway decisions." |

### 3e: Triangulation (4 Legs per Segment)

#### Segment 1: Alberta TIER Facility Compliance CFO Memo

| Leg | Evidence | Status |
|---|---|---|
| Customer evidence | None — 0 buyer interviews, 0 pilot evidence | ❌ Empty |
| Market research | TAM $188M, TIER applies to ~150 large facilities, no direct competitor | ✅ Strong |
| Product capability | TIERROICalculator (637 lines), tierPricing.ts (provenance), 3-pathway comparison, DI sensitivity, CFO memo export | ✅ Strong |
| Counter-evidence | 3 passes survived — no disconfirming evidence found | ✅ Survived |

**Triangulation result:** 3 of 4 legs support. Customer evidence leg empty. **CONDITIONAL SUPPORT.**

#### Segment 2: Alberta DI Compliance Planning

| Leg | Evidence | Status |
|---|---|---|
| Customer evidence | None | ❌ Empty |
| Market research | New 2026 DI standard creates first-mover opportunity, ~50 facilities could use DI | ✅ Moderate |
| Product capability | DI pathway implemented in TIERROICalculator, sensitivity analysis available | ✅ Strong |
| Counter-evidence | DI standard not yet released — could delay or change | ⚠️ Risk |

**Triangulation result:** 2.5 of 4 legs support. Customer evidence empty + DI standard unreleased. **CONDITIONAL SUPPORT.**

#### Segment 3: Alberta TIER Credit Banking Audit

| Leg | Evidence | Status |
|---|---|---|
| Customer evidence | None | ❌ Empty |
| Market research | ~100 facilities with credit holdings, no software competitor | ✅ Moderate |
| Product capability | Credit banking route implemented, allocation and expiry tracking | ✅ Strong |
| Counter-evidence | Targray offers trading but not audit; no disconfirming evidence | ✅ Survived |

**Triangulation result:** 3 of 4 legs support. Customer evidence empty. **CONDITIONAL SUPPORT.**

### 3f: 3-Persona Adversarial Review

#### Persona 1: The Skeptic ("Is this score inflated?")

| Challenge | Response | Score adjustment |
|---|---|---|
| "Need Intensity 9/10 for TIER CFO memo — how do you know it's that intense without talking to a buyer?" | Score is inferred from regulatory mandate (annual compliance is legally required) not buyer interview. Adjusting from 9 to 8. | Need Intensity: 9→8 |
| "WTP 8/10 — you have no sales data. Maybe they won't pay $1,500/mo." | Fair. WTP is inferred from compliance budget existence, not actual paid contracts. Adjusting from 8 to 6. | WTP: 8→6 |
| "Product Fit 9/10 — have you verified the calculator produces correct results?" | Code is implemented and source-dated, but no buyer has validated output accuracy. Adjusting from 9 to 8. | Product Fit: 9→8 |

**Adjusted score for Segment 1:** 55 → 51/70

#### Persona 2: The Missing Perspective ("What perspective is absent?")

| Challenge | Response | Score adjustment |
|---|---|---|
| "You're scoring from the seller's perspective. What about the buyer's procurement process?" | No evidence of buyer procurement process for compliance software. Alberta industrials may have existing EHS platforms (Cority, Intelex) that could absorb TIER compliance. | No score change — flagged as risk |
| "What about the consultant channel? Dunsky, ICF, GLJ serve these buyers. Could they be partners or competitors?" | Consultants are potential channel partners (they use tools to serve clients faster) but could also build their own tools. Not yet assessed. | No score change — flagged as opportunity/risk |
| "You haven't considered the Indigenous community perspective. Could there be a parallel need?" | Indigenous communities have energy planning needs but different buyer journey (trust-gated, grant-funded). Separate segment, not directly comparable. | No score change |

#### Persona 3: The Contrarian ("What if the opposite is true?")

| Challenge | Response | Score adjustment |
|---|---|---|
| "What if TIER compliance is so simple that a spreadsheet is genuinely better?" | For simple facilities (single pathway, no credits), Excel may suffice. CEIP's value is in multi-pathway comparison and source-dated evidence — only valuable for complex facilities. | Segment scope narrowed: target complex facilities (>1 pathway, credit holdings) |
| "What if the real beachhead is not TIER at all but Ontario utility forecasting?" | Ontario LDC forecast scored 47/70 (rank 2). It has regulatory mandate (OEB Chapter 5) and larger market (~60 LDCs). But WTP is lower (municipal budgets) and competition is higher (Itron, Amperon). | No score change — TIER remains #1 but ON LDC is viable alternative |
| "What if the DIY spreadsheet is actually the optimal solution and CEIP is solving a non-problem?" | Counter-evidence Pass 2 found adoption barriers are trust and change management, not lack of need. But without buyer evidence, this contrarian view cannot be fully dismissed. | Flagged as critical risk — Phase 5 validation must test this |

---

## Page 3 — Research Question Tree Update & Gap Analysis

### Coverage Status After Phase 3

| Question ID | Question | Coverage | Counter-evidence |
|---|---|---|---|
| 0L2-1a | Should CEIP narrow from 5 segments to 1 beachhead? | ✅ Covered — scoring supports narrowing to TIER | ✅ |
| 0L2-1b | What is the cost of being wrong about the beachhead? | ✅ Covered — 6-12 months misdirected effort | N/A |

### Gap Analysis for Phase 3 (8-Type Classification)

| Gap type | Description | Severity | Segment affected |
|---|---|---|---|
| **Need gap** | Cannot verify buyer need intensity without customer evidence — all need scores are inferred from regulation, not buyer interviews | Critical | All segments |
| **Product gap** | 12 orphan routes dilute positioning — product sprawl signals lack of focus | Major | All segments |
| **Proof gap** | Zero buyer proof — no pilot evidence, no testimonials, no case studies | Critical | All segments |
| **Positioning gap** | 5 segments × 10 proof packs = no beachhead focus in current positioning | Major | All segments |
| **Pricing gap** | $9/mo B2C Watchdog is off-USP; $5,900/mo Municipal is separate buyer journey | Major | Cross-segment |
| **Distribution gap** | No sales channel beyond direct outreach; no partner channel; no marketplace | Major | All segments |
| **Adoption gap** | Trust and change management identified as barriers but no mitigation tested | Major | TIER segments |
| **Evidence gap** | 0 production pilot evidence registers, 0 outreach response logs | Critical | All segments |

### Alignment Chain Trace (Preview — Full Trace in Phase 4)

| Link | TIER CFO memo | Status |
|---|---|---|
| Market Need | Alberta large emitters must comply with TIER annually | ✅ Verified (regulation) |
| Customer Outcome | CFO-ready comparison memo for pathway selection | ⚠️ Not verified by any buyer |
| Product Promise | "TIER compliance savings pack" with 3-pathway comparison | ✅ Defined in code |
| Actual Capability | TIERROICalculator with fund/market/DI comparison + export | ✅ Implemented |
| Proof | Source-dated pricing from Canada-Alberta Implementation Agreement | ⚠️ Source-dated but no buyer-validated proof |
| Positioning | "Alberta TIER proof-pack product" | ✅ Defined in COMMERCIAL_SOURCE_OF_TRUTH |
| Experiment | Not yet designed | ❌ Phase 5 |

---

## Page 4 — Gate Decision

### Pre-Gate Self-Assessment (5 Dimensions)

| Dimension | Score (1-5) | Rationale |
|---|---|---|
| Evidence Quality | 3 | Scoring based on desk research and codebase evidence. No customer evidence to validate. Adversarial review adjusted scores downward. |
| Source Coverage | 3 | 5 types present. Triangulation attempted but customer leg empty for all segments. |
| Logical Consistency | 4 | 7-dimension scoring is internally consistent. Negative ICP aligns with orphan route analysis. Adversarial review adjustments are logical. |
| Counter-Evidence | 4 | 3 Phase 2 passes + 3-persona adversarial review. All survived. Contrarian "spreadsheet is optimal" cannot be fully dismissed without buyer evidence. |
| Decision Readiness | 4 | Ready for alignment chain and hypothesis generation. Beachhead selection is well-supported by available evidence. |
| **Composite** | **18/25** | ≥18/25 threshold ✅ — but evidence-limited mode caps at CONDITIONAL GO |

### Gate 3 Decision: **CONDITIONAL GO** (Evidence-Limited Mode)

**Rationale:** Pre-gate self-assessment 18/25 ≥ 18/25 ✅. 3 segments scored on all 7 dimensions ✅. Beachhead selected (TIER CFO memo, adjusted score 51/70) ✅. Negative ICP defined ✅. Triangulation completed (3 of 4 legs support, customer leg empty) ✅. 3-persona adversarial review completed ✅. But evidence-limited mode → CONDITIONAL GO.

**Beachhead selection:** Alberta TIER Facility Compliance CFO Memo (adjusted score 51/70)
- Target: ~150 large emitter facilities (>100K tCO₂e) in Alberta
- Narrowed scope: Complex facilities with >1 pathway and/or credit holdings
- Primary buyer: Compliance/finance lead at large emitter
- #1 competitor: Spreadsheet (do nothing)
- Key risk: Zero buyer evidence — contrarian view that "spreadsheet is optimal" cannot be dismissed

**Conditions:**
1. Phase 4 must trace full alignment chain for top 3 segments
2. Phase 4 must generate 2-3 positioning hypotheses per segment
3. Phase 4 must extract load-bearing claims
4. Phase 4 approval gate will require user decision

### Exit Criteria Checklist

- [x] ≥3 segments scored on all 7 dimensions (10 scored, top 3 triangulated)
- [x] Beachhead selected (Alberta TIER CFO memo, 51/70 adjusted)
- [x] Negative ICP defined (7 non-targets + 3 trap segments)
- [x] Unmet-need statements written (JTBD format for top 3)
- [x] Triangulation completed (4 legs per segment, customer leg empty)
- [x] 3-persona adversarial review completed (The Skeptic, The Missing Perspective, The Contrarian)
- [x] Pre-gate self-assessment ≥ 18/25 (18/25)

### Adversarial Review Summary

| Persona | Challenges raised | Score adjustments | Risks flagged |
|---|---|---|---|
| The Skeptic | 3 | Need Intensity 9→8, WTP 8→6, Product Fit 9→8 | Scores inflated without buyer evidence |
| The Missing Perspective | 3 | None | Consultant channel unassessed; EHS platforms could absorb TIER |
| The Contrarian | 3 | None | Spreadsheet may be optimal for simple facilities; ON LDC is viable alternative |

### Next-Phase Skill Selection

| Phase | Skill | Re-evaluation trigger |
|---|---|---|
| 4 | ecc-plan | If hypotheses conflict → ecc-advisor for second opinion |

### State Update

```json
{
  "current_phase": 4,
  "current_gate": "CONDITIONAL_GO",
  "decision_confidence": { "composite": 70, "quality": 22, "coverage": 17, "consistency": 18, "counter": 13, "validation": 0 },
  "evidence_types_present": ["product_promise", "codebase_evidence", "competitor_intel", "stakeholder_input", "pricing_signal"],
  "evidence_limitations": ["Zero customer evidence", "All need scores inferred from regulation not buyer interviews", "WTP scores inferred from budget existence not actual paid contracts", "Contrarian 'spreadsheet is optimal' cannot be dismissed"],
  "phases_completed": [0, 1, 2, 3],
  "gates_passed": ["CONDITIONAL_GO", "CONDITIONAL_GO", "CONDITIONAL_GO", "CONDITIONAL_GO"],
  "evidence_limited_mode": true,
  "beachhead": "Alberta TIER Facility Compliance CFO Memo (adjusted 51/70)"
}
```
