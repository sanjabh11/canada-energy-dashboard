# 🚀 Phase 2 Implementation Plan - Critical Features
**Date**: November 12, 2025
**Timeline**: 30 days (Nov 12 - Dec 15, 2025)
**Priority**: **CRITICAL for Sponsorship Conversion**

---

## 📋 OVERVIEW

Phase 2 focuses on the **HIGHEST SPONSORSHIP ROI features**:
1. **CCUS Project Tracker** - $30B Alberta CCUS corridor
2. **Enhanced Indigenous Equity/Revenue** - Reconciliation & ESG
3. **SMR Deployment Tracker** - Nuclear innovation
4. **Multi-Province Grid Interconnection Queue** - IESO transparency

**Success Criteria**:
- ✅ All 4 features deployed to production
- ✅ Real data populated for each feature
- ✅ Integration with existing dashboards
- ✅ Sponsor pitch deck prepared
- ✅ 3+ sponsor meetings booked by Dec 15

---

## 🎯 FEATURE 1: CCUS PROJECT TRACKER

### **Strategic Importance** 🚨
- **Investment Scale**: $30B+ Alberta CCUS corridor
- **Key Players**: Pathways Alliance ($16.5B), Shell, Imperial Oil, Suncor, Cenovus
- **Government Support**: Federal 50% tax credit ($2.6B), Alberta $176M
- **Regulatory**: Paris Agreement commitments, oil sands emissions cap

### **Target Sponsors**:
1. **Pathways Alliance** - Need transparency for their $16.5B proposal
2. **Shell** - Quest CCUS (1M tonnes CO2/year operational)
3. **Imperial Oil** - Strathcona Refinery CCUS
4. **Suncor** - Multiple CCUS projects
5. **Alberta Carbon Trunk Line** - Pipeline operator
6. **Federal NRCan** - CCUS policy monitoring

### **Database Schema** (20251112001_ccus_infrastructure.sql)

