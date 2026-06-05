# CEIP Commercial Source Of Truth

> Date: June 3, 2026
> Purpose: define which docs can be used for current sales, outreach, pilot scoping, and public positioning.
> Rule: when this file conflicts with older research, outreach, PRD, or monetization notes, this file and the active docs below win.

## Active Commercial Sources

Use these files for current CEIP positioning:

| File | Role | Required boundary |
|---|---|---|
| [README.md](../README.md) | Public repo entrypoint. | Must lead with proof-pack positioning, current ratings, verification commands, and do-not-claim boundaries. |
| [Top20.md](./Top20.md) | Ranked product and USP source of truth. | Desk-research strategy-direction confidence is 95/100; 95% market confidence needs buyer-supplied pilot evidence. |
| [CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md](./CEIP_STRATEGY_95_FEATURE_GAP_ROADMAP_2026-05-31.md) | Current 95% desk-research strategy-direction roadmap and gap ledger. | Does not raise market confidence above the buyer-evidence gate; live parity is achieved only when post-deploy live checks pass for the current production artifact, future deploys require approval, and buyer evidence remains the confidence blocker. |
| [CEIP_CONVERSATION_OUTCOME_REVIEW_2026-06-03.md](./CEIP_CONVERSATION_OUTCOME_REVIEW_2026-06-03.md) | Current conversation mission review, achieved-target table, remaining-gap table, and next UI-feature roadmap. | Production static parity is current only after the approved deploy passes `check:post-deploy-live`; buyer-proven 95% market confidence remains blocked until the real pilot evidence register passes the hard gate. |
| [PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md](./PILOT_EVIDENCE_INTAKE_AND_ACCEPTANCE.md) | Buyer evidence intake and 14-day pilot acceptance checklist. | No feature rating increase without matching buyer evidence. |
| [MVP_DEMO_FREEZE_HANDOFF.md](./MVP_DEMO_FREEZE_HANDOFF.md) | Demo runbook and customer narrative boundary. | UtilityAPI remains fixture/sandbox; no production onboarding claims. |
| [HERMES_OUTREACH_OPERATING_PLAN.md](./HERMES_OUTREACH_OPERATING_PLAN.md) | Manual outreach operating plan. | Proof-pack pilot outreach only; stop conditions apply. |
| [growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md](./growth/CEIP_OUTREACH_CAMPAIGN_ASSETS.md) | Current outreach copy library. | Lead with proof packs, not broad dashboards or generic AI. |
| [growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md](./growth/templates/OUTREACH_AND_PILOT_TEMPLATES.md) | Email/LinkedIn and pilot templates. | Must name route, input data, artifact, caveat, and decision criteria. |
| [growth/templates/OUTREACH_RESPONSE_LOG_TEMPLATE.csv](./growth/templates/OUTREACH_RESPONSE_LOG_TEMPLATE.csv) | Machine-readable anonymized outreach response log. | Must record proof-pack route, caveat, artifact promise, reply status, and pilot-evidence follow-up action without direct identifiers. |
| [growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv](./growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv) | Machine-readable buyer evidence register. | Must record `time_to_artifact_hours`, `buyer_data_coverage_pct`, `benchmark_lift_or_diagnostic`, `reviewer_acceptance`, and `commercial_commitment_status` before confidence changes. |

## Active Sellability Ratings

The active outreach docs must use the current sellability-confidence ratings from the confidence audit until a real buyer-evidence register passes the 95% gate.

| Rank | Proof pack | Current rating |
|---:|---|---:|
| 1 | Utility demand forecast planning pack | 4.5/5 |
| 2 | Forecast benchmarking and provenance layer | 4.6/5 |
| 3 | OEB/AUC regulatory filing packs | 4.3/5 |
| 4 | Ontario GA/ICI 5CP decision-support pack | 4.2/5 |
| 5 | Privacy-preserving BYO-CSV proof generator | 4.1/5 |
| 6 | TIER compliance savings pack | 4.0/5 |
| 7 | TIER credit banking audit pack | 3.9/5 |
| 8 | Asset health executive capex pack | 4.1/5 |
| 9 | Utility security procurement pack | 4.0/5 |
| 10 | Shadow billing invoice proof pack | 3.8/5 |

## Approved Lead Positioning

Use this wording:

> CEIP is a Canadian utility and Alberta TIER proof-pack product that turns forecasts, filing evidence, benchmark transparency, Ontario GA/ICI peak-risk support, privacy-screened CSV proof, compliance scenarios, credit ledgers, asset triage, security review, and billing checks into buyer-ready artifacts.

Do not replace this with:

- "many dashboards plus AI"
- "AI/GPU forecasting platform"
- "production utility bridge"
- "SOC 2 certified utility platform"
- "OCAP-compliant sovereignty infrastructure"
- "live TIER market pricing"
- "engineering approval or power-flow platform"
- "accurate avalanche prediction" in this repository

## Stale Or Historical Research

