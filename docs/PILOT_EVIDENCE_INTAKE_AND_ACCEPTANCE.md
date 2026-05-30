# CEIP Pilot Evidence Intake And Acceptance Checklist

> Purpose: convert the remaining 95% confidence gap into a concrete buyer-evidence workflow.
> Scope: utility planning, forecast benchmarking, OEB/AUC filing prep, Alberta TIER, credit banking, asset capex, shadow billing, utility security, large-load planning overlays, and consultant/API data packs.
> Rule: if the evidence below is not supplied, keep the route positioned as public-system, starter, constructed, sandbox, advisory, or owner-supplied workflow proof.

## Pilot Evidence Packet

| Evidence item | Required for | Minimum input | Accepted formats | Do not claim without it |
|---|---|---|---|---|
| Buyer utility load history | Utility demand forecast planning pack | 12-36 months of monthly or hourly load with geography/customer-class labels when available | CSV, XLSX exported to CSV | customer LDC history, buyer-specific forecast validity, production telemetry |
| Forecast reviewer baseline | Forecast benchmarking and provenance | Existing buyer forecast, planning assumption, or accepted baseline method | CSV, PDF notes, memo extract | forecast improvement over buyer baseline |
| Filing reviewer sample | OEB/AUC filing pack | One anonymized prior filing schedule, reviewer comment, or consultant checklist | PDF, DOCX, CSV, Markdown notes | reviewer-ready mapping beyond sample-pack preparation |
| TIER facility assumptions | TIER CFO memo | annual emissions, benchmark exceedance, compliance year, direct-investment assumptions, approval owner | CSV, spreadsheet, signed assumptions note | buyer savings, CFO-ready decision support |
| TIER credit ledger and liability | Credit banking audit pack | credit lots, vintage, quantity, purchase price, status, expiry, compliance-year liability | CSV | registry-backed allocation, buyer credit position, purchase recommendation |
| Invoice comparison sample | Shadow billing proof pack | at least 6-12 months of bills or exported supply-cost rows | PDF plus extracted CSV, CSV | verified savings, bill-audit outcome, tariff reconstruction |
| Asset fleet subset | Asset health capex pack | asset id, asset type, age/install year, loading, maintenance, criticality, replacement-cost override if known | CSV | buyer-specific replace/defer recommendation |
| Utility security questionnaire | Utility security procurement pack | buyer questionnaire or review checklist with named owner/contact | XLSX, DOCX, PDF, Markdown | procurement approval, SOC certification, legal/privacy approval |
| Large-load assumptions | Large-load readiness overlay | load size, timing, location class, connection context, storage/BYOP options, buyer constraints | Markdown, CSV, memo | engineering approval, queue position, interconnection readiness |
| Consultant/API data-pack evidence | Consultant/API Canadian energy data pack | selected 5-10 endpoint workflow, sample payload/export, endpoint freshness matrix, and OpenAPI parity notes | CSV, JSON, Markdown, notebook outline | live-data SLA, production buyer integration, OpenAPI parity across every endpoint |

## What This Phase Makes Possible

