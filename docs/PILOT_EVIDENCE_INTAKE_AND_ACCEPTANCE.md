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
| Forecast evidence appendix | `exportUtilityForecastCsv(forecastPackage)` and `report:utility-forecast-benchmark` | Exports did not carry rolling-origin splits, conformal interval coverage, hierarchy reconciliation, benchmark evidence, scale-free error, interval-calibration, and interval-score diagnostics together. | Forecast confidence still needs buyer backtests before stronger market claims. |
| Forecast confidence movement guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A utility forecast or forecast-benchmarking row could move confidence with vague benchmark text. | Confidence-moving forecast evidence must include numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and champion/challenger diagnostics. Public/sample benchmark packs also report seasonal MASE, best-naive scaled MAE, interval calibration gap, width/MAE sharpness, and central 90% interval-score diagnostics as non-buyer adversarial diagnostics. |
| Route-specific confidence diagnostic guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | TIER, credit, billing, asset, security, regulatory, large-load, and API rows could move confidence with shallow route-agnostic wording. | Confidence-moving evidence must include the diagnostic terms required for that route; `/pilot-readiness` and `/pilot-evidence` cannot move confidence directly. |
| Route-specific claim-boundary guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A row could move confidence while `claim_boundary` or `do_not_claim` stayed generic, contradictory, or empty-style. | Confidence-moving rows must include buyer/source boundary wording plus route-specific do-not-claim language. |
| Immutable evidence reference guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A confidence-moving row could point at an arbitrary file label with no stable evidence handle. | Confidence-moving `evidence_file_reference` values must include `sha256=<64 hex chars>` or `sha256:<64 hex chars>`. |
| Local evidence-hash verification | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | A stable SHA-256 handle could still point at a file nobody rechecked locally. | Required for the 95% gate; the validator recomputes each confidence-moving artifact hash. |
| Outreach response log starter | `pnpm run create:outreach-response-log -- --output-dir /tmp/ceip-outreach-response-log` | Operators had to hand-copy the response-log template before starting a clean anonymized collection workspace. | Creates a header-only zero-evidence log plus README instructions; it can validate with zero rows but cannot create buyer evidence or move confidence. |
| Outreach response row appender | `pnpm run append:outreach-response-log-row -- --log-file path/to/outreach-response-log.csv ...` | Operators had to hand-edit CSV rows, which could drift the proof-pack ID, buyer lane, caveat, or direct-identifier screen before validation. | Adds one anonymized outreach row only after a temporary candidate CSV passes the canonical response-log validator. It derives `buyer_lane` and `proof_pack_id` from the selected route and still does not create buyer evidence or move confidence. |
| Outreach response log validator | `pnpm run validate:outreach-response-log -- path/to/outreach-response-log.csv` / `pnpm run plan:outreach-intake -- path/to/outreach-response-log.csv` | Manual outreach replies could stay in unstructured notes with no proof-pack route, caveat, artifact promise, reply status, completed-activity date, or evidence follow-up field. | Anonymized response queue and intake action plan only; it can trigger intake/register actions but does not create buyer evidence or move confidence. |
| Outreach intake action-plan template gate | `pnpm run check:outreach-intake-plan-template` | The non-confidence-moving action-plan path could drift out of release readiness while the base response-log template still passed. | Template smoke only; it proves command wiring, not buyer evidence. |
| Outreach intake packet batch generator | `pnpm run create:outreach-intake-packets -- --log-file path/to/outreach-response-log.csv --output-dir /tmp/ceip-outreach-intake-packets` | Operators had to copy action-plan commands row by row after real outreach created a valid `create_intake_packet` follow-up. | Validates the response log first, then creates route-specific starter packets and a manifest for matching rows only. Generated registers keep `confidence_delta=0` and must fail the 95% gate until real retained buyer artifacts are attached. |
| Buyer evidence readiness report | `pnpm run report:buyer-evidence-readiness -- --root path/to/anonymized-outreach-or-registers --evidence-root path/to/redacted-artifacts` | Operators had to use ad hoc file searches to tell whether Phase F had real non-template buyer-evidence inputs. | Non-mutating readiness scan only; it ignores templates/fixtures/generated paths, validates candidate logs/registers, and reports whether the retained-artifact 95% gate can run. |
| Pilot evidence intake packet generator | `pnpm run create:pilot-evidence-intake-packet -- --route /utility-demand-forecast --output-dir /tmp/ceip-pilot-intake` | Operators had to hand-assemble route-specific starter registers, redaction instructions, and artifact folders before a buyer pilot. | Generates a route-specific starter packet with `confidence_delta=0`; it is intake scaffolding only until real buyer evidence, reviewer acceptance, and retained artifact hashes are attached. |
| Phase F minimum intake bundle generator | `pnpm run create:phase-f-minimum-intake-bundle -- --output-dir /tmp/ceip-phase-f-minimum-intake` | Operators had to manually assemble the three minimum 95% lane packets after reading the readiness map. | Generates one combined starter register plus route packet folders for the minimum Phase F lane mix; all rows start with `confidence_delta=0` and cannot satisfy the 95% gate until real buyer artifacts are attached. |
| Phase F minimum bundle smoke guard | `pnpm run check:phase-f-minimum-intake-bundle` | The minimum starter bundle could drift while the canonical validator and hard gate still looked healthy in isolation. | Temporary smoke check only; it confirms the starter register validates and the hard 95% gate still fails until real retained buyer evidence exists. |
| Retained-artifact diagnostic guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | The register could contain the right diagnostic words while the retained artifact stayed too thin. | When retained artifacts are supplied, each confidence-moving artifact must also contain the route-specific diagnostic evidence terms, and forecast artifacts must include numeric forecast evidence. |
| Retained-artifact overclaim guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | A clean register row could hash-reference an artifact that still claimed production utility onboarding, SOC2 certification, live TIER pricing, GPU superiority, regulator approval, or other unsafe positive language. | Retained artifacts are scanned for the same positive overclaim patterns as register row text; keep those risks only in `claim_boundary` or `do_not_claim`. |
| Retained record-date evidence guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95 --evidence-root path/to/redacted-artifacts` | A row could make old buyer evidence look current by editing `record_date` while the retained artifact never proves that date. | Accepted confidence-moving rows must have retained artifact text supporting the exact `record_date`. |
| Retained privacy-screen evidence guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95 --evidence-root path/to/redacted-artifacts` | A row could mark `pii_screen_result=redacted` while the retained artifact never records the privacy-screen result. | Accepted confidence-moving rows must have retained artifact text supporting the exact `pii_screen_result`. |
| Retained commercial-commitment evidence guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95 --evidence-root path/to/redacted-artifacts` | A row could mark `paid_pilot`, `design_partner_signed`, `purchase_order`, or `letter_of_intent` without the retained artifact proving that commercial signal. | Strong commercial commitment statuses must be supported by the retained local evidence artifact. |
| Retained buyer-coverage evidence guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95 --evidence-root path/to/redacted-artifacts` | A row could record `buyer_data_coverage_pct` while the retained artifact never proves that coverage level. | Accepted confidence-moving rows must have retained artifact text supporting the exact buyer-data coverage percentage. |
| Retained pilot-outcome evidence guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95 --evidence-root path/to/redacted-artifacts` | A row could claim fast artifact delivery, reviewer acceptance, completed feedback, or day-14 proceed while the retained artifact never proves those outcome markers. | Accepted confidence-moving rows must have retained artifact text supporting `time_to_artifact_hours`, `reviewer_acceptance`, `reviewer_feedback_status`, and `day_14_decision=proceed`. |
| Inspectable retained-artifact guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | Hash-verified PDFs, scans, or opaque binaries could bypass the retained-artifact redaction scan. | Retained evidence must be text-inspectable: CSV, TSV, JSON, JSONL, Markdown, text, HTML, YAML, or a hashed redacted text/Markdown extract for PDF source material. |
| Retained-artifact preparation helper | `pnpm run prepare:pilot-evidence-artifact -- --evidence-root path/to/redacted-artifacts --artifact-file redacted-utility.md --route /utility-demand-forecast --proof-pack-id utility_forecast_planning_pack ...` | Operators could hand-write evidence extracts that omit exact validator support fields or accidentally include direct identifiers. | The helper writes a redacted text extract, rejects direct identifiers and thin route diagnostics, computes SHA-256, and prints the register-ready `evidence_file_reference`. |
| Pilot evidence register row updater | `pnpm run update:pilot-evidence-register-row -- --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --evidence-file-reference artifact.md#sha256=... --confidence-delta 0.3 --output-file path/to/updated.csv` | Operators had to hand-edit CSV rows after artifact preparation, creating hash, field-copy, route-prefix, and claim-boundary drift risk. | Recomputes the retained artifact hash, copies only artifact-supported fields into the matching route/proof-pack row, supports route-local `--artifact-root` folders inside a top-level Phase F evidence root, requires explicit `confidence_delta`, and validates the candidate register before writing output. |
| Forecast trust retained-extract helper | `pnpm run prepare:forecast-trust-report-artifact -- --benchmark-pack-file path/to/utility-forecast-benchmark-pack.json --evidence-root path/to/redacted-artifacts --artifact-file forecast-trust-retained.md --proof-pack-id forecast_benchmark_provenance ...` | Forecast trust rows could be hand-written from keyword prose and drift from actual benchmark-pack metrics. | The helper converts benchmark-pack JSON into a hashable retained extract with numeric MAE, MAPE, RMSE, persistence, seasonal-naive, rolling-origin, interval coverage, central 90% interval-score, and champion/challenger diagnostics. |
| 95% readiness report | `pnpm run report:pilot-evidence-95 -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | The hard gate could fail without giving an operator-grade view of which buyer-evidence lanes are still missing. | The report prints pass/fail checks, evidence counts, and next actions while preserving the same nonzero failure behavior as the 95% gate. |
| Pilot date and reviewer guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Future-dated or reviewer-anonymous evidence could move confidence. | Confidence-moving rows require a valid non-future `record_date` and a reviewer role. |
| Independent reviewer guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A confidence-moving row could be self-reviewed by the evidence owner or an internal CEIP/demo role. | `reviewer_role` must name an independent buyer or reviewer function and cannot repeat `evidence_owner` or use internal/self-review wording. |
| Exact reviewer status guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Negated phrases such as `not accepted` or `incomplete` could satisfy loose keyword matching. | `reviewer_acceptance` must exactly be `accepted`, `approved`, or `signed`; `reviewer_feedback_status` must exactly be `complete`, `accepted`, `approved`, or `signed`. |
| Exact PII screen guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Negated phrases such as `not screened` could satisfy loose privacy-screen matching. | `pii_screen_result` must exactly be `no personal data`, `no personal data or meter identifiers found`, `redacted`, `screened`, or `not applicable`. |
| Register direct-identifier guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A register row could retain emails, phone numbers, account/meter labels, postal codes, addresses, or credentials even when attached artifacts were redacted. | Filled registers must stay redacted; store sensitive originals outside this repo and reference only sanitized evidence handles. |
| GA/ICI retained-extract helper | `pnpm run prepare:ga-ici-5cp-artifact -- --customer-load-file path/to/redacted-load.csv --peak-tracker-file path/to/ieso-peak-tracker.md --proof-pack-id ga_ici_5cp_decision_support_pack ...` | A GA/ICI row could be hand-written without source-dated peak windows, base-period filtering, or load coverage. | The helper creates a hashable retained extract from redacted interval load plus IESO peak-window inputs, with decision-support and no-savings boundaries. |
| BYO-CSV retained-extract helper | `pnpm run prepare:byo-csv-proof-artifact -- --csv-file path/to/redacted-local.csv --proof-pack-id byo_csv_privacy_proof_pack ...` | A CSV could mask cell values while still retaining unsafe headers such as `customer_name`, `phone_number`, `service_address`, `meter_id`, or `secret_token`. | The BYO-CSV helper blocks direct-identifier headers, spreadsheet formula risk, and raw-value retention before writing confidence-gate-ready retained extracts. |
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
- Benchmark appendix includes numeric persistence, seasonal-naive, MAE, MAPE, RMSE, rolling-origin split count, interval coverage percentage, central 90% interval score, champion/challenger decision, and notes when a baseline wins.

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
| Benchmark lift or diagnostic value | Benchmark appendix with numeric persistence, seasonal-naive, buyer baseline when supplied, rolling-origin splits, interval coverage, champion/challenger decision, seasonal MASE or best-naive scaled MAE where calculable, interval calibration/sharpness/score diagnostics where calculable, and failure notes | record numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and whether CEIP beats or explains the baseline | Moves forecasting confidence only when the result is reviewable, even if a baseline wins |
| Reviewer acceptance | Named reviewer comment, correction log, and day-14 proceed/park/reject decision | track whether the buyer reviewer can explain and reuse the artifact internally after one revision loop | Converts route readiness into market confidence without relying on broad platform claims |

## Confidence Upgrade Rules

| Evidence achieved | Confidence movement allowed |
|---|---|
| Public-system or constructed sample only | stay at current route readiness; do not increase market confidence |
| One buyer file supplied but no reviewer feedback | increase only the specific feature by up to 0.2/5 |
| One buyer file plus accepted artifact | increase the specific feature by up to 0.4/5 |
| Three buyer artifacts across utility, TIER, and billing/security | buyer-proven market confidence can move toward 95% if claim-boundary checks remain clean |
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
pnpm run create:outreach-response-log -- --output-dir /tmp/ceip-outreach-response-log
pnpm run append:outreach-response-log-row -- --log-file path/to/outreach-response-log.csv --activity-date 2026-06-01 --channel linkedin --target-label utility_planner_001 --route /utility-demand-forecast --rating 4.5 --variant-id utility_forecast --reply-status interested --response-summary "Buyer asked for a bounded forecast sample." --pain-signal "Load growth planning" --requested-input "anonymized load history" --reviewer-role "utility planning reviewer" --next-action "create intake packet" --pilot-evidence-register-action create_intake_packet
pnpm run validate:outreach-response-log -- path/to/outreach-response-log.csv
pnpm run create:outreach-intake-packets -- --log-file path/to/outreach-response-log.csv --output-dir /tmp/ceip-outreach-intake-packets
pnpm run create:pilot-evidence-intake-packet -- --route /utility-demand-forecast --output-dir /tmp/ceip-pilot-intake
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv
```

