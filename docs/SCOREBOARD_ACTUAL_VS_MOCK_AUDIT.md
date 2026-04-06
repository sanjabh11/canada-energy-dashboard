# Scoreboard Actual vs Mock Audit

This audit distinguishes which scoreboards are currently actual, hybrid, mock-heavy, or intentional demo surfaces based on code-level evidence in the current repo state.

## Classification Rules

- **Actual**: primary metrics are backed by a real source path and surfaced with explicit freshness/provenance labels.
- **Hybrid**: real source paths exist, but at least some visible metrics still depend on fallback, supplemented, or sample values.
- **Mock-heavy**: the UI is real, but the visible business data is mostly sample, demo, or illustrative content.
- **Intentional demo**: static or mock content is deliberate product-demo content and should stay outside production scoreboard claims.

## Current Inventory

| Surface | Classification | Evidence in code | What still blocks “actual scoreboard” status |
|---|---|---|---|
| `/status` | Hybrid | `src/components/StatusPage.tsx` uses `HIGH_RISK_SOURCE_REGISTRY` and `OpsHealthPanel` as the trust layer | endpoint coverage and uptime history are still reference-only, not persisted live monitor history |
| `RealTimeDashboard` | Hybrid | `src/components/RealTimeDashboard.tsx` reads KPI, analytics, and streaming sources and now shows metric-level freshness badges | some visible panels still rely on fallback demand/supply inference and supplemented trend data |
| `AnalyticsTrendsDashboard` | Hybrid | `src/components/AnalyticsTrendsDashboard.tsx` now derives freshness from actual dataset timestamps and labels supplemented analytics as fallback | heatmaps and charts still remain directional when upstream demand/generation coverage is incomplete |
| `AIDataCentreDashboard` | Hybrid | explicit fallback dataset and sample-mode banner in `src/components/AIDataCentreDashboard.tsx` | summary cards still switch to static fallback queue/facility data when edge calls fail |
| `HydrogenEconomyDashboard` | Hybrid | edge wiring exists and the dashboard advertises external data sources | local/offline mode still drops to non-live dashboard content |
| `CriticalMineralsSupplyChainDashboard` | Hybrid | edge wiring exists and the dashboard labels offline/demo mode | placeholder/offline state still stands in for persisted source-backed summaries |
| `EVChargingDashboard` | Hybrid | some adoption values are data-backed | adoption trend chart still uses fallback sample trends when adoption data is missing |
| `CCUSProjectsDashboard` | Hybrid | project structure and metadata model exist | status distribution falls back to sample landscape data |
| `ESGFinanceDashboard` | Hybrid | some overview structures come from source-shaped data | chart rows still use `SAMPLE_TOP_PERFORMERS` and `SAMPLE_CARBON_EXPOSURE` |
| `ComplianceDashboard` | Mock-heavy | `mockComplianceData`, `mockViolations`, `mockAuditLog`, and `mockAlerts` are hardcoded in component state | all primary business records are illustrative until a real compliance source is connected |
| `CanadianClimatePolicyDashboard` | Hybrid | component has explicit `source`, `source_url`, and `last_updated` fields in policy models | requires confirmation that rendered policy rows are entirely source-backed and not partially curated/static |
| `CERComplianceDashboard` | Mock-heavy | sample compliance records and sample market oversight are inserted when API is empty | primary compliance and oversight rows are still seeded fallback content |
| `DigitalTwinDashboard` | Mock-heavy | live simulation/system-state code exists | dashboard explicitly switches to demo simulation state when backend state is unavailable |
| `RenewableOptimizationHub` | Hybrid | real forecast/performance APIs and DB fallback exist | performance and award evidence still fall back to mock metrics in empty/error cases |
| `StakeholderDashboard` | Mock-heavy | websocket and streaming hooks exist | stakeholder records, meetings, and feedback still fall back to sample consultation data |
| `SecurityDashboard` | Hybrid | real monitoring state and fallback notice exist | some paths still rely on fallback telemetry, so it is not purely live monitoring yet |
| `AIEnergyOracle` | Mock-heavy | UX and query scaffolding are real | natural-language responses are still mocked in the component |
| `Whop mini demo surfaces` | Intentional demo | `src/components/whop-mini/DashboardDemo.tsx` is demo UX by design | should remain excluded from production scoreboard claims |

## First Conversion Wave Already Implemented In This Slice

- `RealTimeDashboard`
  - KPI tiles now resolve to the first verified source and display explicit freshness badges.
  - KPI provenance no longer silently prefers stream-derived fallback values over verified API paths.
- `AnalyticsTrendsDashboard`
  - freshness badge now uses actual dataset timestamps instead of `now`
  - supplemented analytics remain explicitly labeled as fallback
  - deterministic modeled values replace random-looking synthetic values in fallback charts
- `/status`
  - static uptime claims were removed from the hero
  - endpoint coverage and uptime history are now explicitly labeled as reference-only until live history is wired

## Second Conversion Wave Already Implemented In This Slice

- `AIDataCentreDashboard`
  - hero freshness now uses edge-provided metadata when real sources are available
  - demo mode no longer stamps fallback datasets with a fake current timestamp
  - source-backed provincial facility views are distinguished from seeded queue/facility fallback mode
- `HydrogenEconomyDashboard`
  - hero now surfaces source and freshness metadata from the edge response
  - selected hub filters are presented as filtered source-backed snapshots rather than unlabeled live views
- `CriticalMineralsSupplyChainDashboard`
  - hero now surfaces source and freshness metadata from the edge response
  - `priorityOnly` and single-mineral views are presented as filtered source-backed snapshots with visible provenance

## Promotion Criteria For “Actual Scoreboard” Status

A scoreboard should only be promoted to **actual** when all of the following are true:

1. Visible KPI tiles expose `source`, `last_updated`, `freshness_status`, and `is_fallback` or an equivalent UI contract.
2. Fallback or supplemented values are clearly labeled in the rendered UI.
3. The primary summary cards are backed by a canonical table, Edge Function, or persisted service response.
4. Route-level browser verification confirms the visible labels match the code-path intent.
5. No hardcoded sample rows remain in the main user-facing metric layer.

## Recommended Next Batch

1. Replace fallback summary-card content in `AIDataCentreDashboard` with persisted queue/allocation sources so the main KPI row can become fully source-backed even during degraded mode.
2. Add explicit persisted summary/fallback contracts for `HydrogenEconomyDashboard` and `CriticalMineralsSupplyChainDashboard` so they can remain truthful without collapsing to empty offline screens.
3. Convert or demote `ComplianceDashboard`, `CERComplianceDashboard`, `StakeholderDashboard`, and `AIEnergyOracle` before they appear in any “live scoreboard” claims.
4. Add route-level browser verification for the newly provenance-badged scoreboards so rendered truth matches code-path intent.
