You are a world-class energy systems ML engineer and quantitative forecasting scientist specializing in operational electricity market prediction, grid reliability analytics, and renewable energy forecasting systems. I need an exhaustive, evidence-backed gap analysis of our Canada Energy Dashboard prediction platform against global SOTA.

## CONTEXT: What Our Platform Already Does

Our platform (Canada Energy Intelligence Platform) is a production-deployed web application for Canadian energy analytics covering Ontario, Alberta, and all 13 provinces/territories. Here is the COMPLETE technology stack across 14 prediction capabilities:

### Demand Forecasting:
- **Seasonal Decomposition + Linear Regression** — Ontario IESO demand forecasting using SMA-168 weekly cycle trend extraction, hourly (24-profile), day-of-week (7-profile), and monthly (12-profile) seasonality, with optional temperature regression (HDD/CDD breakpoint) and exponential smoothing residual correction. Metrics: MAE, MAPE, RMSE, skill score vs persistence and seasonal naive baselines. Trained on 175K IESO records. (`src/lib/demandForecaster.ts`)
- **Forecast Baselines** — Persistence forecast (current value projected forward) and seasonal naive (same hour last week, 168h period) with MAE/MAPE/RMSE comparison and bootstrap confidence intervals. (`src/lib/forecastBaselines.ts`)

### ML Forecasting (Hand-Rolled in TypeScript):
- **SVM-RFE Feature Selection** — Linear margin SVM with hinge loss, L2 regularization (lr=0.02, epochs=140, λ=0.01), recursive feature elimination with low-signal gate (score ≤ 0.015), Pearson correlation ranking. (`src/lib/advancedForecasting.ts`)
- **KMeans-SMOTE** — K-Means clustering (k=auto, 12 iterations) of minority class, synthetic sample generation within clusters, class balance reporting with lineage tracking. (`src/lib/advancedForecasting.ts`)
- **Random Forest Price Spike Predictor** — Bagged decision stumps (depth-1 trees) with majority vote, Gini impurity splitting, AUC computation, 5-bin calibration reliability with ECE, calibration status (calibrated/drifting/uncalibrated), claim label (estimated/advisory/validated). Threshold: 1000 CAD/MWh spike. (`src/lib/advancedForecasting.ts`)
- **Gas Basis Spread Forecast** — Linear regression (OLS closed-form) for AECO vs Henry Hub basis spread with 7 features (AECO price, Henry Hub price, pipeline curtailment %, storage deficit %, temperature, basis lag-1, basis lag-7), feature selection by absolute weight, backtest with directional accuracy and residual bias. Synthetic training corpus with 4 archetypes × 12 jittered rows. (`src/lib/advancedForecasting.ts`)
- **Policy Overlay Risk** — Stranded asset scoring combining policy deadline pressure, carbon price exposure (normalized by emissions intensity), CCUS optionality gap, and electrification readiness gap. Weighted average → risk score 0-1. (`src/lib/advancedForecasting.ts`)

### Physics-Informed and Grid Reliability:
- **Physics-Informed Dispatch MLP (PINN)** — 7-input-feature MLP (load, temperature, wind generation, solar generation, reserve margin %, ramp limit, previous dispatch) trained in PyTorch on 5,000 pandapower DC-OPF Latin-hypercube scenarios on IEEE-30 topology. Physics loss = capacity² + reserve² + ramp² penalties. Production artifact gate: scenario_count ≥ 5000, MAPE ≤ 5%, physics_violation_rate ≤ 10%. Seed 42, byte-identical rebuilds. Exported as JSON weights with manifest (SHA, simulator config, metrics). Runtime: forward pass in TypeScript with standardization and safety clamps. Heuristic fallback when weights missing or feature flag disabled. (`training/dispatch_pinn/`, `src/lib/modelInference.ts`, `src/lib/advancedForecasting.ts`)
- **PV Fault Scalar GNN** — Graph neural network for photovoltaic fault localization trained in PyTorch on 20,000 pvlib + pandapower synthetic faults over mv_oberrhein topology. 5 fault classes: healthy_cluster, inverter_trip, soiling_cluster, hot_spot_derating, localized_short_circuit. Node features: 5 (output delta ratio, voltage penalty, thermal penalty, irradiance penalty, offline flag). Scalar message passing with edge weights, class thresholds (ordered), top-3 suspect localization. Production artifact gate: F1 ≥ 0.32, top3_localization_accuracy ≥ 0.52, validation_loss ≤ 0.09. Exported as JSON with node projection layer, edge weights, class thresholds. (`training/pv_fault_gnn/`, `src/lib/modelInference.ts`, `src/lib/advancedForecasting.ts`)
- **SCED Screening** — Security-constrained dispatch screening with binding-constraint detection (reserve margin, frequency deviation, transmission overload, offline capacity, dispatch violation), overloaded edge detection (≥90% limit), infeasible-action rejection (capacity/ramp/reserve limits), and feasible recommendation selection. Risk score → system status (stable/stressed/critical). (`src/lib/advancedForecasting.ts`)
- **Weak-Grid Screening** — Fixture-based weak-grid corridor screening with short-circuit level analysis, inverter penetration assessment, reserve margin checking, and topology-based N-1 contingency screening. Fixtures for Pincher Creek, Fort Macleod, and other Alberta corridors. (`src/lib/weakGridFixtures.ts`)
- **BYOP Multi-Agent Simulation** — Bring-Your-Own-Power multi-agent simulation with facility load, battery storage (SOC tracking, charge/discharge), onsite generation, and utility policy interactions. 24-hour horizon with price signal response, peak import calculation, grid reduction, and policy sensitivity scoring. (`src/lib/advancedForecasting.ts`)

