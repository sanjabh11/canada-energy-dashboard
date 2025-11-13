-- Migration: SMR (Small Modular Reactor) Project Tracking
-- Created: 2025-11-13
-- Purpose: Track SMR deployment projects, regulatory approvals, and nuclear innovation
-- Strategic Priority: OPG Darlington 2029 target, SaskPower feasibility, Alberta hydrogen-nuclear integration
-- Gap Analysis: HIGH PRIORITY - Nuclear innovation tracking (previously 1.0/5.0)

-- ============================================================================
-- SMR PROJECTS
-- ============================================================================

-- Registry of SMR projects across Canada
CREATE TABLE IF NOT EXISTS smr_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'SK', 'AB', 'BC', 'NB', 'MB', 'QC', 'NS', 'NL', 'PE', 'NT', 'YT', 'NU')),
  location_city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Project details
  operator TEXT NOT NULL, -- OPG, SaskPower, NB Power, etc.
  project_type TEXT CHECK (project_type IN ('Grid-Scale', 'Industrial', 'Remote Community', 'Hydrogen Production', 'District Heating', 'Research/Demonstration')),

  -- Reactor specifications
  reactor_vendor TEXT, -- GE Hitachi, Rolls-Royce, Westinghouse, X-energy, etc.
  reactor_model TEXT, -- BWRX-300, UK SMR, eVinci, Xe-100, etc.
  reactor_technology TEXT, -- BWR, PWR, HTGR, Microreactor, etc.
  capacity_mwe NUMERIC NOT NULL, -- Electric capacity (MWe)
  capacity_mwth NUMERIC, -- Thermal capacity (MWth)

  -- Multi-unit deployment
  units_planned INTEGER DEFAULT 1,
  units_operational INTEGER DEFAULT 0,

  -- Project status
  status TEXT CHECK (status IN (
    'Pre-Feasibility',
    'Feasibility Study',
    'Pre-Licensing',
    'Vendor Design Review',
    'Site Preparation',
    'Licensing (Application)',
    'Licensing (Review)',
    'Construction License Issued',
    'Under Construction',
    'Commissioning',
    'Operational',
    'Decommissioned',
    'Cancelled',
    'On Hold'
  )) DEFAULT 'Pre-Feasibility',

  -- Key dates
  announcement_date DATE,
  feasibility_decision_date DATE,
  construction_license_date DATE,
  construction_start_date DATE,
  target_commercial_operation DATE,
  actual_commercial_operation DATE,

  -- CNSC regulatory tracking
  cnsc_license_stage TEXT CHECK (cnsc_license_stage IN (
    'Pre-Licensing Vendor Design Review (VDR)',
    'Site Preparation License (Application)',
    'Site Preparation License (Issued)',
    'Construction License (Application)',
    'Construction License (Issued)',
    'Operating License (Application)',
    'Operating License (Issued)',
    'Decommissioning License'
  )),
  cnsc_application_date DATE,
  cnsc_decision_date DATE,
  cnsc_license_expiry DATE,

  -- Economics
  estimated_capex_cad NUMERIC, -- Capital expenditure
  estimated_opex_cad_per_year NUMERIC, -- Operating expenditure
  estimated_lcoe_cad_per_mwh NUMERIC, -- Levelized Cost of Energy

  -- Federal funding
  federal_funding_cad NUMERIC,
  provincial_funding_cad NUMERIC,

  -- Grid integration
  interconnection_voltage_kv NUMERIC,
  transmission_upgrade_required BOOLEAN DEFAULT FALSE,
  transmission_upgrade_cost_cad NUMERIC,

  -- Co-generation / Multi-product
  hydrogen_cogeneration BOOLEAN DEFAULT FALSE,
  h2_production_capacity_tonnes_per_day NUMERIC,
  district_heating BOOLEAN DEFAULT FALSE,
  district_heating_capacity_mwth NUMERIC,
  desalination BOOLEAN DEFAULT FALSE,

  -- Environmental
  water_source TEXT, -- Lake Ontario, River, Ocean, Closed-loop
  water_consumption_m3_per_day NUMERIC,
  land_area_hectares NUMERIC,

  -- Employment
  construction_jobs INTEGER,
  permanent_jobs INTEGER,

  -- Indigenous engagement
  indigenous_partnership BOOLEAN DEFAULT FALSE,
  indigenous_communities TEXT[], -- Array of community names

  -- Strategic context
  primary_purpose TEXT, -- Grid reliability, industrial decarbonization, hydrogen production, remote power
  replaces_coal_gas BOOLEAN DEFAULT FALSE,
  supports_ai_datacentres BOOLEAN DEFAULT FALSE,

  -- Metadata
  data_source TEXT,
  notes TEXT,
  last_update_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smr_province ON smr_projects(province_code);
