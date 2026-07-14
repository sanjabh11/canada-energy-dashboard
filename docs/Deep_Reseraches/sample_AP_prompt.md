You are a world-class avalanche scientist and ML engineer specializing in operational avalanche forecasting systems. I need an exhaustive, evidence-backed gap analysis of our avalanche prediction platform against global SOTA.

## CONTEXT: What Our Platform Already Does

Our platform (Avalanche Insight Hub) is a batch-first ML system for operational avalanche forecasting covering 12 mountain regions (5 Himalayan, 7 global). Here is the COMPLETE technology stack:

### ML Models:
- **Random Forest (300 trees)** — production scorer with RFE-SVM feature selection (29 to 15 features), KMeansSMOTE with physical plausibility filtering, isotonic calibration, PSS > 0.45 and Brier <= 0.15 quality gates
- **MTS-LSTM (Branched)** — shadow candidate with hourly (24 steps, 32 hidden) + daily (7 steps, 24 hidden) + static (16 units) branches, zone-attention gate for Himalayan microclimate zones, MC Dropout uncertainty, 3-gate promotion system
- **ResNet34 U-Net** — SAR wet-snow segmentation from Sentinel-1 VV+VH
- **Swin Transformer V2 U-Net** — bi-temporal SAR change detection
- **GNN Runout** — graph neural network for avalanche debris runout prediction

### Physics and Snowpack:
- **4-tier snowpack fallback**: SNOWPACK C++ (Tier 1) then COSIPY Python (Tier 2) then heuristic proxy from Open-Meteo seasonal cumulative (Tier 3, production default) then synthetic (Tier 4)
- **Alpha-Beta runout** (Lied and Bakkehoi 1980): alpha = 0.96 x beta - 1.4
- **Chebyshev IPA** hazard scoring with 5 weighted criteria
- **Seismic cascade integrator** based on Shekhar et al. 2026 (DGRE/SASE/CSIO): acute (1.97-14.57h, 1.3x) + delayed (38.32-76.32h, 1.15x) post-tremor windows

### Remote Sensing:
- **Sentinel-1 SAR** via Google Earth Engine: VV < -18 dB, VH < -22 dB wet-snow thresholding with layover/shadow masking using local incidence angle
- **SRTM DEM** for terrain features (slope, elevation, aspect, roughness, curvature)
- **Historical SAR backfill** (2023-2024) with physics gate (25-65 degree slope)

### Verification and Explainability:
- **TreeSHAP** for feature attribution (with heuristic fallback)
- **Conformal prediction intervals** (90% coverage, alpha=0.1)
- **Expected Calibration Error** (10-bin reliability)
- **TimeSeriesSplit CV** (5-fold chronological) + **Spatial GroupKFold CV** (cross-region transfer)
- **Wasserstein distance** concept drift detection (7-day vs 30-day baseline)
- **SHA-256 schema drift** with auto-retrain
- **Continuous learning loop** with audit trail (SAR 0.85, seismic 0.70, field report 0.95 confidence)
- **Federated Learning (FedAvg)** for air-gapped military sector deployment

### Data Sources:
- Open-Meteo (Forecast + Ensemble + Archive) — free, no API key
- newsdata.io + Google News RSS fallback then Gemini 2.5 Flash LLM extraction
- Google Earth Engine (Sentinel-1 SAR)
- USGS FDSNWS (seismic)
- Supabase (PostgreSQL + Storage + Edge Functions)

### Infrastructure:
- GitHub Actions (13 crons, 14 dispatch modes, 2 concurrency groups)
- Modal.com NVIDIA T4 GPU (LSTM + SAR U-Net training, pay-per-use)
- Netlify (React + TypeScript + Vite + TailwindCSS frontend)
- PWA with IndexedDB offline field reports

### Himalayan-Specific Features:
- 4 DRDO zones (Pir Panjal, Shamshabari, Great Himalaya, Karakoram and Ladakh) + Nepal Himalaya
- Zone-specific climate class, elevation bounds, season start, lapse rate
- Zone attention gate in MTS-LSTM for microclimate-aware weighting
- Cold-start mode (PSS floor 0.30, Brier ceiling 0.20, 200 trees, class_weight {0:1, 1:6})
- CAP 1.2 alerts in English/Hindi/Urdu; SACHET push to NDMA via 4 channels (API, SMS, GAGAN, NavIC)
- Multi-hazard: landslide (infinite slope stability), debris flow (Caine 1980 ID threshold with Himalayan revision factors), GLOF, rockfall

### Research Anchors We Already Cite:
- Perez-Guillen et al. (2022, NHESS) — RF + SNOWPACK for avalanche danger prediction
- Maissen et al. (2024, GMD) — RAvaFcast v1.0.0 three-stage pipeline
- Ebert and Milne (2022, NHESS) — skill scores for rare-event forecasting
- van Herwijnen et al. (2023, ISSW) — data-driven operational forecasting models
- Shekhar et al. (2026, MAUSAM) — earthquake-avalanche temporal relationship
- EAWS Matrix (2025, NHESS) — revised danger level determination
- Lied and Bakkehoi (1980) — alpha-beta runout formula
- Caine (1980) — intensity-duration debris flow threshold
- Techel et al. (2025, NHESS) — can model-based forecasts match human forecasts
- Kapil et al. (2023) — acoustic emission monitoring in Great Himalaya

## WHAT I NEED YOU TO DO

### Question A: Are we using the latest and best scientific mechanisms?

