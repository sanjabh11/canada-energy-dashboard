# goal.md — CEIP controlled-pilot objective

## Active Product-Value Sprint — 2026-11-27

**Checkpoint:** `535d7e6` (`chore(checkpoint): preserve overnight audit overlay`)

**Sprint branch:** `codex/product-value-spine-2026-11-27`

**bound HEAD `7d2c549de8eafa8e456526b2cbe5fa94e95fda13` — CI run
> `45996032177`**

**Proof layer:** local implementation plus exact-head CI verification of the
three source jobs. `lint-typecheck`, `test`, and `build-and-smoke` concluded
`success`; `evidence-binding` is the expected pre-rebind staleness failure
because these documents still named the prior receipt when this source run
executed. CI evidence artifact `15196807837` has digest
`sha256:bad759475d931772a417185ab09c0a1f4624986b094b9c17f12c113061f73c95`;
coverage artifact `15195708073` has digest
`sha256:5eb38fc7e091446156e51ffd2724c87b24f540a3b51e5288b5b23dbbe51f2b4c`.
The docs-only rebind is the next receipt; hosted, owner-approved, and
buyer-validated evidence remain unclaimed.

**Excluded local artifacts:** `.fastembed_cache/`, `data.sql`, `roles.sql`, and
`schema.sql` remain untracked by design. The checkpoint includes the tracked
`coverage/lcov.info` deletion and all real code, script, and test files present
in the overlay.

**Objective:** Make CEIP useful enough for a controlled product-value test by
giving a utility reviewer one privacy-preserving, source-dated workflow that
produces a reviewer-ready forecast and benchmark artifact. Keep TIER, municipal,
Whop, hosted Supabase, paid checkout, outreach, and buyer validation bounded as
hypotheses or owner-gated lanes. Never infer market validation from code, tests,
CI, or designed experiments.

**Scope:** collapse `/` into a three-step browser-local utility proof workflow;
add the non-validated CAD pilot/white-label catalog and zero-backend inquiry CTA;
refresh TIER provenance conservatively; update MCCAC and procurement language;
and synchronize the experiment registry to 13 designed / 0 executed.

**Push status:** owner-approved branch push completed for the code commit and
the source correction. No production deploy or hosted mutation was performed.
The docs-only rebind is being created on top of the green source receipt;
its exact-head run must be recorded before claiming the current four-job
document layer.

## Product-value sprint local verification — 2026-11-27

This section records the final local proof layer for the sprint implementation;
it does not replace historical CI receipts and does not claim hosted, owner,
legal, or buyer evidence.

- **Positioning and claims:** strict positioning verifier passed with 0 warnings;
  claim-boundary and commercial-source checks passed.
- **Code and build:** `tsc -b` passed; lint passed with 0 errors and 1,696
  warnings (below the 1,742 baseline); lint-baseline passed; production build
  passed.
- **Focused tests:** the expanded product/pricing/Whop/TIER/positioning and
  unit-aware proof slice passed 132/132 tests; wedge prototype browser tests
  passed 16/16 in Chromium.
- **Product-value smoke:** the browser-local three-step workflow passed 2/2
  Chromium tests, including sample load, privacy/schema blocking, printable
  output, JSON/CSV downloads, no raw CSV request body, and no console/page
  errors.
- **Sample artifact:** `.positioning-audit/artifacts/forecast-benchmark-appendix.pdf`
  is a non-empty PDF beginning with `%PDF-`; SHA-256 is
  `ddbe499e56b64241fd97644b2693f169f145bf827c9ac3c2b3bde81577bb0e22`.
- **Timestamp policy:** local-clock `kWh`/`kW` timestamps are accepted with a
  visible `timezone_ambiguous` warning by default and are rejected by the
  explicit `strictTimezone` option. Date-only, duplicate, non-monotonic,
  irregular, negative, and non-finite energy rows remain blocked.
- **Scope guard:** the sprint diff from checkpoint `535d7e6` contains no changes
  under `supabase/`, `src/components/whop/`, or `.github/workflows/`.
- **Excluded artifacts:** `.fastembed_cache/`, `data.sql`, `roles.sql`, and
  `schema.sql` remain untracked and were not staged. The pushed source receipt
  is `7d2c549de8eafa8e456526b2cbe5fa94e95fda13`.

## Historical exact-head CI receipt — 2026-11-27 (code commit `5f26fa9`)

The exact-head [run 45984013531](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/45984013531)
verified the code commit. Its required verification jobs are green; the
workflow conclusion is failure only because the pre-rebind goal/mission
documents named an older receipt.

The first docs/PDF rebind commit `605a8985a9fb65e6abe9d524bdfc11e1ff47b862`
was then tested by [run 45987365111](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/45987365111).
That run is retained as **failure**: the new audit addendum increased the
documentation inventory from 267 to 268, while the EV-005 snapshot still said
267. The positioning artifacts are corrected in the follow-up docs-only
receipt; no source or product code is being changed for this repair.

| Job | Conclusion | Evidence |
| --- | --- | --- |
| `lint-typecheck` | success | typecheck, lint, dependency, security, claim and positioning gates |
| `test` | success | serial unit tests, coverage and critical-path floors |
| `build-and-smoke` | success | build, five-project browser suites, WCAG/manual-assist and completeness |
| `evidence-binding` | failure | expected stale-document signal before this rebind |

CI evidence artifact: `15191817955`, digest
`sha256:14900d9e218584c3fe31dadb8f324e71aa1c2ab56a7d56a9ee1889b871b01e86`.
Coverage artifact: `15191335629`, digest
`sha256:1a3bbdc5caf6d0769ba518f727fff7771802482f7edafe9681a7c799edf7be9c`.
The PR produced no Netlify Deploy Preview in this run.

## Historical documentation-rebind receipt — 2026-11-27

The prior corrected docs/PDF source `b79b5875dbb0d9a4e8152f55f9cee85d8372d90c`
was verified by [run 45988106846](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/45988106846)
with an exact `head_sha` match. `lint-typecheck`, `test`,
`build-and-smoke`, and `evidence-binding` all concluded `success`. The
positioning inventory correction is therefore CI-verified rather than inferred
from a local document edit. The run's CI evidence artifact is `15193198778`
with digest
`sha256:cd9c4a5f993aa8442e0ca28ab64d218038b78da7d6cdaa7a256506417e402f43`;
the coverage artifact is `15193200714` with digest
`sha256:37a4f1ed08604cccc26c0b0c3d33e8c7605ef981de44cefce1494473966512e6`.
No Netlify Deploy Preview was generated. Repository evidence is defensible at
the exact-head four-job layer; hosted staging and the controlled pilot remain
STOP.

## Corrective source receipt — 2026-11-27

The source correction `d930a2cbd0db9d371f1a466953b9aa758686507a` intentionally
copied the seven approved copy/legal/pricing/test blobs from the audited source
commit and was then corrected by `7d2c549de8eafa8e456526b2cbe5fa94e95fda13`.
The first corrective run `45995260412` is retained as **failure**: its source
jobs reached the test stage, where `uiClaimsDrift.test.ts` correctly caught a
region-neutral starter copy missing the canonical `Ontario GA ICI 5CP` workflow
phrase. No test was weakened and no workflow, Supabase, Whop, or legal scope
was broadened. The follow-up source commit restores that phrase while stating
clearly that the starter is synthetic and not Ontario or Alberta utility
evidence.

The exact-head [run 45996032177](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/45996032177)
for `7d2c549de8eafa8e456526b2cbe5fa94e95fda13` has `lint-typecheck`, `test`,
and `build-and-smoke` green. Its `evidence-binding` failure is the designed
staleness signal that this document-only rebind resolves. CI evidence artifact
`15196807837` has digest
`sha256:bad759475d931772a417185ab09c0a1f4624986b094b9c17f12c113061f73c95`;
coverage artifact `15195708073` has digest
`sha256:5eb38fc7e091446156e51ffd2724c87b24f540a3b51e5288b5b23dbbe51f2b4c`.
The inverse-containment diff from checkpoint `4da02aaf8592e6fbca75276aa0610dbd7af13684`
to this source lists exactly the seven approved paths; the unrestricted
checkpoint-to-`6106405` comparison is historical evidence and is not a reason
to revert the seven legitimate evidence/document differences.

## Prior exact-head CI receipt — 2026-11-27

The earlier exact-head run for code commit `ab8665aa80784ddc607e189a14b91e6971c24360`
was [run 45968420427](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/45968420427)
and concluded **failure**. This is retained as the authoritative receipt for
that commit; it must not be described as an all-green run.

| Job | Conclusion | Evidence |
| --- | --- | --- |
| `lint-typecheck` | success | type/lint/dependency/guard checks completed |
| `test` | success | serial test and coverage job completed |
| `build-and-smoke` | failure | `coverage/lcov.info` missing in this job's workspace |
| `evidence-binding` | failure | expected stale-document signal for the pre-receipt code commit |

The uploaded artifact is `15184832285`, digest
`sha256:be73912efd9b7c8f34b47e966d0f751a5e0fe0d4ba2e25b2c4964dd1640e187c`.
The build-and-smoke browser, automated axe/reflow, and manual-assist phases
completed before the evidence-completeness gate failed. The failure is a
workflow evidence-packaging defect: the separate `test` job creates
`coverage/lcov.info`, while `build-and-smoke` requires that file without
downloading it. Fixing that requires an owner-approved `.github/workflows/`
change and a fresh exact-head run; it was intentionally not changed in this
CTA task.