```sql
-- CCUS Facilities Registry
CREATE TABLE IF NOT EXISTS ccus_facilities (
  id TEXT PRIMARY KEY,
  facility_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  location_city TEXT,
  province TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Status
  status TEXT CHECK (status IN ('Proposed', 'Under Development', 'Under Construction', 'Commissioning', 'Operational', 'Paused', 'Decommissioned')) DEFAULT 'Proposed',
  announcement_date DATE,
  expected_operational_date DATE,
  actual_operational_date DATE,

  -- Capture Capacity
  design_capture_capacity_mt_per_year NUMERIC NOT NULL, -- Megatonnes CO2 per year
  current_capture_capacity_mt_per_year NUMERIC,

  -- Technology
  capture_technology TEXT, -- Post-combustion, Pre-combustion, Oxy-fuel, Direct Air Capture
  capture_point_source TEXT, -- Oil Sands Upgrader, Refinery, Power Plant, Cement, Steel, Ethanol, DAC

  -- Storage
  storage_type TEXT CHECK (storage_type IN ('Saline Aquifer', 'Depleted Oil/Gas Reservoir', 'Enhanced Oil Recovery', 'Mineralization')),
  storage_site_name TEXT,
  storage_capacity_mt NUMERIC, -- Total storage reservoir capacity
  cumulative_stored_mt NUMERIC DEFAULT 0, -- Total CO2 stored to date

  -- Economics
  capital_cost_cad NUMERIC,
  operating_cost_per_tonne_cad NUMERIC,
  federal_tax_credit_value_cad NUMERIC, -- 50% or 60% of capex
  carbon_credit_revenue_annual_cad NUMERIC,

  -- Emissions Impact
  baseline_emissions_mt_per_year NUMERIC, -- Emissions without CCUS
  abated_emissions_mt_per_year NUMERIC, -- Actual CO2 captured and stored

  -- Integration
  linked_hydrogen_facility_id TEXT, -- For blue hydrogen CCUS
  linked_ai_data_centre_id TEXT, -- For data centre CCUS

  -- Regulatory
  federal_approval_status TEXT,
  provincial_approval_status TEXT,
  environmental_assessment_status TEXT,

  -- Data
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ccus_facilities_province ON ccus_facilities(province);
CREATE INDEX idx_ccus_facilities_status ON ccus_facilities(status);
CREATE INDEX idx_ccus_facilities_operator ON ccus_facilities(operator);
CREATE INDEX idx_ccus_facilities_capacity ON ccus_facilities(design_capture_capacity_mt_per_year DESC);

-- CCUS Capture Data (Time Series)
CREATE TABLE IF NOT EXISTS ccus_capture_data (
  id SERIAL PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES ccus_facilities(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,

  -- Capture Performance
  co2_captured_tonnes_per_day NUMERIC NOT NULL,
  capture_rate_percent NUMERIC CHECK (capture_rate_percent >= 0 AND capture_rate_percent <= 100), -- % of emissions captured

  -- Energy Penalty
  energy_consumed_mwh NUMERIC, -- Energy used for capture
  energy_penalty_percent NUMERIC, -- % reduction in net power output

  -- Storage
  co2_injected_tonnes_per_day NUMERIC,
  reservoir_pressure_bar NUMERIC,

  -- Economics
  carbon_credit_price_cad_per_tonne NUMERIC,
  daily_revenue_cad NUMERIC,

  -- Operations
  uptime_percent NUMERIC CHECK (uptime_percent >= 0 AND uptime_percent <= 100),
  downtime_reason TEXT,

  -- Data Quality
  data_quality TEXT CHECK (data_quality IN ('Real-time', 'Estimated', 'Forecasted', 'Backfilled')),

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(facility_id, timestamp)
);

CREATE INDEX idx_ccus_capture_timestamp ON ccus_capture_data(timestamp DESC);
CREATE INDEX idx_ccus_capture_facility ON ccus_capture_data(facility_id);

-- CCUS Pipelines
CREATE TABLE IF NOT EXISTS ccus_pipelines (
  id TEXT PRIMARY KEY,
  pipeline_name TEXT NOT NULL,
  operator TEXT,

  -- Route
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  total_length_km NUMERIC NOT NULL,

  -- Capacity
  design_capacity_mt_per_year NUMERIC NOT NULL,
  current_throughput_mt_per_year NUMERIC,

  -- Status
  status TEXT CHECK (status IN ('Proposed', 'Under Development', 'Under Construction', 'Operational', 'Decommissioned')) DEFAULT 'Proposed',
  expected_operational_date DATE,
  actual_operational_date DATE,

  -- Connected Facilities
  connected_capture_facilities TEXT[], -- Array of facility IDs
  connected_storage_sites TEXT[], -- Array of storage site IDs

  -- Economics
  capital_cost_cad NUMERIC,
  tariff_cad_per_tonne NUMERIC, -- Transportation fee

  -- Technical
  pipeline_diameter_inches NUMERIC,
  operating_pressure_bar NUMERIC,

  -- Data
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ccus_pipelines_operator ON ccus_pipelines(operator);
CREATE INDEX idx_ccus_pipelines_status ON ccus_pipelines(status);

-- CCUS Storage Sites
CREATE TABLE IF NOT EXISTS ccus_storage_sites (
  id TEXT PRIMARY KEY,
  site_name TEXT NOT NULL,
  operator TEXT,
  location TEXT NOT NULL,
  province TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Reservoir Type
  reservoir_type TEXT CHECK (reservoir_type IN ('Saline Aquifer', 'Depleted Oil Reservoir', 'Depleted Gas Reservoir', 'Coal Seam', 'Basalt Formation')),
  depth_meters NUMERIC,

  -- Capacity
  total_storage_capacity_mt NUMERIC NOT NULL, -- Total geological capacity
  cumulative_injected_mt NUMERIC DEFAULT 0,
  remaining_capacity_mt NUMERIC,

  -- Injection
  max_injection_rate_mt_per_year NUMERIC,
  active_injection_wells INTEGER,

  -- Monitoring
  monitoring_status TEXT CHECK (monitoring_status IN ('Active', 'Closed', 'Planned')),
  last_monitoring_date DATE,
  containment_verified BOOLEAN DEFAULT TRUE,

  -- Regulatory
  storage_permit_number TEXT,
  permit_expiry_date DATE,

  -- Economics
  storage_fee_cad_per_tonne NUMERIC,

  -- Data
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ccus_storage_province ON ccus_storage_sites(province);
CREATE INDEX idx_ccus_storage_capacity ON ccus_storage_sites(remaining_capacity_mt DESC);

-- CCUS Economics & Incentives
CREATE TABLE IF NOT EXISTS ccus_economics (
  id SERIAL PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES ccus_facilities(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,

  -- Capital
  capex_cad NUMERIC,
  federal_tax_credit_cad NUMERIC, -- 50% for storage, 60% for DAC
  provincial_grant_cad NUMERIC,

  -- Operating Costs
  opex_annual_cad NUMERIC,
  capture_cost_per_tonne_cad NUMERIC,
  transport_cost_per_tonne_cad NUMERIC,
  storage_cost_per_tonne_cad NUMERIC,

  -- Revenue
  carbon_credit_revenue_cad NUMERIC, -- Alberta TIER credits or federal offset credits
  eor_revenue_cad NUMERIC, -- Enhanced oil recovery revenue (if applicable)

  -- Incentives
  alberta_tier_credits_tonnes NUMERIC,
  federal_offset_credits_tonnes NUMERIC,
  carbon_credit_price_cad_per_tonne NUMERIC,

  -- ROI
  total_revenue_cad NUMERIC,
  total_cost_cad NUMERIC,
  net_present_value_cad NUMERIC,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(facility_id, year)
);

CREATE INDEX idx_ccus_economics_facility ON ccus_economics(facility_id);
CREATE INDEX idx_ccus_economics_year ON ccus_economics(year DESC);

-- Pathways Alliance Projects (Special table for $16.5B proposal)
CREATE TABLE IF NOT EXISTS pathways_alliance_projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  member_company TEXT NOT NULL, -- Suncor, CNRL, Cenovus, Imperial, ConocoPhillips, MEG Energy

  -- Scope
  facility_type TEXT, -- Upgrader, In-Situ Operations, Mining
  capture_capacity_mt_per_year NUMERIC,

  -- Status
  status TEXT CHECK (status IN ('Proposed', 'Awaiting Federal Decision', 'Approved', 'Under Construction', 'Operational', 'On Hold', 'Cancelled')),

  -- Economics
  capex_cad NUMERIC,
  federal_tax_credit_requested_cad NUMERIC,

  -- Timeline
  proposed_start_date DATE,
  target_operational_date DATE,

  -- Integration
  connected_to_actl BOOLEAN DEFAULT FALSE, -- Alberta Carbon Trunk Line

  -- Policy Dependencies
  requires_federal_tax_credit BOOLEAN DEFAULT TRUE,
  requires_emissions_cap_clarity BOOLEAN DEFAULT TRUE,

  -- Data
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pathways_projects_company ON pathways_alliance_projects(member_company);
CREATE INDEX idx_pathways_projects_status ON pathways_alliance_projects(status);

-- Seed Data: Operational CCUS Projects
INSERT INTO ccus_facilities (id, facility_name, operator, location_city, province, latitude, longitude, status, actual_operational_date, design_capture_capacity_mt_per_year, current_capture_capacity_mt_per_year, capture_technology, capture_point_source, storage_type, storage_site_name, capital_cost_cad, abated_emissions_mt_per_year, data_source)
VALUES
  ('quest-ccus', 'Quest CCUS Project', 'Shell Canada', 'Fort Saskatchewan', 'AB', 53.7267, -113.2099, 'Operational', '2015-11-01', 1.2, 1.0, 'Post-combustion amine scrubbing', 'Hydrogen Production (Scotford Upgrader)', 'Saline Aquifer', 'Basal Cambrian Sands', 1350000000, 1.0, 'Shell Canada Annual Reports'),

  ('nwrp-ccus', 'North West Redwater Partnership CCUS', 'NWR Refining', 'Redwater', 'AB', 53.9500, -113.3000, 'Operational', '2020-06-01', 1.2, 0.8, 'Pre-combustion', 'Bitumen Refinery', 'Saline Aquifer', 'Nisku Formation', 500000000, 0.8, 'NWR Partnership'),

  ('actl-pipeline', 'Alberta Carbon Trunk Line', 'Wolf Midstream', 'Edmonton to Red Deer', 'AB', 52.5000, -114.0000, 'Operational', '2020-06-01', 14.6, 2.5, NULL, NULL, 'Enhanced Oil Recovery', 'Clive oil field', 1200000000, 2.5, 'Wolf Midstream'),

  ('boundary-dam-ccus', 'Boundary Dam 3 CCUS', 'SaskPower', 'Estevan', 'SK', 49.1300, -103.0100, 'Operational', '2014-10-01', 1.0, 0.6, 'Post-combustion amine scrubbing', 'Coal-fired Power Plant', 'Enhanced Oil Recovery', 'Weyburn oil field', 1500000000, 0.6, 'SaskPower Annual Reports');

-- Seed Data: Pathways Alliance Proposed Projects
INSERT INTO pathways_alliance_projects (id, project_name, member_company, facility_type, capture_capacity_mt_per_year, status, capex_cad, federal_tax_credit_requested_cad, target_operational_date, connected_to_actl)
VALUES
  ('pathways-phase1', 'Pathways Phase 1 - Fort Hills', 'Suncor', 'Mining', 3.0, 'Awaiting Federal Decision', 5000000000, 2500000000, '2030-01-01', TRUE),
  ('pathways-phase1-cnrl', 'Pathways Phase 1 - Horizon', 'CNRL', 'Mining', 4.0, 'Awaiting Federal Decision', 6500000000, 3250000000, '2030-01-01', TRUE),
  ('pathways-phase1-cenovus', 'Pathways Phase 1 - Christina Lake', 'Cenovus', 'In-Situ Operations', 2.5, 'Awaiting Federal Decision', 4000000000, 2000000000, '2030-01-01', FALSE),
  ('pathways-phase1-imperial', 'Pathways Phase 1 - Kearl', 'Imperial Oil', 'Mining', 2.0, 'Awaiting Federal Decision', 3500000000, 1750000000, '2030-01-01', TRUE);

COMMENT ON TABLE ccus_facilities IS 'Registry of CCUS facilities with capture capacity, technology, storage, and economics';
COMMENT ON TABLE ccus_pipelines IS 'CO2 transportation pipelines connecting capture facilities to storage sites';
COMMENT ON TABLE ccus_storage_sites IS 'Geological storage reservoirs for captured CO2';
COMMENT ON TABLE pathways_alliance_projects IS 'Pathways Alliance $16.5B CCUS proposal tracking';
```

