-- Migration: VPP (Virtual Power Plant) & DER (Distributed Energy Resource) Aggregation
-- Created: 2025-11-13
-- Purpose: Track VPP platforms, DER assets, aggregation pools, and grid services participation
-- Strategic Priority: Ontario Peak Perks (100,000 homes, 90 MW), Alberta VPPs, demand response programs
-- Gap Analysis: MEDIUM PRIORITY - VPP/DER platform tracking (previously 2.5/5.0)

-- ============================================================================
-- VPP PLATFORMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vpp_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL UNIQUE,

  -- Operator details
  operator_company TEXT NOT NULL,
  platform_type TEXT CHECK (platform_type IN (
    'Residential DER Aggregator',
    'Commercial & Industrial Aggregator',
    'Utility VPP Program',
    'Independent Aggregator',
    'Microgrid Operator',
    'Fleet Management Platform'
  )),

  -- Coverage
  province_code TEXT[] NOT NULL, -- Array of provinces served
  iso_participation TEXT[], -- ISOs where platform participates: ['IESO', 'AESO']

  -- Technology platform
  aggregation_technology TEXT, -- EnergyHub, AutoGrid, Stem, proprietary, etc.
  control_mechanism TEXT CHECK (control_mechanism IN (
    'Smart Thermostat',
    'Battery Management System',
    'EV Charging Control',
    'HVAC Control',
    'Industrial Load Control',
    'Mixed'
  )),

  -- Aggregated capacity
  enrolled_assets_count INTEGER,
  aggregated_capacity_mw NUMERIC,
  available_capacity_mw NUMERIC, -- Dispatchable capacity
  energy_capacity_mwh NUMERIC, -- For storage aggregation

  -- Asset composition
  residential_assets_count INTEGER DEFAULT 0,
  commercial_assets_count INTEGER DEFAULT 0,
  industrial_assets_count INTEGER DEFAULT 0,

  -- DER types aggregated
  battery_storage_count INTEGER DEFAULT 0,
  ev_chargers_count INTEGER DEFAULT 0,
  smart_thermostats_count INTEGER DEFAULT 0,
  solar_installations_count INTEGER DEFAULT 0,
  generators_count INTEGER DEFAULT 0,
  controllable_loads_count INTEGER DEFAULT 0,

  -- Grid services provided
  demand_response BOOLEAN DEFAULT TRUE,
  frequency_regulation BOOLEAN DEFAULT FALSE,
  voltage_support BOOLEAN DEFAULT FALSE,
  capacity_market_participation BOOLEAN DEFAULT FALSE,
  energy_arbitrage BOOLEAN DEFAULT FALSE,
  renewable_firming BOOLEAN DEFAULT FALSE,

  -- Market participation
  ieso_peak_perks_program BOOLEAN DEFAULT FALSE,
  aeso_demand_response BOOLEAN DEFAULT FALSE,
  wholesale_market_participant BOOLEAN DEFAULT FALSE,

  -- Performance
  average_dispatch_response_time_seconds INTEGER,
  reliability_score_percent NUMERIC CHECK (reliability_score_percent BETWEEN 0 AND 100),
  total_energy_curtailed_mwh NUMERIC,
  total_energy_shifted_mwh NUMERIC,

  -- Economics
  customer_compensation_model TEXT CHECK (customer_compensation_model IN (
    'Fixed Bill Credit',
    'Per-Event Payment',
    'Capacity Payment',
    'Energy Savings Share',
    'Free Equipment',
    'Mixed'
  )),
  average_customer_payment_cad_per_year NUMERIC,

  -- Program details
  enrollment_open BOOLEAN DEFAULT TRUE,
  minimum_participation_requirements TEXT,
  customer_app_available BOOLEAN DEFAULT TRUE,

  -- Operational status
  status TEXT CHECK (status IN ('Active', 'Pilot', 'Expansion', 'Suspended')) DEFAULT 'Active',
  launch_date DATE,

  -- Contact
  website_url TEXT,
  enrollment_url TEXT,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vpp_operator ON vpp_platforms(operator_company);
CREATE INDEX idx_vpp_type ON vpp_platforms(platform_type);
CREATE INDEX idx_vpp_status ON vpp_platforms(status);
CREATE INDEX idx_vpp_capacity ON vpp_platforms(aggregated_capacity_mw DESC);

COMMENT ON TABLE vpp_platforms IS 'Virtual Power Plant platforms and DER aggregation services';

-- ============================================================================
-- DER ASSETS (Distributed Energy Resources)
-- ============================================================================

