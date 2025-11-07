-- Migration: Hydrogen Economy Hub
-- Created: 2025-11-05
-- Purpose: Track hydrogen production, infrastructure, projects, and pricing
-- Strategic Priority: $300M federal investment, Edmonton/Calgary hubs, AZETEC corridor

-- ============================================================================
-- HYDROGEN FACILITIES
-- ============================================================================

-- Hydrogen production and consumption facilities
CREATE TABLE IF NOT EXISTS hydrogen_facilities (
  id TEXT PRIMARY KEY,
  facility_name TEXT NOT NULL,
  operator TEXT,
  facility_type TEXT NOT NULL CHECK (facility_type IN ('Production', 'Storage', 'Refueling', 'Distribution Hub', 'End User')),

  -- Location
  location_city TEXT,
  province TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Production type (for production facilities)
  hydrogen_type TEXT CHECK (hydrogen_type IN ('Green', 'Blue', 'Grey', 'Pink', 'Turquoise', 'Mixed')),
  production_method TEXT, -- Steam Methane Reforming (SMR), Electrolysis, Autothermal Reforming (ATR), etc.

  -- Capacity
  design_capacity_kg_per_day NUMERIC,
  actual_capacity_kg_per_day NUMERIC,
  storage_capacity_kg NUMERIC, -- For storage facilities

  -- Technology details
  electrolyser_type TEXT, -- PEM, Alkaline, SOEC, etc. (if applicable)
  electrolyser_capacity_mw NUMERIC,
  natural_gas_input_capacity_mmcfd NUMERIC, -- Million cubic feet per day (for SMR/ATR)

  -- CCUS integration (for blue hydrogen)
  ccus_integrated BOOLEAN DEFAULT FALSE,
  carbon_capture_rate_percentage NUMERIC,
  co2_storage_location TEXT,

  -- Renewable energy integration (for green hydrogen)
  renewable_energy_source TEXT, -- Solar, Wind, Hydro, etc.
  renewable_capacity_mw NUMERIC,
  grid_connected BOOLEAN DEFAULT TRUE,

  -- Status
  status TEXT CHECK (status IN ('Proposed', 'Under Development', 'Under Construction', 'Commissioning', 'Operational', 'Decommissioned')) DEFAULT 'Proposed',
  announcement_date DATE,
  construction_start_date DATE,
  expected_online_date DATE,
  actual_online_date DATE,

  -- Economic data
  capital_investment_cad NUMERIC,
  operating_cost_per_kg NUMERIC,
  jobs_created INTEGER,

  -- Regulatory
  environmental_permit_status TEXT,
  funding_sources TEXT[], -- Federal, Provincial, Private, etc.

  -- Key projects (references)
  part_of_hub TEXT, -- Edmonton Hub, Calgary Hub, etc.
  linked_projects TEXT[], -- Related infrastructure projects

  -- Metadata
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_h2_facility_province ON hydrogen_facilities(province);
CREATE INDEX idx_h2_facility_type ON hydrogen_facilities(facility_type);
CREATE INDEX idx_h2_facility_h2_type ON hydrogen_facilities(hydrogen_type);
CREATE INDEX idx_h2_facility_status ON hydrogen_facilities(status);
CREATE INDEX idx_h2_facility_hub ON hydrogen_facilities(part_of_hub);

COMMENT ON TABLE hydrogen_facilities IS 'Hydrogen production, storage, refueling, and distribution facilities across Canada';

-- ============================================================================
-- HYDROGEN PRODUCTION (Time Series)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hydrogen_production (
  id SERIAL PRIMARY KEY,
  facility_id TEXT NOT NULL REFERENCES hydrogen_facilities(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,

  -- Production metrics
  production_kg NUMERIC NOT NULL,
  production_rate_kg_per_hour NUMERIC,
  capacity_factor NUMERIC, -- Actual production / design capacity

  -- Energy inputs
  electricity_consumed_mwh NUMERIC,
  natural_gas_consumed_gj NUMERIC,
  water_consumed_m3 NUMERIC,

  -- Efficiency
  production_efficiency_percentage NUMERIC, -- Energy in H2 / Energy input
  specific_energy_consumption_kwh_per_kg NUMERIC,

  -- Emissions (for blue/grey hydrogen)
  co2_produced_tonnes NUMERIC,
  co2_captured_tonnes NUMERIC,
  co2_emitted_tonnes NUMERIC,
  carbon_intensity_kg_co2_per_kg_h2 NUMERIC,

  -- Quality
  hydrogen_purity_percentage NUMERIC,

  -- Costs
  production_cost_per_kg NUMERIC,

  -- Data quality
  data_quality TEXT CHECK (data_quality IN ('Real-time', 'Estimated', 'Forecasted', 'Backfilled')),

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(facility_id, timestamp)
);

CREATE INDEX idx_h2_prod_timestamp ON hydrogen_production(timestamp DESC);
CREATE INDEX idx_h2_prod_facility ON hydrogen_production(facility_id);
CREATE INDEX idx_h2_prod_production ON hydrogen_production(production_kg DESC);

COMMENT ON TABLE hydrogen_production IS 'Time-series hydrogen production data with emissions and efficiency tracking';

-- ============================================================================
-- HYDROGEN PROJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS hydrogen_projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  project_type TEXT NOT NULL CHECK (project_type IN (
    'Production Facility',
    'Refueling Network',
    'Industrial Decarbonization',
    'Transportation',
    'Pipeline',
    'Storage',
    'Export Terminal',
    'Hub Development',
    'Research & Development',
    'Other'
  )),

  -- Proponents
  lead_proponent TEXT,
  partners TEXT[],

  -- Location
  location TEXT,
  province TEXT,

  -- Status
  status TEXT CHECK (status IN ('Announced', 'Planning', 'Permitting', 'Under Construction', 'Operational', 'Delayed', 'Cancelled')) DEFAULT 'Announced',

  -- Timeline
  announcement_date DATE,
  expected_start_date DATE,
  expected_completion_date DATE,
  actual_completion_date DATE,

  -- Scale
  hydrogen_capacity_kg_per_day NUMERIC,
  capital_investment_cad NUMERIC,

  -- Funding
  federal_funding_cad NUMERIC,
  provincial_funding_cad NUMERIC,
  private_investment_cad NUMERIC,
  funding_programs TEXT[], -- e.g., 'Strategic Innovation Fund', 'CCUS ITC', etc.

  -- Technology
  technology_type TEXT,
  hydrogen_type TEXT CHECK (hydrogen_type IN ('Green', 'Blue', 'Grey', 'Pink', 'Turquoise', 'Mixed')),

  -- Integration
  linked_facility_id TEXT REFERENCES hydrogen_facilities(id),
  part_of_hub TEXT,

  -- Impact
  emissions_reduction_tco2_per_year NUMERIC,
  jobs_created INTEGER,
  diesel_displacement_litres_per_year NUMERIC, -- For remote communities

  -- Key milestones
  milestones JSONB, -- Array of {date, description, status}

  -- Metadata
  description TEXT,
  website_url TEXT,
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_h2_project_province ON hydrogen_projects(province);
CREATE INDEX idx_h2_project_type ON hydrogen_projects(project_type);
CREATE INDEX idx_h2_project_status ON hydrogen_projects(status);
CREATE INDEX idx_h2_project_h2_type ON hydrogen_projects(hydrogen_type);
CREATE INDEX idx_h2_project_hub ON hydrogen_projects(part_of_hub);

COMMENT ON TABLE hydrogen_projects IS 'Hydrogen economy projects including production, infrastructure, and applications';

-- ============================================================================
-- HYDROGEN INFRASTRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hydrogen_infrastructure (
  id TEXT PRIMARY KEY,
  infrastructure_type TEXT NOT NULL CHECK (infrastructure_type IN (
    'Refueling Station',
    'Pipeline',
    'Storage Facility',
    'Electrolyser',
    'Liquefaction Plant',
    'Compression Station',
    'Export Terminal'
  )),

  -- Identification
  name TEXT NOT NULL,
  operator TEXT,

  -- Location
  location_city TEXT,
  province TEXT,
  latitude NUMERIC,
  longitude NUMERIC,

  -- For pipelines
  pipeline_length_km NUMERIC,
  pipeline_diameter_inches NUMERIC,
  pipeline_capacity_kg_per_day NUMERIC,
  origin_location TEXT,
  destination_location TEXT,

  -- For refueling stations
  refueling_capacity_kg_per_day NUMERIC,
  dispenser_pressure_bar NUMERIC, -- 350 bar, 700 bar
  station_type TEXT, -- Public, Fleet, Industrial

  -- Status
  status TEXT CHECK (status IN ('Proposed', 'Under Construction', 'Operational', 'Decommissioned')) DEFAULT 'Proposed',
  commissioning_date DATE,

  -- Investment
  capital_cost_cad NUMERIC,

  -- Usage (for refueling stations)
  vehicles_served INTEGER,
  average_daily_dispensing_kg NUMERIC,

  -- Projects
  part_of_project TEXT REFERENCES hydrogen_projects(id),

  -- Metadata
  data_source TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_h2_infra_type ON hydrogen_infrastructure(infrastructure_type);
CREATE INDEX idx_h2_infra_province ON hydrogen_infrastructure(province);
CREATE INDEX idx_h2_infra_status ON hydrogen_infrastructure(status);

COMMENT ON TABLE hydrogen_infrastructure IS 'Hydrogen refueling, pipeline, storage, and distribution infrastructure';

-- ============================================================================
-- HYDROGEN PRICING
-- ============================================================================

CREATE TABLE IF NOT EXISTS hydrogen_prices (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,

  -- Location
  region TEXT NOT NULL, -- Edmonton, Calgary, Alberta, Canada, etc.
  pricing_point TEXT, -- Hub, Refueling Station, Industrial Gate, etc.

  -- Price (CAD/kg)
  price_cad_per_kg NUMERIC NOT NULL,

  -- Price components (if available)
  production_cost NUMERIC,
  distribution_cost NUMERIC,
  margin NUMERIC,

  -- Hydrogen type
  hydrogen_type TEXT CHECK (hydrogen_type IN ('Green', 'Blue', 'Grey', 'Mixed')),

  -- Delivery method
  delivery_method TEXT, -- Pipeline, Tube Trailer, Liquid, etc.

  -- Volume tier (pricing may vary by volume)
  volume_tier TEXT,

  -- Comparison metrics
  diesel_equivalent_price_per_litre NUMERIC, -- Energy equivalency
  natural_gas_price_per_gj NUMERIC, -- For comparison

  -- Data quality
  data_source TEXT,
  data_quality TEXT CHECK (data_quality IN ('Actual', 'Estimated', 'Indexed')),

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(timestamp, region, pricing_point, hydrogen_type)
);

CREATE INDEX idx_h2_price_timestamp ON hydrogen_prices(timestamp DESC);
CREATE INDEX idx_h2_price_region ON hydrogen_prices(region);
CREATE INDEX idx_h2_price_type ON hydrogen_prices(hydrogen_type);

COMMENT ON TABLE hydrogen_prices IS 'Hydrogen pricing data by region, type, and delivery method';

-- ============================================================================
-- HYDROGEN DEMAND
-- ============================================================================

CREATE TABLE IF NOT EXISTS hydrogen_demand (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,

  -- Demand by sector (kg/day)
  transportation_demand_kg NUMERIC DEFAULT 0,
  industrial_demand_kg NUMERIC DEFAULT 0, -- Refineries, ammonia, steel, etc.
  power_generation_demand_kg NUMERIC DEFAULT 0,
  building_heating_demand_kg NUMERIC DEFAULT 0,
  export_demand_kg NUMERIC DEFAULT 0,

  -- Total
  total_demand_kg NUMERIC NOT NULL,

  -- Geography
  province TEXT NOT NULL,
  region TEXT,

  -- Forecasted vs actual
  is_forecast BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(timestamp, province, region)
);

CREATE INDEX idx_h2_demand_timestamp ON hydrogen_demand(timestamp DESC);
CREATE INDEX idx_h2_demand_province ON hydrogen_demand(province);

COMMENT ON TABLE hydrogen_demand IS 'Hydrogen demand tracking and forecasting by sector and geography';

-- ============================================================================
-- SAMPLE DATA FOR DEMONSTRATION
-- ============================================================================

-- Major hydrogen facilities in Alberta
INSERT INTO hydrogen_facilities (id, facility_name, operator, facility_type, location_city, province, latitude, longitude, hydrogen_type, production_method, design_capacity_kg_per_day, electrolyser_capacity_mw, status, announcement_date, expected_online_date, capital_investment_cad, ccus_integrated, carbon_capture_rate_percentage, renewable_energy_source, part_of_hub, funding_sources, notes) VALUES
('h2-ab-001', 'Air Products Edmonton Net-Zero Hydrogen Complex', 'Air Products', 'Production', 'Edmonton', 'AB', 53.5461, -113.4938, 'Blue', 'Autothermal Reforming (ATR)', 1500000, NULL, 'Under Construction', '2021-06-15', '2025-12-31', 1300000000, TRUE, 95, NULL, 'Edmonton Hub', ARRAY['Strategic Innovation Fund'], '$300M federal funding. First liquefaction facility in Western Canada with CCUS'),
('h2-ab-002', 'ATCO Calgary Railyard Electrolyser', 'ATCO', 'Production', 'Calgary', 'AB', 51.0447, -114.0719, 'Green', 'PEM Electrolysis', 100, 1, 'Operational', '2023-09-01', '2024-06-01', 15000000, FALSE, NULL, 'Grid', 'Calgary Hub', ARRAY['Provincial'], '1 MW PEM electrolyser for rail yard demonstration'),
('h2-ab-003', 'ATCO Edmonton Railyard Electrolyser', 'ATCO', 'Production', 'Edmonton', 'AB', 53.5461, -113.4938, 'Green', 'PEM Electrolysis', 100, 1, 'Operational', '2023-09-01', '2024-06-01', 15000000, FALSE, NULL, 'Grid', 'Edmonton Hub', ARRAY['Provincial'], '1 MW PEM electrolyser for rail yard demonstration'),
('h2-ab-004', 'Medicine Hat Blue Hydrogen Plant', 'ATCO', 'Production', 'Medicine Hat', 'AB', 50.0407, -110.6764, 'Blue', 'Steam Methane Reforming (SMR)', 50000, NULL, 'Under Development', '2025-03-20', '2028-01-01', 400000000, TRUE, 90, NULL, NULL, ARRAY['Private'], 'Blue hydrogen with CCUS for industrial users'),
('h2-ab-005', 'Fort Saskatchewan Green H2 Hub', 'Canadian Green Hydrogen', 'Production', 'Fort Saskatchewan', 'AB', 53.7134, -113.2105, 'Green', 'Alkaline Electrolysis', 20000, 50, 'Under Development', '2024-11-10', '2027-06-01', 350000000, FALSE, NULL, 'Wind + Solar', 'Edmonton Hub', ARRAY['Federal', 'Private'], '50 MW electrolyser powered by dedicated renewable energy')
ON CONFLICT (id) DO NOTHING;

-- Hydrogen projects
INSERT INTO hydrogen_projects (id, project_name, project_type, lead_proponent, partners, location, province, status, announcement_date, expected_completion_date, hydrogen_capacity_kg_per_day, capital_investment_cad, federal_funding_cad, technology_type, hydrogen_type, part_of_hub, emissions_reduction_tco2_per_year, jobs_created, description) VALUES
('h2proj-001', 'AZETEC Heavy Duty Truck Demonstration', 'Transportation', 'AZETEC Consortium', ARRAY['Alberta Transportation', 'Nikola', 'ATCO'], 'Edmonton-Calgary Corridor', 'AB', 'Operational', '2023-05-15', '2025-12-31', NULL, 25000000, 8000000, 'Fuel Cell Electric Trucks', 'Green', 'Edmonton Hub', 500, 15, '2 heavy-duty class 8 fuel cell trucks operating year-round freight between Edmonton and Calgary'),
('h2proj-002', 'Calgary-Banff Hydrogen Rail', 'Transportation', 'Invest Alberta Corporation', ARRAY['Alberta Transportation', 'Canadian Infrastructure Bank'], 'Calgary to Banff', 'AB', 'Planning', '2024-08-20', '2028-06-01', NULL, 2000000000, 500000000, 'Hydrogen Passenger Rail', 'Green', 'Calgary Hub', 15000, 200, 'Hydrogen-powered passenger rail service from Calgary to Banff'),
('h2proj-003', 'Edmonton Region Hydrogen Hub', 'Hub Development', 'Edmonton Global', ARRAY['Air Products', 'ATCO', 'University of Alberta'], 'Edmonton Region', 'AB', 'Under Construction', '2022-04-10', '2026-12-31', 1500000, 1500000000, 300000000, 'Multi-facility Hub', 'Blue', 'Edmonton Hub', 50000, 500, 'Industrial Heartland hydrogen production and distribution hub'),
('h2proj-004', 'Calgary Region Hydrogen Hub', 'Hub Development', 'Calgary Economic Development', ARRAY['ATCO', 'TC Energy'], 'Calgary Region', 'AB', 'Planning', '2023-11-15', '2027-06-01', 150000, 250000000, 50000000, 'Multi-facility Hub', 'Mixed', 'Calgary Hub', 10000, 150, '$1.5M funding to strengthen Alberta position in hydrogen economy'),
('h2proj-005', 'Dow Path2Zero Fort Saskatchewan', 'Industrial Decarbonization', 'Dow Chemical', ARRAY['X-Energy'], 'Fort Saskatchewan', 'AB', 'Delayed', '2021-03-15', '2030-12-31', 200000, 9000000000, 1000000000, 'Blue Hydrogen + SMR', 'Blue', 'Edmonton Hub', 100000, 800, 'Delayed $9B integrated SMR + blue hydrogen + ethylene project')
ON CONFLICT (id) DO NOTHING;

-- Hydrogen infrastructure
INSERT INTO hydrogen_infrastructure (id, infrastructure_type, name, operator, location_city, province, latitude, longitude, status, commissioning_date, refueling_capacity_kg_per_day, dispenser_pressure_bar, station_type, capital_cost_cad, part_of_project, notes) VALUES
('h2infra-001', 'Refueling Station', 'Edmonton ATCO Railyard H2 Station', 'ATCO', 'Edmonton', 'AB', 53.5461, -113.4938, 'Operational', '2024-06-01', 100, 350, 'Fleet', 3000000, 'h2proj-001', 'Supports AZETEC truck demonstration'),
('h2infra-002', 'Refueling Station', 'Calgary ATCO Railyard H2 Station', 'ATCO', 'Calgary', 'AB', 51.0447, -114.0719, 'Operational', '2024-06-01', 100, 350, 'Fleet', 3000000, 'h2proj-001', 'Supports AZETEC truck demonstration'),
('h2infra-003', 'Refueling Station', 'Calgary Downtown H2 Station', 'Shell Canada', 'Calgary', 'AB', 51.0486, -114.0708, 'Proposed', NULL, 500, 700, 'Public', 5000000, NULL, 'First public 700-bar H2 station in Calgary'),
('h2infra-004', 'Pipeline', 'Edmonton Industrial Heartland H2 Pipeline', 'Air Products', 'Fort Saskatchewan', 'AB', 53.7134, -113.2105, 'Under Construction', '2025-12-31', 1500000, 24, NULL, 150000000, 'h2proj-003', '50 km pipeline network for industrial hydrogen distribution')
ON CONFLICT (id) DO NOTHING;

-- Sample hydrogen production data (last 7 days for operational facilities)
INSERT INTO hydrogen_production (facility_id, timestamp, production_kg, production_rate_kg_per_hour, capacity_factor, electricity_consumed_mwh, water_consumed_m3, production_efficiency_percentage, specific_energy_consumption_kwh_per_kg, hydrogen_purity_percentage, production_cost_per_kg, data_quality)
SELECT
  'h2-ab-002',
  NOW()::date - interval '1 day' * generate_series(0, 6),
  85 + (random() * 20 - 10), -- Daily production around 85 kg
  3.5 + (random() * 0.5 - 0.25), -- Rate around 3.5 kg/hr
  0.82 + (random() * 0.1 - 0.05), -- Capacity factor around 82%
  1.8 + (random() * 0.2 - 0.1), -- Electricity consumption around 1.8 MWh/day
  0.9 + (random() * 0.1 - 0.05), -- Water consumption around 0.9 m3/day
  68 + (random() * 4 - 2), -- Efficiency around 68%
  52 + (random() * 3 - 1.5), -- Specific energy around 52 kWh/kg
  99.97, -- High purity
  8.50 + (random() * 1.0 - 0.5), -- Cost around $8.50/kg
  'Real-time'
FROM generate_series(1, 1)
ON CONFLICT (facility_id, timestamp) DO NOTHING;

-- Hydrogen pricing data (weekly for last 12 weeks)
INSERT INTO hydrogen_prices (timestamp, region, pricing_point, price_cad_per_kg, production_cost, distribution_cost, hydrogen_type, delivery_method, diesel_equivalent_price_per_litre, data_source, data_quality)
SELECT
  (NOW()::date - interval '7 days' * generate_series(0, 11))::timestamp,
  'Alberta',
  'Industrial Gate',
  7.50 + (random() * 2.0 - 1.0), -- Price around $7.50/kg
  5.50 + (random() * 1.0 - 0.5), -- Production cost
  1.50 + (random() * 0.5 - 0.25), -- Distribution cost
  'Blue',
  'Pipeline',
  2.50 + (random() * 0.5 - 0.25), -- Diesel equivalent
  'Industry Survey',
  'Estimated'
FROM generate_series(1, 1)
ON CONFLICT (timestamp, region, pricing_point, hydrogen_type) DO NOTHING;

-- Hydrogen demand forecast (monthly for next 5 years)
INSERT INTO hydrogen_demand (timestamp, transportation_demand_kg, industrial_demand_kg, power_generation_demand_kg, total_demand_kg, province, is_forecast)
SELECT
  (DATE_TRUNC('month', NOW()) + interval '1 month' * generate_series(0, 59))::timestamp,
  5000 + (500 * generate_series(0, 59)), -- Growing transportation demand
  200000 + (10000 * generate_series(0, 59)), -- Growing industrial demand
  1000 + (200 * generate_series(0, 59)), -- Growing power generation
  206000 + (10700 * generate_series(0, 59)), -- Total
  'AB',
  TRUE
FROM generate_series(1, 1)
ON CONFLICT (timestamp, province, region) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get total hydrogen production capacity by province
CREATE OR REPLACE FUNCTION get_h2_capacity_by_province()
RETURNS TABLE(
  province TEXT,
  total_capacity_kg_per_day NUMERIC,
  operational_capacity_kg_per_day NUMERIC,
  facility_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.province,
    SUM(h.design_capacity_kg_per_day) as total_cap,
    SUM(CASE WHEN h.status = 'Operational' THEN h.actual_capacity_kg_per_day ELSE 0 END) as operational_cap,
    COUNT(*) as facilities
  FROM hydrogen_facilities h
  WHERE h.facility_type = 'Production'
  GROUP BY h.province
  ORDER BY total_cap DESC;
END;
$$ LANGUAGE plpgsql;

-- Get hydrogen production summary by type
CREATE OR REPLACE FUNCTION get_h2_production_by_type()
RETURNS TABLE(
  hydrogen_type TEXT,
  total_capacity_kg_per_day NUMERIC,
  facility_count BIGINT,
  avg_carbon_intensity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.hydrogen_type,
    SUM(h.design_capacity_kg_per_day) as total_cap,
    COUNT(*) as facilities,
    AVG(p.carbon_intensity_kg_co2_per_kg_h2) as avg_ci
  FROM hydrogen_facilities h
  LEFT JOIN LATERAL (
    SELECT carbon_intensity_kg_co2_per_kg_h2
    FROM hydrogen_production
    WHERE facility_id = h.id
    ORDER BY timestamp DESC
    LIMIT 1
  ) p ON TRUE
  WHERE h.facility_type = 'Production' AND h.hydrogen_type IS NOT NULL
  GROUP BY h.hydrogen_type
  ORDER BY total_cap DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON hydrogen_facilities TO anon, authenticated;
GRANT SELECT ON hydrogen_production TO anon, authenticated;
GRANT SELECT ON hydrogen_projects TO anon, authenticated;
GRANT SELECT ON hydrogen_infrastructure TO anon, authenticated;
GRANT SELECT ON hydrogen_prices TO anon, authenticated;
GRANT SELECT ON hydrogen_demand TO anon, authenticated;
