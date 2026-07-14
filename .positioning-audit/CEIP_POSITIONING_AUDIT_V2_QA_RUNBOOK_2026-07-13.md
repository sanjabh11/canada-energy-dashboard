# CEIP Positioning Audit v2 — QA Runbook

**Purpose:** repeatably verify the eight audit phases, the independent verifier, and the CI optimization introduced on 2026-07-13.

**Rule:** QA records evidence from the command output or artifact path. A green command does not turn an unresolved buyer hypothesis into customer evidence.

## 0. Preconditions and evidence handling

| Step | QA action | Expected result | Evidence to retain | Fail if |
|---:|---|---|---|---|
| 0.1 | Confirm repository and branch: `pwd` and `git status --short --branch` | Worktree is the intended CEIP repository; unrelated dirty changes are documented | Terminal capture | QA runs against another repository or silently reverts user changes |
| 0.2 | Install exactly from lockfile: `pnpm install --frozen-lockfile` | Install completes without lockfile mutation | Install log and `git diff -- pnpm-lock.yaml` | Lockfile changes unexpectedly |
| 0.3 | Confirm the audit bundle exists: `find .positioning-audit/artifacts -maxdepth 1 -name 'phase-*.md' | sort` | Eight current phase artifacts are listed | File list | Any current phase artifact is missing |
| 0.4 | Run `node scripts/verify-positioning-audit.mjs` | JSON is emitted with `verdict: CONDITIONAL_GO` and an explicit warning list | Save JSON output | Verifier crashes, silently suppresses warnings, or changes the verdict without evidence |

## 1. Phase 0 — Pre-execution protocol

| Step | QA action | Expected result | Evidence to retain | Failure interpretation |
|---:|---|---|---|---|
| 1.1 | Read `.positioning-audit/state.json` | `current_phase=COMPLETE`, `current_gate=CONDITIONAL_GO`, `evidence_limited_mode=true` | State JSON | Final state has been overstated or evidence-limited mode was disabled prematurely |
| 1.2 | Check `decision_confidence` and gap totals | Composite is 79; gaps are 3 critical, 5 major, 0 minor | State JSON capture | Score or gap counts drift without a dated rationale |
| 1.3 | Check the Phase 0 artifact’s embedded snapshot | `evidence_limited_mode=false` is accepted only as a pre-Gate-1 snapshot; final `state.json` remains authoritative | Phase 0 lines and state JSON | The snapshot is presented as the final state |

## 2. Phase 1 — Evidence reconnaissance

| Step | QA action | Expected result | Evidence to retain | Failure interpretation |
|---:|---|---|---|---|
| 2.1 | Read `.positioning-audit/evidence-corpus.json` | 15 evidence items; five evidence types present; six buyer/commercial types missing | Evidence corpus | Inferred product or market signals are labeled as customer proof |
| 2.2 | Run `node scripts/verify-positioning-audit.mjs` and inspect `inventory` | Current counts are 138 routes, 68 lazy imports, 206 components, 183 lib files, 232 docs, and 109 deployable Edge Function directories | Verifier JSON | Historical v1/v2 counts are treated as current truth |
| 2.3 | Confirm missing evidence types | `customer_outcome`, `user_quote`, `behavioral_observation`, `support_ticket`, `analytics_data`, and `sales_data` remain missing | State and evidence corpus | Missing evidence is filled by codebase evidence or founder belief |

## 3. Phase 2 — Market research

| Step | QA action | Expected result | Evidence to retain | Failure interpretation |
|---:|---|---|---|---|
| 3.1 | Verify the official Alberta TIER source and the Canada–Alberta agreement links in the verification report | Sources resolve and support TIER obligations, pathways, reporting, and price schedule | URLs, access date, notes | A secondary source is used as the sole regulatory authority |
| 3.2 | Review competitor claims in the report | “No direct competitor” is narrowed; Targray and cCarbon remain adjacent first-party examples | Competitor source notes | Absence claims are made from a small or unnamed search set |
| 3.3 | Review TAM/SAM/SOM wording | Market size is labeled directional/derived, not demand or revenue proof | Report excerpt | Derived estimates are presented as validated market demand |
| 3.4 | Review Direct Investment wording | Release timing and demand impact are marked unconfirmed | Report excerpt | “Not released” or “demand spike” is asserted as certain |