The following docs may contain useful research, but they are **not** current commercial source of truth. Do not copy claims from them into outreach, pricing, PR copy, demos, or public pages unless reconciled against the active docs above.

| Historical file | Risk to watch |
|---|---|
| [CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md](./CEIP_STRATEGY_CONFIDENCE_AUDIT_2026-05-29.md) | Superseded May 30 confidence audit with old 90-92% strategic-confidence ceiling and pre-roadmap guard evidence. Keep its buyer-evidence caution only after reconciling with the May 31 roadmap. |
| [CEIP_95_CONFIDENCE_AUDIT_2026-05-31.md](./CEIP_95_CONFIDENCE_AUDIT_2026-05-31.md) | Superseded May 31 audit with stale 70/100 cap, not-run verification status, old metadata/guard gaps, and old API/large-load top-10 placement. |
| [DEEP_RESEARCH_GTM_STRATEGY_2026.md](./DEEP_RESEARCH_GTM_STRATEGY_2026.md) | Broad AI, real-time, and OCAP-compliant claims. |
| [DEEP_RESEARCH_MARKET_ALIGNMENT_GTM_2026.md](./DEEP_RESEARCH_MARKET_ALIGNMENT_GTM_2026.md) | Enterprise compliance and SOC2 expectations. |
| [Ph8_PRD.md](./Ph8_PRD.md) | AI-powered platform framing and broad PRD claims. |
| [Ph8_micro_niche.md](./Ph8_micro_niche.md) | Older AI-powered and SOC2 framing. |
| [ValueProposition.md](./ValueProposition.md) | OCAP-compliant and private-node positioning beyond current proof. |
| [ValueProposition_whop.md](./ValueProposition_whop.md) | Older Whop/product framing. |
| [Grok_suggestions.md](./Grok_suggestions.md) | High-confidence claims not tied to current route proof. |
| [ADVERSARIAL_USP_ANALYSIS.md](./ADVERSARIAL_USP_ANALYSIS.md) | Useful critique, not final positioning. |
| [COMET_OUTREACH_STRATEGY.md](./COMET_OUTREACH_STRATEGY.md) | Older outreach language and early-access claims. |
| [COMET_OUTREACH_STRATEGY_V2.md](./COMET_OUTREACH_STRATEGY_V2.md) | Older outreach language. |
| [whop_skill.md](./whop_skill.md) | Consumer/Whop AI-powered language. |
| [Whop_analysis.md](./Whop_analysis.md) | Whop-specific marketing notes. |
| [PRD_PRODUCTION_MONETIZATION.md](./PRD_PRODUCTION_MONETIZATION.md) | Production monetization assumptions and certification roadmap. |
| [OEB_SANDBOX_PROPOSAL.md](./OEB_SANDBOX_PROPOSAL.md) | Sandbox proposal language that may sound stronger than current proof. |
| [FEASIBILITY_ANALYSIS_PRODUCTION_USE_CASES.md](./FEASIBILITY_ANALYSIS_PRODUCTION_USE_CASES.md) | Production use-case analysis beyond current sales lane. |
| [monetization.md](./monetization.md) | Older enterprise/compliance sales assumptions. |
| [Final_gaps.md](./Final_gaps.md) | Broad future-state claims. |
| [IMIPLEMENTATION_VERIFICATION.md](./IMIPLEMENTATION_VERIFICATION.md) | Older implementation score and production-ready claims. |
| [UI_allpages.md](./UI_allpages.md) | UI inventory with broad real-time/AI wording. |
| [Linkedin_artical.md](./Linkedin_artical.md) | Article draft with older automation and world-class framing. |
| [delivery/GAP_ANALYSIS_COMPREHENSIVE_2025_12_13.md](./delivery/GAP_ANALYSIS_COMPREHENSIVE_2025_12_13.md) | Older high platform-score and target-score claims. |
| [delivery/GAP_ANALYSIS_IMPLEMENTATION_PLAN.md](./delivery/GAP_ANALYSIS_IMPLEMENTATION_PLAN.md) | Older implementation-plan ratings and production-readiness language. |
| [delivery/IMPLEMENTATION_PLAN_HYBRID.md](./delivery/IMPLEMENTATION_PLAN_HYBRID.md) | Older monetization strategy before proof-pack realignment. |
| [delivery/MONETIZATION_GAP_ANALYSIS.md](./delivery/MONETIZATION_GAP_ANALYSIS.md) | Older monetization analysis before proof-pack realignment. |
| [delivery/STRATEGY_COMPARISON_FINAL.md](./delivery/STRATEGY_COMPARISON_FINAL.md) | Older strategy comparison before proof-pack realignment. |
| [../COMMIT_MESSAGE.txt](../COMMIT_MESSAGE.txt) | Retired draft commit message with older implementation-score wording. |

## Claim Translation Table

