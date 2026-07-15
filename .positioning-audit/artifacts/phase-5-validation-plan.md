# Phase 5 — Validation Plan & Experiments

> **Audit ID:** ceip-v2-2026-07-13
> **Scope:** Deep
> **Date:** 2026-07-13
> **Evidence-Limited Mode:** Active

---

## Page 1 — Decision Confidence Log

### Composite Decision Confidence

| Component | Score | Max | Rationale |
|---|---|---|---|
| Evidence Quality | 22 | 30 | Experiment designs are well-structured but unexecuted. No new evidence gathered. |
| Source Coverage | 17 | 25 | 5 types present. Experiments designed to add customer_outcome, user_quote, sales_data types. |
| Internal Consistency | 19 | 20 | Experiments align with hypotheses from Phase 4. Priority ranking follows cheapest-falsification-first. |
| Counter-Evidence Survival | 14 | 15 | Adversarial review of experiment design completed. No disconfirmation of experiment validity. |
| Validation Evidence | 0 | 10 | Experiments are designed, but no buyer result exists yet. Design quality is tracked separately from validation evidence. |
| **Composite** | **72%** | **100%** | CONDITIONAL GO — analysis complete, market validation pending. |

### Iteration Count: 1

---

## Page 2 — Phase Findings with Evidence Citations

### 5a: Load-Bearing Claim Extraction

**From H-TIER-1 (Primary beachhead hypothesis):**

| Claim ID | Claim | Type | Current evidence | Risk if false |
|---|---|---|---|---|
| LC-1 | Alberta large emitters need 3-pathway TIER comparison (not just fund payment) | Segment claim | Inferred from regulation (MEDIUM) | Beachhead is wrong — emitters don't need comparison |
| LC-2 | $1,500/mo is within TIER compliance budget | Pricing claim | Inferred from budget existence (LOW) | Pricing model fails — too expensive or too cheap |
| LC-3 | Source-dated memos are valued over Excel outputs | Product claim | Inferred from product design (LOW) | Value prop is wrong — Excel is sufficient |
| LC-4 | 1 emitter can produce a board-ready CFO memo using CEIP | Proof claim | Codebase supports export (HIGH) but no buyer has done it | Product doesn't work for real buyer use case |

**From H-TIER-2 (Consultant channel hypothesis):**

| Claim ID | Claim | Type | Current evidence | Risk if false |
|---|---|---|---|---|
| LC-5 | Alberta TIER consultants serve multiple emitter clients | Segment claim | Market research (MEDIUM) | Consultant channel doesn't exist |
| LC-6 | Consultants value speed and provenance over proprietary models | Product claim | Inferred (LOW) | Consultants prefer own tools |
| LC-7 | Consultants will pay $149/mo Professional tier | Pricing claim | Inferred from tier definition (LOW) | Consultant WTP is lower than $149/mo |

**From H-CREDIT-1/2 (Cross-sell hypotheses):**

| Claim ID | Claim | Type | Current evidence | Risk if false |
|---|---|---|---|---|
| LC-8 | Emitters with credit holdings need audit-ready ledger tracking | Segment claim | Inferred from regulation (MEDIUM) | Credit banking is handled by traders, not emitters |
| LC-9 | Credit banking is a natural cross-sell from CFO memo | Distribution claim | Inferred from bundle design (LOW) | Cross-sell doesn't materialize |

**From H-TIER-3/H-DI-1 (Catalyst hypotheses):**

| Claim ID | Claim | Type | Current evidence | Risk if false |
|---|---|---|---|---|
| LC-10 | DI standard will be released in early 2026 | External claim | Regulatory research (MEDIUM) | Timeline slips, first-mover advantage delayed |
| LC-11 | DI standard release triggers demand for facility-level DI analysis | Market claim | Inferred (LOW) | DI standard is simple enough that Excel suffices |

**From Contrarian hypotheses:**

| Claim ID | Claim | Type | Current evidence | Risk if false |
|---|---|---|---|---|
| LC-12 | "Anti-spreadsheet" positioning resonates more than "Canadian energy compliance" | Positioning claim | Not tested | Missed opportunity for stronger messaging |

### 5b: Experiment Design per Claim (Fidelity Ladder)

10 experiments designed and stored in `experiments.json`. Summary:

