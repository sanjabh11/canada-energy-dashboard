-- CCUS (Carbon Capture, Utilization & Storage) Project Tracking Tables
-- Tracks carbon capture facilities and projects across Canada
-- Data sources: Pathways Alliance, Alberta Carbon Trunk Line, Shell Quest, government reports
-- Strategic context: $30B Alberta investment target, 60Mt CO2 offset by 2030

-- =============================================================================
-- 1. CCUS PROJECTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ccus_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  province_code CHAR(2) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,
  location TEXT NOT NULL,

  -- Project classification
  project_type TEXT NOT NULL CHECK (project_type IN (
    'Capture Only', 'Storage Only', 'Transportation', 'Integrated Hub', 'Utilization'
  )),
  status TEXT NOT NULL CHECK (status IN (
    'Operational', 'Construction', 'Planning', 'Feasibility Study', 'Cancelled', 'On Hold'
  )),

  -- Capacity metrics
  capture_capacity_mt_co2_year NUMERIC(10, 2), -- Megatonnes CO2 per year capture capacity
  storage_capacity_mt_co2_total NUMERIC(12, 2), -- Total geological storage capacity (lifetime)
  injection_rate_mt_co2_year NUMERIC(10, 2), -- Current or planned injection rate
  cumulative_stored_mt_co2 NUMERIC(10, 2) DEFAULT 0, -- Total CO2 stored to date

  -- Economic data
  total_investment_cad NUMERIC(15, 2), -- Total project investment (millions CAD)
  cost_per_tonne_cad NUMERIC(8, 2), -- Levelized cost per tonne CO2
  opex_annual_millions_cad NUMERIC(10, 2), -- Annual operating expenses

  -- Technology details
  capture_technology TEXT, -- e.g., 'Post-combustion Amine', 'Pre-combustion', 'Oxy-fuel', 'Direct Air Capture'
  storage_type TEXT CHECK (storage_type IN (
    'Saline Aquifer', 'Depleted Oil Reservoir', 'Depleted Gas Reservoir',
    'Enhanced Oil Recovery', 'Enhanced Gas Recovery', 'Coal Seams', 'Other'
  )),
  co2_source TEXT, -- e.g., 'Oil Sands Upgrading', 'Refining', 'Power Generation', 'Industrial Process'

  -- Infrastructure
  pipeline_length_km NUMERIC(8, 2), -- CO2 pipeline length
  pipeline_capacity_mt_co2_year NUMERIC(10, 2), -- Pipeline transport capacity
  number_of_injection_wells INTEGER,
  storage_depth_meters NUMERIC(8, 2), -- Average storage depth

  -- Dates
  start_date DATE,
  commercial_operation_date DATE,
  expected_end_of_life DATE,

  -- Regulatory & financial
  itc_eligible BOOLEAN DEFAULT TRUE, -- Investment Tax Credit eligible (30% federal)
  itc_value_millions_cad NUMERIC(10, 2), -- Expected ITC value
  provincial_support_millions_cad NUMERIC(10, 2),
  federal_support_millions_cad NUMERIC(10, 2),

  -- Utilization pathways (if applicable)
  utilization_pathway TEXT, -- e.g., 'EOR', 'Industrial Feedstock', 'Mineralization', 'Synthetic Fuels'
  utilization_revenue_millions_cad_year NUMERIC(10, 2), -- Annual revenue from CO2 utilization

  -- Environmental & verification
  verification_standard TEXT, -- e.g., 'ISO 27916', 'CSA Z741', 'Third-party certification'
  monitoring_protocol TEXT,
  leakage_rate_percent NUMERIC(6, 4), -- Annual leakage rate (should be <0.01%)

  -- Stakeholders
  equity_partners TEXT[], -- Array of equity partners
  indigenous_partnership_details TEXT,

  -- Metadata
  data_source TEXT,
  last_verified_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  project_website TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_ccus_project UNIQUE (project_name, operator)
);

CREATE INDEX idx_ccus_projects_province ON ccus_projects(province_code);
CREATE INDEX idx_ccus_projects_status ON ccus_projects(status);
CREATE INDEX idx_ccus_projects_type ON ccus_projects(project_type);
CREATE INDEX idx_ccus_projects_operator ON ccus_projects(operator);