### Probabilistic and Uncertainty:
- **Monte Carlo Uncertainty Engine** — 5 distribution types (uniform, normal with Box-Muller and ±3σ clamp, lognormal, triangular, constant), P5/P10/P25/P50/P75/P90/P95 quantile computation, Pearson skewness, excess kurtosis, effective sample size via split-half variance convergence diagnostic. Configurable sample count (default 500, ≥1000 for publication), async concurrency (default 20). (`src/lib/uncertaintyEngine.ts`)
- **Sensitivity Analysis Engine** — Local one-at-a-time (finite difference ±δ), Morris method global sensitivity (elementary effects, μ*, σ for interaction detection), tornado chart sorting by swing magnitude. Parameters with bounds, units, and categories. (`src/lib/sensitivityEngine.ts`)

### Peak Demand and Capacity Prediction:
- **GA/ICI 5CP Predictor** — Ontario Global-Adjustment Industrial Conservation Initiative top-5 coincident peak prediction. Parses IESO PeakTracker HTML/CSV/pipe-table data, identifies candidate peak hours, computes estimated peak demand factor, generates watchlist with action labels (watch/curtail_if_operationally_safe/history_only). Historical backtest with candidate capture rate, missed peak analysis, and false positive tracking. Commercial commitment evidence integration. (`src/lib/gaIciPeakPredictor.ts`)
- **Utility Load Forecasting** — 8760-hour profile generation, scenario matrix (low/base/high growth cases), yearly forecast with peak demand, annual energy, customer count, growth rate, scenario delta, utilization %, weather factor. Geography allocation (system/substation/feeder), reliability proxy (SAIDI/SAIFI scores, horizon reliability bands), hosting capacity warnings with DER projection. Stress test modes: polar_vortex, heat_wave, ice_storm. Provenance metadata with assumption pack versioning. (`src/lib/utilityForecasting.ts`)

### Asset Health:
- **Asset Health Index Scoring** — CBRM-lite (Condition-Based Risk Management) methodology for utility distribution assets. Health Index (0-100): Age Factor (30%), Loading Factor (25%), Maintenance Factor (25%), Environment Factor (20%). Risk Priority = Probability of Failure × Consequence of Failure. Supports 14 asset types (transformers, poles, cables, conductors, switchgear, reclosers, capacitor banks, voltage regulators, meters, protection relays). No SCADA dependency — works from nameplate, maintenance, load, and environmental data. References OEB Appendix 2-AB, IEEE C57.104-2019, IEC 60076. (`src/lib/assetHealthScoring.ts`)
- **Resilience Scoring** — Climate hazard risk assessment (flooding, wildfire, hurricane, sea level rise, extreme heat, drought, landslide, erosion) for 8 critical infrastructure asset types. Chebyshev IPA fusion method. Overall score, hazard breakdown, risk level, limiting factor identification. (`src/lib/resilienceScoring.ts`)

### Data Sources:
- **AESO (Alberta Electric System Operator)** — Pool price, RRO rates, demand data, supply mix via `api.aeso.ca/report/v1.1` with API key. Fallback to cached snapshot data. (`src/lib/aesoService.ts`)
- **IESO (Independent Electricity System Operator)** — PeakTracker HTML parsing for 5CP prediction, Ontario demand data via Kaggle dataset (175K records). (`src/lib/gaIciPeakPredictor.ts`, `src/lib/connectors/ieso.ts`)
- **Environment Canada** — `api.weather.gc.ca` for weather observations (placeholder implementation, provincial capital coordinates). Feature flag gated. (`src/lib/weatherService.ts`)
- **StatCan** — Statistics Canada datasets via connectors. (`src/lib/connectors/statcan.ts`)
- **ECCC NPRI** — Environment and Climate Change Canada National Pollutant Release Inventory for facility emissions. (`src/lib/connectors/ecccNpri.ts`)
- **Yahoo Finance ESG** — Weekly ESG ratings refresh via GitHub Actions. (`docs/data-sources.md`)
- **Supabase** — PostgreSQL + Edge Functions + Storage for ML forecasting metadata, provenance, and model artifact management. (`supabase/functions/_shared/mlForecasting.ts`)

### Infrastructure:
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Recharts + Mapbox
- **Backend**: Supabase (PostgreSQL + Edge Functions + Auth)
- **Deployment**: Netlify (production at canada-energy.netlify.app)
- **Training**: Python + PyTorch + NumPy + pandas + scikit-learn + pandapower + pvlib, trained locally or on Modal.com NVIDIA T4 GPU (pay-per-use)
- **Automation**: GitHub Actions (ESG weekly import, NPRI annual import, manual dispatch modes)
- **Model Weights**: JSON artifacts committed to repo (`src/lib/modelWeights/dispatch-pinn-v2.json`, `pv-gnn-v2.json`) with SHA-256 manifest, simulator config, and production artifact gates
- **Feature Flags**: `VITE_TRAINED_DISPATCH_ENABLED`, `VITE_TRAINED_PV_FAULT_ENABLED` control whether trained weights or heuristic fallbacks are used at runtime