1. **Audit each technology** in our stack against current SOTA. For each, state:
   - Is this still the best approach in 2025-2026, or has something better emerged?
   - What specific improvement or replacement would you recommend?
   - Cite the paper/proof for the alternative.

2. **Identify loopholes and gaps** in our scientific framework:
   - Where are our weakest links scientifically?
   - Which approximations/proxies are most risky for operational deployment?
   - What would a peer reviewer flag in a journal submission of this system?

3. **Himalayan-specific assessment**:
   - Are our Himalayan zone parameters (climate class, lapse rate, grain types) aligned with latest DGRE/SASE/CSIO published research?
   - What Himalayan-specific avalanche mechanisms are we missing?
   - How does our cold-start mode compare to DGRE's HIM-STRAT (Joshi et al. 2020) or eNN10 models?

### Question B: What is the rest of the world doing that we are not?

1. **European operational systems** (SLF Switzerland, Meteo-France, Norwegian Avalanche Service):
   - What methods do they use that we don't?
   - Specifically: Gaussian Process interpolation, SNOWPACK operational chains, CROCUS/SURFEX, RAMMS::EXTENDED, ensemble forecasting
   - Are there 2025-2026 papers describing new operational methods we should adopt?
   - Swiss operational ensemble: 3 models combined with weighted mean (0.25 + 0.25 + 0.5) — do we need this?

2. **Emerging deep learning approaches**:
   - CCDT-ADA-Net (Kulsoom et al. 2026, IEEE TGRS) — multimodal differential transformer, ROC-AUC 0.99
   - Physics-Informed Neural Differential Equations (Charbonneau et al. 2025) for snowpack — <9% error
   - Hybrid Physics-Informed Transformers (HPIT) for SWE — R2=0.876
   - Neural emulators for runout (U-Net + attention + FiLM, arXiv 2025) — 4 orders of magnitude faster
   - ConvLSTM for spatiotemporal susceptibility
   - Are there others we haven't found?

3. **Himalayan/Indian research we may be missing**:
   - IIT Mandi GNN avalanche dynamics (FMFP 2025)
   - DRDO/DGRE 2025 publications on UAV photogrammetry, infrasonic sensors, NATSAT
   - Karuna Kaushik, Amreek Singh, Rewa Sharma (2025) — data skewness handling for Himalayan avalanche ML
   - Abhinav and Sattar (2025, Nature Sci Data) — Western Himalaya susceptibility with ML
   - Kapil et al. (2023) — acoustic emission monitoring in Great Himalaya, instability index 13h before release
   - DGRE IAWNS-S (Integrated Avalanche Warning and Navigation System with SATCOM)
   - What other Indian institution research should we incorporate?

4. **Operational practices we may be missing**:
   - Acoustic emission technology for snowpack stability (Kapil et al. 2023 — 13h early warning)
   - Infrasound real-time avalanche detection (DGRE Zoji La deployment Feb 2024)
   - WRF mesoscale downscaling for micro-scale forecasts
   - Ensemble model output fusion (DGRE already does this; Swiss use weighted mean of 3 models)
   - Analog ensemble using 20-30 previous winter seasons
   - Probabilistic runout modelling with ensemble of input parameters (2026 EGUsphere)

### Question C: What should we incorporate to improve our model multifold?

1. **Prioritized recommendations**: For each gap identified, provide:
   - Implementation complexity (Low/Medium/High)
   - Expected improvement (quantitative if possible)
   - Whether it requires new data sources, new compute, or just code changes
   - Whether it's feasible within our zero-cost infrastructure constraint

2. **Specific architecture recommendations**:
   - Should we replace our RF with a transformer-based model? When?
   - Should we add Gaussian Process interpolation between our grid cells?
   - Should we integrate RAMMS for operational runout instead of Alpha-Beta?
   - Should we add a physics-informed neural network alongside COSIPY?
   - Should we build a formal ensemble fusion (RF + LSTM + physics)?
   - Should we integrate acoustic emission monitoring data stream?

3. **Himalayan-specific improvements**:
   - What Himalayan-specific data sources should we integrate?
   - What partnerships (DGRE, IIT Mandi, SASE) should we pursue?
   - What validation data do we need from Himalayan observatories?
   - Should we incorporate DGRE's 71 surface observatories as ground truth?
   - Should we integrate DGRE's HIM-STRAT snowpack model as an ensemble member?

## CONSTRAINTS
- Our infrastructure is zero-cost (GitHub Actions + Supabase free tier + Modal.com pay-per-use)
- We need honest assessment — don't sugarcoat gaps
- Cite specific papers with DOIs where possible
- Focus on what's operationally deployable, not just academic
- We are the operationalization layer between DGRE research and field deployment

## OUTPUT FORMAT
For each finding, provide:
1. **Technology/Method name**
2. **Who uses it** (institution, country)
3. **Paper citation** (author, year, journal, DOI)
4. **What it does better than our current approach**
5. **Implementation recommendation** (adopt/adapt/watch/skip)
6. **Estimated effort** (Low/Medium/High)
7. **Expected impact** (quantitative if possible)

---

## After Receiving Responses

Once you have responses from all 4 platforms:

1. **Merge findings** — deduplicate, resolve contradictions
2. **Rank by impact x feasibility** — prioritize quick wins
3. **Map to codebase** — identify exact files needing modification
4. **Create phased roadmap**:
   - Phase 0 (quick wins, <1 week): Low-effort, high-impact
   - Phase 1 (1-4 weeks): Medium-effort improvements
   - Phase 2 (1-3 months): High-effort architectural changes
   - Phase 3 (3-12 months): Research-grade capabilities requiring partnership