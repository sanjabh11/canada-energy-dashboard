# CEIP Conversation Outcome Review

> Date: 2026-06-03
> Scope: Canada Energy Intelligence Platform strategy, proof-pack implementation, repo hygiene, Supabase/GitHub readiness, and production deploy status.
> Evidence basis: current repo at `be9cfe7`, production Netlify deploy `6a1fc17dad273f241f9ba768`, repo-native verification commands, GitHub metadata, Supabase CLI lint, and current public source anchors.

## Current Verdict

The local and hosted product direction work is complete for desk-research strategy, public proof-pack positioning, release hygiene, production static parity, and hosted proof-pack route smoke. The full market-confidence goal is not complete because there is no real production buyer-evidence register, no accepted buyer proof packs, and the Supabase MCP connector still cannot read advisors for the linked project.

Buyer-proven 95% market confidence must remain blocked until a real filled pilot evidence register passes:

```bash
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts
```

## Evidence Snapshot

| Area | Current state | Verification |
|---|---|---|
| Repo head | `main` matches `origin/main` at `be9cfe7 feat: surface buyer evidence readiness command` | `git status --short --branch`, `git log -1 --oneline --decorate` |
| Production deploy | Live at `https://canada-energy.netlify.app`; unique deploy `6a1fc17dad273f241f9ba768` | Netlify deploy script output |
| Live static parity | Root, manifest, and JSON-LD match the built `dist` artifact | `pnpm run check:live-static-parity` |
| Hosted proof-pack smoke | Six proof routes pass on production | `pnpm run test:browser:hosted:proof-packs` |
| Strategy completion | Desk-research deliverable complete; buyer market proof remains external | `pnpm run report:strategy-completion-audit -- --include-checks` |
| Buyer evidence | 0 production pilot evidence registers, 0 production outreach logs | `pnpm run report:buyer-evidence-readiness` |
| Supabase app-owned lint | 0 app-owned findings; 14 extension-owned lint rows remain extension-owned | `pnpm run check:supabase-app-lint` |
| Supabase MCP advisors | Still permission-denied for security and performance advisors | Supabase MCP `_get_advisors` |
| GitHub metadata | Public repo has description, MIT license, topics, and green recent workflows | `gh repo view`, `gh run list` |
| Git LFS | Installed and usable at `/opt/homebrew/bin/git-lfs` | `git lfs version` |

## Table 1: Mission Started And Top 10 Unique Strategy Targets

Rating scale: 5 = strong and currently verified, 4 = strong but needs buyer proof, 3 = implemented but not lead-positioned, 2 = candidate or partial, 1 = not yet usable.

| Rank | Mission / target area | Unique approach | Current rating /5 | Evidence |
|---:|---|---|---:|---|
| 1 | Shift from broad dashboard to buyer-owned proof packs | Sell artifacts that map to utility, filing, TIER, security, billing, and forecast decisions rather than generic analytics | 5 | Commercial landing page, solutions navigator, roadmap, source-of-truth guard |
| 2 | Utility demand forecasting lane | Forecasts are packaged with source labels, assumptions, scenario outputs, and benchmark appendix | 5 | `/utility-demand-forecast`, utility forecast proof pack, hosted smoke |
| 3 | Forecast trust / champion-challenger evidence | Baselines, rolling-origin splits, interval coverage, MASE, interval score, and failure notes are surfaced instead of hiding weak models | 5 | `/forecast-benchmarking`, forecast trust helpers, focused tests |
| 4 | OEB/AUC filing support | Filing prep is bounded as checklist/schedule mapping, not regulator submission automation | 5 | `/regulatory-filing`, OEB/AUC source-currency checklists |
| 5 | Ontario GA/ICI 5CP decision support | Ontario-specific peak-risk proof pack with IESO source boundaries and no savings guarantee | 4 | `/ga-ici-5cp`, public actuals guard, IESO Global Adjustment and Peak Tracker anchors |
| 6 | Privacy-preserving BYO-CSV proof | Local/browser-first CSV retained extract with schema, completeness, direct-identifier, formula, and linkage warnings | 4 | `/byo-csv-proof`, retained extract helper, hosted smoke |
| 7 | Alberta TIER CFO / policy what-if | Compliance pathway comparison stays planning-only with dated source labels and legal/trading/tax boundaries | 4 | `/roi-calculator`, Alberta TIER source anchor |
| 8 | TIER credit banking audit pack | Credit lot allocation and expiry-risk planning without registry certification or broker claims | 4 | `/credit-banking`, proof-pack route and canonical evidence mapping |
| 9 | Utility security procurement pack | Separates repo-backed controls, deployed evidence, owner-supplied evidence, and do-not-claim items | 4 | `/utility-security`, utility security proof pack, Supabase lint fallback |
| 10 | Shadow billing invoice proof | Supply-cost delta and field-map audit workflow before claiming bill reconstruction or verified savings | 4 | `/shadow-billing`, shadow billing proof pack, pilot evidence mapping |