### Provenance and Claim Boundary System:
- Every prediction includes `SharedForecastMeta` with: model_version, generated_at, valid_at, confidence_score, data_sources, is_fallback, staleness_status (fresh/stale/unknown), methodology, warnings, training_data_profile (real/mixed/synthetic/simulator-calibrated), evaluation_summary, calibration_status (calibrated/uncalibrated/drifting), claim_label (estimated/advisory/validated), training_artifact_sha, simulator_config, trained_at
- Claim boundaries explicitly state what the model can and cannot claim
- "Do not claim" lists prevent overstatement

### Recent SOTA Developments (2025-2026) We Must Audit Against:

The following developments have emerged or matured in the last 12-18 months and are NOT yet reflected in our platform. The research must explicitly assess each against our current capabilities:

**A. Time Series Foundation Models (TSFMs) — zero-shot / few-shot forecasting**
- **Chronos-2** (Amazon, 2026) — multivariate foundation model with covariate support, zero-shot probabilistic forecasts, 50-1000x faster than task-specific probabilistic forecasters. Models interactions between time series and external drivers. (arXiv:2026)
- **Chronos-Bolt** (Amazon, 2024-2025) — T5 encoder-decoder with patch tokenisation, directly outputs 9 quantiles, ~250x faster inference than original Chronos. Small variant ~48M params, runs on consumer hardware.
- **Moirai-2** (Salesforce, 2025) — decoder-only universal forecasting transformer, quantile loss, pre-trained on 36M time series / 295B observations. Small variant ~11M params.
- **TimesFM** (Google, 2024) — decoder-only, 200M-500M params, cross-task transfer learning.
- **TinyTimeMixer (TTM)** (IBM, 2024) — MLP-Mixer architecture, <1M params, resource-constrained deployment.
- **LoRA fine-tuning** of TSFMs consistently outperforms full fine-tuning and from-scratch DL models on building energy forecasting (MERL 2026).
- **Key question**: Can we use Chronos-Bolt-Small or Moirai-2-Small as zero-shot baselines for demand/price forecasting, replacing our hand-rolled seasonal decomposition, with LoRA fine-tuning on IESO/AESO data on Modal.com T4?

**B. State Space Models (SSMs) for grid forecasting**
- **PowerMamba, S-Mamba** (2026) — Mamba-based state space models benchmarked on US grid forecasting. When using only historical load, SSMs and PatchTST provide highest accuracy. When weather is added, iTransformer improves 3x more than PatchTST due to cross-variate attention. (arXiv:2602.21415, March 2026)
- **Architecture-task matching**: PatchTST excels on rhythmic signals (solar), SSMs better for chaotic fluctuations (wind, price). No single best model — selection depends on data environment.

**C. Conformal Prediction advances for energy**
- **Context-Aware Conformal Prediction (CACP)** — corrects miscalibration at aggregated fleet level. Combined with copula-based dependence modeling for fleet-level renewable forecasts from site-level providers. (Moradi et al., arXiv:2602.02583, Jan 2026)
- **Adaptive Conformal Inference (ACI) with daily reset** — for PV forecasting, resetting miscoverage parameter at start of each day prevents interval inflation during nighttime. Achieves 90.96% coverage vs 79-83% for DQR/CatBoost. (Nature Scientific Reports, April 2026)
- **Conformalized Quantile Regression (CQR)** — combines quantile regression with CP for finite-sample coverage guarantees. (Brusaferri et al., 2024)
- **CP for electricity price forecasting** — Ensemble Batch Prediction Intervals + Sequential Predictive Conformal Inference, validated with battery storage trading simulation in day-ahead and balancing markets. (ScienceDirect, 2025)
- **MCD + CP hybrid** — Monte Carlo Dropout + Conformal Prediction for prosumer flexibility aggregation in ancillary service markets. (arXiv:2601.14663, Jan 2026)

**D. Physics-Informed GNN advances**
- **PI-GN-JODE** (2026) — Physics-Informed Graph Neural Jump ODEs for cascading failure prediction. Combines edge-conditioned GNN encoder, Neural ODE for continuous dynamics, jump handler for discrete relay trips, Kirchhoff-based physics regularization. First framework combining GNNs + Neural ODEs + jump processes + physics constraints for temporal cascade prediction. (arXiv:2603.20838)
- **IPIGN** (IEEE TIE, May 2026) — Interpretable Physics-Informed Graph Network for multitask cascading failure diagnosis in distributed energy systems. (DOI:10.1109/tie.2025.3645397)
- **PIA-GNN** (2025) — Physics-Informed Attention GNN, 98.99% fault localization accuracy, Kirchhoff-guided attention weights, interpretable. (DOI:10.1109/iconstem65670.2025.11374756)
- **STGNN with GraphSAGE/GATv2** for partially observable distribution grids — measured-only topology 6x faster training, +11pp F1. (arXiv:2604.20403)
- **Robust fault detection with UQ** — GNN with uncertainty quantification for smart grid fault detection. (Energy Reports, Jan 2026, DOI:10.1016/j.egyr.2025.12.057)

