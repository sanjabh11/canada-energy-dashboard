# Canada Energy – Canadian Regulatory Alignment, Gap Analysis, and Roadmap

## Executive Overview

Canada Energy Intelligence Platform is a production web app providing forecasting, grid reliability analytics, and asset/resilience scoring across Ontario, Alberta, and all provinces/territories. Canadian regulatory alignment requires that its methods, uncertainty treatment, and documentation be consistent with guidance from Ontario Energy Board (OEB), Alberta Electric System Operator (AESO) and Alberta regulators, and the Canada Energy Regulator (CER). This report focuses first on Canadian regulatory practices and how your current stack compares, then outlines a concrete roadmap that fits a solo‑dev, low‑cost infrastructure constraint.[1][2][3][4][5]


## 1. Regulatory Context – Key Canadian Bodies

### 1.1 Ontario Energy Board (OEB)

The OEB oversees electricity and natural gas utilities in Ontario and sets rules for planning, load forecasting, conservation, and rate applications. The Regional Planning Process Advisory Group’s **Load Forecast Guideline** gives a common process for regional demand forecasts used by distributors, transmitters, and the IESO. Recent OEB business plans emphasize distributed energy resources (DER), non‑wires solutions, conservation programs, and innovation, which indirectly affect forecast assumptions (e.g., electrification, CDM/DSM impacts).[6][7][8][1]

### 1.2 Independent Electricity System Operator (IESO)

IESO is responsible for Ontario system reliability and market operations, with operational and planning demand forecasts central to its work. IESO uses end‑use models that combine household/economic data, technology adoption (heat pumps, EVs), policy impacts, and weather‑normalized load to build planning outlooks. It publishes demand forecasts and planning outlook reports, which set expectations for modelling practices and transparency.[9][10]

### 1.3 Alberta Electric System Operator (AESO)

AESO operates Alberta’s grid and wholesale market, producing long‑term outlooks and detailed load‑forecast methodologies. The 2024 Long‑Term Outlook includes dedicated reports on load forecast methodology, policy/regulatory drivers, emerging technologies, risks, and scenario outcomes, illustrating a multi‑scenario, risk‑aware approach. AESO also develops frameworks for large load integration (e.g., data centres) that rely heavily on robust long‑term forecasts and NERC standards.[11][12][2][13]

### 1.4 Canada Energy Regulator (CER)

CER produces **Canada’s Energy Future** scenarios and interactive tools that project energy demand/supply to 2050. The Energy Futures methodology covers models and assumptions used to generate national scenarios, emphasizing transparent documentation of model design and scenario logic. Recent CER work highlights rising electricity demand (e.g., ~44% increase from 2023 to 2050), electrification, and the importance of scenario analysis, but is not itself an operational forecasting standard.[14][15][16][3][4]

### 1.5 CanmetENERGY and NRCan

CanmetENERGY research centres (Ottawa, Varennes) lead R&D on clean‑energy technologies, load characterization, and forecasting methods, often issuing reports on emerging forecasting techniques (e.g., wind power, building loads). While their work is not prescriptive regulation, it informs best practice and can be referenced in technical documentation as research anchors alongside the textbooks you already cite (Hyndman/Athanasopoulos, Saltelli, IPCC AR6, etc.).[17][18][19][5]


## 2. What Canadian Regulators Expect From Forecasting Systems

### 2.1 Methodological Transparency and Documentation

OEB, IESO, and AESO all emphasize clear documentation of forecasting methodology, including: model structure, key drivers, scenario definitions, and treatment of uncertainty. CER’s Energy Futures documentation similarly provides detailed descriptions of models and scenario logic. Your platform’s **SharedForecastMeta** (modelversion, datasources, calibrationstatus, stalenessstatus, claimlabel, etc.) already aligns well with this transparency requirement, provided the descriptions reference recognized literature and regulatory guidance.[10][2][13][3][4][5][1][14]

### 2.2 Scenario‑Based Planning and Sensitivity

Both AESO and CER rely heavily on **multi‑scenario planning** (e.g., different policy/electrification paths, technology adoption trajectories) and emphasize sensitivity/uncertainty analysis over single deterministic forecasts. Your utility load forecasting (8760 profiles with low/base/high scenarios and stress tests such as polar vortex, heatwave, ice storm) is conceptually aligned with this scenario‑based approach and climate stress‑testing. Enhancing the linkage between these scenarios and CER/OEB scenario definitions would strengthen regulatory alignment.[2][16][3][4][5]