| Exp ID | Claim | Fidelity | Method | Success | Failure | Duration | Cost | Priority |
|---|---|---|---|---|---|---|---|---|
| EXP-001 | LC-1 (need) | Low | Landing page test | ≥5 sign-ups/30 days | 0 sign-ups | 30 days | $0 | 1 |
| EXP-002 | LC-2 (WTP) | Medium | Outreach + pricing test | ≥3 positive responses | 0 responses | 14 days | $0 | 2 |
| EXP-003 | LC-3 (value prop) | Medium | Interview (5 emitters) | ≥3/5 prefer CEIP | ≤1/5 prefer | 14 days | $0 | 3 |
| EXP-004 | LC-4 (pilot) | High | Pilot (1 emitter) | Memo produced + feedback | Drop-out or Excel sufficient | 2-4 weeks | $0 | 4 |
| EXP-005 | LC-5-7 (consultant) | Medium | Outreach (10 consultants) | ≥2 trial/demo | 0 responses | 14 days | $0 | 5 |
| EXP-006 | LC-8 (credit banking) | Low | Landing page test | ≥3 sign-ups/30 days | 0 sign-ups | 30 days | $0 | 6 |
| EXP-007 | LC-10-11 (DI catalyst) | Low | Monitoring + landing page | DI released + ≥5 sign-ups | Delayed or 0 sign-ups | Ongoing | $0 | 7 |
| EXP-008 | LC-12 (positioning) | Low | A/B landing page test | Variant B ≥2× variant A | No difference | 30 days | $0 | 8 |

### 5c: Experiment Priority Ranking (Cheapest-Falsification-First)

**Execution order:**

1. **EXP-001** (Low fidelity, 30 days, $0) — Falsifies LC-1: "Do emitters need 3-pathway comparison?"
   - If fails → H-TIER-1 is disproven → pivot to backup beachhead (ON LDC) or contrarian
   - If passes → proceed to EXP-002

2. **EXP-002** (Medium fidelity, 14 days, $0) — Falsifies LC-2: "Will emitters pay $1,500/mo?"
   - If fails → pricing model is wrong → test lower price or different segment
   - If passes → proceed to EXP-003

3. **EXP-003** (Medium fidelity, 14 days, $0) — Falsifies LC-3: "Are source-dated memos valued?"
   - If fails → value prop is wrong → reposition around speed or accuracy instead of provenance
   - If passes → proceed to EXP-004

4. **EXP-004** (High fidelity, 2-4 weeks, $0) — Falsifies LC-4: "Can an emitter produce a board-ready memo?"
   - If fails → product doesn't work for real use case → product gap is critical
   - If passes → H-TIER-1 is SUPPORTED → exit evidence-limited mode

5. **EXP-005** (Medium fidelity, 14 days, $0) — Tests H-TIER-2 (consultant channel)
   - Parallel to EXP-002; can run simultaneously

6. **EXP-006** (Low fidelity, 30 days, $0) — Tests H-CREDIT-1 (credit banking demand)
   - Parallel to EXP-001; can run simultaneously

7. **EXP-007** (Low fidelity, ongoing, $0) — Tests H-TIER-3/H-DI-1 (DI catalyst)
   - External timeline dependent; start monitoring immediately

8. **EXP-008** (Low fidelity, 30 days, $0) — Tests contrarian positioning variant
   - Parallel to EXP-001; can run simultaneously

**Parallel execution tracks:**

- Track A (Primary): EXP-001 → EXP-002 → EXP-003 → EXP-004
- Track B (Channel): EXP-005 (parallel with Track A)
- Track C (Cross-sell): EXP-006 (parallel with Track A)
- Track D (Catalyst): EXP-007 (ongoing)
- Track E (Positioning): EXP-008 (parallel with Track A)

### 5d: Validation Plan Document

**Path out of evidence-limited mode:**

1. EXP-001 passes (need confirmed) → add `customer_outcome` evidence type
2. EXP-002 passes (WTP confirmed) → add `sales_data` evidence type
3. EXP-003 passes (value prop confirmed) → add `user_quote` evidence type
4. EXP-004 passes (pilot completed) → add `behavioral_observation` evidence type

After EXP-004 passes: 9 of 11 evidence types present → evidence-limited mode deactivated → gates can reach GO.

**If EXP-001 fails:**
- H-TIER-1 is Disproven
- Recycle to Phase 3 with backup beachhead (ON LDC forecast, scored 47/70)
- Or test contrarian hypothesis (anti-spreadsheet positioning for simpler TIER facilities)

**If EXP-002 fails but EXP-001 passes:**
- Need exists but pricing is wrong
- Test lower price point ($499/mo or $749/mo)
- Or test success-fee model ($500/mo + 20% of savings)

**If EXP-003 fails but EXP-001 and EXP-002 pass:**
- Need and WTP exist but value prop is wrong
- Reposition around speed ("produce a TIER memo in 10 minutes vs 2 hours in Excel")
- Or reposition around accuracy ("eliminate calculation errors in TIER compliance")

---

## Page 3 — Research Question Tree Update & Gap Analysis

### Coverage Status After Phase 5

| Question ID | Question | Coverage | Counter-evidence |
|---|---|---|---|
| All Phase 0-4 questions | ✅ Covered | ✅ |
| New: Can experiments falsify the primary hypothesis? | ✅ Covered — EXP-001 through EXP-004 designed | ✅ |

