# CEIP Top 20 Sellable Features for Energy and Utilities

> **Last Audited:** May 29, 2026
> **Base Demo Host:** [https://canada-energy.netlify.app](https://canada-energy.netlify.app)
> **Purpose of this file:** keep CEIP focused on sellable Canadian energy and utility proof packs, not a loose collection of dashboards.
> **Commercial source of truth:** [COMMERCIAL_SOURCE_OF_TRUTH.md](./COMMERCIAL_SOURCE_OF_TRUTH.md).
> **Confidence note:** See [CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md](./CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md). Current strategy confidence is 90-92%; 95% market confidence requires buyer-supplied pilot evidence.
> **Pilot evidence checklist:** [PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md](./PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md).

## Lead USP

CEIP's defensible USP is:

**Canadian utility and TIER proof packs that turn forecasts, filings, benchmarks, compliance savings, credit ledgers, asset decisions, security review, billing checks, and large-load assumptions into buyer-ready artifacts.**

CEIP should not lead with generic AI, GPU forecasting, broad dashboard coverage, or production connector claims. Best-in-class vendors already own operational AI/weather/API forecasting and deep grid-planning engines. CEIP should win by being narrower, Canadian, evidence-driven, exportable, and faster to pilot.

## Key selling points

1. Utility planning packs combine forecast scenarios, benchmark proof, assumptions, warnings, and exportable schedules.
2. Regulatory filing packs translate planning evidence into OEB/AUC-oriented reviewer artifacts.
3. Forecast benchmarking is visible through MAE, MAPE, RMSE, persistence, seasonal-naive, source, and fallback labels.
4. TIER CFO and credit-banking packs make Alberta industrial compliance decisions source-dated and audit-ready without implying trading advice.
5. Asset, billing, security, and large-load packs create meeting-ready evidence without requiring SCADA, ADMS, power-flow, or enterprise integrations.

## Top 10 sellable features

| Rank | Feature | Primary buyer | Current implementation status | Exact gap to keep closing | Priority score |
|---:|---|---|---|---|---:|
| 1 | Utility demand forecast planning pack | LDCs, REAs, utility consultants | Implemented route and proof pack; now includes source manifest, rolling-origin evidence, conformal interval coverage, hierarchy reconciliation, benchmark appendix, planning export, and security attachment path. | Replace public sample with buyer-supplied LDC history during pilots; keep every export board/regulator-readable. | 5 |
| 2 | Forecast benchmarking and provenance layer | Forecast reviewers, consultants | Implemented route and utility export appendix with MAE, MAPE, RMSE, persistence, seasonal-naive, source manifest, fallback, warnings, rolling splits, and assumptions. | Keep benchmark/provenance mandatory in new forecast exports. | 5 |
| 3 | OEB/AUC regulatory filing packs | Regulatory teams, consultants | Implemented route, template helpers, reviewer checklists, official source mapping, and jurisdiction schedule exports. | Add more annotated sample packs from real reviewer workflows. | 5 |
| 4 | TIER compliance savings pack | Alberta industrial emitters, EPCs | Implemented CFO memo, appendix, pricing freshness gate, direct-investment sensitivity, and credit-banking workflow link. | Validate current pricing source and facility-specific assumptions before outbound use. | 4 |
| 5 | TIER credit banking audit pack | Alberta industrial emitters, CFOs, compliance leads | Implemented allocation schedule and expiry-risk outputs with no-broker guardrails. | Add buyer-approved registry ledger examples and live pricing validation during pilots. | 4 |
| 6 | Asset health executive capex pack | Asset managers, municipal utilities | Implemented CBRM-lite proof pack with executive export, prioritized replacement CSV, and cost-sensitivity checklist; no SCADA or predictive-maintenance claim. | Add buyer-specific replacement/deferment examples and board memo polish. | 4 |
| 7 | Utility security procurement pack | Utility security and procurement reviewers | Implemented control matrix, questionnaire, evidence index, deployed-evidence split, owner-supplied checklist, incident-response ownership, subprocessor disclosure, and data-handling boundaries. | Attach buyer-specific legal, privacy, hosting, SBOM, header, audit, and incident contacts per pilot. | 4 |
| 8 | Shadow billing invoice proof pack | Municipal/public-sector energy managers | Implemented proof route with uploaded-bill mode, monthly delta CSV, bill field map, audit notes, savings caveats, and energy-supply-only boundary. | Add one buyer-approved invoice comparison artifact. | 4 |
| 9 | Large-load/data-centre readiness overlay | Utilities, data-centre advisors | Incubation proof exists with BYOP/storage sensitivity, source-refresh checklist, and no-approval guardrail. | Keep as assumptions and constraint narrative until engineering-grade validation exists. | 3 |
| 10 | Consultant/API Canadian energy data pack | Consultants, analysts, integrators | Open API route exists with curated endpoint freshness matrix, sample export, and notebook starter. | Validate endpoint freshness and OpenAPI parity before paid technical pilots. | 3 |

## Supporting and de-emphasized surfaces

| Rank | Surface | Current role | Why it should not lead |
|---:|---|---|---|
| 11 | UtilityAPI / Green Button sandbox | Sandbox parser and connector-readiness support for the utility planning pack. | Not a production bridge or approval proof until OAuth approval, audit logs, revocation, and deployment evidence exist. |
| 12 | Retailer hedging and rate watchdog tools | Useful follow-up for Alberta price conversations. | Off-USP for the utility forecast proof-pack story. |
| 13 | Broad grid and market dashboard | Useful proof library and orientation surface. | Broad dashboards are harder to sell than a specific planning, filing, or savings artifact. |
| 14 | Renewable optimization and curtailment surfaces | Analyst follow-up proof for congestion and lost-value conversations. | Weaker direct budget path than utility planning or compliance packs. |
| 15 | Indigenous funder and AICEI reporting | Trust-sensitive support surface with owner-supplied governance markers. | Reserve for this ICP until live partner dataset and community review exist. |
| 16 | Resilience and crisis simulator | Support surface for asset and planning conversations. | Not a standalone commercial front door yet. |
| 17 | Sovereign data vault | Architecture-oriented Indigenous data workflow. | Keep bounded as an early workflow until partner-backed governance hardening exists. |
| 18 | Open education, certificates, and Whop surfaces | Training/community material. | Not part of the utility and forecast USP. |
| 19 | Generic copilots and agent runners | General platform capabilities. | Too broad and easy to dismiss without a budget-owned workflow. |
| 20 | Full operational AI/GPU forecasting | Deferred roadmap idea only. | Incumbents are far deeper in hourly weather, API, SOC/security, and operational forecasting; CEIP should not chase this before proof-pack traction. |

## Required copy guardrails

- Say "public-system sample" or "starter dataset" unless a buyer has supplied real LDC history.
- Say "sandbox" for UtilityAPI/Green Button until approval, OAuth, revocation, audit, and deployment evidence exist.
- Say "source-dated pricing assumption" for TIER market inputs unless a validated live source is actively attached.
- Say "OCAP-aligned workflow language" or "owner-supplied governance markers" unless a partner-backed governance review exists.
- Say "planning overlay" for large-load/data-centre readiness until engineering-grade validation exists.
- Do not say CEIP outperforms enterprise AI forecasting vendors without a published benchmark and comparable data contract.

## Confidence Gates Before 95%

| Gate | Required evidence | Why it matters |
|---|---|---|
| Buyer load history | One anonymized LDC, REA, or consultant-supplied load file with benchmark appendix. | Proves the utility pack is useful beyond public or constructed samples. |
| Forecast champion/challenger | Rolling split record across persistence, seasonal-naive, CEIP forecast, and any buyer baseline. | Prevents overclaiming forecast effectiveness. |
| TIER buyer case | One facility scenario with refreshed pricing assumptions and compliance-review caveats. | Prevents CFO memo language from becoming trading, legal, or tax advice. |
| Invoice proof | One buyer-approved invoice comparison artifact with field mapping and audit notes. | Moves shadow billing from constructed proof to customer proof. |
| Security evidence | SBOM, security headers, hosting/contact/subprocessor notes, retention boundary, and dependency audit. | Reduces procurement friction without implying certification. |
| Stale-doc control | Active docs and outreach pass claim-boundary checks; old docs are archived or clearly marked stale. | Prevents historical broad-platform claims from leaking into sales copy. |

Do not increase any feature rating above the current table unless the matching evidence item is logged in the pilot evidence checklist.

## Critical next implementation checkpoints

1. Keep `/utility-demand-forecast` as the front-door product.
2. Keep public sample CSV and manifest visible, but never present it as customer history.
3. Keep benchmark/provenance mandatory in utility exports.
4. Keep OEB Chapter 5 and AUC reviewer artifacts visible as first-class proof.
5. Keep TIER, credit-banking, asset, security, billing, large-load, and API packs exportable and caveated.

## Current strategy

Lead with utility planning/benchmark/regulatory plus TIER CFO/credit-banking for the current ICP. Use asset, security, billing, large-load, and API packs when the buyer workflow fits. Keep Indigenous reporting in reserve until partner-backed data and community review exist. Keep sandbox connectors, dashboards, education, generic AI, and GPU forecasting behind the main product story until customer proof justifies promoting them.