CREATE TABLE IF NOT EXISTS der_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vpp_platform_id UUID REFERENCES vpp_platforms(id) ON DELETE SET NULL,

  asset_id TEXT UNIQUE, -- Platform-assigned asset ID
  asset_name TEXT,

  -- Asset owner
  customer_type TEXT CHECK (customer_type IN ('Residential', 'Commercial', 'Industrial', 'Municipal', 'Institutional')),
  customer_id TEXT, -- Anonymized customer identifier

  -- Location
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'AB', 'SK', 'BC', 'MB', 'QC', 'NB', 'NS', 'NL', 'PE')),
  postal_code_fsa TEXT, -- First 3 characters of postal code for privacy
  utility_territory TEXT,

  -- DER type and specifications
  der_type TEXT CHECK (der_type IN (
    'Battery Storage - Residential',
    'Battery Storage - Commercial',
    'Battery Storage - Utility-Scale',
    'Solar PV - Rooftop Residential',
    'Solar PV - Rooftop Commercial',
    'Solar PV - Ground Mount',
    'EV Charger - Level 2',
    'EV Charger - DC Fast',
    'Smart Thermostat',
    'Smart Water Heater',
    'HVAC Control',
    'Pool Pump',
    'Industrial Load',
    'Backup Generator',
    'Fuel Cell'
  )) NOT NULL,

  -- Capacity
  rated_capacity_kw NUMERIC,
  energy_capacity_kwh NUMERIC, -- For storage
  dispatchable_capacity_kw NUMERIC, -- What can be controlled

  -- Equipment details
  manufacturer TEXT,
  model TEXT,
  installation_date DATE,

  -- Control and connectivity
  controllable BOOLEAN DEFAULT TRUE,
  communication_protocol TEXT, -- OpenADR, IEEE 2030.5, proprietary, etc.
  telemetry_interval_seconds INTEGER,

  -- V2G capability (for EVs)
  v2g_capable BOOLEAN DEFAULT FALSE,
  bidirectional_power_kw NUMERIC,

  -- Participation
  enrollment_date DATE NOT NULL,
  opt_out_date DATE,
  active_participation BOOLEAN DEFAULT TRUE,

  -- Performance
  total_dispatch_events INTEGER DEFAULT 0,
  successful_dispatch_responses INTEGER DEFAULT 0,
  response_rate_percent NUMERIC CHECK (response_rate_percent BETWEEN 0 AND 100),
  total_energy_curtailed_kwh NUMERIC DEFAULT 0,
  total_energy_exported_kwh NUMERIC DEFAULT 0,

  -- Customer economics
  cumulative_compensation_cad NUMERIC DEFAULT 0,
  last_payment_date DATE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_der_vpp ON der_assets(vpp_platform_id);
CREATE INDEX idx_der_type ON der_assets(der_type);
CREATE INDEX idx_der_province ON der_assets(province_code);
CREATE INDEX idx_der_customer_type ON der_assets(customer_type);
CREATE INDEX idx_der_active ON der_assets(active_participation) WHERE active_participation = TRUE;

COMMENT ON TABLE der_assets IS 'Individual distributed energy resources enrolled in VPP programs';

-- ============================================================================
-- VPP DISPATCH EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vpp_dispatch_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vpp_platform_id UUID NOT NULL REFERENCES vpp_platforms(id) ON DELETE CASCADE,

  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT CHECK (event_type IN (
    'Peak Demand Reduction',
    'Frequency Regulation Up',
    'Frequency Regulation Down',
    'Voltage Support',
    'Renewable Ramping Support',
    'Capacity Market Call',
    'Emergency Demand Response',
    'Economic Dispatch',
    'Grid Congestion Relief'
  )) NOT NULL,

  -- Event timing
  event_start_time TIMESTAMP NOT NULL,
  event_end_time TIMESTAMP NOT NULL,
  event_duration_minutes INTEGER,

  -- Dispatch signal
  target_reduction_mw NUMERIC,
  target_increase_mw NUMERIC, -- For V2G or generation increase

  -- Participation
  invited_assets_count INTEGER,
  participating_assets_count INTEGER,
  participation_rate_percent NUMERIC,

  -- Performance
  actual_reduction_mw NUMERIC,
  actual_increase_mw NUMERIC,
  performance_accuracy_percent NUMERIC,

  -- Grid context
  grid_frequency_hz NUMERIC,
  grid_demand_mw NUMERIC,
  lmp_cad_per_mwh NUMERIC, -- Locational Marginal Price

  -- Compensation
  total_compensation_cad NUMERIC,
  compensation_rate_cad_per_mwh NUMERIC,

  -- Event status
  status TEXT CHECK (status IN ('Scheduled', 'Active', 'Completed', 'Cancelled', 'Failed')) DEFAULT 'Scheduled',

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vpp_dispatch_platform ON vpp_dispatch_events(vpp_platform_id);
CREATE INDEX idx_vpp_dispatch_time ON vpp_dispatch_events(event_start_time);
CREATE INDEX idx_vpp_dispatch_type ON vpp_dispatch_events(event_type);
CREATE INDEX idx_vpp_dispatch_status ON vpp_dispatch_events(status);