### 2.3 Weather and Electrification Drivers

OEB’s Load Forecast Guideline explicitly calls for consistent consideration of drivers like electrification, DER, and conservation when preparing forecasts. IESO’s planning uses end‑use models that incorporate building stock, heat pumps, EV adoption, and policy impacts. AESO’s long‑term methodology similarly incorporates policy drivers and emerging technologies. For regulatory alignment, demand and capacity forecasts should integrate high‑quality **Numerical Weather Prediction (NWP)** and electrification drivers rather than placeholder weather or purely historical load.[12][13][6][9][1][10][2]

### 2.4 Uncertainty and Risk Communication

AESO and CER highlight risks, uncertainties, and scenario ranges instead of point forecasts only. OEB planning processes rely on load forecasts that acknowledge uncertainty, enabling robust regional planning and non‑wires solutions evaluation. This aligns directly with your Monte Carlo Uncertainty Engine and sensitivity analysis framework; however, regulators increasingly expect **probabilistic coverage guarantees** and clear communication of confidence intervals, not just Monte Carlo quantiles.[8][16][3][5][1][2]

### 2.5 Regulatory Filings and Explainability

Regulators require that methods used in rate applications, planning studies, and compliance submissions be explainable in terms of known techniques and standards (e.g., OEB’s load forecast guidance, AESO methodology, CER scenario documentation). Your provenance system and "claim boundaries" are strong foundations, but any adoption of advanced DL (transformers, TSFMs, GNNs, conformal prediction) must be accompanied by explainability (e.g., SHAP/LIME, feature importance) and cross‑reference to accepted academic/industry literature.[4][5][1][2]


## 3. Alignment of Current Canada Energy Capabilities With Canadian Practices

### 3.1 Demand Forecasting (Ontario / IESO / OEB)

Your seasonal decomposition linear regression pipeline uses SMA‑168 weekly cycles, multi‑scale seasonality profiles (hour/day/month), and optional temperature regression, with MAE/MAPE/RMSE and skill scores versus persistence and seasonal naive baselines. This is conceptually aligned with **decomposition plus regression** methods recommended in European and academic demand‑forecasting practice and compatible with OEB/IESO’s emphasis on transparent, regression‑based load modelling. However, IESO’s planning outlook incorporates detailed end‑use and electrification drivers, while your current implementation focuses primarily on load and temperature, leaving heat pump/EV adoption at the scenario narrative level rather than explicit model inputs.[20][5][9][1][10]

### 3.2 Alberta Load and Price Forecasting (AESO)

Your platform integrates AESO pool price, RRO rates, demand, and supply mix via `api.aeso.ca/report/v1.1` with fallback to cached snapshots. AESO’s official Long‑Term Outlook uses a structured load forecast methodology document and scenarios for policy, technology, and risk drivers. While you already include scenario stress tests (polar vortex, heatwave, ice storm) for utility load forecasting, price forecasting uses simpler models (e.g., Random Forest decision stumps for spike prediction, OLS gas basis regression with synthetic data) and does not yet explicitly align with AESO’s **scenario narrative** or NERC‑driven long‑term frameworks.[13][5][11][12][2]

### 3.3 Weather Integration and HRDPS/RDPS

Your current `weatherService` uses Environment Canada’s `api.weather.gc.ca` with placeholder implementations and provincial capital coordinates, gated by a feature flag. ECCC’s High Resolution Deterministic Prediction System (HRDPS) v7.1.0 provides 2.5 km, pan‑Canadian, 48‑hour forecasts with statistical post‑processing (PROGNOS) and hourly WEonG products, free via MSC Datamart and GeoMet web services. OEB, IESO, and AESO all rely on robust weather inputs for demand and renewable forecasting; thus integrating HRDPS/RDPS as exogenous features would materially improve regulatory alignment and technical robustness.[21][5]

### 3.4 Scenario and Risk Frameworks (CER, AESO)

Your Monte Carlo engine and stress‑test scenarios reflect an awareness of IPCC AR6, Saltelli, Morgan & Henrion, and related uncertainty literature. CER’s Energy Futures reports, AESO LTO, and OEB regional planning rely on scenario narratives with clear assumptions about policy and technology, rather than pure Monte Carlo around historical data. Mapping your scenario matrices (low/base/high plus stress modes) explicitly to CER/OEB scenario labels (e.g., "Current Measures," "Net‑Zero", high electrification) would close an alignment gap without major code changes.[16][5][2][4]

