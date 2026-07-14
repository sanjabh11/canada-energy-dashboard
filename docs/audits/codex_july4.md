@fable5-prompt (emulated from the provided Windsurf skill path) + Everything Claude Code PhaseLoop

# CEIP July 4 Audit Cross-Verification And Fix Plan

## Summary

The July 4 audit is useful, but it is a focused market-positioning audit, not a complete 360-degree Fable5 audit. Its strongest issue is real: CEIP has far more route and feature breadth than its narrow proof-pack positioning suggests. Its proposed fix is too aggressive: active project rules deliberately keep broad dashboards, generic AI, API, and Indigenous sovereignty claims secondary until buyer/source proof exists.

The immediate implementation priority is not copy. Current `pnpm exec tsc -b --pretty false` fails, and `pnpm audit --audit-level moderate` fails with 16 vulnerabilities. The first fix phase must restore type integrity and dependency security before marketing-positioning changes.

Baseline checks already run:
- `pnpm run check:claim-boundaries`: passed for 418 active source/doc files.
- `pnpm run check:commercial-source`: passed for 11 active docs and 28 historical docs.
- `pnpm exec tsc -b --pretty false`: failed on scenario workbench, sensitivity/uncertainty, connector, validator, and audit-trail test types.
- `pnpm audit --audit-level moderate`: failed with high Vite and Undici advisories, plus DOMPurify and js-yaml moderate advisories.
- ECC dynamic workflow dry-run: `skip`, normal PhaseLoop, no backlog creation.

## Immediate Gap Table

| ID | Cross-Verified Gap | Evidence | Decision | First Fix |
|---|---|---|---|---|
| P0-TYPE-1 | Scenario workbench is wired to stale sensitivity/uncertainty APIs. | [ScenarioWorkbenchPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/ScenarioWorkbenchPage.tsx:41), [sensitivityEngine.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/sensitivityEngine.ts:27), [uncertaintyEngine.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/uncertaintyEngine.ts:169) | Accept as P0 blocker. | Align component to existing engine APIs; do not invent compatibility shims unless tests require them. |
| P0-TYPE-2 | Connector `discover()` failure paths omit required `sourceLastUpdated`. | [connectors/index.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/connectors/index.ts:51), [ieso.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/connectors/ieso.ts:36), [statcan.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/connectors/statcan.ts:43) | Accept as P0 blocker. | Return `{ available: false, sourceLastUpdated: null, message }` consistently. |
| P0-TYPE-3 | Balance validator imports connector types from the wrong relative path. | [balanceValidators.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/validators/balanceValidators.ts:23) | Accept as P0 blocker. | Change type import to `../connectors/index.ts`. |
| P0-SEC-1 | Dependency audit fails. | `pnpm audit --audit-level moderate`: 16 vulns; Vite patched at `>=7.3.5`, Undici patched at `>=7.28.0`, DOMPurify patched at `>=3.4.11`. | Accept as P0/P1 blocker. | Upgrade narrow packages/overrides, then rerun audit and build. |
| P1-MKT-1 | Prior audit says “pricing absent,” but pricing page exists. Active docs lack pricing reconciliation. | [PricingPage.tsx](/Users/sanjayb/minimax/canada-energy-dashboard/src/components/PricingPage.tsx:27), [pricingCatalog.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/pricingCatalog.ts:18), [COMMERCIAL_SOURCE_OF_TRUTH.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/COMMERCIAL_SOURCE_OF_TRUTH.md:25) | Modify finding. | Add pricing source-of-truth sync, not a new pricing implementation. |
| P1-MKT-2 | “Proof pack” can be buyer-jargon, but replacing it everywhere would break active guardrails. | [README.md](/Users/sanjayb/minimax/canada-energy-dashboard/README.md:3), [Top20.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/Top20.md:14), [COMMERCIAL_SOURCE_OF_TRUTH.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/COMMERCIAL_SOURCE_OF_TRUTH.md:42) | Modify. | Keep internal `proof pack`; add buyer-language aliases like “forecast planning pack,” “TIER compliance memo,” and “OEB/AUC filing pack.” |
| P1-MKT-3 | “Promote broad dashboards as moat” conflicts with active strategy. | [README.md](/Users/sanjayb/minimax/canada-energy-dashboard/README.md:7), [Top20.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/Top20.md:41), [commercialPositioning.ts](/Users/sanjayb/minimax/canada-energy-dashboard/src/lib/commercialPositioning.ts:225) | Reject as lead positioning. | Use dashboards as proof library/context after a buyer workflow is selected. |
| P1-MKT-4 | “Allow AI-powered language” is risky under OWASP/claim-boundary posture and current docs. | [COMMERCIAL_SOURCE_OF_TRUTH.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/COMMERCIAL_SOURCE_OF_TRUTH.md:94), [check-claim-boundaries.mjs](/Users/sanjayb/minimax/canada-energy-dashboard/scripts/check-claim-boundaries.mjs:81) | Modify. | Permit only bounded “AI-assisted query/explanation” where route evidence and guardrails support it. |
| P1-MKT-5 | Indigenous opportunity should not be promoted as OCAP-compliant or “zero competitors.” | [Top20.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/Top20.md:51), [COMMERCIAL_SOURCE_OF_TRUTH.md](/Users/sanjayb/minimax/canada-energy-dashboard/docs/COMMERCIAL_SOURCE_OF_TRUTH.md:101) | Modify. | Add co-design partner pathway and governance checklist; no compliance claim. |
| P2-ARCH-1 | New scenario/connector files indicate the right architecture direction but are not integrated cleanly yet. | Typecheck failures plus connector framework files. | Accept. | Complete scenario substrate only after P0 green. |
| P2-TEST-1 | Existing guardrails are strong, but new scenario/connector paths lack stable acceptance checks. | 155 tests exist, but typecheck fails before full confidence. | Accept. | Add targeted unit tests for each repaired contract. |
| P2-RESEARCH-1 | Energy-systems best practice now expects ensembles, uncertainty, sensitivity, provenance, and reproducibility. | Pathway ensemble, open energy modeling, and sensitivity literature reviewed. | Accept. | Fold into scenario workbench acceptance criteria, not marketing copy. |