| Old phrase | Current allowed replacement |
|---|---|
| AI-powered forecasting platform | transparent forecast proof pack with benchmark appendix |
| GPU forecasting | deferred research option; not a lead feature |
| real-time AESO/IESO platform | live-when-available data with fallback and freshness labels |
| OCAP-compliant data sovereignty | OCAP-aligned workflow language with owner-supplied governance markers |
| SOC 2 certified | security review pack; certification not claimed |
| production utility bridge | UtilityAPI/Green Button sandbox unless approval evidence exists |
| regulator-ready filing automation | filing-prep proof pack and reviewer checklist |
| engineering approval / power-flow | planning overlay only |
| guaranteed savings | source-dated planning estimate with buyer validation required |

## Review Workflow

Before sending outreach or publishing copy:

1. Start with `Top20.md`.
2. Check the confidence audit.
3. Use the pilot evidence checklist if the copy implies buyer proof.
4. Run:

```bash
pnpm run check:commercial-source
pnpm run check:claim-boundaries
pnpm run check:public-metadata
pnpm run check:public-metadata -- --dist
pnpm run check:pilot-evidence-95-fixture-gate
pnpm run check:pilot-evidence-template
pnpm run check:outreach-response-log-template
pnpm run check:outreach-intake-plan-template
pnpm run report:buyer-evidence-readiness
pnpm run create:outreach-response-log -- --output-dir /tmp/ceip-outreach-response-log
pnpm run append:outreach-response-log-row -- --log-file path/to/outreach-response-log.csv --activity-date 2026-06-01 --channel linkedin --target-label utility_planner_001 --route /utility-demand-forecast --rating 4.5 --variant-id utility_forecast --reply-status interested --response-summary "Buyer asked for a bounded forecast sample." --pain-signal "Load growth planning" --requested-input "anonymized load history" --reviewer-role "utility planning reviewer" --next-action "create intake packet" --pilot-evidence-register-action create_intake_packet
pnpm run create:outreach-intake-packets -- --log-file path/to/outreach-response-log.csv --output-dir /tmp/ceip-outreach-intake-packets
pnpm run create:pilot-evidence-intake-packet -- --route /utility-demand-forecast --output-dir /tmp/ceip-pilot-intake
pnpm run create:phase-f-minimum-intake-bundle -- --output-dir /tmp/ceip-phase-f-minimum-intake
pnpm run check:phase-f-minimum-intake-bundle
pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence
pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence
pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv
pnpm run check:phase-f-evidence-workspace
pnpm run validate:pilot-evidence -- docs/growth/templates/PILOT_EVIDENCE_REGISTER_TEMPLATE.csv --allow-template
pnpm run validate:outreach-response-log -- docs/growth/templates/OUTREACH_RESPONSE_LOG_TEMPLATE.csv --allow-template
pnpm run plan:outreach-intake -- path/to/outreach-response-log.csv
pnpm run check:strategy-roadmap-doc
pnpm run report:strategy-completion-audit
pnpm run check:strategy-completion-audit
pnpm run report:strategy-source-anchors
pnpm run check:strategy-source-anchors
pnpm run check:production-deploy-script
pnpm run check:client-env-safety
pnpm run check:supabase-app-lint
pnpm run check:unmerged-branch-readiness-report
pnpm run test:strategy-audit-slice
pnpm run check:corepack-toolchain
pnpm run check:public-release-status
pnpm run check:release-readiness
```

Before asking for explicit production approval, generate the current approval packet:

```bash
corepack pnpm run report:production-approval-packet
corepack pnpm --silent run report:launch-evidence-manifest -- --output /tmp/ceip-launch-evidence.json
python3 /Users/sanjayb/.codex/skills/commercial-launch-readiness-orchestrator/scripts/validate_launch_evidence.py /tmp/ceip-launch-evidence.json --require-repo-exists
corepack pnpm run report:commercial-launch-readiness -- --output /tmp/ceip-commercial-launch-readiness.md
corepack pnpm run check:launch-evidence-manifest
corepack pnpm run check:commercial-launch-readiness-report
corepack pnpm run check:public-release-status
corepack pnpm run report:unmerged-branch-readiness
corepack pnpm run report:unmerged-branch-readiness -- --focus-risk high
corepack pnpm run report:unmerged-branch-readiness -- --branch <branch-ref>
corepack pnpm run check:unmerged-branch-readiness-report
```

After an explicitly approved production deploy, run:

```bash
pnpm run check:post-deploy-live
```

`check:post-deploy-live` runs live metadata checks, exact static parity against the already-built and deployed `dist` files, and hosted proof-pack route smoke for `/utility-demand-forecast`, `/forecast-benchmarking`, `/regulatory-filing`, `/pilot-readiness`, `/ga-ici-5cp`, and `/byo-csv-proof`. Build `dist` first with `pnpm run build:prod` or the full release-readiness/deploy script; the post-deploy gate does not rebuild because rebuilding can produce different hashed entry chunks than the artifact that was just deployed.

`check:client-env-safety` rejects client-exposed `VITE_*` key names that look privileged, including service-role, secret, private, password, database URL, JWT, signing, webhook, admin, root, or master credentials. Supabase's frontend-safe key remains the anon or publishable key with RLS; service-role keys must stay backend-only because they bypass RLS. The guard reports only key names and source surfaces, never values.