### 3.5 Asset Health and Resilience (OEB, ISO Standards)

Your Asset Health Index uses a CBRM‑lite methodology referencing OEB Appendix 2‑AB, IEEE C57.104‑2019, IEC 60076, and EA Technology practices. This aligns strongly with OEB asset condition assessment expectations and international transformer standards. Resilience scoring uses climate hazard risk assessment across multiple hazards and critical asset types, consistent with IPCC AR6 risk framing, ND‑GAIN style indices, and emerging infrastructure resilience standards (e.g., ISO 14090), though detailed ISO alignment still needs explicit mapping in documentation.[5][1]


## 4. Scientific and Regulatory Loopholes / Risky Approximations

### 4.1 Synthetic Training Data vs Real Operational Data

Several models (e.g., gas basis spread OLS with synthetic archetypes, PV fault scalar GNN trained on synthetic pandapower/pvlib scenarios, dispatch PINN trained on pandapower IEEE‑30 synthetic cases) rely heavily on simulator‑calibrated but not utility‑verified data. Regulators and utility reviewers may question domain shift risk when models trained on synthetic data are marketed for operational decision‑support in real grids. For regulatory filings, such models should be clearly labelled advisory/experimental unless validated on actual IESO/AESO or utility SCADA datasets.[22][5]

### 4.2 Hand‑Rolled ML vs Established Frameworks

Your current stack includes:
- Linear margin SVM with custom RFE, random‑forest decision stumps for price spikes, KMeans‑SMOTE, OLS gas basis regression.[5]
These are explainable and lightweight but may be less accurate and robust than widely used frameworks (e.g., XGBoost/LightGBM, N‑BEATS/N‑HiTS, TFT, iTransformer) that appear in emerging Canadian electricity price forecasting literature (e.g., CNN/GRU hybrids for Ontario market prices). Regulators do not require specific algorithms, but peer reviewers may flag reliance on basic models when stronger, well‑documented alternatives are available.[23][5]

### 4.3 Weather Placeholder and Limited Electrification Drivers

Using simple weather placeholders and not integrating HRDPS/RDPS or detailed electrification drivers (heat pumps, EVs, DER) into operational demand forecasts is a misalignment with guidance emphasizing consistent treatment of these drivers. This gap is more conceptual than code‑level: your framework can ingest exogenous features; it simply has not yet wired in the Canadian‑specific NWP and adoption trajectories.[6][9][1][5]

### 4.4 Uncertainty Without Regulatory‑Grade Coverage Guarantees

Monte Carlo quantiles and ESS metrics provide useful uncertainty estimates but lack finite‑sample coverage guarantees and calibration frameworks expected in modern probabilistic forecasting, particularly when supporting regulatory filings. Conformal prediction methods (CQR, ACI, CACP) and energy‑specific probabilistic forecasting literature offer more defensible uncertainty quantification that can be explained to regulators as providing guaranteed coverage under exchangeability assumptions.[5]


## 5. Canadian‑Specific Improvement Priorities

### 5.1 Integrate HRDPS/RDPS as Primary Weather Sources

ECCC HRDPS v7.1.0 (2.5 km pan‑Canadian, 48 h, PROGNOS post‑processing) and RDPS (10 km North‑American, 84 h) are free, high‑quality NWP products with hourly weather elements. Integrating them via MSC Datamart/GeoMet into your `weatherService` and exposing them as exogenous features for demand, renewable, and price forecasting would:[21][5]
- Align with IESO/AESO practice of using robust weather inputs for operational forecasting.[10][2]
- Support CER‑style scenario analysis using standardized weather data over long horizons.[3][4]
Implementation complexity is moderate (ETL + feature engineering), but fits within GitHub Actions and Supabase free tier constraints.[5]

### 5.2 Align Scenarios with CER/OEB Frameworks

Mapping your existing low/base/high and stress scenarios to CER and OEB scenario definitions (e.g., CER "Current Measures", "Higher", "Lower", "Net‑Zero"; OEB regional planning and CDM/DER guidelines) will improve regulatory readability. This mostly requires documentation changes and metadata additions in SharedForecastMeta (scenario label, policy drivers, electrification assumptions) rather than new model code.[1][16][3][5]

### 5.3 Enhance Demand/Electrification Modelling for Ontario

