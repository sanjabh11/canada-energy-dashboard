# CEIP Strategy Confidence Audit

> Date: May 30, 2026
> Scope: Canada Energy Intelligence Platform utility, regulatory, and Alberta TIER proof-pack strategy
> Verdict: 90-92% confidence in strategy fit; not 95% confidence in market outcome until buyer-supplied proof exists.
> Evidence intake: use [PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md](./PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md) before increasing confidence beyond this audit.
> 95% gate: a filled buyer-evidence register must pass `pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95`.

## Bottom Line

CEIP should continue to lead with this narrow USP:

**Canadian utility and Alberta TIER proof packs that turn forecasts, filing evidence, benchmark transparency, compliance scenarios, credit ledgers, asset triage, security review, billing checks, and large-load assumptions into buyer-ready artifacts.**

This is the right solo-developer wedge because CEIP can be specific, transparent, source-labeled, and fast to pilot. It should not compete head-on with enterprise operational AI forecasting, power-flow engines, production utility data exchanges, or certified sovereignty infrastructure.

## May 30, 2026 Recheck

Verdict after rechecking the current repo and current external market evidence: **not yet 95% market confidence**. The strategy remains the right target, but the confidence ceiling stays below 95% until accepted buyer evidence exists. The repo-controlled loophole found in this pass was the root `README.md` and retired `COMMIT_MESSAGE.txt`, which still carried older broad-platform, production-readiness, award-readiness, and high-score language. They have been realigned or marked reconcile-first, and `pnpm run check:commercial-source` now governs the root README and retired commit-message artifact.