### **Frontend Component** (CCUSProjectTracker.tsx)

**Key Visualizations**:
1. **Map**: Alberta CCUS corridor (Edmonton-Calgary)
   - Capture facilities (Quest, Sturgeon, Strathcona)
   - ACTL pipeline
   - Storage sites (Clive, Redwater)
   - Pathways Alliance proposed projects

2. **Capture Capacity Chart**: Mt CO2/year by facility
   - Operational vs Proposed
   - Stacked bar: Oil Sands, Refining, Power, Industrial

3. **Economics Dashboard**:
   - Federal tax credit tracker ($2.6B allocated)
   - Carbon credit revenue
   - Cost per tonne trends

4. **Pathways Alliance Tracker**:
   - $16.5B proposal status
   - Member company breakdown
   - Timeline to 2030

5. **Storage Monitoring**:
   - Cumulative CO2 stored (Mt)
   - Reservoir capacity remaining
   - Containment verification status

6. **Policy Tracker**:
   - Federal tax credit rates (50% storage, 60% DAC)
   - Alberta TIER credit prices
   - Emissions cap proposals

### **Edge Function** (api-v2-ccus)

**Endpoints**:
- `GET /ccus?province=AB&status=Operational` - Facilities list
- `GET /ccus/facility/{id}` - Facility details with time-series data
- `GET /ccus/pathways` - Pathways Alliance projects
- `GET /ccus/pipelines` - Pipeline network
- `GET /ccus/storage` - Storage site availability
- `GET /ccus/economics` - Tax credits, carbon credits, ROI