| New capability | Usage syntax | What was not possible before | Proof boundary |
|---|---|---|---|
| Public-source utility forecast import and manifest | `parseIesoPublicDemandCsv(csvText)` then `buildUtilityForecastPackage(rows, { sourceKind: 'public_system_sample' })` | IESO/APO-style files could not be converted into a source-labeled utility planning pack with a stable manifest. | Public-system workflow proof only; not customer LDC history. |
| Forecast evidence appendix | `exportUtilityForecastCsv(forecastPackage)` | Exports did not carry rolling-origin splits, conformal interval coverage, hierarchy reconciliation, and benchmark evidence together. | Forecast confidence still needs buyer backtests before stronger market claims. |
| Forecast confidence movement guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A utility forecast or forecast-benchmarking row could move confidence with vague benchmark text. | Confidence-moving forecast evidence must include MAE, MAPE, RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, and champion/challenger diagnostics. |
| Route-specific confidence diagnostic guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | TIER, credit, billing, asset, security, regulatory, large-load, and API rows could move confidence with shallow route-agnostic wording. | Confidence-moving evidence must include the diagnostic terms required for that route; `/pilot-readiness` and `/pilot-evidence` cannot move confidence directly. |
| Route-specific claim-boundary guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A row could move confidence while `claim_boundary` or `do_not_claim` stayed generic, contradictory, or empty-style. | Confidence-moving rows must include buyer/source boundary wording plus route-specific do-not-claim language. |
| Immutable evidence reference guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A confidence-moving row could point at an arbitrary file label with no stable evidence handle. | Confidence-moving `evidence_file_reference` values must include `sha256=<64 hex chars>` or `sha256:<64 hex chars>`. |
| Local evidence-hash verification | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | A stable SHA-256 handle could still point at a file nobody rechecked locally. | Required for the 95% gate; the validator recomputes each confidence-moving artifact hash. |
| Retained-artifact diagnostic guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | The register could contain the right diagnostic words while the retained artifact stayed too thin. | When retained artifacts are supplied, each confidence-moving artifact must also contain the route-specific diagnostic evidence terms. |
| Retained-artifact overclaim guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | A clean register row could hash-reference an artifact that still claimed production utility onboarding, SOC2 certification, live TIER pricing, GPU superiority, regulator approval, or other unsafe positive language. | Retained artifacts are scanned for the same positive overclaim patterns as register row text; keep those risks only in `claim_boundary` or `do_not_claim`. |
| Retained commercial-commitment evidence guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95 --evidence-root path/to/redacted-artifacts` | A row could mark `paid_pilot`, `design_partner_signed`, `purchase_order`, or `letter_of_intent` without the retained artifact proving that commercial signal. | Strong commercial commitment statuses must be supported by the retained local evidence artifact. |
| Retained buyer-coverage evidence guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95 --evidence-root path/to/redacted-artifacts` | A row could record `buyer_data_coverage_pct` while the retained artifact never proves that coverage level. | Accepted confidence-moving rows must have retained artifact text supporting the exact buyer-data coverage percentage. |
| Inspectable retained-artifact guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | Hash-verified PDFs, scans, or opaque binaries could bypass the retained-artifact redaction scan. | Retained evidence must be text-inspectable: CSV, TSV, JSON, JSONL, Markdown, text, HTML, YAML, or a hashed redacted text/Markdown extract for PDF source material. |
| Pilot date and reviewer guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Future-dated or reviewer-anonymous evidence could move confidence. | Confidence-moving rows require a valid non-future `record_date` and a reviewer role. |
| Independent reviewer guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A confidence-moving row could be self-reviewed by the evidence owner or an internal CEIP/demo role. | `reviewer_role` must name an independent buyer or reviewer function and cannot repeat `evidence_owner` or use internal/self-review wording. |
| Exact reviewer status guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Negated phrases such as `not accepted` or `incomplete` could satisfy loose keyword matching. | `reviewer_acceptance` must exactly be `accepted`, `approved`, or `signed`; `reviewer_feedback_status` must exactly be `complete`, `accepted`, `approved`, or `signed`. |
| Exact PII screen guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Negated phrases such as `not screened` could satisfy loose privacy-screen matching. | `pii_screen_result` must exactly be `no personal data`, `no personal data or meter identifiers found`, `redacted`, `screened`, or `not applicable`. |
| Fixture-proof 95% gate | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95` | A fixture, template, or sample register could be mistaken for buyer evidence. | The 95% gate rejects non-production register paths; the fixture override is gated by `CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1` for tests only. |
| 12-month 95% recency gate | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95 --evidence-root path/to/redacted-artifacts` | Old accepted pilot artifacts could satisfy the current strategy-confidence gate even if they no longer prove present market fit. | Accepted confidence-moving buyer evidence for the 95% gate must be no older than 365 days. |
| Proof-pack metadata gate | `pnpm exec vitest run tests/unit/proofPackGates.test.ts` | A forecast, filing, TIER, asset, billing, or security export could omit source manifest, verification status, or do-not-claim metadata without a focused test failing. | Metadata proves claim boundaries, not buyer acceptance. |
| Pilot readiness route | Open `/pilot-readiness` or `/pilot-evidence` | There was no buyer-facing evidence gate showing exactly what inputs are needed before stronger claims. | The route is a checklist until buyer evidence is attached. |
| Pilot outcome scorecard | On `/pilot-readiness`, record `time-to-artifact`, `buyer-data-coverage`, `benchmark-lift-or-diagnostic`, and `reviewer-acceptance` | The 14-day pilot could end with an artifact but no measurable confidence movement. | Scores move only with buyer files, reviewer notes, or paid pilot evidence. |
| TIER CFO memo freshness discipline | Use `/roi-calculator` and keep `pricing.lastVerifiedAt` attached to the proof pack | TIER savings language could drift into stale price or financial-advice framing. | Planning support only; no trading, tax, legal, or guaranteed-savings claims. |
| Credit banking audit pack | Use `/credit-banking` with `id,type,vintage,quantity,purchase_price,purchase_date,expiry_year,status` | CEIP could not produce an allocation/expiry-risk artifact tied to no-broker guardrails. | Not registry certification or purchase advice. |
| Security procurement evidence split | Use `/utility-security` and attach owner-supplied questionnaire/SBOM/header evidence where available | Security copy could blur repo-backed design, deployed evidence, and buyer-owned evidence. | No SOC, legal, privacy, or procurement approval claim. |
| Shadow billing audit trail | Use `/shadow-billing` with `billing_period,consumption_kwh,actual_energy_rate_cents_per_kwh,actual_supply_cost_cad` | Invoice checks lacked a clear field map and included/excluded-cost boundary. | Savings are limited to supplied and mapped fields. |
| Consultant/API evidence gate | Use `/api-docs` with an endpoint freshness matrix, sample export, and notebook starter | The Consultant/API pack was listed in the Top 10 but did not have a matching pilot evidence requirement. | No live-data SLA, production integration, or full OpenAPI parity claim without external proof. |
| Claim-boundary CI guardrail | `pnpm run check:claim-boundaries` | Unsafe phrases could remain in active source/docs without an automated failure, including world-class, avalanche, production, certification, live-price, and AI/GPU overclaims. | Guardrail catches known claim patterns; human review still required for new wording. |