**E. EV charging load forecasting SOTA**
- **TriCast** (2026) — tri-modal (semantic spatial + causal temporal + price elasticity) for EV charging demand, outperforms 14 baselines. (ScienceDirect, April 2026)
- **CADGN** (IEEE TSG, 2025) — Causality-Aware Dynamic Multi-Graph CNN, 4.7% MAE reduction vs Graph WaveNet. (DOI:10.1109/tsg.2025.3570955)
- **STGCN-Attention** — multi-channel attentional graph integrating dynamic electricity price and weather, 9-16% MAE reduction vs STGCN/LSTM. (MDPI Electronics, 2025)
- **MOGNN-EC** (2026) — Multi-Objective GNN for EV energy management, 92% energy efficiency, 0.4s computation. (Babylonian JML, March 2026)

**F. Canadian NWP upgrades (free data)**
- **HRDPS v7.1.0** (April 14, 2026) — ECCC upgraded High Resolution Deterministic Prediction System with PROGNOS v1.0.0 statistical post-processing. 2.5km pan-Canadian resolution, 48h forecasts, 4 runs/day. Free via MSC Datamart (AMQP auto-retrieval) and GeoMet web services. Includes WEonG (Weather Elements on Grid) hourly post-processed products.
- **RDPS** — 10km North American resolution, 84h forecasts, free via MSC Datamart. Polar stereographic + rotated lat-lon grids.
- **Key question**: Should we integrate HRDPS 2.5km temperature/wind/cloud cover as exogenous features for demand and renewable forecasting, replacing our placeholder weather service?

**G. EnergyPatchTST and multi-scale transformers**
- **EnergyPatchTST** (2025) — multi-scale time series transformer with uncertainty estimation specifically designed for energy forecasting. (arXiv:2508.05454)

### Research Anchors We Already Cite:
- Hyndman & Athanasopoulos, "Forecasting: Principles and Practice" (3rd ed.) — seasonal decomposition
- Saltelli et al. "Global Sensitivity Analysis" (2008) — Morris method, sensitivity analysis
- IPCC AR6 Working Group III — scenario uncertainty standards (2022)
- Morgan & Henrion "Uncertainty" (Cambridge, 1990) — distribution elicitation
- OEB Appendix 2-AB — Asset Condition Assessment Methodology
- IEEE C57.104-2019 — Dissolved Gas Analysis (transformer reference)
- IEC 60076 — Power transformers assessment standards
- CBRM methodology (EA Technology / DNO practice)
- Helton & Davis "Latin Hypercube Sampling" (2003)
- IEC 62325-451 — Energy market communication standards

## WHAT I NEED YOU TO DO

### Question A: Are we using the latest and best scientific mechanisms?

1. **Audit each of the 14 prediction capabilities** against current SOTA (2025-2026). For each, state:
   - Is this still the best approach in 2025-2026, or has something better emerged?
   - What specific improvement or replacement would you recommend?
   - Cite the paper/proof for the alternative with DOI where possible.

2. **Identify loopholes and gaps** in our scientific framework:
   - Where are our weakest links scientifically?
   - Which approximations/proxies are most risky for operational deployment to paying utility customers?
   - What would a peer reviewer flag in a journal submission of this system?
   - Our hand-rolled TS ML (decision stumps, scalar GNN, linear margin SVM) vs real DL frameworks — what are the specific accuracy/reliability trade-offs?
   - Our synthetic/simulator-calibrated training data vs real operational data — what are the domain shift risks?

3. **Canadian-specific assessment**:
   - Are our IESO/AESO data integration approaches aligned with current best practices from those system operators?
   - What Canadian regulatory forecasting standards (OEB, AER, CER) should our models comply with?
   - How does our GA/ICI 5CP predictor compare to commercial ICI prediction services (e.g., Energy Manager, PowerStream, Alectra)?
   - What Canadian-specific load patterns (cold weather peaks, polar vortex events, ice storm impacts) are we missing?

4. **Audit the 6 capabilities not covered above** — these are often overlooked but critical for operational deployment:
   - **Gas Basis Spread Forecast**: Is OLS linear regression with 4 synthetic archetypes adequate vs SOTA natural gas basis forecasting (e.g., ARIMA-GARCH, regime-switching models, ML-based basis prediction)? What free AECO/Henry Hub historical data sources exist?
   - **Policy Overlay Risk (Stranded Asset Scoring)**: How does our weighted-average scoring compare to SOTA stranded asset / climate transition risk models (e.g., TPI, TPI-MQ, Paris Agreement Capital Transition Assessment (PACTA), transition risk stress testing from NGFS)?
   - **BYOP Multi-Agent Simulation**: How does our 4-agent heuristic simulation compare to SOTA multi-agent energy systems (e.g., MASCEM, AMES, FERC market simulation, agent-based wholesale market models)?
   - **Monte Carlo Uncertainty Engine**: Is our Box-Muller + split-half ESS approach adequate vs SOTA uncertainty quantification (polynomial chaos expansion, Bayesian inference, quasi-Monte Carlo, Sobol sequences, subset simulation)?
   - **Sensitivity Analysis Engine**: Is Morris method adequate vs SOTA global sensitivity analysis (Sobol indices, variance-based decomposition, Shapley effects, derivative-based global sensitivity measures)?
   - **Resilience Scoring**: How does our Chebyshev IPA climate hazard scoring compare to SOTA climate resilience frameworks (e.g., IPCC AR6 risk framework, ND-GAIN, climate adaptation planning tools, infrastructure resilience standards like ISO 14090)?

