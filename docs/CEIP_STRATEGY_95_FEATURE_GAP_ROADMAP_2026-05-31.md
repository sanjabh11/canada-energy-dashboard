# CEIP Strategy 95 Feature Gap Roadmap

> Date: 2026-05-31
> Scope: Canada Energy Intelligence Platform utility, regulatory, Alberta TIER, and proof-pack strategy.
> Mode: Implementation of the approved audit deliverable. This file reconciles the stale untracked audit with current repo checks, current source anchors, and live-site parity evidence.
> Verdict: 84 / 100 strategy-direction confidence after local proof-boundary hardening. Not 95% until buyer evidence passes the pilot evidence gate.

## 1. Verdict

CEIP should keep the narrow proof-pack strategy: Canadian utility and Alberta TIER evidence packs that turn forecasts, filing support, benchmark transparency, compliance scenarios, credit ledgers, asset triage, security review, billing checks, and large-load assumptions into buyer-ready artifacts.

The strategy direction is strong, but it is not yet a 95% market-confidence claim. Local repo truth is materially stronger than the hosted site: local metadata and claim-boundary scanning are proof-pack aligned, while the hosted Netlify root still serves stale social/SEO metadata. The hard blocker remains buyer evidence: no real filled buyer evidence register was found, so the documented 95% gate cannot pass.

| Dimension | Score | 95% cleared? | Evidence basis | Remaining blocker |
|---|---:|:---:|---|---|
| Repo truth | 93 | No | Commercial routes, proof-pack libs, tests, and guard scripts exist. | Browser/live route smoke after deploy still needed. |
| Implementation status accuracy | 89 | No | Local source, guard scripts, focused unit tests, and production build pass. | Hosted metadata is stale. |
| Proof boundaries | 84 | No | Local `index.html`, `manifest.json`, JSON-LD, and claim guard are aligned. | Hosted root still serves stale overclaims. |
| Niche correctness | 86 | No | IESO, OEB, AUC, Alberta TIER, and incumbent sources support a narrow Canadian evidence-pack wedge. | Buyer willingness-to-pay is not proven. |
| Feature-set completeness | 87 | No | Current top 10 covers planning, forecast trust, filing, TIER, credit, asset, security, billing, large-load, and API packs. | GA/ICI and BYO-CSV proof generator remain roadmap. |
| Uniqueness and defensibility | 80 | No | Differentiation is packaging, Canadian specificity, proof boundaries, and fast pilot artifacts. | Incumbents are stronger in operational forecasting and enterprise integrations. |
| Prediction credibility | 84 | No | Forecast exports include baseline, rolling-origin, interval, and champion/challenger concepts. | No buyer backtest and no multi-public-dataset benchmark pack yet. |
| Marketability and sellability | 72 | No | Buyer pains are plausible and route-aligned. | No accepted buyer row, LOI, design partner, or paid pilot. |
| Feasibility | 88 | No | Most owner-controlled fixes are small and solo-dev feasible. | Buyer data and reviewer acceptance are external dependencies. |
| Gap closeability | 83 | No | Technical gaps are scoped; evidence gap is correctly isolated. | Production deploy and buyer-evidence collection remain open. |

Overall confidence: **84 / 100**. The score can rise to roughly the high 80s after live metadata is clean on Netlify and browser smoke passes. It should not be raised to 95 until buyer evidence passes `pnpm run validate:pilot-evidence -- --require-95 --evidence-root ...`.

## 2. Current Evidence Ledger