-- =============================================================================
-- 2. CCUS HUBS TABLE (Regional CCUS Clusters)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ccus_hubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hub_name TEXT NOT NULL UNIQUE,
  province_code CHAR(2) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,
  region TEXT NOT NULL,

  -- Hub characteristics
  hub_type TEXT CHECK (hub_type IN ('Industrial Cluster', 'Power Generation', 'Mixed Use')),
  status TEXT CHECK (status IN ('Operational', 'Development', 'Planning', 'Conceptual')),

  -- Capacity
  total_capture_capacity_mt_co2_year NUMERIC(10, 2),
  total_storage_capacity_mt_co2 NUMERIC(12, 2),
  number_of_member_projects INTEGER,

  -- Infrastructure
  shared_pipeline_km NUMERIC(8, 2),
  shared_storage_sites INTEGER,

  -- Economics
  total_investment_cad NUMERIC(15, 2),
  estimated_jobs_created INTEGER,

  -- Key projects (array of project IDs)
  anchor_projects UUID[], -- References to ccus_projects.id

  -- Metadata
  lead_organization TEXT,
  establishment_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ccus_hubs_province ON ccus_hubs(province_code);

-- =============================================================================
-- 3. CCUS POLICY & INCENTIVES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ccus_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL, -- 'Federal' or province code
  policy_name TEXT NOT NULL,
  policy_type TEXT NOT NULL CHECK (policy_type IN (
    'Investment Tax Credit', 'Carbon Price', 'Regulatory Mandate',
    'Grant Program', 'Loan Guarantee', 'Performance Standard'
  )),

  -- Policy details
  effective_date DATE,
  expiry_date DATE,
  incentive_rate NUMERIC(8, 2), -- e.g., 30 for 30% ITC
  incentive_unit TEXT, -- e.g., '% of capex', '$/tonne CO2', 'CAD millions'
  max_incentive_per_project NUMERIC(12, 2), -- Maximum incentive amount

  -- Eligibility criteria
  eligible_project_types TEXT[],
  min_capture_threshold_mt_co2_year NUMERIC(8, 2),
  storage_permanence_requirement_years INTEGER,

  -- Financial details
  annual_budget_millions_cad NUMERIC(10, 2),
  funds_allocated_millions_cad NUMERIC(10, 2),
  funds_remaining_millions_cad NUMERIC(10, 2),

  -- Metadata
  legislative_reference TEXT,
  administering_agency TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_ccus_policy UNIQUE (jurisdiction, policy_name)
);

CREATE INDEX idx_ccus_policies_jurisdiction ON ccus_policies(jurisdiction);
CREATE INDEX idx_ccus_policies_type ON ccus_policies(policy_type);

-- =============================================================================
-- SEED DATA: Real CCUS Projects (Verified from public sources)
-- =============================================================================

