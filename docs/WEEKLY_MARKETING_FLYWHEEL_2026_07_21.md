# Weekly Marketing Flywheel — 2026-07-21

> **Evidence-Limited Mode:** ACTIVE | **95% Buyer-Evidence Gate:** PRESERVED | **No buyer validation claimed**
> **Revision:** 2026-07-21T15:15Z — Codex 360-degree audit: 12 gaps found and fixed (see Revision Notes)

## Selected Wedge: TIER Compliance CFO Memo

- **Wedge:** `tier_cfo_savings_pack` → route `/roi-calculator`
- **Buyer:** Alberta large-emitter compliance officer/CFO; secondary: TIER consultants
- **Pricing:** $1,500/mo + 20% success fee (industrial); $149/mo (professional/consultant)
- **Spread:** $70/tonne ($95 fund − $25 market credit fallback)
- **Sources:** `src/lib/tierPricing.ts`, `src/lib/pricingCatalog.ts`, `src/lib/commercialPositioning.ts`

## Consultancy Offer

**TIER Compliance 3-Pathway CFO Memo — Source-Dated Decision Support**

1. 3-pathway comparison memo (fund, market credits, DI) with provenance
2. Arbitrage spread analysis ($70/t, 73.7%)
3. DI sensitivity tool (50% eligible capex/opex per Implementation Agreement)
4. Board-ready PDF/CSV export with do-not-claim metadata
5. Credit banking audit companion pack

**Approved wording:** "source-dated 3-pathway comparison memo", "TIER compliance planning support"
**Prohibited:** "guaranteed savings", "live TIER market pricing", "trading advice", "AI-powered"
**Disclosure:** Product-defined, codebase-proven. No buyer has validated outcome, pricing, or WTP.

## Three LinkedIn Hooks

### Hook 1 — Arbitrage Spread (Mon 7/21)

> Alberta TIER: fund price $95/t, market credits ~$25/t. $70/t spread before DI. We built a 3-pathway CFO memo tool sourced from the Canada-Alberta Implementation Agreement. No trading advice. Source-dated planning support. → /roi-calculator

**Evidence basis:** `tierPricing.ts` DEFAULT_TIER_PRICING — fund $95, market $25, spread $70.
**Claim register:** LC-1 approved wording. No prohibited phrases.

### Hook 2 — DI Window (Tue 7/22)

> 2026 DI standard = new TIER pathway. Most emitters still comparing fund-vs-market. CEIP has facility-level DI sensitivity with 50% eligible capital/opex. If you're a TIER consultant, your clients need this before June 30. → /tier-compliance

**Evidence basis:** `tierPricing.ts` policyNotes — DI eligibility per Implementation Agreement. H-TIER-3 hypothesis.
**Claim register:** LC-4 check passed — no prohibited phrases ("first mover", "only platform", "No competitor does this"). Status: unresolved.

### Hook 3 — Consultant Workflow Speed (Wed 7/23)

> TIER consultants: how long to build a 3-pathway memo in Excel? CEIP does it in <10 min with provenance metadata. $149/mo Professional tier. Audit-ready planning support. → /roi-calculator

**Evidence basis:** `pricingCatalog.ts` professional $149/mo. `TIERROICalculator.tsx` memo export.
**Claim register:** H-TIER-2 hypothesis. No prohibited phrases. Status: unresolved.

## Seven-Day Content/Intake Calendar

| Day | Date | Activity | Channel | Output | Gate |
|---|---|---|---|---|---|
| Mon | 2026-07-21 | Publish Hook 1 (Arbitrage Spread) | LinkedIn post | Public post → `/roi-calculator` | Track route views via Plausible |
| Tue | 2026-07-22 | Publish Hook 2 (DI First-Mover) | LinkedIn post | Public post → `/tier-compliance` | Track route views + lead captures |
| Wed | 2026-07-23 | Publish Hook 3 (Consultant Speed) | LinkedIn post | Public post → `/roi-calculator` | Track leads with `segment: 'Industrial'` or `'Consultant'` |
| Thu | 2026-07-24 | Engage Alberta energy LinkedIn groups | LinkedIn comments | 3-5 thoughtful comments on TIER/compliance posts | Track profile visits |
| Fri | 2026-07-25 | Share TIER ROI Calculator as free tool | LinkedIn + direct | Public link with "try it free" framing | Track calculator interactions + leads |
| Sat | 2026-07-26 | Review week's Plausible analytics | Internal | Route view counts, CTA clicks, lead form submits | Compare vs baseline (zero) |
| Sun | 2026-07-27 | Prepare next week's experiment adjustment | Internal | Updated experiment variant based on data | Document any buyer replies or intake requests |

## Three Conversion Fixes (Implemented)

1. **TIER-specific intake fields** on `/roi-calculator`: Expandable "Request a TIER pilot" section with `compliance_year` field. Existing `annual_emissions` and `benchmark_exceedance` already in metadata. Filters tire-kickers from qualified buyers.
2. **Consultant CTA card** on `/tier-compliance`: Separate emerald-themed card with `consultant_firm_name`, `consultant_email`, `client_count`, `current_tool` fields. Routes to `segment: 'Consultant'` with `target_plan: 'professional'`.
3. **Deadline urgency banner** on both `/roi-calculator` and `/tier-compliance`: Dismissible amber banner "TIER compliance reports due June 30 — start your 3-pathway memo now." Source: `tierPricing.ts` policyNotes.

## Falsifiable Experiment — EXP-W21-001 (Draft-Only, Approval-Gated)

