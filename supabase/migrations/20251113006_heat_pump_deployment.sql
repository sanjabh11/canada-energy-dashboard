-- Migration: Heat Pump Deployment & Residential Electrification Tracking
-- Created: 2025-11-13
-- Purpose: Track heat pump installations, rebate programs, performance, and residential decarbonization
-- Strategic Priority: Federal building decarbonization, Oil to Heat Pump Affordability Program ($15,000), provincial rebates
-- Gap Analysis: MEDIUM PRIORITY - Residential electrification tracking (previously 2.5/5.0)

-- ============================================================================
-- HEAT PUMP INSTALLATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS heat_pump_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id TEXT UNIQUE,

  -- Location (privacy-protected)
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'AB', 'SK', 'BC', 'MB', 'QC', 'NB', 'NS', 'NL', 'PE', 'NT', 'YT', 'NU')),
  postal_code_fsa TEXT, -- First 3 characters only for privacy
  municipality TEXT,
  climate_zone TEXT CHECK (climate_zone IN ('Zone 4 (Mild)', 'Zone 5 (Cool)', 'Zone 6 (Cold)', 'Zone 7 (Very Cold)', 'Zone 8 (Subarctic)')),

  -- Building characteristics
  building_type TEXT CHECK (building_type IN (
    'Single Family Detached',
    'Single Family Attached',
    'Multi-Unit Residential',
    'Mobile Home',
    'Small Commercial',
    'Other'
  )),
  building_age_years INTEGER,
  building_size_sqft INTEGER,
  building_insulation_level TEXT CHECK (building_insulation_level IN ('Poor', 'Fair', 'Good', 'Excellent')),

  -- Heat pump specifications
  heat_pump_type TEXT CHECK (heat_pump_type IN (
    'Air Source Heat Pump (ASHP)',
    'Cold Climate Air Source Heat Pump (ccASHP)',
    'Ground Source Heat Pump (GSHP)',
    'Water Source Heat Pump',
    'Hybrid Heat Pump',
    'Ductless Mini-Split',
    'Ducted Central System'
  )) NOT NULL,

  manufacturer TEXT,
  model TEXT,
  rated_heating_capacity_btu NUMERIC,
  rated_cooling_capacity_btu NUMERIC,

  -- Efficiency ratings
  hspf NUMERIC, -- Heating Seasonal Performance Factor
  hspf2 NUMERIC, -- Updated HSPF2 standard
  seer NUMERIC, -- Seasonal Energy Efficiency Ratio (cooling)
  seer2 NUMERIC, -- Updated SEER2 standard
  cop NUMERIC, -- Coefficient of Performance
  minimum_operating_temperature_c NUMERIC,

  -- Installation details
  installation_date DATE NOT NULL,
  installer_company TEXT,
  installer_certified BOOLEAN DEFAULT TRUE,

  -- Replaced heating system
  previous_heating_system TEXT CHECK (previous_heating_system IN (
    'Oil Furnace',
    'Natural Gas Furnace',
    'Propane Furnace',
    'Electric Baseboards',
    'Electric Furnace',
    'Wood/Biomass',
    'None (New Construction)'
  )),
  previous_heating_fuel TEXT,

  -- System configuration
  backup_heating BOOLEAN DEFAULT FALSE,
  backup_heating_type TEXT, -- Electric resistance, gas furnace, etc.
  hybrid_configuration BOOLEAN DEFAULT FALSE,
  includes_domestic_hot_water BOOLEAN DEFAULT FALSE,

  -- Economics
  equipment_cost_cad NUMERIC,
  installation_cost_cad NUMERIC,
  total_project_cost_cad NUMERIC,

  -- Rebates & incentives received
  federal_rebate_amount_cad NUMERIC DEFAULT 0,
  provincial_rebate_amount_cad NUMERIC DEFAULT 0,
  utility_rebate_amount_cad NUMERIC DEFAULT 0,
  total_rebates_received_cad NUMERIC,
  net_cost_to_homeowner_cad NUMERIC,

  rebate_program_names TEXT[], -- Array of program names

  -- Performance tracking
  estimated_annual_energy_savings_kwh NUMERIC,
  estimated_annual_cost_savings_cad NUMERIC,
  estimated_ghg_reduction_tonnes_co2e_per_year NUMERIC,

  -- Energy consumption (actual if available)
  actual_annual_electricity_consumption_kwh NUMERIC,
  actual_annual_cost_cad NUMERIC,
  actual_cop_average NUMERIC,

  -- Customer satisfaction
  customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating BETWEEN 1 AND 5),
  would_recommend BOOLEAN,

  -- Data source
  data_source TEXT DEFAULT 'Rebate Program Database',
  data_collection_consent BOOLEAN DEFAULT TRUE,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hp_province ON heat_pump_installations(province_code);