The remaining `ceip.energy` matches are intentionally deferred legal-page
placeholders and utility-connector test fixtures; the retired pilot placeholder
`pilot-inquiry@ceip.energy` has zero matches under `src` and `tests`.

**At that earlier receipt, still unverified or owner-gated:** hosted Supabase
migration/RLS/function/storage/backup/rollback evidence, Whop deployment
configuration, privacy/CASL approval, manual WCAG review, deployed performance,
and all 13 buyer experiments (0 executed).

## CI evidence-handoff remediation receipt — 2026-11-27

Commit `de3ad813a6ce536876e8cb442bb0a744779ff372` transfers the coverage file
from `test` to `build-and-smoke`, and makes the smoke job depend on `test`.
Its exact-head [run 45973217349](https://github.com/sanjabh11/canada-energy-dashboard/actions/runs/45973217349)
completed with the required verification jobs green. The workflow-level
conclusion is **failure only because `evidence-binding` reports stale documents**;
that job is intentionally separate from release verification.

| Job | Conclusion | Relevant receipt |
| --- | --- | --- |
| `lint-typecheck` | success | all guardrails completed |
| `test` | success | coverage generated and `Upload coverage evidence` passed |
| `build-and-smoke` | success | `Download coverage evidence` and `Verify evidence completeness` passed |
| `evidence-binding` | failure | expected stale-document signal; no source/build failure |

Evidence artifact: `15186369198`, digest
`sha256:4832969d8af5027cca1329bdf7eaff2aba76d1c4d17dbf55de1c7392caed9089`.
Coverage artifact: `15185723653`, digest
`sha256:d20fce7ddecaedb6b75871137c915300029df5eeb02f879e91f1484a09eb3ddc`.
The PR checks show no Netlify deployment; preview status is **not generated**.

The remaining `evidence-binding` failure requires a later evidence-only
document rebind and must not be hidden by this workflow fix. Hosted Supabase,
Whop, privacy/CASL, manual WCAG, deployed performance, and buyer-validation
gates remain open.

## Current authoritative receipt — 2026-10-27

**bound HEAD `8d6096a45ffa08e86519ef24335aee79c6603047` — CI run
> `40462474909`**

The exact-head CI run completed the three verification jobs successfully: `lint-typecheck`, `test`, and `build-and-smoke`. The `evidence-binding` job failed because these documents still named the previous receipt; that is the designed stale-document signal, not a source-test failure. The GitHub artifact API reports artifact `12715637536` (`ci-evidence-7ba2344931812b205125d554d12dca4e5eb95345`) with digest `sha256:33a936157c113df8b6d417779c3a57903fa8545ea22bb325c869310126512da2`. The test job reported 190/190 test files and 1,382/1,382 tests, with the critical-path coverage-floor step successful. The build-and-smoke job completed the production build, browser smoke, automated axe/reflow, manual-assist, evidence-completeness and artifact-upload steps. This is repository/CI evidence only; a fresh local ZIP byte rehash was not independently claimed in this pass because the approved network guard blocked the download command. It does not prove hosted staging, owner approval, manual WCAG conformance, performance, or buyer validation.

The current remote source includes the unified cron-authorisation surface and service-role-only import/backfill contracts. The replacement project has not been treated as hosted proof: no migration, function deployment, storage upload, backup, restore or rollback is inferred from this receipt. The local checkout remains a separate dirty overlay; its deletion of `coverage/lcov.info` and untracked dump/cache files are preserved and are not CI evidence.

## Mission reframe — 2026-10-28 (prediction platform, not only CEIP pilot)

Owner direction: this product is an **energy-prediction platform for learners, researchers, and professionals**. The CEIP/TIER controlled pilot is one optional application, not the definition of the product. A local educational/research demonstration must not be blocked by paid-buyer validation, production deployment, SOC-2-style evidence, or unrelated hosted services.

State is tracked in five separate lanes; a STOP in one lane does not automatically block the others:

| Lane | Status | Basis |
| --- | --- | --- |
| Local sample demo | assessed this cycle | `/utility-demand-forecast` journey (primary), `/forecast-benchmarking` (supporting evidence) — browser/verification receipts below |
| Repository verification | assessed this cycle | `git diff --check`, `tsc -b`, lint, focused Vitest on this exact dirty overlay (not the bound-HEAD CI receipt) |
| Hosted deployment | STOP — not assessed | no cloud mutation performed or claimed; gateway/XFF trust is a hosted-LLM gate |
| Regulated/commercial use | STOP — owner-gated | compliance-year, live-price, and savings claims remain bounded to scenario disclaimers |
| Buyer validation | STOP — owner-gated | no outreach, checkout, or paid-pilot claims |

`/history` stays disabled pending an authenticated, owner-scoped access contract; enabling a demo must not expose service-role report data. Prior controlled-pilot receipts below are preserved as history, not re-stated as current proof.

## Current overlay status — 2026-10-28

### LLM limiter follow-up — local overlay, 2026-10-28

- Unauthenticated `x-user-id` no longer selects a shared quota; missing network identity uses one conservative shared fallback bucket. This can reduce availability for callers without a trusted IP and does not establish gateway trust.
- Invalid limiter counts deny; the LLM caller caps the returned quota at its configured ceiling. `/history` remains unavailable pending a verified access contract.
- Focused `clientId` and `llmRateLimit` tests: 25/25 passed after the quota helper change; `pnpm exec tsc -b --pretty false` passed before that final helper change. These checks do not prove handler/RPC behavior, hosted controls, or CI for a committed tree.
- Independent peer verdict BLOCK: missing handler integration tests, unverified gateway trust, and permissive RPC numeric coercion. Application quota ceiling has focused unit coverage; SQL initialization remains unverified and unchanged.
- STOP: handler-level 429/503 and no-downstream-call tests, SQL quota contract, gateway trust, independent final review, exact-tree CI, staging, owner and buyer evidence remain open.

**Tree:** branch `codex/tier-credit-limit-wedge`, bound HEAD `c41aa2c` plus the dirty TIER-wedge overlay (preserved; single writer). **Owner:** repo agent; next checkpoint = `/ecc-peer` re-review of the final diff, then owner review.

**TIER wedge round B+C hardening — proof layer `implemented` + `locally tested` only.**

- Live-rate boundary validation, `meta?.`/warnings guards, debounced simulator effect, `formatObservedDate`, `tier_lead_submit` post-persist, rejection-event coverage (`TIERROICalculator.tsx`).
- Composed caller-signal + 15s timeout on all three edge fetch helpers (`edge.ts`); key-IP rate-limit bucket (`_shared/rateLimit.ts`).
- Streaming 64 KiB body cap enforced WHILE bytes arrive (cancels on overflow — not a post-hoc length check), JSON-shape 400s, `ml_alert_evaluations` insert-error logging, allowlisted `input_payload` (tier-simulator `index.ts` + `_shared/boundedBody.ts`).
- `numOr`/`coerceFiniteNumber`/`MAX_SCENARIO_NUMERIC`/`MAX_SCENARIO_PRICE` input hardening and engine-level snake_case parity in both scenario engines; `normalizeIsoDate` fallback; caller-over-DB price precedence via `fillTierPriceDefaultsFromRate` (split-container merge normalization exists in the edge handler path only — engine-level precedence semantics are identical on both engines).
- "Net savings vs CEIP fee" label honesty in UI + exported artifacts; compliance-year contract `>=2000` + visible fallback hint; env-override price validation; rates-source price/sort validation; `localStorage` failure-tolerant analytics; real `generatedAt` in BYO exports; tier fallback event param wired (dev-console destination only — by design, not operational telemetry).

**Not verified in this layer:** CI on this exact tree, hosted staging, owner approval, buyer validation — all remain STOP per the proof-layer contract. Fallback telemetry is `import.meta.env.DEV` console output only and must not be cited as monitoring. First-artifact dedupe is session-scoped by design.

### Round D — adversarial-sweep remediation (2026-10-28, same overlay)

A fresh 360-degree adversarial audit of the round-B/C diff returned 10 findings; all agent-addressable items were fixed in-tree and re-verified. Proof layer remains `implemented` + `locally tested` only.

- **Regression fixed:** the `key-ip:` composite bucket key broke `key:`/`ip:` prefix parsing in `lead-capture`, `nl2sql`, and `energy-rag` (both `api_key` and `ip_address` logged null) and wrote key material into `api_usage.ip_address` in `llm/copilot`. `getClientId`/`parseClientId` now live in the pure `_shared/clientId.ts`; all four sites decode via `parseClientId`. Unit-tested (`tests/unit/clientId.test.ts`).
- `tier_lead_submit`/`tier_consultant_lead_submit` on `TIERComplianceLandingPage` now fire post-persist only, matching the calculator semantics; both forms emit `*_rejected` events for `intake_disabled`, `invalid_email`, `missing_name`, `invalid_client_count`, and `persist_failed`.
- Analytics `persistEvent`/`getFunnelEventLog` validate the stored value is an array, not merely parseable JSON — a corrupted `ceip_funnel_events` record can no longer TypeError a user action.
- `computeTierRoiScenario` (`tierCalculations.ts`) clamps inputs to the same `MAX_SCENARIO_NUMERIC`/`MAX_SCENARIO_PRICE` bounds as the engines — a huge-but-finite input can no longer render `Infinity` pathway costs.
- `parsePositiveEnvNumber` bounds env overrides at the same 1e6 cap.
- `sanitizeTierInputPayload` extracted to `_shared/tierInputSanitize.ts` and unit-tested; nested assumption values are now scalar-only as well as key-allowlisted.
- `tier-simulator` fetches up to 5 `tier_market_rates` rows and picks the first with a usable positive price (`tierRateRowHasUsablePrice`) — a malformed newest row can no longer shadow valid older rows; row-side fill requires positive finite values.
- `evaluateRateWatchdog` hardened with `numOr` + `MAX_SCENARIO_NUMERIC` caps in both engines — closes the asymmetric-sweep gap so malformed usage/rate inputs can't emit NaN or Infinity savings.
- Fixed a vacuous test assertion (`tierPricingFreshness.test.ts`) to check the actual `(42% of the CEIP fee)` memo format.

### Round E — peer-reconciled gap closure (2026-10-28, same overlay)

Second peer reconciliation returned a 9-item gap register (P0–P2) with a BLOCK recommendation. Agent-addressable items fixed in-tree; deployment-level verification and owner gates remain STOP. Proof layer remains `implemented` + `locally tested` only.

- **P0 — bounded streaming read:** `req.text()` replaced by `_shared/boundedBody.ts` `readBoundedBody`, which enforces the 64 KiB cap WHILE bytes arrive and cancels the stream on overflow. Tests cover multi-chunk overflow, missing/misleading Content-Length, multibyte UTF-8 (bytes ≠ chars), exact boundary, and mid-flight read failure (`tests/unit/boundedBody.test.ts`).
- **P0 — persisted payload bounds:** `tierInputSanitize` now drops scalar strings over 512 chars (top level) / 64 chars (assumptions); the engine bounds `lastVerifiedAt` strings at 64 chars (finite numbers preserved for parity); the handler byte-checks the serialized `result_payload` before insert. Malicious-input flow test verifies both persisted payloads (`tests/unit/tierHandlerFlow.test.ts`).
- **P0 — price provenance:** `resolveCombinedLastVerifiedAt` stamps `lastVerifiedAt` only when every price is attributable — all-row → row `observed_at`, all-caller → caller date, mixed → the older of the two supplied dates (unparseable counts as unverified/oldest), any engine-default fill → unprovenanced (conservative stale default). A partial DB row can no longer make a fallback price look fresh (`tierHandlerFlow.test.ts`).
- **P1 — XFF trust:** `getClientId` now takes the LAST `x-forwarded-for` hop — a gateway-appended hop cannot be forged by injecting earlier hops — with `x-real-ip` fallback and 64-char bound. Header identity is anti-abuse, not auth; trusted-proxy behavior of the deployed gateway remains an unverified owner/staging gate. Spoof/rotation/malformed coverage in `clientId.test.ts`.
- **P1 — attribution collisions:** 12-char key prefix (which collides across all JWTs sharing a header and leaked key material) replaced by `hashClientKey` — a 64-bit FNV-1a fingerprint — in bucket keys and `api_usage.api_key`. Per-instance limiter scope remains an accepted in-memory limitation.
- **P1 — pricing helper bounds:** `calculateComplianceCosts`/`calculateArbitrageSpread`/`calculateSavingsPercentage` clamp exceedance to 1e12 and prices to 1e6; extremes/zero/fractional covered (`tierPricingBounds.test.ts`).
- **P1 — timeout/abort proof:** caller abort `reason` is forwarded into the composed signal; catch paths rethrow when the composed signal aborted (covers non-AbortError reasons); single `finally` cleanup. Abort/timeout/cleanup/fallback covered (`edgeFetch.test.ts`). `timeoutMs: 0` resolves to the 15 s default — documented. First-artifact session-vs-reload and missing-`performance` semantics pinned (`firstArtifact.test.ts`).
- **P1/P2 — unverifiable from repo:** exact-tree CI, trusted-proxy gateway verification, staging, price-source rights, data stewardship, named approvals, accessibility/performance evidence, buyer outcomes — all remain owner-layer STOP gates.

**Round-E self-audit remediation (`/ecc-peer` pass on the fixed tree):** two real provenance bypasses closed — `last_verified_at` could survive the merged-assumption spread and resurrect a dropped date (both spellings now overwritten), and `!= null` counted malformed caller prices as caller-supplied (now `coerceFiniteNumber`, matching fill precedence). Also: `getReader()` moved inside the result contract (disturbed body → `read_failed`, not a TypeError 500); `tier_market_rates` read errors now logged, not silently defaulted; `timeoutMs` non-finite/negative guarded against instant-abort; `expectEngineParity` now compares `staleness_status`/`confidence_score`/`lastUpdated`; new regression tests assert the ENGINE staleness outcome for snake-key and malformed-price bypass payloads. **Deferred (P2, pre-existing, not introduced by this diff):** `x-real-ip`/last-hop spoof exposure when the gateway does not append XFF (owner staging verification required — code-side best-effort only), in-memory per-instance rate limiting, webhook/authenticated endpoint body bounds (different trust surface), and negative-savings semantics in pricing helpers (mathematically honest output).

**Round-E residual closure (same session):** the deferred P2 items that were agent-addressable are now closed — `readBoundedJson` (bounded streaming read + parse, 64 KiB cap, 413/400 mapping) rolled out to **all** unauthenticated endpoints named in the audit: `lead-capture`, `rate-watchdog`, `grid-risk`, `digital-twin`, `ml-forecast`, `model-monitor`, `groundsource-miner`, `llm/copilot`, `llm-lite` (5 sites), `energy-rag`, `nl2sql`, `household-advisor`. `evaluateRateWatchdog` local engine now mirrors edge semantics (snake_case + legacy `fixedRate` cents spellings, `province`/`provider` defaults, normalized `fixedRateCadPerKwh`/`termMonths` over the spread) — a new parity describe in `tierEdgeParity.test.ts` pins identical numbers/defaults on snake, camel, and hostile inputs. `detectDrift`/`evaluateGridRisk` `.filter` crashes on untrusted shapes guarded (`Array.isArray`). `boundedNumeric`/`boundedPrice` coerce numeric strings consistently with the engines. `timeoutMs` non-finite/negative guarded.

### Round H — forecasting-methodology + provenance corrections (2026-10-28, same overlay)

External audit found the interval evidence tautological and baselines non-comparable. Fixed in-tree:

- **Split-conformal coverage** (`buildRollingEvidenceSplit`): the 90th-percentile width was fit on the same test errors it then re-scored (≥91.67% guaranteed by construction, 100% monthly; it also fed a `must_pass` gate). Now a calibration tail is carved inside each split's train, the model is refit on `fitRows` only, and `conformalQuantile` (finite-sample ⌈(n+1)(1−α)⌉/n from `conformalPrediction.ts`) sizes the interval on those held-out residuals; coverage is scored on the untouched test window. Report-level `conformal_interval_width_mw` pools calibration errors across splits instead of a meaningless RMSE quantile. Empty calibration → coverage 0 (unavailable reads low, never high).
- **Baseline window alignment**: `persistence_mae`/`seasonal_naive_mae` were whole-series rolling one-step errors vs the model's fixed-origin multi-step holdout MAE (and consumed test actuals). Both helpers now receive test-window-aligned slices — same error window, same horizon class as the model.
- **`rollingOriginFolds`**: `evaluation_results` echoed the contract's configured 10 while ≤3 splits executed — now reports the dataset's actual `rolling_origin_split_count`.
- **Ontario sample provenance**: `public_system_sample` is now `is_fallback=true` (chips → `demo`, `Fallback: no→yes` in UI/appendix/CSV, artifacts → sample-backed, kills the live→stale clock drift); provenance badge `historical_archive→simulated`; `sourceFile`→`bundled-derivative:PUB_Demand_2026.csv`; `transformVersion`→`bundled-synthetic-fixture-v1` (that transform never ran on bundled rows); forecast CSV now serializes the `warnings` array.
- **Journey proof**: new Chromium test completes sample→labels→`Export utility forecast package` download and asserts the artifact's provenance lines; invalid-CSV → `Import warnings`; file input keyboard-focusable.
- Assumption text updated to describe split-conformal calibration honestly. Dead `quantile` + `PUBLIC_SOURCE_TRANSFORM_VERSION` import removed.

**Round-I (adversarial self-audit follow-up, same session):** two auditor requirements found under-delivered and closed — (a) **deterministic anti-tautology regression test** added (`utilityForecasting.test.ts`: 600-point step series, flat 100 MW → 500 MW in the final test window; asserts last-split `interval_coverage_pct < 50` and report coverage `< 91.67` — values *impossible* under the old in-sample quantile which guaranteed ≥91.67%, plus `persistence_mae > 10` pinning test-window baseline scoring vs the old whole-series ~0.7); (b) **valid-upload journey step** added to the Chromium spec (48-row CSV → `Import warnings` clears → benchmark card re-renders). **Serial suite completed: 1579/1580** — the single failure is `launchEvidenceManifest.test.ts` `spawnSync ETIMEDOUT`, proven spawn-contention flake (17/17 in isolation, 435s — subprocess-spawning test), not a source failure. Same signature as the prior round's characterization.

**Round-I residual sweep (second self-review pass, same session):** deep diff re-review + methodology re-trace of `buildRollingEvidenceSplit` confirmed the split-conformal construction is genuine (model fit on `fitRows` only; ≥30-row calibration tail; `conformalQuantile` sized by calibration errors; coverage scored on untouched test actuals; `interval_status: 'insufficient_history'` + `null` coverage/width/score when calibration is too thin — no fake zero) and that baselines are *fixed-origin multi-step* from the same fit boundary (`persistenceForecast`, `seasonalNaiveForecast` with `calibrationRows.length` phase offset — same origin, same horizon class, only fitRows information). Three residuals closed: (a) `ForecastAccuracyPanel` `mapExternalStats` fabricated `'ECCC'` when callers passed `calibrated:true` without a source — now uses only `h.calibrationSource`, and both renderers show "✓ Calibrated" without an empty attribution when no source is supplied; (b) `api-v2-forecast-performance` 500-catch echoed `error.message` — now generic `'Internal error'`, same class as the `llm` hardening; (c) `groundsource-miner` document upsert + event insert errors were silently swallowed (`.data` only) — now surfaced as bounded `warnings` entries (deduped per source, 300-char cap) consistent with the file's warnings-channel convention. Verification after edits: `git diff --check` clean, `pnpm exec tsc -b` clean (two transient TS7018 on the warning literals annotated), focused vitest 27/27 (forecasting) + 15/15 (groundsource/mlEdgeContracts).

**Round-I 360° sweep (third pass, same session):** systematic adversarial grep across all surfaces — (a) **claim vocabulary**: `regulator-ready`/`filing-ready` sweep found two real overclaims in `commercialPositioning.ts` ("board/regulator-ready planning artifact" → "planning artifact structured for board/regulator review"; "regulator-ready formats" → "the formats regulators require") and one borderline pain-signal in `pilotEvidence.ts` ("regulator-ready" → "regulator-format"); remaining hits verified honest (`doNotClaim[]`, "not a board-approved or regulator-approved conclusion" disclaimer, "before treating any schedule as filing-ready" warning); (b) **error-echo class**: all 22 `error: {error,err}.message` Response-body echoes across `api-v2-*`, cron, storage, fix-innovations, cohort-invite, energy-rag-ingest replaced with `'Internal error'` (internal detail retained in `console.error` logs) — zero remaining; (c) **interval-coverage UI verified honest end-to-end**: null → "Not enough history / Coverage was not measured", measured → "nominal target; descriptive only" plus explicit fold-overlap/serial-sample caveat. Verification: `tsc -b` clean, `check-claim-boundaries` 431 files pass, lint 0 errors, `git diff --check` clean, vitest 13/13 (positioning) + 12/12 (cron contracts). **Owner-decision note (not changed):** app-wide `Production Ready` feature-status taxonomy (`FeatureAvailability`, `platformFacts`, `featureFlags`) is a product-maturity label, not forecast-evidence surface — renaming is a positioning decision for the owner. **Post-review residual closure:** adversarial review of the sweep diff caught that `groundsource-miner` `warnings[]` carried raw Supabase `error.message` text (same disclosure class as the 22 echoes) — warnings are now generic (`Document upsert failed for <url>` / `Event insert failed for <url>`) with full errors retained in `console.error`; `tsc -b` clean, focused slice 15/15.

### Round J — forecasting evidence + Edge-boundary re-audit (same overlay, in flight)

**Round-J audit receipt supersedes the "zero remaining error echoes" claim above** — the 22-site sweep covered one `error: X.message` Response-body pattern only; a re-audit confirmed reachable raw-error paths in `groundsource-miner` catch/fallback metadata, `household-advisor`, `nl2sql`, `energy-rag`, `energy-rag-ingest`, `model-monitor` (`retrain_dispatch`), `manifest-*`, `help-*`, more `api-v2-*`, `ingest-*`, and connector handlers. Confirmed findings (high): privileged-caller **SSRF** — caller `sample_sources[].url` reaches `fetch()`; caller URLs (up to 2,000 chars incl. possible query credentials) leak into warnings/persisted text; internal error details + raw LLM snippets reach callers; persistence branches logged raw Supabase error objects. Confirmed (medium): hierarchy `isComplete` counts only observed entities (wholly-absent feeder invisible); short-history `seasonalNaiveForecast` returns empty values → zero-error "perfect" baseline; `interval_validation_horizon` is a test-window size mislabeled as horizon; upload loses provenance (`uploaded_historical` always; bundled-fixture re-import loses synthetic disclosure; IESO-format uploads lose terms/attribution); Chromium spec asserts a header the serializer does not emit; handler-boundary proof missing. **Execution:** 3-worker parallel split with disjoint ownership — A: forecast core (`utilityForecasting`/`forecastBaselines`/`utilityForecastBenchmarkPack` + unit tests; completeness scope, seasonal→unavailable+null, `test_window_steps` + `forecast_lead_start/end`); B: provenance journey (`utilityCsvParser`/`Serializer`/`utilityForecastProofPack`/`utilitySampleData`/`UtilityDemandForecastPage` + spec; `bundled_fixture_hash_match`/`ieso_format_detected`/`unverified_upload`); C: Edge boundary (`supabase/functions/**`; inline-only sample sources, allowlist-only no-redirect fetch, redacted URLs, generic errors + bounded codes, sanitized logging, handler tests). Owner gates unchanged: IESO reuse terms, hosted identity/SQL/grants/RLS, consent boolean ≠ consent evidence. Verification/peer-review pending — do not treat this entry as closure.

**Round-J closure receipt (same overlay):** all three workers landed and the coordinator integrated. (a) **SSRF closed** — `groundsource-miner` split into thin `index.ts` adapter + dependency-injected `groundsourceHandler.ts`; caller `sample_sources` map to `sample://N` IDs with `fetchable:false` (never fetched, never persisted, never echoed); only static `SOURCE_ALLOWLIST` entries fetch, each re-validated by `isFetchableAllowlistUrl` (https only, no userinfo, default port only) and fetched with `redirect:"error"`. (b) **URL leakage closed** — `redactSourceUrl` strips userinfo/query/fragment (origin+path only); warnings/persisted `source_url`/metadata carry `sample://N` or the redacted form; `sanitizedErrorForLog` bounds console detail to ≤80 chars and strips URLs + token-like strings. (c) **Error echoes closed** — named routes verified by direct read (`model-monitor` `retrain_dispatch.error` → `retrain_dispatch_failed` code; `nl2sql`/`household-advisor`/`energy-rag`/`energy-rag-ingest` → generic 500 bodies with `jobId` correlation where applicable); ~50 function files swept; ops-log writes (`logJobExecution`/`finishOpsRun`/`extra.error`/`metadata.error`) centrally bounded ≤300 chars; groundsource `fallbackReason`/provenance notes emit bounded codes only (`llm_unavailable`/`llm_request_failed`/`llm_parse_failed`/`daily_event_budget_exhausted`) — no raw LLM snippets or exception text. (d) **Completeness closed** — `selectCanonicalForecastRows` prefers a fully-covered system series (`complete_system`); otherwise `observed_entities` or `unknown`; `isComplete` is true only for `complete_system`; honest warnings pushed for dropped rows, missing entity×interval slots, and no-authoritative-inventory. (e) **Short-history baseline closed** — `BaselineForecast.available:false` + null metrics; metric helpers return non-finite instead of zero; non-finite baselines excluded from skill scores/champion selection. (f) **Interval semantics closed** — `interval_validation_horizon` replaced by per-fold `interval_validation_folds[]` carrying `test_window_steps` + `forecast_lead_start`/`forecast_lead_end`; CSV columns renamed; schema v5→v6 with legacy-pack resilience. (g) **Provenance closed** — parser emits `format_evidence` (`bundled_fixture_hash_match` via deterministic FNV-1a fingerprint over canonical row fields / `ieso_format_detected` format-only, origin unverified / `unverified_upload`); evidence threaded upload→`source_manifest.formatEvidence`→UI notice→serializer headers→proof-pack bullets; `fetchedAt` stays null for local samples. (h) **Spec fixed** — artifact-header assertion aligned to real serializer contract. Coordinator fixes during integration: `PublicSourceManifest.formatEvidence` field added (required, nullable — `UtilityCsvFormatEvidence` moved to `types/utilityForecasting.ts` as single source; parser re-exports); claim-boundary trip on the new IESO notice reworded so the banned phrase sits inside `not`-context. **Verification on the merged tree:** `tsc -b` clean · `git diff --check` clean · lint 0 errors / 1705 warnings (≤1742 baseline) · `pnpm run build` pass · claim-boundaries 431 pass · commercial-source-docs pass · repo-hygiene pass · client-env-safety 2300 pass · secret-scan clean (documented INCs only) · dep-audit 0 findings · positioning strict CONDITIONAL_GO 0 warnings · focused vitest 73/73 · edge slice 201/201 · Chromium 7/7 incl. fingerprint+IESO-unverified journey · serial suite **1626/1627** — sole failure `launchEvidenceManifest.test.ts:4293` timed out at 180s under serial spawn contention (same class as the prior 1579/1580 receipt); isolated rerun 17/17 — harness flake retained as a failure receipt, not reclassified green. **Bounded residuals (recorded, not silently changed):** `llm/tools/registry.ts` + `llm/agents/agent_framework.ts` per-step `result.error` carries `String(error)` into LLM tool context (designed tool-loop mechanism; could be paraphrased to the user — owner decision whether to bound); `fetchMultipleToolData` is an uncalled export whose result map carries raw `ToolResult.error` (dead surface — flag if ever wired to a response); `weather-ingestion-cron` uses `error.message.includes('duplicate key')` for control flow only (not a disclosure).

### Round G — mission-reframe + security-boundary sweep (2026-10-28, same overlay)

Adversarial re-review of the Round-F overlay against live files (not diff hunks) corrected three false-positive findings: CORS on llm_app errors is bootstrap-covered (`withCors` in `llm/index.ts`); `getRateLimitIdentity`/`asJsonObject` tests already exist (`clientId.test.ts:95-140`, `boundedBody.test.ts:128-142`); groundsource `sample_sources` intake fields were already capped. The limiter fails CLOSED — RPC error → throw → bootstrap 503 (`llm/index.ts:59-61`) — and `llm_rl_increment.p_user_id` is `text` (`20250827_llm_schemas.sql:80`), so `net:ip:*` fits. `/history` returns 503 before the handler (`llm_app.ts:1326-1328`); `/transition-kpis` and `/history` sit behind the bootstrap `applyRateLimit` but not the DB bucket — intentional exemption (no model call), recorded here.

Independent security/test review (path:line evidence) found; this pass fixed:
- groundsource: html-derived `title` bypassed the 512 cap (≤ ~50 KB into anon-readable `ml_source_documents`) — now `.slice(0,512)` on the composed value (`index.ts:484`); raw `llmExtraction.events` fields (`event_type`/`province`/`location_name`/`affected_asset`/`severity`) bounded at insert (`index.ts:545-554`); `provenance_notes` per-note cap 500 (`groundsource.ts:86`). `coerceEvent` remains dead code — noted for later cleanup.
- `llm/index.ts` 500 handler echoed `String(e)` to anonymous callers — now generic `Internal error` (limiter-unavailable path already clean).
- `handleCopilot` skipped the `isBlacklisted`/`isSensitiveTopic` screen sibling LLM handlers enforce — added, 403 (`llm_app.ts:1202`).
- Doc drift corrected: `checkRateLimit` is a single network-identity bucket (`net:${getRateLimitIdentity(req)}`), not "dual-bucket"; `x-user-id` is caller-controlled and ignored. `combineRateLimitResults` remains tested for future buckets.

Owner gates recorded (not agent-addressable): `scripts/sql/fix-llm-function.sql` is drifted vs the migration shape (invalid `create policy if not exists`, missing `user_quota`/`last_reset`, different limit semantics) — owner must confirm the deployed `llm_rl_increment` variant before using that script; `ml_*` tables are `SELECT`-readable by `anon` via `USING (true)` policies — appears deliberate (public dashboards), owner to confirm intent; deployed RPC signature verified in repo migrations only, not against the live DB.

**Round-G follow-up (post-peer-review, same session):** `api-v2-forecast-performance` synthetic twin de-claimed (`calibrated:false`, `calibration_source:undefined`, `overall_quality:0.3`) — closes the "✓ Calibrated by ECCC" path reachable via the live fetch on empty tables; groundsource event insert now uses the in-file `normalizeEventType`/`normalizeProvince`/`normalizeSeverity` (enum-safe — fixes silent CHECK drops, `"Ontario"→"On"` corruption, `""` vs `null` blank pins, camelCase aliases); `handleHistory` catch echo made generic (`llm_app.ts:662`); `ForecastAccuracyPanel` gets a visible "Illustrative synthetic metrics" line (badge renders null for `mock`) + honest methodology note; `RegulatoryFilingExport:391` bounded. **Residual:** orphaned `llm/copilot.ts` (unscreened, error echo, dead-in-tree) — delete at next cleanup.

### Round F — peer-reconciled gap-register closure (2026-10-28, same overlay)

The peer-reconciled final plan's P1 gap register is now closed in-tree against the DB-mocked handler boundary. Proof layer remains `implemented` + `locally tested` only; exact-tree CI and all owner/staging evidence remain STOP.

- **P1 — hostile `lastVerifiedAt` coercion:** `scoreVerifiedDate` now validates primitive type BEFORE `new Date()` — only non-empty strings and finite numbers carry date meaning; arrays (e.g. `["2030-01-01"]`, which `new Date` would otherwise parse as valid), objects, booleans, `null`, and symbols/bigints score as unverified-oldest and can never reach coercion. Hostile-value coverage runs through the DB-mocked handler core (`runTierScenario`), not just the pure helper.
- **P1 — missing-field-aware rate-row selection:** `fillTierPriceDefaultsFromRates` resolves each missing price independently across the freshest-first row list — a newest row carrying only a redundant price can no longer shadow an older row holding the actually-missing field. Per-price provenance is preserved (each price stamped from its own source row's `observed_at` or the caller date; combined = oldest contributing date; any engine-default fill → unprovenanced). `runTierScenario` now decides DB access on RAW caller values — a prior iteration bug where a null-fill baked in defaults and skipped the rate table is test-regressed.
- **P1 — handler/database integration proof:** `_shared/tierScenarioHandler.ts` is the extracted request core behind `tier-simulator/index.ts`, expressed against a minimal `TierScenarioDb` interface so tests mock the database at the handler boundary. Tests assert selected rows, per-price source dates, `claim_label`, `confidence_score`, warnings, bounded `result_payload`, and allowlisted `input_payload` exclusion of arbitrary/nested/sensitive fields. The edge entrypoint is now a thin HTTP adapter.
- **P1 — limiter identity (rotation-proof):** `getRateLimitIdentity` in `_shared/clientId.ts` buckets on the forwarding-derived IP whenever observable — bearer/apikey material is caller-controlled and rotating it can no longer reset the abuse bucket. The credential fingerprint is only the fallback identity when no IP is observable. `getClientId` (composite key+ip) is retained for `api_usage` attribution logging unchanged. `applyRateLimit` uses the rotation-proof identity; rotation/spoof/fallback cases unit-tested.
- **P1 — per-instance limiter documented:** the in-memory map is a best-effort anti-abuse signal, per runtime instance, resetting on cold start — NOT shared protection. The module header now states the security-boundary condition explicitly: effective protection requires observed gateway/shared enforcement in staging or explicit owner acceptance before exposure (owner gate, unchanged).
- **P1 — body-shape contracts:** `asJsonObject` gate added to `_shared/boundedBody.ts`; every `readBoundedJson` caller now rejects non-plain-object JSON (array, scalar, `null`, boolean) with a 400 `Body must be a JSON object` instead of casting a record — `nl2sql`, `energy-rag`, `household-advisor`, `rate-watchdog`, `grid-risk`, `digital-twin`, `ml-forecast`, `model-monitor`, `groundsource-miner`, `lead-capture`, `llm-lite` (5 sites). `llm/copilot` already shape-validated. In `llm/llm_app.ts` all eight `req.json()` readers were replaced by bounded reads + object gate via `readJsonObjectBody` — a literal `null` body previously threw an uncaught TypeError (destructure of `null` → 500).
- **P1 — llm dual-bucket limiter:** `llm_app.ts` `checkRateLimit` (DB-backed `llm_rl_increment`) now checks the `x-user-id` bucket AND the rotation-proof network-identity bucket in parallel — the `x-user-id` header is caller-controlled, so rotating it can no longer reset the per-IP/credential bucket. Deny when either bucket is exhausted.
- **P1 — llm_app exposure inventory:** routes are POST `transition-kpis`, `explain-chart`, `analytics-insight`, `insights`, `transition-report`, `data-quality`, `grid-optimization`, `copilot`, `agent/morning_briefing`, `agent/opportunity_detection`, `agent/compliance_report`, GET `history`, GET `health` (bootstrap). All POST bodies are bounded at 64 KiB and object-gated; `x-user-id` identity is rate-limit-only (untrusted); `llm_rl_increment` RPC remains the shared DB limiter; `whop-webhook`/`stripe-webhook` raw-body signature paths were NOT touched (different trust surface, byte-exact signing requirements).
- **Lint ratchet:** 48 dead import names + 2 dead functions removed from `src/lib/mlForecasting.ts` (unused across the overlay); the warning count drops to 1709 vs the 1742 baseline — gate green without relaxing the ratchet.

**Round-F residual / still open:** gateway trusted-proxy verification, shared/gateway rate-limit enforcement proof (or owner acceptance of the per-instance limit), `llm_rl_increment` hosted behavior, exact-tree CI binding for this commit, staging, source rights, data stewardship, named approvals, deployed accessibility/performance, buyer outcomes — all remain owner-layer STOP gates.

### Round F self-audit addendum — adversarial review findings and final local evidence (2026-10-28, same overlay)

An adversarial self-review of the final diff ran before this was handed back for audit. Findings:

- **CAUGHT + FIXED — dual-bucket never-deny regression:** the `llm_app.ts` dual-bucket rewrite computed `ok = used <= limit` per identity but returned `{ ok: true, ... }` unconditionally, so `combineRateLimitResults` never saw a denial and the DB-backed limiter silently allowed everything. Verdict logic extracted to pure `_shared/llmRateLimit.ts` (`llmRateLimitVerdict` / `combineRateLimitResults`) and regression-covered in `llmRateLimit.test.ts` (deny-on-either-bucket, min-remaining selection, malformed counts). This is exactly the defect class the audit's "effective rate limits" check targets — fixed before evidence binding, not after.
- **CAUGHT + FIXED — missing uniform gate:** `llm/copilot.ts` shape-checked only downstream inside `validateRequest`; now has the explicit `asJsonObject` 400 gate like every other bounded-JSON caller (19 read sites / 19 gates verified by grep count).
- **ADJACENT PERSISTENCE HARDENING:** `rate-watchdog`, `grid-risk` persisted raw caller bodies and unbounded results into `ml_alert_evaluations` with silently-dropped insert errors — same untrusted-persistence class as the TIER gap. Generic `_shared/persistedPayload.ts` bound (depth/keys/string/array caps + 64 KiB serialized cap → `{error:'payload_oversize'}`) now guards `input_payload`/`result_payload` there; `ml-forecast` persists a bounded `scenario`; `groundsource-miner` caller `sample_sources` fields are length-capped. Insert errors are logged, not swallowed.
- **OBSERVED, pre-existing, not introduced:** `deno check` strict mode reports two type errors in code not authored this round (`llm/call_llm_adapter.ts:80`, `llm_app.ts:602` `buildSnippets`/`NumericSummary` mismatch). The repo ladder's `pnpm exec tsc -b` is green; `deno check` is not part of the ladder — recorded for the next audit's awareness.
- **KNOWN conservative behavior:** a request denied on one dual bucket still consumes the other bucket's increment (attempts count against both) — intentional anti-probing, documented here so it is not re-flagged as a bug.

**Final local verification ladder on this tree** (proof layer: locally tested; CI/staging/owner layers remain STOP):

- `pnpm exec tsc -b` — clean (0 errors).
- `pnpm run lint` — 0 errors; baseline gate 1707 ≤ 1742.
- Focused slices — `tierHandlerFlow.test.ts` 24/24 (DB-mocked handler boundary: hostile dates, per-field row fill, complementary rows, provenance, persisted-payload allowlist/byte-cap, insert-error visibility); `clientId.test.ts` + `boundedBody.test.ts` (identity rotation/spoof/fallback, body shapes, oversized/interrupted streams); `llmRateLimit.test.ts` 5/5; `tierEdgeParity.test.ts` parity.
- Full serial suite `npx vitest run --no-file-parallelism` — 1571/1572 passed; the single failure (`focusedLaunchReadinessReports` proof-routing test) was an environmental child-process timeout/non-zero while the tree was being edited mid-run; isolated re-run on the frozen tree passed 3/3 in 342 s. Effectively green at this tree — flagging the failure mode honestly because a quiet re-run, not the code, cleared it.
- `pnpm run build` — passed (Vite bundles `src/` only; the post-build edits are edge functions and tests outside the bundle — stated so the build receipt is bound correctly, not overclaimed).
- Gates — `check-secret-scan` (HEAD clean; only documented INC history), `check-claim-boundaries` (431 files), `check-lint-warning-baseline`, `check-repo-hygiene`, `check-client-env-safety`, `check-dep-audit` (0/0/0), `check-commercial-source-docs`, `verify-positioning-audit --strict` (0 warnings), `git diff --check` — all pass.
- Exact tree at evidence time: branch `codex/tier-credit-limit-wedge`, HEAD `c41aa2c` + dirty overlay; new files `_shared/tierScenarioHandler.ts`, `_shared/persistedPayload.ts`, `_shared/llmRateLimit.ts`, `tests/unit/{tierHandlerFlow,boundedBody,clientId,llmRateLimit,tierInputSanitize,tierPricingBounds,edgeFetch}.test.ts`, `_shared/{boundedBody,clientId,tierInputSanitize}.ts` untracked pending commit.

**Self-audit confidence:** ~90% on the repository layer. The remaining 10% is not code doubt — it is the evidence layer: a fresh exact-tree CI run on a commit (not the dirty overlay), hosted gateway/proxy verification, and the owner staging gates listed above. Confidence must not be quoted as readiness.

## Revised goal

> Bring CEIP to an evidence-backed controlled-pilot decision for the replacement Supabase project. Produce six linked deliverables: an exact-tree repository evidence packet; a security and data-integrity staging proof; an allowlisted function, storage and legacy-Whop access proof; named privacy, CASL, billing, accessibility and performance approvals; observed paid buyer experiment evidence; and a final continue, pivot or stop decision. Keep staging, production, checkout enablement, outreach and pilot status STOP until each required proof layer exists. Preserve the incident record without restoring the leak-site project, keep Whop acquisition disabled, and never infer closure from code presence, a test definition, CI, or an unrun check.

## 3C status summary

The detailed Context, Constraints, Verification and Composition brief is in `mission.md`. The current score uses 5 = closed at the required proof layer, 4 = repository/CI-ready with an external layer open, 3 = partial preparation, 2 = runbook or evidence plan only, 1 = unverified/open, and 0 = blocked or no evidence.

| Deliverable | Score | Highest proven layer | Current next checkpoint |
|---|---:|---|---|
| Exact-tree repository and evidence packet | 4/5 | CI-verified | retain the 8d6096a4/40462474909 source receipt; document rebind eec76f84/40464886557 is green; keep the ZIP rehash boundary explicit |
| Repository security migration and negative tests | 4/5 | CI-verified | owner applies 20261026003 and verifies grants/RLS in staging |
| Replacement-project hosted controls | 0/5 | read-only observation | migration order, RLS, direct-write denial, rate limits, retention, logging, restore and rollback |
| Data stewardship and migration ledger | 2/5 | preparation packets | steward decisions for four excluded tables and 89 withheld rows |
| Allowlisted functions, storage and Whop legacy access | 2/5 | deployment/runbook preparation | owner deploys and verifies only approved functions and storage assets |
| Privacy, CASL, accessibility and performance | 1/5 | automated checks and draft controls | named approvals plus manual WCAG and deployed Web Vitals |
| Paid buyer validation | 0/5 | pre-registration only | run 11 priced experiments after all preceding gates |
| Final pilot decision | 0/5 | STOP contract | independent judge and owner decision record |

The current overall decision is `BLOCKED_OWNER_GATE`: repository remediation is defensible at the CI layer, but staging and pilot remain STOP.

**Historical code-bearing verification source (superseded by the authoritative receipt above):** `3941e1dabc7904e48826dc6eccd1c2105bb795be` — CI run
> `40292290033` (head SHA exact; `lint-typecheck`, `test`, and
> `build-and-smoke` succeeded). The `evidence-binding` job failed only
> because these documents still referenced the previous source; that is the
> designed stale-document signal, not a source-test failure. Artifact
> `12637053422`, GitHub digest
> `sha256:41d9c8dfbb726ec7027860d18cadedf397b9c1dec6a93928a1e5d4a60e602d54`. This receipt proves repository verification only, not staging or
> pilot readiness. The evidence-only document update `853f7eee` is bound by CI run
`40294701772`; all four jobs succeeded. Artifact `12638082780`, GitHub digest
`sha256:36ea1519bff4013863be89aaa9a89715ac8a412cd4faefd23e0ca18621d7fab9`.

**Audit snapshot (2026-10-26; captured before this documentation update; not CI proof):**

- The latest remote PR head at capture was `5ba25d9`, bound by CI run
  `40216410789`; all four jobs succeeded. This receipt did not prove the local
  checkout.
- The local checkout at capture was `de11fa4`, with the intentional
  `coverage/lcov.info` deletion and untracked zero-byte dump stubs. No reset,
  clean, or restoration is permitted.
- The replacement project is `qktgjpbifknqjpvrgkrj`. Read-only dashboard
  evidence shows migrations and five visible Edge Functions, no Storage
  buckets/objects, and no Free-plan scheduled backups. Hosted behavior remains
  unverified.
- The current authenticated account inventory contains no matching CEIP or Devin
  project-scoped token. No unrelated token was deleted; the CLI OAuth MCP remains
  the preferred read-only path. A direct revocation event is not claimed from
  inventory absence alone.
- The authoritative incident register records INC-001 closed by deletion or
  third-party ownership of the leak-site project. The residual risk is the
  historical credential in public Git history; the leak-site project must not
  be restored.

**Historical phase snapshot (superseded by the authoritative phase table above):**

| Phase | Status | Highest proof layer | Next checkpoint |
|---|---|---|---|
| P0 — incident and preservation | complete | owner-recorded | retain closure evidence and preserve dirty overlay |
| P1 — goal/evidence binding | complete | committed CI | code source `3941e1d` / run `40292290033`; evidence-only docs `853f7eee` / run `40294701772`; artifact `12638082780`; digest `sha256:36ea1519bff4013863be89aaa9a89715ac8a412cd4faefd23e0ca18621d7fab9`; all four jobs green; hosted gates remain blocked |
| P2 — repository security/billing | ci-verified remotely | committed CI | repository hardening is verified; replacement-project grants, RLS and function behavior remain staging-gated |
| P8 — replacement-project staging | blocked | none | backup/export, migration order, RLS, rate limits, retention, rollback |
| P9 — buyer validation | blocked | none | CASL/privacy approval followed by 11 paid experiments |

**Historical milestone (2026-10-25; superseded for current-state claims):** bound HEAD `fc133bc` — CI run
> `40214413753` — `head_sha` exact; all four jobs green including
`evidence-binding` (the audit-12 chain is covered inside bound source
`fc133bc`; run conclusion `success`) (artifact
`12607099570`, merge SHA recorded by GitHub for this run, GitHub digest
`sha256:e826aba042a8c589ea17165e16782c24ac83765363cd987297fa376d0ec205f7`).
The downloaded artifact ZIP was retained by the run; its manifest was
complete, its sidecar verified, and all 11 hashed payload files (9 required
core files plus the manual-assist report/result) matched their recorded
SHA-256 hashes and byte counts. The prior `a460a82` / run
`40071166986` receipt remains historical: its verification jobs were green
but its evidence-binding job was the intended staleness signal.
>
> Two-state binding contract:
> the bound source requires a run whose `headSha` equals it with all
> verification jobs green; descendants after it may touch only the
> evidence-file allowlist, except the current run head which self-binds.
> The `evidence-binding` job's red is a staleness signal, never a code
> verdict. Machine check:
> `node scripts/check-evidence-binding.mjs`. Externally auditor-verified run
> `39641749404` on `10ab812` (merge `d36e88f2`, artifact `12365798216`,
> digest `sha256:7e77cc63…`, tree fingerprint `494227ce…`, manifest hash
> `a7557cbf…`; Phase0 35/35, Phase6 80/80, wedge 80/80, a11y 110/110).
> Clean-clone reproduction at `42d4e2d`: 177/177 files, 1329/1329 tests,
> 22.37% lines (expected nondeterminism vs CI 22.55%), lcov `f7364e6c…`,
> a11y 110/110 ×5 engines.
> This run binds the audit-session overlay commits (`ad444941`…`f12accc`)
> and the structural WebKit reflow fixes; the audit-3 refutations are closed
> at the committed CI proof layer (manifest `complete:true`, `missing_files:[]`,
> sidecar verified, hard `Verify evidence completeness` gate, synthetic-env
> coverage reproduction, inversion/JWT-fuzz/a11y-design suites in CI).
> The predecessor receipt recorded client-env, hygiene, and secret-scan
> results; those restricted scans are guard-blocked for the current overlay
> and remain unverified here. `coverage/lcov.info` remains deleted locally by
> owner decision. The `ubuntu-latest`→26.04 migration
> broke the previous run's browser install; the image is now pinned.
> Prior bound runs (`39554044008`/`4f0348d`, `39552477642`/`e7a5f81`,
> `39550773406`/`caadfc5`) remain historical evidence. Any later commit is
> evidence-only in that historical chain; the current implementation overlay
> is separate. Binding rule: the run whose `headSha` equals a commit
> binds that commit — no older run is proof for a newer HEAD.
> The current receipt's manifest records merge checkout `63ebd10c`, PR head
> `fc133bc`, `complete: true`, `missing_files: []`, 9 required core evidence
> files plus 2 manual-assist payloads (11 hashed payloads),
> and `jobs: "not-recorded"`; GitHub's four external job conclusions are the
> authoritative job result. Browser and coverage artifacts are retained by
> the run. Later evidence-only document commits must not be described as a
> new code-binding source unless their own head-matching run exists.
> WCAG evidence claims automated axe+reflow coverage only —
> manual 2.2 review stays open. Supabase project-ref discrepancy
> (`qnymb…` vs `cwij…`) is recorded owner-gated. (Historical baselines —
> `2cdc44b`, 1186-test, 80-browser, and prior run IDs — are superseded;
> see dated addenda.)
>
> **Historical checkout snapshot:** `fc133bc` is CI-verified by run `40214413753`. The
> tracked `coverage/lcov.info` deletion and zero-byte untracked dump stubs
> remain intentionally preserved and are not backup evidence. No reset or
> restoration was performed.
>
> **Source remediation — historical:** commit `ad44494` (test-only
> child-process warning isolation) is covered by the historical
> `a460a82`/`40071166986` receipt. The current `e5261b2` run independently
> executed the secret, hygiene, and client-environment scans successfully.

## Current replacement-project read-only observation — 2026-10-26

- Project URL: `https://qktgjpbifknqjpvrgkrj.supabase.co`.
- Supabase MCP returned 123 applied migrations and 230 public tables at
  `2026-10-26T08:37:53Z`; the live list ends at `20261023094758`. Repository migrations
  `20261026001_harden_readonly_sql_privileges` and
  `20261026002_harden_api_key_rate_functions` are not applied to the
  replacement project.
- Five Edge Functions are ACTIVE: `lead-capture`, `whop-verify-access`,
  `whop-webhook`, `calibration-cron`, and
  `storage-dispatch-scheduler`. The pilot allowlist remains the first three;
  the two scheduler functions require owner classification before staging.
- Security advisors at `2026-10-26T08:37:53Z`: 23 security-definer-view ERRORs, one
  RLS-disabled ERROR, 107 RLS-no-policy INFO findings, four extension WARNs,
  five materialized-view WARNs, and 11 anonymous plus 11 authenticated
  security-definer execution WARNs.
- Performance advisors at `2026-10-26T08:37:53Z`: 23 unindexed-FK INFOs, 100
  auth-RLS-initplan WARNs, 449 unused-index INFOs, 247
  multiple-permissive-policy WARNs, and seven duplicate-index WARNs.
- No hosted migration, function deployment, storage upload, backup, restore,
  or rollback was performed by this agent. This is read-only control-plane
  evidence and does not prove hosted RLS, retention, logging, deployment, or
  owner approval.

## Proof-layer definitions

| Layer | Meaning |
|---|---|
| implemented | Code/doc change exists in the working tree |
| locally-tested | Test/build/gate ran green on this tree |
| ci-verified | CI artifacts tied to this exact commit/tree |
| staging-verified | Verified against the hosted environment (blocked until owner gates) |
| owner-approved | Named owner signed off |
| buyer-validated | Pre-registered experiment produced the defined evidence |

A code change is not CI evidence; CI is not staging evidence; staging is not
owner approval or buyer validation.

## Historical repository security overlay

The repository now contains two additional hardening migrations:
`20261026001_harden_readonly_sql_privileges` and
`20261026002_harden_api_key_rate_functions`. Local tests, typecheck,
migration verification, and the exact-head CI verification jobs passed for these
changes. They are not hosted proof: the replacement project still ends at
migration `20261023094758`, so anonymous/authenticated denial, rate-limit
fail-closed behavior, and service-role-only execution remain owner-run staging
checks.

## Historical phase tracking (superseded by the authoritative phase table above)

| Phase | Status | Proof layer | Commit/tree ID | Artifact / run ID | Owner | Next checkpoint | Remaining risk |
|---|---|---|---|---|---|---|---|
| P0 — Preservation and INC-001 owner separation | complete | owner-recorded | leak-site deletion/third-party ownership recorded in incident register; intentional dirty overlay preserved | incident register closure; lcov deletion and zero-byte stubs remain classified | repo/owner | retain closure evidence; never restore leak-site project | historical credential remains in public Git history |
| P1 — Current-tree addendum and evidence binding | complete | committed CI | code source `3941e1d` / run `40292290033`; evidence-only docs `853f7eee` / run `40294701772` | artifact `12638082780`; digest `sha256:36ea1519bff4013863be89aaa9a89715ac8a412cd4faefd23e0ca18621d7fab9`; all four jobs green | repo | retain receipt; keep hosted gates blocked | hosted proof absent |
| P2 — Repository security and billing code | partial | committed CI | `3941e1d` / run `40292290033` | readonly-SQL privileges, fail-closed rate protection, service-role-only API accounting; hosted RLS still pending | repo → owner | apply and test hosted controls in staging | hosted denial owner-gated |
| P3 — Stale economics suppressed | partial | committed CI | `3941e1d` / run `40292290033` | provenance/freshness, allocator availability, landfill screening controls retained | repo | buyer-grade rate evidence | DI undetermined pending official Standard |
| P4 — Whop legacy path and deployment proof | partial | committed CI | `3941e1d` / run `40292290033` | server-verified identity/entitlement and acquisition removal retained | repo | deployed copy + membership journey after edge deploy | `/v5/me` + env config owner-gated |
| P5 — CASL approval and buyer experiments | blocked | local tests | — | suppression registry enforced; cross-dir opt-out test | human | CASL sign-off; 11 priced experiments | 0/11 |
| P6 — Automated quality green; manual WCAG/perf | partial | committed CI | `853f7eee` / run `40294701772` | automated axe/reflow and browser evidence retained; all four CI jobs green | repo → owner | manual keyboard/focus/SR review; deployed perf | manual WCAG + hosted perf open |
| P7 — CI green; reproduction + manifest completeness | partial | committed CI | `853f7eee` / run `40294701772` | complete manifest, sidecar and browser/test artifacts; all four CI jobs green | repo → CI | independent clean-clone lcov and hosted staging | local lcov deletion remains intentional; hosted proof absent |
| P8 — Replacement Supabase staging and named-owner approvals | blocked | — | — | — | owner | backup/export, migration order, RLS, rate limits, retention, rollback and named approvals | all hosted evidence absent |
| P9 — Buyer validation | blocked | — | — | `.positioning-audit/experiments.json` (0/11) | owner | business decision | commercial readiness unverifiable |

Status values: `not started / in progress / blocked / complete`.
Proof-layer vocabulary: `source` < `local tests` < `committed CI` < `staging` < `owner approved` < `buyer validated`. A row may only move right when the artifact at that layer exists.

## Hard boundaries

- No buyer contact, no new checkout enablement, no project restore, no hosted
  migration, no staging/production deploy, no owner-gate approval by agents.
- INC-001 (`SUPABASE_SERVICE_ROLE_KEY` in public history, `0422accf`) is
  closed at the incident-register layer by deletion or third-party ownership
  of the leak-site project. Preserve the historical record and do not restore
  that project; any future resurfacing requires owner rotation and log review.
- The coverage threshold is set only from a passing full serial run; the current
  committed CI measurement is 22.55% lines, while the local lcov deletion is
  unresolved and must not be treated as a passing local coverage state.

**Historical predecessor receipt:** `4967b72` was verified by run
`39990265678`; all four jobs succeeded and the evidence artifact was
`12519384283`. It is superseded for current-state claims by the exact-head
`389dad3` / `40073506314` receipt above remains historical. The evidence/migration
descendant `fc133bc` is now pushed and CI-verified by run `40214413753`; no older
run is reused as proof for this newer head.

**Replacement-project security baseline:** the read-only snapshot in
[`SUPABASE_SECURITY_BASELINE_2026-10-23.md`](docs/remediation/SUPABASE_SECURITY_BASELINE_2026-10-23.md)
records the 2026-10-26 read-only observation: 23 security-definer-view ERRORs, one RLS-disabled ERROR, 107 RLS-no-policy INFO findings, four extension WARNs, five materialized-view WARNs, and 11+11 execution WARNs. This is an open staging
gate, not a security-clearance claim.

## Round J — Overnight learner-workflow implementation — 2026-11-15

**Tree binding:** branch `codex/overnight-energy-platform-audit-2026-11-14`,
HEAD `c41aa2c77f077a612b4baa40d99511b047f4fd9b`, plus the intentional dirty
overlay. The checkout still has 172 modified/untracked paths, including the
pre-existing `coverage/lcov.info` deletion and unrelated work. No reset, clean,
deployment, migration, credential use, or commit was performed. Work remains
uncommitted because the implementation overlaps the broad dirty overlay and
selective staging could capture unrelated work.

### Implemented

- **Storage dispatch is now a stateless learner simulation.** The handler
  dependency contract exposes reads only; POST dispatch returns before/after
  simulation state marked `simulation_only`; no battery or dispatch-log writes
  remain in this route. The Deno adapter uses the anon key and read-only
  queries. Repeated simulation tests prove the virtual starting state does not
  change between requests.
- **Forecast evidence is withheld for unusable time axes.** Irregular hourly
  cadence, duplicate intervals, and timezone-ambiguous date-times produce an
  explicit unsupported status with null interval evidence and unavailable
  benchmark/energy metrics. Regular hourly and monthly cadences remain
  measurable. A perfect zero-error baseline and an unavailable baseline no
  longer produce invented zero skill.
- **CSV upload and export boundaries are bounded.** Utility uploads reject
  files above 25 MiB or 100,000 data rows without partial truncation. CSV
  encoders quote separators/quotes/newlines, neutralize spreadsheet formulas
  in string cells, and serialize non-finite measurements as `not_available`.
  This covers row uploads, forecast packages, Alberta schedules, and the OEB
  template path. Export text labels the source fingerprint as sampled for
  large datasets and non-cryptographic.
- **Learner-facing maturity copy is bounded.** The feature list describes
  learning and analysis use. Unavailable annual-energy, benchmark, and
  interval values render as unavailable instead of `NaN` or a measured zero.
- **The local browser preview is safer and port-consistent.** The preview build
  uses a unique temporary directory and only removes that directory. The
  utility Playwright spec derives its base URL from
  `PLAYWRIGHT_PHASE6_PORT`, matching the shared config.

### Verification receipts on this tree

| Check | Result |
|---|---|
| `pnpm exec tsc -b` | Pass, 0 errors |
| Focused forecast/storage/export/conformal Vitest slice | 83/83 pass across 9 files |
| Full `pnpm exec vitest run --no-file-parallelism` | **1,643/1,643 pass across 206 files** in 191.71 s |
| `pnpm run lint` | 0 errors; 1,696 warnings |
| `node scripts/check-lint-warning-baseline.mjs` | Pass; 1,696/0 vs baseline 1,742/0 |
| `pnpm run build` | Pass; existing Rollup warnings for vendor chunk size and upstream Zod pure-comment annotations |
| Playwright utility workflow, Chromium | **7/7 pass**, including artifact bytes, regular/ambiguous timestamps, valid/invalid uploads, and keyboard focus |
| `deno check --no-config --no-lock supabase/functions/api-v2-storage-dispatch/index.ts` | Pass |
| Claim-boundary check | Pass, 431 files |
| Strict positioning audit | Pass, `CONDITIONAL_GO`; validation remains pending and 0 experiments executed |
| Commercial-source and roadmap checks | Pass, 11 active / 28 historical docs and strategy roadmap |
| `git diff --check` | Pass |

### Failed and blocked receipts retained

- The earlier full serial run was **1,641/1,643**. One test used timestamps
  outside the rolling calibration window; its fixture now uses recent dates.
  The other expected zero seasonal skill when the seasonal baseline was
  unavailable; its assertion now matches the unavailable (`NaN`) contract.
  The subsequent full run passed 1,643/1,643.
- Chromium attempts before the final passing run failed because the pinned
  Playwright browser was absent, then because the test spec still targeted
  port 4175 while preview used 4176. The browser was installed locally, the
  test URL now follows the configured port, and the final 7/7 receipt is on a
  fresh report directory. Earlier failure reports remain under
  `/tmp/ceip-codex-forecast-e2e.A9laAK` and
  `/tmp/ceip-codex-forecast-e2e.vRKRMH`; passing report is under
  `/tmp/ceip-codex-forecast-e2e.AOJoGv`.
- Plain `deno check` auto-loaded the repository TypeScript config and failed
  on TS5101 (`baseUrl` deprecation) and missing Deno globals. The explicit
  no-config Deno check passed; the earlier failure remains recorded here.
- Dependency audit remains **failed** for two undocumented moderate
  advisories: `glob` (`GHSA-3g3m-2fjr-6pw4`) and `minimatch`
  (`GHSA-g3hv-75wg-m249`). Dependency upgrades were outside this bounded
  learner-workflow scope.
- Client-environment safety, repository hygiene, and secret-scan commands
  were denied by the local execution hook because they inspect restricted
  dotenv/secrets paths or write outside the repository. They remain NOT
  VERIFIED; the denial was not bypassed.
- The full non-coverage Vitest run printed critical-coverage diagnostics
  because the intentionally deleted `coverage/lcov.info` remains absent.
  Coverage was not regenerated, so no coverage-pass claim is made.

### Current decision and remaining boundary

**Local workflow demonstration: implemented and locally verified.** The
forecast metrics are descriptive only, require a supported time axis, and do
not establish a time-series coverage guarantee. **Hosted use remains
unverified.** The existing owner gates for gateway trust, shared rate limits,
RLS, storage, retention, source rights, named approvals, exact-commit CI, and
staging remain open. Only Chromium was run; other browser projects, hosted
state, buyer validation, and coverage thresholds were not established by this
round.

## Round K — dependency advisory closure and remaining local gates (2026-11-15)

Repository snapshot: branch `codex/overnight-energy-platform-audit-2026-11-14`,
HEAD `6b7cc8d50fd2a3e5fbb9db4906659266b06516c9`. The isolated dependency
fix is committed; the pre-existing working-tree overlay remains intact.

### Dependency remediation

- Updated pnpm overrides and lockfile to `glob@14.0.6` and `minimatch@11.0.8`,
  resolving the reported moderate advisories GHSA-3g3m-2fjr-6pw4 and
  GHSA-g3hv-75wg-m249. `pnpm why glob minimatch` confirmed the affected
  dependency consumers resolve to the patched versions; the separate legacy
  `minimatch@5.1.8` remains outside the second advisory's affected range.
- `pnpm run check:dep-audit` passed with 0 critical, 0 high, 0 moderate, and 0
  documented exceptions. TypeScript, lint (0 errors; 1,696 warnings), Vite
  production build, and a focused 64-test forecast/export/dispatch slice passed.
- Focused coverage for that slice passed at 89.82% line coverage (76.18%
  branches). Coverage output was directed to `/tmp`; the intentionally absent
  repository `coverage/lcov.info` was not recreated or overwritten. This is
  targeted coverage evidence, not a repository-wide threshold result.

### Checks and proof boundaries

- Dependency audit, `git diff --check`, claim-boundaries, source-docs, strict
  positioning, and lint-warning-baseline passed. Results: 0/0/0 advisories;
  431 active files; 11 active/28 historical source docs; `CONDITIONAL_GO`
  with zero experiments; lint 1,696 warnings/0 errors against 1,742/0.
- The full serial Vitest run was interrupted after more than 25 minutes to
  prioritize bounded verification; it has no final suite result and is NOT
  VERIFIED for this dependency-updated tree. The full coverage run was also
  interrupted without a global coverage summary.
- Final reruns of client-environment safety and repository hygiene were denied
  by the local hook because they inspect restricted dotenv/secrets paths (and
  the environment scanner writes outside the repository). Do not bypass this
  hook; classify both as NOT VERIFIED on this final check. Run the documented
  commands from an approved local terminal to close these checks.
- `check:secret-scan` was explicitly denied by the local execution hook because
  it inspects restricted secret paths. It was not bypassed; secret scan remains
  NOT VERIFIED. No dotenv files or credentials were read.
- The focused utility Playwright spec passed on the dependency-updated tree in
  all five configured projects: Chromium 7/7, Firefox 7/7, WebKit 7/7, Mobile
  Chrome 7/7, and Mobile Safari 7/7. The initial four-worker matrix produced
  timeout failures in Firefox and one WebKit case; those cases were rerun
  sequentially and passed. Firefox/Mobile Safari were rerun 14/14 and WebKit
  7/7 with one worker. This is focused browser coverage, not a full browser
  suite or hosted-browser check.
- No deployment, hosted migration/config change, external upload, or exact-commit
  CI run occurred. The owner runbook gates for hosted gateway trust, shared
  rate limiting, RLS/grants, storage and retention, backup/restore/rollback,
  source rights, named approvals, and buyer validation remain open.
- The bundled Ontario sample remains synthetic and suitable for a local
  workflow demonstration. Before reproducing actual IESO records in public
  outputs, the data steward must confirm applicable source-specific terms and
  required attribution. Forecast metrics remain descriptive; they do not
  establish a time-series coverage guarantee or hosted readiness.

### Round K decision

The dependency advisory gap is closed at the local lockfile/install/audit and
build/type/lint proof layers. The focused five-project utility browser journey
was verified. Client-environment safety, repository hygiene, secret scanning,
full-suite/global coverage completion, hosted controls, exact-commit CI, and
external validation remain open with the proof boundaries above. Preserve the
interrupted and denied receipts as-is; do not relabel them as passes.