5. **Data quality and missing data handling**:
   - What SOTA methods exist for handling missing data in energy time series (imputation, matrix completion, variational inference)?
   - Our platform has quality flags (duplicate_interval, negative_load, flatline_segment, impossible_spike, etc.) — how should we handle these algorithmically vs just flagging them?
   - What concept drift detection methods are SOTA for energy forecasting (ADWIN, Page-Hinkley, Wasserstein distance, KL divergence)?
   - How should we implement automated retraining triggers?

6. **Time Series Foundation Models (TSFMs) — zero-shot audit** (NEW, critical for 2026):
   - Can Chronos-Bolt-Small (~48M params) or Moirai-2-Small (~11M params) replace our seasonal decomposition + linear regression for demand forecasting with zero-shot inference, then be LoRA fine-tuned on 175K IESO records on Modal.com T4?
   - How do TSFMs compare to our hand-rolled SVM-RFE, Random Forest stumps, and OLS gas basis regression in zero-shot mode?
   - Can Chronos-2 (multivariate with covariates) replace our entire demand forecasting pipeline by modeling IESO load + temperature + time features together?
   - What is the inference latency of Chronos-Bolt-Small on CPU (for Supabase Edge Function deployment) vs Modal.com T4?
   - Can TSFMs provide native probabilistic forecasts (quantile outputs) that replace our Box-Muller Monte Carlo engine?
   - What is the accuracy gap between zero-shot TSFM and LoRA-fine-tuned TSFM on Canadian energy data specifically?
   - Are there TSFMs pre-trained on energy-specific corpora (vs general-purpose) that would perform better?

7. **State Space Models vs Transformers — architecture selection audit** (NEW):
   - Given our data (historical load only vs load+weather), should we prefer PatchTST, iTransformer, or Mamba-based SSMs (PowerMamba, S-Mamba)?
   - The 2026 US grid benchmark (arXiv:2602.21415) shows iTransformer benefits 3x more from weather covariates than PatchTST — does this mean we should use iTransformer if we integrate HRDPS weather data?
   - For price forecasting (chaotic fluctuations), should we prefer SSMs over transformers?
   - For solar forecasting (rhythmic signals), should we prefer PatchTST?

8. **Conformal Prediction — operational deployment audit** (NEW):
   - Can Adaptive Conformal Inference (ACI) with daily reset replace our split-half ESS approach for all probabilistic forecasts?
   - Should we use CQR (Conformalized Quantile Regression) to wrap our existing point forecasts with coverage guarantees?
   - For fleet-level/aggregated forecasts (e.g., provincial demand from substation forecasts), should we use Copula+CACP?
   - How does CP compare to our Monte Carlo engine in terms of computational cost on Supabase Edge Functions?
   - Can CP provide the regulatory-grade uncertainty quantification that OEB/AER/CER filings require?

### Question B: What is the rest of the world doing that we are not?

1. **Operational forecasting systems** (IESO, AESO, PJM, ERCOT, ENTSO-E, NEM-AEMO, National Grid UK):
   - What methods do they use that we don't?
   - Specifically: ensemble forecasting, probabilistic load forecasting, weather ensemble inputs, neural network demand models, hierarchical reconciliation
   - Are there 2025-2026 papers describing new operational methods we should adopt?
   - What is IESO's current demand forecasting methodology and how does ours compare?
   - What is AESO's pool price forecasting approach?

2. **Emerging deep learning approaches for energy time series**:
   - **Temporal Fusion Transformer (TFT)** — Lim et al. 2021, multi-horizon forecasting with known/unknown inputs, variable selection network, temporal attention
   - **N-BEATS / N-HiTS** — Oreshkin et al. 2020, Challu et al. 2023, pure DL univariate forecasting with interpretable basis functions
   - **Informer / Autoformer / FEDformer** — long-sequence transformer variants for efficient long-horizon forecasting
   - **PatchTST / iTransformer** — patch-based and inverted transformer approaches (2023-2024), SOTA on ETT, weather, electricity benchmarks. 2026 benchmark shows iTransformer 3x better with weather covariates, PatchTST better for univariate/rhythmic signals.
   - **TimesNet** — Wu et al. 2023, 2D temporal variation analysis for general-purpose time series
   - **TiDE / SCINet** — MLP-based and dilated convolution approaches for fast inference
   - **EnergyPatchTST** (2025) — multi-scale transformer with uncertainty estimation, energy-specific design (arXiv:2508.05454)
   - **State Space Models (SSMs)** — PowerMamba, S-Mamba (2026), Mamba architecture for grid forecasting, better than transformers for chaotic signals (wind, price) (arXiv:2602.21415)
   - **Time Series Foundation Models (TSFMs)** — Chronos-2, Chronos-Bolt, Moirai-2, TimesFM, TinyTimeMixer. Zero-shot forecasting without task-specific training. Chronos-Bolt outputs 9 quantiles natively, 250x faster. LoRA fine-tuning outperforms full fine-tuning. (See Section A of Recent SOTA Developments above)
   - **Probabilistic forecasting**: Conformal prediction (Vovk et al.), Context-Aware CP (CACP), Adaptive Conformal Inference (ACI) with daily reset, Conformalized Quantile Regression (CQR), quantile regression, CRPS optimization, energy scoring
   - **Hierarchical forecasting**: MinT reconciliation, trace minimization for coherent forecasts across system/substation/feeder levels
   - Are there others we haven't found?

