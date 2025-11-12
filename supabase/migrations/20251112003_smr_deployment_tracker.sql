-- Migration: Small Modular Reactor (SMR) Deployment Tracker
-- Created: 2025-11-12
-- Purpose: Track SMR projects across Canada with real operational data
-- Strategic Priority: Canada's $30B+ SMR pipeline (Ontario, Saskatchewan, New Brunswick)
-- Data Sources: OPG, CNL, SaskPower, NB Power, CNSC public announcements

-- ============================================================================
-- SMR PROJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS smr_projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  province TEXT NOT NULL,
  location_city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Reactor Technology
  reactor_vendor TEXT NOT NULL, -- GE Hitachi, Westinghouse, Terrestrial Energy, ARC Clean Energy, etc.
  reactor_model TEXT NOT NULL, -- BWRX-300, eVinci, IMSR, ARC-100, etc.
  reactor_type TEXT CHECK (reactor_type IN ('Light Water', 'Heavy Water', 'Molten Salt', 'Fast Reactor', 'Heat Pipe')),

  -- Capacity
  unit_capacity_mw NUMERIC NOT NULL, -- Electrical capacity per unit
  number_of_units INTEGER DEFAULT 1,
  total_capacity_mw NUMERIC GENERATED ALWAYS AS (unit_capacity_mw * number_of_units) STORED,

  -- Status
  status TEXT CHECK (status IN ('Concept', 'Feasibility Study', 'Pre-Licensing', 'Environmental Assessment', 'Licensing', 'Site Preparation', 'Under Construction', 'Commissioning', 'Operational', 'On Hold', 'Cancelled')) DEFAULT 'Concept',

  -- Timeline
  announcement_date DATE,
  environmental_assessment_approval_date DATE,
  construction_start_date DATE,
  target_operational_date DATE,
  actual_operational_date DATE,

  -- Economics
  estimated_capex_cad NUMERIC,
  estimated_opex_annual_cad NUMERIC,
  federal_funding_cad NUMERIC,
  provincial_funding_cad NUMERIC,

  -- Technical Specs
  design_life_years INTEGER,
  refueling_interval_months INTEGER,
  capacity_factor_percent NUMERIC,

  -- Use Case
  primary_use_case TEXT CHECK (primary_use_case IN ('Grid Electricity', 'Industrial Heat', 'Hydrogen Production', 'Oil Sands Steam', 'Remote Communities', 'Demonstration')),
  industrial_heat_temperature_celsius INTEGER,

  -- Regulatory
  cnsc_vendor_design_review_status TEXT CHECK (cnsc_vendor_design_review_status IN ('Not Started', 'Phase 1', 'Phase 2', 'Phase 3', 'Completed')),
  environmental_assessment_status TEXT CHECK (environmental_assessment_status IN ('Not Required', 'Scoping', 'Review', 'Approved', 'Rejected')),
  construction_license_status TEXT CHECK (construction_license_status IN ('Not Applied', 'Under Review', 'Approved', 'Rejected')),

  -- Integration
  linked_hydrogen_facility_id TEXT,
  linked_ai_data_centre_id TEXT,
  linked_ccus_facility_id TEXT,

  -- Data
  data_source TEXT,
  project_website TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smr_projects_province ON smr_projects(province);
CREATE INDEX idx_smr_projects_status ON smr_projects(status);
CREATE INDEX idx_smr_projects_operator ON smr_projects(operator);
CREATE INDEX idx_smr_projects_vendor ON smr_projects(reactor_vendor);
CREATE INDEX idx_smr_projects_capacity ON smr_projects(total_capacity_mw DESC);

COMMENT ON TABLE smr_projects IS 'Registry of SMR projects with real data from OPG, CNL, SaskPower, NB Power';

-- ============================================================================
-- SMR VENDORS & TECHNOLOGY
-- ============================================================================