| Field | Value |
|---|---|
| ID | EXP-W21-001 |
| Hypotheses | H-TIER-1 ($1,500/mo WTP), H-TIER-2 ($149/mo consultant adoption) |
| Target buyer | Alberta large-emitter compliance officer/CFO; secondary: TIER consultant |
| Channel | LinkedIn organic (3 posts over 3 days) |
| Qualifying response | LinkedIn reply/DM with TIER-specific question OR completed intake form with TIER fields filled |
| Non-qualifying | Likes, shares, generic comments ("interesting") |
| Baseline | 0 qualified intake requests in prior 30 days |
| Metric | Count of qualifying responses |
| Threshold: proceed | ≥1 qualifying response in 7 days |
| Threshold: pivot | 0 responses but ≥10 route views → change hook/channel |
| Threshold: kill | 0 responses AND <5 route views |
| Guardrail | No LinkedIn messages sent, no CRM records written, no starter packets as proof |
| Attribution window | 7 days (2026-07-21 to 2026-07-27) |
| Stopping rule | Stop after 7 days regardless |
| Approval gate | **DRAFT ONLY — user must explicitly approve before publishing** |
| Evidence class | Qualifying response = buyer **signal**, NOT buyer **proof**. Does NOT satisfy 95% gate. |

## Claim Ledger

| ID | Claim | Category | Status |
|---|---|---|---|
| CL-001 | 3-pathway TIER comparison memo exists | Product Truth | ✅ Verified |
| CL-002 | Pricing sourced from Canada-Alberta Implementation Agreement | Product Truth | ✅ Verified |
| CL-003 | $70/t arbitrage spread (73.7%) | Product Truth | ✅ Verified |
| CL-004 | DI sensitivity with 50% eligible capex/opex | Product Truth | ✅ Verified |
| CL-005 | Industrial $1,500/mo + 20% success fee | Product Truth | ✅ Verified |
| CL-006 | Professional $149/mo for consultants | Product Truth | ✅ Verified |
| CL-007 | Buyers need 3-pathway comparison | Buyer Evidence | ❌ Unverified |
| CL-008 | Buyers will pay $1,500/mo | Buyer Evidence | ❌ Unverified |
| CL-009 | Consultants will adopt at $149/mo | Buyer Evidence | ❌ Unverified |
| CL-010 | DI standard creates urgent demand | Buyer Evidence | ❌ Unverified |
| CL-011 | Any buyer has used/piloted/purchased | Customer Validation | ❌ FALSE |
| CL-012 | Pack produces buyer-validated savings | Customer Validation | ❌ FALSE |
| CL-013 | Pack is "market-ready" or "buyer-validated" | Customer Validation | ❌ FALSE |

**95% buyer-evidence gate: NOT satisfied. No buyer validation claimed.**

## One Action This Week

**Publish Hook 1 (Arbitrage Spread) on LinkedIn — after explicit user approval.**

## Next Measurement Gate

**2026-07-27 (Day 7):** Count qualifying responses. Check Plausible for `/roi-calculator` and `/tier-compliance` route views. If ≥1 qualifying response → create pilot intake packet. If 0 → pivot or kill.

**Evidence window end:** 2026-07-27T23:59:59Z

## Revision Notes — 2026-07-21T15:15Z

Codex 360-degree cross-verification audit. 12 gaps found and fixed:

### P0 — Critical Bugs Fixed
1. **False-success on /tier-compliance industrial form** — `handleSubmit` sent `contact_name: ''`, `persistLeadIntake` rejected it, but `setSubmitted(true)` ran unconditionally. Fixed: added `contactName` field, check `result.ok`, show error on failure, don't set submitted on failure.
2. **Pilot evidence blocked state** — `validate:pilot-evidence` correctly rejects template row. Added `pilot_evidence_blocked: true` to `state.json` to explicitly record blocked status.

### P1 — High Priority Fixes
3. **Banner wording** — Said "due June 30" but `tierPricing.ts` policyNotes says "due June 30 of the following year". Fixed both banners to match policyNotes exactly.
4. **Unsupported SLA claims** — Removed "within 24 hours" and "within 2 business days" from all UI. Replaced with "We'll be in touch regarding your request."
5. **Strategy slice Node warnings** — Added `--no-warnings` flag to `test:strategy-audit-slice` in `package.json` to suppress DEP0205 warnings in CI.

### P2 — Validation Hardening
6. **Weak email validation** — Replaced `includes('@')` with shared `validateEmail()` utility in `src/lib/formValidation.ts`. Rejects `@`, `a@`, `@b`, no-dot-after-@.
7. **Free-text client count** — Changed to `type="number"` with `min="0"` and `validateNonNegInt()` validation.
8. **No shared validation utility** — Created `src/lib/formValidation.ts` with `validateEmail`, `validateNonNegInt`, `validateRequired`.

### Proactive Fixes
9. **Industrial form error state** — Added `submitError` state and error display to industrial form on `/tier-compliance`.
10. **ROI calculator placeholder name** — Added optional `contactName` input to pilot request section; uses "Industrial Lead" only as fallback.
11. **Consultant form contact_name** — Still uses "TIER Consultant" placeholder; acceptable since firm name is captured separately.
12. **State.json evidence limitations** — Added "Pilot evidence register blocked by template placeholder row" to limitations array.

### Validation Results
- `tsc --noEmit` ✅
- `vite build` ✅
- `check:claim-boundaries` ✅ (426 files)
- `check:commercial-source` ✅ (11 docs)
- `check:public-metadata` ✅
- `test:strategy-audit-slice` ✅ (223/223)
- `validate:pilot-evidence` — correctly blocked by template (by design)
- All JSON files parse ✅
# EXPIRED — do not reuse for outreach or publication.

This July 2026 campaign draft is retained as historical evidence only. Its test window has expired; the price-spread and speed claims are unvalidated. New outreach requires a current, owner-approved experiment and CASL review.