3. **Grid reliability and asset health ML**:
   - **GNN for power grid** — GraphSAGE, GAT, GATv2, GraphConv for fault localization and contingency analysis (Donat et al. 2022, Owerko et al. 2024)
   - **Physics-informed GNN** — embedding power flow/Kirchhoff equations into GNN message passing. PIA-GNN (98.99% fault localization, interpretable attention, 2025). IPIGN (interpretable multitask cascading failure diagnosis, IEEE TIE May 2026).
   - **PI-GN-JODE** (2026) — Physics-Informed Graph Neural Jump ODEs: GNN + Neural ODE + jump processes for temporal cascade prediction. First of its kind. (arXiv:2603.20838)
   - **STGNN for partially observable grids** — Spatio-temporal GNNs with GraphSAGE/GATv2, measured-only topology for 6x faster training and +11pp F1 on IEEE 123-bus. (arXiv:2604.20403)
   - **GNN with uncertainty quantification** — robust fault detection with UQ for smart grids. (Energy Reports, Jan 2026)
   - **Reinforcement learning for dispatch** — safe RL for economic dispatch with constraint satisfaction
   - **Transformer health monitoring** — DGA-based LSTM/GRU, attention models for dissolved gas analysis
   - **Probabilistic contingency analysis** — Monte Carlo vs polynomial chaos expansion vs scenario-based methods
   - **Digital twin approaches** — real-time state estimation with ML-augmented power flow

4. **Renewable energy forecasting**:
   - **Solar forecasting** — NREL SAM integration, NSRDB satellite data, sky image-based nowcasting, CNN-LSTM for irradiance
   - **Wind forecasting** — HRRR/GFS NWP ensemble, attention-based wind power prediction, wake effect modeling
   - **Hybrid approaches** — PV+storage co-optimization, wind+solar complementarity forecasting
   - **Probabilistic renewable forecasting** — quantile regression, scenario generation for stochastic optimization

5. **Canadian energy market research we may be missing**:
   - CER (Canada Energy Regulator) "Energy Future" modeling methodology
   - NREL renewable forecasting standards and tools
   - University of Waterloo, University of Toronto, UBC energy systems research
   - CanmetENERGY, NRCan forecasting research
   - OEB demand forecasting guidelines and compliance requirements
   - AER TIER compliance forecasting
   - What other Canadian institution research should we incorporate?

6. **Operational practices we may be missing**:
   - NWP (Numerical Weather Prediction) ensemble integration as exogenous features
   - Real-time model updating / online learning for demand forecasting
   - Hierarchical time series reconciliation across geography levels
   - Probabilistic forecast communication to operators (fan charts, risk windows)
   - Model-agnostic explainability (SHAP, LIME) for energy predictions
   - Concept drift detection and automated retraining pipelines
   - Forecast value decomposition (bias, variance, tail risk)
   - Transfer learning across jurisdictions (train on Ontario, transfer to Alberta)
   - Data quality / missing data imputation SOTA (matrix completion, variational inference)
   - Regulatory explainability requirements — what do OEB/AER/CER filings require for model documentation?
   - Model cybersecurity — adversarial robustness of energy forecasting models against data poisoning

7. **Emerging capability areas we lack entirely** — audit SOTA for each:
   - **EV charging load forecasting** — spatiotemporal EV load prediction, charging station utilization forecasting. 2026 SOTA: TriCast (tri-modal causal+price elasticity), CADGN (causality-aware multi-graph, 4.7% MAE reduction vs Graph WaveNet), STGCN-Attention (9-16% MAE reduction vs LSTM), MOGNN-EC (multi-objective GNN, 92% energy efficiency). Should we use STGCN-Attention or CADGN as our baseline?
   - **Hydrogen production forecasting** — green hydrogen economics, electrolyzer dispatch optimization
   - **Carbon credit / carbon market forecasting** — carbon price prediction, offset project viability scoring
   - **Demand response optimization** — automated DR event triggering, load shedding optimization, price-responsive demand
   - **Electricity market bidding optimization** — self-scheduling generator bidding, virtual bidder / convergence bidding strategies
   - **Energy storage arbitrage optimization** — battery dispatch optimization with price forecasting, multi-market participation (energy + ancillary services + capacity). CP-validated trading simulation shows improved returns in day-ahead and balancing markets (ScienceDirect 2025).
   - **Real-time state estimation** — ML-augmented power flow, distribution system state estimation with limited sensors
   - **Distributed energy resource (DER) aggregation forecasting** — VPP dispatch forecasting, behind-the-meter solar + storage prediction. MCD+CP hybrid for prosumer flexibility in ancillary markets (arXiv:2601.14663).