IESO’s planning uses detailed end‑use models, explicitly representing heat pump and EV adoption and building stock dynamics. You can approximate this by:[9][10]
- Adding exogenous features from CER Energy Futures and provincial adoption projections (e.g., CER EF2026 scenarios, IESO planning outlook data).[16][3][4]
- Extending your utility forecasting scenarios to include explicit household/technology drivers.
This would bring your Ontario forecasts closer to IESO/OEB expectations without full end‑use reconstruction.

### 5.4 Regulatory‑Grade Uncertainty via Conformal Prediction

Replacing or augmenting your Monte Carlo engine with conformal prediction wrappers (CQR, ACI, CACP) would align better with modern probabilistic forecasting standards and provide interpretable confidence intervals. While Canadian regulators have not yet mandated CP specifically, using finite‑sample coverage‑guaranteed intervals will strengthen any future OEB/AER/CER filings that rely on your platform’s outputs, especially around DER integration, non‑wires solutions, and resilience planning.[2][4][1][5]

### 5.5 Asset/Resilience Documentation Alignment

Your CBRM‑lite asset health scoring already references OEB and IEEE/IEC standards; packaging this into a concise "Regulatory Alignment" appendix citing OEB Appendix 2‑AB and relevant ISO/IEC references will make it easier to incorporate outputs into rate applications and asset plans. Similarly, aligning resilience scoring criteria explicitly with IPCC AR6 risk frameworks and referencing Canadian climate risk assessments (CER, NRCan) would increase trust in climate hazard scoring when discussed with regulators and utilities.[3][1][16][5]


## 6. Gap‑to‑Top‑3 Capability Table (Regulatory‑Focused Slice)

Below is a **regulatory‑focused slice** of the full gap table, limited to Canadian alignment dimensions. Ratings are qualitative 1–5 as per your rubric.

| Capability / Dimension                                 | Current Rating (1–5) | Target Rating (Top 3) | Gap Description                                                                                         | What’s Needed to Close Gap                                                                                 | Effort (L/M/H) | Priority (P0/P1/P2) |
|--------------------------------------------------------|----------------------|-----------------------|----------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|----------------|---------------------|
| Ontario demand forecasting vs OEB/IESO practice        | 3                    | 4–5                   | Transparent regression‑based forecasting but limited end‑use/electrification drivers and NWP integration | Integrate HRDPS/RDPS exogenous features; add heat pump/EV adoption drivers from CER/IESO outlooks        | M              | P0                  |
| Alberta load/price forecasting vs AESO LTO            | 2–3                  | 4                     | Scenario stress tests exist; price/basis models simple, limited policy scenario linkage                  | Align scenarios with AESO LTO narratives; upgrade price/basis models; integrate NWP and policy drivers   | M              | P1                  |
| National long‑term scenarios vs CER Energy Futures     | 2                    | 4                     | Platform uses scenarios but not aligned to CER EF naming/assumptions                                     | Map low/base/high scenarios to CER EF2026 pathways; reference CER EF methodology in documentation        | L              | P1                  |
| Weather data alignment (HRDPS/RDPS, ECCC)              | 1–2                  | 4–5                   | Placeholder weather service; no HRDPS/RDPS integration                                                    | Build GitHub Actions ETL for HRDPS/RDPS; ingest into Supabase; wire as features in forecasting pipelines | M              | P0                  |
| Uncertainty quantification for regulatory filings      | 2–3                  | 4–5                   | Monte Carlo quantiles but no CP coverage guarantees or regulatory‑oriented communication                  | Implement CQR/ACI/CACP wrappers; expose intervals and coverage metrics in SharedForecastMeta             | M              | P0                  |
| Asset health alignment with OEB Appendix 2‑AB          | 4                    | 5                     | Methodology already references OEB/IEEE/IEC but lacks explicit regulatory documentation bundle           | Create documentation appendix linking asset index directly to OEB Appendix 2‑AB and ISO/IEC standards   | L              | P1                  |
| Resilience scoring vs IPCC/ISO climate frameworks      | 3                    | 4–5                   | Hazard scoring exists; mapping to IPCC AR6 and ISO 14090 not fully explicit                             | Align scoring categories with IPCC AR6 risk typology; reference ISO 14090 and ND‑GAIN style indices     | M              | P1                  |
| Explainability for advanced ML (TSFMs, GNNs, transformers) | 2                    | 4–5                | Provenance system exists; feature‑level explainability limited, especially for complex DL models         | Add SHAP/LIME and partial‑dependence analysis; document feature importance for key regulatory use cases | M              | P2                  |