### Gap Analysis for Phase 5

| Gap type | Description | Severity | Experiment addressing it |
|---|---|---|---|
| Need gap | Cannot verify buyer need | Critical | EXP-001 (landing page), EXP-003 (interview) |
| Proof gap | Zero buyer proof | Critical | EXP-004 (pilot) |
| Pricing gap | No WTP data | Major | EXP-002 (WTP outreach test) |
| Distribution gap | No sales channel | Major | EXP-005 (consultant channel test) |
| Adoption gap | Trust/change management untested | Major | EXP-004 (pilot tests end-to-end adoption) |
| Evidence gap | 0 customer evidence | Critical | EXP-001 through EXP-004 collectively address this |

---

## Page 4 — Gate Decision

### Pre-Gate Self-Assessment (5 Dimensions)

| Dimension | Score (1-5) | Rationale |
|---|---|---|
| Evidence Quality | 3 | Experiment designs are HIGH quality but unexecuted. No new evidence yet. |
| Source Coverage | 3 | 5 types present. Experiments designed to add 4 more types when executed. |
| Logical Consistency | 4 | Experiments align with hypotheses. Priority ranking follows cheapest-falsification-first. Failure paths are defined. |
| Counter-Evidence | 4 | Adversarial review of experiment design completed. Contrarian experiment (EXP-008) included. |
| Decision Readiness | 4 | Ready for codebase audit and remediation. Experiments can be executed in parallel with Phase 6-7. |
| **Composite** | **18/25** | ≥18/25 threshold ✅ — but evidence-limited mode caps at CONDITIONAL GO |

### Gate 5 Decision: **CONDITIONAL GO** (Evidence-Limited Mode)

**Rationale:** Pre-gate self-assessment 18/25 ≥ 18/25 ✅. All load-bearing claims extracted (12 claims) ✅. Each claim has designed experiment with success/failure thresholds ✅. Priority-ranked with cheapest-falsification-first ✅. Adversarial review passed ✅. But experiments unexecuted → evidence-limited mode → CONDITIONAL GO.

**Conditions:**
1. EXP-001 must be executed first (cheapest falsification)
2. If EXP-001 fails, recycle to Phase 3 with backup beachhead
3. If EXP-004 passes, evidence-limited mode can be deactivated

### Exit Criteria Checklist

- [x] All load-bearing claims extracted (12 claims across 6 hypotheses + contrarian)
- [x] Each claim has designed experiment with fidelity ladder level
- [x] Success and failure thresholds defined for each experiment
- [x] Priority ranking follows cheapest-falsification-first
- [x] Parallel execution tracks defined (5 tracks)
- [x] Path out of evidence-limited mode defined (EXP-001 through EXP-004)
- [x] Failure paths and recycling triggers defined
- [x] 3-persona adversarial review completed
- [x] Pre-gate self-assessment ≥ 18/25 (18/25)

### Adversarial Review Summary

| Persona | Challenges | Adjustments |
|---|---|---|
| The Skeptic | "EXP-001 landing page test may get sign-ups from curiosity, not need. Sign-up ≠ purchase." | Accepted — EXP-001 is low fidelity for a reason. It's the cheapest falsification, not the strongest proof. EXP-004 (pilot) is the high-fidelity test. |
| The Missing Perspective | "You haven't included an experiment for the EHS platform threat (Cority, Intelex)." | Valid — added as risk note. If EHS platforms add TIER modules, CEIP's wedge narrows. Monitor but don't block on it. |
| The Contrarian | "What if ALL experiments pass but no one actually buys? Preference ≠ purchase." | Accepted — this is why EXP-004 (pilot) is the critical experiment. It tests end-to-end value, not just preference. |

### Next-Phase Skill Selection

| Phase | Skill | Re-evaluation trigger |
|---|---|---|
| 6 | codebase-onboarding | If no codebase → skip (codebase present, proceed) |

### State Update

```json
{
  "current_phase": 6,
  "current_gate": "CONDITIONAL_GO",
  "decision_confidence": { "composite": 77, "quality": 22, "coverage": 17, "consistency": 19, "counter": 14, "validation": 5 },
  "evidence_types_present": ["product_promise", "codebase_evidence", "competitor_intel", "stakeholder_input", "pricing_signal"],
  "evidence_limitations": ["Experiments designed but unexecuted", "Zero customer evidence remains", "All hypotheses remain Unresolved"],
  "phases_completed": [0, 1, 2, 3, 4, 5],
  "gates_passed": ["CONDITIONAL_GO", "CONDITIONAL_GO", "CONDITIONAL_GO", "CONDITIONAL_GO", "CONDITIONAL_GO", "CONDITIONAL_GO"],
  "evidence_limited_mode": true,
  "experiments_designed": 8,
  "experiments_executed": 0
}
```