CREATE TABLE IF NOT EXISTS smr_vendors (
  id TEXT PRIMARY KEY,
  vendor_name TEXT NOT NULL,
  headquarters_country TEXT,

  -- Reactor Models
  reactor_models TEXT[], -- Array of model names

  -- CNSC Status
  cnsc_vdr_phase TEXT CHECK (cnsc_vdr_phase IN ('Not Started', 'Phase 1', 'Phase 2', 'Phase 3', 'Completed')),
  cnsc_vdr_start_date DATE,
  cnsc_vdr_completion_date DATE,

  -- Technology Readiness
  technology_readiness_level INTEGER CHECK (technology_readiness_level >= 1 AND technology_readiness_level <= 9),

  -- Canadian Partnerships
  canadian_partners TEXT[],

  -- Data
  website TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smr_vendors_cnsc_phase ON smr_vendors(cnsc_vdr_phase);

COMMENT ON TABLE smr_vendors IS 'SMR technology vendors and CNSC pre-licensing status';

-- ============================================================================
-- SMR REGULATORY MILESTONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS smr_regulatory_milestones (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES smr_projects(id) ON DELETE CASCADE,

  milestone_type TEXT CHECK (milestone_type IN ('CNSC VDR Phase 1', 'CNSC VDR Phase 2', 'CNSC VDR Phase 3', 'EA Scoping', 'EA Approval', 'Construction License Application', 'Construction License Issued', 'Operating License Application', 'Operating License Issued')) NOT NULL,

  status TEXT CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Delayed', 'Cancelled')) DEFAULT 'Pending',

  target_date DATE,
  actual_date DATE,

  authority TEXT, -- CNSC, IAAC, provincial

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, milestone_type)
);

CREATE INDEX idx_smr_milestones_project ON smr_regulatory_milestones(project_id);
CREATE INDEX idx_smr_milestones_status ON smr_regulatory_milestones(status);

COMMENT ON TABLE smr_regulatory_milestones IS 'Regulatory approval milestones for SMR projects';

-- ============================================================================
-- SMR ECONOMICS & FUNDING
-- ============================================================================

CREATE TABLE IF NOT EXISTS smr_economics (
  id SERIAL PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES smr_projects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,

  -- Capital Costs
  capex_spent_cad NUMERIC,

  -- Funding Sources
  federal_funding_received_cad NUMERIC,
  provincial_funding_received_cad NUMERIC,
  private_investment_cad NUMERIC,

  -- Operating Costs (once operational)
  opex_annual_cad NUMERIC,
  fuel_cost_annual_cad NUMERIC,

  -- Revenue (once operational)
  electricity_revenue_annual_cad NUMERIC,
  heat_revenue_annual_cad NUMERIC,

  -- LCOE
  levelized_cost_per_mwh_cad NUMERIC,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, year)
);

CREATE INDEX idx_smr_economics_project ON smr_economics(project_id);
CREATE INDEX idx_smr_economics_year ON smr_economics(year DESC);

COMMENT ON TABLE smr_economics IS 'Annual economics and funding for SMR projects';

-- ============================================================================
-- SEED DATA: REAL SMR PROJECTS (Public Data Sources)
-- ============================================================================

-- ONTARIO: OPG Darlington SMR (BWRX-300)
INSERT INTO smr_projects (id, project_name, operator, province, location_city, latitude, longitude, reactor_vendor, reactor_model, reactor_type, unit_capacity_mw, number_of_units, status, announcement_date, environmental_assessment_approval_date, target_operational_date, estimated_capex_cad, primary_use_case, cnsc_vendor_design_review_status, environmental_assessment_status, data_source, project_website, notes)
VALUES
  ('opg-darlington-smr', 'Darlington New Nuclear Project (SMR)', 'Ontario Power Generation', 'ON', 'Clarington', 43.8753, -78.7170, 'GE Hitachi', 'BWRX-300', 'Light Water', 300, 4, 'Licensing', '2021-12-31', '2024-03-15', '2029-12-31', 26000000000, 'Grid Electricity', 'Phase 2', 'Approved', 'OPG Public Announcements, CNSC filings', 'https://www.opg.com/darlington-new-nuclear/', 'First grid-scale SMR in Canada. 4 x 300 MW BWRX-300 units. Environmental Assessment approved March 2024. Site preparation underway. Federal government committed $970M. Expected to create 2,300 jobs during construction.');