Prepare a retained redacted artifact before filling `evidence_file_reference`. Use only already-redacted, buyer-approved summary text; keep source PDFs, raw bills, account-level exports, and sensitive originals outside this repo:

```bash
pnpm run prepare:pilot-evidence-artifact -- \
  --evidence-root path/to/redacted-artifacts \
  --artifact-file redacted-utility-forecast.md \
  --route /utility-demand-forecast \
  --proof-pack-id utility_forecast_planning_pack \
  --record-date 2026-05-31 \
  --pii-screen-result redacted \
  --buyer-data-coverage-pct 90 \
  --time-to-artifact-hours 36 \
  --reviewer-role "utility planning reviewer" \
  --reviewer-acceptance accepted \
  --reviewer-feedback-status complete \
  --day-14-decision proceed \
  --commercial-commitment-status paid_pilot \
  --commercial-commitment-evidence "paid pilot evidence retained in redacted commercial appendix" \
  --claim-boundary "Buyer-supplied redacted planning support only and no production onboarding claim." \
  --do-not-claim "Do not claim utility approval or live telemetry." \
  --diagnostic "MAE 12.4 MW; MAPE 3.8%; RMSE 18.6 MW; persistence MAE 21.3 MW; seasonal-naive MAE 19.9 MW; rolling-origin split count 4; interval coverage 91.2%; CEIP champion vs seasonal-naive challenger."
```

