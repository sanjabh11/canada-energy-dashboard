# Closeout Scoreboard

This is the authoritative closeout scoreboard for the audited implementation
state on `main`. `docs/codex_plan.md` remains the planning memo; this file
tracks the evidence-backed score after Wave D reconciliation.

| # | Challenge | Status | Score | Primary evidence | Current bottleneck |
| --- | --- | --- | ---: | --- | --- |
| 1 | Unstructured Intelligence Voids | strong implementation | 4.3 | live `groundsource-miner` deployment, Gemini-backed structured extraction, allowlisted public-source ingestion, dedupe, consent guardrails, resilience-map event surfacing, verified writes to `ml_source_documents`, `ml_intelligence_events`, `ops_runs`, and `job_execution_log` | still depends on source quality and current public-source coverage rather than private outage feeds |
| 2 | TIER 2025 Carbon Arbitrage | strong implementation | 4.7 | deterministic TIER simulator, stale warnings, UI wiring, tests | mostly policy/source freshness rather than code depth |
| 3 | High-Dimensional Sensor Bloat | strong implementation | 4.5 | recursive feature elimination, persistence tables, forecasting integration, offline parity workflow, aligned TypeScript-vs-reference benchmark artifact, deterministic dataset/seed, verified `1.00` retained-feature overlap against the aligned reference | first remote GitHub Actions artifact upload still needs to run after push, but the benchmark contract and local parity gate are now green |
| 4 | RoLR Consumer Arbitrage | strong implementation | 4.6 | rate-watchdog, estimate labeling, UI wiring, tests | live retailer feed freshness still determines confidence |
| 5 | Rare-Event Grid Failures | strong training-only uplift | 4.3 | KMeans-SMOTE generator, uplift backtest summary, synthetic-lineage surfacing in `DemandForecastDashboard`, grid-risk pipeline | recurring job persistence is still missing; synthetic rows remain training-only |
| 6 | Climate Volatility & Load Drift | strong v2 | 4.5 | drift detection, model-monitor endpoint, drift metrics table, `cron-model-retrain.yml` dispatcher | retrain success still depends on source-backed rows and configured GitHub secrets |
| 7 | Wholesale Market Volatility | strong implementation | 4.5 | bagged spike-risk ensemble, Alberta scenarios, source-backed `market_spike_series`, Benchmarking page AUC/precision/recall surfacing | still advisory until live operational triggers are tuned against more Alberta spikes |
| 8 | AESO Sub-Hourly Constraints | advisory layer, not full physics model | 4.0 | security-constrained dispatch checks, grid-risk, constraint rejection | surrogate inference still needs a real physics-constrained solver path |
| 9 | Bi-Directional PV Faults | strong implementation | 4.5 | topology-aware graph model, trained contract chip, strict conformance fixture, soak workflow | partnership-driven hardening / live feeder labeling remains the lift |
| 10 | Data Center "BYOP" Load | strong partial | 4.3 | multi-agent simulation, AI datacentre dashboard, queue APIs, BYOP load-coordination panel with macro-load metrics | still lacks site-verified self-supply telemetry |
| 11 | Cascading Transmission Risks | strong implementation | 4.4 | non-compensatory fusion logic, tests, resilience-map cascade workflow cards, limiting-factor and threshold surfacing | still depends on public-event coverage and operator adoption |
| 12 | Low Short-Circuit Levels | strong fixture-backed screening | 4.1 | SCED-style screening, AESO rule mappings, weak-grid node tagging, named Alberta fixture catalog, demand-dashboard provenance | still fixture-backed; no live short-circuit study feed or source-backed SCED integration |
| 13 | Natural Gas Basis Divergence | strong implementation | 4.3 | source-backed `gas_basis` domain in `ml-forecast`, Demand Forecast routing, Forecast Benchmarking AECO/Henry Hub backtest block | remains Alberta-focused and needs ongoing source freshness monitoring |
| 14 | Indigenous Data Sovereignty | honest edge-vault v1 | 3.2 | browser-side PBKDF2 + AES-GCM export/import, consent gate, local audit log, explicit limitations, ADR-0011 | still local-only; no nation-held KMS, on-prem deployment, or residency enforcement |
| 15 | Capacity Expansion Policy | strong implementation | 4.3 | `policy_overlay` domain, climate policy dashboard, project-level stranded-asset overlay, JSON export, project comparisons | still an advisory workflow overlay rather than a final investment-decision engine |

| Metric | Value |
| --- | ---: |
| Weighted average | 4.30 / 5 |

Notes:

- The closeout score reflects the audited implementation state, not the aspirational
  4.65 target that appears in earlier planning docs.
- Wave D raises the average above 4.2 mainly by reconciling code/doc drift on
  `#5`, `#7`, `#10`, `#11`, `#12`, `#13`, and `#15`, plus adding the missing
  retrain dispatcher for `#6`.
- Wave E adds a real local cryptography path for `#14`, promotes `#3` after the
  aligned parity harness clears `1.00` overlap locally, and promotes `#1` after
  live Gemini-backed production proof lands, bringing the audited average to
  `4.30 / 5`.
- PV suspect ordering and PV edge ordering both use the same 3-decimal risk bucket
  comparator in Python and TypeScript.
- Playwright trained flags are scoped to `webServer.env`, not a committed
  development env file.
- `#3` now uses an aligned TypeScript-vs-reference parity gate for promotion and
  still publishes the sklearn baseline as diagnostic evidence; the current local
  parity artifact clears the `0.75` floor at `1.00`.
- `#1` promotion is backed by a live Supabase deployment plus production
  invocations for `utility_public` and `policy_public` that returned
  `llm_source_count=1`, `extraction_mode='llm'`, and wrote document, event, ops,
  and job-execution rows.