CREATE INDEX idx_smr_status ON smr_projects(status);
CREATE INDEX idx_smr_operator ON smr_projects(operator);
CREATE INDEX idx_smr_vendor ON smr_projects(reactor_vendor);
CREATE INDEX idx_smr_model ON smr_projects(reactor_model);
CREATE INDEX idx_smr_cnsc_stage ON smr_projects(cnsc_license_stage);
CREATE INDEX idx_smr_target_date ON smr_projects(target_commercial_operation);

COMMENT ON TABLE smr_projects IS 'Registry of Small Modular Reactor projects across Canada with regulatory, economic, and technical tracking';

-- ============================================================================
-- SMR REGULATORY MILESTONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS smr_regulatory_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES smr_projects(id) ON DELETE CASCADE,

  milestone_type TEXT CHECK (milestone_type IN (
    'CNSC Pre-Licensing VDR Initiated',
    'CNSC VDR Phase 1 Complete',
    'CNSC VDR Phase 2 Complete',
    'CNSC VDR Phase 3 Complete',
    'Environmental Assessment Approved',
    'Site Preparation License Application',
    'Site Preparation License Issued',
    'Site Preparation Complete',
    'Construction License Application',
    'CNSC Public Hearing',
    'Construction License Issued',
    'First Concrete',
    'Reactor Pressure Vessel Delivered',
    'Operating License Application',
    'Operating License Issued',
    'First Criticality',
    'Commercial Operation',
    'Refurbishment',
    'Decommissioning License Issued'
  )),

  milestone_date DATE NOT NULL,
  milestone_status TEXT CHECK (milestone_status IN ('Planned', 'In Progress', 'Completed', 'Delayed', 'Failed')) DEFAULT 'Planned',

  -- Documentation
  regulatory_decision_document_url TEXT,
  public_consultation BOOLEAN DEFAULT FALSE,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smr_milestones_project ON smr_regulatory_milestones(project_id);
CREATE INDEX idx_smr_milestones_date ON smr_regulatory_milestones(milestone_date);
CREATE INDEX idx_smr_milestones_type ON smr_regulatory_milestones(milestone_type);

COMMENT ON TABLE smr_regulatory_milestones IS 'Timeline of regulatory approvals and project milestones for SMR projects';

-- ============================================================================
-- SMR TECHNOLOGY VENDORS
-- ============================================================================

CREATE TABLE IF NOT EXISTS smr_technology_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL UNIQUE,
  vendor_country TEXT,

  reactor_design TEXT NOT NULL,
  reactor_generation TEXT CHECK (reactor_generation IN ('Gen III', 'Gen III+', 'Gen IV')),
  technology_type TEXT, -- Light Water, Heavy Water, Molten Salt, Gas-Cooled, etc.

  capacity_mwe NUMERIC,
  modularity TEXT, -- Factory-built, On-site assembly, etc.

  -- Safety features
  passive_safety BOOLEAN DEFAULT FALSE,
  walk_away_safe BOOLEAN DEFAULT FALSE,
  core_damage_frequency_per_year NUMERIC,

  -- Fuel
  fuel_type TEXT, -- LEU, HALEU, TRISO, Thorium, etc.
  fuel_enrichment_percent NUMERIC,
  refueling_frequency_months INTEGER,

  -- Canadian regulatory status
  cnsc_vdr_status TEXT CHECK (cnsc_vdr_status IN ('Not Started', 'Phase 1', 'Phase 2', 'Phase 3', 'Completed', 'Not Pursuing')),
  cnsc_vdr_completion_date DATE,

  -- Global deployment
  units_operating_globally INTEGER DEFAULT 0,
  units_under_construction_globally INTEGER DEFAULT 0,
  first_of_kind_location TEXT,
  first_of_kind_operation_date DATE,

  -- Design maturity
  design_maturity TEXT CHECK (design_maturity IN ('Conceptual', 'Basic Design', 'Detailed Design', 'Construction-Ready', 'Operational')),
  technology_readiness_level INTEGER CHECK (technology_readiness_level BETWEEN 1 AND 9),

  website_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smr_vendor_name ON smr_technology_vendors(vendor_name);
CREATE INDEX idx_smr_vendor_country ON smr_technology_vendors(vendor_country);
CREATE INDEX idx_smr_vendor_cnsc_status ON smr_technology_vendors(cnsc_vdr_status);

COMMENT ON TABLE smr_technology_vendors IS 'Registry of SMR technology vendors and reactor designs with Canadian regulatory status';

