@codebase-onboarding (Everything Claude Code)

# CEIP Futures Workbench Bead Plan

## Summary

CEIP should stay anchored in its strongest current product shape: Canadian utility and Alberta TIER proof packs, source-backed evidence, and careful claim boundaries. The upgrade path is to add a reusable “energy-economy futures workbench” substrate underneath the existing routes, rather than adding more isolated dashboards.

North-star system: a scenario engine, evidence/provenance registry, time-series/geospatial store, relationship graph, retrieval layer, optimization/sensitivity engines, and agent-facing tool manifest. Existing proof-pack routes remain intact and become consumers of this shared substrate.

Grounding constraints:
- No local project `AGENTS.md` was found; the user-provided AGENTS instructions are the operative project instructions.
- Existing dirty file is pre-existing: `/Users/sanjayb/minimax/canada-energy-dashboard/scripts/report-launch-evidence-manifest.mjs`.
- Keep current Netlify/Vite/Supabase architecture; do not introduce BigQuery, Vertex AI Search, or Cloud Run as requirements.
- Preserve current top commercial routes: `/utility-demand-forecast`, `/forecast-benchmarking`, `/regulatory-filing`, `/ga-ici-5cp`, `/byo-csv-proof`, `/roi-calculator`, `/credit-banking`, `/asset-health`, `/utility-security`, `/shadow-billing`.
- External source targets checked against official pages: [StatCan WDS](https://www.statcan.gc.ca/en/developers/wds), [CER Energy Futures 2026 data](https://www.cer-rec.gc.ca/en/data-analysis/canada-energy-future/2026/access-and-explore-energy-future-data.html), [CER Open Government datasets](https://search.open.canada.ca/opendata?owner_org=cer-rec), [CCEI](https://energy-information.canada.ca/en/homepage), [ECCC NPRI](https://pollution-waste.canada.ca/national-release-inventory/), [NRCan energy data](https://natural-resources.canada.ca/science-data/data-analysis/energy-data-analysis), [IESO market data](https://www.ieso.ca/market-data), and [AESO API](https://www.aeso.ca/market/market-and-system-reporting/aeso-application-programming-interface-api/).

## Public Interfaces And Data Model

Add a versioned CEIP analytical API while keeping existing routes and Edge functions stable.

Core types:
- `Scenario`: jurisdiction, horizon, sectors, technologies, policy levers, macro assumptions, demand assumptions, reliability assumptions, affordability assumptions.
- `AssumptionPack`: versioned assumptions with source citations, owner, created date, default status, and reproducibility hash.
- `ScenarioRun`: immutable execution record with scenario ID, assumption pack ID, model versions, input hashes, random seed, run status, warnings, and output artifact pointers.
- `OutcomeSeries`: normalized time-series outputs for electricity, fuels, emissions, cost, reliability, jobs/economic indicators, affordability, and land/geospatial metrics.
- `EvidenceSource`: source URL, publisher, source type, retrieval time, source-updated date, freshness status, fallback status, license notes, and trust tier.
- `GraphNode` / `GraphEdge`: policies, technologies, assets, datasets, sectors, constraints, actors, risks, projects, and relationships.
- `UncertaintySet`: distributions, confidence intervals, scenario bands, sensitivity rankings, and Monte Carlo run metadata.
- `OptimizationJob`: objective weights, hard constraints, solver settings, candidate pathways, Pareto frontier outputs, and infeasibility explanations.

New API surface:
- `GET /api/v2/scenarios`, `POST /api/v2/scenarios`, `GET /api/v2/scenarios/:id`
- `POST /api/v2/scenario-runs`, `GET /api/v2/scenario-runs/:id`, `GET /api/v2/scenario-runs/:id/outcomes`
- `GET /api/v2/outcomes/query` for filtered time-series/geospatial outputs
- `POST /api/v2/search` for hybrid source/scenario retrieval
- `GET /api/v2/graph/nodes`, `GET /api/v2/graph/edges`, `POST /api/v2/graph/impact`
- `POST /api/v2/sensitivity`, `POST /api/v2/optimization`
- `GET /api/v2/provenance/:artifactId`
- `GET /api/v2/tools/manifest` for agent/tool integration

All new responses must include `source`, `source_updated_at`, `retrieved_at`, `freshness_status`, `is_fallback`, `scenario_id` or `run_id` where applicable, `assumption_pack_id`, `evidence_hash`, and `warnings`.

Storage choices:
- Use Supabase Postgres as the source of truth.
- Use pgvector for retrieval, extending the existing RAG pattern.
- Use PostGIS for geospatial joins; if migration cannot enable PostGIS in the target project, implementation stops and reports the blocker.
- Use partitioned Postgres tables for high-volume time-series; do not require TimescaleDB.
- Use adjacency tables for graph storage; do not introduce Neo4j for v1.

## Bead Dependency Graph

Dependency overlay:
`B00 -> B01,B02,B03,B04`  
`B01+B02+B03 -> B05,B06,B07,B08`  
`B05+B06+B07 -> B09,B10,B11,B12`  
`B09+B10+B11+B12 -> B13,B14,B15,B16`  
`B13+B14+B15+B16 -> B17,B18,B19,B20`  
`B21` runs across every bead as the verification spine.

### B00 - Baseline Evidence And Claim Inventory

Background: CEIP already has strong proof-pack routes, but also hybrid and demo-heavy surfaces. Before changing architecture, freeze what is currently live, local, mock, fallback, or roadmap-only.

Implementation:
- Inventory route claims, Edge functions, data tables, fallback paths, and user-visible freshness labels.
- Classify every major route into `source-backed`, `hybrid`, `demo-only`, `roadmap`, or `blocked`.
- Produce a baseline manifest that maps routes to source tables/functions and verification commands.

Acceptance:
- Existing proof-pack routes are listed with current evidence status.
- Mock/fallback paths are explicitly labelled, including generated “realistic” grid data and streaming fallbacks.
- No public claim is promoted without source/freshness proof.

Tests:
- Run existing claim and commercial-source checks.
- Add a fixture-backed test that fails when a route displays live-style language while using demo/fallback data.

### B01 - Scenario Core Contract

Background: Current scenario logic is spread across proof packs, forecast modules, and dashboards. Analysts need one reusable scenario vocabulary for policies, demand, supply, reliability, affordability, and emissions.

Implementation:
- Define `Scenario`, `AssumptionPack`, `ScenarioRun`, and `OutcomeSeries` TypeScript types plus zod validators.
- Encode Canadian dimensions: province/territory, grid zone, sector, fuel, technology, policy lever, emissions scope, demand class, reliability metric, and affordability metric.
- Support public-friendly presets and analyst-grade advanced assumptions.

Acceptance:
- Scenario objects are serializable, versioned, validated, and hashable.
- Existing utility forecast assumptions can map into the new contract without losing current fields.

Tests:
- Unit tests for schema validation, invalid units, missing horizons, incompatible policies, and deterministic hashing.
- Regression test proving current utility-demand forecast cases still render.

### B02 - Source And Provenance V2

Background: Current provenance is useful but not yet strong enough for reproducible futures analysis. Every scenario output needs source lineage and confidence boundaries.

Implementation:
- Extend provenance to cover source trust tier, fallback class, license notes, source-updated date, retrieval timestamp, calculation method, model artifact version, and evidence hash.
- Add artifact-level provenance for scenario runs, charts, exports, RAG answers, and NL2SQL outputs.
- Standardize visible labels: `live`, `official historical`, `official projection`, `proxy`, `simulated`, `demo`, `stale`.

Acceptance:
- Every new API response and major visualization can explain where its numbers came from.
- Demo/fallback data cannot silently pass as source-backed evidence.

Tests:
- Unit tests for provenance aggregation.
- Integration test that intentionally injects stale data and verifies stale UI/API labels.
- Claim-boundary test for no hidden demo fallback.

### B03 - Time-Series And Geospatial Store

Background: Futures analysis needs fast queries across years, provinces, fuels, grid regions, facilities, and assets. Current tables are route-specific and not normalized for broad scenario comparisons.

Implementation:
- Add partitioned `energy_time_series` tables keyed by metric, geography, sector, fuel, technology, time, scenario/run, and source.
- Add geospatial tables for provinces, grid zones, facilities, interties, generation assets, emissions facilities, and Indigenous/community context layers where licensing permits.
- Add materialized views for common policy views: emissions by province/year, electricity mix by province/hour, demand growth, cost bands, reliability reserve margins.

Acceptance:
- Query paths support time range, geography, metric, source, and scenario filters.
- Geospatial assets can join to time-series and provenance records.

Tests:
- Data integrity tests for duplicate keys, time ordering, unit consistency, and geometry validity.
- Query performance benchmark with realistic fixture volume and p95 targets.

### B04 - OpenAPI And API Parity

Background: Current OpenAPI docs are partially representative while many actual Edge functions use `api-v2-*`. Analysts, agents, and external tools need truthful API contracts.

Implementation:
- Replace illustrative-only OpenAPI sections with generated or manually verified contracts for actual implemented endpoints.
- Add the new scenario/search/graph/sensitivity/optimization/provenance endpoints.
- Add examples for analyst, public, and agent clients.

Acceptance:
- `/api-docs` only documents endpoints that exist or are explicitly marked planned.
- Endpoint examples include provenance and fallback fields.

Tests:
- OpenAPI schema validation.
- Contract tests comparing documented response fields with Edge-function fixtures.
- Negative tests for auth, rate limits, invalid filters, and oversized queries.

### B05 - Official Data Connector Framework

Background: Live-source integration should be connector-driven, not embedded route by route. Initial official sources should focus on Canadian energy, emissions, and market data.

Implementation:
- Build connector interface: `discover`, `fetch`, `normalize`, `validate`, `upsert`, `freshnessCheck`, `lineageRecord`.
- Implement initial adapters for StatCan WDS/SDMX, CER Energy Futures/Open Gov downloads, ECCC NPRI datasets, NRCan energy datasets, AESO API, and IESO market/data-directory feeds.
- Keep UtilityAPI and Green Button lanes separate from national public-data connectors.

Acceptance:
- Each connector has source metadata, refresh cadence, data license notes, and failure behavior.
- Failed connector runs mark data stale rather than replacing it with unlabeled sample data.

Tests:
- Fixture-based connector tests for each source.
- Integration test for one full ingest path from source fixture to normalized table to provenance record.
- Scheduler test for stale/run-failed states.

### B06 - Emissions, Energy, And Economy Balance Validators

Background: A futures tool must catch impossible pathways. Canada-specific balances should validate energy supply/demand, emissions factors, imports/exports, and policy accounting.

Implementation:
- Add validators for electricity balance, fuel balance, emissions balance, carbon credit ledger balance, import/export accounting, and scenario horizon consistency.
- Encode tolerances by data resolution and source class.
- Add unit conversion registry for MWh, GWh, PJ, tCO2e, ktCO2e, CAD, real/nominal dollars.

Acceptance:
- Scenario runs cannot be marked valid if supply, demand, emissions, or units fail validation.
- Validator output is user-readable and API-readable.

Tests:
- Unit tests for each balance equation.
- Golden fixtures for valid and invalid scenarios.
- Regression tests for existing TIER, credit banking, and utility forecast flows.

### B07 - Policy And Pathway Relationship Graph

Background: Analysts need to see dependencies, conflicts, and reinforcing effects among policies, technologies, assets, and outcomes.

Implementation:
- Create graph tables for nodes and edges.
- Node types: policy, regulation, market rule, technology, asset, sector, geography, dataset, model, assumption, constraint, actor, risk, outcome.
- Edge types: `depends_on`, `conflicts_with`, `reinforces`, `substitutes`, `constrains`, `funds`, `regulates`, `located_in`, `emits`, `consumes`, `imports`, `exports`, `evidenced_by`.
- Seed graph from existing proof-pack concepts: TIER, GA/ICI, demand response, DER, storage, interties, carbon credits, utility filings, security constraints.

Acceptance:
- Users can ask “what policies conflict with this pathway?” and receive graph-backed answers.
- Graph records cite evidence sources or explicit analyst-authored assumptions.

Tests:
- Unit tests for graph schema and edge validation.
- Impact traversal tests for conflict/dependency paths.
- Cycle detection tests for dependency loops.

### B08 - Hybrid Search And Retrieval V2

Background: Current RAG uses Gemini embeddings plus lexical fallback over official corpus chunks. It should become outcome-aware and scenario-aware.

Implementation:
- Add source registry filters, scenario/run filters, geography filters, freshness filters, and trust-tier filters.
- Rank results with hybrid lexical/vector scores plus freshness, source authority, geography match, and outcome relevance.
- Add retrieval modes: `evidence`, `scenario`, `policy`, `data-table`, `methodology`, `counterexample`.
- Return citations, excerpts, provenance, and why-ranked metadata.

Acceptance:
- Search can answer evidence questions and scenario questions separately.
- Public-facing answers do not cite stale/demo evidence unless explicitly requested.

Tests:
- Unit tests for ranking and filter behavior.
- RAG regression fixtures for source-backed answers.
- Adversarial query tests for prompt injection and unsupported claims.

### B09 - NL2SQL And Agent Tool Hardening

Background: CEIP has NL2SQL and copilot surfaces, but they are repair-sensitive and demo-fallback capable. These must become reliable analyst tools.

Implementation:
- Restrict NL2SQL to approved read-only views with documented schemas.
- Add query planner output: selected tables, filters, limits, assumptions, and rejection reason when unsafe.
- Require every agent answer to cite tool calls, source records, and freshness.
- Add `/api/v2/tools/manifest` with stable tool schemas for scenarios, search, graph, and outcome queries.
- No autonomous writes in v1; scenario creation from chat creates a draft payload for user review.

Acceptance:
- Agent cannot invent unsupported datasets, silently query demo data, or mutate state.
- Analyst can inspect “show work” for any answer.

Tests:
- Security tests for SQL injection, prompt injection, blocked tables, and excessive limits.
- Integration tests for RAG + NL2SQL combined answers.
- E2E tests for natural-language scenario drafting and rejection paths.

### B10 - Sensitivity Engine

Background: Policy analysts need to know what actually drives outcomes, not just see static projections.

Implementation:
- Implement deterministic one-at-a-time sensitivity for v1: carbon price, demand growth, EV adoption, heat pump adoption, DER/storage uptake, weather severity, fuel price, industrial output, intertie availability.
- Add optional Monte Carlo runs with seeded randomness and capped run counts.
- Produce tornado charts, ranked drivers, and “outcome elasticity” summaries.

Acceptance:
- Sensitivity outputs are reproducible with the same seed and assumption pack.
- UI explains which levers matter most for emissions, cost, reliability, and affordability.

Tests:
- Unit tests for deterministic perturbations.
- Reproducibility tests for seeded Monte Carlo.
- Performance benchmark for bounded run counts.

### B11 - Optimization And Pareto Frontier Engine

Background: A compelling workbench should help users find feasible pathways under trade-offs, not just inspect prebuilt scenarios.

Implementation:
- Add constrained optimization jobs with objective weights: emissions reduction, cost, reliability, affordability, resilience, Indigenous/community constraints, implementation speed.
- Use a pragmatic v1 solver: grid/random search plus pruning, not a heavyweight external optimizer.
- Return Pareto frontier candidates, infeasible constraints, and recommended next-relaxation explanations.

Acceptance:
- Users can compare pathways such as “lowest emissions under reliability floor” or “least cost under 2035 clean electricity constraint”.
- Infeasible policy mixes produce clear explanations.

Tests:
- Unit tests for objective scoring and constraint enforcement.
- Integration tests for known feasible/infeasible fixture pathways.
- Benchmark for p95 job duration under capped candidate counts.

### B12 - Uncertainty And Reproducibility Layer

Background: Net-zero futures are uncertain. CEIP should make uncertainty visible without making the tool feel vague.

Implementation:
- Add uncertainty bands to scenario outputs.
- Track input hashes, model artifact hashes, source hashes, random seeds, code version, and assumption pack version.
- Add run replay: load an old scenario run and reproduce outputs or explain drift if source/model versions changed.

Acceptance:
- Every chart/export can show the run ID and reproducibility metadata.
- Re-running a frozen scenario with frozen inputs produces the same result.

Tests:
- Snapshot tests for run hashes.
- Replay tests for fixed fixtures.
- Drift tests when source versions change.

### B13 - Analyst Scenario Lab UI

Background: Existing routes are useful but siloed. Analysts need a central workspace for building, comparing, and explaining pathways.

Implementation:
- Build a scenario lab with left-side assumptions, center visual workbench, right-side evidence/provenance/agent panel.
- Support compare mode for baseline vs policy scenario vs optimized scenario.
- Include role modes: policy analyst, economist/regulator, utility planner, public explainer.
- Keep cards restrained and dense; use existing React/Tailwind/shadcn patterns.

Acceptance:
- A user can create a scenario, run it, compare outcomes, inspect evidence, and export a proof artifact.
- Public mode hides expert controls and emphasizes plain-language explanations.

Tests:
- Playwright E2E for scenario creation, run, compare, evidence inspection, and export.
- Accessibility tests for keyboard navigation and labels.
- Mobile/desktop visual checks.

### B14 - Visualization Innovations

Background: CEIP should become indispensable by showing relationships and trade-offs that are hard to see elsewhere.

Implementation:
- Add pathway Sankey for energy flows by province/sector/fuel.
- Add policy conflict/dependency graph with impact expansion.
- Add Pareto frontier scatterplot for emissions/cost/reliability trade-offs.
- Add uncertainty fan charts and sensitivity tornado charts.
- Add geospatial playback for regional generation, demand, emissions, interties, and facility layers.
- Add “why changed?” decomposition waterfall between scenarios.

Acceptance:
- Visualizations are source-linked, responsive, and exportable.
- No visualization renders without provenance and units.

Tests:
- Unit tests for chart data transforms.
- Playwright visual regression for key states.
- Canvas/SVG nonblank checks for graph/map-heavy views.
- Performance tests for large series rendering and virtualization.

### B15 - Policy Interaction And Conflict Radar

Background: Canada’s transition analysis is full of federal/provincial interactions: carbon pricing, TIER/OBPS, clean electricity rules, intertie constraints, affordability programs, utility filings, and industrial policy.

Implementation:
- Build a conflict radar view that identifies policy collisions, dependency risks, and missing enabling conditions.
- Add explanations such as “policy A assumes resource B that scenario C constrains”.
- Include federal/provincial layering and regulator-specific notes.

Acceptance:
- Users can inspect conflicts before trusting an optimized pathway.
- Conflict severity is evidence-backed or explicitly marked as analyst-authored.

Tests:
- Graph traversal tests for conflict detection.
- Fixture scenarios with known conflicts.
- E2E test for conflict explanation drilldown.

### B16 - Canada Live Data Spine

Background: Current data ingestion exists but is uneven. A live-data spine should provide audited feeds for source-backed analysis.

Implementation:
- Promote official connector outputs into a shared freshness dashboard.
- Add source-level SLAs, last successful run, last source update, row counts, validation failures, and fallback status.
- Add “do not use for live claims” blocking status when connector freshness fails.

Acceptance:
- Analysts can see whether StatCan, CER, ECCC, NRCan, IESO, and AESO-derived data is current enough for the chosen analysis.
- Stale data blocks live-label exports.

Tests:
- Connector health integration tests.
- UI tests for stale/live/fallback states.
- Alert tests for failed scheduled runs.

### B17 - Proof-Pack Migration To Shared Substrate

Background: The upgrade must preserve existing commercial value. The shared substrate should strengthen proof packs, not distract from them.

Implementation:
- Migrate utility demand forecast, forecast benchmarking, regulatory filing, GA/ICI, TIER, credit banking, and asset health to consume the scenario/provenance contracts where practical.
- Keep route-specific copy and buyer framing intact.
- Add scenario-run IDs and evidence hashes to proof-pack exports.

Acceptance:
- Existing proof-pack behavior remains stable.
- Exports become more reproducible and better cited.

Tests:
- Existing proof-pack unit and browser tests still pass.
- Export artifact tests include run ID, assumption pack ID, and provenance.
- Regression tests for README/Top20 claim boundaries.

### B18 - Agentic Analyst Copilot

Background: The ideal assistant should help analysts explore, not hallucinate. It should operate through typed tools and show its work.

Implementation:
- Add agent workflows: build scenario draft, explain pathway, compare scenarios, find evidence, identify conflicts, summarize uncertainty, generate policy memo draft.
- Require tool calls for factual/scenario claims.
- Add citation sidebar with source freshness and fallback labels.
- Add refusal behavior for unsupported or stale claims.

Acceptance:
- Copilot answers are reproducible from tool traces.
- Users can convert a copilot draft into a scenario only after review.

Tests:
- Agent trace tests.
- Prompt injection and unsupported-claim tests.
- E2E tests for scenario draft, evidence lookup, and conflict explanation.

### B19 - Performance And Reliability Ratchet

Background: Adding futures analysis can make the app slow unless performance is designed into the substrate.

Implementation:
- Add query caching for expensive scenario outcomes and source retrieval.
- Use web workers for large client-side transforms.
- Virtualize long tables and large graph lists.
- Add bundle budgets for new workbench routes.
- Add p95 latency budgets for API endpoints and scenario runs.

Acceptance:
- Existing top routes do not regress.
- Scenario lab remains responsive with realistic fixture data.

Tests:
- Bundle-size checks.
- API p95 benchmark fixtures.
- Browser performance smoke for scenario lab and visualization routes.
- Memory-use checks for large time-series comparisons.

### B20 - Export, Audit, And Reproducible Evidence Packs

Background: Regulators and policy teams need durable artifacts, not just interactive screens.

Implementation:
- Add export formats: PDF memo, CSV/XLSX data bundle, JSON scenario bundle, provenance manifest, and chart images.
- Include all assumptions, source citations, uncertainty summaries, graph conflicts, validation results, and reproducibility hashes.
- Add public-safe and analyst-full export modes.

Acceptance:
- A future reviewer can reproduce or audit a scenario from the exported bundle.
- Public-safe exports do not expose secrets or internal-only tables.

Tests:
- Snapshot tests for export metadata.
- CSV/XLSX schema tests.
- PDF smoke tests.
- Security tests for redaction.

### B21 - Cross-Cutting Verification Spine

Background: The work is only valuable if it is trusted. Verification must be designed as a first-class workstream.

Implementation:
- Add fixture library for Canadian scenario consistency.
- Add scenario consistency checks, emissions balance validation, performance benchmarks, visual regression, data integrity, RAG/NL2SQL conformance, and API contract tests.
- Wire checks into existing scripts instead of replacing current test structure.

Acceptance:
- Each bead has unit, integration, and E2E coverage where relevant.
- Existing core functionality remains covered and passing.

Required checks:
- `pnpm run check:claim-boundaries`
- `pnpm run check:commercial-source`
- `pnpm run test:strategy-audit-slice`
- `pnpm test`
- `pnpm run build`
- Focused Playwright E2E for scenario lab and preserved proof-pack routes
- Connector fixture tests
- API contract/OpenAPI parity tests
- Performance benchmarks for scenario/outcome/search endpoints

### B22 - Documentation And Operator Handoff

Background: Future agents and collaborators should not need the original request to continue implementation.

Implementation:
- Add architecture docs for scenario substrate, data contracts, connector framework, graph model, agent tool manifest, and verification gates.
- Add migration notes for proof-pack routes.
- Add source onboarding guide for adding a new official dataset.
- Add “claim boundary” examples for live, historical, projected, simulated, and demo outputs.

Acceptance:
- A new engineer can implement a connector, add a scenario metric, or create a visualization without reverse-engineering the app.
- Docs distinguish implemented, local-only, source-backed, demo, and roadmap features.

Tests:
- Documentation link checks.
- OpenAPI examples validated against fixtures.
- Claim-boundary script updated to scan new docs.

## Innovative Feature Backlog

These should be built after B00-B12 establish the substrate:

- Canada pathway flight recorder: replay how a scenario changed over time, including source updates, assumption edits, and model version drift.
- Federal-provincial policy stack explorer: visualize how clean electricity rules, carbon price, TIER/OBPS, utility rates, and industrial incentives interact by province.
- Affordability stress cockpit: show household, SME, industrial, and public-sector bill impacts under pathway variants.
- Reliability under climate stress: combine demand growth with heat waves, cold snaps, wildfire smoke, drought/hydro constraints, and intertie outage assumptions.
- AI data-centre load queue stressor: model demand spikes, interconnection constraints, curtailment, and emissions impacts under data-centre growth scenarios.
- Indigenous and community consent layer: represent consultation, benefit-sharing, land-use constraints, and unresolved governance risks as explicit pathway constraints, not decorations.
- Cross-border vulnerability map: show import/export reliance, intertie constraints, U.S. market exposure, and fossil fuel price sensitivity.
- Policy memo generator: generate regulator-ready memos only from cited scenario outputs and evidence records.
- Counterfactual finder: answer “what assumption would have to change for this pathway to work?”
- Pathway contradiction detector: detect incompatible assumptions such as electrification growth without generation/intertie/buildout capacity.

## Implementation Order

1. B00-B04 first: freeze baseline, contracts, provenance, storage, and API truth.
2. B05-B08 second: official connectors, validators, graph, and retrieval.
3. B09-B12 third: agent hardening, sensitivity, optimization, uncertainty.
4. B13-B18 fourth: scenario lab, visualizations, conflict radar, live data spine, proof-pack migration, copilot.
5. B19-B22 continuously: performance, exports, verification, and docs.

## Test And Acceptance Rules

Global acceptance:
- Existing proof-pack routes continue to work.
- Demo/fallback data is always labelled.
- New scenario outputs are reproducible by run ID.
- Every user-visible number has units and provenance.
- Every agent factual claim is backed by a tool result or cited source.
- No live-data claim is emitted from stale, demo, or fallback data.
- API documentation matches implemented behavior.

Data integrity:
- No duplicate metric/geography/time/source/scenario keys.
- No future timestamps unless the metric is explicitly a projection.
- Supply equals demand plus losses/storage/net imports within configured tolerance.
- Emissions equal activity multiplied by sourced emissions factors within configured tolerance.
- Currency fields declare CAD, nominal/real basis, and base year where relevant.
- Geometries are valid and joined to the correct jurisdiction.

Performance:
- Top existing routes must not regress in bundle size or load behavior.
- Scenario query p95 and search p95 budgets are defined before implementation and enforced in CI fixtures.
- Large charts use virtualization, aggregation, or workers.

Visual quality:
- Scenario lab, maps, Sankeys, graphs, Pareto views, uncertainty bands, and proof-pack exports get desktop and mobile Playwright screenshots.
- Graph/map/canvas surfaces include nonblank rendering checks.
- Text must not overlap or overflow controls on supported viewports.

## Assumptions And Defaults

- This is a plan-only deliverable; no repo-tracked files or bead artifacts are created in Plan Mode.
- Supabase remains the database and Edge-function runtime.
- Gemini can remain the embedding/LLM provider, but all AI output must be tool/citation grounded.
- The first graph backend is Postgres adjacency tables.
- The first optimization engine is bounded search/pruning, not a heavyweight solver.
- The first live-source connectors use official public APIs/downloads and fixtures; paid or authenticated feeds are future adapters.
- UtilityAPI and Green Button remain isolated from national public-data connectors until their adapter backlog is complete.
- Existing simulator-calibrated model artifacts remain clearly labelled until partner-data validation upgrades their claim status.

## ECC Ledger

Route: `@codebase-onboarding` as the closest registered ECC skill for code investigation; exact “code investigation agent” was not a separate exposed role.  
Tier: Treated as Tier 2 planning because the scope is multi-phase and architecture-wide; dynamic workflow dry-run returned `skip` / normal PhaseLoop, so no durable backlog was created.  
Mode: Plan-only, non-mutating investigation.  
Skills/tools used: Everything Claude Code codebase-onboarding skill, dynamic-workflow-backlog dry-run, codegraph, repo search/reads, memory lookup, and official-source web verification.  
Baseline: React/Vite/Supabase CEIP proof-pack app with RAG/NL2SQL/agent surfaces, many Edge functions, strong commercial proof routes, and some hybrid/demo/fallback surfaces.  
Checks: Read core docs and architecture files; inspected route map, config, data services, RAG/NL2SQL, provenance, model manifest, connector docs, OpenAPI, schema, tests, and official external data-source pages.  
Delta: Produced a decision-complete bead graph for a scenario-centered CEIP futures workbench.  
Reflection: The highest-leverage improvement is not another dashboard; it is a shared scenario/provenance/graph/retrieval substrate that makes every route more trustworthy and reusable.  
Decision: Preserve proof-pack commercial core, add reusable analytical substrate, and gate all live/AI/scenario claims through provenance and verification.  
Next adjustment: After leaving Plan Mode, create actual repo-native beads/backlog records from B00-B22, then implement B00-B04 as the first focused phase.
