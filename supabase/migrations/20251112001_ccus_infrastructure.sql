-- Migration: CCUS Infrastructure Tracking
-- Created: 2025-11-12
-- Purpose: Track CCUS facilities, pipelines, storage, economics for Alberta's $30B CCUS corridor
-- Strategic Priority: Pathways Alliance $16.5B proposal, federal $2.6B tax credit

-- ============================================================================
-- CCUS FACILITIES
-- ============================================================================

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

COMMENT ON TABLE ccus_facilities IS 'Registry of CCUS facilities with capture capacity, technology, storage, and economics';

-- ============================================================================
-- CCUS CAPTURE DATA (Time Series)
-- ============================================================================

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

COMMENT ON TABLE ccus_capture_data IS 'Time-series CO2 capture performance data';

-- ============================================================================
-- CCUS PIPELINES
-- ============================================================================

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

COMMENT ON TABLE ccus_pipelines IS 'CO2 transportation pipelines connecting capture facilities to storage sites';

-- ============================================================================
-- CCUS STORAGE SITES
-- ============================================================================

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

COMMENT ON TABLE ccus_storage_sites IS 'Geological storage reservoirs for captured CO2';

-- ============================================================================
-- CCUS ECONOMICS & INCENTIVES
-- ============================================================================

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

COMMENT ON TABLE ccus_economics IS 'Annual economics for CCUS facilities including tax credits and carbon credits';

-- ============================================================================
-- PATHWAYS ALLIANCE PROJECTS ($16.5B Proposal)
-- ============================================================================

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

COMMENT ON TABLE pathways_alliance_projects IS 'Pathways Alliance $16.5B CCUS proposal tracking (6 member companies)';

-- ============================================================================
-- SEED DATA: OPERATIONAL CCUS PROJECTS
-- ============================================================================

INSERT INTO ccus_facilities (id, facility_name, operator, location_city, province, latitude, longitude, status, actual_operational_date, design_capture_capacity_mt_per_year, current_capture_capacity_mt_per_year, capture_technology, capture_point_source, storage_type, storage_site_name, capital_cost_cad, abated_emissions_mt_per_year, data_source, notes)
VALUES
  ('quest-ccus', 'Quest CCUS Project', 'Shell Canada', 'Fort Saskatchewan', 'AB', 53.7267, -113.2099, 'Operational', '2015-11-01', 1.2, 1.0, 'Post-combustion amine scrubbing', 'Hydrogen Production (Scotford Upgrader)', 'Saline Aquifer', 'Basal Cambrian Sands', 1350000000, 1.0, 'Shell Canada Annual Reports', 'World''s first commercial-scale CCUS in oil sands sector. Over 6 million tonnes captured since 2015.'),

  ('nwrp-ccus', 'North West Redwater Partnership CCUS', 'NWR Refining', 'Redwater', 'AB', 53.9500, -113.3000, 'Operational', '2020-06-01', 1.2, 0.8, 'Pre-combustion', 'Bitumen Refinery', 'Saline Aquifer', 'Nisku Formation', 500000000, 0.8, 'NWR Partnership', 'Integrated gasification facility with CO2 capture. First CCUS-enabled refinery in Canada.'),

  ('boundary-dam-ccus', 'Boundary Dam 3 CCUS', 'SaskPower', 'Estevan', 'SK', 49.1300, -103.0100, 'Operational', '2014-10-01', 1.0, 0.6, 'Post-combustion amine scrubbing', 'Coal-fired Power Plant', 'Enhanced Oil Recovery', 'Weyburn oil field', 1500000000, 0.6, 'SaskPower Annual Reports', 'World''s first commercial-scale post-combustion CCUS on coal power. Operational since 2014.'),

  ('strathcona-ccus', 'Strathcona Refinery CCUS', 'Imperial Oil', 'Edmonton', 'AB', 53.5461, -113.4938, 'Under Construction', '2025-12-01', 0.5, NULL, 'Post-combustion', 'Refinery', 'Saline Aquifer', 'Nisku Formation', 560000000, 0.5, 'Imperial Oil Press Releases', 'Part of Imperial''s $720M Strathcona Renewable Diesel project.'),

  ('cq-edmonton-ccus', 'Capital Power Genesee CCUS', 'Capital Power', 'Genesee', 'AB', 53.2836, -114.2239, 'Proposed', '2030-01-01', 3.0, NULL, 'Post-combustion', 'Natural Gas Power Plant', 'Saline Aquifer', 'Leduc Formation', 2400000000, 3.0, 'Capital Power CCUS Feasibility Study', 'Proposed CCUS for Genesee Generating Station Units 1 & 2.');