### **Timeline**:
- **Day 1-2** (Nov 12-13): Database schema + migration ✅
- **Day 3-5** (Nov 14-16): Seed real data (Quest, ACTL, Pathways)
- **Day 6-10** (Nov 17-21): Frontend dashboard component
- **Day 11-12** (Nov 22-23): Edge function API
- **Day 13-14** (Nov 24-25): Testing & integration
- **Day 15** (Nov 26): Deploy to production

---

## 🎯 FEATURE 2: ENHANCED INDIGENOUS EQUITY/REVENUE

### **Strategic Importance** 🚨
- **Reconciliation**: Truth and Reconciliation Commission Calls to Action
- **ESG**: Critical for corporate ESG ratings and institutional investment
- **Federal Funding**: Many programs require Indigenous equity partnerships
- **Legal**: UNDRIP (United Nations Declaration on the Rights of Indigenous Peoples) compliance

### **Target Sponsors**:
1. **Federal NRCan** - Indigenous equity requirements for funding
2. **ESG Rating Agencies** - S&P, MSCI, Sustainalytics
3. **Pension Funds** - CPP Investments, OMERS, AIMCO (require ESG data)
4. **Energy Companies** - Suncor, TC Energy, Enbridge (reconciliation commitments)

### **Database Enhancement** (20251112002_indigenous_equity_enhancement.sql)