## Table 2: Targets Achieved And Degree Of Success

| Target achieved | Success /5 | What changed | Current proof |
|---|---:|---|---|
| Strategy-direction confidence reached 95/100 for desk research | 5 | Seven pillars now have explicit scores, loopholes, and fixes | `docs/CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md`, `check:strategy-roadmap-doc` |
| Live Netlify root no longer serves stale overclaiming metadata | 5 | Production root, manifest, and JSON-LD now match the built proof-pack artifact | `check:post-deploy-live`, deploy `6a1fc17dad273f241f9ba768` |
| Public app front door now sells proof packs | 5 | Home and solutions routes lead with ten proof packs and pilot gates | `/`, `/solutions`, hosted browser smoke |
| Claim-boundary system hardened | 5 | Active source/docs are scanned for unsafe compliance, savings, production, and broad AI claims | `check:claim-boundaries`, `check:commercial-source` |
| Release-readiness and deploy gates codified | 5 | Release script requires clean tree, checks, build, env, explicit production phrase, and post-deploy verification | `scripts/deploy-production.sh`, `check:production-deploy-script` |
| GA/ICI and BYO-CSV radical candidates became usable prototypes | 4 | Both have routes, retained-artifact helpers, and live smoke for lead proof-pack support | `/ga-ici-5cp`, `/byo-csv-proof`, `test:wedge-prototype-routes` |
| Forecast credibility improved | 4 | Forecasting is benchmarked against naive baselines and uncertainty diagnostics | Forecast tests and benchmark-pack helpers |
| GitHub OSS hygiene improved | 5 | Description, MIT license, topics, package name, and repo hygiene are now aligned | `gh repo view`, `check:github-repo-metadata`, `check:repo-hygiene` |
| Git LFS push blocker resolved | 5 | `git-lfs` is installed and the repo has no LFS-tracked file blocker | `git lfs version`, clean `main...origin/main` |
| Supabase app-owned lint is clean | 4 | App-owned DB lint findings are zero, but MCP advisors still cannot run | `check:supabase-app-lint`; Supabase MCP permission denied |

## Table 3: Remaining Gaps, Next Targets, And Closure Actions

| Gap | Severity | Why it remains | Next target | Strategy / action | Owner |
|---|---:|---|---|---|---|
| No real buyer-evidence register | Critical | Repo scan finds 0 production buyer evidence registers and 0 outreach logs | Collect 3 accepted proof packs with total `confidence_delta >= 0.9` | Use Phase F workspace, append real anonymized outreach/reply rows, create intake packets, prepare retained artifacts, update register, run 95% validator | User/operator with buyer access |
| No commercial commitment proof | Critical | App is not released and no paid pilot, PO, LOI, or signed design partner evidence exists | At least one strong commercial signal | Keep test-only rehearsals at confidence 0; only real redacted commitment artifacts can move market confidence | User/operator |
| Supabase MCP advisor permission denied | High | Connector cannot read project advisors despite CLI fallback working | MCP security/performance advisors return readable results | Fix Supabase connector/project authorization for `qnymbecjgeaoxsfphrti`, then rerun security and performance advisors | User/account admin |
| Private local env was partially rehydrated | High | `.env.local` symlink incident restored only build-facing Vite keys | Restore private local secrets without exposing them in chat | Rehydrate private keys from password manager, Supabase, Netlify, and API providers; do not commit them | User |
| Buyer-specific forecast accuracy unproven | High | Public/sample benchmarks do not prove buyer load performance | One accepted utility forecast artifact with numeric buyer benchmark evidence | Run forecast proof pack on anonymized buyer data and produce retained trust report with reviewer acceptance | User/operator plus CEIP scripts |
| TIER/credit buyer validation missing | High | Scenario outputs exist, but no accepted facility or credit ledger evidence exists | One accepted TIER CFO or credit-banking proof pack | Use `/roi-calculator` or `/credit-banking`, retained artifact helper/register updater, reviewer feedback, day-14 decision | User/operator |
| Billing/security buyer validation missing | High | Security and shadow-billing packs exist, but no accepted buyer row exists | One accepted security or shadow-billing proof pack | Use `/utility-security` or `/shadow-billing`, attach redacted questionnaire/bill field map, hash artifact | User/operator |
| Source anchors can age | Medium | Regulatory and market pages change | Keep official/manual source evidence under freshness threshold | Rerun `check:strategy-source-anchors` before future claims, refresh manual evidence if stale | Codex/operator |
| UI still lacks an authenticated evidence intake workflow | Medium | Current UI explains gates and supports proof pages, but evidence collection remains command/workspace based | In-app evidence intake wizard with local redaction boundary | Build only after real operator flow stabilizes; keep sensitive originals out of repo | Future implementation |
| Production monitoring is still partly manual | Medium | `/status` now surfaces release posture, live-parity evidence, buyer-evidence blockers, and Supabase connector gaps, but those values are static posture evidence rather than continuous live monitoring | Automated release-health feed for deploy, source-anchor, buyer-evidence, and Supabase advisor status | Add after connector permission is fixed and telemetry boundaries are clear | Future implementation |