Prefer the register-row updater instead of hand-editing CSV after the helper prints `evidence_file_reference`:

```bash
pnpm run update:pilot-evidence-register-row -- \
  --register-file path/to/pilot-evidence-register-starter.csv \
  --evidence-root path/to/redacted-artifacts \
  --evidence-file-reference redacted-utility-forecast.md#sha256=<hash-from-helper> \
  --confidence-delta "<explicit 0..0.4 confidence movement, or 0 for staging>" \
  --output-file path/to/filled-pilot-evidence-register.csv
```

The updater refuses template or fixture registers, recomputes the retained artifact hash, fails if the route/proof-pack row is ambiguous, and runs `validate:pilot-evidence -- --evidence-root` on the candidate output before writing. The helper and updater are not buyer evidence by themselves; they only make a buyer-approved redacted extract and register row inspectable by the canonical validator.

For a top-level Phase F minimum bundle, keep `--evidence-root` pointed at the bundle directory and pass the route-local `redacted-artifacts/` folder as `--artifact-root`; the updater will write the route-prefixed SHA-256 reference into the top-level register instead of requiring a manual prefix.

For forecast trust rows generated from a benchmark pack, use the metric-derived helper instead of hand-writing diagnostic prose:

```bash
pnpm run prepare:forecast-trust-report-artifact -- \
  --benchmark-pack-file path/to/utility-forecast-benchmark-pack.json \
  --evidence-root path/to/redacted-artifacts \
  --artifact-file forecast-trust-retained.md \
  --proof-pack-id forecast_benchmark_provenance \
  --record-date 2026-05-31 \
  --buyer-data-coverage-pct 90 \
  --time-to-artifact-hours 24 \
  --reviewer-role "utility planning reviewer" \
  --reviewer-acceptance accepted \
  --reviewer-feedback-status complete \
  --day-14-decision proceed \
  --commercial-commitment-status paid_pilot \
  --commercial-commitment-evidence "paid pilot evidence retained in redacted commercial appendix"
```

