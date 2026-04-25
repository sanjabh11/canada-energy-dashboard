# Closeout Scoreboard

This is the authoritative closeout scoreboard for the PV / dispatch branch.
`docs/codex_plan.md` remains the planning memo; this file records the audited
state of the implementation as it exists now.

| # | Challenge | Status | Score | Primary evidence | Current bottleneck |
| --- | --- | --- | ---: | --- | --- |
| 1 | Unstructured Intelligence Voids | implemented, still heuristic-led | 4.0 | allowlisted public-source ingestion, dedupe, consent guardrails, resilience-map event surfacing | heuristic extraction still needs true LLM/entity mining and source-specific retries |
| 2 | TIER 2025 Carbon Arbitrage | strong implementation | 4.7 | deterministic TIER simulator, stale warnings, UI wiring, tests | mostly policy/source freshness rather than code depth |
| 3 | High-Dimensional Sensor Bloat | strong v1 | 4.4 | recursive feature elimination, persistence tables, forecasting integration | no offline training worker / parity benchmark yet |
| 4 | RoLR Consumer Arbitrage | strong implementation | 4.6 | rate-watchdog, estimate labeling, UI wiring, tests | live retailer feed freshness still determines confidence |
| 5 | Rare-Event Grid Failures | partial-to-strong | 4.0 | SMOTE generator exists, grid-risk pipeline exists | synthetic minority generation is not fully wired into training jobs |
| 6 | Climate Volatility & Load Drift | strong v1 | 4.3 | drift detection, model-monitor endpoint, drift metrics table | retraining orchestration remains manual |
| 7 | Wholesale Market Volatility | strong v1 | 4.2 | bagged spike-risk ensemble, Alberta scenarios, tests | historical calibration / uplift proof is still missing |
| 8 | AESO Sub-Hourly Constraints | advisory layer, not full physics model | 4.0 | security-constrained dispatch checks, grid-risk, constraint rejection | surrogate inference still needs a real physics-constrained solver path |
| 9 | Bi-Directional PV Faults | strong implementation | 4.5 | topology-aware graph model, trained contract chip, strict conformance fixture, soak workflow | partnership-driven hardening / live feeder labeling remains the lift |
| 10 | Data Center "BYOP" Load | partial-to-strong | 4.1 | multi-agent simulation, AI datacentre dashboard, queue APIs | not yet surfaced as a complete product flow |
| 11 | Cascading Transmission Risks | strong partial | 4.1 | non-compensatory fusion logic, tests, resilience summary | dashboard usage of the IPA signal is still light |
| 12 | Low Short-Circuit Levels | partial | 3.6 | SCED-style screening and constraint rejection exist | short-circuit dataset and rule ingestion are still absent |
| 13 | Natural Gas Basis Divergence | partial | 3.4 | AECO/Henry Hub model exists in library form | library-only, synthetic corpus by default, no endpoint/UI |
| 14 | Indigenous Data Sovereignty | early / architecture-ready | 2.4 | consent tables/functions, SovereignDataVault UI | true edge/on-prem execution, key custody, and residency enforcement are not done |
| 15 | Capacity Expansion Policy | partial | 3.2 | policy overlay helpers, climate policy pipeline | overlay is not wired into project workflows |

| Metric | Value |
| --- | ---: |
| Weighted average | 3.97 / 5 |

Notes:

- The closeout score reflects the audited implementation state, not the aspirational
  4.65 target that appears in earlier planning docs.
- PV suspect ordering and PV edge ordering both use the same 3-decimal risk bucket
  comparator in Python and TypeScript.
- Playwright trained flags are scoped to `webServer.env`, not a committed
  development env file.
- Remote `workflow_dispatch` verification for artifact publication remains a
  required closeout step when GitHub auth and repo secrets are available.