## Intake Schema Cheatsheet

### Utility Load CSV

Required columns:

```csv
timestamp,demand_mw
```

Recommended columns:

```csv
timestamp,geography_level,geography_id,customer_class,demand_mw,customer_count,source_system,quality_flags
```

Acceptance:

- At least 12 monthly rows or 2,000 hourly rows.
- No customer names, account numbers, meter identifiers, addresses, or personal data.
- Source label recorded as `buyer_supplied_anonymized` or `buyer_supplied_confidential`.
- Benchmark appendix includes persistence, seasonal-naive, MAE, MAPE, RMSE, rolling-origin split record, interval coverage, champion/challenger decision, and notes when a baseline wins.

### TIER Facility Assumptions

Required fields:

```csv
facility_id,compliance_year,annual_emissions_tonnes,benchmark_exceedance_tonnes,direct_investment_capex_cad,approval_owner
```

Acceptance:

- Pricing source timestamp is recorded before export.
- Memo separates official fund price, market-credit assumption, and direct-investment uncertainty.
- Export includes do-not-claim metadata for trading, tax, legal, guaranteed savings, and live market price.

### Credit Ledger

Required fields:

```csv
id,type,vintage,quantity,purchase_price,purchase_date,expiry_year,status
```

Acceptance:

- Compliance-year liability file is attached.
- Allocation uses earliest-expiry active lots first unless buyer explicitly changes the policy.
- Export remains an audit-planning artifact, not a broker quote or registry certification.

