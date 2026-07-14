Part 1- 


Canada Energy Forecasting Web App Improvement Report
Executive summary
The current application appears to be a technically ambitious Canada-focused energy intelligence platform with a modern web front end, serverless/cloud deployment, a Python model layer, and a notably broad forecasting surface area: utility demand forecasting, peak tracking, resilience scoring, asset-health analysis, uncertainty and sensitivity tooling, and a large “advanced forecasting” module family that includes physics-informed, graph-based, commodity-price, and policy-stress components. On architecture alone, it is ahead of a typical internal analytics dashboard. The main risk is not lack of sophistication, but lack of product discipline: the app seems to have accumulated many advanced capabilities without clear evidence that each one is consistently data-backed, benchmarked, explainable, accessible, and production-governed end to end. 

Relative to the strongest public and commercial comparators, the current app’s biggest gaps are likely to be: a thinner official Canadian data backbone than the surface area of the product implies; insufficient distinction between planning horizons; unclear model governance and retraining discipline; limited demonstrated probabilistic calibration; no clearly evidenced hierarchical reconciliation across geography/market/asset levels; no clearly evidenced production observability/SLO framework; and an opportunity to simplify UX around scenario analysis, uncertainty, and provenance. Official Canadian public infrastructure is strong on data and long-range scenario views: Statistics Canada’s Energy Statistics and the Canadian Centre for Energy Information provide a broad official data backbone and interactive tools, while the Canada Energy Regulator’s Canada’s Energy Future 2023 offers long-term, province-level, multi-energy scenarios to 2050 with downloadable data and visualization. 

The best near-term strategy is not to replace the current stack, but to narrow it into a layered architecture: official-data-centric ingestion; horizon-specific model families; a mandatory benchmark layer using transparent statistical baselines; probabilistic outputs with calibration checks; feature-store and model-registry governance; and a simplified UX built around “forecast, drivers, uncertainty, scenarios, and validation.” Research over the last five years strongly supports hybrid stacks rather than single-model bets: strong statistical baselines, gradient-boosted trees for structured exogenous signals, modern deep sequence models for multivariate long-horizon structure, and graph/physics-informed surrogates only where topology or physical constraints materially matter. 

The highest-value implementation path is a staged migration over roughly three releases. First, harden the data and evaluation substrate. Second, restructure the model layer by forecast horizon and business objective. Third, upgrade UX, accessibility, and deployment governance. On a directional basis, the most valuable investments are medium effort and medium cost rather than moonshot rebuilds: data contracts, backtesting, probabilistic metrics, retraining automation, and coherent visualization will almost certainly generate more business value than adding more exotic models. 

Current app assessment
What the current app already does well
Based on the supplied application inventory, the app already has the bones of a serious forecasting platform rather than a simple dashboard. It uses a modern TypeScript/React/Vite front end with data visualization libraries and map support, a Python-based modeling layer running on Modal, Supabase for auth/data services, Netlify for hosting, and CI/CD via GitHub Actions. The described feature set spans utility demand forecasting, peak-tracking, resilience scoring, asset-health monitoring, advanced forecasting, uncertainty/sensitivity modules, provenance/signing concepts, and feature-flagged deployments. That is materially more advanced than most first-generation energy analytics apps. 

The strongest implication of the current design is that the team already understands that Canadian energy forecasting is not one problem but many. Load, renewable generation, prices, gas basis, policy stress, resilience, and equipment health each have different data cadences, feature spaces, error tolerances, and decision audiences. The presence of specialized modules such as dispatch_pinn, pv_fault_gnn, price_forecaster, gas_basis_model, policy_stress_model, uncertainty engines, and baseline arbiters suggests the app was designed with multi-objective forecasting in mind rather than as a single monolithic model. That is a strategically correct direction. 

Current feature and operating-model inventory
Area	Current state	Assessment
Product scope	Demand, peaks, resilience, asset health, advanced forecasts, uncertainty/sensitivity, scenario-like modules. 
Broad and differentiated, but at risk of fragmentation without tighter product framing.
Front end	Modern React/TypeScript stack with charting and map capabilities. 
Strong foundation for interactive workflows.
Back end / inference	Python model services on Modal; cloud-native/service-oriented patterns. 
Good for experimentation and scaling specific inference jobs.
Data/application services	Supabase-authenticated application layer; Netlify deployment; GitHub Actions CI. 
Modern delivery posture, though production security/observability details are not yet evident.
Model diversity	Statistical, ML, physics-informed, graph-based, commodity/policy modules referenced in code inventory. 
Excellent optionality; needs discipline on where each model is actually justified.
Validation surface	Baselines and uncertainty references appear present, but formal benchmark regime is not fully specified. 
Major opportunity area.
Explainability / provenance	Mentions of manifests, model provenance, signing/hash concepts. 
Promising; should become a visible user-facing trust feature.
Accessibility / security	Not enough evidence of WCAG conformance, ASVS verification, or AI-risk controls.	Important operational gap.

Likely user flows
The exact user journeys are not fully specified, so the following are evidence-based inferences from the app structure rather than verified UI documentation. The most likely primary flow is: select geography or utility, choose target variable and horizon, inspect forecast and confidence intervals, overlay drivers such as weather/policy/asset conditions, then export or operationalize the result. A second likely flow is operational monitoring: watch peaks, resilience, and health signals, then drill into scenario or driver decomposition. A third is model-governance/analyst flow: compare baselines, review backtests, and inspect model provenance. Those flows are consistent with the app modules described and with how leading energy-intelligence platforms structure user value.

Where the current app is probably overextended
The biggest concern is model sprawl. When one product includes utility load, renewable-output, commodity-price, gas-basis, resilience, and asset-health forecasting, the failure mode is usually not insufficient sophistication but uneven maturity. Some modules end up production-grade, others remain proto-research features, and the UI presents them as equally trustworthy. That problem becomes more acute when user base, budget, and support structure are unspecified, because governance and support load can grow faster than model count. 

A second concern is horizon mixing. Canadian energy users need distinct experiences for intraday operations, day-ahead scheduling, season-ahead planning, and long-range strategic scenarios. Official Canadian systems already separate some of these roles: Statistics Canada and CCEI provide rolling statistical foundations and high-frequency electricity views, while the CER’s Energy Futures product addresses long-term, scenario-based structural outlooks to 2050. If the current app blends operational forecasts and strategic scenarios into one undifferentiated surface, it risks underperforming both use cases. 

External benchmark and reference landscape
Official Canadian data and forecast benchmarks
Canada’s public benchmark stack is stronger than many product teams assume. Statistics Canada’s Energy Statistics portal explicitly consolidates official data on electricity, fossil fuels, energy supply/use, and related indicators; the site links users to electricity and renewable energy data and current monthly indicators. 

The Canadian Centre for Energy Information is especially relevant because it is explicitly described as a “one-stop virtual shop” for independent and trusted information on energy in Canada. It exposes datasets, visualizations, publications, and a “High-Frequency Electricity Data: Visualization Tool (Beta),” which matters because it sets a baseline expectation that a Canada energy app should do more than static charts: it should let users explore official high-frequency series interactively. 

For long-range planning, the CER’s Canada’s Energy Future 2023 is the most important official benchmark in scope. It covers all energy commodities, all provinces and territories, explores net-zero pathways to 2050, publishes downloadable data, and provides an interactive visualization layer. Any Canada-facing forecasting product that wants credibility in strategic planning should interoperate with, not compete epistemically against, CER-style scenario framing. 