This helper is also not buyer evidence by itself. It only makes the retained forecast artifact traceable to the benchmark-pack JSON and easier for the validator to inspect.

The validator blocks confidence increases from public-system, starter, or constructed rows; caps one-row feature movement at `0.4`; requires buyer-supplied source labels for any positive `confidence_delta`; requires an exact privacy screen status; requires a controlled `commercial_commitment_status`; requires a valid non-future `record_date`; requires reviewer role plus exact `reviewer_acceptance` of `accepted`, `approved`, or `signed` for confidence-moving rows; requires `reviewer_role` to be independent from `evidence_owner`; requires exact `reviewer_feedback_status` of `complete`, `accepted`, `approved`, or `signed`; requires buyer/source boundary wording in `claim_boundary`; requires route-specific `do_not_claim` terms; rejects positive overclaims in evidence-row text such as world-class, accurate avalanche prediction, production utility onboarding, SOC2 certified, live TIER price, guaranteed savings, AI/GPU superiority, engineering approval, or regulator submission automation; requires immutable `sha256=<64 hex chars>` or `sha256:<64 hex chars>` evidence references for confidence-moving rows; and requires numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and champion/challenger diagnostics before utility forecast or forecast-benchmarking evidence can move confidence. The BYO-CSV proof generator additionally treats direct-identifier header names as blockers even when values are masked, because a masked extract with `customer_name`, `phone_number`, `postal_code`, `service_address`, `meter_id`, or credential columns is still not a clean privacy-review artifact. If redacted local artifacts are available, add `--evidence-root path/to/redacted-artifacts` so the validator recomputes and compares the referenced SHA-256 values, requires text-inspectable retained artifact formats, scans retained artifacts for the same route-specific diagnostic evidence plus numeric forecast evidence where applicable, scans retained artifacts for positive overclaims, scans retained artifacts for exact record-date support, exact privacy-screen support, strong commercial-commitment evidence beyond status-only text, exact buyer-data coverage support, exact time-to-artifact support, reviewer-acceptance support, reviewer-feedback support, and day-14 proceed support when `--require-95` is used, and scans the retained artifacts for direct-identifier or credential patterns. For PDF invoices, scans, or buyer memos, retain and hash a redacted `.txt` or `.md` evidence extract rather than the opaque source file.