-- Major Operational & Planned CCUS Projects
INSERT INTO ccus_projects (
  project_name, operator, province_code, location, project_type, status,
  capture_capacity_mt_co2_year, storage_capacity_mt_co2_total, injection_rate_mt_co2_year,
  cumulative_stored_mt_co2, total_investment_cad, cost_per_tonne_cad,
  capture_technology, storage_type, co2_source, pipeline_length_km,
  start_date, commercial_operation_date, itc_eligible,
  data_source, notes
) VALUES
  -- 1. Shell Quest CCS (Operational - World's first in oil sands)
  (
    'Quest CCS Project',
    'Shell Canada',
    'AB',
    'Scotford Upgrader, Fort Saskatchewan',
    'Integrated Hub',
    'Operational',
    1.0, -- 1 Mt CO2/year capture
    27.0, -- 27 Mt total capacity
    1.0,
    9.5, -- ~9.5 Mt stored since 2015
    1350.0, -- $1.35B investment
    67.0, -- ~$67/tonne levelized cost
    'Post-combustion Amine Scrubbing',
    'Saline Aquifer',
    'Oil Sands Upgrading (Hydrogen Production)',
    65.0, -- 65km pipeline
    '2012-09-01',
    '2015-11-01',
    TRUE,
    'Shell Quest Annual Reports, Government of Alberta',
    'First commercial-scale CCS project in oil sands. Basal Cambrian Sands formation storage. >99% storage security verified. $865M federal + $745M Alberta funding. Captured >9Mt CO2 cumulative.'
  ),

  -- 2. Alberta Carbon Trunk Line (Operational - World's largest CO2 pipeline)
  (
    'Alberta Carbon Trunk Line',
    'Wolf Midstream (Pembina Pipeline subsidiary)',
    'AB',
    'Edmonton Industrial Heartland to Clive',
    'Transportation',
    'Operational',
    NULL, -- Transport only, not capture
    16.0, -- 16 Mt/year transport capacity (expandable to 40 Mt/year)
    14.6, -- Current injection capacity
    6.2, -- ~6.2 Mt stored since 2020
    1200.0, -- $1.2B investment
    NULL,
    NULL,
    'Enhanced Oil Recovery',
    'Industrial CO2 Aggregation',
    240.0, -- 240km world-class pipeline
    '2017-06-01',
    '2020-06-01',
    FALSE,
    'Wolf Midstream, Government of Alberta',
    'World''s largest CO2 pipeline. Connects North West Redwater Partnership Refinery and Nutrien Fertilizer. 240km to Clive oil fields. Permanent storage + EOR. Expandable to 40 Mt/year.'
  ),

  -- 3. Boundary Dam CCS (Operational - World's first full-scale coal CCS)
  (
    'Boundary Dam 3 CCS',
    'SaskPower',
    'SK',
    'Boundary Dam Power Station, Estevan',
    'Integrated Hub',
    'Operational',
    1.0, -- 1 Mt CO2/year
    NULL,
    0.9, -- ~0.9 Mt/year actual capture
    4.8, -- ~4.8 Mt stored since 2014
    1467.0, -- $1.467B investment
    95.0, -- ~$95/tonne (higher than expected)
    'Post-combustion Amine Scrubbing',
    'Enhanced Oil Recovery',
    'Coal-fired Power Generation',
    66.0, -- 66km pipeline
    '2011-01-01',
    '2014-10-01',
    TRUE,
    'SaskPower CCS Reports, Government of Saskatchewan',
    'World''s first commercial-scale CCS on coal power. Unit 3 of Boundary Dam. Supplies Cenovus Weyburn-Midale EOR. Faced operational challenges but proven concept. $240M federal funding.'
  ),

  -- 4. Pathways Alliance Flagship Project (Planning - Largest CCUS proposal in Canada)
  (
    'Pathways Alliance Carbon Capture Hub',
    'Pathways Alliance (Suncor, CNRL, Cenovus, Imperial, ConocoPhillips, MEG)',
    'AB',
    'Oil Sands Region, Cold Lake',
    'Integrated Hub',
    'Planning',
    10.0, -- Initial 10 Mt CO2/year, scalable to 22 Mt/year
    500.0, -- 500 Mt total storage capacity
    10.0,
    0.0,
    16500.0, -- $16.5B initial investment
    60.0, -- Estimated ~$60/tonne with ITC
    'Post-combustion Amine, Potential DAC',
    'Saline Aquifer',
    'Oil Sands Upgrading & Processing',
    400.0, -- ~400km trunk line
    NULL,
    '2030-01-01',
    TRUE,
    'Pathways Alliance Public Filings, Government of Canada',
    '6 oil sands producers targeting 22 Mt CO2/year by 2030. ~1/3 of Canada''s emissions reduction plan. Requires federal ITC finalization. World''s largest CCUS network. Cold Lake air weapons range storage.'
  ),

  -- 5. Sturgeon Refinery CCS (Operational)
  (
    'North West Redwater Partnership Refinery CCS',
    'North West Redwater Partnership (Canadian Natural Resources, North West Refining)',
    'AB',
    'Sturgeon Refinery, Redwater',
    'Integrated Hub',
    'Operational',
    1.3, -- 1.3 Mt CO2/year
    NULL,
    1.3,
    4.5, -- ~4.5 Mt stored since 2020
    9700.0, -- $9.7B total project (CCS component ~$500M)
    NULL,
    'Pre-combustion (Gasification)',
    'Enhanced Oil Recovery',
    'Bitumen Upgrading (Gasification)',
    NULL, -- Uses ACTL pipeline
    '2015-01-01',
    '2020-12-01',
    TRUE,
    'NWR Partnership, Government of Alberta',
    'Integrated with ACTL pipeline. Uses gasification technology. Supplies CO2 to ACTL. Part of Alberta''s Industrial Heartland cluster. Design-integrated CCS from inception.'
  ),

  -- 6. Strathcona Refinery Polypropylene CCS (Planning)
  (
    'Strathcona Renewable Diesel & CCS',
    'Imperial Oil',
    'AB',
    'Strathcona Refinery, Edmonton',
    'Integrated Hub',
    'Planning',
    0.5, -- 500,000 tonnes CO2/year
    NULL,
    0.5,
    0.0,
    560.0, -- $560M investment
    NULL,
    'Post-combustion Capture',
    'Saline Aquifer',
    'Renewable Diesel Production',
    NULL,
    NULL,
    '2025-01-01',
    TRUE,
    'Imperial Oil Press Releases',
    'Canada''s largest renewable diesel facility with integrated CCS. Planned 20,000 bbl/day renewable diesel. Targeting 2025 startup.'
  ),

  -- 7. Weyburn-Midale CO2 Project (Operational - World's largest EOR-CCS)
  (
    'Weyburn-Midale CO2-EOR',
    'Cenovus Energy',
    'SK',
    'Weyburn & Midale Oil Fields',
    'Utilization',
    'Operational',
    NULL, -- Receives CO2, doesn't capture
    30.0, -- 30 Mt storage capacity
    2.8, -- ~2.8 Mt/year injection
    40.0, -- >40 Mt stored since 2000
    1500.0, -- ~$1.5B investment
    NULL,
    NULL,
    'Enhanced Oil Recovery',
    'Imported CO2 from Boundary Dam & U.S. sources',
    300.0, -- 300km+ pipeline from U.S. sources
    '2000-09-01',
    '2000-09-01',
    FALSE,
    'Cenovus, IEA GHG Weyburn-Midale CO2 Monitoring Project',
    'World''s longest-running large-scale CO2-EOR & monitoring project. International Energy Agency study site. Receives CO2 from Boundary Dam and U.S. Receives 10+ publications on storage security.'
  );

-- =============================================================================
-- SEED DATA: CCUS Hubs
-- =============================================================================

INSERT INTO ccus_hubs (
  hub_name, province_code, region, hub_type, status,
  total_capture_capacity_mt_co2_year, total_storage_capacity_mt_co2,
  number_of_member_projects, shared_pipeline_km, total_investment_cad,
  lead_organization, notes
) VALUES
  (
    'Alberta Industrial Heartland CCUS Hub',
    'AB',
    'Edmonton Metro Region',
    'Industrial Cluster',
    'Operational',
    2.3, -- NWR + future capacity
    43.0, -- Basal Cambrian + other formations
    3, -- NWR, Nutrien, future projects
    240.0, -- ACTL trunk line
    11000.0,
    'Wolf Midstream, Government of Alberta',
    'Anchor hub using ACTL pipeline. Includes Sturgeon Refinery, Nutrien, future petrochemical plants. Expandable to 40 Mt/year with full build-out.'
  ),
  (
    'Oil Sands CCUS Cluster',
    'AB',
    'Fort McMurray & Cold Lake',
    'Industrial Cluster',
    'Planning',
    22.0, -- Pathways + other operators
    500.0,
    6, -- Pathways Alliance members
    400.0,
    16500.0,
    'Pathways Alliance',
    'Largest proposed CCUS network in Canada. Integrates 95% of oil sands production. Targeting 22 Mt CO2/year by 2030. Cold Lake Air Weapons Range storage.'
  );

-- =============================================================================
-- SEED DATA: CCUS Policies
-- =============================================================================

INSERT INTO ccus_policies (
  jurisdiction, policy_name, policy_type, effective_date, incentive_rate, incentive_unit,
  eligible_project_types, annual_budget_millions_cad, legislative_reference, administering_agency, notes
) VALUES
  (
    'Federal',
    'CCUS Investment Tax Credit',
    'Investment Tax Credit',
    '2024-01-01',
    60.0, -- 60% for DAC, 50% for capture, 37.5% for transport, 37.5% for storage
    '% of eligible expenses',
    ARRAY['Capture Only', 'Storage Only', 'Transportation', 'Integrated Hub'],
    NULL,
    'Bill C-59, Budget Implementation Act, 2024',
    'Canada Revenue Agency',
    'Refundable tax credit. Capture equipment: 50%. Transport: 37.5%. Storage: 37.5%. Direct Air Capture: 60%. Storage permanence requirement: 99% over 20 years.'
  ),
  (
    'AB',
    'Alberta Petrochemicals Incentive Program',
    'Grant Program',
    '2016-01-01',
    NULL,
    'CAD millions per project',
    ARRAY['Integrated Hub'],
    300.0,
    'Alberta Petrochemicals Incentive Program Regulation',
    'Alberta Ministry of Energy',
    'Up to $300M in grants for petrochemical diversification. Includes CCS integration incentives. Quest received $745M Alberta funding.'
  ),
  (
    'SK',
    'SaskPower CCS Capital Contribution',
    'Grant Program',
    '2011-01-01',
    NULL,
    'Direct capital investment',
    ARRAY['Integrated Hub'],
    NULL,
    'SaskPower Act',
    'SaskPower Corporation',
    'Crown corporation capital investment. Boundary Dam CCS received provincial capital support.'
  ),
  (
    'Federal',
    'Emissions Reduction Alberta (ERA)',
    'Grant Program',
    '2009-01-01',
    NULL,
    'Project-specific grants',
    ARRAY['Capture Only', 'Storage Only', 'Integrated Hub', 'Utilization'],
    100.0,
    'Technology Innovation and Emissions Reduction Regulation (TIER)',
    'Emissions Reduction Alberta',
    'Formerly Climate Change and Emissions Management Corporation (CCEMC). Funded >$700M in cleantech R&D. Supported Quest and other CCUS pilots.'
  );

-- =============================================================================
-- MATERIALIZED VIEW: CCUS Project Summary
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS ccus_project_summary AS
SELECT
  cp.province_code,
  p.name AS province_name,
  cp.status,
  COUNT(cp.id) AS project_count,
  SUM(cp.capture_capacity_mt_co2_year) AS total_capture_capacity_mt_co2_year,
  SUM(cp.storage_capacity_mt_co2_total) AS total_storage_capacity_mt_co2,
  SUM(cp.cumulative_stored_mt_co2) AS total_stored_mt_co2,
  SUM(cp.total_investment_cad) AS total_investment_millions_cad,
  ROUND(AVG(cp.cost_per_tonne_cad), 2) AS avg_cost_per_tonne_cad,
  COUNT(DISTINCT cp.operator) AS num_operators
FROM ccus_projects cp
JOIN provinces p ON cp.province_code = p.code
GROUP BY cp.province_code, p.name, cp.status;

CREATE UNIQUE INDEX idx_ccus_project_summary ON ccus_project_summary(province_code, status);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW ccus_project_summary;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE ccus_projects IS 'Carbon capture, utilization, and storage projects across Canada - tracking Alberta''s $30B CCUS investment strategy';
COMMENT ON TABLE ccus_hubs IS 'Regional CCUS clusters and industrial hubs for shared infrastructure';
COMMENT ON TABLE ccus_policies IS 'Federal and provincial CCUS incentives, tax credits, and policy frameworks';
COMMENT ON MATERIALIZED VIEW ccus_project_summary IS 'Aggregated CCUS capacity, investment, and progress by province and status';

-- =============================================================================
-- DATA QUALITY VERIFICATION
-- =============================================================================

-- Verify data insertion
DO $$
BEGIN
  RAISE NOTICE 'CCUS Projects Inserted: %', (SELECT COUNT(*) FROM ccus_projects);
  RAISE NOTICE 'Total Operational Capture Capacity: % Mt CO2/year',
    (SELECT SUM(capture_capacity_mt_co2_year) FROM ccus_projects WHERE status = 'Operational');
  RAISE NOTICE 'Total Cumulative CO2 Stored: % Mt',
    (SELECT SUM(cumulative_stored_mt_co2) FROM ccus_projects);
  RAISE NOTICE 'CCUS Policies Inserted: %', (SELECT COUNT(*) FROM ccus_policies);
END $$;