### Shadow Billing

Required fields:

```csv
billing_period,consumption_kwh,actual_energy_rate_cents_per_kwh,actual_supply_cost_cad
```

Recommended fields:

```csv
fixed_charge_cad,retailer_name,rolr_rate_cents_per_kwh,pool_price_cents_per_kwh,invoice_reference
```

Acceptance:

- Field map identifies source columns and excluded riders/tariff elements.
- Savings claim is limited to the included fields.
- Audit note explains what was not reconstructed.

### Consultant/API Data Pack

Required evidence:

```csv
route,source_surface,freshness_state,best_use
```

Recommended evidence:

```csv
route,source_surface,freshness_state,is_fallback,sample_payload_reference,openapi_parity_note,buyer_workflow
```

Acceptance:

- Select only 5-10 endpoints tied to one analyst workflow.
- Freshness matrix identifies source surface, freshness state, fallback status, and best use.
- Sample payload/export contains only public, fallback-labelled, or buyer-approved non-sensitive fields.
- Do not claim live-data SLA, production buyer integration, or OpenAPI parity across every endpoint without external evidence.

## 14-Day Pilot Acceptance Plan

| Day | Activity | Output | Pass condition |
|---:|---|---|---|
| 0 | Buyer fit gate | buyer lane, route, proof pack, evidence owner, claim boundary | buyer has a budget-owned workflow and can supply data |
| 1-2 | Evidence intake | anonymized files and source manifest | no PII/secrets; required columns present |
| 3-5 | First artifact run | forecast/TIER/billing/asset/security proof pack | artifact exports with manifest, assumptions, warnings, do-not-claim |
| 6-8 | Reviewer loop | buyer notes and correction log | at least one real reviewer comment recorded |
| 9-11 | Revised proof pack | updated export and benchmark/provenance appendix | buyer can explain the artifact internally |
| 12-13 | Decision memo | pilot outcome memo | one of: proceed, park, pivot, or reject with reason |
| 14 | Confidence update | readiness score and evidence summary | evidence table updated; no unsupported claim added |

## Pilot Outcome Scorecard

| Metric | Required evidence | Measurement syntax | Confidence use |
|---|---|---|---|
| Time to first reviewable artifact | Timestamped intake file plus exported proof pack or memo | Count business hours from accepted evidence intake to first export shared with the buyer reviewer | Proves the solo-developer wedge is fast to pilot; target is two business days for clean CSV evidence |
| Buyer data coverage | Coverage summary showing required columns, date range, missing rows, and source labels | accepted rows or fields divided by the minimum required schema for the selected proof pack | Prevents constructed or partial samples from being treated as buyer-specific proof |
| Benchmark lift or diagnostic value | Benchmark appendix with persistence, seasonal-naive, buyer baseline when supplied, rolling-origin splits, interval coverage, champion/challenger decision, and failure notes | record MAE, MAPE, RMSE, rolling-origin split count, interval coverage, and whether CEIP beats or explains the baseline | Moves forecasting confidence only when the result is reviewable, even if a baseline wins |
| Reviewer acceptance | Named reviewer comment, correction log, and day-14 proceed/park/reject decision | track whether the buyer reviewer can explain and reuse the artifact internally after one revision loop | Converts route readiness into market confidence without relying on broad platform claims |

## Confidence Upgrade Rules

| Evidence achieved | Confidence movement allowed |
|---|---|
| Public-system or constructed sample only | stay at current route readiness; do not increase market confidence |
| One buyer file supplied but no reviewer feedback | increase only the specific feature by up to 0.2/5 |
| One buyer file plus accepted artifact | increase the specific feature by up to 0.4/5 |
| Three buyer artifacts across utility, TIER, and billing/security | strategy confidence can move toward 95% if claim-boundary checks remain clean |
| Paid pilot or signed design-partner letter | market confidence can be upgraded only with route-specific evidence attached |