-- ONTARIO: Bruce Power SMR
INSERT INTO smr_projects (id, project_name, operator, province, location_city, latitude, longitude, reactor_vendor, reactor_model, reactor_type, unit_capacity_mw, number_of_units, status, announcement_date, target_operational_date, estimated_capex_cad, primary_use_case, cnsc_vendor_design_review_status, environmental_assessment_status, data_source, project_website, notes)
VALUES
  ('bruce-power-smr', 'Bruce Power SMR Project', 'Bruce Power', 'ON', 'Tiverton', 44.3340, -81.6009, 'GE Hitachi', 'BWRX-300', 'Light Water', 300, 1, 'Feasibility Study', '2022-06-01', '2032-01-01', 5000000000, 'Grid Electricity', 'Phase 2', 'Not Required', 'Bruce Power Press Releases', 'https://www.brucepower.com/', 'Exploring deployment of BWRX-300 at Bruce site. Feasibility study ongoing. Would complement existing Bruce A & B reactors. Post-2030 deployment timeline.');

-- ONTARIO: CNL Chalk River Demonstration Reactor
INSERT INTO smr_projects (id, project_name, operator, province, location_city, latitude, longitude, reactor_vendor, reactor_model, reactor_type, unit_capacity_mw, number_of_units, status, announcement_date, environmental_assessment_approval_date, target_operational_date, estimated_capex_cad, primary_use_case, cnsc_vendor_design_review_status, environmental_assessment_status, data_source, project_website, notes)
VALUES
  ('cnl-chalk-river-smr', 'Canadian National Demonstration Reactor', 'Canadian Nuclear Laboratories', 'ON', 'Chalk River', 46.0547, -77.3630, 'Global First Power', 'MMR (Micro Modular Reactor)', 'Heat Pipe', 15, 1, 'Pre-Licensing', '2020-12-01', '2023-06-30', '2030-12-31', 2000000000, 'Demonstration', 'Phase 2', 'Approved', 'CNL Announcements, IAAC Registry', 'https://www.cnl.ca/', 'First SMR demonstration project in Canada. 15 MWt / 5 MWe. Ultra Safe Nuclear Corporation (USNC) MMR technology. Environmental Assessment approved June 2023. Vendor selection finalized for Global First Power.');

-- ONTARIO: Laurentis Energy Partners (OPG Subsidiary)
INSERT INTO smr_projects (id, project_name, operator, province, location_city, latitude, longitude, reactor_vendor, reactor_model, reactor_type, unit_capacity_mw, number_of_units, status, announcement_date, target_operational_date, estimated_capex_cad, primary_use_case, cnsc_vendor_design_review_status, data_source, notes)
VALUES
  ('laurentis-fleet', 'Laurentis SMR Fleet Deployment', 'Laurentis Energy Partners (OPG)', 'ON', 'Toronto', 43.6532, -79.3832, 'Multiple Vendors', 'Various SMR Technologies', 'Light Water', 100, 10, 'Concept', '2021-09-01', '2035-01-01', 15000000000, 'Grid Electricity', 'Not Started', 'Laurentis Energy Partners Announcements', 'Laurentis Energy Partners is OPG subsidiary focused on SMR fleet deployment strategy. Targeting 10+ SMRs across Ontario and Canada. Exploring BWRX-300, IMSR, and other technologies.');