COMMENT ON TABLE vpp_dispatch_events IS 'VPP dispatch events and performance tracking';

-- ============================================================================
-- DEMAND RESPONSE PROGRAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS demand_response_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name TEXT NOT NULL,
  program_operator TEXT NOT NULL, -- IESO, AESO, Utility, Independent Aggregator

  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'AB', 'SK', 'BC', 'MB', 'QC', 'NB', 'NS', 'NL', 'PE')),
  program_type TEXT CHECK (program_type IN (
    'Utility Peak Saver',
    'ISO Demand Response',
    'Capacity Market DR',
    'Industrial Load Curtailment',
    'Residential Smart Thermostat',
    'Commercial HVAC Control',
    'EV Managed Charging',
    'Water Heater Control'
  )),

  -- Target participants
  target_customer_segments TEXT[], -- ['Residential', 'Commercial', 'Industrial']

  -- Program size
  enrolled_participants INTEGER,
  target_participants INTEGER,
  enrolled_capacity_mw NUMERIC,
  target_capacity_mw NUMERIC,

  -- Compensation
  participation_incentive_cad NUMERIC, -- One-time or annual enrollment payment
  per_event_payment_cad NUMERIC,
  equipment_incentive_cad NUMERIC, -- For smart thermostats, etc.

  -- Program requirements
  minimum_load_reduction_kw NUMERIC,
  maximum_events_per_year INTEGER,
  maximum_event_duration_hours NUMERIC,
  advance_notice_hours NUMERIC,

  -- Performance
  average_load_reduction_mw NUMERIC,
  total_events_called INTEGER,
  participant_response_rate_percent NUMERIC,

  -- Program status
  status TEXT CHECK (status IN ('Active', 'Enrollment Open', 'Enrollment Closed', 'Pilot', 'Completed', 'Suspended')) DEFAULT 'Active',
  program_start_date DATE,
  program_end_date DATE,

  program_url TEXT,
  eligibility_requirements TEXT,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dr_program_operator ON demand_response_programs(program_operator);
CREATE INDEX idx_dr_program_province ON demand_response_programs(province_code);
CREATE INDEX idx_dr_program_type ON demand_response_programs(program_type);
CREATE INDEX idx_dr_program_status ON demand_response_programs(status);

COMMENT ON TABLE demand_response_programs IS 'Demand response programs offered by utilities and ISOs';

-- ============================================================================
-- SEED DATA: Major VPP Platforms
-- ============================================================================

-- IESO Peak Perks Program (EnergyHub)
INSERT INTO vpp_platforms (
  id, platform_name,
  operator_company, platform_type,
  province_code, iso_participation,
  aggregation_technology, control_mechanism,
  enrolled_assets_count, aggregated_capacity_mw, available_capacity_mw,
  residential_assets_count, smart_thermostats_count,
  demand_response, ieso_peak_perks_program,
  average_dispatch_response_time_seconds,
  customer_compensation_model, average_customer_payment_cad_per_year,
  customer_app_available, status, launch_date,
  website_url, notes
) VALUES (
  'cc0e8400-e29b-41d4-a716-446655440001',
  'IESO Save on Energy Peak Perks',
  'Independent Electricity System Operator (IESO)', 'Utility VPP Program',
  ARRAY['ON'], ARRAY['IESO'],
  'EnergyHub', 'Smart Thermostat',
  100000, 90, 90,
  100000, 100000,
  TRUE, TRUE,
  300,
  'Fixed Bill Credit', 75,
  TRUE, 'Active', '2024-01-01',
  'https://saveonenergy.ca/For-Your-Home/Offers-and-Programs/Peak-Perks',
  'Canada''s largest VPP. 100,000+ homes enrolled in 6 months. Fastest-growing flexibility program in EnergyHub portfolio. Up to 90 MW demand reduction capability.'
) ON CONFLICT (id) DO NOTHING;