`check:supabase-app-lint` runs the linked Supabase database linter and classifies findings as extension-owned or CEIP app-owned. It fails when app-owned PL/pgSQL lint findings remain, while keeping extension-owned PostGIS/long-transaction findings visible as platform lifecycle debt. Run it from a Supabase-authenticated workstation before production approval; do not add database passwords or service-role values to CI logs.

`check:release-readiness` starts with `check:corepack-toolchain`, then includes `check:strategy-source-anchors`, `check:production-deploy-script`, `check:client-env-safety`, `check:strategy-completion-audit`, and `check:public-release-status`, so production approval packets inherit the pinned-package-manager preflight, current-source anchor gate, production deploy script drift guard, client env safety gate, original-plan requirement audit, and public `/status/release-health.json` sync guard before any deploy request. If Corepack is missing, the release-readiness chain stops as a toolchain blocker before individual gates are treated as failed evidence. The source-anchor gate uses a bounded retry for transient network, timeout, 408/429, and 5xx fetch failures, then still fails if an anchor is neither live-verified nor covered by current manual evidence.

`report:production-approval-packet` also reports source deploy provenance against the production deploy script's preconditions: branch `main` and a clean worktree. When the worktree is dirty, it classifies each blocker as tracked/untracked, ignored-by-rule/not ignored, index status, worktree status, and staged-only/unstaged-only/mixed state, then gives a non-destructive cleanup action so generated artifacts, staged source changes, and unstaged local edits are not confused. The launch evidence manifest mirrors this source-provenance classification so the commercial-readiness P0 blocker can name whether the current deploy blocker is a staged index change, an unstaged worktree change, both, untracked, or ignored. The approval packet now runs `check:launch-evidence-manifest`, parses `production_approval.request_packet`, and runs `check:public-release-status` as pre-deploy evidence gates; passing manifest validation proves only structure and proof-boundary consistency, while the production approval request packet is a pre-deploy evidence gate that must be eligible before any owner approval request. If the request packet is ineligible, the packet must keep deployment request readiness blocked and list the pre-request blockers; request-packet eligibility still does not grant production approval, deployment, current hosted/live parity, buyer acceptance, or public `/status/release-health.json` sync. The deploy script is guarded to resolve the pinned pnpm version through Corepack, run `check:release-readiness`, require the typed approval phrase `DEPLOY CEIP PRODUCTION`, use Corepack-pinned pnpm for type-check, lint, audit, build, and post-deploy gates without `npm run` fallback evidence, build with the production build path, deploy the already-built `dist` artifact with `netlify deploy --prod --no-build --dir=dist`, and run `check:post-deploy-live` after Netlify deploy. The approval packet separates deployment request readiness from live parity achieved: stale live metadata or static parity can support an explicit remediation deploy request only when source provenance, launch evidence validation, request-packet eligibility, public release-status validation, and local release readiness are clean, but it must not be reported as live parity until post-deploy live checks pass. Passing local release-readiness evidence is summarized separately from the dedicated live metadata, live static parity, and hosted smoke gates, so nested completion-audit live failures do not make a green local preflight look internally failed. CEIP browser-smoke scripts that participate in release, hosted, or approval checks write Playwright HTML/JSON reports under `/tmp/ceip-*` so generated reports do not create worktree dirt that then blocks source deploy provenance. If `--skip-release-readiness` is used, exact static parity is skipped because local `dist/` has not been freshly rebuilt by the packet. Use `pnpm run check:production-deploy-request` when you need a machine exit gate for requesting explicit owner approval; use `--fail-on-blocker` only when all live-parity gates are expected to pass. It must not be used as production approval when source provenance, launch evidence validation, production approval request-packet eligibility, public release-status validation, or local release readiness is failing or skipped.

If Corepack is not available in the current shell, `check:corepack-toolchain`, `check:release-readiness`, and `report:production-approval-packet` must classify local release readiness as a toolchain/provenance blocker and keep deployment request readiness blocked. A temporary local shim can help debug release readiness on a workstation, but it is not production approval evidence and must not replace the guarded Corepack deploy path.

`report:launch-evidence-manifest` and `report:commercial-launch-readiness` include a release toolchain probe ledger for `corepack pnpm --version` and `git lfs version`. This ledger records current shell evidence only; it does not install tools, run release-readiness, clear source provenance, push, deploy, or grant production approval. The launch blocker action queue and production approval prerequisite queue now carry the probe-ledger state into the release-toolchain rows, where it remains blocker evidence rather than release-readiness or approval evidence. The public release status also exposes the ledger as a public-safe evidence handle, where it does not substitute for release-readiness or production approval.