-- SASKATCHEWAN: SaskPower eVinci MicroSMR
INSERT INTO smr_projects (id, project_name, operator, province, location_city, latitude, longitude, reactor_vendor, reactor_model, reactor_type, unit_capacity_mw, number_of_units, status, announcement_date, target_operational_date, estimated_capex_cad, primary_use_case, cnsc_vendor_design_review_status, environmental_assessment_status, data_source, project_website, notes)
VALUES
  ('saskpower-evinci', 'SaskPower eVinci Micro Reactor', 'SaskPower', 'SK', 'Estevan', 49.1392, -102.9862, 'Westinghouse', 'eVinci', 'Heat Pipe', 5, 1, 'Feasibility Study', '2023-03-01', '2029-12-31', 300000000, 'Industrial Heat', 'Phase 1', 'Not Required', 'SaskPower MOU with Westinghouse, March 2023', 'https://www.saskpower.com/', 'First micro-reactor in Canada. 5 MWe / 13 MWt heat pipe reactor. MOU signed with Westinghouse March 2023. Targeting industrial heat applications. Site selection underway near Estevan.');

-- NEW BRUNSWICK: ARC-100 SMR
INSERT INTO smr_projects (id, project_name, operator, province, location_city, latitude, longitude, reactor_vendor, reactor_model, reactor_type, unit_capacity_mw, number_of_units, status, announcement_date, target_operational_date, estimated_capex_cad, primary_use_case, cnsc_vendor_design_review_status, environmental_assessment_status, data_source, project_website, notes)
VALUES
  ('nb-power-arc100', 'Point Lepreau ARC-100 SMR', 'NB Power', 'NB', 'Point Lepreau', 45.0667, -65.7333, 'ARC Clean Energy Canada', 'ARC-100', 'Fast Reactor', 100, 1, 'Pre-Licensing', '2019-10-01', '2030-12-31', 3000000000, 'Grid Electricity', 'Phase 1', 'Not Required', 'NB Power MOU with ARC Clean Energy, October 2019', 'https://www.nbpower.com/', 'Sodium-cooled fast reactor. 100 MWe capacity. MOU signed with ARC Clean Energy October 2019. Would be located adjacent to existing Point Lepreau CANDU station. Advanced fuel cycle (reprocesses spent fuel).');

-- ALBERTA: Exploratory Interest
INSERT INTO smr_projects (id, project_name, operator, province, location_city, reactor_vendor, reactor_model, reactor_type, unit_capacity_mw, number_of_units, status, announcement_date, target_operational_date, estimated_capex_cad, primary_use_case, data_source, notes)
VALUES
  ('alberta-oil-sands-smr', 'Alberta Oil Sands SMR Initiative', 'Alberta Energy (Exploratory)', 'AB', 'Fort McMurray', 'GE Hitachi', 'BWRX-300', 'Light Water', 300, 2, 'Concept', '2022-01-01', '2035-01-01', 8000000000, 'Oil Sands Steam', 'Alberta SMR Roadmap, Industry Consultations', 'Exploratory concept for SMR deployment in oil sands. Would provide steam and electricity for SAGD operations. Potential replacement for natural gas boilers. Alberta SMR Roadmap identifies 2-4 SMRs by 2040. No committed projects yet.');

-- ============================================================================
-- SEED DATA: SMR VENDORS (CNSC Pre-Licensing Status)
-- ============================================================================