Commercial benchmark platforms
The strongest public commercial comparator for short-term forecasting is Amperon. Publicly, it positions itself around AI-driven demand and renewable forecasting, claims 40K+ weather points from four vendors, 15-day short-term forecasts that update sub-hourly, global coverage, and delivery through UI or API. It also emphasizes probabilistic short-term solar and wind products and shows explicit focus on traders, utilities, IPPs, and demand-management users. That is a meaningful benchmark for operational forecasting UX and weather-data engineering. 

Aurora Energy Research is a better comparator for medium- and long-term market intelligence. Its EOS platform is described as centralizing data, software, forecasts, and insights; it combines subscription analytics, market models, reports, and tools across power, renewables, grid, hydrogen, and storage-value use cases. Aurora’s public posture shows the value of separating operational market intelligence from strategic bankable analytics rather than collapsing them into a single “forecast chart.” 

Yes Energy is a strong benchmark for market-data integration and operating-system-like workflow design. Publicly, it emphasizes 1,400+ data sources, 18+ years of normalized data, very high update volume, explicit products for demand forecasts and modeling, and a “single foundation” that unifies data, intelligence, and execution. For this app, the lesson is not to copy U.S.-ISO functionality, but to adopt the same product principle: normalized data and decision workflows are as important as model choice. 

Academic and technical benchmark
Recent forecasting literature strongly favors benchmark-heavy, hybrid, horizon-aware design. iTransformer, TiDE, TimesNet, N-HiTS, and related families show that modern multivariate forecasting gains come from architecture choices tailored to long-horizon structure and exogenous covariates, not from generic neural complexity alone. N-HiTS especially remains attractive for long-horizon performance and speed; TiDE is attractive where covariates matter and inference latency matters; iTransformer is attractive for large multivariate setups. 

At the same time, the literature does not support abandoning benchmarks. Strong statistical or linear baselines still matter because many “advanced” models lose their edge under regime shifts, sparse data, or changed exogenous relationships. That is especially true for energy systems exposed to weather, policy, congestion, and structural breaks. 

For uncertainty, the frontier is probabilistic rather than just point forecasting. Recent work on conformal time-series forecasting, adaptive interval calibration, weighted scoring rules for extremes, and weather-informed scenario generation supports moving from simple confidence bands to calibrated quantiles, realistic scenarios, and explicit coverage tracking. 

For topology-sensitive grid tasks, graph surrogates and physics-aware methods now have a real place, but they should be applied selectively. Recent GNN work shows substantial value for operational risk assessment and fast power-flow proxies, while safe reinforcement learning is useful only when wrapped in verification/safety layers. That means the current app’s graph- and physics-informed modules are directionally right, but should remain specialized tools, not default forecasters. 

Gap analysis and opportunities
The most material gaps
The current app’s biggest gap is likely data governance, not modeling imagination. Canada’s official ecosystem already offers an authoritative public backbone for energy data and long-term scenario context. What differentiates a high-trust product is not merely ingesting those sources, but versioning them, normalizing time zones and geographies, documenting latency and revisions, and exposing provenance to users. The current app description suggests broad data ambition, but not yet a fully explicit data-contract and revision-management layer.

The second major gap is evaluation discipline. The app seems to contain baselines and advanced models, but the retrieved evidence does not show a single mandatory evaluation contract by target type and horizon. Without rolling-origin backtests, calibration tests, benchmark deltas, and regime-stratified diagnostics, the app risks shipping “interesting models” rather than reliable forecasts. Recent research on concept drift and continuous bias correction reinforces that energy forecasting quality degrades quickly when operational retraining logic lags changing conditions.

The third gap is coherence across forecast levels. Canada-facing forecasts naturally form hierarchies: national → province → balancing area/utility → feeder/asset. The public evidence for the app suggests many modules, but not clearly a reconciliation layer that guarantees consistency across rolled-up outputs. Modern hierarchical reconciliation methods remain highly relevant for energy use cases, especially where business users switch between national and local views. 

The fourth gap is uncertainty communication. An uncertainty engine exists in the current app inventory, but it is not yet clear whether users get calibrated quantiles, scenario envelopes, error decomposition, and reliability diagnostics, or merely wider bands. In energy products, uncertainty has to be operationally useful: “P10/P50/P90,” coverage history, extreme-weather lens, and decision thresholds.

The fifth gap is accessibility and trust controls. The web standard benchmark is WCAG 2.2, and a secure web-app benchmark is OWASP ASVS. For AI-enabled critical-infrastructure workflows, NIST’s AI RMF is increasingly the right governance overlay, and NIST is now explicitly developing critical-infrastructure guidance for trustworthy AI. None of that appears to be a visibly integrated part of the current product posture yet. 

Strategic opportunity areas
There is a particularly strong opportunity to make the app the Canada-native orchestration layer between official Canadian structural outlooks and high-frequency operational forecasting. In practice, that means: anchor strategic scenarios to CER / NGFS / TPI-style pathways for transition and stranded-asset analysis, while anchoring short-term operations to weather, load, renewable, and market data. NGFS provides a public scenario reference for orderly, disorderly, hot-house, and “too little, too late” pathways, and TPI provides explicit financial-transition assessment tools and sector benchmarks including electricity utilities and oil & gas. That combination would make the app unusually credible across planning and risk audiences. 

There is also a major opportunity in Canadian gas and power coupling. Recent market reporting underscores how AECO-Henry Hub differentials, LNG Canada, and pipeline/storage conditions create structural regime shifts in Western Canadian gas economics. That means any gas-basis or power-price module should be explicitly regime-aware and scenario-linked, not a single stationary time-series predictor. 

Prioritized recommendations
Recommended target architecture
The recommended target state is a four-layer system:

Official and commercial data sources

Ingestion and feature store

Horizon-specific model layer

Forecast registry and calibration layer

UX surfaces: Forecast, Drivers, Uncertainty, Scenarios, Validation

APIs / exports / alerting



Show code
The critical change is the middle two layers. The product should no longer present “models” as a flat list of algorithms. It should present outputs by forecast problem and horizon, with each problem mapped to a small, controlled model family and a mandatory validation profile. This is the single most important architectural simplification.

Data recommendations
Priority	Recommendation	Why it matters	Effort	Risk	Cost
High	Build an explicit Canada data backbone around StatCan, CCEI, CER, ECCC/weather, and province/operator feeds with source/version metadata.	Improves trust, reproducibility, and regulatory defensibility. 
Medium	Low	Medium
High	Add data contracts for timestamp granularity, timezone, revisions, units, geography, and missingness.	Energy forecasting failures are often data-alignment failures, not model failures.	Medium	Low	Medium
High	Separate “official structural data” from “operational market/weather data” in the schema.	Prevents long-horizon and short-horizon leakage/misuse. 
Medium	Low	Low
Medium	Introduce a feature store with lagged weather, holiday/calendar, policy, outage, and asset-state views.	Supports consistent offline/online inference.	Medium	Medium	Medium
Medium	Explicitly model missingness and add modern imputation tooling rather than silent filling.	Recent literature shows missing-data handling materially affects downstream forecasting reliability. 
Medium	Low	Low

Model recommendations
Use a horizon- and use-case-based ensemble, not a single “best” model family.

