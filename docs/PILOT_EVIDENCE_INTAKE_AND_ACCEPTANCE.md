# CEIP Pilot Evidence Intake And Acceptance Checklist

> Purpose: convert the remaining 95% confidence gap into a concrete buyer-evidence workflow.
> Scope: utility planning, forecast benchmarking, OEB/AUC filing prep, Alberta TIER, credit banking, asset capex, shadow billing, and utility security.
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
- Benchmark appendix includes persistence, seasonal-naive, MAE, MAPE, RMSE, interval coverage, and notes when a baseline wins.

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

## Confidence Upgrade Rules

| Evidence achieved | Confidence movement allowed |
|---|---|
| Public-system or constructed sample only | stay at current route readiness; do not increase market confidence |
| One buyer file supplied but no reviewer feedback | increase only the specific feature by up to 0.2/5 |
| One buyer file plus accepted artifact | increase the specific feature by up to 0.4/5 |
| Three buyer artifacts across utility, TIER, and billing/security | strategy confidence can move toward 95% if claim-boundary checks remain clean |
| Paid pilot or signed design-partner letter | market confidence can be upgraded only with route-specific evidence attached |

## Evidence Register Template

| Date | Buyer lane | Route | Evidence file | Artifact generated | Reviewer feedback | Claim boundary | Decision |
|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | Utility / Industrial / Municipal | `/utility-demand-forecast` | anonymized_load.csv | planning memo + benchmark appendix | pending | public/buyer supplied label attached | proceed / park / reject |

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
pnpm exec vitest run tests/unit/proofPackGates.test.ts tests/unit/utilityForecastProofPack.test.ts tests/unit/tierProofPack.test.ts tests/unit/shadowBillingProofPack.test.ts tests/unit/utilitySecurityProofPack.test.ts
```

For hosted proof routes:

```bash
TEST_BASE_URL=<preview-or-production-url> PLAYWRIGHT_SKIP_WEBSERVER=true pnpm run test:browser:hosted:phase6
```