```sql
-- Indigenous Equity Ownership
CREATE TABLE IF NOT EXISTS indigenous_equity_ownership (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL, -- Solar, Wind, Hydro, Pipeline, Transmission, Mining
  indigenous_community TEXT NOT NULL,
  nation_or_band TEXT,

  -- Equity Details
  ownership_percent NUMERIC CHECK (ownership_percent >= 0 AND ownership_percent <= 100),
  ownership_type TEXT CHECK (ownership_type IN ('Direct Equity', 'Partnership', 'Joint Venture', 'Trust', 'Cooperative')),
  investment_date DATE,
  equity_value_cad NUMERIC,

  -- Project Details
  project_capacity_mw NUMERIC,
  project_location TEXT,
  province TEXT,

  -- Financial Returns
  annual_dividend_cad NUMERIC,
  total_return_to_date_cad NUMERIC,

  -- Governance
  board_seats INTEGER,
  community_voting_rights BOOLEAN DEFAULT FALSE,

  -- Status
  status TEXT CHECK (status IN ('Active', 'Planned', 'Completed', 'Divested')),

  -- Data
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_indigenous_equity_community ON indigenous_equity_ownership(indigenous_community);
CREATE INDEX idx_indigenous_equity_type ON indigenous_equity_ownership(project_type);
CREATE INDEX idx_indigenous_equity_province ON indigenous_equity_ownership(province);

-- Indigenous Revenue Agreements (IBAs, Revenue-Sharing)
CREATE TABLE IF NOT EXISTS indigenous_revenue_agreements (
  id TEXT PRIMARY KEY,
  agreement_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  indigenous_community TEXT NOT NULL,
  operator TEXT NOT NULL,

  -- Agreement Type
  agreement_type TEXT CHECK (agreement_type IN ('Impact Benefit Agreement', 'Revenue Sharing', 'Royalty Agreement', 'Capacity Building', 'Employment Agreement', 'Procurement Agreement')),
  signing_date DATE,
  expiry_date DATE,

  -- Financial Terms
  royalty_rate_percent NUMERIC,
  fixed_annual_payment_cad NUMERIC,
  variable_payment_based_on TEXT, -- 'Production', 'Revenue', 'Profit', 'Milestone'
  total_value_cad NUMERIC,

  -- Payments to Date
  cumulative_payments_cad NUMERIC DEFAULT 0,
  last_payment_date DATE,
  last_payment_amount_cad NUMERIC,

  -- Benefits
  jobs_created INTEGER,
  training_investment_cad NUMERIC,
  local_procurement_target_percent NUMERIC,

  -- Status
  status TEXT CHECK (status IN ('Active', 'Expired', 'Renegotiating', 'Terminated')),

  -- Data
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_indigenous_agreements_community ON indigenous_revenue_agreements(indigenous_community);
CREATE INDEX idx_indigenous_agreements_type ON indigenous_revenue_agreements(agreement_type);

-- Indigenous Economic Impact
CREATE TABLE IF NOT EXISTS indigenous_economic_impact (
  id SERIAL PRIMARY KEY,
  community_name TEXT NOT NULL,
  year INTEGER NOT NULL,

  -- Employment
  direct_jobs INTEGER DEFAULT 0,
  indirect_jobs INTEGER DEFAULT 0,
  training_participants INTEGER DEFAULT 0,
  apprenticeships INTEGER DEFAULT 0,

  -- Procurement
  local_procurement_value_cad NUMERIC DEFAULT 0,
  indigenous_owned_contractors INTEGER DEFAULT 0,

  -- Revenue
  total_revenue_from_energy_projects_cad NUMERIC DEFAULT 0,
  equity_dividends_cad NUMERIC DEFAULT 0,
  royalty_payments_cad NUMERIC DEFAULT 0,
  iba_payments_cad NUMERIC DEFAULT 0,

  -- Investment
  community_investment_fund_balance_cad NUMERIC DEFAULT 0,
  education_investment_cad NUMERIC DEFAULT 0,
  infrastructure_investment_cad NUMERIC DEFAULT 0,

  -- Capacity Building
  business_development_programs INTEGER DEFAULT 0,
  governance_training_participants INTEGER DEFAULT 0,

  -- GDP Contribution
  community_gdp_cad NUMERIC,
  energy_sector_gdp_contribution_percent NUMERIC,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(community_name, year)
);

CREATE INDEX idx_indigenous_impact_community ON indigenous_economic_impact(community_name);
CREATE INDEX idx_indigenous_impact_year ON indigenous_economic_impact(year DESC);

-- Seed Data: Real Indigenous Equity Examples
INSERT INTO indigenous_equity_ownership (id, project_name, project_type, indigenous_community, nation_or_band, ownership_percent, ownership_type, investment_date, equity_value_cad, project_capacity_mw, project_location, province, status)
VALUES
  ('watay-power', 'Wataynikaneyap Power Project', 'Transmission', '24 First Nations', 'Treaty 9 Communities', 51.0, 'Direct Equity', '2018-07-01', 340000000, NULL, 'Northern Ontario', 'ON', 'Active'),

  ('clearwater-wind', 'Clearwater River Wind Farm', 'Wind', 'Duncan''s First Nation', 'Duncan''s First Nation', 50.0, 'Joint Venture', '2019-03-01', 25000000, 150, 'Stony Plain', 'AB', 'Active'),

  ('makwa-solar', 'Makwa Solar Farm', 'Solar', 'Ermineskin Cree Nation', 'Ermineskin Cree Nation', 100.0, 'Direct Equity', '2020-06-01', 30000000, 36, 'Maskwacis', 'AB', 'Active');

COMMENT ON TABLE indigenous_equity_ownership IS 'Indigenous community equity ownership in energy projects';
COMMENT ON TABLE indigenous_revenue_agreements IS 'Impact Benefit Agreements and revenue-sharing arrangements';
COMMENT ON TABLE indigenous_economic_impact IS 'Economic impact metrics for Indigenous communities from energy sector';
```