Forecast problem	Recommended stack	Rationale
Intraday / day-ahead utility load	Statistical baseline + LightGBM/XGBoost-style structured model + compact deep model where justified	Strong baseline discipline and exogenous weather/calendar handling usually outperform all-deep approaches operationally. 
Multi-day / multi-week multivariate forecasting	TiDE or iTransformer, benchmarked against N-HiTS and strong baselines	Good balance of speed, covariate support, and long-horizon structure. 
Long-range planning by region/sector	Scenario models reconciled to CER outlooks, with GAM/SARIMA/elastic-net style interpretable models as anchors	Strategic planning needs explainability and scenario alignment more than leaderboard performance. 
Grid-topology / dispatch surrogates	Keep physics-informed and GNN modules, but only for topology-sensitive subsystems	Research supports this selectively, not as a universal backbone. 
Renewable generation	Weather-informed probabilistic models with scenario generation	Forecast quality under renewables depends heavily on weather covariates and calibrated scenarios. 
Gas basis / price	Regime-aware hybrid model with exogenous LNG, storage, pipeline, and benchmark spread features	AECO/Henry Hub behavior is structurally non-stationary. 
Stranded-asset / transition-risk analysis	Scenario engine using NGFS + TPI-aligned sector logic, with optional CER-consistent Canada lens	Best fit for policy/transition narratives and investor-grade comparability. 

A contrarian but high-confidence recommendation: de-emphasize foundation-model hype in the core product. Time-series foundation models and AI weather models are promising, especially in low-data or transfer settings, but the highest business value here still comes from disciplined hybrid systems, calibrated probabilistic outputs, and strong baselines. Use foundation models first for upstream weather enrichment or data-sparse edge cases, not as the first-line replacement for the entire forecasting layer. 

Evaluation and retraining recommendations
The app should implement a mandatory evaluation contract by target type:

Forecast type	Minimum metrics
Point forecasts	MAE, RMSE, sMAPE or MASE, bias/mean error
Probabilistic forecasts	CRPS, pinball loss by quantile, prediction-interval coverage, interval width
Rare/extreme events	Threshold-weighted CRPS, event recall/precision, peak-hit rate
Hierarchical outputs	Coherence gap before/after reconciliation, level-wise weighted error
Operational health	Drift score, calibration drift, retraining delta, latency/SLA

This should be backed by rolling-origin backtesting, regime-stratified scorecards, and champion-challenger deployment. Concept-drift detection plus targeted adaptation is no longer optional for a product exposed to policy, weather, and infrastructure shifts. Continuous bias correction is especially important for renewables. 

For retraining and automation, the product should move to:

scheduled retraining by horizon,
event-triggered retraining on drift alarms,
shadow deployment of challengers,
calibration-only refresh where full retraining is unnecessary,
model-registry promotion gates based on backtest thresholds,
immutable provenance artifacts exposed to both operators and end users.
UX, visualization, and accessibility recommendations
The product should organize around five tabs per forecastable entity:

Forecast
Drivers
Uncertainty
Scenarios
Validation
That structure matches how advanced users actually interrogate forecasts and aligns with the strengths shown by commercial platforms and official public portals: clear charting, interactive data exploration, scenario framing, and drill-through. 

Suggested wireframe:

text
Copy
┌──────────────────────────────────────────────────────────────────────┐
│ Canada Energy Forecasting                                            │
│ Geography: Alberta  Utility: AESO-linked area  Horizon: Day-ahead   │
├──────────────────────────────────────────────────────────────────────┤
│ Forecast │ Drivers │ Uncertainty │ Scenarios │ Validation            │
├──────────────────────────────────────────────────────────────────────┤
│ Main chart: Actual vs P50 vs P10/P90                                │
│ Driver panel: temperature, demand class mix, outages, gas spread    │
│ KPI strip: bias, MAE, coverage, peak risk, last retrain             │
│ Compare: baseline | challenger | production                         │
│ Provenance: model version | data snapshot | source lineage          │
└──────────────────────────────────────────────────────────────────────┘
Accessibility should target WCAG 2.2 AA as the minimum standard. In practice, that means keyboard-complete chart interactions, sufficient contrast, focus visibility, non-color encoding of uncertainty bands and status, descriptive table alternatives for charts, and accessible authentication patterns. W3C explicitly recommends use of the current WCAG version, and WCAG 2.2 adds success criteria directly relevant to interactive modern web apps. 

Security and deployment recommendations
The current product already hints at provenance/signing concepts, which is a good start, but it should formalize security around OWASP ASVS and AI governance around NIST AI RMF. OWASP ASVS provides a practical basis for testing web-application technical security controls and secure-development requirements; NIST AI RMF is intended to improve incorporation of trustworthiness into AI design, development, use, and evaluation, and NIST is now explicitly extending this toward critical infrastructure. 

Recommended hardening items:

Priority	Control	Effort	Risk	Cost
High	ASVS-based security review, including authz, secrets, headers, SSRF/XSS/SQLi/API testing	Medium	Low	Medium
High	Signed model artifacts and dataset snapshots promoted through registry gates	Medium	Low	Medium
High	Audit trail for forecast serving, scenario runs, and manual overrides	Medium	Medium	Medium
Medium	Tenant-aware RBAC and data partitioning if the product serves multiple organizations	Medium	Medium	Medium
Medium	SLOs: p95 latency, failed inference rates, stale-data detection, calibration drift alerts	Medium	Low	Medium
Medium	AI RMF-aligned model-risk documentation for sensitive modules	Medium	Low	Low

Implementation roadmap
Phase 1: Data and evaluation hardening

Phase 2: Model architecture refactor

Phase 3: UX and trust layer

Phase 4: Scale, APIs, and enterprise governance



Show code
Recommended phased plan
Phase	Scope	Outcome	Effort	Risk	Cost
Phase 1	Data contracts, official-source normalization, benchmark suite, rolling backtests, observability basics	Makes the platform trustworthy before making it fancier	Medium	Low	Medium
Phase 2	Horizon-specific model stacks, champion/challenger registry, probabilistic calibration, hierarchical reconciliation	Largest accuracy and reliability gains	High	Medium	Medium to High
Phase 3	UX simplification, provenance panel, uncertainty redesign, accessibility remediation	Largest adoption and usability gains	Medium	Low	Medium
Phase 4	API productization, multi-tenant security controls, enterprise SLOs, cost/performance tuning	Turns platform into durable product infrastructure	High	Medium	Medium to High

Sample API schema
Forecast request

json
Copy
{
  "target": "electricity_load_mw",
  "geography": {
    "country": "CA",
    "province": "AB",
    "market_area": "AESO"
  },
  "horizon": {
    "start": "2026-07-02T00:00:00Z",
    "end": "2026-07-09T00:00:00Z",
    "resolution": "hour"
  },
  "scenario": {
    "weather": "ensemble_p50",
    "policy": "base",
    "fuel_market": "base"
  },
  "outputs": ["p10", "p50", "p90", "drivers", "provenance", "validation"]
}
Forecast response