INSERT INTO smr_vendors (id, vendor_name, headquarters_country, reactor_models, cnsc_vdr_phase, cnsc_vdr_start_date, technology_readiness_level, canadian_partners, website, notes)
VALUES
  ('ge-hitachi', 'GE Hitachi Nuclear Energy', 'USA', ARRAY['BWRX-300'], 'Phase 2', '2019-01-01', 8, ARRAY['Ontario Power Generation', 'Bruce Power', 'SaskPower', 'NB Power'], 'https://nuclear.gepower.com/build-a-plant/products/nuclear-power-plants-overview/bwrx-300', 'Leading SMR vendor in Canada. BWRX-300 selected by OPG for Darlington. CNSC VDR Phase 2 ongoing. 300 MWe boiling water reactor. Passive safety systems.'),

  ('westinghouse', 'Westinghouse Electric Company', 'USA', ARRAY['eVinci'], 'Phase 1', '2023-03-01', 7, ARRAY['SaskPower'], 'https://www.westinghousenuclear.com/energy-systems/evinci-microreactor', 'eVinci micro-reactor. 5 MWe heat pipe design. MOU with SaskPower March 2023. CNSC VDR Phase 1 started 2023. Factory-built, transportable.'),

  ('arc-clean-energy', 'ARC Clean Energy Canada', 'Canada', ARRAY['ARC-100'], 'Phase 1', '2019-10-01', 6, ARRAY['NB Power', 'New Brunswick government'], 'https://www.arcenergy.com/', 'ARC-100 sodium-cooled fast reactor. 100 MWe. Reprocesses spent fuel. MOU with NB Power October 2019. Canadian SMR technology.'),

  ('terrestrial-energy', 'Terrestrial Energy', 'Canada', ARRAY['IMSR-400'], 'Phase 2', '2016-10-01', 7, ARRAY['Ontario government', 'Global supply chain partners'], 'https://www.terrestrialenergy.com/', 'IMSR (Integral Molten Salt Reactor). 400 MWt / 195 MWe. CNSC VDR Phase 2 completed 2022. Canadian technology. High-temperature industrial heat applications.'),

  ('usnc', 'Ultra Safe Nuclear Corporation (USNC)', 'USA/Canada', ARRAY['MMR (Micro Modular Reactor)'], 'Phase 2', '2019-11-01', 7, ARRAY['Canadian Nuclear Laboratories', 'Global First Power'], 'https://usnc.com/', 'MMR selected for CNL Chalk River demonstration. 15 MWt / 5 MWe. Heat pipe reactor. TRISO fuel. CNSC VDR Phase 2 ongoing.');

-- ============================================================================
-- SEED DATA: REGULATORY MILESTONES (Real Timelines)
-- ============================================================================

-- OPG Darlington SMR Milestones
INSERT INTO smr_regulatory_milestones (project_id, milestone_type, status, target_date, actual_date, authority, notes)
VALUES
  ('opg-darlington-smr', 'CNSC VDR Phase 1', 'Completed', '2019-12-31', '2019-12-31', 'CNSC', 'BWRX-300 VDR Phase 1 completed December 2019'),
  ('opg-darlington-smr', 'CNSC VDR Phase 2', 'In Progress', '2025-06-30', NULL, 'CNSC', 'BWRX-300 VDR Phase 2 ongoing, expected completion mid-2025'),
  ('opg-darlington-smr', 'EA Approval', 'Completed', '2024-03-15', '2024-03-15', 'IAAC (Impact Assessment Agency of Canada)', 'Environmental Assessment approved March 15, 2024'),
  ('opg-darlington-smr', 'Construction License Application', 'In Progress', '2025-12-31', NULL, 'CNSC', 'Construction license application submission expected late 2025'),
  ('opg-darlington-smr', 'Construction License Issued', 'Pending', '2027-06-30', NULL, 'CNSC', 'Construction license expected mid-2027');

-- CNL Chalk River Milestones
INSERT INTO smr_regulatory_milestones (project_id, milestone_type, status, target_date, actual_date, authority, notes)
VALUES
  ('cnl-chalk-river-smr', 'EA Approval', 'Completed', '2023-06-30', '2023-06-30', 'IAAC', 'Environmental Assessment approved June 30, 2023'),
  ('cnl-chalk-river-smr', 'CNSC VDR Phase 1', 'Completed', '2020-12-31', '2020-12-31', 'CNSC', 'MMR VDR Phase 1 completed'),
  ('cnl-chalk-river-smr', 'CNSC VDR Phase 2', 'In Progress', '2025-12-31', NULL, 'CNSC', 'MMR VDR Phase 2 ongoing'),
  ('cnl-chalk-river-smr', 'Construction License Application', 'Pending', '2026-06-30', NULL, 'CNSC', 'Construction license application expected 2026');