| Evidence area | Current result | Proof level | Notes |
|---|---|---|---|
| Claim-boundary guard | `pnpm run check:claim-boundaries` passed for 355 files. | Strong local proof | Guard includes `index.html`, `public/manifest.json`, and `public/schema-webapp.jsonld`. |
| Commercial source guard | `pnpm run check:commercial-source` passed for 9 active docs and 26 historical docs. | Strong local proof | Commercial doc ratings and route mappings are guarded. |
| Focused unit slice | 70 tests passed across 7 files. | Strong local proof | Covered commercial positioning, forecast baselines, utility forecasting, forecast proof pack, regulatory proof pack, proof-pack gates, and pilot evidence validator. |
| Production build | `pnpm run build:prod` succeeded. | Strong local proof | Build created current `dist/index.html`; deploy not performed in this phase. |
| Hosted root HTML | `https://canada-energy.netlify.app/` still returns stale meta. | Strong live proof | Hosted root still contains old broad-platform/social meta copy. |
| Hosted manifest / JSON-LD | `https://canada-energy.netlify.app/manifest.json` and `/schema-webapp.jsonld` still return old broad-platform descriptions. | Strong live proof | Production static assets are stale relative to clean local `public/manifest.json` and `public/schema-webapp.jsonld`. |
| Buyer evidence | No real filled buyer register found. | Critical gap | Fixtures and templates do not count as buyer proof. |

## 3. Market And Source Anchors

| Topic | Source anchor | Strategy implication |
|---|---|---|
| Ontario GA / ICI | IESO Global Adjustment explains that Class A customers pay GA based on their share of the top five Ontario peak demand hours: https://www.ieso.ca/en/Learn/Electricity-Pricing-Explained/Global-Adjustment | A 5CP predictor is a strong candidate, but it must be positioned as decision support until validated with customer load and IESO peak data. |
| Class A eligibility | IESO eligibility page states a customer's peak demand factor is based on contribution to top five peak hours over the May 1-April 30 base period: https://www.ieso.ca/en/Sector-Participants/Settlements/Global-Adjustment-Class-A-Eligibility | The target buyer is a medium/large Ontario customer or advisor, not a generic utility dashboard user. |
| Peak tracking | IESO Peak Tracker monitors forecasted Ontario demand for the next 24 hours: https://www.ieso.ca/peaktracker | Public peak data can support a pilot workflow, but not a guaranteed savings claim. |
| OEB filing pack | OEB filing requirements page lists 2027 distribution application materials and Chapter 5 updates dated 2025-12-16: https://www.oeb.ca/regulatory-rules-and-documents/rules-codes-and-requirements/filing-requirements-transmission-distribution-applications | Filing packs should explicitly track 2027 Chapter 5 and avoid stale schedule language. |
| AUC Rule 005 | AUC Rule 005 covers annual financial and operational reporting, audited statements, reconciliation, schedules, and Commission information requests: https://www.auc.ab.ca/rules/rule005/ | Alberta filing support should stay schedule/reconciliation focused, not regulatory submission automation. |
| Alberta TIER | Alberta TIER page documents compliance options, fall 2025 amendments, direct investment, reporting, verification, and June 30 annual reporting: https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation | TIER outputs need dated source labels and legal/trading/tax boundaries. |
| Amperon | Amperon positions around AI demand forecasts, utilities, public power, C&I, weather, and market workflows: https://www.amperon.co/products/demand-forecasts | CEIP should not compete on broad operational forecasting depth. |
| Itron | Itron grid planning positions around planning, forecasting, and utility-grade grid workflows: https://na.itron.com/products/grid-planning | CEIP should keep large-load/asset work as planning overlays unless reviewed by engineers. |
| UtilityAPI | UtilityAPI UDX and authorization docs cover production data exchange, authorization, intervals, bills, meters, and revoke flows: https://utilityapi.com/products/utility-data-exchange and https://utilityapi.com/docs/api/authorizations | CEIP's Green Button/UtilityAPI work remains sandbox/support-only until production OAuth, audit, revoke, and approval evidence exists. |
| Conformal forecasting | Nixtla documents conformal prediction in StatsForecast: https://nixtlaverse.nixtla.io/statsforecast/docs/tutorials/conformalprediction.html | CEIP's interval coverage direction is defensible, but needs backtests and buyer data before stronger claims. |

## 4. Top 10 Feature Roadmap