CREATE INDEX idx_hp_type ON heat_pump_installations(heat_pump_type);
CREATE INDEX idx_hp_install_date ON heat_pump_installations(installation_date);
CREATE INDEX idx_hp_previous_system ON heat_pump_installations(previous_heating_system);
CREATE INDEX idx_hp_climate_zone ON heat_pump_installations(climate_zone);
CREATE INDEX idx_hp_building_type ON heat_pump_installations(building_type);

COMMENT ON TABLE heat_pump_installations IS 'Privacy-protected tracking of heat pump installations, rebates, and performance';

-- ============================================================================
-- HEAT PUMP REBATE PROGRAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS heat_pump_rebate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL,
  program_administrator TEXT NOT NULL, -- Federal Govt, Province, Utility, Municipality

  -- Jurisdiction
  program_level TEXT CHECK (program_level IN ('Federal', 'Provincial', 'Utility', 'Municipal')) NOT NULL,
  province_code TEXT CHECK (province_code IN ('ON', 'AB', 'SK', 'BC', 'MB', 'QC', 'NB', 'NS', 'NL', 'PE', 'NT', 'YT', 'NU', 'CA')),
  utility_territory TEXT,

  -- Program type
  program_type TEXT CHECK (program_type IN (
    'Equipment Rebate',
    'Oil to Heat Pump Conversion',
    'Low-Income Support',
    'Interest-Free Loan',
    'Tax Credit',
    'Grant'
  )),

  -- Eligibility
  eligible_heat_pump_types TEXT[], -- Array: ['Air Source', 'Cold Climate', 'Ground Source']
  income_qualified_only BOOLEAN DEFAULT FALSE,
  maximum_household_income_cad INTEGER,
  homeowner_only BOOLEAN DEFAULT TRUE,
  renter_eligible BOOLEAN DEFAULT FALSE,

  -- Rebate amounts
  base_rebate_amount_cad NUMERIC NOT NULL,
  low_income_bonus_cad NUMERIC DEFAULT 0,
  rural_bonus_cad NUMERIC DEFAULT 0,
  oil_conversion_bonus_cad NUMERIC DEFAULT 0,
  maximum_rebate_cad NUMERIC,

  -- Equipment requirements
  minimum_hspf NUMERIC,
  minimum_seer NUMERIC,
  minimum_cop NUMERIC,
  cold_climate_certified_required BOOLEAN DEFAULT FALSE,
  energy_star_certified_required BOOLEAN DEFAULT FALSE,

  -- Installation requirements
  certified_installer_required BOOLEAN DEFAULT TRUE,
  pre_approval_required BOOLEAN DEFAULT FALSE,
  post_installation_inspection BOOLEAN DEFAULT FALSE,

  -- Program budget & uptake
  total_program_budget_cad NUMERIC,
  allocated_budget_cad NUMERIC,
  committed_budget_cad NUMERIC,
  remaining_budget_cad NUMERIC,

  installations_funded INTEGER DEFAULT 0,
  target_installations INTEGER,

  -- Timeline
  program_start_date DATE NOT NULL,
  program_end_date DATE,
  application_deadline DATE,
  funding_exhausted_date DATE,

  -- Program status
  status TEXT CHECK (status IN (
    'Active - Accepting Applications',
    'Active - Waitlist',
    'Paused - Funding Exhausted',
    'Closed - Completed',
    'Cancelled'
  )) DEFAULT 'Active - Accepting Applications',

  -- Application process
  application_url TEXT,
  eligibility_checker_url TEXT,
  average_processing_time_days INTEGER,

  -- Stackability
  stackable_with_federal BOOLEAN DEFAULT TRUE,
  stackable_with_provincial BOOLEAN DEFAULT TRUE,
  stackable_with_utility BOOLEAN DEFAULT TRUE,

  -- Impact
  total_ghg_reduction_tonnes_co2e NUMERIC,
  total_oil_furnaces_replaced INTEGER,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hp_rebate_level ON heat_pump_rebate_programs(program_level);