## 7. Regulatory‑First Roadmap (Solo‑Dev, Low‑Cost)

### Phase 0 (0–2 weeks) – Documentation and Scenario Alignment

- **Task 0.1 – Regulatory alignment appendix**: Draft a short, static documentation package summarizing how asset health, resilience scoring, and uncertainty treatment relate to OEB, AESO, CER, IEEE, IEC, IPCC, and ISO frameworks.[4][1][2][16][5]
- **Task 0.2 – Scenario mapping**: Define a mapping from your low/base/high and stress test modes to CER EF2026 scenarios and AESO LTO narratives, adding scenario labels and drivers into SharedForecastMeta.[2][16][3][5]
- **Task 0.3 – Regulatory metadata in outputs**: For forecasts likely to be used in filings (e.g., regional demand, asset plans), add flags indicating whether models rely on synthetic vs operational data and advisory vs validated claim labels.[22][5]

### Phase 1 (2–6 weeks) – HRDPS/RDPS Integration and Demand Alignment

- **Task 1.1 – HRDPS/RDPS ETL**: Implement GitHub Actions or Modal‑based jobs to pull HRDPS/WEonG and RDPS data via MSC Datamart/GeoMet, store pre‑processed temperature/wind/cloud features in Supabase.[21][5]
- **Task 1.2 – Weather feature wiring**: Extend `srclibweatherService.ts` and forecasting code (`srclibdemandForecaster.ts`, `srclibutilityForecasting.ts`) to use HRDPS/RDPS weather as exogenous covariates for demand and renewable forecasts.[5]
- **Task 1.3 – Ontario electrification drivers**: Pull CER EF and IESO outlook data for heat pumps, EVs, and DER to create simple time‑series drivers; integrate into utility forecasting scenarios and document their influence on load profiles.[9][16][3]

### Phase 2 (6–12 weeks) – Uncertainty and Explainability Upgrades

- **Task 2.1 – Conformal prediction layer**: Implement CQR/ACI for key forecasts (demand, price, GAICI, utility planning) using existing point forecasts and Monte Carlo as baselines; expose coverage metrics and interval widths in SharedForecastMeta.[5]
- **Task 2.2 – Explainability tooling**: For models most relevant to regulatory filings, add SHAP/LIME analysis (e.g., demand forecasting, price spike predictor, resilience scoring) and produce example explainability profiles for typical scenarios.[5]
- **Task 2.3 – Regulatory‑grade uncertainty communication**: Create simple visualization and textual templates that describe forecast ranges and risks in regulator‑friendly language (e.g., fan charts, confidence bands with policy context). This is more documentation than code but essential for filings.[4][2]

### Phase 3 (12+ weeks) – Model and Data Deepening for Regulatory Use

- **Task 3.1 – Operational data partnerships**: Explore collaborations with Canadian utilities or academics to obtain anonymized operational data for validating synthetic‑trained models (PINN dispatch, PV GNN, gas basis), reducing domain shift risk.[18][19]
- **Task 3.2 – Advanced forecasting frameworks**: Where regulatory usage demands, selectively upgrade hand‑rolled ML to well‑cited frameworks (e.g., transformers/TSFMs for demand, more robust models for Ontario price forecasting like TriConvGRU), referencing Canadian and global literature.[23][5]
- **Task 3.3 – Formal Canadian compliance features**: Once uncertainty, scenarios, and explainability are mature, add "regulatory compliance" modules that generate documentation bundles suitable for annexing to OEB/AER/CER submissions (model descriptions, validation results, assumptions).[1][2][4]


## 8. How This Interacts With the Broader Top‑3 Global Ambition

Aligning first with Canadian regulatory expectations strengthens your platform’s credibility as a serious utility/consultant‑grade tool and provides a solid foundation for broader "top‑3" global positioning. Many of the regulatory‑driven improvements—HRDPS/RDPS integration, conformal prediction, scenario mapping—are also core requirements for global best practice in energy forecasting and grid analytics. Executing Phases 0–2 will therefore both close domestic regulatory gaps and move several of your capability ratings closer to 4–5, setting the stage for later, more ambitious upgrades (TSFMs, Mamba SSMs, PI‑GN‑JODE, EV load forecasting) under your low‑cost, solo‑dev constraints.[16][2][4][5]