Confidence-moving rows must also carry route-specific diagnostic evidence:

| Route | Required diagnostic terms |
|---|---|
| `/utility-demand-forecast`, `/forecast-benchmarking` | numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, champion/challenger |
| `/regulatory-filing` | OEB or AUC, mapping, checklist or schedule |
| `/roi-calculator` | pricing source, direct-investment sensitivity, compliance diagnostic |
| `/credit-banking` | credit lot or vintage, expiry risk, allocation, liability |
| `/shadow-billing` | field map, monthly delta, excluded rider or tariff evidence |
| `/asset-health` | replace/defer, replacement-cost or capex, weight sensitivity |
| `/utility-security` | control matrix, evidence boundary, owner-supplied or deployed evidence split |
| `/ai-datacentres` | assumptions, constraint or capacity, storage or BYOP sensitivity |
| `/api-docs` | endpoint, freshness, OpenAPI |
| `/ga-ici-5cp` | top-five or 5CP, peak demand factor, IESO or Peak Tracker source, decision-support or settlement boundary |
| `/byo-csv-proof` | schema, completeness, direct-identifier screen, spreadsheet formula screen, retained raw values, quasi-identifier or linkage warning, confidence-gate readiness |
| `/pilot-readiness`, `/pilot-evidence` | evidence gates only; `confidence_delta` must stay `0` |

