# Scripts Index

Automation scripts for CEIP: `check-*` guards, `report-*` generators, evidence/outreach workflow tools, data import, deployment, and test/QA utilities.

Most Node scripts run via package.json aliases (`pnpm run check:claim-boundaries` etc.); everything can also be run directly with `node scripts/<name>.mjs`, `pnpm exec tsx scripts/<name>.ts`, or `bash scripts/<name>.sh`. Python ingest scripts need `python3` plus their own deps (`supabase`, `requests`, `sklearn`).

## Phase 5 Quick Start

### 1. Download Historical Data
```bash
chmod +x download-ieso-data.sh
./download-ieso-data.sh
```

Downloads IESO Ontario data (Sep-Oct 2024) to `./data/historical/ieso/`

### 2. Import into Database
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-key \
node import-historical-data.mjs
```

Imports ~8,000 observations with `historical_archive` provenance.

### 3. Run Curtailment Replay
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-key \
node run-curtailment-replay.mjs
```

Detects events, simulates AI recommendations, calculates MWh avoided.

### 4. Test APIs
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
node test-phase5-apis.mjs
```

Validates storage dispatch and enhanced forecast APIs.

## Environment Variables

| Variable | Required For | Get It From |
|----------|--------------|-------------|
| `VITE_SUPABASE_URL` | All DB scripts | Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Import, replay, seed | Supabase API settings (service_role) |
| `VITE_SUPABASE_ANON_KEY` | API verification | Supabase API settings (anon public) |

## `check-*` Guards (validation gates; most are wired to `pnpm run check:*`)

| Script | One-liner |
|---|---|
| `check-adversarial-review-readiness-report.mjs` | Validates the adversarial-review readiness report structure and queue. |
| `check-branch-review-readiness-report.mjs` | Validates the branch-review readiness report. |
| `check-built-client-env.mjs` | Scans built `dist` output for leaked dangerous `VITE_`/secret keys. |
| `check-buyer-evidence-gate-readiness-report.mjs` | Validates the buyer-evidence gate readiness report. |
| `check-buyer-evidence-readiness-report.mjs` | Validates the buyer-evidence readiness report. |
| `check-claim-boundaries.mjs` | Blocks banned/overclaim phrases (production, certification, live-price, AI/GPU claims) in source and active docs. |
| `check-client-env-safety.mjs` | Blocks secrets and dangerous key names in client env surfaces. |
| `check-commercial-launch-readiness-report.mjs` | Validates the commercial launch readiness report. |
| `check-commercial-source-docs.mjs` | Keeps active commercial docs aligned with the source of truth (ratings, stale phrases, required commands). |
| `check-corepack-toolchain.mjs` | Verifies Corepack/pnpm toolchain pinning for release commands. |
| `check-focused-launch-readiness-reports.mjs` | Validates the focused launch readiness report set. |
| `check-ga-ici-public-actuals.mjs` | Checks the GA/ICI 5CP public historical actuals dataset. |
| `check-github-repo-metadata.mjs` | Verifies GitHub About metadata: description, license, homepage, topics. |
| `check-launch-action-readiness-report.mjs` | Validates the launch-action readiness report and blocker queue. |
| `check-launch-evidence-manifest.mjs` | Validates the launch evidence manifest contents. |
| `check-launch-evidence-schema.mjs` | Validates launch evidence JSON against its schema. |
| `check-launch-evidence-validation-readiness-report.mjs` | Validates the launch evidence validation report. |
| `check-live-static-parity.mjs` | Compares live hosted files against the built `dist` artifact. |
| `check-objective-completion-audit-readiness-report.mjs` | Validates the objective completion audit report. |
| `check-phase-f-evidence-workspace.mjs` | Validates a Phase F evidence workspace structure. |
| `check-phase-f-minimum-intake-bundle.mjs` | Proves the minimum intake bundle builds and the 95% gate still fails without real evidence. |
| `check-pilot-evidence-95-fixture-gate.mjs` | Verifies the 95% gate rejects fixture/template/sample registers. |
| `check-pilot-evidence-template.mjs` | Validates the pilot evidence register template. |
| `check-placeholder-weight-deadline.mjs` | Fails if placeholder model-weight artifacts remain past their deadline. |
| `check-post-deploy-live-proof-readiness-report.mjs` | Validates the post-deploy live-proof report and gate queue. |
| `check-production-approval-readiness-report.mjs` | Validates the production approval readiness report. |
| `check-production-deploy-script.mjs` | Validates the production deploy script contract. |
| `check-progress-digest-readiness-report.mjs` | Validates the progress-digest readiness report. |
| `check-proof-pack-bundle-budgets.mjs` | Enforces proof-pack bundle size budgets. |
| `check-public-metadata.mjs` | Validates public metadata locally or against the live site (`--base-url` / `--dist`). |
| `check-release-preflight-readiness-report.mjs` | Validates the release preflight report. |
| `check-repo-hygiene.mjs` | Blocks tracked junk: `.DS_Store`, logs, dumps, `Secrets`, test artifacts. |
| `check-sensitive-rls-migration.mjs` | Checks sensitive RLS migrations for safety. |
| `check-source-provenance-readiness-report.mjs` | Validates the source-provenance readiness report. |
| `check-strategy-roadmap-doc.mjs` | Validates the 95% strategy roadmap doc structure and anchors. |
| `check-supabase-advisor-readiness-report.mjs` | Validates the Supabase advisor readiness report. |
| `check-supabase-migration-versions.mjs` | Verifies Supabase migration version ordering/consistency. |
| `check-unmerged-branch-readiness-report.mjs` | Validates the unmerged-branch readiness report. |

## `report-*` Generators (readiness/status reports)

| Script | One-liner |
|---|---|
| `report-adversarial-review-readiness.mjs` | Renders the adversarial-review readiness report. |
| `report-branch-review-readiness.mjs` | Renders the branch-review readiness report. |
| `report-buyer-evidence-gate-readiness.mjs` | Renders buyer-evidence gate readiness from evidence inputs. |
| `report-buyer-evidence-readiness.mjs` | Renders buyer-evidence readiness status. |
| `report-commercial-launch-readiness.mjs` | Renders the commercial launch readiness report. |
| `report-launch-action-readiness.mjs` | Renders the launch-action queue and operator handoff packet. |
| `report-launch-evidence-manifest.mjs` | Renders the launch evidence manifest report. |
| `report-launch-evidence-validation-readiness.mjs` | Renders launch evidence validation status. |
| `report-objective-completion-audit-readiness.mjs` | Renders the objective completion audit report. |
| `report-phase-f-evidence-workspace.mjs` | Summarizes a Phase F evidence workspace, hard-gate blockers, and next commands. |
| `report-post-deploy-live-proof-readiness.mjs` | Renders the post-deploy live-proof handoff report. |
| `report-production-approval-packet.mjs` | Generates the pre-approval production evidence packet (no deploy). |
| `report-production-approval-readiness.mjs` | Renders production approval readiness. |
| `report-progress-digest-readiness.mjs` | Renders the progress-digest readiness report. |
| `report-release-preflight-readiness.mjs` | Renders the release preflight report. |
| `report-source-provenance-readiness.mjs` | Renders source-provenance readiness. |
| `report-strategy-completion-audit.mjs` | Requirement-by-requirement audit of the 95% strategy roadmap. |
| `report-strategy-source-anchors.mjs` | Live-fetch + manual-evidence check of strategy source anchors. |
| `report-supabase-advisor-readiness.mjs` | Renders Supabase advisor readiness. |
| `report-supabase-app-lint.mjs` | Lints Supabase app surfaces (`--fail-on-app` for the check variant). |
| `report-unmerged-branch-readiness.mjs` | Renders unmerged-branch readiness (`--focus-risk`, `--branch`). |
| `gtm-weekly-report.mjs` | Generates the weekly GTM metrics report from Supabase data. |
| `generate-public-release-status.mjs` | Generates (or `--check` verifies) the public release status file. |

## Evidence, Outreach & Pilot Workflow Tools

| Script | One-liner |
|---|---|
| `create-outreach-response-log.mjs` | Creates a header-only anonymized outreach response log workspace. |
| `append-outreach-response-log-row.mjs` | Appends a validated, anonymized row to the outreach response log. |
| `validate-outreach-response-log.mjs` | Validates the outreach log; `--report` summary and `--action-plan` intake commands. |
| `create-outreach-intake-packets.mjs` | Batch-creates route-specific intake packets for actionable log rows. |
| `create-pilot-evidence-intake-packet.mjs` | Generates a per-route pilot evidence starter packet (non-confidence-moving). |
| `create-phase-f-minimum-intake-bundle.mjs` | Generates the combined minimum-lane starter intake bundle. |
| `create-phase-f-evidence-workspace.mjs` | Generates the full Phase F evidence collection workspace. |
| `prepare-pilot-evidence-artifact.mjs` | Prepares a hashable pilot evidence artifact (requires `--proof-pack-id`). |
| `update-pilot-evidence-register-row.mjs` | Copies artifact-supported fields into a register row and revalidates it. |
| `validate-pilot-evidence-register.mjs` | Validates pilot evidence registers; `--require-95 --evidence-root` runs the hard 95% gate. |
| `validate_launch_evidence.py` | Validates commercial launch readiness evidence JSON (Python). |
| `record-artifact.mjs` | Records a retained artifact with a SHA-256 evidence handle. |
| `record-release-readiness-proof.mjs` | Records release-readiness proof output for later reports. |
| `record-supabase-app-lint-proof.mjs` | Records Supabase app lint proof output. |

## Proof-Pack & Forecast Artifact Generators (`.ts`, run with `tsx`)

| Script | One-liner |
|---|---|
| `byo-csv-proof-artifact.ts` | Produces hashable BYO-CSV privacy-proof retained extracts. |
| `forecast-trust-report-artifact.ts` | Produces forecast-trust retained extracts with numeric benchmark diagnostics. |
| `ga-ici-5cp-artifact.ts` | Produces GA/ICI 5CP decision-support retained artifacts. |
| `utility-forecast-benchmark-pack.ts` | Builds the utility forecast benchmark pack (baselines, rolling-origin, intervals). |
| `feature-ranking-benchmark.ts` | Runs the TS feature-ranking benchmark over demand records. |
| `feature-ranking-parity-merge.ts` | Merges TS/Python feature-ranking outputs into a parity artifact. |
| `feature-ranking-baseline.py` | Python RFE-based feature-ranking baseline (sklearn). |
| `feature-ranking-reference.py` | Pure-Python feature-ranking reference implementation for parity checks. |
| `diagnose-all-gaps.ts` | Comprehensive gap diagnostic across all data pipelines. |

## Data Import, Backfill & Ingest

| Script | One-liner |
|---|---|
| `download-ieso-data.sh` | Downloads IESO Ontario CSVs (demand + generator output) to `./data/historical/ieso/`. |
| `import-historical-data.mjs` | Imports downloaded IESO CSVs into Supabase with `historical_archive` provenance. |
| `backfill-ieso-data.mjs` | Backfills the last 7 days of Ontario demand/price data from IESO. |
| `backfill-provincial-generation.mjs` | Generates 30 days of synthetic provincial generation data. |
| `backfill-provincial-generation-improved.mjs` | Improved provincial backfill using realistic per-province profiles. |
| `generate-sample-historical-data.mjs` | Creates realistic synthetic Ontario sample data for Phase 5 testing. |
| `import_npri_facilities.py` | Imports NPRI facility-level GHG data (CSV → `facility_emissions`). |
| `import_obps_compliance.py` | Imports Alberta TIER / Saskatchewan OBPS compliance CSVs → `obps_compliance`. |
| `import_efficiency_projects.py` | Imports efficiency project CSVs (EMRF/ERA/company lists) → `efficiency_projects`. |
| `import_yahoo_finance_esg.py` | Fetches Yahoo ESG scores for Canadian energy companies → `esg_ratings`. |
| `ingest_hrdps.py` | Ingests ECCC HRDPS weather forecasts via the Open-Meteo GEM proxy → Supabase. |
| `enrichment_queue.csv` | Static enrichment work queue (data file, not a script). |

## Deployment, Migrations & Ops

| Script | One-liner |
|---|---|
| `deploy-production.sh` | Pre-deployment checks + production deploy (approval-gated). |
| `deploy-edge-functions.sh` | Deploys Supabase edge functions for real data streaming. |
| `final-deployment-check.sh` | Comprehensive validation pass before deploying. |
| `run-migrations-direct.mjs` | Runs SQL migrations via the Supabase client directly. |
| `run-migrations-via-supabase.mjs` | Alternative migration runner (Supabase JS instead of psql). |
| `verify-supabase-migrations.mjs` | Verifies `supabase/migrations/` contents apply cleanly. |
| `fix-cors-for-development.sh` | Loosens edge-function CORS to allow localhost + production origins. |
| `fix-cors-wildcard.sh` | Replaces `*` CORS with specific allowed origins in edge functions. |
| `run-groundsource-proof.sh` | Runs the groundsource proof workflow (env-file aware). |
| `cleanup-session-files.sh` | Removes session-generated temp files. |
| `cleanup-unused-files.sh` | Removes redundant docs/temp files (review before running). |
| `replace-console-logs.sh` | Replaces `console.*` calls with the debug utility in targeted files. |

## Test & QA Utilities

| Script | One-liner |
|---|---|
| `test-phase5-apis.mjs` | Validates Phase 5 storage-dispatch and enhanced-forecast APIs. |
| `test-all-crons.sh` | Smoke-tests all edge functions before cron scheduling. |
| `verify-real-data.sh` | Verifies live data paths are returning real (non-mock) data. |
| `verify-dashboard-summary-snapshots.mjs` | Verifies dashboard summary snapshots against Supabase. |
| `verify-positioning-audit.mjs` | Audits the repo for positioning/claim drift (`--refresh-inventory`). |
| `run-curtailment-replay.mjs` | Replays curtailment events and simulates AI-avoidance metrics. |
| `seed-curtailment-data.ts` | Seeds realistic curtailment events + recommendations for demos. |
| `seed-forecast-performance.ts` | Seeds forecast performance metrics (creates table if missing). |

## Subdirectories

- `lib/` — shared Node helpers imported by check/report scripts: `commercial-docs.mjs` (active/historical doc lists), `evidence-path-safety.mjs`, `phase-f-minimum-evidence.mjs`, `proof-pack-routes.mjs`, `strategy-source-anchors.mjs`.
- `shell/` — earlier-phase ops scripts: `RUN_ME_NOW.sh`, `apply_fuel_type.sh`, `diagnose-api-responses.sh`, `start-dev.sh`, `test-edge-functions.sh`, `test_migration.sh`, `verify-phase1-deployment.sh`.
- `sql/` — one-off SQL fixes/setup (`AESO_*`, `fix-*`, `verify-*`, `diagnose-*`, `setup-*`); run manually via the Supabase SQL editor.

## Troubleshooting

### "Failed to download"
- Check internet connection
- IESO may have moved files - verify URLs at http://reports.ieso.ca/public/
- Try manual download and place in `./data/historical/ieso/`

### "Missing environment variables"
- Ensure `.env` file exists or export variables
- For service_role key, use Settings > API > service_role (not anon)

### "No curtailment events detected"
- Ensure historical data imported first
- Check October 2024 had limited oversupply - normal behavior
- Adjust thresholds in `run-curtailment-replay.mjs` if needed

### "CSV parse error"
- IESO format may have changed - check CSV structure
- Update column names in `import-historical-data.mjs`

## Notes

- Node scripts use `@supabase/supabase-js` (repo dependency); `.ts` scripts run via `tsx`.
- Historical data is ~60MB download, takes ~15 min to import.
- Replay simulation requires a completed import.
- All imported data is tagged with `historical_archive` provenance.
