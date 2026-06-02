# Canada Energy Intelligence Platform (CEIP)

CEIP is a Canadian utility and Alberta TIER proof-pack product. Its current USP is narrow by design:

> Turn forecasts, filing evidence, benchmark transparency, Ontario GA/ICI peak-risk support, privacy-screened CSV proof, compliance scenarios, credit ledgers, asset triage, security review, and billing checks into buyer-ready artifacts.

This repository should not be positioned as a broad dashboard suite, an enterprise AI/GPU forecasting platform, a production utility connector, a SOC 2 certified system, or an avalanche prediction product. Current market confidence remains bounded until buyer-supplied pilot evidence is accepted through the pilot evidence register.

## Repository Snapshot

CEIP is maintained as an open-source React/TypeScript evidence-pack application with MIT licensing, GitHub Actions CI, 20 workflow definitions, Vitest unit coverage, Playwright route smoke checks, source-anchor verification, proof-pack bundle budgets, claim-boundary gates, and a scripted release-readiness/deploy process. Current public adoption is early-stage, so evaluation should focus on maintainer discipline, reproducible checks, and public-benefit energy workflows rather than stars, forks, or PR backlog.

| Public review signal | Current proof |
|---|---|
| License | MIT, see [LICENSE](LICENSE). |
| About metadata | GitHub description, homepage, license, and discovery topics are checked by `pnpm run check:github-repo-metadata`. |
| CI and scheduled operations | 20 workflow files under `.github/workflows/`, including CI plus data/cron/train jobs. |
| Release readiness | `pnpm run check:release-readiness` combines claim, source, pilot-evidence, unit, browser, build, metadata, and bundle-budget gates. |
| Runtime smoke | `pnpm run test:browser:phase6` and `pnpm run test:browser:hosted:proof-packs` cover local and hosted proof-pack routes. |
| Claim discipline | `pnpm run check:claim-boundaries` and `pnpm run check:commercial-source` keep public positioning bounded to decision support, proof packs, workflow prototypes, and buyer-evidence gates. |
| Repo hygiene | `pnpm run check:repo-hygiene` blocks scaffold package names, missing license metadata, and tracked local artifacts such as `.DS_Store`, logs, zipped dumps, `Secrets`, Playwright reports, and test results. |

## Current Commercial Status