`report:launch-evidence-manifest` emits the current conservative commercial-launch evidence JSON for portfolio comparison and handoff. It uses the orchestrator schema shape, keeps `launch_decision` blocked while buyer evidence or source provenance blockers remain, separates hosted/live, local, repo-artifact, candidate/shadow, and roadmap proof buckets, and includes ten source-backed pain points plus ten target segments. It embeds structured buyer-evidence readiness counts for production registers, outreach logs, confidence-moving rows, actionable outreach rows, batchable intake rows, evidence root state, Phase F gate state, the next workspace command, the hard 95% buyer-evidence deficit rows, and a buyer evidence remediation queue without counting scaffolding as buyer proof. The buyer evidence remediation queue maps each non-pass hard-gate row to an owner, proof command, and stop gate; it is a decision aid only and does not contact buyers, create accepted evidence, move confidence, attach artifacts, validate 95%, or claim buyer acceptance. It embeds Supabase advisor evidence as a separate owner-side gate so CLI app lint, connector or dashboard Security and Performance Advisors, permission-denied state, and no-advisor-clearance boundaries are not conflated, and now records row-level Supabase advisor clearance deficits for CLI lint freshness, connector authorization, security advisor evidence, performance advisor evidence, public-safe findings, and the no-clearance-claim gate, plus a Supabase advisor remediation queue that maps each non-pass advisor row to an owner, proof command, and stop gate. The Supabase advisor remediation queue is a decision aid only and does not authorize connectors, access the dashboard, rerun advisors, mutate the database, record secrets, or claim advisor clearance. It records release toolchain and approval deficits for the exact package-manager pin, Corepack pnpm resolver, full release-readiness execution, Git LFS push-path proof, clean source provenance, and explicit owner production approval, plus a release preflight remediation queue that maps each non-pass deficit to an owner, proof command, and stop gate; direct pnpm checks, skipped approval packets, local commit hooks, previous push history, probe-ledger rows, or remediation-queue rows do not substitute for those proofs. The release preflight remediation queue is a decision aid only and does not install tools, clear source provenance, run release-readiness, push, deploy, or grant production approval. It also synthesizes a launch blocker action queue across source provenance, release toolchain, branch review, Supabase advisor access, buyer evidence, production approval, and post-deploy live proof; the queue is an execution plan only and does not deploy, merge, contact buyers, mutate branches, clear source provenance, or claim launch readiness. It also embeds a production approval prerequisite queue across clean source provenance, Corepack release-readiness, canonical branch review, Supabase advisor clearance, buyer evidence, explicit owner approval, and post-deploy live proof; this queue is a prerequisite ledger only and does not grant owner approval, deploy, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, or claim post-deploy live parity. It now embeds a production approval request packet that classifies every prerequisite as a pre-request, owner-decision, or post-deploy-boundary row; the request packet is ineligible while any pre-request row is non-ready, and it still does not grant owner approval, deploy, push, merge, mutate branches, contact buyers, access Supabase, clear source provenance, or prove hosted/live parity. It now embeds a post-deploy live proof gate queue across production approval clearance, guarded deploy completion, live public metadata, live static `dist` parity, hosted proof-pack route smoke, and current-source hosted parity claim; this queue is post-approval sequencing only and does not deploy, push, rebuild, mutate Netlify, access live accounts, run browser smoke, or claim hosted/live parity before explicit approval and a successful `check:post-deploy-live` gate. The launch blocker action queue, production approval prerequisite queue, production approval request packet, post-deploy live proof gate queue, and release toolchain probe ledger are also exposed as public-safe evidence handles in `/status/release-health.json` and `RELEASE_HEALTH_EVIDENCE`, where they do not clear blockers, grant production approval, deploy, mutate live services, prove current hosted/live parity, or create launch readiness. It embeds source-provenance details for dirty worktree blockers, including tracked/untracked/ignored classification and non-destructive owner actions, plus a source provenance resolution queue that separates raw source status from blocked owner decisions; this queue is a decision aid only and does not commit, unstage, stash, revert, delete, rename, move, clear source provenance, or substitute for owner intent. It embeds the read-only unmerged branch risk, local/origin branch-family state, freshness rollups, a compact branch review queue, and a canonical-head decision deficit ledger so high-risk, split-head, stale, local-only, origin-only, or aging branch families stay visible as review-first P1 blockers. The branch review queue and canonical-head decision ledger are read-only triage aids: they print focused review commands and stop gates, but they do not checkout, merge, push, discard, deploy, approve, select a branch head, or count branches as launch evidence. The manifest reruns the focused report for the top queue item and records a top branch review packet with risk, categories, local/origin state, freshness, changed Supabase function review rows, a read-only canonical-head comparison for split local/origin families, and the same no-checkout/no-merge/no-deploy approval gate. It also records a bounded review-first branch packet set for the current high-priority families so stale high-risk local-only, local/origin split, and aging high-risk branch queues carry focused packet evidence, per-branch canonical-head or single-ref state, changed Supabase function rows, and explicit no-mutation gates before any merge, push, discard, or deploy discussion. Validate the JSON with `validate_launch_evidence.py` before using it in portfolio rollups. `report:commercial-launch-readiness` renders the validated manifest into the orchestrator Markdown table set: launch score, gap analysis, launch blocker action queue, source provenance resolution queue, branch canonical-head decision deficits, buyer hard-gate deficits, buyer evidence remediation queue, Supabase advisor clearance deficits, Supabase advisor remediation queue, release toolchain and approval deficits, release toolchain probe ledger, release preflight remediation queue, production approval prerequisite queue, production approval request packet, post-deploy live proof gate queue, proof buckets, pain points, target segments, outreach plan, fix report, adversarial review, evidence validation, and ECC ledger. `check:launch-evidence-manifest` generates a fresh manifest, validates the schema, and asserts the conservative blocked proof-boundary shape plus buyer-evidence, launch action queue, production approval prerequisite queue, production approval request packet, post-deploy live proof gate queue, source provenance resolution queue, canonical-head decision deficits, buyer hard-gate deficits, buyer evidence remediation queue, Supabase advisor, Supabase advisor clearance deficits, Supabase advisor remediation queue, release preflight deficits, release toolchain probe ledger, release preflight remediation queue, source-provenance, branch-family, branch-freshness, branch-review-queue, review-first-branch-packet, top-branch-packet, and canonical-head-comparison rollups as part of release readiness. `check:commercial-launch-readiness-report` generates the Markdown report and asserts the required table set, source URLs, proof buckets, buyer evidence, launch action queue, production approval prerequisite queue, production approval request packet, post-deploy live proof gate queue, source provenance resolution queue, branch canonical-head decision deficits, buyer hard-gate deficits, buyer evidence remediation queue, Supabase advisor evidence, Supabase advisor clearance deficits, Supabase advisor remediation queue, release preflight deficits, release toolchain probe ledger, release preflight remediation queue, source provenance, branch families, branch freshness, branch review queue, review-first branch packets, top branch review packet, canonical head comparison, blocked decision, schema-validation row, and no-buyer-proof boundaries as part of release readiness. A passing schema validation, Markdown report, public release status validation, or check means the manifest is structurally usable and boundary-consistent; it does not mean CEIP is commercial-ready, hosted/live current, production-approved, or buyer-proven.