## 4. Phase 3 — Segment triangulation

| Step | QA action | Expected result | Evidence to retain | Failure interpretation |
|---:|---|---|---|---|
| 4.1 | Inspect `src/lib/commercialPositioning.ts` | TIER compliance and credit-banking wedges exist; TIER has semantic ID `tier-compliance` | Source lines | Product definition is mistaken for buyer validation |
| 4.2 | Inspect `src/components/CommercialLandingPage.tsx` | Homepage defaults to `Utility`; TIER is one of several proof-pack narratives | Source lines and screenshot if needed | Homepage focus is claimed to be TIER-first when it is not |
| 4.3 | Inspect `src/App.tsx` | TIER entry paths include `/roi-calculator`, `/industrial`, `/tier-savings`, and `/credit-banking`; `/tier-compliance` is absent | Route grep output | The semantic ID is incorrectly reported as a public route |

## 5. Phase 4 — Alignment and gap map

| Step | QA action | Expected result | Evidence to retain | Failure interpretation |
|---:|---|---|---|---|
| 5.1 | Read the eight-type gap table in the verification report | Gaps are Need, Proof, Evidence, Product, Positioning, Pricing, Distribution, Adoption | Report table | A gap type is omitted or duplicated |
| 5.2 | Confirm severity counts | Need/Proof/Evidence are Critical; other five are Major | Report table and state JSON | Severity is reduced without new evidence |
| 5.3 | Check each gap’s closure evidence | Each gap names a concrete evidence-producing action, not a narrative rewrite | Report table | “Update copy” is treated as closing a buyer-evidence gap |

## 6. Phase 5 — Validation plan

| Step | QA action | Expected result | Evidence to retain | Failure interpretation |
|---:|---|---|---|---|
| 6.1 | Read `.positioning-audit/experiments.json` | `EXP-001` through `EXP-008` exist with method, thresholds, sample, duration, and priority | Experiments JSON | An experiment has no falsification threshold or sample definition |
| 6.2 | Validate the repaired linkage | `EXP-008.hypothesis_id` equals `H-CONTRA-1`; no invalid hypothesis IDs are reported | Verifier JSON | A display name such as `Contrarian` is used as a hypothesis key |
| 6.3 | Review unlinked hypotheses | Only `H-DI-1` and `H-CREDIT-2` are currently unlinked; this is a documented warning | Verifier JSON | Unlinked hypotheses are silently treated as covered |
| 6.4 | Confirm execution boundary | `experiments_executed=0`; all seven hypotheses remain `Unresolved` | State and hypotheses JSON | Signups, replies, or planned pilots are reported as completed validation |

## 7. Phase 6 — Codebase remediation and product-boundary checks

| Step | QA action | Expected result | Evidence to retain | Failure interpretation |
|---:|---|---|---|---|
| 7.1 | Run `pnpm exec tsc -p tsconfig.app.json --noEmit` | Exit 0 | Command output | Type regression |
| 7.2 | Run targeted tests: `pnpm exec vitest run tests/unit/commercialPositioning.test.ts tests/unit/proofPackGates.test.ts tests/unit/pilotEvidenceRegisterValidator.test.ts --testTimeout=120000 --no-file-parallelism --maxWorkers=1` | 3 files and 56 tests pass | Test output | Positioning, proof-pack, or evidence-gate regression |
| 7.3 | Run `node scripts/check-claim-boundaries.mjs` | Guard passes for active source/doc files | Command output | Strong TIER price, trading, savings, regulatory, or production claims escaped their boundary |
| 7.4 | Inspect `src/components/TIERROICalculator.tsx` and `src/lib/tierProofPack.ts` | Fallback pricing, estimated Direct Investment assumptions, buyer validation, and non-binding memo disclaimers remain visible | Source lines or browser capture | Scenario planning is presented as executed trading, legal advice, or guaranteed savings |
| 7.5 | Run `pnpm exec vite build` | `dist/` is produced successfully | Build log | Production bundle regression |