| Item | Current state |
|---|---|
| Commercial source of truth | [docs/COMMERCIAL_SOURCE_OF_TRUTH.md](docs/COMMERCIAL_SOURCE_OF_TRUTH.md) |
| Ranked USP and top features | [docs/Top20.md](docs/Top20.md) |
| Current 95% strategy roadmap | [docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md](docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md) |
| Pilot evidence gate | [docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md](docs/PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md) |
| Demo handoff | [docs/MVP_DEMO_FREEZE_HANDOFF.md](docs/MVP_DEMO_FREEZE_HANDOFF.md) |
| Live demo | [https://canada-energy.netlify.app](https://canada-energy.netlify.app) |

The active roadmap now scores desk-research strategy-direction confidence at 95/100 after proof-boundary hardening, incumbent whitespace mapping, radical-feature validation, source-currency work, and P1 live parity. Current P1 live metadata/static parity is achieved; future production deploys still require explicit approval and post-deploy live checks. This is not a 95% market-confidence claim. Buyer-proven market confidence still requires a filled buyer-evidence register to pass:

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
| GitHub repository metadata guard | `pnpm run check:github-repo-metadata` | GitHub About fields could regress to a null description, missing license, missing homepage, or weak discovery topics after the source tree was clean. | Public metadata check only; stars, forks, and watchers remain adoption signals, not repo-readiness gates. |
| Strategy roadmap structure guard | `pnpm run check:strategy-roadmap-doc` | The 95% roadmap could lose required sections, source anchors, top-10 rows, loophole questions, or production/buyer gates. | Structural proof only; it does not create buyer evidence or approve deployment. |
| Strategy completion audit | `pnpm run report:strategy-completion-audit` / `pnpm run check:strategy-completion-audit` | It was easy to confuse completed desk research, live parity, future deploy approval, and buyer evidence gates. | Requirement-by-requirement audit only; it can mark current live parity complete when live checks pass, while buyer-proven market confidence remains external. |
| Strategy source-anchor report | `pnpm run report:strategy-source-anchors` / `pnpm run check:strategy-source-anchors` | Current-source claims could drift if URLs move, block access, local fetch fails, or manual web evidence expires. | Live-fetch plus date-stamped manual web evidence only; human review still controls strategy claims. This gate is part of `check:release-readiness`. |
| Production approval packet | `pnpm run report:production-approval-packet` | Local readiness, source provenance, and live stale-metadata blockers could be discussed from memory instead of current command evidence. | Generates an approval report only; it does not deploy or approve production, and skipped local readiness or non-deployable source provenance cannot be treated as approval-ready. |
| Live static parity guard | `pnpm run check:live-static-parity` | Hosted metadata could lose stale phrases while still not matching the deployed `dist` files. | Static parity only; the production deploy script builds `dist` before deploy, and `check:post-deploy-live` compares the live site against that already-built artifact without rebuilding. |
| Top-10 route consistency guard | `pnpm run check:commercial-source` | A sellable proof pack could keep the right score while pointing to a stale or missing app route. | Proves route registration and allowlist consistency, not buyer adoption. |
| Claim-boundary guard | `pnpm run check:claim-boundaries` | Unsafe phrases in active source/docs could remain unnoticed, including world-class, avalanche, production, certification, live-price, and AI/GPU overclaims. | Known-pattern check, not a legal or compliance review. |
| Proof-pack identity guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A buyer evidence row could use a valid route but arbitrary `proof_pack_id`. | Canonical proof-pack identity is required before confidence can move. |
| Forecast evidence movement guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A utility forecast row could move confidence with vague benchmark text. | Confidence-moving forecast rows require numeric MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, and champion/challenger diagnostics. |
| Route diagnostic movement guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | Non-forecast proof packs could move confidence with generic acceptance text. | TIER, credit, billing, asset, security, regulatory, GA/ICI, BYO-CSV, large-load, and API rows require route-specific diagnostic evidence. |
| Route claim-boundary movement guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A confidence-moving row could carry a generic or contradictory `do_not_claim` field. | Confidence-moving rows require buyer/source boundary wording and route-specific do-not-claim terms. |
| Immutable evidence reference guard | `pnpm run validate:pilot-evidence -- path/to/filled.csv` | A confidence-moving row could point to an arbitrary file label. | Confidence-moving evidence references require a SHA-256 handle. |
| Local evidence-hash verification | `pnpm run validate:pilot-evidence -- path/to/filled.csv --evidence-root path/to/redacted-artifacts` | SHA-256 references were syntactic unless a human checked the redacted evidence file. | Required for the 95% gate; each confidence-moving artifact hash is recomputed and compared. |
| Outreach response log starter | `pnpm run create:outreach-response-log -- --output-dir /tmp/ceip-outreach-response-log` | Operators had to copy the template by hand before recording anonymized buyer activity. | Creates a header-only zero-evidence workspace; it does not create buyer proof or move confidence. |
| Outreach response row appender | `pnpm run append:outreach-response-log-row -- --log-file path/to/outreach-response-log.csv ...` | Operators had to hand-edit CSV rows, which could drift proof-pack identity or retain direct identifiers before validation. | Derives `buyer_lane` and `proof_pack_id` from the route, validates a temporary candidate log, and writes only if the outreach row stays anonymized and bounded. |
| Outreach response log validator | `pnpm run validate:outreach-response-log -- path/to/outreach-response-log.csv` / `pnpm run plan:outreach-intake -- path/to/outreach-response-log.csv` | Manual replies could sit in external notes without proof-pack route, caveat, artifact promise, reply status, chronology checks, or evidence follow-up fields. | Anonymized outreach evidence queue and intake action plan only; it does not create buyer evidence or move confidence. |
| Outreach intake action-plan gate | `pnpm run check:outreach-intake-plan-template` | The action-plan path could drift from the response-log validator while the template check still passed. | Template smoke only; real buyer replies and retained artifacts are still required. |
| Outreach intake packet batch generator | `pnpm run create:outreach-intake-packets -- --log-file path/to/outreach-response-log.csv --output-dir /tmp/ceip-outreach-intake-packets` | Operators had to copy action-plan commands row by row after a valid outreach reply requested intake. | Validates the log, creates route-specific `confidence_delta=0` intake packets for `create_intake_packet` rows, and writes a manifest; no buyer proof or confidence movement is created. |
| Pilot evidence intake packet generator | `pnpm run create:pilot-evidence-intake-packet -- --route /utility-demand-forecast --output-dir /tmp/ceip-pilot-intake` | Operators had to hand-assemble route-specific starter registers, redaction notes, and artifact folders before a buyer pilot. | Generates a non-confidence-moving starter packet only; real buyer evidence, reviewer acceptance, and retained artifact hashes are still required. |
| Phase F minimum intake bundle generator | `pnpm run create:phase-f-minimum-intake-bundle -- --output-dir /tmp/ceip-phase-f-minimum-intake` | Operators had to manually run and reconcile the three minimum 95% lane packets after reading the readiness map. | Generates a combined `confidence_delta=0` starter bundle for the minimum lane mix only; it is not buyer proof and the 95% gate must still fail until real retained artifacts are attached. |
| Phase F minimum bundle smoke guard | `pnpm run check:phase-f-minimum-intake-bundle` | The minimum starter bundle could drift while individual intake-packet tests still passed. | Generates a temporary bundle, validates the starter register, and proves the hard 95% gate still fails without real buyer evidence. |
| Phase F evidence workspace generator | `pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence` | Operators had to manually create an outreach log, minimum bundle, manifest, and readiness report before collecting buyer evidence. | Generates one collection workspace only: outreach log, three-lane starter bundle, manifest, and hard-gate check. It creates no buyer proof and records no confidence movement. |
| Phase F evidence workspace report | `pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence` / `pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv` | Operators had to infer workspace status and next commands from a long readiness report, and updated registers could be checked separately from the original starter register. | Validates the workspace, summarizes readiness counts, prints hard-gate blockers, can hard-gate an explicit updated candidate register inside the workspace, and gives next commands without creating buyer proof or confidence movement. |
| Forecast trust retained extract helper | `pnpm run prepare:forecast-trust-report-artifact -- --benchmark-pack-file path/to/pack.json ...` | Forecast trust report rows could be hand-written from keyword prose instead of generated from benchmark-pack metrics. | Produces hashable retained extracts with numeric forecast diagnostics and buyer-evidence outcome fields; still not buyer evidence by itself. |
| Pilot evidence register row updater | `pnpm run update:pilot-evidence-register-row -- --register-file path/to/register.csv --evidence-root path/to/redacted-artifacts --evidence-file-reference artifact.md#sha256=... --confidence-delta 0.3 --output-file path/to/updated.csv` | Operators had to paste retained artifact hashes, route prefixes, and supported outcome fields into CSV rows by hand. | Recomputes the retained artifact hash, copies only artifact-supported fields into the matching route/proof-pack row, supports route-local `--artifact-root` folders inside top-level Phase F bundles, requires explicit confidence movement, and validates the candidate register before writing output. |
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
pnpm run check:strategy-roadmap-doc
pnpm run report:strategy-completion-audit
pnpm run check:strategy-completion-audit
pnpm run report:strategy-source-anchors
pnpm run check:strategy-source-anchors
pnpm run test:strategy-audit-slice
pnpm run check:release-readiness
```

For the proof-pack browser smoke:

```bash
pnpm run test:browser:phase6
```

Before asking for explicit production approval, generate the current approval packet:

```bash
pnpm run report:production-approval-packet
```

After an explicitly approved production deploy, run the live parity gate:

```bash
pnpm run check:post-deploy-live
```

For a filled buyer register:

```bash
pnpm run create:outreach-response-log -- --output-dir /tmp/ceip-outreach-response-log
pnpm run append:outreach-response-log-row -- --log-file path/to/outreach-response-log.csv --activity-date 2026-06-01 --channel linkedin --target-label utility_planner_001 --route /utility-demand-forecast --rating 4.5 --variant-id utility_forecast --reply-status interested --response-summary "Buyer asked for a bounded forecast sample." --pain-signal "Load growth planning" --requested-input "anonymized load history" --reviewer-role "utility planning reviewer" --next-action "create intake packet" --pilot-evidence-register-action create_intake_packet
pnpm run validate:outreach-response-log -- path/to/outreach-response-log.csv
pnpm run plan:outreach-intake -- path/to/outreach-response-log.csv
pnpm run create:outreach-intake-packets -- --log-file path/to/outreach-response-log.csv --output-dir /tmp/ceip-outreach-intake-packets
pnpm run create:pilot-evidence-intake-packet -- --route /utility-demand-forecast --output-dir /tmp/ceip-pilot-intake
pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence
pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence
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