### Question C: What should we incorporate to improve our model multifold?

1. **Prioritized recommendations**: For each gap identified, provide:
   - Implementation complexity (Low/Medium/High)
   - Expected improvement (quantitative if possible — e.g., "MAPE reduction from 8% to 4%")
   - Whether it requires new data sources, new compute, or just code changes
   - Whether it's feasible within our zero-cost infrastructure constraint (GitHub Actions + Supabase free + Modal.com pay-per-use)

2. **Specific architecture recommendations**:
   - Should we replace our seasonal decomposition + linear regression with a TFT or N-BEATS model for demand forecasting?
   - Should we replace our scalar GNN with GraphSAGE or GAT for PV fault localization?
   - Should we add conformal prediction intervals to all point forecasts?
   - Should we integrate NWP weather data (GFS/HRRR) as exogenous features for demand and renewable forecasting?
   - Should we build a formal ensemble fusion (statistical + DL + physics) for demand forecasting?
   - Should we replace our Random Forest decision stumps with XGBoost or LightGBM for price spike prediction?
   - Should we add hierarchical reconciliation for system/substation/feeder forecasts?
   - Should we implement online learning / incremental model updates?
   - Should we replace our hand-rolled SVM-RFE with SHAP-based feature selection?
   - Should we add a transformer-based model for multi-horizon price forecasting?
   - Should we replace our OLS gas basis regression with ARIMA-GARCH or a regime-switching model?
   - Should we replace our weighted-average policy overlay with PACTA or NGFS-aligned transition risk scoring?
   - Should we upgrade our Monte Carlo engine with quasi-Monte Carlo (Sobol sequences) or polynomial chaos expansion?
   - Should we add Sobol indices to our sensitivity analysis alongside Morris method?
   - Should we upgrade our resilience scoring to align with IPCC AR6 risk framework or ISO 14090?
   - Should we add EV charging load forecasting as a new capability?
   - Should we add energy storage arbitrage optimization as a new capability?
   - Should we add demand response optimization as a new capability?
   - **Should we adopt Chronos-Bolt-Small or Moirai-2-Small as a zero-shot forecasting baseline, with LoRA fine-tuning on IESO/AESO data via Modal.com T4?** (NEW)
   - **Should we replace our Monte Carlo uncertainty engine with Adaptive Conformal Inference (ACI) or Conformalized Quantile Regression (CQR) for all point forecasts?** (NEW)
   - **Should we integrate ECCC HRDPS v7.1.0 (2.5km, free, PROGNOS post-processed) as our primary weather data source, replacing the placeholder weather service?** (NEW)
   - **Should we replace our scalar GNN with PI-GN-JODE or PIA-GNN for cascading failure prediction and fault localization?** (NEW)
   - **Should we add Mamba-based SSMs (PowerMamba/S-Mamba) for wind power and price forecasting where chaotic fluctuations dominate?** (NEW)
   - **Should we use Copula+CACP for fleet-level/provincial demand aggregation from substation-level forecasts?** (NEW)

3. **Canadian-specific improvements**:
   - What real IESO/AESO historical data sources should we integrate (beyond our current Kaggle dataset)?
   - **ECCC HRDPS v7.1.0** (April 2026) — 2.5km pan-Canadian NWP, free via MSC Datamart (AMQP) and GeoMet web services, with PROGNOS v1.0.0 statistical post-processing and WEonG hourly products. Should this be our primary exogenous weather data source? How to integrate via GitHub Actions scheduled ingestion?
   - **ECCC RDPS** — 10km North American NWP, 84h forecasts, free. Useful for broader North American market context (e.g., AECO gas basis depends on continental weather).
   - What regulatory compliance features should we add for OEB/AER/CER filings?
   - Should we partner with Canadian universities or government labs?
   - What validation data do we need from Canadian utilities?

### Question D: What is needed to make this a top 3 web app globally for energy prediction capabilities?

1. **Competitive benchmark**: Identify the current top 3 web applications globally for energy prediction/analytics capabilities. For each:
   - Name, URL, and organization
   - Key prediction capabilities
   - Technology stack and ML methods used
   - Data sources and refresh cadence
   - Accuracy claims and validation methodology
   - Pricing model and target market
   - What makes them top 3 (specific differentiators)