json
Copy
{
  "series": [
    {
      "timestamp": "2026-07-02T01:00:00Z",
      "p10": 9860,
      "p50": 10210,
      "p90": 10640,
      "actual": null
    }
  ],
  "drivers": {
    "temperature_cdd_hdd": 0.41,
    "calendar_effect": 0.18,
    "industrial_activity": 0.14,
    "outage_effect": -0.05
  },
  "model": {
    "champion": "load_dayahead_tide_v3.4.2",
    "baseline": "seasonal_gam_v1.8.0",
    "trained_on": "2026-06-28",
    "data_snapshot": "ds_2026_06_28_0017",
    "calibration_window_days": 90
  },
  "validation": {
    "rolling_mae": 184.2,
    "rolling_bias": -11.7,
    "p90_coverage_30d": 0.91,
    "drift_status": "stable"
  }
}
Indicative cost framing
Because team composition and cloud profile are unspecified, the only defensible estimate is directional:

Low cost: UX simplification, benchmark dashboards, calibration plots, accessibility fixes, provenance display.
Medium cost: feature store, model registry, rolling backtesting, probabilistic metrics, drift detection, reconciliation.
High cost: full multi-tenant enterprise controls, real-time streaming architecture, custom topology-aware surrogates at national scale, broad commercial data licensing.
The key point is that the best ROI is unlikely to come from high-cost research additions. It will likely come from medium-cost reliability and governance improvements.

Open questions and source notes
The main unresolved issue is production maturity by module. The provided app inventory shows many sophisticated components, but the evidence available here does not confirm which modules are user-facing, which are experimental, what data each one actually consumes in production, or what quantitative business benchmarks they currently hit. That uncertainty matters more than any individual algorithm choice. 

A second limitation is operator-specific methodology detail. This report uses recent official Canadian sources for national/public data and outlooks, plus recent academic and commercial evidence. However, detailed internal methodologies for organizations such as IESO and AESO were not fully verifiable from primary sources retrieved in this pass, so comparisons to those bodies should be interpreted as benchmark intent rather than as a full audit of their internal forecasting stacks. 

A third limitation is commercial opacity. Amperon, Aurora Energy Research, and Yes Energy provide enough public evidence to benchmark product posture, delivery model, and strategic capabilities, but not enough to reproduce their full model architectures or pricing. Their most useful value here is as product-pattern comparators rather than transparent methodological references. 

Source map
Primary/official references used in this report include Statistics Canada Energy Statistics, the Canadian Centre for Energy Information, the Canada Energy Regulator’s Canada’s Energy Future 2023, W3C WCAG 2.2, OWASP ASVS, NIST AI RMF, NGFS climate scenarios, the Transition Pathway Initiative, FRED/EIA Henry Hub data, and the user-provided app inventory. Supporting industry and research references include Amperon, Aurora Energy Research, Yes Energy, and recent literature on multivariate forecasting, uncertainty quantification, drift adaptation, imputation, graph surrogates, and safe reinforcement learning. 


Part 2- ## Bottom line

Your original platform is broad and well-architected, but the 2025–2026 SOTA changes the priority order. The most valuable upgrade is **not** “replace everything with one foundation model.” It is:

1. **Replace the placeholder weather layer with ECCC HRDPS/RDPS ingestion.**
2. **Add conformal prediction to every forecast path.**
3. **Create a Canadian rolling-origin benchmark harness.**
4. **Run TSFMs as challenger models, then LoRA-fine-tune the winners.**
5. **Replace scalar PV GNN with a proper PyTorch Geometric STGNN / physics-informed attention GNN.**

Your current demand forecaster, scalar PV GNN, Monte Carlo uncertainty engine, and placeholder weather service are explicitly described in the platform spec, so these recommendations map directly to your codebase. 

---

# 1. Verification status of the new 2025–2026 claims

| Claim                                                                                         |                                                                                                                                                                                                                                                                                   Verification result | Use in roadmap                                                                                           |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | -------------------------------------------------------------------------------------------------------- |
| **Chronos-2 supports univariate, multivariate, and covariate-informed zero-shot forecasting** |                                                                                                                 Verified. Chronos-2 paper describes group attention and zero-shot covariate-informed forecasting, with strong results on fev-bench, GIFT-Eval, and Chronos Benchmark II. ([arXiv][1]) | **Adopt as P1 challenger** for demand + price.                                                           |
| **Moirai-2 is decoder-only, quantile-loss, trained on 36M series**                            |                                                                                                      Verified. Paper says Moirai 2.0 is decoder-only, trained on 36M series, uses quantile forecasting and multi-token prediction, and is 30× smaller / 2× faster than Moirai 1.0-Large. ([arXiv][2]) | **Adopt as P1 challenger**, not default champion.                                                        |
| **LoRA fine-tuning of TSFMs helps building-energy forecasting**                               | Verified. MERL-affiliated 2025 study reports zero-shot TSFMs are generally suboptimal, while full fine-tuning and LoRA significantly improve accuracy; LoRA reduces compute without sacrificing accuracy and fine-tuned TSFMs outperform TFT-style SOTA models in that building setting. ([arXiv][3]) | **P1/P2**, after benchmark harness.                                                                      |
| **Chronos-Bolt-Small exact 48M / 250× / 9 quantiles**                                         |                                                                                          I found secondary benchmark references to Chronos-Bolt, but not a primary indexed source verifying all three exact values in this pass. A 2026 ERCOT zero-shot benchmark includes Chronos-Bolt. ([arXiv][4]) | **Benchmark, but don’t cite those exact numbers in product claims until verified from model card/repo.** |
| **March 2026 benchmark arXiv:2602.21415**                                                     |                                                                                                                                                                   Verified. It compares PowerMamba, S-Mamba, iTransformer, PatchTST, and LSTM across six US grids; no single model wins. ([arXiv][5]) | **Use directly for model-selection logic.**                                                              |
| **EnergyPatchTST arXiv:2508.05454**                                                           |                                                                                                                                                                                  Verified. Paper claims 7–12% error reduction on common energy datasets and adds uncertainty estimation. ([arXiv][6]) | **Watch/adapt**, useful but not first P0.                                                                |
| **Copula + Context-Aware CP arXiv:2602.02583**                                                |                                                                                                                                                                                 Verified. Moradi et al. propose copula dependence + CACP for calibrated fleet-level renewable forecasts. ([arXiv][7]) | **P2** for aggregation/reconciliation.                                                                   |
| **MCD + CP for prosumer flexibility arXiv:2601.14663**                                        |                                                                                                                          Verified. Paper reports standalone MCD overestimates flexibility, while MCD-CP improves P90 compliance and can achieve up to 70% of perfect-information profit. ([arXiv][8]) | **P2** for BYOP/DR/VPP.                                                                                  |
| **PI-GN-JODE arXiv:2603.20838**                                                               |                                                                                                                                                                             Verified. Reports PR-AUC 0.991 edge failure, 0.973 node failure, R² 0.951 demand-not-served on IEEE 118-bus. ([arXiv][9]) | **P3 research-grade**, not PV-fault replacement.                                                         |
| **STGNN measured-only topology arXiv:2604.20403**                                             |                                                                                                                                                                             Verified. Reports up to +11pp F1 and 6× training-time reduction for measured-only topology on IEEE 123-bus. ([arXiv][10]) | **Best practical GNN upgrade.**                                                                          |
| **PIA-GNN DOI 10.1109/iconstem65670.2025.11374756**                                           |                                                                                                                                                                                                                                                            Not verified in accessible search results. | **Do not product-cite yet.**                                                                             |
| **IPIGN DOI 10.1109/tie.2025.3645397**                                                        |                                                                                                                                                                                                                                                            Not verified in accessible search results. | **Watch.**                                                                                               |
| **Energy Reports DOI 10.1016/j.egyr.2025.12.057**                                             |                                                                                                                                                                                                                                                            Not verified in accessible search results. | **Do not rely on it yet.**                                                                               |
| **ECCC HRDPS 2.5 km, 48h, 4 runs/day, AMQP access**                                           |                                                                                                                                          Verified. ECCC MSC docs state HRDPS is 2.5 km over pan-Canada, four runs/day, 48h forecasts, and can be retrieved via AMQP/HTTPS. ([eccc-msc.github.io][11]) | **P0 implementation.**                                                                                   |
| **ECCC RDPS 10 km, 84h**                                                                      |                                                                                                                                                                                          Verified. ECCC MSC docs state RDPS has 10 km coverage and forecast hours 000–084. ([eccc-msc.github.io][12]) | **P0/P1 implementation.**                                                                                |
| **HRDPS v7.1.0 / PROGNOS v1.0.0 April 14 2026**                                               |                                                                                                                                                                                                                                                            Not verified in accessible search results. | Use generic HRDPS/RDPS documentation until release notes are located.                                    |