-- ============================================================================
-- SMR ECONOMICS & PERFORMANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS smr_economics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES smr_projects(id) ON DELETE CASCADE,

  -- Cost tracking
  estimate_date DATE NOT NULL,
  estimate_type TEXT CHECK (estimate_type IN ('Pre-Feasibility', 'Feasibility', 'Detailed Engineering', 'Final Investment Decision', 'Actual')) DEFAULT 'Pre-Feasibility',

  -- Capital costs (CAD)
  engineering_design_cost NUMERIC,
  equipment_procurement_cost NUMERIC,
  construction_cost NUMERIC,
  commissioning_cost NUMERIC,
  financing_cost NUMERIC,
  contingency_cost NUMERIC,
  total_capex NUMERIC NOT NULL,

  -- Per-unit economics
  capex_per_kw NUMERIC, -- CAD/kW

  -- Operating costs (CAD/year)
  fuel_cost_per_year NUMERIC,
  operations_cost_per_year NUMERIC,
  maintenance_cost_per_year NUMERIC,
  decommissioning_fund_contribution_per_year NUMERIC,
  total_opex_per_year NUMERIC,

  -- Performance metrics
  capacity_factor_percent NUMERIC CHECK (capacity_factor_percent BETWEEN 0 AND 100),
  availability_percent NUMERIC CHECK (availability_percent BETWEEN 0 AND 100),
  lcoe_cad_per_mwh NUMERIC, -- Levelized Cost of Energy

  -- Revenue streams
  electricity_revenue_per_year NUMERIC,
  hydrogen_revenue_per_year NUMERIC,
  heat_revenue_per_year NUMERIC,
  carbon_credit_revenue_per_year NUMERIC,
  capacity_payment_revenue_per_year NUMERIC,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_smr_econ_project ON smr_economics(project_id);
CREATE INDEX idx_smr_econ_date ON smr_economics(estimate_date);
CREATE INDEX idx_smr_econ_type ON smr_economics(estimate_type);

COMMENT ON TABLE smr_economics IS 'Economic analysis and cost tracking for SMR projects';

-- ============================================================================
-- SEED DATA: Real Canadian SMR Projects
-- ============================================================================

-- OPG Darlington SMR (BWRX-300) - CONSTRUCTION LICENSE ISSUED
INSERT INTO smr_projects (
  id, project_name, province_code, location_city, latitude, longitude,
  operator, project_type, reactor_vendor, reactor_model, reactor_technology,
  capacity_mwe, capacity_mwth, units_planned, units_operational,
  status, cnsc_license_stage,
  announcement_date, construction_license_date, target_commercial_operation,
  estimated_capex_cad, federal_funding_cad,
  interconnection_voltage_kv, hydrogen_cogeneration,
  water_source, construction_jobs, permanent_jobs,
  primary_purpose, replaces_coal_gas,
  data_source, notes, last_update_date
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'OPG Darlington New Nuclear Project (DNNP) - BWRX-300',
  'ON', 'Clarington', 43.8728, -78.7169,
  'Ontario Power Generation (OPG)', 'Grid-Scale',
  'GE Hitachi Nuclear Energy', 'BWRX-300', 'Boiling Water Reactor (BWR)',
  300, 900, 4, 0,
  'Construction License Issued', 'Construction License (Issued)',
  '2021-12-01', '2025-04-04', '2029-12-31',
  5000000000, 970000000,
  500, TRUE,
  'Lake Ontario', 2300, 200,
  'Grid reliability and hydrogen production', TRUE,
  'OPG, CNSC, Canadian Nuclear Association',
  'First grid-scale SMR construction license in Canada. CNSC issued Construction License on April 4, 2025 valid until March 31, 2035. GE Hitachi awarded RPV manufacturing contract January 2025. Up to 4 units planned.',
  '2025-04-04'
) ON CONFLICT (id) DO NOTHING;

-- SaskPower SMR (BWRX-300) - Feasibility Stage
INSERT INTO smr_projects (
  id, project_name, province_code, location_city,
  operator, project_type, reactor_vendor, reactor_model, reactor_technology,
  capacity_mwe, capacity_mwth, units_planned,
  status, cnsc_license_stage,
  announcement_date, feasibility_decision_date,
  primary_purpose, replaces_coal_gas,
  data_source, notes, last_update_date
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'SaskPower SMR Project',
  'SK', 'Estevan',
  'SaskPower', 'Grid-Scale',
  'GE Hitachi Nuclear Energy', 'BWRX-300', 'Boiling Water Reactor (BWR)',
  300, 900, 1,
  'Feasibility Study', 'Pre-Licensing Vendor Design Review (VDR)',
  '2022-06-01', '2029-12-31',
  'Grid reliability and coal phase-out', TRUE,
  'SaskPower, GE Hitachi',
  'SaskPower selected BWRX-300 in June 2022. Fleet-based approach with OPG. Decision on proceeding expected 2029. Agreement signed with GEH in 2024 to advance planning and licensing.',
  '2024-05-01'
) ON CONFLICT (id) DO NOTHING;