The public release status also exposes the source provenance isolation ledger, source provenance resolution queue, release preflight clearance matrix, and release preflight remediation queue as public-safe handles. These handles are blocker maps only: they do not commit, unstage, stash, revert, delete, rename, move, install tools, run release-readiness, clear source provenance, grant production approval, deploy, mutate live services, prove current hosted/live parity, or create launch readiness.

The public release status now also exposes launch evidence validation as a public-safe predeploy handle. This handle checks manifest structure and proof-boundary consistency only; it does not grant production approval, prove buyer acceptance, deploy, mutate live services, prove current hosted/live parity, or create launch readiness.

The launch blocker action queue and production approval prerequisite queue also carry launch evidence validation as a first-class predeploy row. This row is a gate to run `check:launch-evidence-manifest` before deploy requests, but the manifest does not self-certify that validation, grant approval, prove buyer acceptance, deploy, mutate live services, prove current hosted/live parity, or create launch readiness.

The public release status mirrors that queue contract: the launch blocker action queue and production approval prerequisite queue mention launch evidence validation as required sequencing, and the production approval request packet remains ineligible while any pre-request row is blocked, while still not proving validation, production approval, buyer acceptance, deployment, hosted/live parity, or launch readiness.

The public release status also exposes the buyer evidence acquisition matrix, buyer evidence remediation, and Supabase advisor remediation as public-safe handles. These handles are execution maps only: they do not contact buyers, create accepted evidence, move confidence, attach artifacts, validate 95%, authorize Supabase connectors, access dashboards, rerun advisors, mutate databases, record secrets, claim advisor clearance, create buyer proof, or claim buyer acceptance.

The public release status also exposes the branch clearance matrix, canonical-head decisions, and review-first branch packets as public-safe handles. These handles are read-only branch review maps only: they do not checkout, merge, push, discard, migrate, deploy, mutate Supabase, select a branch head, create launch evidence, create buyer proof, or prove production approval.

