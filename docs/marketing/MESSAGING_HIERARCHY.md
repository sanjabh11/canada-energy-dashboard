# CEIP Messaging Hierarchy

> Status: controlled draft; TIER remains a desk-research-only pilot hypothesis.
> Source of truth: [docs/COMMERCIAL_SOURCE_OF_TRUTH.md](../COMMERCIAL_SOURCE_OF_TRUTH.md). When this file conflicts with that file, that file wins.
> Scope rule: every claim below must stay inside the approved lead positioning and the claim-translation table in the source of truth. The do-not-claim list at the bottom applies to all copy derived from this hierarchy.

## How To Use This Pyramid

- **Level 1** is the one-sentence answer to "what is CEIP?" Use it verbatim or not at all.
- **Level 2** pillars are hypotheses about the target buyer's needs. Use them only in owner-approved research; do not stack all three in a cold message.
- **Level 3** proof points are the evidence you may attach to each pillar. Each proof point must map to a live route or a documented artifact.
- **Level 4** rules govern feature-level copy so no writer drifts into banned claims.

Current focus hypothesis: **Alberta TIER-regulated industrial emitters and their advisors**, based on desk research only. This is not a validated beachhead or an authorization to conduct outreach. Utility forecasting remains the documented fallback.

## Level 1 — Positioning Statement

> **CEIP is a Canadian energy compliance and planning proof-pack product** (category) **that turns Alberta TIER compliance scenarios, credit ledgers, forecasts, filing evidence, and billing checks into buyer-ready artifacts** (differentiator) **for Alberta TIER-regulated industrial emitters, utilities, and the consultants who serve them** (target).

Dunford-style decomposition:

| Element | Content |
|---|---|
| Category | Canadian utility and TIER compliance proof packs — not a dashboard suite, not an AI forecasting platform |
| Differentiator | Output is a reviewable artifact (memo, pack, ledger audit, decision note) with source dates, caveats, and claim boundaries attached — not another analytics page |
| Target hypothesis (unvalidated) | Alberta TIER-regulated industrial emitters, their CFOs/compliance leads, EPCs, and utilities |
| Target (adjacent) | LDCs, REAs, regulatory/filing teams, Ontario Class A industrials, municipal utilities, utility consultants |

Approved verbatim lead (from the source of truth, use when a full description is needed):

> CEIP is a Canadian utility and Alberta TIER proof-pack product that turns forecasts, filing evidence, benchmark transparency, Ontario GA/ICI peak-risk support, privacy-screened CSV proof, compliance scenarios, credit ledgers, asset triage, security review, and billing checks into buyer-ready artifacts.

## Level 2 — Value Pillars

### Pillar 1 — Compliance cost clarity for Alberta TIER facilities (pilot hypothesis)

CEIP turns TIER compliance inputs into a CFO-readable scenario memo comparing fund payment, market-credit assumptions, and direct-investment assumptions — plus a credit banking audit pack for allocation, expiry risk, and remaining liability coverage.

- Lanes: `/roi-calculator` (TIER scenario memo, planning only), `/credit-banking` (TIER credit-banking scenario review, planning only)
- Buyer: Alberta industrial emitters, EPCs, CFOs, compliance leads
- Always framed as source-dated planning support — never trading, tax, or legal advice.

### Pillar 2 — Decision artifacts reviewers can trust

CEIP attaches benchmarks, provenance, source/fallback labels, and caveats to every forecast and planning output, so a reviewer can see whether the numbers beat simple baselines before trusting them.

- Lanes: `/forecast-benchmarking` (4.6/5), `/utility-demand-forecast` (4.5/5), `/regulatory-filing` (4.3/5)
- Buyer: forecast reviewers, planning leads, regulatory teams, utility consultants

### Pillar 3 — Privacy-safe proof before data sharing

CEIP can produce a local, redacted BYO-CSV proof and a security procurement pack before any sensitive files or connector approvals are requested — reducing the data-sharing blocker that stalls pilots.

- Lanes: `/byo-csv-proof` (4.1/5), `/utility-security` (4.0/5)
- Buyer: utility privacy, security, procurement, and planning reviewers

## Level 3 — Proof Points

Attach only the proof point that matches the pillar in play. Ratings below are current sellability-confidence ratings, not marketing scores; do not inflate them.