-- NB Power Point Lepreau SMR - Exploratory
INSERT INTO smr_projects (
  id, project_name, province_code, location_city,
  operator, project_type, reactor_vendor, reactor_model, reactor_technology,
  capacity_mwe, units_planned,
  status,
  announcement_date,
  primary_purpose,
  data_source, notes, last_update_date
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'NB Power Point Lepreau SMR',
  'NB', 'Saint John',
  'NB Power', 'Grid-Scale',
  'TBD', 'TBD', 'TBD',
  300, 1,
  'Pre-Feasibility',
  '2023-01-01',
  'Grid reliability',
  'NB Power, Atlantic Canada Opportunities Agency',
  'NB Power exploring SMR options adjacent to existing Point Lepreau CANDU station. Vendor selection pending.',
  '2024-01-01'
) ON CONFLICT (id) DO NOTHING;

-- Add OPG Darlington regulatory milestones
INSERT INTO smr_regulatory_milestones (project_id, milestone_type, milestone_date, milestone_status, notes) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'CNSC VDR Phase 1 Complete', '2019-12-18', 'Completed', 'GE Hitachi BWRX-300 completed CNSC VDR Phase 1'),
('550e8400-e29b-41d4-a716-446655440001', 'Environmental Assessment Approved', '2024-04-22', 'Completed', 'CNSC confirmed existing EA applicable to BWRX-300'),
('550e8400-e29b-41d4-a716-446655440001', 'Construction License Application', '2024-10-01', 'Completed', 'Two-part public hearing: October 2024 and January 2025'),
('550e8400-e29b-41d4-a716-446655440001', 'CNSC Public Hearing', '2025-01-31', 'Completed', 'Part 2 of public hearing concluded'),
('550e8400-e29b-41d4-a716-446655440001', 'Construction License Issued', '2025-04-04', 'Completed', 'Historic first grid-scale SMR construction license in Canada'),
('550e8400-e29b-41d4-a716-446655440001', 'Reactor Pressure Vessel Delivered', '2027-01-01', 'Planned', 'RPV manufacturing contract awarded January 2025'),
('550e8400-e29b-41d4-a716-446655440001', 'Commercial Operation', '2029-12-31', 'Planned', 'Target commercial operation end of 2029')
ON CONFLICT DO NOTHING;

-- Add technology vendor data
INSERT INTO smr_technology_vendors (
  id, vendor_name, vendor_country, reactor_design, reactor_generation, technology_type,
  capacity_mwe, modularity, passive_safety, walk_away_safe,
  fuel_type, fuel_enrichment_percent, refueling_frequency_months,
  cnsc_vdr_status, cnsc_vdr_completion_date,
  units_operating_globally, units_under_construction_globally,
  design_maturity, technology_readiness_level,
  website_url, notes
) VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  'GE Hitachi Nuclear Energy', 'USA/Japan', 'BWRX-300', 'Gen III+', 'Boiling Water Reactor',
  300, 'Factory-fabricated modules', TRUE, TRUE,
  'LEU (Low Enriched Uranium)', 4.95, 24,
  'Completed', '2019-12-18',
  0, 2,
  'Construction-Ready', 8,
  'https://www.gevernova.com/nuclear/bwrx-300',
  'Completed CNSC VDR. Under construction at OPG Darlington (Canada) and Doosan (Poland). Scaled-down version of ESBWR.'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO smr_technology_vendors (
  id, vendor_name, vendor_country, reactor_design, reactor_generation, technology_type,
  capacity_mwe, passive_safety,
  fuel_type,
  cnsc_vdr_status,
  units_operating_globally, units_under_construction_globally,
  design_maturity, technology_readiness_level,
  website_url, notes
) VALUES (
  '660e8400-e29b-41d4-a716-446655440002',
  'Rolls-Royce SMR', 'United Kingdom', 'Rolls-Royce UK SMR', 'Gen III+', 'Pressurized Water Reactor',
  470, TRUE,
  'LEU (Low Enriched Uranium)',
  'Not Pursuing',
  0, 0,
  'Basic Design', 6,
  'https://www.rolls-royce-smr.com/',
  'UK domestic design. Not pursuing Canadian market. Focus on UK and Europe.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW smr_projects_summary AS
SELECT
  province_code,
  status,
  cnsc_license_stage,
  COUNT(*) as project_count,
  SUM(capacity_mwe * units_planned) as total_planned_capacity_mwe,
  SUM(capacity_mwe * units_operational) as total_operational_capacity_mwe,
  SUM(estimated_capex_cad) as total_estimated_investment_cad,
  SUM(construction_jobs) as total_construction_jobs,
  SUM(permanent_jobs) as total_permanent_jobs
FROM smr_projects
GROUP BY province_code, status, cnsc_license_stage;

COMMENT ON VIEW smr_projects_summary IS 'Summary statistics of SMR projects by province and status';