| Rank | Feature | Keep/New | Why it matters | Current evidence | Uniqueness angle | Marketability | Prediction impact | Feasibility | Priority |
|---:|---|---|---|---|---|---|---|---|---:|
| 1 | Utility demand forecast planning pack | Keep | Front-door product for LDC/REA/consultant planning. | `/utility-demand-forecast`, `utilityForecasting.ts`, `utilityForecastProofPack.ts`, tests. | Canadian planning pack with source manifest and regulator-readable outputs. | High with buyer data. | High | Medium | 96 |
| 2 | Forecast trust report | Deepen | Buyers need proof before trusting forecasts. | `/forecast-benchmarking`, baseline math, rolling-origin/conformal/champion concepts. | Productizes transparency rather than claiming black-box superiority. | High | Very high | High | 94 |
| 3 | OEB/AUC filing autobinder | Deepen | Filing prep is documentation-heavy and repeatable. | `/regulatory-filing`, `regulatoryTemplates.ts`, `regulatoryProofPack.ts`. | Canadian filing evidence pack for small utilities and consultants. | High | Medium | Medium | 91 |
| 4 | Ontario GA/ICI 5CP predictor | New | ICI participants have a clear high-stakes peak-avoidance job. | Not implemented as a route; source-backed opportunity. | Highly Ontario-specific, forecast-centric, and under-served by broad dashboard tools. | High if narrowly scoped. | Very high | Medium | 89 |
| 5 | Privacy-preserving BYO-CSV proof generator | New | Data sharing is a major adoption blocker. | Existing upload/proof-pack patterns and pilot evidence gate. | In-browser or local-first redacted artifact generation. | High | Medium | Medium | 88 |
| 6 | TIER CFO policy what-if and memo | Deepen | Alberta TIER is a recurring compliance cash decision. | `/roi-calculator`, `tierPricing.ts`, `tierProofPack.ts`. | Source-dated CFO planning memo, not trading advice. | Medium-high | Medium | Medium | 84 |
| 7 | TIER credit banking audit | Keep | Credit expiry/liability decisions need audit trails. | `/credit-banking`, credit proof-pack code and tests. | Paired with TIER memo and no-broker guardrails. | Medium | Low-medium | Medium | 80 |
| 8 | Asset health capex pack | Keep | Small utilities need replace/defer narratives without SCADA. | `/asset-health`, CBRM-lite scoring, proof pack tests. | No-SCADA board memo and filing support. | Medium | Low | High | 78 |
| 9 | Utility security procurement pack | Keep | Security review can block pilot data sharing. | `/utility-security`, security proof-pack code and tests. | Evidence split between repo-backed, deployed, and owner-supplied items. | Medium | Low | High | 76 |
| 10 | Shadow billing invoice proof pack | Keep | Municipal/public buyers need bill field maps and audit trails. | `/shadow-billing`, billing proof-pack tests. | Narrow invoice proof with field exclusions and no guaranteed-savings language. | Medium | Low | High | 72 |

Reserve/support surfaces: large-load/data-centre overlay and consultant/API pack remain useful add-ons, but should not displace the first 10 until buyer evidence changes the ranking.

## 5. Have-Vs-Needed Gap Analysis

| Feature | Have now | Needed for stronger claim | Dependency type | Effort |
|---|---|---|---|---|
| Utility demand forecast pack | Route, source manifest, benchmark/provenance exports, tests. | One anonymized LDC/REA/consultant load file, reviewer baseline, accepted artifact. | Buyer-supplied | External |
| Forecast trust report | Baselines, rolling-origin evidence, conformal interval fields, champion/challenger language. | Multi-public-dataset benchmark pack and buyer backtest appendix. | Owner-controllable then buyer-supplied | 1-2 weeks plus buyer |
| OEB/AUC autobinder | Template helpers and regulatory proof pack. | Refresh against OEB 2027 Chapter 5 and current AUC Rule 005 schedule expectations. | Owner-controllable | 2-5 days |
| GA/ICI 5CP predictor | Source-backed idea only. | Data model, route/proof pack, peak-watch logic, historical backtest, do-not-claim boundaries. | Owner-controllable plus buyer validation | 2-4 weeks |
| BYO-CSV proof generator | Upload/proof-pack and pilot-evidence patterns exist. | Client-side redaction scan, hashable evidence extract, route-specific validation, privacy warnings. | Owner-controllable | 1-3 weeks |
| TIER CFO memo | TIER proof pack and source-dated pricing/freshness concepts. | Current amendment/direct-investment language and current source timestamp in exports. | Owner-controllable | 2-5 days |
| Credit banking | Allocation/expiry-risk support route. | Buyer ledger example, liability input, registry caveats. | Buyer-supplied | External |
| Asset health | CBRM-lite scoring and proof pack. | Buyer fleet subset and replace/defer board memo. | Buyer-supplied | External |
| Utility security | Control/evidence pack. | SBOM, headers, hosting/contact/subprocessor bundle attached per pilot. | Owner-controllable | 2-5 days |
| Shadow billing | Uploaded bill proof route, field map, monthly deltas, audit notes. | One buyer-approved invoice comparison artifact. | Buyer-supplied | External |