---

# 2. A — Time Series Foundation Models

## A1. Can Chronos-Bolt-Small or Moirai-2-Small replace seasonal decomposition + linear regression?

**Not directly as the production champion. Yes as a mandatory challenger.**

Your current Ontario demand model is transparent and operationally cheap: weekly SMA-168 decomposition, hour/day/month seasonality, optional HDD/CDD temperature regression, residual smoothing, and baseline comparisons. It is not SOTA, but it is defensible and explainable. A zero-shot TSFM can outperform it on some horizons, but it can also fail silently under Canadian regime shifts: polar vortex events, holidays, industrial shutdowns, COVID-like disruptions, electrification shifts, and market-rule changes.

The strongest directly relevant evidence is the 2026 ERCOT load benchmark: Chronos-Bolt, Chronos-2, Moirai-2, and TinyTimeMixer achieved MASE near **0.31** at 2048-hour context for day-ahead load, a **47% reduction versus seasonal naive**; however, calibration varied sharply, with Chronos-2 showing 95% empirical coverage at 90% nominal while Moirai-2 and Prophet were overconfident at roughly 70% coverage. ([arXiv][4])

**Recommendation:** keep your current seasonal decomposition model as `baseline_v2`, add `tsfm_zero_shot_challenger_v1`, and promote only if it wins on Canadian rolling-origin backtests.

**Code mapping**

| File                          | Change                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/lib/demandForecaster.ts` | Keep current model as explainable baseline.                                                     |
| `training/tsfm_benchmarks/`   | New Python benchmark harness for Chronos-2, Chronos-Bolt, Moirai-2, TTM.                        |
| `src/lib/mlForecasting.ts`    | Add model registry entries and champion/challenger metadata.                                    |
| `src/lib/modelWeights/`       | Do **not** commit full TSFM weights; commit benchmark manifests and LoRA adapter metadata only. |

---

## A2. Can Chronos-2 replace the entire demand pipeline?

**It can replace a large part of the model pipeline, but not the data-quality, baseline, calibration, or provenance pipeline.**

Chronos-2 is the most strategically relevant TSFM in your list because it supports univariate, multivariate, and covariate-informed forecasting via group attention. That means it can model IESO load, temperature, calendar, and related series together in zero-shot mode. ([arXiv][1])

But “replace the entire pipeline” would be a mistake. You still need:

* data quality checks,
* calendar/weather feature generation,
* rolling-origin evaluation,
* conformal calibration,
* baseline comparison,
* explainability/provenance,
* drift monitoring,
* regulatory claim boundaries.

**Recommendation:** Chronos-2 should become your **default TSFM challenger** once HRDPS/RDPS features are available.

---

## A3. Does LoRA fine-tuning outperform zero-shot TSFM and from-scratch DL?

**Likely yes, but you need to verify on Canadian data.**

The MERL building-energy study is highly relevant because it reports that zero-shot TSFMs are generally suboptimal, while LoRA and full fine-tuning significantly improve forecasting accuracy; LoRA substantially reduces compute without sacrificing accuracy and fine-tuned TSFMs outperform TFT-style deep forecasting models in that building-energy setting. ([arXiv][3])

For your platform, the expected ranking after proper Canadian benchmarking is likely:

**LoRA-fine-tuned TSFM ≥ Chronos-2 zero-shot ≈ TinyTimeMixer few-shot ≥ PatchTST/iTransformer from scratch ≥ seasonal decomposition baseline**

But that is a hypothesis, not a claim. Canadian system load has strong weather/holiday/electrification structure; the winner will depend on covariate availability.

**Practical target:** if current seasonal decomposition MAPE is, for example, 3–6% day-ahead, a credible LoRA/Chronos-2 target is **2–4% MAPE** for normal days and better calibrated intervals. Do not promise this until measured.

---

## A4. CPU latency on Supabase Edge vs Modal T4

**Supabase Edge Functions are the wrong place to run PyTorch TSFMs.**

Supabase Edge uses a Deno-style serverless runtime; running Python/PyTorch TSFMs directly there is not realistic. Use Supabase Edge for orchestration and metadata, not inference.

| Deployment mode                | Recommendation                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Supabase Edge Function         | Use only for request routing, cache lookup, metadata, and small TypeScript baselines. |
| GitHub Actions scheduled batch | Best zero-cost path for day-ahead/hour-ahead precomputed forecasts.                   |
| Modal.com T4                   | Best for TSFM inference, LoRA fine-tuning, and batch challenger evaluation.           |
| ONNX/WASM CPU                  | Worth testing only for TinyTimeMixer or very small Chronos-Bolt-style models.         |

**Implementation pattern**

`Supabase Edge → check forecast_cache → if stale, call Modal endpoint → store p10/p50/p90 + metadata → frontend reads cached result.`

---

## A5. Can TSFM quantiles replace Box-Muller Monte Carlo?

**Partially.**

TSFM quantiles can replace your Box-Muller Monte Carlo for **forecast interval generation** where the target is direct predictive uncertainty. They should not replace Monte Carlo for:

* scenario uncertainty,
* policy uncertainty,
* fuel price uncertainty,
* sensitivity analysis,
* resilience stress testing,
* tail-risk simulation.

Moirai-2 uses quantile forecasting; Chronos-family models are probabilistic; the ERCOT benchmark shows calibration varies by model, so quantiles still need conformal wrapping. ([arXiv][2])

**Recommendation:** replace “Box-Muller = uncertainty” with a layered uncertainty stack:

1. TSFM/quantile model outputs: P10/P50/P90.
2. Conformal calibration: finite-sample coverage correction.
3. Monte Carlo: scenario/sensitivity/stress testing.
4. Sobol/Morris: sensitivity attribution.

---

## A6. Energy-specific TSFMs

There is emerging energy-specific work, but I would not anchor the product on a niche energy TSFM yet. EnergyPatchTST claims 7–12% error reduction on common energy datasets and adds future-known variables plus uncertainty estimation, but it is not yet as broadly validated as Chronos-2/Moirai/TTM. ([arXiv][6])

**Best practical benchmark set**

| Model                   | Role                                                 |
| ----------------------- | ---------------------------------------------------- |
| Chronos-2               | Best covariate-aware TSFM challenger.                |
| Chronos-Bolt            | Fast zero-shot challenger; verify model-card claims. |
| Moirai-2                | Compact quantile TSFM challenger.                    |
| TinyTimeMixer / IBM TTM | Best edge/CPU candidate.                             |
| EnergyPatchTST          | Energy-specific research challenger.                 |
| iTransformer            | Strong supervised covariate model.                   |
| PatchTST                | Strong rhythmic/univariate baseline.                 |
| PowerMamba/S-Mamba      | Strong chaotic price/wind candidate.                 |

---

# 3. B — SSMs vs Transformers

The March 2026 benchmark is unusually useful because it avoids the false “one model wins” framing. It shows model choice depends on data environment and target type. ([arXiv][5])

| Forecast task                    | Preferred architecture                              | Reason                                                                                                                                                          |
| -------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Load only, no weather            | **PatchTST or SSMs**                                | Benchmark reports PatchTST and state-space models perform best with historical load only. ([arXiv][5])                                                          |
| Load + HRDPS/RDPS weather        | **iTransformer**                                    | Benchmark reports iTransformer improves 3× more efficiently than PatchTST when weather covariates are added, due to cross-variate mixing. ([arXiv][5])          |
| Price forecasting                | **PowerMamba/S-Mamba + gradient boosting ensemble** | Benchmark says SSMs are better suited to chaotic wind/price fluctuations. ([arXiv][5])                                                                          |
| Solar forecasting                | **PatchTST / EnergyPatchTST**                       | Benchmark says PatchTST excels on rhythmic solar-like signals; EnergyPatchTST is designed for energy forecasting and claims 7–12% error reduction. ([arXiv][5]) |
| Wind forecasting                 | **SSM + NWP features**                              | Wind is less rhythmic and more chaotic; PowerMamba-style SSMs are plausible. ([arXiv][13])                                                                      |
| Safety-critical reserve planning | **S-Mamba plus asymmetric metrics**                 | S-Mamba paper reports lower 99.5th-percentile reserve margin proxy than iTransformer in a CAISO benchmark. ([arXiv][14])                                        |

**Recommended architecture decision tree**

```text
No weather/covariates?
  → PatchTST + seasonal baseline + Chronos/Moirai zero-shot