## Research Anchors

Use these as the standard for implementation decisions:
- React/Vite: official React guidance supports Suspense/error-boundary patterns but warns route `React.lazy` can create loading waterfalls; Vite docs confirm `VITE_*` variables are client-bundled and must not contain secrets.
- Security: [OWASP Top 10 2025](https://owasp.org/Top10/2025/) now explicitly emphasizes broken access control, supply-chain failures, injection, insecure design, logging/alerting, and exceptional-condition handling.
- Accessibility: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) AA is the target; new criteria include focus not obscured and minimum target size.
- Market: [Edgecom pTrack Alberta](https://edgecom.ai/ptrack-alberta/) validates the competitive pressure around AI peak prediction; carbon-accounting competitors emphasize audit-ready reports, data automation, and outcome language.
- Energy modeling: pathway ensemble and open-energy-modeling literature supports scenario ensembles, transparent assumptions, FAIR metadata, sensitivity analysis, and reproducible outputs.
- Canadian data: [CER EF2026](https://www.cer-rec.gc.ca/en/data-analysis/canada-energy-future/2026/access-and-explore-energy-future-data.html) and [StatCan WDS](https://www.statcan.gc.ca/en/developers/wds) are appropriate source-backed connector targets.

## Phase Plan

### Phase 0 - Freeze Baseline And Protect User Work

Purpose: establish a clean repair boundary before touching a dirty worktree.

Actions:
- Record current dirty/untracked state and classify all existing changes as user/prior-agent work.
- Do not revert or overwrite current forecasting/training/audit artifacts.
- Re-run only non-mutating checks needed to confirm the starting state.
- Create a short local execution note when implementation mode is available.

Exit criteria:
- `git status --short` captured.
- All files to be edited are explicitly listed.
- No unrelated dirty file is changed.
- Implementation agent can explain which changes are theirs.

Verification:
- `git status --short`
- `pnpm run check:claim-boundaries`
- `pnpm run check:commercial-source`

### Phase 1 - Restore Type Safety And Supply-Chain Baseline

Purpose: make the current code buildable before product or market edits.

Actions:
- Repair `ScenarioWorkbenchPage` to use the actual `SensitivityEngine.localAnalysis`, `SensitivityEngine.tornadoChart`, and `UncertaintyEngine.runMonteCarlo(parameters, fixed, options)` APIs.
- Use existing `SensitivityParameter.name/min/max/unit` fields instead of non-existent `id/label/low/high`.
- Use `MonteCarloResult.output.quantiles` and `MonteCarloResult.output.effectiveSampleSize` instead of non-existent `statistics` and `nSamples`.
- Fix connector `discover()` catch/failure return shapes.
- Fix validator import path.
- Resolve the `auditTrailManifest.test.ts` discriminated-union access issue by narrowing on success before reading `error`.
- Upgrade/override only vulnerable packages needed to clear audit: Vite, DOMPurify, jsdom/Undici path, and js-yaml path if still reachable.

Exit criteria:
- Typecheck passes.
- Dependency audit has no moderate/high findings.
- No public behavior changes except scenario workbench becoming usable.

Verification:
- `pnpm exec tsc -b --pretty false`
- `pnpm audit --audit-level moderate`
- `pnpm exec vitest run tests/unit/uncertaintyEngine.test.ts tests/unit/sensitivityEngine.test.ts tests/unit/auditTrailManifest.test.ts --run`
- `pnpm run check:claim-boundaries`
- `pnpm run check:commercial-source`

### Phase 2 - Complete The Fable 360 Audit Report

Purpose: replace the current market-only audit with the full audit the skill promised.

Actions:
- Produce the full Fable report at `docs/audits/audit-2026-07-04.md` or supersede the current purpose/audience file with a clearly dated replacement.
- Include calibration, tooling discovery, quantitative discovery, largest files, churn, test mapping, top features, segment fit, findings, false positives, improvement strategy, implementation tasks, feature ratings, metrics snapshot, and phase exit status.
- Treat the current `audit-2026-07-04-purpose-audience-proposition.md` as an input, not as ground truth.
- Downgrade/refine unsupported findings:
  - Pricing is implemented but unsynchronized in active docs.
  - Broad dashboards should remain support surfaces, not lead positioning.
  - API pack should be a technical follow-on unless OpenAPI parity and freshness evidence pass.
  - Indigenous segment should be co-design/research-partner language, not a compliance or sovereignty claim.
  - AI language should be bounded and route-specific.

Exit criteria:
- Every finding has file:line evidence.
- Critical/high findings have a refutation note.
- No finding relies on memory or old docs without current confirmation.
- Report distinguishes facts from judgments.

Verification:
- `pnpm run check:commercial-source`
- `pnpm run check:claim-boundaries`
- Manual spot-check: each Critical/High row has a current file link and command/source evidence.

### Phase 3 - Correct Commercial Proposition Without Breaking Guardrails

Purpose: improve sellability while preserving the hard-won proof-boundary discipline.

Actions:
- Keep lead positioning as “Canadian utility and Alberta TIER proof-pack product,” but add buyer-language aliases in UI/search metadata:
  - Utility demand forecast planning software
  - Forecast benchmark report
  - OEB/AUC filing preparation pack
  - Ontario GA/ICI 5CP decision-support tool
  - Alberta TIER compliance planning memo
  - Utility security procurement evidence pack
- Add a pricing synchronization section to active docs using `src/lib/pricingCatalog.ts` as the source, not hardcoded repeated prose.
- Add a cross-sell/bundle map:
  - Utility spine: utility forecast + benchmark + regulatory filing + security.
  - Industrial spine: TIER ROI + credit banking + GA/ICI where applicable.
  - Municipal spine: asset health + shadow billing + regulatory/board memo.
  - Consultant spine: benchmark + export/API + client-ready evidence packs.
- Add Indigenous co-design pathway as a trust-sensitive pilot lane with explicit “not OCAP-compliant” boundary.
- Keep broad dashboards as “context library” surfaced after a route-specific workflow.

Exit criteria:
- Buyer-language improves without replacing proof-boundary language.
- Pricing page, pricing catalog, README, Top20, and commercial source agree.
- Claim guardrails still pass.
- No “guaranteed savings,” “AI-powered superiority,” “OCAP-compliant,” or “production connector” claims appear.

Verification:
- `pnpm run check:commercial-source`
- `pnpm run check:claim-boundaries`
- `pnpm exec vitest run tests/unit/commercialPositioning.test.ts tests/unit/claimRegistry.test.ts --run`

### Phase 4 - Scenario/Connector Research Substrate

Purpose: turn the new scenario/connector direction into a reliable analytical layer.

Actions:
- Keep Supabase/Postgres as the substrate; do not introduce new infrastructure.
- Finalize connector contract for StatCan, CER EF2026, ECCC NPRI, AESO, and IESO.
- Add connector fixture tests with official-source-shaped sample payloads.
- Add scenario reproducibility fields: assumption pack ID, source hash, model version, run seed, created timestamp, and warning list.
- Add energy/emissions balance validators with explicit unit registry.
- Add scenario workbench copy that says “exploratory scenario analysis,” not “policy-grade model” unless validation evidence exists.

Exit criteria:
- Connector API contracts compile and pass fixture tests.
- Scenario workbench renders deterministic sample outputs.
- Every displayed scenario output has provenance and uncertainty/freshness labels.
- External-source failures produce stale/degraded state, not unlabeled fallback.

Verification:
- `pnpm exec tsc -b --pretty false`
- `pnpm exec vitest run tests/unit/*connector* tests/unit/*balance* tests/unit/uncertaintyEngine.test.ts --run`
- `pnpm run check:claim-boundaries`

### Phase 5 - UX, Accessibility, And Browser Verification

Purpose: verify the visible product is understandable to utilities, regulators, economists, consultants, and public users.

Actions:
- Keep `/utility-demand-forecast` and `/solutions` as primary front doors.
- Add a role-based navigation path without hiding existing routes:
  - Utility planner
  - Industrial compliance/CFO
  - Regulator/reviewer
  - Consultant/API user
  - Municipal/public sector
  - Indigenous/community co-design
- Run WCAG 2.2 AA-focused checks on primary proof-pack, pricing, and scenario routes.
- Add Playwright checks for pricing route, solutions route, scenario workbench, and proof-pack front door.
- Preserve current broad dashboard route as context, not lead CTA.

Exit criteria:
- Primary journeys can be completed by keyboard.
- Focus indicators are not obscured.
- Pricing, proof-pack, and scenario pages have no critical visual overflow on desktop/mobile.
- Browser smoke passes for top proof-pack routes.

Verification:
- `pnpm run test:browser:local:proof-packs`
- Add focused Playwright specs for `/pricing`, `/solutions`, and `/scenario-workbench`
- Optional hosted checks only after owner-approved deploy

### Phase 6 - Release-Readiness Gate

Purpose: prevent “audit fixed” claims until the repo’s own readiness system agrees.

Actions:
- Re-run all focused gates.
- Generate release/readiness reports only after source provenance is clean or intentionally documented.
- Do not deploy, push, or request production approval automatically.

Exit criteria:
- Typecheck, audit, unit, commercial, claim, and browser gates pass.
- Any remaining blocker is documented with owner decision required.
- No production or buyer-confidence claim is made without evidence.

Verification:
- `pnpm exec tsc -b --pretty false`
- `pnpm audit --audit-level moderate`
- `pnpm run test:strategy-audit-slice`
- `pnpm run check:release-readiness`
- `pnpm run report:production-approval-packet` only after the worktree/source-provenance situation is intentionally resolved

## Top Implementation Sketches

1. Scenario workbench contract repair:
   - Replace `SensitivityResult` usage with a local view model derived from `LocalSensitivityResult[]` and `TornadoBar[]`.
   - Replace `result.statistics.*` with `result.output.quantiles.*`, `result.output.mean`, and `result.output.effectiveSampleSize`.
   - Replace object-style `runMonteCarlo({ uncertainParams, fixedParams, nSamples })` with positional `runMonteCarlo(CER_UNCERTAIN_PARAMS, {}, { nSamples, progressCallback })`.
   - Add one unit test for the view-model adapter and one Playwright smoke for `/scenario-workbench`.

2. Connector and validator type repair:
   - Add `sourceLastUpdated: null` to every failed `DiscoverResult`.
   - Fix `src/lib/validators/balanceValidators.ts` import to `../connectors/index.ts`.
   - Add fixture tests that assert connectors never throw on unreachable sources and always return lineage/warnings.

3. Commercial sync repair:
   - Use `CEIP_PRICING` as canonical pricing data.
   - Add active-doc pricing table with caveats and no guaranteed savings.
   - Update commercial-source checker to require pricing consistency if pricing is mentioned.
   - Keep broad dashboards and API as support surfaces until OpenAPI/freshness parity evidence passes.

## New Feature/Improvement Ratings

| Improvement | Market Impact | Effort Ease | Seller Strength | UX Gain | Risk Reduction | Avg | Decision |
|---|---:|---:|---:|---:|---:|---:|---|
| Restore typecheck and scenario contract | 4 | 3 | 3 | 4 | 5 | 3.8 | P0 |
| Clear dependency audit | 4 | 4 | 3 | 2 | 5 | 3.6 | P0 |
| Buyer-language aliases for proof packs | 5 | 4 | 5 | 4 | 4 | 4.4 | P1 |
| Pricing sync across code/docs | 4 | 4 | 4 | 4 | 4 | 4.0 | P1 |
| Role-based solutions navigation | 4 | 3 | 4 | 5 | 3 | 3.8 | P2 |
| Co-design Indigenous pathway | 4 | 3 | 4 | 4 | 5 | 4.0 | P2 |
| API pack parity/freshness gate | 3 | 2 | 4 | 3 | 5 | 3.4 | P3 |
| Scenario reproducibility substrate | 5 | 2 | 4 | 4 | 5 | 4.0 | P3 |
| Connector fixture framework | 4 | 3 | 3 | 3 | 5 | 3.6 | P3 |
| WCAG 2.2 proof-pack smoke | 3 | 3 | 3 | 5 | 4 | 3.6 | P2 |

## Assumptions And Defaults

- No implementation occurs while this thread remains in Plan Mode.
- Existing dirty/untracked files are preserved as user/prior-agent work.
- Current source-of-truth guardrails win over the July 4 audit where they conflict.
- “Proof pack” remains the internal controlled term; buyer-facing pages may add clearer category labels.
- Broad dashboards are a support/context library, not the lead commercial proposition.
- “AI-assisted” may be used only when tied to specific implemented routes and guardrails; “AI-powered superiority” remains disallowed.
- Indigenous features use co-design and owner-supplied governance language only.
- The implementation confidence target cannot honestly exceed 95% until typecheck, audit, focused tests, claim gates, and browser smoke pass.