## 6. Prediction-Accuracy Uplift Track

Do not claim accurate predictions as a general product property. The near-term goal is a defensible forecast-evidence workflow.

1. Build a multi-public-dataset benchmark pack using public IESO/AESO-style data where available.
2. Keep persistence and seasonal naive baselines mandatory.
3. Record MAE, MAPE, RMSE, rolling-origin split count, interval coverage percentage, and champion/challenger decision in every forecast confidence artifact.
4. Add a failure note when a baseline wins.
5. Treat conformal intervals as uncertainty support, not proof of buyer accuracy.
6. Move confidence only with buyer-supplied load history and independent reviewer acceptance.

## 7. Marketability And Sellability Track

| Buyer proof needed | Minimum accepted evidence | Why it matters |
|---|---|---|
| Utility buyer proof | Redacted load file, benchmark appendix, accepted planning artifact. | Proves the front-door product beyond public samples. |
| Forecast reviewer proof | Buyer baseline or reviewer notes, champion/challenger record. | Prevents superficial forecast claims. |
| TIER buyer proof | Facility assumptions, source-dated compliance memo, reviewer caveats. | Keeps CFO claims grounded. |
| Invoice buyer proof | Extracted bill rows, field map, monthly delta, buyer approval. | Converts shadow billing from constructed proof to customer proof. |
| Security proof | SBOM/headers/hosting/contact/subprocessor evidence. | Reduces procurement friction without implying certification. |
| Commercial signal | Design partner, paid pilot, purchase order, or letter of intent. | Separates useful artifacts from sellability evidence. |

## 8. Phased Implementation Plan

| Phase | Objective | Tasks | Acceptance criteria | Verification | Confidence effect |
|---|---|---|---|---|---|
| A. Live parity | Clear hosted stale metadata and stale static SEO assets. | Deploy current local source after explicit approval; re-fetch live root, manifest, JSON-LD; smoke key routes. | Hosted root, manifest, and JSON-LD no longer contain stale broad-platform, compliance, savings, or unsupported AI copy. | `curl` live root, manifest, JSON-LD, plus browser smoke. | Removes live proof-boundary cap. |
| B. Strategy doc and source alignment | Keep strategy direction current and single-source. | Land this roadmap; optionally link it from commercial source docs after review. | Roadmap reflects current checks and source anchors. | Markdown review and guard checks. | Improves handoff quality. |
| C. Regulatory/TIER currency | Refresh policy-sensitive exports. | Update OEB 2027 Chapter 5 and Alberta TIER amendment/direct-investment notes in roadmap/code docs where surfaced. | Outputs carry current source dates and boundaries. | Regulatory/TIER unit tests and source review. | Improves domain credibility. |
| D. Forecast hardening | Raise technical credibility before buyer pilots. | Multi-dataset benchmark pack; mandatory failure notes; export evidence review. | Forecast artifacts compare against baselines and explain failures. | Focused forecast tests and sample export review. | Raises prediction credibility, not market confidence. |
| E. New wedge prototype | Validate GA/ICI and BYO-CSV as narrow features. | Build GA/ICI planning proof and privacy-preserving BYO-CSV proof generator. | Both are clearly labeled as decision-support workflows. | Unit/component tests and route smoke. | Expands uniqueness if kept bounded. |
| F. Buyer evidence | Unlock 95% gate. | Run pilot intake; collect redacted artifacts; fill register; obtain reviewer acceptance and commercial signal. | `validate:pilot-evidence --require-95 --evidence-root ...` passes. | 95% gate report and retained artifact hash checks. | Only path to 95%. |