`report:unmerged-branch-readiness` is a read-only non-merged branch review for the current `main` launch decision. It inventories local and `origin/*` branches not merged into `main`, classifies touched paths into production/deploy, Supabase/database, payment/entitlement, source-app, buyer-proof/commercial, docs, testing/tooling, detached Edge Function copy artifacts, and ML/training categories, then assigns review risk. It also groups local and `origin/*` refs by branch family so reviewers can see whether a family is local-only, origin-only, matching, local-ahead, origin-ahead, or diverged before choosing the canonical head for focused review. The report classifies branch-head freshness from Git commit dates; stale branches are stale review queues that require drift review against current `main`, focused checks, and full release-readiness revalidation after any rebase or cherry-pick. The branch review queue table ranks families by launch risk, stale or aging freshness, and split/local-only/origin-only canonical-head state, then prints the focused read-only command and the explicit no checkout/no merge/no deploy/no migration/no push/no discard/no production approval stop gate. Use `--focus-risk high` to print focused review packets for every high-risk unmerged ref in one read-only run, or `--branch <ref>` to narrow the output to one unmerged local or `origin/*` ref, print a category-specific focused review plan, and list changed `supabase/functions/*` entrypoints with local non-production review checks before any merge discussion. Shared helper changes under `supabase/functions/_shared` are reviewed as import-impact rows, not as serveable function entrypoints. `check:unmerged-branch-readiness-report` verifies that the report keeps its read-only boundary, branch-family pairing, branch freshness classification, branch review queue, focused-review packet output, high-risk failure behavior, and no-buyer-proof/no-production-approval language intact as part of release readiness. Detached `DEPLOY_*` or `*-FINAL` Edge Function copies are production-risk review artifacts and must not be manually deployed or pasted into hosted functions. High-risk branch findings are review queues, not launch evidence, not buyer proof, and not production approval; merge or deploy decisions still require focused review plus the normal release-readiness and approval gates.

`check:strategy-completion-audit` uses the hard source-anchor gate and exits nonzero if required local strategy/source checks fail. It marks current live parity complete only when live metadata and static parity checks pass; if those checks fail on a future production state, the failure remains a release gate, not buyer proof.

Before any copy says CEIP has reached 95% buyer-proven market confidence, validate the filled buyer-evidence register with:

```bash
pnpm run report:buyer-evidence-readiness -- --root path/to/anonymized-outreach-or-registers
pnpm run create:phase-f-evidence-workspace -- --output-dir /tmp/ceip-phase-f-evidence
pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence
pnpm run report:phase-f-evidence-workspace -- --workspace-dir /tmp/ceip-phase-f-evidence --register-file /tmp/ceip-phase-f-evidence/phase-f-minimum-register-updated.csv
pnpm run create:pilot-evidence-intake-packet -- --route /utility-demand-forecast --output-dir /tmp/ceip-pilot-intake
pnpm run prepare:pilot-evidence-artifact -- --evidence-root path/to/redacted-artifacts --artifact-file redacted-artifact.md --route /utility-demand-forecast --proof-pack-id utility_forecast_planning_pack --record-date 2026-05-31 --pii-screen-result redacted --buyer-data-coverage-pct 90 --time-to-artifact-hours 36 --reviewer-role "utility planning reviewer" --reviewer-acceptance accepted --reviewer-feedback-status complete --day-14-decision proceed --commercial-commitment-status paid_pilot --commercial-commitment-evidence "paid pilot evidence retained in redacted commercial appendix" --claim-boundary "Buyer-supplied redacted planning support only." --do-not-claim "Do not claim production utility onboarding." --diagnostic "MAE 12.4 MW; MAPE 3.8%; RMSE 18.6 MW; persistence MAE 21.3 MW; seasonal-naive MAE 19.9 MW; rolling-origin split count 4; interval coverage 91.2%; CEIP champion vs seasonal-naive challenger."
pnpm run update:pilot-evidence-register-row -- --register-file path/to/pilot-evidence-register-starter.csv --evidence-root path/to/redacted-artifacts --evidence-file-reference redacted-artifact.md#sha256=<hash-from-helper> --confidence-delta "<explicit 0..0.4, or 0 for staging>" --output-file path/to/filled-pilot-evidence-register.csv
pnpm run report:buyer-evidence-readiness -- --root path/to/anonymized-outreach-or-registers --evidence-root path/to/redacted-artifacts
pnpm run report:pilot-evidence-95 -- path/to/filled-pilot-evidence-register.csv --evidence-root path/to/redacted-artifacts
pnpm run validate:pilot-evidence -- path/to/filled-pilot-evidence-register.csv --require-95 --evidence-root path/to/redacted-artifacts
```

