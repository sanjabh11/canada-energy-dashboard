# CEIP Niche Positioning Audit v2 — Independent Verification

**Verification date:** 2026-07-13
**Product:** Canada Energy Intelligence Platform (CEIP)
**Audited worktree:** `/Users/sanjayb/minimax/canada-energy-dashboard`
**Source audit:** `.positioning-audit/CEIP_POSITIONING_AUDIT_v2_2026-07-13.md`
**Verifier:** `scripts/verify-positioning-audit.mjs`

## Decision

**CONDITIONAL GO is retained.** GLM’s v2 conclusion is directionally correct and materially more honest than v1’s 95% GO, but it is not a full independent confirmation of product–market fit. The current repository supports a plausible Alberta TIER beachhead and a bounded scenario-planning product. It does not contain accepted buyer, usage, outcome, or paid-pilot evidence that would resolve the seven hypotheses or deactivate evidence-limited mode.

The phrase “zero customer evidence” is confirmed only within the audited repository and its retained audit artifacts. It should not be interpreted as proof that no evidence exists outside this worktree.

## What was verified

| GLM v2 finding | Verification result | Evidence and interpretation | Gap / consequence |
|---|---|---|---|
| v2 should replace v1’s 95% GO with an evidence-limited decision | **Corroborated** | `state.json` is `COMPLETE / CONDITIONAL_GO`, `evidence_limited_mode=true`, `experiments_executed=0`, and six buyer/commercial evidence types are missing. | The decision is appropriately conditional; no basis exists for unconditional GO. |
| Alberta TIER is a credible beachhead category | **Directionally corroborated** | Alberta describes TIER as an industrial carbon-pricing and emissions-trading system with multiple compliance pathways and annual reporting/assurance obligations. The Canada–Alberta agreement supplies a published headline price schedule. | Regulation establishes a recurring obligation, not buyer willingness to pay for CEIP. Need and WTP remain unresolved. |
| “Alberta TIER Facility Compliance CFO Memo” is the beachhead | **Plausible, unproven** | The repository contains TIER scenario calculations, source/fallback pricing disclosure, memo generation, a lead-capture path, and a paired credit-banking route. | The internal 51/70 beachhead score is a prioritization heuristic, not customer validation. |
| All seven positioning hypotheses remain unresolved | **Substantially corroborated** | `hypotheses.json` contains seven hypotheses, all with status `Unresolved`. The verifier found no invalid links after correcting `EXP-008`. | `H-DI-1` and `H-CREDIT-2` have no direct experiment link; the research model is not fully referentially complete. |
| Eight experiments are designed and none executed | **Corroborated** | `experiments.json` contains `EXP-001` through `EXP-008`; state records zero executed experiments. | Landing-page interest, interviews, outreach replies, and one pilot must not be treated as interchangeable evidence. |
| TIER calculator is “production-ready” | **Partially corroborated; wording too strong** | `TIERROICalculator.tsx` implements a deterministic scenario flow, fee logic, pathway comparison, memo export, and lead capture. The code also uses estimated/fallback inputs and explicitly requires buyer validation. | Describe it as **implemented bounded scenario planning / pilot qualification**, not production-ready compliance, trading, tax, legal, or guaranteed-savings software. |
| P0 is a dedicated `/tier-compliance` landing page and stronger TIER prominence | **Confirmed gap** | TIER routes exist at `/roi-calculator`, `/industrial`, `/tier-savings`, and `/credit-banking`; no `/tier-compliance` route is declared. TIER is a semantic positioning ID and is not the homepage’s default segment. | P0 remains valid, subject to keeping the page within the existing claim boundaries. |
| The v2 codebase inventory is 73 routes / 52 lazy imports / 151 components / 156 libs / 121 docs / 86 functions | **Not confirmed; stale** | The verifier counted 138 route declarations and unique paths, 68 `React.lazy()` calls, 206 component files, 183 lib files, 232 documentation files, and 109 deployable function directories (110 top-level including `_shared`). | Treat the old counts as historical snapshots. The sprawl diagnosis remains directionally relevant, but quantitative conclusions need refreshed baselines. |
| No direct competitor was identified | **Not confirmed as an absence claim** | Reviewed first-party sources show adjacent Alberta TIER compliance, credit, trading, and market-intelligence offerings from [Targray](https://www.targray.com/environmental-commodities/carbon-markets/canada/alberta-tier) and [cCarbon](https://www.ccarbon.info/press-releases/ccarbon-expands-its-market-intelligence-services-to-cover-alberta-tier-canada-cfr-and-sustainable-fuels/). | Narrow the claim to “no directly comparable facility-level CFO memo competitor found in the reviewed set.” Complete named-account competitor discovery. |
| TAM / SAM / SOM support the opportunity | **Low-confidence / not independently confirmed** | The audit carries the Mordor Intelligence TAM figure and derives SAM/SOM from it. No refreshed primary, bottom-up account count or willingness-to-pay model was found in v2. | Keep as directional context only. Do not use it as evidence of demand or forecast revenue. |
| DI standard release is an immediate demand catalyst | **Unresolved and time-sensitive** | Alberta’s current TIER page describes the Direct Investment standard as expected in early 2026; the page does not independently establish a released standard in this audit. | Use “release timing and demand impact unconfirmed,” not “standard not released” as an absolute claim. |

## Eight-type gap analysis

| Gap type | Severity | Current evidence | Verified gap | What closes it | Status |
|---|---:|---|---|---|---|
| Need | Critical | TIER obligations, reporting deadlines, and pathway complexity are documented. | No Alberta emitter has confirmed that the CEIP problem is painful enough to change workflow. | Five structured interviews plus observed workflow evidence; record the problem, current workaround, and switching trigger. | Open |
| Proof | Critical | Product code and bounded proof-pack guardrails exist. | No emitter has used the memo with facility data or confirmed it was decision-useful. | One instrumented pilot with facility-specific inputs, reviewer feedback, and retained outcome evidence. | Open |
| Evidence | Critical | Five non-customer evidence types are present; six customer/commercial types are missing. | No production pilot register or production outreach response log is present in the audited artifacts; all experiments are unexecuted. | Validated outreach log, interview records, pilot evidence register, and analytics export with provenance. | Open |
| Product | Major | TIER scenario route, memo export, pricing provenance, and credit-banking support are implemented. | No dedicated `/tier-compliance` entry point; the broader surface is materially larger than the v2 inventory claims. | Add the focused entry point only after claim-boundary and browser checks; refresh route and artifact inventory. | Open |
| Positioning | Major | TIER is represented as a commercial wedge and industrial workflow. | Homepage defaults to Utility and presents ten proof packs; the beachhead is not the default narrative. | Test TIER-first versus broad positioning with controlled traffic and qualified buyer actions. | Open |
| Pricing | Major | `$1,500/mo` industrial tier and fee logic are encoded; official TIER price schedule is cited. | No buyer has accepted the price, paid, or signed a pilot at that price. | WTP outreach with upfront pricing, objection coding, and a paid or explicitly budgeted pilot threshold. | Open |
| Distribution | Major | Direct outreach is proposed; Plausible and lead-intake plumbing exist. | No validated acquisition channel, response log, or qualified-funnel baseline is present. | Execute a named-account outreach cohort and capture delivery, response, meeting, pilot, and disqualification outcomes. | Open |
| Adoption | Major | The memo is framed for finance/compliance review and includes a pilot next step. | Trust, data-preparation burden, internal approval, and replacement of spreadsheet workflows are untested. | Observe one real workflow from input preparation through reviewer decision; measure time, rework, and acceptance. | Open |

## Audit-integrity findings

The eight current phase artifacts are present and each contains four page sections. The following persistence issues remain and should be fixed in the next audit maintenance pass:

1. `research-questions.json` persists only `phase_0`; phases 1–7 are present in narrative artifacts but not in the JSON research tree.
2. `H-DI-1` and `H-CREDIT-2` are not directly linked by an experiment. They may be intentional conceptual duplicates/cross-sell claims, but the relationship should be explicit in the schema.
3. The Phase 0 embedded JSON snapshot records `evidence_limited_mode=false`; this is treated as a pre-Gate-1 snapshot because the surrounding artifact says the mode is activated at Gate 1. The final `state.json` is the authoritative final state and records `true`.
4. The prior `EXP-008` value `"Contrarian"` was not a hypothesis ID. It was corrected to `H-CONTRA-1`; no product code was changed.

## Regulatory and market context

The category case is stronger than a generic “energy analytics” claim, but it is still category evidence rather than customer evidence:

- [Alberta TIER regulation and compliance page](https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation): regulated facilities, compliance pathways, annual reporting, assurance, and current program updates.
- [Canada–Alberta Implementation Agreement](https://www.pm.gc.ca/en/news/backgrounders/2026/05/15/implementation-agreement-canada-alberta-memorandum-understanding): headline price schedule, price-floor direction, and Direct Investment eligibility limits.
- [Alberta TIER compliance workshop](https://www.alberta.ca/system/files/epa-tier-compliance-workshop-2025.pdf): operational compliance context and credit-use guidance.

These sources support why the problem may recur and matter. They do not establish that CEIP is preferred over Excel, consultants, brokers, or incumbent internal processes.

## Recommended evidence sequence

The proposed order is reasonable, with one qualification: do not deactivate evidence-limited mode after a signup or positive reply alone.

| Order | Action | Minimum useful result | Evidence produced |
|---:|---|---|---|
| 1 | Create the TIER-focused entry page and instrument qualified CTA events | 100 qualified visitors, with source and segment captured | Analytics event export and visitor qualification log |
| 2 | Run 20 named-account WTP conversations with `$1,500/mo` visible | At least three substantive positive responses or one explicitly budgeted pilot | Outreach response log with objections and role/company provenance |
| 3 | Conduct five workflow interviews | At least three prefer the memo for a defined decision, with current-workaround evidence | Interview records and coded observations |
| 4 | Run one facility-data pilot | Memo reviewed by finance/compliance, usable feedback, and a retained outcome record | Pilot evidence register, input provenance, reviewer outcome |
| 5 | Re-score H-TIER-1 and the dependent claims | Evidence quality and coverage rise without unresolved critical contradictions | Updated hypothesis/evidence/state files |

EXP-001’s signup threshold is a useful falsification signal, but a signup is not proof of need. EXP-002’s positive reply is a pricing signal, not proof of payment. EXP-004 is the first proposed experiment that can produce direct product-use proof, and even one pilot will not establish repeatability by itself.

## Verification checks

| Check | Result |
|---|---|
| `node scripts/verify-positioning-audit.mjs` | Completed; 3 integrity checks pass and 4 expected warnings remain (inventory drift, research-tree persistence, two unlinked hypotheses, missing focused route). |
| `pnpm exec tsc -p tsconfig.app.json --noEmit` | Pass; exit 0. |
| `pnpm exec vitest run tests/unit/commercialPositioning.test.ts tests/unit/proofPackGates.test.ts tests/unit/pilotEvidenceRegisterValidator.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1` | Pass; 3 test files, 56 tests. |
| `node scripts/check-claim-boundaries.mjs` | Pass; 421 active source/doc files. |
| `git diff --check` on changed files | Pass. |

## Final assessment

GLM’s most important judgment is correct: the audit should remain **CONDITIONAL GO**, with the Alberta TIER CFO memo as the working beachhead and buyer validation as the gating work. The main corrections are evidentiary precision and audit hygiene, not a reversal of strategy:

- retain the conditional decision;
- treat all seven hypotheses as unresolved;
- replace stale inventory claims with the verifier’s current counts;
- avoid absolute competitor-absence and DI-release claims;
- describe the current TIER route as bounded scenario planning;
- execute the evidence sequence before making a stronger positioning or revenue claim.

### ECC verification ledger

| Field | Result |
|---|---|
| Route | `ecc-niche-positioning-audit` → evidence-first reconciliation |
| Tier / mode | Tier 1; normal PhaseLoop after dynamic-workflow `skip` decision |
| Skills used | `ecc-niche-positioning-audit`, `agent-phase-ratchet`, Everything Claude Code deep-research/market-research guidance |
| Baseline | v2 artifacts present; final state 79% `CONDITIONAL_GO`; zero experiments executed |
| Checks | Deterministic verifier, TypeScript, 56 targeted tests, claim-boundary scan, diff check |
| Delta | Added verifier/report; corrected `EXP-008 -> H-CONTRA-1`; no product API or route change |
| Reflection | Core decision survives; stale counts and persistence/linkage defects were more concrete than a strategy reversal |
| Decision | Retain `CONDITIONAL GO` and evidence-limited mode |
| Next adjustment | Execute EXP-001 through EXP-004 and persist phase research trees/evidence registers |