CREATE INDEX idx_hp_rebate_province ON heat_pump_rebate_programs(province_code);
CREATE INDEX idx_hp_rebate_type ON heat_pump_rebate_programs(program_type);
CREATE INDEX idx_hp_rebate_status ON heat_pump_rebate_programs(status);
CREATE INDEX idx_hp_rebate_dates ON heat_pump_rebate_programs(program_start_date, program_end_date);

COMMENT ON TABLE heat_pump_rebate_programs IS 'Federal, provincial, utility, and municipal heat pump rebate programs';

-- ============================================================================
-- HEAT PUMP DEPLOYMENT STATISTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS heat_pump_deployment_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'AB', 'SK', 'BC', 'MB', 'QC', 'NB', 'NS', 'NL', 'PE', 'NT', 'YT', 'NU', 'CA')),
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,

  -- Installation counts
  heat_pumps_installed INTEGER NOT NULL,
  ashp_installed INTEGER DEFAULT 0,
  ccashp_installed INTEGER DEFAULT 0,
  gshp_installed INTEGER DEFAULT 0,

  -- Conversions
  oil_to_heat_pump_conversions INTEGER DEFAULT 0,
  gas_to_heat_pump_conversions INTEGER DEFAULT 0,
  electric_baseboard_to_heat_pump_conversions INTEGER DEFAULT 0,

  -- Cumulative stats
  cumulative_heat_pumps_installed INTEGER,
  heat_pump_market_penetration_percent NUMERIC,

  -- Economics
  total_rebates_paid_cad NUMERIC,
  average_rebate_per_installation_cad NUMERIC,
  total_equipment_spending_cad NUMERIC,

  -- Environmental impact
  total_ghg_reduction_tonnes_co2e NUMERIC,
  total_oil_displaced_liters NUMERIC,
  total_gas_displaced_m3 NUMERIC,

  -- Market dynamics
  average_equipment_cost_cad NUMERIC,
  average_installation_cost_cad NUMERIC,
  average_total_project_cost_cad NUMERIC,

  -- Federal targets
  federal_target_installations INTEGER,
  federal_target_ghg_reduction_tonnes NUMERIC,
  on_track_to_meet_target BOOLEAN,

  data_source TEXT DEFAULT 'NRCan, Provincial Rebate Programs',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(province_code, reporting_period_start, reporting_period_end)
);

CREATE INDEX idx_hp_stats_province ON heat_pump_deployment_stats(province_code);
CREATE INDEX idx_hp_stats_period ON heat_pump_deployment_stats(reporting_period_start);

COMMENT ON TABLE heat_pump_deployment_stats IS 'Aggregated heat pump deployment statistics by province and time period';

-- ============================================================================
-- SEED DATA: Major Federal & Provincial Rebate Programs
-- ============================================================================