Validate the stronger 95% strategy-confidence gate only after a real pilot register has buyer evidence across the required lanes:

```bash
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts
```

Use the report command before a rating review to see exactly which evidence dimensions are still missing. This command still exits nonzero until the same 95% gate passes:

```bash
pnpm run report:pilot-evidence-95 -- path/to/filled-pilot-evidence-register.csv --evidence-root path/to/redacted-artifacts
```

The `--require-95` gate refuses a 95% claim unless the register includes accepted buyer-supplied utility forecast evidence with numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and champion/challenger diagnostics; accepted TIER or credit-banking evidence; accepted shadow-billing or utility-security evidence; at least three distinct proof-pack rows with `day_14_decision=proceed`; distinct locally verified SHA-256 evidence artifacts for each accepted confidence-moving row; retained artifact text supporting each accepted row's exact `record_date`; retained artifact text supporting each accepted row's exact `pii_screen_result`; at least one accepted commercial commitment signal using `design_partner_signed`, `paid_pilot`, `purchase_order`, or `letter_of_intent`; retained artifact text supporting each strong commercial commitment with redacted agreement, invoice, payment, purchase-order, or LOI evidence rather than status-only text; total accepted `confidence_delta >= 0.9`; at least 70% buyer-data coverage on confidence-moving rows; retained artifact text supporting each accepted row's exact `buyer_data_coverage_pct`; `time_to_artifact_hours` recorded on every confidence-moving row; retained artifact text supporting each accepted row's exact `time_to_artifact_hours`; retained artifact text supporting `reviewer_acceptance`, `reviewer_feedback_status`, and `day_14_decision=proceed`; at least one accepted buyer proof pack delivered in 48 hours or less; no accepted confidence-moving row above 120 hours; and a production buyer-evidence register path, not a fixture, template, or sample register. The `--allow-fixture-95` flag exists only for unit tests and requires `CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1`.

The evidence root must contain retained redacted artifacts only. The validator recomputes every confidence-moving hash and fails if a referenced artifact is missing, changed, not text-inspectable, lacks the route-specific diagnostic evidence terms, lacks support for the row's record date, privacy-screen result, non-status-only strong commercial commitment evidence, buyer-data coverage, time-to-artifact, reviewer acceptance, reviewer feedback, or day-14 proceed decision when the 95% gate is used, or if either the register row values or retained artifact text appear to contain direct identifiers such as emails, phone numbers, account/meter labels, postal codes, addresses, or credential assignments. Allowed retained formats are CSV, TSV, JSON, JSONL, Markdown, text, HTML, and YAML; use a hashed redacted text/Markdown extract for PDF or scanned source material.

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