| Pillar | Proof point | Route / artifact | Boundary that travels with it |
|---|---|---|---|
| 1 | Source-dated TIER scenario memo comparing fund payment, credits, and direct investment | `/roi-calculator` | Planning memo only; not trading, tax, legal, or guaranteed-savings advice |
| 1 | Credit allocation schedule with expiry-risk review and remaining liability coverage | `/credit-banking` | Diligence artifact; no broker execution or registry certification |
| 2 | Forecast planning memo with scenarios, warnings, and source/fallback labels | `/utility-demand-forecast` | Buyer LDC history required before claiming buyer-specific forecast validity |
| 2 | Benchmark appendix showing MAE, MAPE, RMSE vs persistence and seasonal-naive baselines | `/forecast-benchmarking` | Benchmark evidence must remain attached to forecast exports |
| 2 | Filing-prep evidence pack with reviewer checklist | `/regulatory-filing` | Filing-prep support only; not legal, counsel, or regulator approval |
| 2 | Ontario GA/ICI 5CP decision-support note with IESO source notes | `/ga-ici-5cp` | No guaranteed savings, final settlement, eligibility, or curtailment instruction |
| 3 | Redacted schema/completeness report, identifier screen, formula-risk screen, hashable retained extract | `/byo-csv-proof` | No PII-free certification or production connector approval |
| 3 | Security questionnaire with control matrix, retention, incident contacts, owner-supplied evidence boundaries | `/utility-security` | Security review evidence only; no SOC 2 or procurement approval claim |
| Adjacent | Invoice delta report with audit notes | `/shadow-billing` | Savings limited to supplied and mapped fields |
| Adjacent | Replace/defer capex summary and prioritized CSV | `/asset-health` | CBRM-lite planning support; no SCADA or predictive-maintenance claim |

## Level 4 — Feature Copy Rules

1. **Lead with the artifact, not the platform.** "A CFO-readable TIER scenario memo" — never "a powerful analytics platform."
2. **Every number carries a source date and a caveat.** If a feature can't produce a dated, caveated artifact, it isn't copy.
3. **Use the claim-translation table.** "AI-powered forecasting platform" → "transparent forecast proof pack with benchmark appendix"; "guaranteed savings" → "source-dated planning estimate with buyer validation required"; etc. (Full table in the source of truth.)
4. **Hypothesis ordering.** Keep the TIER pilot hypothesis and utility fallback distinct; do not present the desk-research order as a validated market priority.
5. **Pricing language.** Displayed amounts are unvalidated planning prices in USD — Free USD $0, Watchdog USD $9/mo, Pro USD $149/mo, Industrial/TIER USD $1,500/mo, Municipal USD $5,900/mo, Sovereign USD $2,500/mo. Never pair a price with a savings guarantee.
6. **Evidence discipline.** No feature rating or confidence claim may rise in copy until matching buyer evidence is logged in the pilot evidence register and passes the 95% gate with `--evidence-root` hash verification.
7. **Route check.** Only name a proof pack in copy when it can be shown on the current route.
8. **CASL.** Any outbound message derived from this hierarchy must carry the CASL footer in [docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md](../growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md), complete the consent-basis checklist there (consent basis, source, date, sender identity, unsubscribe mechanism), and pass a suppression check against the canonical registry [docs/growth/SUPPRESSION_REGISTRY_LIVE.csv](../growth/SUPPRESSION_REGISTRY_LIVE.csv).

## Do-Not-Claim List (applies to all levels)

- production utility onboarding or production utility bridge approval;
- SOC 2 certification, NERC CIP compliance, or certified Indigenous data sovereignty;
- live TIER market pricing, broker execution, tax advice, legal advice, or guaranteed savings;
- power-flow, hosting-capacity, SCADA, ADMS, or engineering approval capability;
- native utility telemetry or customer LDC history without accepted buyer evidence;
- AI/GPU superiority over enterprise forecasting vendors;
- accurate avalanche prediction in this repository;
- "many dashboards plus AI", "AI/GPU forecasting platform", "production utility bridge", "OCAP-compliant sovereignty infrastructure", "live TIER market pricing", "regulator-ready filing automation", "engineering approval or power-flow platform".

## Related Files

- [docs/COMMERCIAL_SOURCE_OF_TRUTH.md](../COMMERCIAL_SOURCE_OF_TRUTH.md) — canonical positioning and claim boundaries
- [docs/COMMERCIAL_STATUS.md](../COMMERCIAL_STATUS.md) — current commercial status and proof-pack detail
- [docs/sales/BATTLE_CARD_ORENNIA.md](../sales/BATTLE_CARD_ORENNIA.md) — competitive differentiation
- [docs/growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md](../growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md) — CASL-compliant send templates
