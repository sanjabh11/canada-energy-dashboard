Plan

Implementation Coverage Review: ML Forecasting Priorities 1-15
Summary
Scoring scale used here:

5.0 = production-strong, source-backed, tested, and wired into user workflows
4.0-4.4 = strong v1, real code and some UI/API wiring, but important depth still missing
3.0-3.9 = partial implementation or algorithm/library-only
<3.0 = mostly architecture, UI, or data-governance groundwork
Current repo assessment:

15/15 have at least some code or schema evidence
11/15 are materially implemented at >= 4.0
2/15 are at >= 4.5
13/15 still need work to reach 4.5/5
Scorecard
#	Challenge	Current Status	Rating /5	Evidence In Repo	Plan To Reach 4.5+	Main Bottleneck
1	Unstructured Intelligence Voids	Implemented as allowlisted public-source ingestion, dedupe, consent guardrails, and resilience-map event surfacing	4.0	groundsource-miner, ml_source_documents, ml_intelligence_events, ResilienceMap ingest call	Replace rule-based extraction with actual LLM/entity extraction, add scheduled ingestion, provenance scoring, and retry/robots controls per source	Current extraction is heuristic, not true LLM mining
2	TIER 2025 Carbon Arbitrage	Strong implementation	4.7	tier-simulator, shared deterministic calculator, stale warnings, UI wiring in TIERROICalculator, tests	Add source-version registry and scenario exports only; core implementation is already strong	Policy volatility, not code structure
3	High-Dimensional Sensor Bloat	Strong v1 implementation	4.4	rankFeaturesRfeV1, rankFeaturesSvmRfeV2, ML forecast governance tables, ml-forecast integration	Persist training datasets and rankings per domain, expose retained/dropped feature audit UI, add offline sklearn parity job	No offline training worker / parity benchmark yet
4	RoLR Consumer Arbitrage	Strong implementation	4.6	rate-watchdog, estimate labeling, UI wiring in RROAlertSystem, tests blocking “guaranteed” claims	Add provider feed refresh and bill-level validation if you want higher confidence	Live retailer offer ingestion quality
5	Rare-Event Grid Failures	Partial-to-strong	4.0	generateKMeansSmote exists, ML stack and grid-risk pipeline exist	Wire synthetic minority generation into training jobs, store synthetic lineage, backtest anomaly uplift, keep synthetic data hidden from UI	No end-to-end training pipeline using SMOTE yet
6	Climate Volatility & Load Drift	Strong v1	4.3	drift detection in shared ML layer, model-monitor endpoint, ml_drift_metrics table, tests	Add automatic confidence downgrades in all forecast consumers, retraining triggers, and baseline refresh jobs	Drift is measured, but retraining orchestration is still manual
7	Wholesale Market Volatility	Strong v1	4.2	bagged spike-risk ensemble in forecasting layer, tests for Alberta spike scenarios	Add real backtests against AESO history, calibration curves, and benchmark comparison in forecasting UI	Missing historical model calibration and uplift proof
8	AESO Sub-Hourly Constraints	Strong advisory layer, not full physics model	4.0	evaluateSecurityConstrainedDispatch, evaluatePhysicsInformedDispatch, grid-risk, DigitalTwinDashboard constraint checks	Add sub-hourly dispatch features, SCED rule snapshots, and a dedicated inference path for physical feasibility	Current solver is surrogate/advisory, not real PINN or OPF
9	Bi-Directional PV Faults	Partial	3.9	topology tables, analyzePvFaultGraph, topology-aware fault scoring primitives	Add endpoint/UI flow for PV fault runs, real feeder topology ingestion, and event labeling for evaluation	Algorithm exists but is not yet operationalized in product surfaces
10	Data Center "BYOP" Load	Partial-to-strong	4.1	simulateByopMultiAgent, AIDataCentreDashboard, api-v2-ai-datacentres, api-v2-aeso-queue	Add explicit BYOP scenario panel, self-supplied capacity share tracking, and macro-forecast adjustments from MAS outputs	MAS exists in library form but not fully surfaced in app workflows
11	Cascading Transmission Risks	Strong partial	4.1	resilienceScoring exposes chebyshev_ipa_v2, limiting-factor logic, tests, ResilienceMap summary	Add explicit cascade-risk dashboard logic using non-compensatory scoring at substation/edge level and alert thresholds	Current IPA signal is present, but dashboard usage is still light
12	Low Short-Circuit Levels	Partial	3.6	SCED-style screening and constraint rejection exist in advancedForecasting and grid-risk	Add short-circuit-specific features, weak-grid node tagging, AESO rule mappings, and instability warnings for named weak regions	No short-circuit dataset or AESO SCED rule ingestion yet
13	Natural Gas Basis Divergence	Partial	3.4	forecastGasBasisSpread exists with AECO/Henry Hub, curtailment, storage, and weather drivers	Add endpoint, UI, real data ingestion, model monitoring, and backtests vs observed basis spread	Current implementation is library-only and uses synthetic training corpus by default
14	Indigenous Data Sovereignty	Early / architecture-ready, not production-implemented	2.4	Indigenous consent tables/functions exist, SovereignDataVault UI exists, but the component explicitly states full implementation is not done	Build true edge/on-prem execution model, real key management, nation-held encryption, residency enforcement, and consent-aware compute isolation	This is a real infrastructure problem, not a frontend problem
15	Capacity Expansion Policy	Partial	3.2	calculatePolicyOverlayRisk, api-v2-climate-policy, climate policy data pipeline	Add capital-project risk UI, project-level overlay endpoint, utility roadmap ingestion, and scenario exports for stranded-asset analysis	Policy data exists, but the actual product overlay is not wired into project workflows
What To Do Next
Highest-value items still below 4.5/5:

#14 Indigenous Data Sovereignty
Build this as a separate deployment mode, not a normal dashboard feature. It needs compute-location control, key custody, consent-bound processing, and offline/edge sync design.
#13 Natural Gas Basis Divergence
Promote the existing model into a real product surface with an endpoint, real AECO/Henry Hub inputs, pipeline/storage feeds, and benchmarked forecasts.
#12 Low Short-Circuit Levels
Extend grid-risk from generic constraint screening into weak-grid diagnostics with short-circuit strength features and AESO rule mappings.
#9 PV Fault Topology
The graph logic exists; the missing work is operational: feeder data, event labels, endpoint exposure, and UI.
#10 and #11
These are close. They need explicit product flows, not just underlying logic.
Recommended UI QA Checks
For QA, check these routes after backend verification:

/roi-calculator: stale warning, pathway comparison, no negative values, export/scenario behavior
/rate-alerts: savings always labeled estimated, no “guaranteed” wording, best-offer ordering is correct
/demand-forecast: model metadata, confidence, feature-ranking panel, fallback labeling
/forecast-benchmarking: ML governance run card renders, confidence/model version visible, no uplift claims without evidence
/digital-twin: grid-risk advisory appears, infeasible recommendations are rejected, fallback state is understandable
/resilience: intelligence events render without seeded fake incidents, fusion summary shows limiting factor and chebyshev_ipa_v2
/ai-datacentres: Alberta queue/load metrics load, cached snapshot behavior is correct, no claims of explicit BYOP orchestration unless surfaced
Assumptions
I treated “implemented” as code/schema/UI evidence in the repo, not marketing copy.
I did not count docs-only claims as implementation.
Items 14 and part of 15 are materially constrained by infrastructure and data partnerships, not just engineering effort.