-- Federal: Oil to Heat Pump Affordability (OHPA) Program
INSERT INTO heat_pump_rebate_programs (
  id, program_name, program_administrator,
  program_level, province_code,
  program_type,
  eligible_heat_pump_types,
  income_qualified_only, maximum_household_income_cad,
  base_rebate_amount_cad, low_income_bonus_cad, maximum_rebate_cad,
  minimum_hspf, cold_climate_certified_required, energy_star_certified_required,
  certified_installer_required,
  total_program_budget_cad,
  program_start_date,
  status,
  application_url,
  stackable_with_provincial,
  notes
) VALUES (
  'ee0e8400-e29b-41d4-a716-446655440001',
  'Oil to Heat Pump Affordability (OHPA) Program', 'Natural Resources Canada',
  'Federal', 'CA',
  'Oil to Heat Pump Conversion',
  ARRAY['Air Source Heat Pump (ASHP)', 'Cold Climate Air Source Heat Pump (ccASHP)', 'Ground Source Heat Pump (GSHP)'],
  TRUE, 70000,
  10000, 5000, 15000,
  9.0, TRUE, TRUE,
  TRUE,
  250000000,
  '2023-01-01',
  'Active - Accepting Applications',
  'https://natural-resources.canada.ca/energy-efficiency/homes/oil-heat-pump-affordability-program',
  TRUE,
  'Federal grants up to $15,000 for low-to-median income households converting from oil heating. Income limits: $70,000 base, $80,000 if 3+ occupants. Cold climate certified heat pump required. One-time $250 bonus payment. Stackable with provincial programs.'
) ON CONFLICT (id) DO NOTHING;

-- Federal: Canada Greener Homes Loan
INSERT INTO heat_pump_rebate_programs (
  id, program_name, program_administrator,
  program_level, province_code,
  program_type,
  eligible_heat_pump_types,
  base_rebate_amount_cad, maximum_rebate_cad,
  program_start_date, program_end_date,
  status,
  application_url,
  notes
) VALUES (
  'ee0e8400-e29b-41d4-a716-446655440002',
  'Canada Greener Homes Loan', 'Natural Resources Canada',
  'Federal', 'CA',
  'Interest-Free Loan',
  ARRAY['Air Source Heat Pump (ASHP)', 'Cold Climate Air Source Heat Pump (ccASHP)', 'Ground Source Heat Pump (GSHP)'],
  40000, 40000,
  '2022-01-01', '2027-03-31',
  'Active - Accepting Applications',
  'https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative',
  '$40,000 interest-free loan for home energy retrofits including heat pumps. Program remains open (Grant closed Feb 2024 but Loan continues).'
) ON CONFLICT (id) DO NOTHING;

-- Ontario: Enbridge Home Efficiency Rebate Plus
INSERT INTO heat_pump_rebate_programs (
  id, program_name, program_administrator,
  program_level, province_code, utility_territory,
  program_type,
  eligible_heat_pump_types,
  base_rebate_amount_cad, maximum_rebate_cad,
  energy_star_certified_required,
  program_start_date, program_end_date,
  status,
  application_url,
  stackable_with_federal,
  notes
) VALUES (
  'ee0e8400-e29b-41d4-a716-446655440003',
  'Enbridge Home Efficiency Rebate Plus', 'Enbridge Gas',
  'Utility', 'ON', 'Enbridge Gas Ontario',
  'Equipment Rebate',
  ARRAY['Air Source Heat Pump (ASHP)', 'Cold Climate Air Source Heat Pump (ccASHP)'],
  5000, 7500,
  TRUE,
  '2024-07-15', '2025-12-31',
  'Active - Accepting Applications',
  'https://www.enbridgegas.com/ontario/rebates-energy-conservation/home-efficiency-rebate-plus',
  TRUE,
  'Up to $7,500 for heat pump upgrades. Effective July 15, 2024. Runs until December 2025. Energy Star certification required. Stackable with federal OHPA program.'
) ON CONFLICT (id) DO NOTHING;

