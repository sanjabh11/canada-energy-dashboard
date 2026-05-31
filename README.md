# Canada Energy Intelligence Platform (CEIP)

CEIP is a Canadian utility and Alberta TIER proof-pack product. Its current USP is narrow by design:

> Turn forecasts, filing evidence, benchmark transparency, Ontario GA/ICI peak-risk support, privacy-screened CSV proof, compliance scenarios, credit ledgers, asset triage, security review, and billing checks into buyer-ready artifacts.

This repository should not be positioned as a broad dashboard suite, an enterprise AI/GPU forecasting platform, a production utility connector, a SOC 2 certified system, or an avalanche prediction product. Current market confidence remains bounded until buyer-supplied pilot evidence is accepted through the pilot evidence register.

## Current Commercial Status

| Item | Current state |
|---|---|
| Commercial source of truth | [docs/COMMERCIAL_SOURCE_OF_TRUTH.md](docs/COMMERCIAL_SOURCE_OF_TRUTH.md) |
| Ranked USP and top features | [docs/Top20.md](docs/Top20.md) |
| Confidence audit | [docs/CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md](docs/CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md) |
| Pilot evidence gate | [docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md](docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md) |
| Demo handoff | [docs/MVP_DEMO_FREEZE_HANDOFF.md](docs/MVP_DEMO_FREEZE_HANDOFF.md) |
| Live demo | [https://canada-energy.netlify.app](https://canada-energy.netlify.app) |

The active roadmap now scores desk-research strategy-direction confidence at 95/100 after proof-boundary hardening, incumbent whitespace mapping, radical-feature validation, and source-currency work. This is not a 95% market-confidence claim. Buyer-proven market confidence still requires a filled buyer-evidence register to pass:

```bash
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts
```

## Top 10 Sellable Proof Packs

| Rank | Proof pack | Route | Current rating | Primary buyer | Boundary |
|---:|---|---|---:|---|---|
| 1 | Utility demand forecast planning pack | `/utility-demand-forecast` | 4.5/5 | LDCs, REAs, utility consultants | Buyer LDC history is required before claiming buyer-specific forecast validity. |
| 2 | Forecast benchmarking and provenance layer | `/forecast-benchmarking` | 4.6/5 | Forecast reviewers, consultants | Benchmark evidence must remain attached to forecast exports. |
| 3 | OEB/AUC regulatory filing packs | `/regulatory-filing` | 4.3/5 | Regulatory teams, consultants | Filing-prep support only; not legal, counsel, or regulator approval. |
| 4 | Ontario GA/ICI 5CP decision-support pack | `/ga-ici-5cp` | 4.2/5 | Ontario Class A industrials, energy managers, advisors | Decision support only; no guaranteed savings, final IESO settlement, eligibility, or curtailment instruction. |
| 5 | Privacy-preserving BYO-CSV proof generator | `/byo-csv-proof` | 4.1/5 | Utility privacy, security, procurement, and planning reviewers | Local/redacted proof only; no PII-free certification, no privacy-risk claim, or production connector approval. |
| 6 | TIER compliance savings pack | `/roi-calculator` | 4.0/5 | Alberta industrial emitters, EPCs | Source-dated planning memo only; not trading, tax, legal, or guaranteed-savings advice. |
| 7 | TIER credit banking audit pack | `/credit-banking` | 3.9/5 | CFOs, compliance leads | Allocation/audit support only; not broker execution or registry certification. |
| 8 | Asset health executive capex pack | `/asset-health` | 4.1/5 | Asset managers, municipal utilities | CBRM-lite planning support only; no SCADA or predictive-maintenance automation claim. |
| 9 | Utility security procurement pack | `/utility-security` | 4.0/5 | Utility security and procurement reviewers | Security review evidence only; no SOC 2 or procurement approval claim. |
| 10 | Shadow billing invoice proof pack | `/shadow-billing` | 3.8/5 | Municipal/public-sector energy managers | Savings are limited to supplied and mapped fields. |

## What This Phase Makes Possible

| New capability | Usage syntax | What was not possible before | Proof boundary |
|---|---|---|---|
| Commercial source-of-truth guard | `pnpm run check:commercial-source` | Active outreach, public positioning, root README, and stale historical docs could drift from the current proof-pack strategy. | Guardrail only; human review still required for new claims. |
| Top-10 route consistency guard | `pnpm run check:commercial-source` | A sellable proof pack could keep the right score while pointing to a stale or missing app route. | Proves route registration and allowlist consistency, not buyer adoption. |
| Claim-boundary guard | `pnpm run check:claim-boundaries` | Unsafe phrases in active source/docs could remain unnoticed, including world-class, avalanche, production, certification, live-price, and AI/GPU overclaims. | Known-pattern check, not a legal or compliance review. |
| Proof-pack identity guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A buyer evidence row could use a valid route but arbitrary `proof_pack_id`. | Canonical proof-pack identity is required before confidence can move. |
| Forecast evidence movement guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A utility forecast row could move confidence with vague benchmark text. | Confidence-moving forecast rows require numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and champion/challenger diagnostics. |
| Route diagnostic movement guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Non-forecast proof packs could move confidence with generic acceptance text. | TIER, credit, billing, asset, security, regulatory, GA/ICI, BYO-CSV, large-load, and API rows require route-specific diagnostic evidence. |
| Route claim-boundary movement guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A confidence-moving row could carry a generic or contradictory `do_not_claim` field. | Confidence-moving rows require buyer/source boundary wording and route-specific do-not-claim terms. |
| Immutable evidence reference guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A confidence-moving row could point to an arbitrary file label. | Confidence-moving evidence references require a SHA-256 handle. |
| Local evidence-hash verification | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | SHA-256 references were syntactic unless a human checked the redacted evidence file. | Required for the 95% gate; each confidence-moving artifact hash is recomputed and compared. |
| Forecast trust retained extract helper | `pnpm run prepare:forecast-trust-report-artifact -- --benchmark-pack-file path/to/pack.json ...` | Forecast trust report rows could be hand-written from keyword prose instead of generated from benchmark-pack metrics. | Produces hashable retained extracts with numeric forecast diagnostics and buyer-evidence outcome fields; still not buyer evidence by itself. |
| Pilot date and reviewer guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Future-dated or reviewer-anonymous rows could move confidence. | Confidence-moving rows require a non-future valid date and reviewer role. |
| Exact reviewer status guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Phrases like `not accepted` or `incomplete` could satisfy loose keyword matching. | Confidence-moving rows require exact reviewer statuses: `accepted`, `approved`, or `signed`; feedback status must be `complete`, `accepted`, `approved`, or `signed`. |
| Exact PII screen guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Phrases like `not screened` could satisfy loose privacy-screen matching. | `pii_screen_result` must exactly be `no personal data`, `no personal data or meter identifiers found`, `redacted`, `screened`, or `not applicable`. |
| Register direct-identifier guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A register row could include emails, phone numbers, account/meter labels, postal codes, addresses, or credentials even when retained artifacts were redacted. | Pilot evidence registers must stay redacted; sensitive originals belong outside this repo. |
| Fixture-proof 95% gate | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95` | A synthetic fixture or sample register could be mistaken for buyer evidence. | The 95% gate rejects fixture, template, and sample registers; the fixture override requires `CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1` and is test-only. |
| 95% pilot evidence gate | `pnpm run validate:pilot-evidence -- path/to/filled.csv --require-95 --evidence-root path/to/redacted-artifacts` | A pilot evidence register could pass basic validation without proving enough buyer evidence for a 95% confidence claim. | Requires accepted buyer-supplied evidence across utility forecast, TIER/credit, and billing/security lanes, with distinct locally verified evidence hashes. |
| Public-source utility forecast manifest | `parseIesoPublicDemandCsv(csvText)` then `buildUtilityForecastPackage(rows, { sourceKind: 'public_system_sample' })` | Public-system data could not be converted into a source-labeled planning pack with stable provenance. | Public-system workflow proof only, not customer LDC history. |
| Forecast evidence appendix | `exportUtilityForecastCsv(forecastPackage)` | Forecast exports did not carry benchmark, rolling-origin, interval, hierarchy, and source evidence together. | Buyer-specific accuracy still needs buyer backtests. |
| Proof-pack metadata tests | `pnpm exec vitest run tests/unit/proofPackGates.test.ts` | A proof artifact could omit source manifest, verification status, or do-not-claim metadata without a focused failure. | Metadata proves claim boundaries, not market acceptance. |
| Pilot readiness route | Open `/pilot-readiness` or `/pilot-evidence` | There was no buyer-facing route showing required evidence before stronger claims. | Checklist until buyer files and reviewer acceptance exist. |
| TIER CFO freshness discipline | Use `/roi-calculator` with source-dated assumptions | TIER language could drift toward stale price or financial-advice framing. | Planning support only. |
| Credit banking audit pack | Use `/credit-banking` with credit lot CSV fields | Credit ledger work was not packaged as a paired industrial proof pack. | No broker, registry, or purchase advice. |
| Security procurement evidence split | Use `/utility-security` | Security claims could blur repo-backed design, deployed evidence, and owner-supplied evidence. | No certification or approval claim. |
| Shadow billing audit trail | Use `/shadow-billing` with mapped bill fields | Invoice comparison lacked a clear field map and included/excluded-cost boundary. | Savings are limited to mapped fields. |
| GA/ICI decision-support lane | Use `/ga-ici-5cp` with IESO source notes and buyer interval-load windows | Ontario 5CP was a roadmap idea rather than a current sellable proof-pack lane. | No guaranteed savings, final settlement, eligibility, or curtailment-instruction claim. |
| BYO-CSV privacy proof lane | Use `/byo-csv-proof` with local CSV selection or pasted redacted sample | Data-sharing friction had no self-serve proof artifact. | No PII-free certification, no privacy-risk claim, or production connector approval. |
| Consultant/API evidence lane | Use `/api-docs` with endpoint freshness matrix | Consultant/API remains useful, but now sits behind the top-10 proof-pack lanes. | No full OpenAPI parity or live-data SLA without proof. |

## Local Verification

Install dependencies and run the focused guardrails:

```bash
pnpm install
pnpm run check:commercial-source
pnpm run check:claim-boundaries
pnpm run check:pilot-evidence-95-fixture-gate
pnpm run check:pilot-evidence-template
pnpm run validate:pilot-evidence -- docs/growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv --allow-template
pnpm run build
```

For the proof-pack browser smoke:

```bash
pnpm run test:browser:phase6
```

For a filled buyer register:

```bash
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts
```

The evidence root must contain only retained redacted artifacts. The validator recomputes every confidence-moving hash and fails if a referenced artifact is missing or changed.

## Development

```bash
pnpm install
pnpm run dev
```

Build:

```bash
pnpm run build
```

Run unit tests:

```bash
pnpm run test
```

## Do-Not-Claim List

Do not use this repository to claim:

- production utility onboarding or production utility bridge approval;
- SOC 2 certification, NERC CIP compliance, or certified Indigenous data sovereignty;
- live TIER market pricing, broker execution, tax advice, legal advice, or guaranteed savings;
- power-flow, hosting-capacity, SCADA, ADMS, or engineering approval capability;
- native utility telemetry or customer LDC history without accepted buyer evidence;
- AI/GPU superiority over enterprise forecasting vendors;
- accurate avalanche prediction in this repository.

Avalanche forecasting work belongs in the separate avalanche project, not this CEIP energy dashboard.