The buyer-evidence readiness report scans non-template roots for production outreach response logs and pilot evidence registers, ignores templates/fixtures/generated paths, validates any candidate files with the canonical validators, prints the minimum Phase F 95% evidence lane map, points empty collection roots to the all-in-one Phase F evidence workspace plus workspace report, and reports whether a retained-artifact 95% gate can actually run. It also prints a hard-gate deficit ledger for utility forecast, TIER/credit, billing/security, proof-pack count, confidence delta, retained hashes, buyer-data coverage, artifact turnaround, commercial signal, and retained-artifact validation; this is an operator checklist only, and generated scaffolding, outreach headers, and starter registers must remain open deficits until real accepted buyer-supplied retained evidence closes them. Use it before claiming that Phase F has inputs. The minimum lane map requires utility forecast evidence, either TIER CFO or credit-banking evidence, either shadow-billing or utility-security evidence, at least three distinct accepted proof packs, distinct retained SHA-256 artifacts, total accepted `confidence_delta >= 0.9`, one fast proof pack, and one strong commercial commitment signal. `create:outreach-response-log` creates a header-only anonymized outreach workspace plus README instructions; it is zero-evidence scaffolding and must not be counted as a buyer reply. `append:outreach-response-log-row` adds one operator-supplied anonymized outreach row only after deriving `buyer_lane` and `proof_pack_id` from the selected route and validating a temporary candidate log; it does not create buyer evidence or move confidence. `create:outreach-intake-packets` validates a response log and creates route-specific starter packet folders only for rows with `pilot_evidence_register_action=create_intake_packet`; it writes a manifest, keeps generated registers at `confidence_delta=0`, and still must fail the 95% gate until real buyer-supplied retained artifacts are attached. `create:phase-f-minimum-intake-bundle` turns that minimum lane mix into a combined `confidence_delta=0` starter bundle; it is scaffolding only and must still fail the 95% gate until real buyer-supplied retained artifacts are attached. `check:phase-f-minimum-intake-bundle` smoke-tests that starter bundle contract in a temporary directory so release readiness fails if the combined bundle stops validating or accidentally passes the hard 95% gate. `create:phase-f-evidence-workspace` combines the outreach log, Phase F minimum starter bundle, manifest, readiness report, and expected hard-gate failure into one operator workspace; `report:phase-f-evidence-workspace` validates an existing workspace, summarizes readiness counts, prints hard-gate blockers, can validate and hard-gate an explicit updated `--register-file` inside the workspace, and gives the next commands for real buyer activity; `check:phase-f-evidence-workspace` smoke-tests that the workspace stays non-confidence-moving and cannot satisfy the 95% gate by generation alone. The outreach response log template captures anonymized manual send/reply evidence and the next pilot-evidence action, but it does not move market confidence. `--action-plan` prints the next intake or retained-artifact commands for actionable rows, rejects future-dated activity, and blocks no-reply/not-fit rows from creating evidence actions. The intake packet command creates route-specific scaffolding only: a starter register row with `confidence_delta=0`, redaction notes, and an empty retained-artifact folder. The evidence root must contain retained redacted artifacts only. Use `prepare:pilot-evidence-artifact` to create a text-inspectable extract and print the register-ready SHA-256 reference after direct-identifier and route-diagnostic checks, then use `update:pilot-evidence-register-row` instead of hand-editing CSV rows; the updater recomputes the artifact hash, copies only artifact-supported fields into the matching route/proof-pack row, supports route-local `--artifact-root` folders inside a top-level Phase F evidence root so route-prefixed references are written without hand-copying, requires explicit `confidence_delta`, and validates the candidate register before writing output. For forecast trust reports generated from benchmark-pack JSON, prefer `prepare:forecast-trust-report-artifact` so the retained extract is generated from numeric benchmark metrics rather than hand-written keyword prose. For GA/ICI and BYO-CSV retained extracts, prefer `prepare:ga-ici-5cp-artifact` and `prepare:byo-csv-proof-artifact` so the artifact is generated from source-dated peak/load inputs or browser-local CSV privacy screens rather than hand-written diagnostic prose. The validator recomputes every confidence-moving hash and fails if a referenced artifact is missing, changed, not text-inspectable, lacks the route-specific diagnostic evidence terms, lacks numeric forecast evidence for forecast routes, contains positive overclaims, lacks retained support for the row record date, privacy-screen result, non-status-only strong commercial commitment evidence, buyer-data coverage percentage, time-to-artifact value, reviewer acceptance, reviewer feedback completion, or day-14 proceed decision, or if either the register row values or retained artifact text appear to contain direct identifiers such as emails, phone numbers, account/meter labels, postal codes, addresses, or credential assignments. Retain CSV, TSV, JSON, JSONL, Markdown, text, HTML, or YAML artifacts; for PDFs or scans, hash a redacted `.txt` or `.md` evidence extract instead of the opaque source file.

The 95% gate requires accepted confidence-moving buyer evidence to be dated within the last 365 days; retained local artifact text supporting each accepted row's `record_date`; exact privacy-screen statuses with retained local artifact text supporting each `pii_screen_result`; independent reviewer roles on confidence-moving rows; exact reviewer statuses rather than negated prose; buyer/source claim-boundary wording; route-specific do-not-claim terms; numeric forecast evidence for forecast rows; no positive overclaims or direct identifiers in register evidence text; at least one accepted commercial commitment signal (`design_partner_signed`, `paid_pilot`, `purchase_order`, or `letter_of_intent`) that is supported by retained local artifact text beyond repeating the status; retained local artifact text supporting each accepted row's `buyer_data_coverage_pct`, `time_to_artifact_hours`, `reviewer_acceptance`, `reviewer_feedback_status`, and `day_14_decision=proceed`; at least one accepted buyer proof pack delivered in 48 hours or less with no accepted confidence-moving row above 120 hours; and distinct locally verified SHA-256 evidence artifacts across accepted buyer proof-pack rows.

5. If a stale doc is useful, copy only the underlying research question, not its marketing claim.

## Completion Boundary

This file does not make stale research false or useless. It prevents stale research from becoming current commercial truth without reconciliation.