## 9. Loophole To Fix Ledger

| Loophole | Current status | Fix |
|---|---|---|
| Hosted copy can imply market leadership or compliance. | Still true on live Netlify root. | Deploy clean local metadata and verify live root. |
| Hosted manifest and JSON-LD can leak old broad-platform claims. | Confirmed on current production static assets. | Verify `/manifest.json` and `/schema-webapp.jsonld` in every release check. |
| A clean local repo can still leave stale production assets live. | Confirmed. | Add live-root, manifest, and JSON-LD fetches to release checklist. |
| Public samples can look like buyer history. | Guarded in docs and proof packs. | Keep public/buyer labels visible in all exports. |
| Forecast metrics can overstate accuracy. | Mitigated by baselines and pilot validator. | Require numeric multi-baseline evidence and failure notes. |
| GA/ICI predictor could imply savings guarantee. | Not implemented. | Label as peak-risk decision support, not savings guarantee. |
| Privacy-preserving BYO-CSV could imply no privacy risk. | Not implemented. | Use redaction, local-only processing language, and no-certification boundaries. |
| TIER policy can change quickly. | Active risk. | Date-stamp all TIER assumptions and refresh before outbound use. |
| UtilityAPI sandbox can be mistaken for production connector approval. | Guarded in docs. | Keep sandbox and revoke/OAuth/audit evidence gaps explicit. |
| Existing tests can prove syntax but not market demand. | True. | Keep buyer-evidence gate separate from build/test status. |
| 95% can be asserted from desk research. | Blocked by policy. | Require real buyer register and retained redacted artifact hashes. |

## 10. Codex Prompts For Next Phases

### Phase A prompt

```text
Implement CEIP live-parity release verification. Confirm local proof-pack metadata and claim-boundary guard still pass, deploy current source only after explicit production approval, then verify https://canada-energy.netlify.app/ root HTML, /manifest.json, and /schema-webapp.jsonld no longer contain stale broad-platform, compliance, or savings claims. Run focused route smoke for /utility-demand-forecast, /forecast-benchmarking, /regulatory-filing, and /pilot-readiness. Do not change buyer-confidence ratings.
```

### Phase C prompt

```text
Refresh CEIP regulatory and TIER currency. Inspect regulatoryTemplates, tierPricing, tierProofPack, regulatoryProofPack, and related docs. Update OEB 2027 Chapter 5 and Alberta TIER fall 2025/direct-investment source language where surfaced. Preserve proof boundaries: planning support only, no legal/tax/trading/compliance opinion. Run regulatory/TIER tests and claim guards.
```

### Phase D prompt

```text
Implement CEIP forecast hardening. Add a multi-public-dataset benchmark artifact path that records MAE, MAPE, RMSE, persistence baseline, seasonal-naive baseline, rolling-origin split count, interval coverage percentage, champion/challenger decision, and failure notes when a baseline wins. Do not claim buyer-specific accuracy without buyer data. Run forecast/proof-pack tests and update the roadmap evidence table.
```

### Phase F prompt

```text
Run CEIP buyer evidence gate. Use only redacted, text-inspectable buyer-approved artifacts outside sensitive originals. Prepare retained extracts with prepare:pilot-evidence-artifact, fill the pilot evidence register, then run report:pilot-evidence-95 and validate:pilot-evidence --require-95 --evidence-root. Do not raise strategy confidence unless the gate passes.
```

## 11. Bottom Line

The right direction is still a narrow Canadian proof-pack product, not a broad energy dashboard or enterprise forecasting platform. Local repo evidence is now strong enough to proceed with a live-parity release and buyer-pilot push. The remaining 95% blocker is not more desk research; it is accepted buyer evidence with hash-verified redacted artifacts and at least one commercial commitment signal.
