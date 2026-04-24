# Canada Energy Intelligence Platform (CEIP) – Top Features & Forecasting Intelligence

> **Last Updated:** April 24, 2026
> **Live Demo:** [canada-energy.netlify.app](https://canada-energy.netlify.app/)

> **For current LinkedIn outreach, lead with these proof pages first:**
> - `Consultant Data Pack` → `/api-docs`
> - `Industrial TIER Arbitrage` → `/roi-calculator`
> - Forecast trust layer → `/forecast-benchmarking`
> - Regulatory templates → `/regulatory-filing`
> - Asset condition / REA-LDC angle → `/asset-health`

---

## Part A — 15 Energy Forecasting Challenges & Algorithmic Solutions

The table below is the definitive mapping of the top 15 energy forecasting challenges to algorithmic solutions — each paired with the actual component that implements it in this codebase.

| # | Challenge | Algorithm | Priority | CEIP Component / Route |
|---|-----------|-----------|----------|------------------------|
| 1 | Unstructured Intelligence Voids | LLM Groundsource Mining | IMMEDIATE | `AgentRunner` → `/agent` · `EnergyCopilot` → `/copilot` |
| 2 | TIER 2025 Carbon Arbitrage | Deterministic Simulators | IMMEDIATE | `TIERROICalculator` → `/roi-calculator` |
| 3 | High-Dimensional Sensor Bloat | SVM-Recursive Feature Elimination | IMMEDIATE | `DemandForecastDashboard` (Load + SVM-RFE domain) → `/demand-forecast` |
| 4 | RoLR Consumer Arbitrage | Automated Logic Engine | IMMEDIATE | `RROAlertSystem` → `/rate-watchdog` |
| 5 | Rare-Event Grid Failures | KMeans-SMOTE | HIGH | `DemandForecastDashboard` (SMOTE backtest panel) → `/demand-forecast` |
| 6 | Climate Volatility & Load Drift | Wasserstein Drift Detection | HIGH | `DemandForecastDashboard` (drift assessment widget) → `/demand-forecast` |
| 7 | Wholesale Market Volatility | Random Forest Ensemble Bagging | HIGH | `DemandForecastDashboard` (AB Price Spike domain) → `/demand-forecast` |
| 8 | AESO Sub-Hourly Constraints | Physics-Informed Neural Networks | HIGH | `DemandForecastDashboard` (Weak Grid / SCED domain) → `/demand-forecast` |
| 9 | Bi-Directional PV Faults | Graph Neural Networks (GNNs) | HIGH | `DemandForecastDashboard` (PV Fault Graph domain) → `/demand-forecast` |
| 10 | Data Center "BYOP" Load | Multi-Agent Systems (MAS) | MEDIUM | `DemandForecastDashboard` (BYOP MAS domain) · `AIDataCentreDashboard` → `/ai-datacentres` |
| 11 | Cascading Transmission Risks | Ideal Point Analysis (IPA) | MEDIUM | `ResilienceMap` (non-compensatory fusion, substation masking guard) → `/resilience` |
| 12 | Low Short-Circuit Levels | AESO SCED Integration | MEDIUM | `DemandForecastDashboard` (Weak Grid / SCED domain) + `GridOptimizationDashboard` |
| 13 | Natural Gas Basis Divergence | SVM-RFE + Deep Learning | MEDIUM | `DemandForecastDashboard` (AECO vs Henry Hub domain) → `/demand-forecast` |
| 14 | Indigenous Data Sovereignty | Decentralized Digital Twins | MEDIUM | `SovereignDataVault` → `/sovereign-vault` · `AICEIReportingModule` → `/aicei` |
| 15 | Capacity Expansion Policy | Pathways Risk Overlay | LONG-TERM | `DemandForecastDashboard` (Policy Overlay domain, stranded-asset risk score) |

---

## Part B — Top 20 Platform Capabilities

---

### 1. Multi-Domain ML Forecast Engine (`DemandForecastDashboard`)

The forecasting backbone of CEIP. A single dashboard exposes **9 selectable ML domains**, each targeting a distinct forecasting challenge:

| Domain Selector | Algorithm / Technique | Challenge Addressed |
|-----------------|----------------------|---------------------|
| `Load + SVM-RFE` | Support Vector Machine – Recursive Feature Elimination | Prunes redundant SCADA/weather feeds |
| `AB Price Spike` | Random Forest Ensemble Bagging | Alberta $1,000/MWh spot-price volatility |
| `Solar` / `Wind` | Wasserstein Drift Detection | Seasonal baseline shift & climate volatility |
| `AECO vs Henry Hub` | SVM-RFE + Deep Learning | Natural gas basis spread divergence |
| `BYOP MAS` | Multi-Agent Systems | Data-centre "Bring Your Own Power" aggregate load |
| `PV Fault Graph` | Graph Neural Networks | Bi-directional inverter fault localization |
| `Policy Overlay` | Pathways Risk Overlay | Stranded-asset risk score from federal policy |
| `Weak Grid / SCED` | Physics-Informed Neural Networks + AESO SCED | Sub-hourly AC constraint enforcement |

**KMeans-SMOTE** backtest panel generates synthetic minority-event slices (blackouts, price spikes) for training, ensuring anomaly detection isn't blind to rare events.

**Wasserstein Drift Detection** monitor flags demand regime shifts in real time, downgrading forecast confidence when recent data diverges from the trained distribution.

**Route:** `/demand-forecast` | `/load-forecast` | `/ontario-forecast`

---

### 2. TIER 2025 Carbon Arbitrage Calculator (`TIERROICalculator`)

B2B deterministic simulator for Alberta's Technology Innovation and Emissions Reduction regulation at the 2025 CAD 95/tonne freeze:

- Fund payment vs. EPC market credit vs. Direct Investment (DIP) three-way comparison
- CapEx → TIER credit translation with payback period
- Shadow billing: computes compliance cost under each pathway
- Export-ready PDF/CSV for bank financing (`BankReadyExport`)
- DIP audit trail generator (`DIPAuditTrailGenerator`) for CER filings

**Routes:** `/roi-calculator` · `/tier-savings` · `/industrial` · `/dip-audit` · `/bank-export`

---

### 3. LLM Agent Framework (`AgentRunner` + `EnergyCopilot`)

Addresses the **Unstructured Intelligence Void** — regional news, utility logs, and outage data that live outside structured APIs:

- **AgentRunner** (`/agent`): Pre-built automated energy analysis workflows (Morning Briefing, Opportunity Detection, Compliance Reports). Calls `llm/agent/<workflow-id>` Supabase Edge Function with structured output schema.
- **EnergyCopilot** (`/copilot`): Multi-source AI assistant with tool calling — queries live AESO pool prices, IESO demand, ECCC weather, and synthesizes into actionable responses.
- **AskDataPage** (`/ask-data`): Natural-language-to-SQL (NL2SQL) interface over the energy data warehouse.
- **EnergyAdvisorChat**: Gemini-backed Q&A with energy-specific prompt templates and response caching.

---

### 4. Alberta Consumer Rate Watchdog (`RROAlertSystem`)

Automated logic engine targeting **RoLR (Rate of Last Resort) consumer arbitrage**:

- Live AESO pool-price polling → estimated RRO computation (`pool/10 + T&D + admin`)
- Month-over-month RRO trend chart (12-month lookback, AESO-calibrated data)
- **Switch recommendation trigger** when current RRO > 14 ¢/kWh or forecast RRO > 16 ¢/kWh
- Retailer comparison with guaranteed savings output
- Integrated with `ShadowBillingModule` for side-by-side bill simulation

**Routes:** `/watchdog` · `/rate-watchdog` · `/rro`

---

### 5. Forecast Benchmarking Trust Layer (`ForecastBenchmarkingPage`)

Evaluate energy forecasts against industry baselines across 1h–48h horizons:

- **Metrics:** MAE, MAPE, RMSE vs. persistence and seasonal-naïve benchmarks
- **DataFreshnessBadge** and **ProvenanceBadge** for source traceability
- Designed for consulting firms, grid operators, municipal planners, and regulatory conversations

**Route:** `/forecast-benchmarking`

---

### 6. Indigenous Data Sovereignty Platform (`SovereignDataVault` + `AICEIReportingModule`)

OCAP®-aligned architecture implementing **Decentralized Digital Twin** principles for First Nations microgrid data:

- **OCAP® Score** (0–4) dashboard: Ownership, Control, Access, Possession compliance status
- Data residency controls — community data never leaves designated jurisdiction
- **AICEIReportingModule**: Grant compliance reporting for AICEI-funded Indigenous communities
- **FunderReportingDashboard**: Templated reports for Wah-ila-toos, CERRC, Northern REACHE
- **NativeLandTerritorySelector**: Territory mapping with FPIC consultation status
- **IndigenousProjectForm**: UNDRIP-aware multi-step project intake

**Routes:** `/sovereign-vault` · `/aicei` · `/indigenous` · `/funder-reporting`

---

### 7. Cascading Transmission Risk Dashboard (`ResilienceMap`)

Implements **Ideal Point Analysis (IPA)** — non-compensatory mathematics that prevent regional abundance from masking local failure:

- Grid topology node visualization with substation-level failure alerts
- **Non-compensatory fusion logic**: "An abundance of regional power does not mask a fatal local substation failure"
- Crisis scenario simulator (wildfire, heatwave, cyberattack) with resilience scoring
- Integrated with `CrisisScenarioSimulator` for what-if modeling

**Route:** `/resilience`

---

### 8. AI Data Centre & BYOP Load Tracker (`AIDataCentreDashboard`)

Multi-Agent Systems model tracking the ~30% of data-centre capacity migrating to self-supplied "Bring Your Own Power":

- Project pipeline across Canadian provinces (MW capacity, fuel type, status)
- Aggregate BYOP load forecasting linked to `DemandForecastDashboard` BYOP MAS domain
- Interconnection queue tracking for data-centre grid tie-ins
- `AIDemandScenarioSlider`: interactive MW demand scenario modeling

**Routes:** `/ai-datacentres` · `/ai-data-centre`

---

### 9. Production-Grade Dashboard Suite (35+ Modules)

A comprehensive suite of React dashboards covering every aspect of Canadian energy:

| Category | Dashboards |
|----------|------------|
| **Grid Operations** | RealTime, GridOptimization, GridInterconnectionQueue, CapacityMarket |
| **Renewables** | RenewableOptimization, CurtailmentAnalytics, StorageDispatch |
| **Future Energy** | AIDataCentre, HydrogenEconomy, SMRDeployment, EVCharging, HeatPumps |
| **Decarbonization** | CarbonEmissions, CCUSProjects, IndustrialDecarb, ClimatePolicy |
| **Finance** | ESGFinance, Investment, Analytics, Trends |
| **Specialized** | Indigenous, CriticalMinerals, VPPAggregation, DigitalTwin, Arctic |

---

### 10. Regulatory Filing Templates (High-Value B2B Proof)

Export-ready filing templates for regulated utilities:

- **AUC Rule 005** schedules for Alberta utilities and REAs
- **OEB Chapter 5 DSP** sections for Ontario utility planning workflows
- Sample preview + CSV/JSON export for stakeholder walkthroughs
- CER compliance dashboard with regulatory intelligence module

**Routes:** `/regulatory-filing` · `/rule-005` · `/oeb-filing`

---

### 11. Asset Health Index — CBRM-Lite (`AssetHealthDashboard`)

CSV-based utility asset scoring for REAs, small LDCs, and consultant workflows:

- CSV upload → health index scoring (0–100) per asset
- Condition and risk visualization (Recharts)
- Export-ready results for asset-condition conversations
- Feeds `BankReadyExport` for green-loan financing packages

**Routes:** `/asset-health` · `/cbrm` · `/asset-scoring`

---

### 12. Real-Time Grid & Market Data Integration

Live and historical integrations with Canadian energy operators:

- **AESO** (Alberta): Pool prices, carbon intensity, storage dispatch, RRO estimation
- **IESO** (Ontario): Demand, prices, generation mix
- **ECCC**: Weather data, climate projections
- **NPRI/CER**: Emissions, regulatory compliance
- `DataFreshnessBadge` + `ProvenanceBadge` + `DataQualityBadge` for full data lineage

---

### 13. Retailer Hedging & Shadow Billing (`RetailerHedgingDashboard` + `ShadowBillingModule`)

Trading-focused analytics for Alberta's deregulated power pool:

- Forward curve vs. RRO comparison for retailer risk management
- Shadow billing: simulate electricity bill under competing retail contracts
- Linked to `CreditBankingDashboard` for TIER credit position management

**Routes:** `/hedging` · `/shadow-billing` · `/credit-banking`

---

### 14. API-First Architecture & Developer Platform

Secure API and data-access surfaces for integrations and consultant workflows:

| Endpoint | Data |
|----------|------|
| `/api/v2/ai-datacentres` | AI infrastructure projects |
| `/api/v2/hydrogen` | Hydrogen economy data |
| `/api/v2/minerals` | Critical minerals supply chain |
| `/api/v2/regulatory` | Compliance data |
| `/api/v2/esg` | ESG scores and metrics |

**Features:** API key authentication, telemetry logging, RLS policies, per-IP rate limiting, usage-based billing foundation

**Routes:** `/api-docs` · `/api-keys` · `/developers`

---

### 15. ESG & Sustainable Finance Analytics (`ESGFinanceDashboard`)

Track green finance across Canada:

- Green bonds and sustainability-linked loans
- ESG scores (MSCI, Sustainalytics integration)
- Carbon pricing exposure analysis (OBPS compliance)
- Industrial efficiency project pipeline
- `BankReadyExport`: bank-ready green-loan application package

---

### 16. OWASP-Aligned Security Posture

Enterprise security practices:

- Input validation helpers
- Strict CORS allowlists (environment-based)
- No hardcoded secrets (environment variables throughout)
- Safe error handling — no stack traces to clients (`ErrorBoundary`, `RouteErrorFallback`)
- Row-Level Security on all Supabase tables
- `SecurityDashboard` for posture visibility

---

### 17. EdTech: Cohort & Certificate System

Credentialed learning platform for energy education:

- Cohort creation, email invitations, completion tracking
- Badge-based achievements + certificate tracks
- Module player with progression gating
- Training Coordinators landing page for B2B cohort sales

**Routes:** `/admin/cohorts` · `/certificates` · `/badges` · `/training-coordinators`

---

### 18. Digital Twin & Scenario Modeling (`DigitalTwinDashboard`)

Interactive energy system simulation:

- Grid topology visualization
- What-if scenario builder
- Crisis simulation (wildfire, heatwave, cyberattack)
- Resilience scoring linked to `ResilienceMap`

**Route:** `/digital-twin`

---

### 19. Modern Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS utility classes |
| Charts | Recharts, Mapbox |
| Backend | Supabase (Postgres + Edge Functions) |
| Auth | Supabase Auth, Whop SDK |
| Hosting | Netlify (CDN, CI/CD, preview branches) |
| AI | Gemini API (LLM Q&A, agent workflows) |
| Payments | Paddle (Whop marketplace integration) |

---

### 20. Production Deployment Story

Ready for commercial deployment:

- ✅ Netlify CI/CD pipeline with preview/staging branches
- ✅ Supabase production environment with SQL migration scripts
- ✅ Environment-based CORS and RLS
- ✅ Whop SDK + Paddle integration
- ✅ 50+ routes with lazy-loading code splitting
- ✅ OCAP®-aligned data residency architecture
- ✅ OpenAPI documentation (`/api-docs`)

---

## Quick Route Reference

| Category | Routes |
|----------|--------|
| **Main** | `/`, `/dashboard`, `/about`, `/contact` |
| **ML Forecast** | `/demand-forecast`, `/forecast-benchmarking`, `/load-forecast` |
| **TIER / Carbon** | `/roi-calculator`, `/tier-savings`, `/dip-audit`, `/bank-export`, `/credit-banking` |
| **Consumer Tools** | `/watchdog`, `/rate-watchdog`, `/solar-wizard`, `/shadow-billing` |
| **AI / Agent** | `/agent`, `/copilot`, `/ask-data`, `/my-energy-ai` |
| **Analytics** | `/analytics`, `/trends`, `/investment` |
| **Grid Ops** | `/resilience`, `/digital-twin`, `/renewable-optimization`, `/curtailment-reduction` |
| **Future Energy** | `/ai-datacentres`, `/hydrogen`, `/smr-deployment` |
| **Indigenous** | `/indigenous`, `/aicei`, `/sovereign-vault`, `/funder-reporting` |
| **B2B** | `/hire-me`, `/for-employers`, `/enterprise`, `/municipal`, `/hedging` |
| **Regulatory** | `/regulatory-filing`, `/rule-005`, `/oeb-filing`, `/compliance` |
| **API** | `/api-docs`, `/api-keys`, `/developers` |
| **Learning** | `/certificates`, `/badges`, `/admin/cohorts`, `/training-coordinators` |

---

*Built by Sanjay Bhargava | [LinkedIn](https://linkedin.com/in/bhargavasanjay) | [Portfolio](https://canada-energy.netlify.app/)*