Weather/covariates available?
  → iTransformer + Chronos-2 + LightGBM/XGBoost

Chaotic price/wind?
  → PowerMamba/S-Mamba + conformal intervals

Rhythmic solar?
  → PatchTST/EnergyPatchTST + NWP irradiance/cloud variables

Need fast CPU?
  → TinyTimeMixer / small TSFM / LightGBM
```

---

# 4. C — Conformal Prediction

## C1. Can ACI replace split-half ESS Monte Carlo?

**Yes for forecast interval calibration. No for scenario simulation.**

Your current split-half ESS diagnostic tells you whether Monte Carlo samples have stabilized. It does not guarantee that the forecast interval covers future observations at the requested rate. Conformal prediction is better suited for operational forecast intervals because it calibrates errors on held-out or rolling calibration windows.

CQR has finite-sample coverage guarantees under exchangeability and adapts to heteroscedasticity by combining quantile regression with conformal calibration. ([arXiv][15])

I could not verify the exact Nature Scientific Reports April 2026 PV claim with 90.96% coverage in accessible search results. Treat that number as unverified until the paper is located. The broader conclusion—adaptive/context-aware conformal methods are now operationally important—is well supported. ([arXiv][16])

---

## C2. Should you wrap existing point forecasts with CQR?

**Yes. This is a Phase 0 quick win.**

For your current seasonal demand forecaster, gas basis regression, utility load forecast, and GA/ICI predictor:

1. Keep point forecast.
2. Store rolling residuals by horizon, season, hour, and temperature regime.
3. Compute nonconformity scores.
4. Output calibrated P10/P50/P90 or 80/90/95% intervals.
5. Track realized coverage.

**Code mapping**

| File                           | Change                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| `src/lib/uncertaintyEngine.ts` | Add `conformalInterval()` and `conformalizedQuantileRegression()` paths.            |
| `src/lib/demandForecaster.ts`  | Add rolling residual calibration by horizon/hour/month/weather regime.              |
| `src/lib/forecastBaselines.ts` | Store baseline residual distributions.                                              |
| `src/lib/mlForecasting.ts`     | Add `coverage_30d`, `coverage_90d`, `interval_width`, `pinball_loss`, `CRPS_proxy`. |

---

## C3. Copula + CACP for fleet/provincial aggregation

**Use later, after substation/feeder forecasts exist.**

Moradi et al. propose copula-based dependence modeling plus Context-Aware Conformal Prediction to turn heterogeneous site-level renewable forecasts into calibrated fleet-level forecasts. This is directly relevant if you aggregate feeder/substation/municipal renewable forecasts into provincial outputs. ([arXiv][7])

**Recommendation:** P2 for DER, solar, wind, and EV aggregation; not needed for your first demand-forecast upgrade.

---

## C4. CP vs Monte Carlo cost on Supabase Edge

CP is much cheaper. Monte Carlo scales with sample count; conformal inference is essentially quantile lookup over calibration residuals plus a few arithmetic operations.

| Method                            |                         Runtime cost | Supabase Edge suitability |
| --------------------------------- | -----------------------------------: | ------------------------- |
| Split conformal residual interval |                             Very low | Excellent                 |
| CQR interval                      | Low at inference; training elsewhere | Excellent                 |
| ACI rolling update                |                                  Low | Excellent                 |
| Monte Carlo 1,000 samples         |                          Medium/high | Use batch/worker          |
| MCD + CP                          |   High if dropout inference repeated | Modal/GPU or batch only   |

---

## C5. Is CP regulatory-grade?

**It can be, if documented correctly.**

CP is attractive for OEB/AER/CER-style filings because it gives auditable coverage targets, realized coverage diagnostics, calibration windows, and finite-sample logic. But it is not automatically “regulatory-grade.” You need:

* named calibration window,
* coverage level,
* exception rules,
* drift handling,
* recalibration schedule,
* realized interval performance,
* explanation of exchangeability limitations.

---

## C6. CP for battery storage trading and flexibility aggregation

**Adopt for simulations, not just forecasts.**

The 2025 electricity-price CP paper evaluates Ensemble Batch Prediction Intervals and Sequential Predictive Conformal Inference for day-ahead/balancing electricity prices and tests them in battery trading, reporting improved financial returns. ([arXiv][17])

The 2026 MCD+CP prosumer flexibility paper is very relevant to your BYOP / demand-response roadmap: standalone MCD overestimated flexibility and violated P90 compliance, while MCD-CP gave calibrated intervals and achieved up to 70% of perfect-information profit. ([arXiv][8])

---

# 5. D — Physics-informed GNN advances

Your current PV scalar GNN has a gate of **F1 ≥ 0.32** and **top-3 localization ≥ 0.52**. That is too weak for commercial fault-localization claims. It can remain “advisory,” but it should not be positioned as validated operational localization.

## Recommended replacement path

| Candidate                       |          Adopt? | Reason                                                                                                                       |
| ------------------------------- | --------------: | ---------------------------------------------------------------------------------------------------------------------------- |
| **STGNN with GraphSAGE/GATv2**  |     **Yes, P1** | Verified 2026 paper reports up to +11pp F1 and 6× faster training from measured-only topology on IEEE 123-bus. ([arXiv][10]) |
| **GATv2**                       |             Yes | GATv2 fixes static-attention limitations in original GAT and is more expressive. ([arXiv][18])                               |
| **PI-GN-JODE**                  |        Watch/P3 | Excellent cascading-failure research result, but it targets cascade progression, not PV fault localization. ([arXiv][9])     |
| **PIA-GNN 98.99%**              | Do not cite yet | DOI not verified in accessible search results.                                                                               |
| **IPIGN**                       |           Watch | DOI not verified in accessible search results.                                                                               |
| **GNN + UQ Energy Reports DOI** |           Watch | DOI not verified in accessible search results.                                                                               |

## Practical upgrade target

Current: scalar message passing, synthetic pvlib+pandapower data, F1 gate 0.32.

Target:

* PyTorch Geometric GraphSAGE/GATv2.
* Temporal window input: last 12–48 intervals.
* Measured-only graph mode.
* Physics features: voltage residual, current residual, irradiance-normalized output, inverter status, thermal proxy, topology distance.
* Conformal classification sets or temperature scaling for uncertainty.
* Domain-randomized synthetic training plus small real fault validation if possible.

**Expected impact:** it is reasonable to target **F1 0.55–0.75** on synthetic/held-out feeders before making stronger product claims. Do not claim 98–99% unless reproduced on your own feeder topology and sensor regime.

---

# 6. E — EV charging load forecasting SOTA

The specific CADGN, TriCast, and MOGNN-EC claims were not verified in accessible search results. The broader direction—spatiotemporal graph forecasting with weather, traffic, station topology, price, and land-use features—is verified and operationally sound.

A 2025 EV charging paper proposes a spatiotemporal GCN framework using traffic flows, weather, and proprietary charging data; it finds mid-horizon 3-hour forecasts offer a good responsiveness/stability tradeoff and that temporal CNN variants performed strongly. ([arXiv][19])

**Recommended MVP model stack**

| Layer               | Model                                                            |
| ------------------- | ---------------------------------------------------------------- |
| Baseline            | Seasonal naive by station / region / hour                        |
| Structured model    | LightGBM/XGBoost with calendar, weather, price, charger metadata |
| Graph model         | STGCN / Graph WaveNet / GraphSAGE temporal                       |
| Probabilistic layer | CQR / ACI                                                        |
| Scenario layer      | EV adoption, charger rollout, TOU tariff, fleet electrification  |

**Canadian data strategy**

* Start with municipal/public charger datasets where available.
* Add OpenChargeMap / PlugShare-like public metadata only where licensing permits.
* Use HRDPS/RDPS weather.
* Use TOU rates / AESO / IESO price proxies.
* For Alberta municipalities, model depot charging and winter derating explicitly.

**Priority:** P1 if you want top-3 positioning in Canada; P2 if current focus remains utility/market analytics.

---

# 7. F — Canadian NWP integration

This is the clearest **P0** upgrade.

Your current `weatherService.ts` is described as a placeholder using Environment Canada observations and provincial-capital coordinates. Replacing that with HRDPS/RDPS forecast grids will improve demand, renewable, gas, resilience, and peak forecasting simultaneously. 

## F1. HRDPS as primary weather source

Yes. ECCC documents HRDPS as a 2.5 km pan-Canadian limited-area forecast system with four runs per day and 48-hour forecasts. It specifically highlights value for detailed surface temperature/wind, winter transitions, complex terrain, shore effects, and hydrological contexts. ([eccc-msc.github.io][11])

## F2. RDPS as broader context

Yes. ECCC documents RDPS as a 10 km North American forecast system with forecast hours 000–084. This is useful for 3.5-day load, wind, gas-basis, and continental weather-regime features. ([eccc-msc.github.io][12])

## F3. Ingestion architecture

ECCC’s MSC Datamart supports HTTPS raw data access and AMQP notifications for automatic retrieval as soon as products become available. It states AMQP is the recommended method for timely retrieval and supports filtering product sets. ([eccc-msc.github.io][20])

**Zero-cost architecture**

```text
GitHub Actions cron / AMQP poller
  → fetch HRDPS/RDPS GRIB2 subset
  → extract nearest-grid / regional aggregates
  → store compact features in Supabase
  → forecasting models consume weather_features table