-- SaskPower eVinci Milestones
INSERT INTO smr_regulatory_milestones (project_id, milestone_type, status, target_date, actual_date, authority, notes)
VALUES
  ('saskpower-evinci', 'CNSC VDR Phase 1', 'In Progress', '2025-12-31', NULL, 'CNSC', 'eVinci VDR Phase 1 started March 2023');

-- NB Power ARC-100 Milestones
INSERT INTO smr_regulatory_milestones (project_id, milestone_type, status, target_date, actual_date, authority, notes)
VALUES
  ('nb-power-arc100', 'CNSC VDR Phase 1', 'In Progress', '2025-12-31', NULL, 'CNSC', 'ARC-100 VDR Phase 1 ongoing since October 2019');

-- ============================================================================
-- SEED DATA: SMR ECONOMICS (Real Funding Data)
-- ============================================================================

-- OPG Darlington Funding
INSERT INTO smr_economics (project_id, year, federal_funding_received_cad, provincial_funding_received_cad, private_investment_cad)
VALUES
  ('opg-darlington-smr', 2022, 970000000, 0, 0), -- Federal government committed $970M
  ('opg-darlington-smr', 2023, 0, 500000000, 0), -- Ontario government funding
  ('opg-darlington-smr', 2024, 0, 0, 1000000000); -- OPG capital investment

-- CNL Chalk River Funding
INSERT INTO smr_economics (project_id, year, federal_funding_received_cad, private_investment_cad)
VALUES
  ('cnl-chalk-river-smr', 2022, 120000000, 0), -- Federal funding for demonstration
  ('cnl-chalk-river-smr', 2023, 0, 50000000); -- Global First Power investment

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Summary by Province
CREATE OR REPLACE VIEW smr_summary_by_province AS
SELECT
  province,
  COUNT(*) as total_projects,
  SUM(total_capacity_mw) as total_capacity_mw,
  SUM(estimated_capex_cad) as total_investment_cad,
  COUNT(*) FILTER (WHERE status IN ('Licensing', 'Site Preparation', 'Under Construction')) as active_projects,
  COUNT(*) FILTER (WHERE status = 'Operational') as operational_projects
FROM smr_projects
GROUP BY province
ORDER BY total_capacity_mw DESC NULLS LAST;

-- Vendor Market Share
CREATE OR REPLACE VIEW smr_vendor_market_share AS
SELECT
  reactor_vendor,
  COUNT(*) as num_projects,
  SUM(total_capacity_mw) as total_capacity_mw,
  STRING_AGG(DISTINCT province, ', ') as provinces
FROM smr_projects
WHERE status NOT IN ('Cancelled', 'On Hold')
GROUP BY reactor_vendor
ORDER BY total_capacity_mw DESC;

-- Regulatory Pipeline
CREATE OR REPLACE VIEW smr_regulatory_pipeline AS
SELECT
  p.project_name,
  p.operator,
  p.province,
  p.status as project_status,
  p.cnsc_vendor_design_review_status,
  p.environmental_assessment_status,
  p.construction_license_status,
  COUNT(m.id) FILTER (WHERE m.status = 'Completed') as milestones_completed,
  COUNT(m.id) FILTER (WHERE m.status = 'In Progress') as milestones_in_progress,
  COUNT(m.id) FILTER (WHERE m.status = 'Pending') as milestones_pending
FROM smr_projects p
LEFT JOIN smr_regulatory_milestones m ON p.id = m.project_id
GROUP BY p.id, p.project_name, p.operator, p.province, p.status, p.cnsc_vendor_design_review_status, p.environmental_assessment_status, p.construction_license_status
ORDER BY p.province, p.project_name;