| Rechecked area | Current evidence | Strategy implication |
|---|---|---|
| Enterprise forecasting incumbents | [Amperon demand forecasts](https://www.amperon.co/products/demand-forecasts) still position around AI forecasting, weather depth, APIs, hourly/sub-hourly updates, and security posture. | CEIP should not lead with generic AI or GPU forecasting; the sellable wedge is transparent Canadian planning evidence and exports. |
| Deep grid planning incumbents | [Itron/Snowflake grid planning](https://na.itron.com/w/itron-and-snowflake-collaborate-to-advance-grid-planning-with-ai-powered-data-cloud) positions around validated data, advanced forecasting, and 8,760-hour bus-level power-flow analysis. | CEIP should keep large-load and asset workflows as planning overlays, not engineering approval or power-flow substitutes. |
| Distribution filing evidence | [OEB Chapter 5](https://www.oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications) and [AUC Rule 005](https://www.auc.ab.ca/rules/rule005/) remain schedule, evidence, reconciliation, and documentation heavy. | OEB/AUC filing packs are still commercially sensible as reviewer artifacts for consultants and smaller utilities. |
| Ontario demand planning data | [IESO Annual Planning Outlook](https://www.ieso.ca/Sector-Participants/Planning-and-Forecasting/Annual-Planning-Outlook) continues to publish planning outlook data and demand methodology. | Public-source sample workflows are useful, but buyer LDC/REA history remains required before stronger forecast claims. |
| Alberta industrial carbon policy | [Alberta TIER](https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation.aspx) remains assumption-sensitive, especially around direct investment and compliance pathways. | TIER outputs must stay source-dated CFO planning memos with no trading, tax, legal, or guaranteed-savings framing. |
| Utility data exchange bar | [UtilityAPI UDX](https://utilityapi.com/products/utility-data-exchange) and [authorization revocation docs](https://utilityapi.com/docs/api/authorizations) show OAuth-style consent, revocation, audit, and deployment expectations. | CEIP's UtilityAPI/Green Button work must remain sandbox/support-only until real approval and audit evidence exists. |
| Bill-audit workflow bar | [EnergyCAP bill auditing](https://www.energycap.com/product-features/utility-bill-auditing-software/) emphasizes audit rules, flagged bills, actions, notes, audit logs, and cost recovery. | Shadow billing should be sold only when field mapping, audit trail, approval notes, and savings boundaries are visible. |
| Forecast uncertainty practice | [Nixtla conformal prediction docs](https://nixtlaverse.nixtla.io/statsforecast/docs/tutorials/ConformalPrediction) support conformal interval use for uncertainty quantification. | CEIP's CPU/statistical forecast-evidence layer is directionally sound; buyer backtests still decide whether it is market-valid. |
| Route and evidence allowlist drift | `pnpm run check:commercial-source` now checks that each top-10 commercial `href` and `proofHref` in `src/lib/commercialPositioning.ts` exists in `src/App.tsx`, and that top-10 evidence routes remain allowed in `scripts/validate-pilot-evidence-register.mjs`. | The sellable-feature list is less likely to become a documentation-only promise disconnected from actual routes. |
| Proof-pack identity drift | `pnpm run validate:pilot-evidence -- path/to/register.csv` now rejects arbitrary `proof_pack_id` values that do not match the selected top-10 route. | A filled register cannot satisfy confidence gates with a valid route but unrelated proof-pack identity. |

## Confidence Ledger

| Claim | Confidence | Evidence | Remaining proof gap |
|---|---:|---|---|
| The selected USP is strategically defensible. | 90-92% | Active routes, proof-pack libraries, PR CI, preview smoke, and current external market evidence support the proof-pack wedge. | Needs buyer conversion and paid pilot evidence. |
| Utility forecasting should stay transparent and proof-pack oriented, not GPU-led. | 90% | Amperon already claims hourly/sub-hourly AI forecasting, APIs, weather depth, and SOC 2 Type II posture: https://www.amperon.co/products/demand-forecasts | Need one buyer dataset backtest to prove CEIP usefulness on local planning workflows. |
| Regulatory filing packs are commercially sensible. | 90% | OEB Chapter 5 and AUC-style workflows are document-heavy and evidence-heavy: https://oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications | Need one annotated reviewer sample pack from a real consultant workflow. |
| TIER CFO and credit-banking packs are a valid adjacent industrial wedge. | 88-90% | Alberta TIER now includes direct-investment changes, reporting, verification, AQM, and compliance support material: https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation | Need refreshed current pricing evidence and one buyer-approved ledger case. |
| Large-load/data-centre overlay should remain support-only. | 85-88% | AESO large-load processes are reliability, market, tariff, connection, and operations heavy: https://aesoengage.aeso.ca/pre-engagement-phase-ii-large-load-integration | Need engineering partner or utility review before stronger claims. |
| UtilityAPI/Green Button must remain sandbox-only. | 92% | UtilityAPI production-grade exchange includes OAuth, consent, revocation, audit logging, and utility onboarding: https://utilityapi.com/products/utility-data-exchange | Need real OAuth approval, audit logs, revocation, and deployment evidence before promotion. |

## Adversarial Loopholes

| Loophole | Why it matters | Current mitigation | Required fix before 95% confidence |
|---|---|---|---|
| Constructed samples can look like customer proof. | Buyers may assume CEIP has deployed utility datasets. | Proof packs and route warnings label public-system, starter, and constructed data. | Add one anonymized buyer-supplied utility load case. |
| Forecast metrics can overstate accuracy if validation is too narrow. | MAE/MAPE/RMSE are not enough unless splits and data lineage are clear. | Utility package includes benchmark/provenance, rolling evidence, conformal intervals, and hierarchy checks. | Add champion/challenger history across at least three buyer or public-source datasets. |
| TIER savings can become financial advice. | Compliance, credit purchases, and direct investment need legal/compliance review. | TIER and credit-banking artifacts include no-broker, no-legal-advice, freshness, and source labels. | Add pricing freshness SOP and buyer-specific validation checklist. |
| Security copy can imply certification. | Utility procurement reviewers will reject unsupported SOC/security claims. | Security proof pack splits repo-backed design, deployed evidence, and owner-supplied boundaries. | Attach SBOM, headers, incident contact, hosting, and subprocessor evidence per pilot. |
| Historical docs and root artifacts can leak old claims. | Older research docs, root README content, or draft commit-message files can carry aggressive OCAP, real-time, high-score, or world-class language into sales copy. | Active source/docs, root README, and governed historical artifacts now have CI/source-of-truth guardrails. | Keep adding reconcile-first banners or rewrites whenever a stale claim-bearing file is reused. |
| Top-10 route drift can create dead sales promises. | A route ID, proof link, or pilot evidence allowlist can drift independently from the public feature table. | Commercial source-of-truth checks now verify top-10 routes against `src/App.tsx` and the pilot-evidence validator. | Keep browser smoke tests and route allowlist checks in CI whenever the top-10 list changes. |
| Proof-pack IDs can be gamed. | A buyer evidence row with an arbitrary ID could previously count toward the "three distinct proof packs" gate if the route looked right. | The pilot-evidence validator now requires canonical `proof_pack_id` values for each route. | Keep canonical IDs aligned with outreach and pilot templates. |
| Forecast confidence can move on weak diagnostics. | A buyer row could previously increase utility forecast confidence with vague benchmark text instead of the full evidence standard. | The pilot-evidence validator now requires MAE, MAPE, RMSE, persistence, and seasonal-naive diagnostics before forecast evidence can move confidence. | Attach the actual benchmark appendix or keep `confidence_delta=0`. |
| Non-forecast confidence can move on generic acceptance text. | TIER, credit, billing, asset, security, regulatory, large-load, and API rows have different evidence standards; a generic "accepted" note is not enough. | The pilot-evidence validator now applies route-specific diagnostic rules and blocks direct confidence movement from `/pilot-readiness` and `/pilot-evidence`. | Attach route-specific diagnostic evidence for every confidence-moving row. |
| Evidence references can be arbitrary labels. | A buyer row can look accepted while pointing at a mutable or unverifiable file name. | Confidence-moving rows now require a SHA-256 handle in `evidence_file_reference`, and `--evidence-root` can recompute hashes for retained redacted artifacts. | Store only redacted or secure references, keep a stable evidence hash, and use local hash verification whenever artifacts can be retained. |
| Evidence can be future-dated or reviewer-anonymous. | A register could imply proof exists before a real pilot happened, or move confidence without a named review function. | Confidence-moving rows now require a valid non-future `record_date` and a reviewer role. | Keep reviewer role and decision owner in every pilot row. |
| Negated reviewer statuses can look accepted. | Loose keyword matching can treat `not accepted` or `incomplete` as accepted evidence. | Reviewer acceptance and feedback status now use exact allowlisted statuses. | Keep status fields controlled, not prose-heavy. |
| One artifact can be reused across proof packs. | Reusing one evidence hash across utility, TIER, and billing/security rows would make the 95% gate look broader than it is. | The 95% gate now requires each accepted confidence-moving row to reference a distinct SHA-256 evidence artifact. | Use separate redacted evidence handles for separate buyer decisions. |
| Test fixtures can be mistaken for market evidence. | A synthetic register can be useful for CI but must never support a public 95% claim. | The `--require-95` gate now rejects fixture, template, and sample paths; the fixture override also requires `CEIP_ALLOW_FIXTURE_95_FOR_TESTS=1`, and CI runs a dedicated fixture-gate check. | Run 95% claims only against a real buyer-evidence register. |
| "World-class" can be misunderstood as enterprise parity. | CEIP cannot match Amperon, Itron, UtilityAPI, or EnergyCAP enterprise depth. | Current strategy defines world-class as a focused proof-pack workflow, not enterprise platform parity; `/pilot-readiness` now includes a pilot outcome scorecard for time-to-artifact, buyer data coverage, benchmark lift/diagnostic value, and reviewer acceptance. | Populate the outcome scorecard with actual pilot evidence before increasing market-confidence claims. |

## Current Top 10 Readiness After Gap Closers

| Rank | Feature | Current sellability confidence | 95% confidence condition |
|---:|---|---:|---|
| 1 | Utility demand forecast planning pack | 4.5/5 | One buyer LDC/REA history file backtested and exported with benchmark appendix. |
| 2 | Forecast benchmarking and provenance | 4.6/5 | Rolling champion/challenger record across multiple datasets. |
| 3 | OEB/AUC filing evidence pack | 4.3/5 | One consultant-reviewed annotated sample pack. |
| 4 | TIER CFO compliance memo | 4.0/5 | Current pricing validation and buyer facility assumptions. |
| 5 | TIER credit banking audit pack | 3.9/5 | Buyer-approved registry ledger and liability import. |
| 6 | Asset health capex pack | 4.1/5 | Buyer-specific replace/defer board memo. |
| 7 | Utility security procurement pack | 4.0/5 | Deployed evidence bundle with SBOM, headers, hosting, contacts, and subprocessor notes. |
| 8 | Shadow billing invoice proof pack | 3.8/5 | One buyer-approved invoice comparison and audit trail. |
| 9 | Large-load/data-centre readiness overlay | 3.2/5 | Utility or engineering partner review of assumptions. |
| 10 | Consultant/API Canadian data pack | 3.1/5 | Endpoint freshness checks and OpenAPI parity evidence. |

## 30-Day Path To 95% Strategy Confidence

1. **Pilot evidence first**
   - Secure one anonymized utility load file, one TIER facility scenario, and one invoice sample using [PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md](./PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md).
   - Produce three buyer-ready artifacts from actual buyer-supplied data.
   - Record benchmark metrics, assumptions, data lineage, buyer feedback, and the pilot outcome scorecard.

2. **Forecast validation hardening**
   - Add champion/challenger records to every utility forecast export.
   - Store rolling split results and interval coverage as export metadata.
   - Include one "why the forecast failed" section when a baseline wins.

3. **TIER validation hardening**
   - Add a source-refresh checklist before any CFO memo is exported.
   - Separate official fund price, market-credit assumption, and direct-investment uncertainty.
   - Keep every artifact labelled as planning support unless a compliance professional signs off.

4. **Procurement evidence**
   - Attach SBOM, security headers, hosting region, incident contact, dependency audit, and data-retention evidence to `/utility-security`.
   - Keep SOC 2, NERC CIP, Green Button certification, and production utility approval as do-not-claim items.

5. **Stale-doc cleanup**
   - Add banners or move old broad-market docs to archive before using them in outreach.
   - Keep `docs/Top20.md`, this audit, and active outreach docs as the commercial source of truth.

## Completion Boundary

This audit does **not** prove 95% market confidence. It proves the current strategy is evidence-backed enough to keep building and selling carefully at about 90-92% strategic confidence. The remaining confidence gap is buyer proof, not more generic feature breadth or another broad platform pivot.