-- Alberta Carbon Trunk Line (Pipeline)
INSERT INTO ccus_pipelines (id, pipeline_name, operator, from_location, to_location, total_length_km, design_capacity_mt_per_year, current_throughput_mt_per_year, status, actual_operational_date, capital_cost_cad, tariff_cad_per_tonne, pipeline_diameter_inches, operating_pressure_bar, data_source, notes)
VALUES
  ('actl-pipeline', 'Alberta Carbon Trunk Line (ACTL)', 'Wolf Midstream', 'Industrial Heartland (Fort Saskatchewan/Redwater)', 'Clive oil field (near Red Deer)', 240, 14.6, 2.5, 'Operational', '2020-06-01', 1200000000, 15, 16, 153, 'Wolf Midstream', 'North America''s largest CO2 pipeline. Connects multiple capture facilities to EOR storage.');

-- Storage Sites
INSERT INTO ccus_storage_sites (id, site_name, operator, location, province, latitude, longitude, reservoir_type, depth_meters, total_storage_capacity_mt, cumulative_injected_mt, remaining_capacity_mt, max_injection_rate_mt_per_year, active_injection_wells, monitoring_status, last_monitoring_date, containment_verified, storage_fee_cad_per_tonne, data_source)
VALUES
  ('clive-eor', 'Clive Oil Field EOR', 'Enhance Energy', 'Clive (near Red Deer)', 'AB', 52.2500, -113.8000, 'Depleted Oil Reservoir', 1800, 100, 10, 90, 14.6, 45, 'Active', '2025-10-01', TRUE, 10, 'Enhance Energy Operations Reports'),

  ('nisku-saline', 'Nisku Formation Saline Aquifer', 'Various', 'Edmonton-Calgary Corridor', 'AB', 52.5000, -114.0000, 'Saline Aquifer', 2000, 500, 3, 497, 10, 15, 'Active', '2025-09-15', TRUE, 8, 'Alberta Geological Survey'),

  ('weyburn-eor', 'Weyburn-Midale CO2 Project', 'Cenovus Energy', 'Weyburn', 'SK', 49.6617, -103.8594, 'Depleted Oil Reservoir', 1450, 55, 25, 30, 3, 80, 'Active', '2025-08-20', TRUE, 12, 'Cenovus Annual Reports');

-- ============================================================================
-- SEED DATA: PATHWAYS ALLIANCE PROPOSED PROJECTS
-- ============================================================================

INSERT INTO pathways_alliance_projects (id, project_name, member_company, facility_type, capture_capacity_mt_per_year, status, capex_cad, federal_tax_credit_requested_cad, target_operational_date, connected_to_actl, notes)
VALUES
  ('pathways-fort-hills', 'Fort Hills CCUS', 'Suncor', 'Mining', 3.0, 'Awaiting Federal Decision', 5000000000, 2500000000, '2030-01-01', TRUE, 'Part of Pathways Alliance Phase 1 proposal. Depends on federal tax credit clarity.'),

  ('pathways-horizon', 'Horizon Oil Sands CCUS', 'CNRL', 'Mining', 4.0, 'Awaiting Federal Decision', 6500000000, 3250000000, '2030-01-01', TRUE, 'Largest proposed CCUS in Pathways Phase 1. CNRL flagship project.'),

  ('pathways-christina-lake', 'Christina Lake In-Situ CCUS', 'Cenovus', 'In-Situ Operations', 2.5, 'Awaiting Federal Decision', 4000000000, 2000000000, '2030-01-01', FALSE, 'In-situ SAGD operations CCUS. Requires new pipeline to ACTL.'),

  ('pathways-kearl', 'Kearl Oil Sands CCUS', 'Imperial Oil', 'Mining', 2.0, 'Awaiting Federal Decision', 3500000000, 1750000000, '2030-01-01', TRUE, 'Imperial''s contribution to Pathways Alliance.'),

  ('pathways-foster-creek', 'Foster Creek SAGD CCUS', 'Cenovus', 'In-Situ Operations', 1.5, 'Awaiting Federal Decision', 2500000000, 1250000000, '2031-01-01', FALSE, 'Phase 2 Pathways project. SAGD CCUS at Foster Creek.'),

  ('pathways-surmont', 'Surmont SAGD CCUS', 'ConocoPhillips', 'In-Situ Operations', 1.8, 'Awaiting Federal Decision', 3000000000, 1500000000, '2031-01-01', FALSE, 'ConocoPhillips Surmont SAGD facility CCUS.');

-- ============================================================================
-- SEED DATA: CCUS ECONOMICS (Sample Data for Quest)
-- ============================================================================

INSERT INTO ccus_economics (facility_id, year, capex_cad, federal_tax_credit_cad, opex_annual_cad, capture_cost_per_tonne_cad, carbon_credit_revenue_cad, alberta_tier_credits_tonnes, carbon_credit_price_cad_per_tonne, total_revenue_cad, total_cost_cad)
VALUES
  ('quest-ccus', 2023, 0, 0, 45000000, 45, 65000000, 1000000, 65, 65000000, 45000000),
  ('quest-ccus', 2024, 0, 0, 47000000, 47, 70000000, 1000000, 70, 70000000, 47000000);