-- Edmonton Blatchford VPP (sonnen)
INSERT INTO vpp_platforms (
  id, platform_name,
  operator_company, platform_type,
  province_code, iso_participation,
  control_mechanism,
  enrolled_assets_count, aggregated_capacity_mw, energy_capacity_mwh,
  residential_assets_count, battery_storage_count,
  demand_response, frequency_regulation, energy_arbitrage,
  status, launch_date,
  website_url, notes
) VALUES (
  'cc0e8400-e29b-41d4-a716-446655440002',
  'Blatchford Lands Residential VPP',
  'sonnen / EPCOR', 'Residential DER Aggregator',
  ARRAY['AB'], ARRAY['AESO'],
  'Battery Management System',
  8, 0.5, 2.0,
  8, 8,
  TRUE, TRUE, TRUE,
  'Active', '2024-01-01',
  'https://www.epcor.com/ca/en/ab/edmonton/operations/electricity/electricity-grid-modernization/virtual-power-plant.html',
  'First battery-based residential VPP in master-planned Canadian community. 8 net-zero homes operational, 18 more by end 2025, target 100 homes by mid-2027. ~500 kW power, 2 MWh storage.'
) ON CONFLICT (id) DO NOTHING;

-- Solartility Alberta VPP
INSERT INTO vpp_platforms (
  id, platform_name,
  operator_company, platform_type,
  province_code, iso_participation,
  control_mechanism,
  battery_storage_count, solar_installations_count,
  demand_response, energy_arbitrage, renewable_firming,
  customer_compensation_model,
  enrollment_open, status, launch_date,
  website_url, notes
) VALUES (
  'cc0e8400-e29b-41d4-a716-446655440003',
  'Solartility Green VPP',
  'Solartility Inc.', 'Residential DER Aggregator',
  ARRAY['AB'], ARRAY['AESO'],
  'Mixed',
  NULL, NULL,
  TRUE, TRUE, TRUE,
  'Energy Savings Share',
  TRUE, 'Pilot', '2024-06-01',
  'https://www.solartility.ca/',
  'Alberta''s first wholly green residential VPP. Solar + storage aggregation. Claims up to 30% energy cost savings for customers.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEMAND RESPONSE PROGRAMS SEED DATA
-- ============================================================================

INSERT INTO demand_response_programs (
  id, program_name, program_operator,
  province_code, program_type,
  target_customer_segments,
  enrolled_participants, enrolled_capacity_mw,
  participation_incentive_cad, equipment_incentive_cad,
  maximum_events_per_year, maximum_event_duration_hours, advance_notice_hours,
  average_load_reduction_mw, participant_response_rate_percent,
  status, program_start_date,
  program_url, notes
) VALUES (
  'dd0e8400-e29b-41d4-a716-446655440001',
  'IESO Save on Energy Peak Perks', 'IESO',
  'ON', 'Residential Smart Thermostat',
  ARRAY['Residential'],
  100000, 90,
  75, 0,
  20, 4, 1,
  90, 85,
  'Active', '2024-01-01',
  'https://saveonenergy.ca/For-Your-Home/Offers-and-Programs/Peak-Perks',
  'Free enrollment for smart thermostat owners. $75 annual bill credit. Up to 20 events per year, max 4 hours per event, 1 hour advance notice.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW vpp_platform_summary AS
SELECT
  province_code[1] as primary_province,
  platform_type,
  COUNT(*) as platform_count,
  SUM(enrolled_assets_count) as total_enrolled_assets,
  SUM(aggregated_capacity_mw) as total_aggregated_capacity_mw,
  SUM(available_capacity_mw) as total_available_capacity_mw,
  AVG(reliability_score_percent) as avg_reliability_percent
FROM vpp_platforms
WHERE status = 'Active'
GROUP BY province_code[1], platform_type;

COMMENT ON VIEW vpp_platform_summary IS 'Summary of VPP platforms by province and type';

CREATE OR REPLACE VIEW der_fleet_composition AS
SELECT
  vpp_platform_id,
  (SELECT platform_name FROM vpp_platforms WHERE id = der_assets.vpp_platform_id) as platform_name,
  der_type,
  COUNT(*) as asset_count,
  SUM(rated_capacity_kw) as total_capacity_kw,
  AVG(response_rate_percent) as avg_response_rate_percent,
  SUM(cumulative_compensation_cad) as total_compensation_paid_cad
FROM der_assets
WHERE active_participation = TRUE
GROUP BY vpp_platform_id, der_type
ORDER BY vpp_platform_id, total_capacity_kw DESC;

COMMENT ON VIEW der_fleet_composition IS 'Composition of DER assets by VPP platform and asset type';