### **Frontend Enhancement** (Update IndigenousDashboard.tsx)

**New Tabs to Add**:
1. **"Economic Impact"** tab
   - Total revenue from energy projects
   - Jobs created (direct + indirect)
   - GDP contribution

2. **"Equity Ownership"** tab
   - Projects with Indigenous equity
   - Ownership % breakdown
   - Annual dividends chart

3. **"Revenue Agreements"** tab
   - Active IBAs
   - Royalty payments over time
   - Capacity building investments

### **Timeline**:
- **Day 1-2** (Nov 12-13): Database schema + migration
- **Day 3-4** (Nov 14-15): Seed real data (Wataynikaneyap, Clearwater, Makwa)
- **Day 5-8** (Nov 16-19): Frontend enhancements (new tabs)
- **Day 9-10** (Nov 20-21): Edge function updates
- **Day 11-12** (Nov 22-23): Testing
- **Day 13** (Nov 24): Deploy to production

---

## 🎯 FEATURE 3: SMR DEPLOYMENT TRACKER

### **Database Schema** (20251112003_smr_infrastructure.sql)
- See full schema in separate file

### **Timeline**: Days 15-25 (Nov 27 - Dec 7)

---

## 🎯 FEATURE 4: MULTI-PROVINCE GRID INTERCONNECTION QUEUE