## 8. Phase 7 — Drift tracking and CI optimization

| Step | QA action | Expected result | Evidence to retain | Failure interpretation |
|---:|---|---|---|---|
| 8.1 | Re-run `node scripts/verify-positioning-audit.mjs` after any audit change | Counts, warnings, and verdict are recalculated from the current worktree | Before/after verifier JSON | A report is edited without re-running current-state checks |
| 8.2 | Run `pnpm exec prettier --check .github/workflows/ci.yml` and `git diff --check -- .github/workflows/ci.yml` | Both pass | Command output | Workflow formatting or whitespace regression |
| 8.3 | Confirm `.github/workflows/ci.yml` Build precedes Phase 6 browser smoke | Build creates `dist/` before the browser step | Workflow source | Browser test server rebuilds the application unnecessarily |
| 8.4 | Confirm Phase 6 environment | `PLAYWRIGHT_WEBSERVER_COMMAND` is `pnpm exec vite preview ...` on port 4199 | Workflow source and run log | CI still invokes `test:e2e:preview`, causing a second TypeScript/Vite build |
| 8.5 | Smoke the existing build locally: start `pnpm exec vite preview --host 127.0.0.1 --port 4199 --strictPort`, then request `/` | HTTP 200 and root shell are served from existing `dist/` | Curl output | Preview command cannot serve the already-built artifact |
| 8.6 | Run the browser suite in an environment with Chromium installed: `pnpm run test:browser:phase6` | All 16 route checks pass; no unexpected page, console, or document errors | Playwright report and JSON | Browser behavior changed or the preview artifact is stale |

## CI-specific acceptance sequence

Run in this order when validating a pull request:

| Order | Command / workflow step | Pass criterion |
|---:|---|---|
| 1 | `pnpm audit --audit-level moderate` | No moderate-or-higher vulnerability; low findings remain separately tracked if present |
| 2 | `node scripts/verify-supabase-migrations.mjs` | Exit 0 |
| 3 | `pnpm exec tsc -b` | Exit 0 |
| 4 | `pnpm exec vite build` | Exit 0 and `dist/` exists |
| 5 | Existing proof, source, hygiene, environment, metadata, and evidence gates | All exit 0 |
| 6 | `pnpm exec vitest run` | All unit tests pass |
| 7 | `pnpm exec playwright install --with-deps chromium` | Chromium and Linux dependencies available on a fresh runner |
| 8 | Phase 0 smoke tests | Foundation gates and status evidence render correctly |
| 9 | Phase 6 proof-pack smoke tests | Tests preview the existing `dist/`; no duplicate build appears in the web-server log |

## Final QA decision rubric

| Decision | Conditions |
|---|---|
| PASS — implementation integrity | Verifier runs; TypeScript, targeted tests, claim-boundary checks, build, and browser smoke pass; expected warnings are recorded. |
| PASS WITH EVIDENCE LIMITATION | All implementation checks pass but no buyer evidence exists; retain `CONDITIONAL_GO` and evidence-limited mode. |
| BLOCK — implementation defect | Any command fails, `/tier-compliance` is accidentally claimed as present, invalid experiment links reappear, or scenario outputs lose their guardrails. |
| BLOCK — evidence overclaim | Any report or QA result treats planned experiments, page views, signups, or inferred regulatory need as customer outcome evidence. |

## Evidence packet QA should attach

1. Verifier JSON output.
2. `state.json`, `evidence-corpus.json`, `hypotheses.json`, and `experiments.json` hashes or copies.
3. TypeScript, test, claim-boundary, and build logs.
4. Playwright HTML/JSON reports and screenshots only for failures.
5. Current CI run URL and the workflow log showing the existing-`dist` preview command.
6. A short note listing the four expected verifier warnings and any newly introduced warning.