## Table 4: Top UI Features Not Yet Added

| Priority | UI feature | Why it matters | Suggested implementation | Dependencies |
|---:|---|---|---|---|
| 1 | Phase F evidence intake wizard | Converts manual commands into a guided operator flow without overclaiming buyer proof | Add a `/pilot-evidence` wizard that selects lane, validates required columns, creates non-confidence-moving intake packet, and exports next commands | Must preserve no-secrets and no-confidence-movement rules |
| 2 | Retained artifact hash manager | Reduces CSV/register hash drift when attaching redacted artifacts | UI panel for artifact file selection, route diagnostic checks, SHA-256 display, and register-ready reference export | Browser-local or explicitly approved file handling |
| 3 | Buyer evidence readiness dashboard | Makes the 95% blocker visible in one place | Read a redacted register and show lane coverage, confidence delta, fast-pack status, reviewer status, and commercial signal status | Real register path or uploaded redacted CSV |
| 4 | Supabase advisor status card | Shows whether security/performance advisors are readable and clean | Current `/status` surface names the connector permission blocker; next step is live advisor result ingestion after permissions are fixed | Supabase MCP permission fixed |
| 5 | Automated deploy parity status feed | Lets reviewers see whether production matches source/build without reading terminal logs | `/status` now carries current post-deploy evidence; next step is reading last parity/smoke artifacts from a generated public-safe status manifest | Safe public deploy metadata only |
| 6 | Proof-pack comparison matrix | Helps prospects pick the correct lane quickly | Interactive matrix comparing inputs, artifact, blocked claims, pilot time, and buyer role across the top 10 packs | Existing top-10 source data |
| 7 | Forecast benchmark explorer | Makes champion/challenger evidence easier to inspect | Visualize MAE, MAPE, RMSE, MASE, interval coverage, interval score, and baseline-win notes | Existing benchmark-pack JSON |
| 8 | GA/ICI public backtest explorer | Shows why GA/ICI is a bounded Ontario wedge without claiming savings | Interactive public top-five windows, watchlist capture rate, and source-dated boundary memo | IESO public actuals CSV and source refresh |
| 9 | Shadow-billing field-map builder | Reduces risk of unsupported savings claims | UI for mapping invoice CSV fields, marking excluded riders, and generating audit notes | Redacted bill data only |
| 10 | Outreach-to-intake operator board | Connects manual outreach replies to the next evidence action | Board for anonymized targets, route, reply status, next action, and generated intake packet status | Real anonymized outreach rows |

## Source And Best-Practice Anchors Rechecked

| Anchor | Current implication |
|---|---|
| IESO Global Adjustment / Class A / Peak Tracker | Supports GA/ICI 5CP as Ontario-specific decision support; no guaranteed savings, eligibility, settlement, or curtailment-instruction claims. |
| OEB filing requirements | Supports OEB filing-prep/checklist direction; no regulator-submission automation claim. |
| Alberta TIER regulation | Supports TIER scenario and credit-planning lanes; direct-investment and pricing language must stay date-stamped and bounded. |
| Nixtla conformal / rolling-window forecasting docs | Supports model-agnostic uncertainty, calibration, and rolling-origin evaluation direction; buyer-specific accuracy still needs buyer backtests. |
| Amperon, Itron, UtilityAPI incumbent surfaces | Confirms CEIP should avoid broad operational forecasting, grid-planning platform, or production data-exchange claims and stay in proof-pack workflow packaging. |

## Immediate Closure Plan

1. Keep production as-is while `check:post-deploy-live` is green.
2. Fix Supabase MCP authorization for project `qnymbecjgeaoxsfphrti`, then rerun security and performance advisors.
3. Rehydrate private local-only `.env` secrets from secure sources, not chat.
4. Start real Phase F buyer evidence collection only when a real anonymized buyer reply exists:

```bash
pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence
pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence
```

5. After real artifacts exist, update the register through the retained-artifact helpers and updater, then run the hard gate:

```bash
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts
```

6. Only after the hard buyer-evidence gate passes should public market-confidence language move beyond desk-research strategy confidence.
