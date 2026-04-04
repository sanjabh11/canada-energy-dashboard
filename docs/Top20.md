# Canada Energy Intelligence Platform (CEIP) – Top 20 Features

> **Last Updated:** March 9, 2026  
> **Live Demo:** [canada-energy.netlify.app](https://canada-energy.netlify.app/)

> **For current LinkedIn outreach, lead with these proof pages first:**
> - `Consultant Data Pack` → `/api-docs`
> - `Industrial TIER Pack` → `/roi-calculator`
> - Forecast trust layer → `/forecast-benchmarking`
> - Regulatory templates → `/regulatory-filing`
> - Asset condition / REA-LDC angle → `/asset-health`

---

## 1. Production-Grade Dashboard Suite (35+ Modules)

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

## 2. Real-Time Grid & Market Data Integration

Live and historical integrations with Canadian energy operators:

- **IESO** (Ontario): Demand, prices, generation mix
- **AESO** (Alberta): Pool prices, carbon intensity, storage dispatch
- **ECCC**: Weather data, climate projections
- **NPRI/CER**: Emissions, regulatory compliance

---

## 3. 28 Navigation Tabs Organized by Value

**Core Navigation (14 tabs):**
Home → Dashboard → AI Data Centres → Analytics → Hydrogen → Critical Minerals → EV Charging → Carbon → ESG Finance → Industrial Decarb → CCUS → Investment → Renewable Optimization → My Energy AI

**More Features (12 tabs):**
Storage Dispatch → SMR Tracker → Capacity Market → VPP/DER → Provinces → Grid Queue → Heat Pumps → Curtailment → Grid Ops → Digital Twin → Climate Policy → Arctic Energy

**Footer Settings:**
Indigenous Energy | Stakeholders | Security | Features

---

## 4. Alberta-Focused Consumer Tools

Six features targeting Alberta market opportunities:

| Tool | Route | Purpose |
|------|-------|---------|
| **Solar Wizard** | `/solar-wizard` | TurboTax for Micro-generation permits |
| **Rate Watchdog** | `/watchdog` | Alberta electricity rate comparison and RoLR monitoring |
| **AICEI Reporting** | `/aicei` | Indigenous grant compliance reporting |
| **Hire Me Page** | `/hire-me` | LMIA-ready employer landing page |
| **Resume** | `/resume-canada.md` | NOC 21232 aligned resume |
| **Household AI** | `/my-energy-ai` | Personalized energy recommendations |

---

## 5. Forecast Benchmarking Tool (NEW)

Evaluate energy forecasts against industry baselines (MAE, MAPE, RMSE) across 1h-48h horizons. Features persistence and seasonal naive benchmarks for Canadian renewable energy. Designed as a **trust layer** for consulting firms, grid operators, municipal planners, and regulatory conversations.

**Route:** `/forecast-benchmarking`

---

## 6. Regulatory Filing Templates (High-Value B2B Proof)

Export-ready filing templates for:

- **AUC Rule 005** schedules for Alberta utilities / REAs
- **OEB Chapter 5 DSP** sections for Ontario utility planning workflows
- sample preview + CSV export for stakeholder walkthroughs

**Route:** `/regulatory-filing`

---

## 7. Indigenous Energy Sovereignty Dashboard (Early Access)

OCAP®-aligned architecture for First Nations energy projects — seeking community co-design partners:

- Territory mapping with consultation status
- FPIC workflow management (3 stages)
- Traditional Ecological Knowledge (TEK) integration
- Multi-step project intake form (UNDRIP-aware)
- Funder report templates (Wah-ila-toos, CERRC, Northern REACHE)
- Sovereign Data Vault with data residency controls (Early Access — production hardening still in progress)

---

## 8. ESG & Sustainable Finance Analytics

Track green finance across Canada:

- Green bonds and sustainability-linked loans
- ESG scores (MSCI, Sustainalytics integration)
- Carbon pricing exposure analysis
- OBPS compliance tracking
- Industrial efficiency project pipeline

---

## 9. AI/LLM Energy Analysis

LLM-powered energy Q&A via Gemini integration:

- Natural language energy Q&A (Energy Advisor Chat)
- LLM Edge Function with energy context
- Response caching for common queries

**Roadmap (not yet built):**
- RAG with pgvector for document retrieval
- Multi-model ensemble (Gemini + Claude)
- Energy-specific prompt templates

---

## 10. Regulatory Intelligence Module

Structured compliance tracking:

- CER regulatory filings
- Provincial GHG emissions targets
- Climate policy database
- Interconnection queue status
- Carbon target progress tracking

---

## 11. Asset Health Index (CSV-Based)

CBRM-lite utility asset scoring for REAs, small LDCs, and consultant workflows:

- CSV upload workflow
- health index scoring (0-100)
- condition and risk visualization
- export-ready results for asset-condition discussions

**Route:** `/asset-health`

---

## 12. EdTech: Cohort Admin System

Credentialed learning platform for energy education:

- Cohort creation and management
- Email-based learner invitations
- Completion tracking and certificates
- Badge-based achievements
- Certificate tracks with module progression

**Routes:** `/admin/cohorts` | `/certificates` | `/badges`

---

## 13. API-First Architecture

Secure API and data-access surfaces for integrations and consultant workflows:

| Endpoint | Data |
|----------|------|
| `/api/v2/ai-datacentres` | AI infrastructure projects |
| `/api/v2/hydrogen` | Hydrogen economy data |
| `/api/v2/minerals` | Critical minerals supply chain |
| `/api/v2/regulatory` | Compliance data |
| `/api/v2/esg` | ESG scores and metrics |

**Features:** API key authentication, telemetry logging, RLS policies, consultant-pack commercial packaging

---

## 14. Authoritative Canadian Data Sources

Data sourced from official Canadian energy authorities:

- **Grid Data:** AESO (Alberta pool price, generation), IESO (Ontario demand, prices)
- **Emissions:** ECCC, NPRI, CER regulatory filings
- **ESG:** MSCI, Sustainalytics, Yahoo Finance
- **Government:** Provincial energy programs, Alberta.ca TIER data

Dashboards attempt live API fetches and fall back to cached/sample data when sources are unavailable. Data provenance and freshness are documented using the **DataFreshnessBadge** and related freshness controls.

---

## 15. OWASP-Aligned Security Posture

Enterprise security practices:

- Input validation helpers
- Strict CORS allowlists
- No hardcoded secrets (environment variables)
- Safe error handling (no stack traces to clients)
- Row-Level Security on all tables

---

## 16. Telemetry & Rate Limiting

Commercial-ready usage tracking:

- `api_usage` table logs endpoint, status, IP, filters
- Per-key rate limit scaffold
- Per-IP throttling support
- Usage-based billing foundation

---

## 17. User Interface Components

**Header Actions:**
- 🔄 Refresh data
- 🌐 Language switcher (EN/FR)
- 🔐 Auth button (Sign In/Out)
- ❓ Help button (contextual)

**Navigation:**
- Horizontal ribbon with 14+ tabs
- "More" dropdown for additional features
- Footer settings menu

**Dashboard Controls:**
- Dataset selector dropdown
- Filter toggles
- Date range picker
- Export buttons (CSV, JSON)

---

## 18. Storage Dispatch & Revenue Optimization

Trading-focused analytics:

- Battery SoC trajectories
- Dispatch event logging
- Curtailment reduction metrics
- Revenue impact calculations
- ROI modeling for storage assets

---

## 19. Digital Twin & Scenario Modeling

Interactive energy system simulation:

- Grid topology visualization
- What-if scenario builder
- Crisis simulation (wildfire, heatwave, cyberattack)
- Resilience scoring

---

## 20. Employer & Immigration Integration

LMIA-ready hiring page for Alberta employers:

- NOC code alignment (21232 Software Developer)
- Case studies with live feature links
- Direct contact and resume download
- GTS (Global Talent Stream) documentation

**Route:** `/hire-me` | `/for-employers`

---

## 18. Comprehensive Documentation

20k+ words of implementation docs:

- Gap analysis and QA checklists
- Security audits
- LLM enhancement plans
- Deployment runbooks
- API documentation

---

## 19. Modern Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind-style utility classes |
| Charts | Recharts, Mapbox |
| Backend | Supabase (Postgres + Edge Functions) |
| Auth | Supabase Auth, Whop SDK |
| Hosting | Netlify (CDN, CI/CD) |

---

## 20. Production Deployment Story

Ready for commercial deployment:

- ✅ Netlify CI/CD pipeline
- ✅ Supabase production environment
- ✅ Environment-based CORS
- ✅ SQL migration scripts
- ✅ Preview/staging branches
- ✅ Whop SDK integration

---

## Quick Route Reference

| Category | Routes |
|----------|--------|
| **Main** | `/`, `/dashboard`, `/about`, `/contact` |
| **Analytics** | `/analytics`, `/trends`, `/investment` |
| **Energy** | `/renewable-optimization`, `/curtailment-reduction`, `/resilience`, `/forecast-benchmarking` |
| **Future** | `/ai-datacentres`, `/hydrogen`, `/smr-deployment` |
| **Consumer** | `/my-energy-ai`, `/solar-wizard`, `/rate-alerts` |
| **Indigenous** | `/indigenous`, `/aicei`, `/funder-reporting` |
| **B2B** | `/hire-me`, `/for-employers`, `/incubators` |
| **API** | `/api-docs`, `/api-keys` |
| **Learning** | `/certificates`, `/badges`, `/admin/cohorts` |

---

*Built by Sanjay Bhargava | [LinkedIn](https://linkedin.com/in/bhargavasanjay) | [Portfolio](https://canada-energy.netlify.app/)*