### **Database Schema** (20251112004_provincial_interconnection_queues.sql)
- Extend AESO queue model to IESO, SaskPower, BC Hydro

### **Timeline**: Days 20-30 (Dec 2 - Dec 12)

---

## 📅 OVERALL TIMELINE

### **Week 1** (Nov 12-18): CCUS + Indigenous Equity
- ✅ Gap analysis complete
- 🔨 CCUS database + migration
- 🔨 CCUS seed data
- 🔨 Indigenous equity database
- 🔨 Indigenous seed data
- 🔨 Start CCUS frontend

### **Week 2** (Nov 19-25): CCUS Frontend + Indigenous Frontend
- 🔨 Complete CCUS dashboard
- 🔨 Complete Indigenous enhancements
- 🔨 CCUS edge function
- 🔨 Testing Week 1 features

### **Week 3** (Nov 26-Dec 2): SMR Tracker
- 🔨 SMR database + migration
- 🔨 SMR seed data (OPG Darlington)
- 🔨 SMR frontend dashboard
- 🔨 SMR edge function

### **Week 4** (Dec 3-9): Grid Queue + Testing
- 🔨 Multi-province queue database
- 🔨 IESO queue data ingestion
- 🔨 Grid queue dashboard
- 🔨 Comprehensive QA testing

### **Week 5** (Dec 10-15): Deployment + Sponsor Outreach
- 🚀 Production deployment
- 📊 User acceptance testing
- 📈 Sponsor pitch deck finalization
- 📞 Sponsor meetings scheduled

---

## 🎯 SUCCESS METRICS

### **Technical Metrics**:
- ✅ 4 new database migrations deployed
- ✅ 4 new frontend components
- ✅ 4 new edge functions
- ✅ 100+ real data records populated
- ✅ All features integrated in navigation
- ✅ Zero critical bugs
- ✅ Performance: < 2s page load time

### **Business Metrics**:
- 🎯 3+ sponsor meetings booked (Pathways Alliance, OPG, AESO)
- 🎯 1+ pilot project agreement
- 🎯 $50K+ in committed sponsorship by Q1 2026
- 🎯 5+ user testimonials
- 🎯 100+ daily active users

---

## 🚀 IMMEDIATE NEXT STEPS

### **RIGHT NOW** (Next 30 minutes):
1. ✅ Create `20251112001_ccus_infrastructure.sql` migration
2. ✅ Seed Quest, ACTL, Pathways Alliance data
3. ✅ Test migration on dev database

### **TODAY** (Next 2 hours):
4. 🔨 Create `CCUSProjectTracker.tsx` component scaffold
5. 🔨 Integrate CCUS tab in navigation
6. 🔨 Create `api-v2-ccus` edge function

### **THIS WEEK**:
7. 🔨 Complete CCUS frontend with all visualizations
8. 🔨 Complete Indigenous equity enhancements
9. 🔨 Deploy both features to dev environment
10. 🔨 Start user testing

---

**Let's start building NOW!** 🚀