-- Quebec: Chauffez vert (Heat Green)
INSERT INTO heat_pump_rebate_programs (
  id, program_name, program_administrator,
  program_level, province_code,
  program_type,
  eligible_heat_pump_types,
  base_rebate_amount_cad, oil_conversion_bonus_cad, maximum_rebate_cad,
  program_start_date,
  status,
  stackable_with_federal,
  notes
) VALUES (
  'ee0e8400-e29b-41d4-a716-446655440004',
  'Chauffez vert (Heat Green)', 'Transition énergétique Québec',
  'Provincial', 'QC',
  'Oil to Heat Pump Conversion',
  ARRAY['Air Source Heat Pump (ASHP)', 'Cold Climate Air Source Heat Pump (ccASHP)', 'Ground Source Heat Pump (GSHP)'],
  4000, 3000, 7000,
  '2023-01-01',
  'Active - Accepting Applications',
  TRUE,
  'Up to $7,000 for replacing oil heating with heat pump. $4,000 base + $3,000 oil conversion bonus. Quebec leading Canada in heat pump adoption.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- HEAT PUMP DEPLOYMENT STATISTICS SEED DATA
-- ============================================================================

-- 2024 Q4 - Ontario
INSERT INTO heat_pump_deployment_stats (
  province_code,
  reporting_period_start, reporting_period_end,
  heat_pumps_installed, ashp_installed, ccashp_installed, gshp_installed,
  oil_to_heat_pump_conversions, gas_to_heat_pump_conversions,
  cumulative_heat_pumps_installed, heat_pump_market_penetration_percent,
  total_rebates_paid_cad, average_rebate_per_installation_cad,
  total_ghg_reduction_tonnes_co2e,
  average_total_project_cost_cad,
  data_source, notes
) VALUES (
  'ON',
  '2024-10-01', '2024-12-31',
  12500, 8000, 3500, 1000,
  3200, 4500,
  285000, 5.2,
  45000000, 3600,
  35000,
  15000,
  'NRCan, Enbridge Gas, OPA',
  'Ontario Q4 2024 heat pump installations. Strong uptake driven by Enbridge rebates and federal OHPA program. 5.2% household penetration.'
) ON CONFLICT DO NOTHING;

-- 2024 Q4 - Quebec (leading province)
INSERT INTO heat_pump_deployment_stats (
  province_code,
  reporting_period_start, reporting_period_end,
  heat_pumps_installed, ashp_installed, ccashp_installed, gshp_installed,
  oil_to_heat_pump_conversions,
  cumulative_heat_pumps_installed, heat_pump_market_penetration_percent,
  total_rebates_paid_cad,
  total_ghg_reduction_tonnes_co2e,
  average_total_project_cost_cad,
  on_track_to_meet_target,
  data_source, notes
) VALUES (
  'QC',
  '2024-10-01', '2024-12-31',
  18500, 11000, 6000, 1500,
  5200,
  520000, 12.8,
  72000000,
  52000,
  14500,
  TRUE,
  'TEQ, NRCan',
  'Quebec Q4 2024 - leading Canada with 12.8% heat pump penetration. Chauffez vert program driving oil-to-heat-pump conversions. Provincial ZEV and building electrification mandates supporting adoption.'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW heat_pump_adoption_summary AS
SELECT
  province_code,
  SUM(heat_pumps_installed) as total_installations,
  AVG(heat_pump_market_penetration_percent) as avg_market_penetration_percent,
  SUM(oil_to_heat_pump_conversions) as total_oil_conversions,
  SUM(gas_to_heat_pump_conversions) as total_gas_conversions,
  SUM(total_ghg_reduction_tonnes_co2e) as total_ghg_reduction_tonnes,
  SUM(total_rebates_paid_cad) as total_rebates_paid,
  AVG(average_total_project_cost_cad) as avg_project_cost
FROM heat_pump_deployment_stats
WHERE reporting_period_end >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY province_code
ORDER BY total_installations DESC;

COMMENT ON VIEW heat_pump_adoption_summary IS 'Summary of heat pump adoption by province';

CREATE OR REPLACE VIEW active_rebate_programs_summary AS
SELECT
  program_level,
  province_code,
  program_type,
  COUNT(*) as program_count,
  AVG(base_rebate_amount_cad) as avg_base_rebate,
  AVG(maximum_rebate_cad) as avg_max_rebate,
  SUM(installations_funded) as total_installations_funded,
  SUM(total_program_budget_cad) as total_budget_allocated
FROM heat_pump_rebate_programs
WHERE status LIKE 'Active%'
GROUP BY program_level, province_code, program_type
ORDER BY program_level, province_code;

COMMENT ON VIEW active_rebate_programs_summary IS 'Summary of active heat pump rebate programs by level and type';