```

Use GeoMet for lightweight web/API access and Datamart for raw operational ingestion. MSC GeoMet provides free anonymous access via interoperable APIs, including WMS, OGC API, WCS, and STAC-style access. ([eccc-msc.github.io][21])

## F4. Weather variables by forecast type

| Forecast target | HRDPS/RDPS variables/features                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Demand/load     | 2m temperature, apparent temperature if available, humidity/specific humidity, wind speed, heating degree hours, cooling degree hours, lagged temperature, min/max temperature, precipitation type, storm indicators |
| GA/ICI 5CP      | temperature, humidex/heat stress proxy, cloud cover, wind, prior-day heat accumulation, holiday/business-day flag                                                                                                    |
| Solar           | downwelling shortwave radiation, cloud cover, temperature, snow cover/albedo proxy, precipitation, wind for panel cooling                                                                                            |
| Wind            | 10m wind, 80/100m wind if available or vertical interpolation, gust, pressure gradient, stability proxies                                                                                                            |
| Price spikes    | temperature extremes, wind/solar forecast errors, storm/ice indicators, load residual                                                                                                                                |
| Gas basis       | Alberta/BC/US Midwest temperature anomalies, HDD/CDD, storage proxy, pipeline constraint flags                                                                                                                       |
| Resilience      | precipitation, freezing rain proxy, wind gusts, snow/ice risk, extreme heat, wildfire weather proxies                                                                                                                |

---

# 8. G — Additions to the top-3 gap table

| Capability                                | Current Rating (1-5) | Target Rating for Top 3 (1-5) | Gap Description                                                                                                                                                                                 | What’s Needed to Close Gap                                                                                                                                                                                                                                                                                                  | Effort (L/M/H) | Priority (P0/P1/P2) |
| ----------------------------------------- | -------------------: | ----------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------- |
| **Time Series Foundation Model adoption** |              **1.5** |                       **4.5** | Current platform uses seasonal decomposition, hand-rolled TS ML, and PyTorch custom models, but no TSFM benchmark, no zero-shot challenger, no LoRA adapters, and no TSFM latency/cost profile. | Add `training/tsfm_benchmarks/`; benchmark Chronos-2, Chronos-Bolt, Moirai-2, TinyTimeMixer, TimesFM, EnergyPatchTST; use rolling-origin Canadian backtests; add conformal calibration; fine-tune LoRA adapters on IESO/AESO; store `training_data_profile`, `evaluation_summary`, `calibration_status`, and `claim_label`. | M              | **P1**              |
| **Free Canadian NWP integration**         |              **1.5** |                       **5.0** | Weather integration is placeholder-level and provincial-capital based; no HRDPS/RDPS gridded forecast ingestion; no weather feature store; no forecast-hour/version provenance.                 | Implement HRDPS 2.5 km 48h and RDPS 10 km 84h ingestion via MSC Datamart/GeoMet; build `weather_features` table; add GitHub Actions ingestion; create nearest-grid and regional aggregate extractors; feed weather features to demand, solar, wind, price, GA/ICI, gas basis, and resilience models.                        | M              | **P0**              |

---

# 9. Prioritized implementation plan

## Phase 0 — under 1 week

| Task                                                     | Files                                                                                         |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Add conformal intervals to existing forecasts            | `src/lib/uncertaintyEngine.ts`, `src/lib/demandForecaster.ts`, `src/lib/forecastBaselines.ts` |
| Add coverage metrics to metadata                         | `src/lib/mlForecasting.ts`                                                                    |
| Add benchmark result schema                              | `src/lib/mlForecasting.ts`, Supabase tables                                                   |
| Mark scalar PV GNN output as advisory unless F1 improves | `src/lib/modelInference.ts`, `src/lib/advancedForecasting.ts`                                 |

## Phase 1 — 1–4 weeks

| Task                                       | Files                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| HRDPS/RDPS ingestion                       | `src/lib/weatherService.ts`, new `scripts/ingest_hrdps.py`, GitHub Actions |
| TSFM benchmark harness                     | new `training/tsfm_benchmarks/`                                            |
| Chronos-2 / Moirai-2 / TTM challenger runs | `training/tsfm_benchmarks/`, `src/lib/mlForecasting.ts`                    |
| Weather-feature engineering                | new `src/lib/weatherFeatures.ts`                                           |

## Phase 2 — 1–3 months

| Task                                                | Files                                                 |
| --------------------------------------------------- | ----------------------------------------------------- |
| LoRA fine-tuning                                    | `training/tsfm_finetune/`                             |
| iTransformer / PatchTST / S-Mamba supervised models | `training/load_forecasting/`                          |
| Replace scalar PV GNN with STGNN GraphSAGE/GATv2    | `training/pv_fault_gnn/`, `src/lib/modelInference.ts` |
| Add EV charging MVP                                 | new `src/lib/evChargingForecast.ts`                   |

## Phase 3 — 3–12 months

| Task                                      | Files                                                           |
| ----------------------------------------- | --------------------------------------------------------------- |
| Copula + CACP aggregation                 | `src/lib/uncertaintyEngine.ts`, `src/lib/utilityForecasting.ts` |
| PI-GN-JODE cascade research prototype     | new `training/cascading_failure_gnn/`                           |
| Battery storage trading with CP intervals | new `src/lib/storageArbitrage.ts`                               |
| Prosumer flexibility MCD+CP               | extend BYOP simulation                                          |

---

# 10. Final adoption decisions

| Area                              | Decision                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Chronos-Bolt / Moirai-2 zero-shot | **Adopt as challengers, not replacements.**                                                               |
| Chronos-2 covariate mode          | **Adopt as main TSFM challenger.**                                                                        |
| LoRA fine-tuning                  | **Adopt after benchmark harness. High upside.**                                                           |
| Supabase Edge TSFM inference      | **Skip for PyTorch. Use Modal or batch cache.**                                                           |
| TSFM quantiles                    | **Use, but conformalize.**                                                                                |
| PatchTST vs SSM                   | **PatchTST for rhythmic/no-weather; SSMs for price/wind; iTransformer when HRDPS/RDPS covariates exist.** |
| Conformal prediction              | **P0. Add everywhere.**                                                                                   |
| Monte Carlo engine                | **Keep for scenario analysis, not primary forecast intervals.**                                           |
| Scalar PV GNN                     | **Replace with STGNN GraphSAGE/GATv2.**                                                                   |
| PIA-GNN/IPIGN DOI claims          | **Do not cite in product until independently verified.**                                                  |
| EV charging forecasting           | **Add as P1/P2 new capability.**                                                                          |
| HRDPS/RDPS                        | **P0. This is the best Canada-specific upgrade.**                                                         |

[1]: https://arxiv.org/abs/2510.15821?utm_source=chatgpt.com "Chronos-2: From Univariate to Universal Forecasting"
[2]: https://arxiv.org/abs/2511.11698?utm_source=chatgpt.com "Moirai 2.0: When Less Is More for Time Series Forecasting"
[3]: https://arxiv.org/abs/2506.00630?utm_source=chatgpt.com "Probabilistic Forecasting for Building Energy Systems using Time-Series Foundation Models"
[4]: https://arxiv.org/abs/2602.10848?utm_source=chatgpt.com "Time Series Foundation Models for Energy Load Forecasting on Consumer Hardware: A Multi-Dimensional Zero-Shot Benchmark"
[5]: https://arxiv.org/abs/2602.21415?utm_source=chatgpt.com "Benchmarking State Space Models, Transformers, and Recurrent Networks for US Grid Forecasting"
[6]: https://arxiv.org/abs/2508.05454?utm_source=chatgpt.com "EnergyPatchTST: Multi-scale Time Series Transformers with Uncertainty Estimation for Energy Forecasting"
[7]: https://arxiv.org/abs/2602.02583?utm_source=chatgpt.com "Copula-Based Aggregation and Context-Aware Conformal Prediction for Reliable Renewable Energy Forecasting"
[8]: https://arxiv.org/abs/2601.14663?utm_source=chatgpt.com "Calibrated uncertainty quantification for prosumer flexibility aggregation in ancillary service markets"
[9]: https://arxiv.org/abs/2603.20838?utm_source=chatgpt.com "Physics-Informed Graph Neural Jump ODEs for Cascading Failure Prediction in Power Grids"
[10]: https://arxiv.org/abs/2604.20403?utm_source=chatgpt.com "Robustness of Spatio-temporal Graph Neural Networks for Fault Location in Partially Observable Distribution Grids"
[11]: https://eccc-msc.github.io/open-data/msc-data/nwp_hrdps/readme_hrdps-datamart_en/ "Readme hrdps datamart en - MSC Open Data / Données ouvertes du SMC"
[12]: https://eccc-msc.github.io/open-data/msc-data/nwp_rdps/readme_rdps-datamart_en/ "Readme rdps datamart en - MSC Open Data / Données ouvertes du SMC"
[13]: https://arxiv.org/abs/2412.06112?utm_source=chatgpt.com "PowerMamba: A Deep State Space Model and Comprehensive Benchmark for Time Series Prediction in Electric Power Systems"
[14]: https://arxiv.org/abs/2601.01410?utm_source=chatgpt.com "Reliable Grid Forecasting: State Space Models for Safety-Critical Energy Systems"
[15]: https://arxiv.org/abs/1905.03222?utm_source=chatgpt.com "Conformalized Quantile Regression"
[16]: https://arxiv.org/abs/2510.15780?utm_source=chatgpt.com "Enhanced Renewable Energy Forecasting using Context-Aware Conformal Prediction"
[17]: https://arxiv.org/abs/2502.04935?utm_source=chatgpt.com "Conformal Prediction for Electricity Price Forecasting in the Day-Ahead and Real-Time Balancing Market"
[18]: https://arxiv.org/abs/2105.14491?utm_source=chatgpt.com "How Attentive are Graph Attention Networks?"
[19]: https://arxiv.org/abs/2510.09048?utm_source=chatgpt.com "Spatio-Temporal Graph Convolutional Networks for EV Charging Demand Forecasting Using Real-World Multi-Modal Data Integration"
[20]: https://eccc-msc.github.io/open-data/msc-datamart/readme_en/ "MSC Datamart /Datamart du SMC - MSC Open Data / Données ouvertes du SMC"
[21]: https://eccc-msc.github.io/open-data/msc-geomet/readme_en/ "MSC GeoMet /GeoMet du SMC - MSC Open Data / Données ouvertes du SMC"