2. **Gap-to-top-3 table**: Provide a comprehensive table with the following columns for EVERY capability (existing and missing):

   | Capability | Current Rating (1-5) | Target Rating for Top 3 (1-5) | Gap Description | What's Needed to Close Gap | Effort (L/M/H) | Priority (P0/P1/P2) |
   |---|---|---|---|---|---|---|

   Rate each capability on a scale of 1-5 where:
   - 1 = Basic/inferior (hand-rolled heuristics, no validation)
   - 2 = Functional but below industry standard
   - 3 = Industry standard (comparable to typical utility practice)
   - 4 = Above average (better than most commercial offerings)
   - 5 = SOTA (best-in-class globally, published, validated)

   Include ALL 14 existing capabilities PLUS these 8 emerging capability areas that top-3 competitors may have:
   - EV charging load forecasting
   - Hydrogen production forecasting
   - Carbon credit / carbon market forecasting
   - Demand response optimization
   - Electricity market bidding optimization
   - Energy storage arbitrage optimization
   - Real-time state estimation
   - DER aggregation forecasting

   Also include these 8 cross-cutting capabilities that support all predictions:
   - Data quality / missing data imputation
   - Concept drift detection / automated retraining
   - Probabilistic forecasting (conformal prediction: ACI, CQR, CACP; quantile regression)
   - Explainability (SHAP, LIME) for regulatory filings
   - Transfer learning across jurisdictions (including TSFM zero-shot / LoRA fine-tuning)
   - Model cybersecurity / adversarial robustness
   - **Time Series Foundation Model adoption** (zero-shot baselines, LoRA fine-tuning, Chronos-Bolt/Moirai-2 deployment) (NEW)
   - **Free Canadian NWP integration** (HRDPS 2.5km, RDPS 10km, MSC Datamart AMQP) (NEW)

3. **Top-3 achievement roadmap**: What specific combination of improvements would move us from our current overall rating to a top-3 position? Quantify the gap.

## CONSTRAINTS
- Our infrastructure is zero-cost (GitHub Actions + Supabase free tier + Modal.com pay-per-use GPU)
- We need honest assessment — don't sugarcoat gaps
- Cite specific papers with DOIs where possible
- Focus on what's operationally deployable for paying B2B utility/consultant customers, not just academic
- We are a solo developer with no marketing budget — recommendations must be implementable by one person
- Our target market is Canadian energy professionals, utilities, municipalities, Alberta-focused
- All improvements must integrate with our existing React/TypeScript frontend + Python/PyTorch training pipeline + Supabase backend
- We have a provenance and claim boundary system — any new model must support training_data_profile, evaluation_summary, calibration_status, and claim_label metadata

## OUTPUT FORMAT
For each finding, provide:
1. **Technology/Method name**
2. **Who uses it** (institution, country, system operator)
3. **Paper citation** (author, year, journal, DOI)
4. **What it does better than our current approach**
5. **Implementation recommendation** (adopt/adapt/watch/skip)
6. **Estimated effort** (Low/Medium/High)
7. **Expected impact** (quantitative if possible — e.g., "MAPE from 8% to 4%", "F1 from 0.32 to 0.65")
8. **Zero-cost feasibility** (yes/no/partial)

For the top-3 ranking table (Question D), use the exact tabular format specified above with all columns filled.

---

## After Receiving Responses

Once you have responses from all platforms (Gemini Deep Research, Perplexity Pro, ChatGPT, Claude):

1. **Merge findings** — deduplicate, resolve contradictions
2. **Rank by impact × feasibility** — prioritize quick wins within zero-cost constraint
3. **Map to codebase** — identify exact files needing modification:
   - `src/lib/demandForecaster.ts` — demand forecasting
   - `src/lib/advancedForecasting.ts` — ML forecasting (RF, SVM-RFE, SCED, PINN, GNN, BYOP, gas basis, policy)
   - `src/lib/modelInference.ts` — MLP/GNN forward pass and validation
   - `src/lib/uncertaintyEngine.ts` — Monte Carlo and uncertainty quantification
   - `src/lib/sensitivityEngine.ts` — sensitivity analysis
   - `src/lib/gaIciPeakPredictor.ts` — ICI 5CP prediction
   - `src/lib/utilityForecasting.ts` — utility load forecasting and planning
   - `src/lib/forecastBaselines.ts` — baseline forecast methods
   - `src/lib/assetHealthScoring.ts` — asset health index
   - `src/lib/resilienceScoring.ts` — resilience scoring
   - `src/lib/weatherService.ts` — weather data integration
   - `src/lib/aesoService.ts` — AESO data integration
   - `src/lib/mlForecasting.ts` — ML forecasting orchestration and metadata
   - `training/dispatch_pinn/` — PyTorch dispatch PINN training
   - `training/pv_fault_gnn/` — PyTorch PV fault GNN training
   - `src/lib/modelWeights/` — committed model weight artifacts
4. **Create phased roadmap**:
   - Phase 0 (quick wins, <1 week): Low-effort, high-impact improvements (e.g., conformal prediction intervals via ACI/CQR, XGBoost for price spikes, Chronos-Bolt-Small zero-shot demand forecast baseline)
   - Phase 1 (1-4 weeks): Medium-effort improvements (e.g., HRDPS v7.1.0 NWP exogenous features via MSC Datamart, hierarchical reconciliation, LoRA fine-tuning of TSFM on IESO data)
   - Phase 2 (1-3 months): High-effort architectural changes (e.g., iTransformer for demand with weather covariates, GraphSAGE/GATv2 for PV faults, CP replacing Monte Carlo for operational forecasts)
   - Phase 3 (3-12 months): Research-grade capabilities requiring partnership or significant compute (e.g., PI-GN-JODE for cascading failure prediction, Mamba SSMs for price forecasting, EV charging load forecasting with STGCN-Attention, real-time state estimation, automated demand response)
5. **Top-3 positioning strategy**: Based on the gap-to-top-3 table, identify the minimum viable set of improvements that would position us in the top 3 globally for energy prediction web applications
