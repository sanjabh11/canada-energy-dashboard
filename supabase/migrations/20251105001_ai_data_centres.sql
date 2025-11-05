-- Migration: AI Data Centre Energy Infrastructure
-- Created: 2025-11-05
-- Purpose: Track AI data centres, power consumption, and AESO interconnection queue
-- Strategic Priority: Alberta's $100B AI data centre strategy

-- ============================================================================
-- AI DATA CENTRES
-- ============================================================================

-- Registry of AI data centres and facilities
CREATE TABLE IF NOT EXISTS ai_data_centres (
  id TEXT PRIMARY KEY,
  facility_name TEXT NOT NULL,
  operator TEXT,
  location_city TEXT,
  province TEXT NOT NULL,
  status TEXT CHECK (status IN ('Proposed', 'Interconnection Queue', 'Under Construction', 'Commissioning', 'Operational', 'Decommissioned')) DEFAULT 'Proposed',
  announcement_date DATE,
  expected_online_date DATE,
  actual_online_date DATE,

  -- Power specifications
  contracted_capacity_mw NUMERIC,
  peak_demand_mw NUMERIC,
  average_load_mw NUMERIC,

  -- Efficiency metrics
  pue_design NUMERIC, -- Power Usage Effectiveness (design target)
  pue_actual NUMERIC, -- Actual measured PUE

  -- Cooling specifications
  cooling_technology TEXT, -- Air-cooled, liquid-cooled, free cooling, etc.
  cooling_capacity_mw NUMERIC,
  water_usage_m3_per_day NUMERIC,

  -- Infrastructure
  backup_generation_mw NUMERIC,
  battery_storage_mwh NUMERIC,

  -- Economic data
  capital_investment_cad NUMERIC,
  jobs_created INTEGER,

  -- Energy supply
  power_source TEXT, -- Grid, Natural Gas, Renewable, Hybrid
  renewable_percentage NUMERIC CHECK (renewable_percentage >= 0 AND renewable_percentage <= 100),
  offgrid BOOLEAN DEFAULT FALSE,

  -- Location
  latitude NUMERIC,
  longitude NUMERIC,

  -- AI workload specifics
  gpu_count INTEGER,
  computing_capacity_pflops NUMERIC, -- Petaflops
  primary_workload TEXT, -- Training, Inference, Mixed

  -- Regulatory
  grid_connection_status TEXT,
  environmental_permit_status TEXT,

  -- Metadata
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_dc_province ON ai_data_centres(province);
CREATE INDEX idx_ai_dc_status ON ai_data_centres(status);
CREATE INDEX idx_ai_dc_operator ON ai_data_centres(operator);
CREATE INDEX idx_ai_dc_capacity ON ai_data_centres(contracted_capacity_mw DESC);

COMMENT ON TABLE ai_data_centres IS 'Registry of AI data centres with power, cooling, and infrastructure specifications';

-- ============================================================================
-- AI DATA CENTRE POWER CONSUMPTION (Time Series)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_dc_power_consumption (
  id SERIAL PRIMARY KEY,
  data_centre_id TEXT NOT NULL REFERENCES ai_data_centres(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,

  -- Power metrics (MW)
  it_load_mw NUMERIC NOT NULL, -- IT equipment load
  cooling_load_mw NUMERIC, -- Cooling system load
  auxiliary_load_mw NUMERIC, -- Lights, UPS losses, etc.
  total_load_mw NUMERIC NOT NULL,

  -- Efficiency
  pue NUMERIC, -- Calculated: total_load / it_load

  -- Environmental
  outdoor_temperature_c NUMERIC,
  cooling_efficiency NUMERIC, -- kW/ton or similar metric

  -- Grid interaction
  grid_import_mw NUMERIC,
  onsite_generation_mw NUMERIC,
  battery_charge_discharge_mw NUMERIC, -- Positive = charging, Negative = discharging

  -- Data quality
  data_quality TEXT CHECK (data_quality IN ('Real-time', 'Estimated', 'Forecasted', 'Backfilled')),

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_centre_id, timestamp)
);

CREATE INDEX idx_ai_dc_power_timestamp ON ai_dc_power_consumption(timestamp DESC);
CREATE INDEX idx_ai_dc_power_dc_id ON ai_dc_power_consumption(data_centre_id);
CREATE INDEX idx_ai_dc_power_total_load ON ai_dc_power_consumption(total_load_mw DESC);

COMMENT ON TABLE ai_dc_power_consumption IS 'Time-series power consumption data for AI data centres';

-- ============================================================================
-- AESO INTERCONNECTION QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS aeso_interconnection_queue (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  proponent TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('AI Data Centre', 'Solar', 'Wind', 'Battery Storage', 'Natural Gas', 'Hydrogen', 'Other')),

  -- Capacity
  requested_capacity_mw NUMERIC NOT NULL,

  -- Location
  region TEXT, -- North, Central, South, Calgary, Edmonton
  substation TEXT,

  -- Queue status
  queue_position INTEGER,
  submission_date DATE NOT NULL,
  study_phase TEXT CHECK (study_phase IN ('Feasibility Study', 'System Impact Study', 'Facility Study', 'Under Construction', 'In Service', 'Withdrawn')),

  -- Phase allocation (AESO June 2025 policy)
  phase_allocation TEXT CHECK (phase_allocation IN ('Phase 1 (1200 MW)', 'Phase 2', 'Not Allocated', 'Exempt (Offgrid)')),
  allocated_capacity_mw NUMERIC,

  -- Timelines
  expected_study_completion DATE,
  expected_construction_start DATE,
  expected_in_service_date DATE,
  actual_in_service_date DATE,

  -- Costs
  estimated_network_upgrade_cost_cad NUMERIC,
  cost_responsibility TEXT, -- Generator-funded, Shared, Rate-based

  -- Technical requirements
  requires_new_transmission BOOLEAN DEFAULT FALSE,
  transmission_distance_km NUMERIC,

  -- AI Data Centre specific linkage
  linked_data_centre_id TEXT REFERENCES ai_data_centres(id),

  -- Status tracking
  status TEXT CHECK (status IN ('Active', 'On Hold', 'Withdrawn', 'In Service')),
  withdrawal_reason TEXT,

  -- Metadata
  data_source TEXT DEFAULT 'AESO',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_aeso_queue_type ON aeso_interconnection_queue(project_type);
CREATE INDEX idx_aeso_queue_phase ON aeso_interconnection_queue(phase_allocation);
CREATE INDEX idx_aeso_queue_status ON aeso_interconnection_queue(status);
CREATE INDEX idx_aeso_queue_submission ON aeso_interconnection_queue(submission_date DESC);
CREATE INDEX idx_aeso_queue_capacity ON aeso_interconnection_queue(requested_capacity_mw DESC);
CREATE INDEX idx_aeso_queue_region ON aeso_interconnection_queue(region);

COMMENT ON TABLE aeso_interconnection_queue IS 'AESO interconnection queue tracking with focus on AI data centre projects';

-- ============================================================================
-- ALBERTA GRID CAPACITY METRICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS alberta_grid_capacity (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,

  -- System-wide metrics
  current_peak_demand_mw NUMERIC NOT NULL,
  total_generation_capacity_mw NUMERIC NOT NULL,
  available_capacity_mw NUMERIC,

  -- Data centre specific
  total_dc_load_mw NUMERIC DEFAULT 0,
  dc_percentage_of_peak NUMERIC, -- % of peak demand from data centres

  -- Phase 1 allocation (1200 MW limit)
  phase1_allocated_mw NUMERIC DEFAULT 0,
  phase1_remaining_mw NUMERIC,

  -- Interconnection queue summary
  total_queue_mw NUMERIC,
  dc_queue_mw NUMERIC,
  renewable_queue_mw NUMERIC,

  -- Grid reliability impact
  reserve_margin_percentage NUMERIC,
  reliability_rating TEXT CHECK (reliability_rating IN ('Normal', 'Adequate', 'Strained', 'Critical')),

  -- Forecasted needs
  forecasted_demand_growth_2030_mw NUMERIC,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(timestamp)
);

CREATE INDEX idx_alberta_capacity_timestamp ON alberta_grid_capacity(timestamp DESC);

COMMENT ON TABLE alberta_grid_capacity IS 'Alberta grid capacity metrics with AI data centre impact tracking';

-- ============================================================================
-- DATA CENTRE EMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_dc_emissions (
  id SERIAL PRIMARY KEY,
  data_centre_id TEXT NOT NULL REFERENCES ai_data_centres(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,

  -- Emissions (tonnes CO2e)
  scope1_emissions_tco2 NUMERIC, -- Direct emissions (onsite generation)
  scope2_emissions_tco2 NUMERIC, -- Grid electricity emissions
  scope3_emissions_tco2 NUMERIC, -- Embodied carbon, supply chain

  -- Grid emission factors
  grid_emission_factor_kg_co2_per_mwh NUMERIC,

  -- Renewable energy credits / offsets
  rec_purchased_mwh NUMERIC,
  carbon_offsets_purchased_tco2 NUMERIC,

  -- Net emissions
  net_emissions_tco2 NUMERIC,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(data_centre_id, timestamp)
);

CREATE INDEX idx_ai_dc_emissions_dc_id ON ai_dc_emissions(data_centre_id);
CREATE INDEX idx_ai_dc_emissions_timestamp ON ai_dc_emissions(timestamp DESC);

COMMENT ON TABLE ai_dc_emissions IS 'Emissions tracking for AI data centres with Scope 1/2/3 breakdown';

-- ============================================================================
-- SAMPLE DATA FOR DEMONSTRATION
-- ============================================================================

-- Alberta AI Data Centres (based on 2025 announcements and queue)
INSERT INTO ai_data_centres (id, facility_name, operator, location_city, province, status, announcement_date, expected_online_date, contracted_capacity_mw, pue_design, cooling_technology, capital_investment_cad, power_source, renewable_percentage, offgrid, latitude, longitude, gpu_count, primary_workload, notes) VALUES
('dc-ab-001', 'Calgary AI Compute Hub 1', 'Vantage Data Centers', 'Calgary', 'AB', 'Interconnection Queue', '2025-03-15', '2027-06-01', 450, 1.25, 'Free Cooling + Liquid', 2800000000, 'Hybrid', 35, FALSE, 51.0447, -114.0719, 50000, 'Mixed', 'First major AI data centre in Calgary region'),
('dc-ab-002', 'Edmonton AI Cloud Campus', 'Microsoft Azure', 'Edmonton', 'AB', 'Proposed', '2025-02-20', '2028-01-01', 750, 1.20, 'Liquid Cooling', 4500000000, 'Grid', 25, FALSE, 53.5461, -113.4938, 80000, 'Training', 'Partnership with University of Alberta'),
('dc-ab-003', 'Red Deer Modular AI Facility', 'Canadian AI Ventures', 'Red Deer', 'AB', 'Under Construction', '2024-11-10', '2026-03-01', 180, 1.30, 'Air Cooled', 850000000, 'Natural Gas', 0, TRUE, 52.2681, -113.8111, 15000, 'Inference', 'Off-grid natural gas powered with future CCUS integration'),
('dc-ab-004', 'Alberta Industrial Heartland AI Hub', 'AWS', 'Fort Saskatchewan', 'AB', 'Interconnection Queue', '2025-04-01', '2027-12-01', 600, 1.22, 'Free Cooling + Evaporative', 3600000000, 'Grid', 40, FALSE, 53.7134, -113.2105, 65000, 'Mixed', 'Near existing industrial infrastructure'),
('dc-ab-005', 'Lethbridge Green AI Centre', 'Google Cloud', 'Lethbridge', 'AB', 'Proposed', '2025-05-15', '2028-06-01', 320, 1.18, 'Liquid Cooling', 2100000000, 'Renewable', 95, FALSE, 49.6942, -112.8328, 35000, 'Training', '100% wind + solar target with battery storage')
ON CONFLICT (id) DO NOTHING;

-- AESO Interconnection Queue Projects
INSERT INTO aeso_interconnection_queue (id, project_name, proponent, project_type, requested_capacity_mw, region, queue_position, submission_date, study_phase, phase_allocation, allocated_capacity_mw, expected_in_service_date, estimated_network_upgrade_cost_cad, requires_new_transmission, linked_data_centre_id, status, notes) VALUES
('aesoq-001', 'Calgary AI Hub Interconnection', 'Vantage Data Centers', 'AI Data Centre', 450, 'Calgary', 12, '2025-01-20', 'System Impact Study', 'Phase 1 (1200 MW)', 350, '2027-06-01', 125000000, TRUE, 'dc-ab-001', 'Active', 'Phase 1 allocation reduced from 450 MW to 350 MW'),
('aesoq-002', 'Edmonton Azure Campus Connection', 'Microsoft Azure', 'AI Data Centre', 750, 'Edmonton', 8, '2024-12-15', 'Feasibility Study', 'Phase 1 (1200 MW)', 420, '2028-01-01', 210000000, TRUE, 'dc-ab-002', 'Active', 'Largest single data centre request'),
('aesoq-003', 'Industrial Heartland AI Connection', 'AWS', 'AI Data Centre', 600, 'Edmonton', 15, '2025-03-01', 'Feasibility Study', 'Phase 1 (1200 MW)', 430, '2027-12-01', 180000000, TRUE, 'dc-ab-004', 'Active', 'Leveraging existing transmission corridor'),
('aesoq-004', 'Lethbridge Wind + DC Combo', 'Google Cloud', 'AI Data Centre', 320, 'South', 22, '2025-04-10', 'Feasibility Study', 'Phase 2', NULL, '2028-06-01', 95000000, FALSE, 'dc-ab-005', 'Active', 'Co-located with 400 MW wind farm'),
('aesoq-005', 'Southern Alberta Solar Farm', 'Canadian Solar', 'Solar', 300, 'South', 18, '2025-02-05', 'System Impact Study', 'Phase 2', NULL, '2027-03-01', 75000000, TRUE, NULL, 'Active', 'Large-scale solar development'),
('aesoq-006', 'Brooks Battery Storage', 'AltaLink', 'Battery Storage', 250, 'South', 10, '2024-11-20', 'Facility Study', 'Phase 1 (1200 MW)', NULL, '2026-09-01', 45000000, FALSE, NULL, 'Active', 'Grid-scale battery for flexibility'),
('aesoq-007', 'Peace River Wind Project', 'TransAlta', 'Wind', 400, 'North', 14, '2025-01-15', 'System Impact Study', 'Phase 2', NULL, '2027-06-01', 120000000, TRUE, NULL, 'Active', 'Northern Alberta wind resource'),
('aesoq-008', 'Medicine Hat Hydrogen Plant', 'ATCO', 'Hydrogen', 150, 'South', 20, '2025-03-20', 'Feasibility Study', 'Phase 2', NULL, '2028-01-01', 60000000, FALSE, NULL, 'Active', 'Blue hydrogen with CCUS')
ON CONFLICT (id) DO NOTHING;

-- Sample power consumption data (last 24 hours for operational DC)
INSERT INTO ai_dc_power_consumption (data_centre_id, timestamp, it_load_mw, cooling_load_mw, auxiliary_load_mw, total_load_mw, pue, outdoor_temperature_c, grid_import_mw, data_quality)
SELECT
  'dc-ab-003',
  NOW() - (interval '1 hour' * generate_series(0, 23)),
  145 + (random() * 10 - 5), -- IT load around 145 MW
  40 + (random() * 5 - 2.5), -- Cooling load around 40 MW
  5 + (random() * 2 - 1), -- Auxiliary around 5 MW
  190 + (random() * 15 - 7.5), -- Total load around 190 MW
  1.28 + (random() * 0.06 - 0.03), -- PUE around 1.28-1.32
  -5 + (random() * 10), -- Temperature -5°C to +5°C (winter)
  0, -- Off-grid, no grid import
  'Real-time'
FROM generate_series(1, 1)
ON CONFLICT (data_centre_id, timestamp) DO NOTHING;

-- Alberta grid capacity snapshot
INSERT INTO alberta_grid_capacity (timestamp, current_peak_demand_mw, total_generation_capacity_mw, available_capacity_mw, total_dc_load_mw, dc_percentage_of_peak, phase1_allocated_mw, phase1_remaining_mw, total_queue_mw, dc_queue_mw, renewable_queue_mw, reserve_margin_percentage, reliability_rating, forecasted_demand_growth_2030_mw) VALUES
(NOW(), 12100, 16800, 14200, 180, 1.49, 1200, 0, 10870, 2120, 1100, 17.4, 'Adequate', 5500)
ON CONFLICT (timestamp) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Calculate Phase 1 remaining capacity
CREATE OR REPLACE FUNCTION get_phase1_remaining_capacity()
RETURNS NUMERIC AS $$
DECLARE
  total_allocated NUMERIC;
BEGIN
  SELECT COALESCE(SUM(allocated_capacity_mw), 0) INTO total_allocated
  FROM aeso_interconnection_queue
  WHERE phase_allocation = 'Phase 1 (1200 MW)' AND status = 'Active';

  RETURN 1200 - total_allocated;
END;
$$ LANGUAGE plpgsql;

-- Get total data centre load impact on Alberta grid
CREATE OR REPLACE FUNCTION get_total_dc_grid_impact()
RETURNS TABLE(
  total_operational_mw NUMERIC,
  total_queue_mw NUMERIC,
  percentage_of_peak NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(average_load_mw), 0) as operational,
    COALESCE((SELECT SUM(requested_capacity_mw) FROM aeso_interconnection_queue WHERE project_type = 'AI Data Centre' AND status = 'Active'), 0) as queue,
    (COALESCE(SUM(average_load_mw), 0) / 12100 * 100) as pct_peak
  FROM ai_data_centres
  WHERE status = 'Operational' AND province = 'AB';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON ai_data_centres TO anon, authenticated;
GRANT SELECT ON ai_dc_power_consumption TO anon, authenticated;
GRANT SELECT ON aeso_interconnection_queue TO anon, authenticated;
GRANT SELECT ON alberta_grid_capacity TO anon, authenticated;
GRANT SELECT ON ai_dc_emissions TO anon, authenticated;
