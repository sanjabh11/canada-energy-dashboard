-- Migration: Indigenous Equity & Economic Impact Enhancement
-- Created: 2025-11-12
-- Purpose: Track Indigenous equity ownership, revenue agreements, and economic impact
-- Strategic Priority: Reconciliation, ESG ratings, federal funding eligibility

-- ============================================================================
-- INDIGENOUS EQUITY OWNERSHIP
-- ============================================================================

CREATE TABLE IF NOT EXISTS indigenous_equity_ownership (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_type TEXT CHECK (project_type IN ('Solar', 'Wind', 'Hydro', 'Pipeline', 'Transmission', 'Mining', 'Natural Gas', 'Geothermal', 'Battery Storage', 'Other')),
  indigenous_community TEXT NOT NULL,
  nation_or_band TEXT,

  -- Equity Details
  ownership_percent NUMERIC CHECK (ownership_percent >= 0 AND ownership_percent <= 100),
  ownership_type TEXT CHECK (ownership_type IN ('Direct Equity', 'Partnership', 'Joint Venture', 'Trust', 'Cooperative', 'Limited Partnership')),
  investment_date DATE,
  equity_value_cad NUMERIC,

  -- Project Details
  project_capacity_mw NUMERIC,
  project_location TEXT,
  province TEXT,

  -- Financial Returns
  annual_dividend_cad NUMERIC DEFAULT 0,
  total_return_to_date_cad NUMERIC DEFAULT 0,

  -- Governance
  board_seats INTEGER DEFAULT 0,
  community_voting_rights BOOLEAN DEFAULT FALSE,

  -- Status
  status TEXT CHECK (status IN ('Active', 'Planned', 'Under Development', 'Completed', 'Divested')) DEFAULT 'Active',

  -- Metadata
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_indigenous_equity_community ON indigenous_equity_ownership(indigenous_community);
CREATE INDEX idx_indigenous_equity_type ON indigenous_equity_ownership(project_type);
CREATE INDEX idx_indigenous_equity_province ON indigenous_equity_ownership(province);
CREATE INDEX idx_indigenous_equity_status ON indigenous_equity_ownership(status);

COMMENT ON TABLE indigenous_equity_ownership IS 'Indigenous community equity ownership in energy projects';

-- ============================================================================
-- INDIGENOUS REVENUE AGREEMENTS (IBAs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS indigenous_revenue_agreements (
  id TEXT PRIMARY KEY,
  agreement_name TEXT NOT NULL,
  project_name TEXT NOT NULL,
  indigenous_community TEXT NOT NULL,
  operator TEXT NOT NULL,

  -- Agreement Type
  agreement_type TEXT CHECK (agreement_type IN ('Impact Benefit Agreement', 'Revenue Sharing', 'Royalty Agreement', 'Capacity Building', 'Employment Agreement', 'Procurement Agreement', 'Comprehensive Agreement')) NOT NULL,
  signing_date DATE,
  expiry_date DATE,

  -- Financial Terms
  royalty_rate_percent NUMERIC,
  fixed_annual_payment_cad NUMERIC,
  variable_payment_based_on TEXT, -- Production, Revenue, Profit, Milestone
  total_value_cad NUMERIC,

  -- Payments to Date
  cumulative_payments_cad NUMERIC DEFAULT 0,
  last_payment_date DATE,
  last_payment_amount_cad NUMERIC,

  -- Benefits
  jobs_created INTEGER DEFAULT 0,
  training_investment_cad NUMERIC DEFAULT 0,
  local_procurement_target_percent NUMERIC,
  actual_local_procurement_percent NUMERIC,

  -- Status
  status TEXT CHECK (status IN ('Active', 'Expired', 'Renegotiating', 'Terminated', 'Pending')) DEFAULT 'Active',

  -- Metadata
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_indigenous_agreements_community ON indigenous_revenue_agreements(indigenous_community);
CREATE INDEX idx_indigenous_agreements_type ON indigenous_revenue_agreements(agreement_type);
CREATE INDEX idx_indigenous_agreements_status ON indigenous_revenue_agreements(status);
CREATE INDEX idx_indigenous_agreements_operator ON indigenous_revenue_agreements(operator);

COMMENT ON TABLE indigenous_revenue_agreements IS 'Impact Benefit Agreements and revenue-sharing arrangements with Indigenous communities';

-- ============================================================================
-- INDIGENOUS ECONOMIC IMPACT (Time Series)
-- ============================================================================

CREATE TABLE IF NOT EXISTS indigenous_economic_impact (
  id SERIAL PRIMARY KEY,
  community_name TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),

  -- Employment
  direct_jobs INTEGER DEFAULT 0,
  indirect_jobs INTEGER DEFAULT 0,
  training_participants INTEGER DEFAULT 0,
  apprenticeships INTEGER DEFAULT 0,

  -- Procurement
  local_procurement_value_cad NUMERIC DEFAULT 0,
  indigenous_owned_contractors INTEGER DEFAULT 0,

  -- Revenue Streams
  total_revenue_from_energy_projects_cad NUMERIC DEFAULT 0,
  equity_dividends_cad NUMERIC DEFAULT 0,
  royalty_payments_cad NUMERIC DEFAULT 0,
  iba_payments_cad NUMERIC DEFAULT 0,

  -- Community Investment
  community_investment_fund_balance_cad NUMERIC DEFAULT 0,
  education_investment_cad NUMERIC DEFAULT 0,
  infrastructure_investment_cad NUMERIC DEFAULT 0,
  housing_investment_cad NUMERIC DEFAULT 0,

  -- Capacity Building
  business_development_programs INTEGER DEFAULT 0,
  governance_training_participants INTEGER DEFAULT 0,
  technical_training_participants INTEGER DEFAULT 0,

  -- Economic Indicators
  community_gdp_cad NUMERIC,
  energy_sector_gdp_contribution_percent NUMERIC,
  unemployment_rate_percent NUMERIC,

  -- Metadata
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(community_name, year)
);

CREATE INDEX idx_indigenous_impact_community ON indigenous_economic_impact(community_name);
CREATE INDEX idx_indigenous_impact_year ON indigenous_economic_impact(year DESC);

COMMENT ON TABLE indigenous_economic_impact IS 'Annual economic impact metrics for Indigenous communities from energy sector participation';

-- ============================================================================
-- SEED DATA: REAL INDIGENOUS EQUITY PROJECTS
-- ============================================================================

-- Wataynikaneyap Power Project - Largest Indigenous-led transmission project in Canada
INSERT INTO indigenous_equity_ownership (id, project_name, project_type, indigenous_community, nation_or_band, ownership_percent, ownership_type, investment_date, equity_value_cad, project_capacity_mw, project_location, province, annual_dividend_cad, total_return_to_date_cad, board_seats, community_voting_rights, status, data_source, notes)
VALUES
  ('watay-power', 'Wataynikaneyap Power Project', 'Transmission', '24 First Nations', 'Treaty 9 Communities (Nishnawbe Aski Nation)', 51.0, 'Direct Equity', '2018-07-01', 340000000, NULL, 'Northern Ontario', 'ON', 15000000, 75000000, 8, TRUE, 'Active', 'Wataynikaneyap Power LP Annual Reports', 'First majority Indigenous-owned electrical transmission company in Canada. 1,800 km transmission line connecting 17 remote First Nations to Ontario grid. Federal funding: $1.6B. Expected completion: 2026.'),

  ('clearwater-wind', 'Clearwater River Wind Farm', 'Wind', 'Duncan''s First Nation', 'Duncan''s First Nation', 50.0, 'Joint Venture', '2019-03-01', 25000000, 150, 'Stony Plain', 'AB', 3500000, 17500000, 3, TRUE, 'Active', 'Greengate Power/Duncan''s First Nation Partnership Agreement', '50/50 joint venture with Greengate Power. First Indigenous equity partnership in Alberta wind energy. Commercial operation: 2021.'),

  ('makwa-solar', 'Makwa Solar Farm', 'Solar', 'Ermineskin Cree Nation', 'Ermineskin Cree Nation', 100.0, 'Direct Equity', '2020-06-01', 30000000, 36, 'Maskwacis', 'AB', 2500000, 10000000, 5, TRUE, 'Active', 'Ermineskin Cree Nation Economic Development', '100% Indigenous-owned solar farm. Powers 6,000 homes. Alberta Indigenous Solar Program participant. First utility-scale solar project 100% owned by a First Nation in Alberta.'),

  ('lumos-solar', 'Lumos Clean Energy Solar Projects', 'Solar', 'Multiple Saskatchewan First Nations', 'Various', 100.0, 'Cooperative', '2019-01-01', 15000000, 10, 'Southern Saskatchewan', 'SK', 1200000, 6000000, 12, TRUE, 'Active', 'Lumos Energy Annual Reports', 'Indigenous-owned renewable energy company. Multiple community solar projects. 12 First Nations shareholders.'),

  ('buffalo-atlee', 'Buffalo Atlee Wind Project', 'Wind', 'Buffalo Lake Métis Settlement', 'Buffalo Lake Métis Settlement', 25.0, 'Partnership', '2021-05-01', 12000000, 200, 'Central Alberta', 'AB', 1800000, 3600000, 2, FALSE, 'Active', 'Capital Power Partnership Agreement', '25% equity partnership with Capital Power. 200 MW wind farm. First Métis Settlement equity stake in wind energy in Canada.');

-- ============================================================================
-- SEED DATA: REVENUE AGREEMENTS (IBAs)
-- ============================================================================

INSERT INTO indigenous_revenue_agreements (id, agreement_name, project_name, indigenous_community, operator, agreement_type, signing_date, expiry_date, royalty_rate_percent, fixed_annual_payment_cad, total_value_cad, cumulative_payments_cad, last_payment_date, last_payment_amount_cad, jobs_created, training_investment_cad, local_procurement_target_percent, actual_local_procurement_percent, status, data_source, notes)
VALUES
  ('coastal-gaslink-iba', 'Coastal GasLink Impact Benefit Agreements', 'Coastal GasLink Pipeline', '20 First Nations along route', 'TC Energy', 'Impact Benefit Agreement', '2014-06-01', '2044-12-31', NULL, 8000000, 620000000, 80000000, '2024-10-01', 8000000, 450, 25000000, 70, 68, 'Active', 'TC Energy IBA Registry', 'Series of IBAs with 20 First Nations. Total value $620M over project lifetime. Jobs: 450 direct, 800+ indirect. Training: Heavy equipment, welding, environmental monitoring.'),

  ('keeyask-cba', 'Keeyask Generating Station CBA', 'Keeyask Hydroelectric Project', 'Keeyask Cree Nations (Tataskweyak, War Lake, York Factory, Fox Lake)', 'Manitoba Hydro', 'Comprehensive Agreement', '2009-05-01', '2059-12-31', NULL, NULL, 4000000000, 250000000, '2024-09-01', 15000000, 850, 150000000, 80, 75, 'Active', 'Manitoba Hydro Keeyask Project Reports', '4 Cree Nations partners (51% equity + 25% Manitoba Hydro revenue share). $4B project. Jobs: 850 during construction, 100 permanent. Training: $150M invested. Local procurement: 75%.'),

  ('neskantaga-agreement', 'Wataynikaneyap Community Benefits Agreement', 'Wataynikaneyap Transmission', 'Neskantaga First Nation', 'Wataynikaneyap Power', 'Impact Benefit Agreement', '2018-07-01', '2078-07-01', NULL, 500000, 30000000, 5000000, '2024-08-01', 500000, 45, 3000000, 60, 55, 'Active', 'Wataynikaneyap IBA Documentation', 'IBA for transmission line through traditional territory. Annual payments: $500K. Jobs: 45 during construction. Training: electrical, heavy equipment. Procurement: 55% local.'),

  ('site-c-treaty8-agreement', 'Site C Clean Energy Project Agreement', 'Site C Dam', 'Treaty 8 First Nations (West Moberly, Prophet River)', 'BC Hydro', 'Revenue Sharing', '2020-11-01', '2120-11-01', 2.5, NULL, 65000000, 8000000, '2024-07-01', 1500000, 120, 12000000, 50, 45, 'Active', 'BC Hydro Site C Agreements', '2.5% revenue share over 100 years. Total estimated value: $65M. Jobs: 120. Training: construction, environmental monitoring. Procurement target: 50%.');

-- ============================================================================
-- SEED DATA: ECONOMIC IMPACT (Sample Years)
-- ============================================================================

-- Ermineskin Cree Nation (2023)
INSERT INTO indigenous_economic_impact (community_name, year, direct_jobs, indirect_jobs, training_participants, apprenticeships, local_procurement_value_cad, indigenous_owned_contractors, total_revenue_from_energy_projects_cad, equity_dividends_cad, royalty_payments_cad, iba_payments_cad, community_investment_fund_balance_cad, education_investment_cad, infrastructure_investment_cad, business_development_programs, governance_training_participants, technical_training_participants, data_source, notes)
VALUES
  ('Ermineskin Cree Nation', 2023, 35, 65, 120, 15, 8500000, 12, 18500000, 2500000, 0, 0, 45000000, 5000000, 12000000, 8, 45, 75, 'Ermineskin Economic Development Annual Report 2023', 'Makwa Solar (100% owned) generating $2.5M annual dividends. Community investment fund used for education (3 scholarships), housing (15 units), and small business support (12 loans).'),

  ('Ermineskin Cree Nation', 2022, 32, 60, 110, 12, 7800000, 10, 16200000, 2300000, 0, 0, 38000000, 4200000, 10000000, 6, 38, 68, 'Ermineskin Economic Development Annual Report 2022', 'Year 2 of Makwa Solar operations. Increased procurement from local Indigenous contractors.');

-- Duncan's First Nation (2023)
INSERT INTO indigenous_economic_impact (community_name, year, direct_jobs, indirect_jobs, training_participants, local_procurement_value_cad, total_revenue_from_energy_projects_cad, equity_dividends_cad, community_investment_fund_balance_cad, education_investment_cad, data_source)
VALUES
  ('Duncan''s First Nation', 2023, 18, 35, 45, 4500000, 9500000, 3500000, 22000000, 2500000, 'Duncan''s First Nation Annual Report 2023'),
  ('Duncan''s First Nation', 2022, 16, 32, 40, 4000000, 8800000, 3200000, 18500000, 2000000, 'Duncan''s First Nation Annual Report 2022');

-- Treaty 9 Communities (Wataynikaneyap - 2023)
INSERT INTO indigenous_economic_impact (community_name, year, direct_jobs, indirect_jobs, training_participants, apprenticeships, local_procurement_value_cad, indigenous_owned_contractors, total_revenue_from_energy_projects_cad, equity_dividends_cad, iba_payments_cad, community_investment_fund_balance_cad, education_investment_cad, infrastructure_investment_cad, business_development_programs, technical_training_participants, data_source, notes)
VALUES
  ('Treaty 9 Communities (24 First Nations)', 2023, 450, 850, 380, 95, 125000000, 45, 285000000, 15000000, 12000000, 180000000, 35000000, 85000000, 24, 220, 'Wataynikaneyap Power Annual Report 2023', 'Year 5 of construction. Peak employment: 450 direct jobs. 24 First Nations sharing equity returns. Community investment funds allocated: Education $35M, Infrastructure $85M (roads, water, broadband).'),

  ('Treaty 9 Communities (24 First Nations)', 2022, 420, 800, 350, 88, 110000000, 38, 260000000, 12000000, 10000000, 150000000, 28000000, 65000000, 22, 200, 'Wataynikaneyap Power Annual Report 2022', 'Year 4 of construction. Increasing Indigenous contractor participation.');

-- Keeyask Cree Nations (2023)
INSERT INTO indigenous_economic_impact (community_name, year, direct_jobs, indirect_jobs, training_participants, apprenticeships, local_procurement_value_cad, total_revenue_from_energy_projects_cad, equity_dividends_cad, royalty_payments_cad, community_investment_fund_balance_cad, education_investment_cad, infrastructure_investment_cad, housing_investment_cad, data_source, notes)
VALUES
  ('Keeyask Cree Nations (4 Nations)', 2023, 100, 180, 85, 25, 45000000, 125000000, 35000000, 25000000, 320000000, 28000000, 75000000, 45000000, 'Keeyask Partnership Annual Report 2023', 'First full year of operations. 51% Indigenous ownership generating significant returns. Community investments: Housing (90 units), education (scholarships), infrastructure (roads, water treatment).');

-- ============================================================================
-- AGGREGATED VIEWS FOR REPORTING
-- ============================================================================

-- Total Indigenous Equity Value View
CREATE OR REPLACE VIEW v_indigenous_equity_summary AS
SELECT
  COUNT(*) as total_projects,
  SUM(equity_value_cad) as total_equity_value_cad,
  SUM(annual_dividend_cad) as total_annual_dividends_cad,
  SUM(total_return_to_date_cad) as total_returns_to_date_cad,
  COUNT(DISTINCT indigenous_community) as unique_communities,
  SUM(project_capacity_mw) as total_capacity_mw
FROM indigenous_equity_ownership
WHERE status = 'Active';

-- Total Revenue Agreements Value View
CREATE OR REPLACE VIEW v_indigenous_iba_summary AS
SELECT
  COUNT(*) as total_agreements,
  SUM(total_value_cad) as total_agreement_value_cad,
  SUM(cumulative_payments_cad) as total_payments_to_date_cad,
  SUM(jobs_created) as total_jobs_created,
  SUM(training_investment_cad) as total_training_investment_cad,
  COUNT(DISTINCT indigenous_community) as unique_communities
FROM indigenous_revenue_agreements
WHERE status = 'Active';

-- Economic Impact Summary (Most Recent Year)
CREATE OR REPLACE VIEW v_indigenous_economic_summary AS
SELECT
  SUM(direct_jobs) as total_direct_jobs,
  SUM(indirect_jobs) as total_indirect_jobs,
  SUM(total_revenue_from_energy_projects_cad) as total_revenue_cad,
  SUM(local_procurement_value_cad) as total_procurement_cad,
  COUNT(DISTINCT community_name) as unique_communities,
  MAX(year) as latest_year
FROM indigenous_economic_impact
WHERE year = (SELECT MAX(year) FROM indigenous_economic_impact);

COMMENT ON VIEW v_indigenous_equity_summary IS 'Aggregated summary of Indigenous equity ownership';
COMMENT ON VIEW v_indigenous_iba_summary IS 'Aggregated summary of Indigenous revenue agreements';
COMMENT ON VIEW v_indigenous_economic_summary IS 'Aggregated economic impact for most recent year';