## Evidence Register Template

Use the machine-readable register template at [growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv](./growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv). The template is intentionally buyer-evidence oriented and excludes direct identifiers such as account numbers, meter identifiers, customer names, addresses, secrets, tokens, and passwords.

Use only these canonical `proof_pack_id` values. The validator rejects confidence-moving rows where the `proof_pack_id` does not match the route.

| `proof_pack_id` | Route |
|---|---|
| `utility_forecast_planning_pack` | `/utility-demand-forecast` |
| `forecast_benchmark_provenance` | `/forecast-benchmarking` |
| `regulatory_filing_pack` | `/regulatory-filing` |
| `tier_cfo_savings_pack` | `/roi-calculator` |
| `tier_credit_banking_audit_pack` | `/credit-banking` |
| `asset_health_capex_pack` | `/asset-health` |
| `utility_security_procurement_pack` | `/utility-security` |
| `shadow_billing_invoice_pack` | `/shadow-billing` |
| `large_load_readiness_overlay` | `/ai-datacentres` |
| `consultant_api_data_pack` | `/api-docs` |
| `pilot_readiness_gate` | `/pilot-readiness`, `/pilot-evidence` |

| Date | Buyer lane | Route | Evidence file | Artifact generated | Reviewer feedback | Claim boundary | Decision |
|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | Utility / Industrial / Municipal | `/utility-demand-forecast` | anonymized_load.csv | planning memo + benchmark appendix | pending | public/buyer supplied label attached | proceed / park / reject |

Required scorecard columns in the CSV:

- `time_to_artifact_hours`
- `buyer_data_coverage_pct`
- `commercial_commitment_status`
- `benchmark_lift_or_diagnostic`
- `reviewer_acceptance`

Validate a filled register before changing any feature rating:

```bash
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv
```

The validator blocks confidence increases from public-system, starter, or constructed rows; caps one-row feature movement at `0.4`; requires buyer-supplied source labels for any positive `confidence_delta`; requires an exact privacy screen status; requires a controlled `commercial_commitment_status`; requires a valid non-future `record_date`; requires reviewer role plus exact `reviewer_acceptance` of `accepted`, `approved`, or `signed` for confidence-moving rows; requires `reviewer_role` to be independent from `evidence_owner`; requires exact `reviewer_feedback_status` of `complete`, `accepted`, `approved`, or `signed`; requires buyer/source boundary wording in `claim_boundary`; requires route-specific `do_not_claim` terms; rejects positive overclaims in evidence-row text such as world-class, accurate avalanche prediction, production utility onboarding, SOC2 certified, live TIER price, guaranteed savings, AI/GPU superiority, engineering approval, or regulator submission automation; requires immutable `sha256=<64 hex chars>` or `sha256:<64 hex chars>` evidence references for confidence-moving rows; and requires MAE, MAPE, RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, and champion/challenger diagnostics before utility forecast or forecast-benchmarking evidence can move confidence. If redacted local artifacts are available, add `--evidence-root path/to/redacted-artifacts` so the validator recomputes and compares the referenced SHA-256 values, requires text-inspectable retained artifact formats, scans retained artifacts for the same route-specific diagnostic evidence, scans retained artifacts for positive overclaims, scans retained artifacts for strong commercial-commitment evidence and exact buyer-data coverage support when `--require-95` is used, and scans the retained artifacts for direct-identifier or credential patterns. For PDF invoices, scans, or buyer memos, retain and hash a redacted `.txt` or `.md` evidence extract rather than the opaque source file.

Confidence-moving rows must also carry route-specific diagnostic evidence:

| Route | Required diagnostic terms |
|---|---|
| `/utility-demand-forecast`, `/forecast-benchmarking` | MAE, MAPE, RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, champion/challenger |
| `/regulatory-filing` | OEB or AUC, mapping, checklist or schedule |
| `/roi-calculator` | pricing source, direct-investment sensitivity, compliance diagnostic |
| `/credit-banking` | credit lot or vintage, expiry risk, allocation, liability |
| `/shadow-billing` | field map, monthly delta, excluded rider or tariff evidence |
| `/asset-health` | replace/defer, replacement-cost or capex, weight sensitivity |
| `/utility-security` | control matrix, evidence boundary, owner-supplied or deployed evidence split |
| `/ai-datacentres` | assumptions, constraint or capacity, storage or BYOP sensitivity |
| `/api-docs` | endpoint, freshness, OpenAPI |
| `/pilot-readiness`, `/pilot-evidence` | evidence gates only; `confidence_delta` must stay `0` |

Validate the stronger 95% strategy-confidence gate only after a real pilot register has buyer evidence across the required lanes:

```bash
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts
```

The `--require-95` gate refuses a 95% claim unless the register includes accepted buyer-supplied utility forecast evidence with MAE/MAPE/RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, and champion/challenger diagnostics; accepted TIER or credit-banking evidence; accepted shadow-billing or utility-security evidence; at least three distinct proof-pack rows with `day_14_decision=proceed`; distinct locally verified SHA-256 evidence artifacts for each accepted confidence-moving row; at least one accepted commercial commitment signal using `design_partner_signed`, `paid_pilot`, `purchase_order`, or `letter_of_intent`; retained artifact text supporting each strong commercial commitment status; total accepted `confidence_delta >= 0.9`; at least 70% buyer-data coverage on confidence-moving rows; retained artifact text supporting each accepted row's exact `buyer_data_coverage_pct`; `time_to_artifact_hours` recorded on every confidence-moving row; at least one accepted buyer proof pack delivered in 48 hours or less; no accepted confidence-moving row above 120 hours; and a production buyer-evidence register path, not a fixture, template, or sample register. The `--allow-fixture-95` flag exists only for unit tests and requires `CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1`.

The evidence root must contain retained redacted artifacts only. The validator recomputes every confidence-moving hash and fails if a referenced artifact is missing, changed, not text-inspectable, lacks the route-specific diagnostic evidence terms, lacks support for the row's strong commercial commitment or buyer-data coverage when the 95% gate is used, or appears to contain direct identifiers such as emails, phone numbers, account/meter labels, postal codes, addresses, or credential assignments. Allowed retained formats are CSV, TSV, JSON, JSONL, Markdown, text, HTML, and YAML; use a hashed redacted text/Markdown extract for PDF or scanned source material.

## Stop Conditions

Stop or park the pilot if:

- the buyer requires production utility onboarding, engineering approval, broker execution, SOC certification, or regulator submission automation before a pilot;
- source data contains personal data, meter identifiers, account numbers, unapproved customer records, or secrets;
- the buyer cannot name a reviewer or decision owner;
- forecast metrics are weaker than baseline and the buyer cannot accept a diagnostic/learning artifact;
- TIER pricing, legal, tax, or trading advice is required instead of planning support.

## Repo Verification Links

Use these commands before any pilot artifact is shared externally:

```bash
pnpm run check:claim-boundaries
pnpm audit --audit-level moderate
pnpm run check:pilot-evidence-95-fixture-gate
pnpm exec vitest run tests/unit/proofPackGates.test.ts tests/unit/utilityForecastProofPack.test.ts tests/unit/tierProofPack.test.ts tests/unit/shadowBillingProofPack.test.ts tests/unit/utilitySecurityProofPack.test.ts
```

For hosted proof routes:

```bash
TEST_BASE_URL=<preview-or-production-url> PLAYWRIGHT_SKIP_WEBSERVER=true pnpm run test:browser:hosted:phase6
```
