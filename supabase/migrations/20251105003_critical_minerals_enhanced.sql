-- Migration: Enhanced Critical Minerals Supply Chain Intelligence
-- Created: 2025-11-05
-- Purpose: Add supply chain tracking, pricing, trade flows, and processing capacity
-- Strategic Priority: $6.4B federal investment, 30% tax credit, national security priority

-- ============================================================================
-- CRITICAL MINERALS PROJECTS (Enhanced tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS critical_minerals_projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  operator TEXT,

  -- Mineral type (from 34 critical minerals list)
  primary_mineral TEXT NOT NULL CHECK (primary_mineral IN (
    'Lithium', 'Cobalt', 'Nickel', 'Graphite', 'Copper', 'Rare Earth Elements',
    'Vanadium', 'Uranium', 'Zinc', 'Aluminum', 'Antimony', 'Bismuth',
    'Cesium', 'Chromium', 'Fluorspar', 'Gallium', 'Germanium', 'Helium',
    'Indium', 'Magnesium', 'Manganese', 'Molybdenum', 'Niobium', 'Platinum Group Metals',
    'Potash', 'Scandium', 'Tantalum', 'Tellurium', 'Tin', 'Titanium',
    'Tungsten', 'Phosphate', 'Silicon', 'Arsenic'
  )),
  secondary_minerals TEXT[], -- Co-products

  -- Priority status (6 priority minerals)
  is_priority_mineral BOOLEAN DEFAULT FALSE,

  -- Location
  location TEXT,
  province TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  mining_district TEXT,

  -- Project stage
  stage TEXT CHECK (stage IN (
    'Exploration',
    'Pre-Feasibility',
    'Feasibility',
    'Permitting',
    'Construction',
    'Commissioning',
    'Production',
    'Expansion',
    'Care & Maintenance',
    'Closure'
  )) DEFAULT 'Exploration',

  -- Production metrics
  design_capacity_tonnes_per_year NUMERIC,
  current_production_tonnes_per_year NUMERIC,
  ore_grade_percentage NUMERIC,
  resource_tonnes NUMERIC, -- Total resource estimate
  reserve_tonnes NUMERIC, -- Proven and probable reserves
  mine_life_years NUMERIC,

  -- Economic data
  capital_cost_cad NUMERIC,
  operating_cost_per_tonne NUMERIC,
  payback_period_years NUMERIC,

  -- Funding and support
  federal_funding_cad NUMERIC,
  provincial_funding_cad NUMERIC,
  tax_credit_value_cad NUMERIC, -- 30% exploration tax credit
  loan_guarantee_amount_cad NUMERIC,

  -- Timeline
  discovery_date DATE,
  construction_start_date DATE,
  production_start_date DATE,
  expected_production_date DATE,

  -- Environmental and social
  environmental_assessment_status TEXT,
  indigenous_partnership BOOLEAN DEFAULT FALSE,
  indigenous_equity_percentage NUMERIC,
  indigenous_communities TEXT[],

  -- Strategic importance
  national_security_priority BOOLEAN DEFAULT FALSE,
  defence_production_act_designation BOOLEAN DEFAULT FALSE,

  -- Supply chain position
  downstream_processing_planned BOOLEAN DEFAULT FALSE,
  export_destination_countries TEXT[],
  offtake_agreements TEXT[], -- Committed buyers

  -- Metadata
  data_source TEXT DEFAULT 'NRCan',
  website_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cm_project_mineral ON critical_minerals_projects(primary_mineral);
CREATE INDEX idx_cm_project_province ON critical_minerals_projects(province);
CREATE INDEX idx_cm_project_stage ON critical_minerals_projects(stage);
CREATE INDEX idx_cm_project_priority ON critical_minerals_projects(is_priority_mineral);
CREATE INDEX idx_cm_project_capacity ON critical_minerals_projects(design_capacity_tonnes_per_year DESC);

COMMENT ON TABLE critical_minerals_projects IS 'Enhanced critical minerals projects with supply chain and strategic tracking';

-- ============================================================================
-- CRITICAL MINERALS SUPPLY CHAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS minerals_supply_chain (
  id TEXT PRIMARY KEY,
  mineral TEXT NOT NULL,

  -- Supply chain stage
  stage TEXT NOT NULL CHECK (stage IN ('Mining', 'Concentration', 'Refining', 'Processing', 'Manufacturing', 'Recycling')),

  -- Facility details
  facility_name TEXT NOT NULL,
  operator TEXT,
  location TEXT,
  province TEXT,
  country TEXT DEFAULT 'Canada',

  -- Capacity
  input_capacity_tonnes_per_year NUMERIC,
  output_capacity_tonnes_per_year NUMERIC,
  capacity_utilization_percentage NUMERIC,

  -- Technology
  processing_technology TEXT,
  recovery_rate_percentage NUMERIC,

  -- Status
  status TEXT CHECK (status IN ('Proposed', 'Under Construction', 'Operational', 'Expansion', 'Closed')) DEFAULT 'Proposed',
  operational_since DATE,

  -- Economic
  capital_investment_cad NUMERIC,
  operating_cost_per_tonne NUMERIC,

  -- Supply chain flows
  input_sources TEXT[], -- Where material comes from
  output_destinations TEXT[], -- Where output goes

  -- Strategic gaps
  is_domestic_gap BOOLEAN DEFAULT FALSE, -- Identifies missing domestic processing capacity

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_supply_chain_mineral ON minerals_supply_chain(mineral);
CREATE INDEX idx_supply_chain_stage ON minerals_supply_chain(stage);
CREATE INDEX idx_supply_chain_province ON minerals_supply_chain(province);
CREATE INDEX idx_supply_chain_status ON minerals_supply_chain(status);
CREATE INDEX idx_supply_chain_gap ON minerals_supply_chain(is_domestic_gap);

COMMENT ON TABLE minerals_supply_chain IS 'Critical minerals supply chain from mine to manufacturing';

-- ============================================================================
-- CRITICAL MINERALS PRICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS minerals_prices (
  id SERIAL PRIMARY KEY,
  mineral TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,

  -- Price (USD/tonne - industry standard)
  price_usd_per_tonne NUMERIC NOT NULL,
  price_cad_per_tonne NUMERIC,

  -- Price basis
  price_basis TEXT, -- LME, spot, contract, etc.
  grade_specification TEXT, -- Battery grade, technical grade, etc.

  -- Market
  exchange TEXT, -- London Metal Exchange, etc.
  trading_location TEXT,

  -- Volatility metrics
  weekly_change_percentage NUMERIC,
  monthly_change_percentage NUMERIC,
  yearly_change_percentage NUMERIC,

  -- Volume
  trading_volume_tonnes NUMERIC,

  -- Data quality
  data_source TEXT,
  is_estimate BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mineral, timestamp, price_basis)
);

CREATE INDEX idx_minerals_price_mineral ON minerals_prices(mineral);
CREATE INDEX idx_minerals_price_timestamp ON minerals_prices(timestamp DESC);

COMMENT ON TABLE minerals_prices IS 'Critical minerals pricing data for market analysis';

-- ============================================================================
-- CRITICAL MINERALS TRADE FLOWS
-- ============================================================================

CREATE TABLE IF NOT EXISTS minerals_trade_flows (
  id SERIAL PRIMARY KEY,
  mineral TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER,

  -- Trade direction
  flow_type TEXT CHECK (flow_type IN ('Import', 'Export')) NOT NULL,

  -- Geography
  origin_country TEXT,
  destination_country TEXT,
  canadian_province TEXT, -- If domestic trade

  -- Volume and value
  volume_tonnes NUMERIC NOT NULL,
  value_cad NUMERIC,
  average_price_per_tonne NUMERIC,

  -- Processing form
  material_form TEXT, -- Ore, concentrate, refined metal, compound, etc.

  -- China dependency analysis
  is_china_sourced BOOLEAN DEFAULT FALSE,

  -- Data source
  data_source TEXT DEFAULT 'Statistics Canada',

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mineral, year, month, flow_type, origin_country, destination_country)
);

CREATE INDEX idx_trade_mineral ON minerals_trade_flows(mineral);
CREATE INDEX idx_trade_year ON minerals_trade_flows(year DESC);
CREATE INDEX idx_trade_type ON minerals_trade_flows(flow_type);
CREATE INDEX idx_trade_china ON minerals_trade_flows(is_china_sourced);

COMMENT ON TABLE minerals_trade_flows IS 'International and domestic critical minerals trade flows';

-- ============================================================================
-- BATTERY SUPPLY CHAIN LINKAGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS battery_supply_chain (
  id TEXT PRIMARY KEY,
  facility_name TEXT NOT NULL,
  facility_type TEXT CHECK (facility_type IN (
    'Cell Manufacturing',
    'Module/Pack Assembly',
    'Cathode Material Production',
    'Anode Material Production',
    'Electrolyte Production',
    'Separator Production',
    'Recycling'
  )) NOT NULL,

  -- Location
  location TEXT,
  province TEXT,
  country TEXT DEFAULT 'Canada',

  -- Battery chemistry focus
  battery_chemistry TEXT[], -- LFP, NMC, NCA, LTO, etc.

  -- Capacity
  annual_capacity_gwh NUMERIC,
  capacity_utilization_percentage NUMERIC,

  -- Status
  status TEXT CHECK (status IN ('Announced', 'Planning', 'Under Construction', 'Operational', 'Expansion')) DEFAULT 'Announced',
  expected_operational_date DATE,
  actual_operational_date DATE,

  -- Investment
  capital_investment_cad NUMERIC,

  -- Critical minerals inputs (required minerals)
  lithium_required_tonnes_per_year NUMERIC,
  cobalt_required_tonnes_per_year NUMERIC,
  nickel_required_tonnes_per_year NUMERIC,
  graphite_required_tonnes_per_year NUMERIC,
  manganese_required_tonnes_per_year NUMERIC,

  -- Sourcing
  domestic_sourcing_percentage NUMERIC,
  import_countries TEXT[],

  -- End markets
  target_markets TEXT[], -- EV, Grid Storage, Consumer Electronics, etc.
  offtake_partners TEXT[],

  -- Metadata
  operator TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_battery_sc_type ON battery_supply_chain(facility_type);
CREATE INDEX idx_battery_sc_province ON battery_supply_chain(province);
CREATE INDEX idx_battery_sc_status ON battery_supply_chain(status);

COMMENT ON TABLE battery_supply_chain IS 'Battery supply chain facilities linked to critical minerals demand';

-- ============================================================================
-- MINERALS STOCKPILE (National Security)
-- ============================================================================

CREATE TABLE IF NOT EXISTS minerals_strategic_stockpile (
  id SERIAL PRIMARY KEY,
  mineral TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,

  -- Stockpile quantity
  stockpile_tonnes NUMERIC NOT NULL,

  -- Target levels
  target_stockpile_tonnes NUMERIC,
  minimum_stockpile_tonnes NUMERIC,

  -- Stockpile health
  stockpile_adequacy TEXT CHECK (stockpile_adequacy IN ('Surplus', 'Adequate', 'Low', 'Critical')),
  months_of_supply NUMERIC, -- Based on domestic consumption rate

  -- Location
  storage_location TEXT,
  province TEXT,

  -- Material form
  material_form TEXT, -- Ore, concentrate, refined, etc.

  -- Security designation
  defence_production_act BOOLEAN DEFAULT FALSE,

  -- Metadata
  data_source TEXT DEFAULT 'Government of Canada',

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(mineral, timestamp)
);

CREATE INDEX idx_stockpile_mineral ON minerals_strategic_stockpile(mineral);
CREATE INDEX idx_stockpile_timestamp ON minerals_strategic_stockpile(timestamp DESC);
CREATE INDEX idx_stockpile_adequacy ON minerals_strategic_stockpile(stockpile_adequacy);

COMMENT ON TABLE minerals_strategic_stockpile IS 'Strategic national stockpiles of critical minerals for security';

-- ============================================================================
-- EV DEMAND INTEGRATION (Derived Demand Modeling)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ev_minerals_demand_forecast (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL,
  scenario TEXT CHECK (scenario IN ('Conservative', 'Base Case', 'Accelerated')) DEFAULT 'Base Case',

  -- EV adoption forecast
  ev_sales_canada INTEGER,
  ev_fleet_size INTEGER,
  battery_capacity_gwh NUMERIC,

  -- Derived minerals demand (tonnes)
  lithium_demand_tonnes NUMERIC,
  cobalt_demand_tonnes NUMERIC,
  nickel_demand_tonnes NUMERIC,
  graphite_demand_tonnes NUMERIC,
  copper_demand_tonnes NUMERIC,
  manganese_demand_tonnes NUMERIC,
  rare_earths_demand_tonnes NUMERIC,

  -- Supply-demand gap analysis
  lithium_gap_tonnes NUMERIC, -- Negative = surplus, Positive = shortage
  cobalt_gap_tonnes NUMERIC,
  nickel_gap_tonnes NUMERIC,

  -- Metadata
  model_version TEXT,
  assumptions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(year, scenario)
);

CREATE INDEX idx_ev_demand_year ON ev_minerals_demand_forecast(year);
CREATE INDEX idx_ev_demand_scenario ON ev_minerals_demand_forecast(scenario);

COMMENT ON TABLE ev_minerals_demand_forecast IS 'EV-driven critical minerals demand forecasting with gap analysis';

-- ============================================================================
-- SAMPLE DATA FOR DEMONSTRATION
-- ============================================================================

-- Priority critical minerals projects
INSERT INTO critical_minerals_projects (id, project_name, operator, primary_mineral, secondary_minerals, is_priority_mineral, location, province, latitude, longitude, stage, design_capacity_tonnes_per_year, capital_cost_cad, federal_funding_cad, tax_credit_value_cad, indigenous_partnership, national_security_priority, downstream_processing_planned, export_destination_countries, notes) VALUES
('cmp-001', 'Whabouchi Lithium Mine', 'Nemaska Lithium', 'Lithium', ARRAY['Spodumene'], TRUE, 'Nemaska', 'QC', 51.6944, -76.1397, 'Construction', 330000, 1400000000, 150000000, 45000000, TRUE, TRUE, TRUE, ARRAY['USA', 'Europe'], 'One of Canada''s largest lithium projects with integrated processing'),
('cmp-002', 'Voisey''s Bay Nickel Mine', 'Vale Canada', 'Nickel', ARRAY['Cobalt', 'Copper'], TRUE, 'Voisey''s Bay', 'NL', 56.3333, -61.6667, 'Production', 50000, 750000000, NULL, NULL, TRUE, FALSE, FALSE, ARRAY['Asia', 'Europe'], 'Major nickel producer for battery supply chain'),
('cmp-003', 'Lac des Iles Palladium Mine', 'Impala Canada', 'Platinum Group Metals', ARRAY['Palladium', 'Platinum', 'Rhodium'], FALSE, 'Thunder Bay', 'ON', 48.6000, -87.7500, 'Production', 8000, 350000000, NULL, NULL, TRUE, FALSE, FALSE, ARRAY['USA', 'Europe'], 'Critical for catalytic converters and hydrogen fuel cells'),
('cmp-004', 'Strange Lake REE Project', 'Torngat Metals', 'Rare Earth Elements', ARRAY['Heavy REEs'], TRUE, 'Strange Lake', 'QC', 56.3167, -64.1667, 'Feasibility', 20000, 1800000000, 200000000, 60000000, TRUE, TRUE, TRUE, ARRAY['USA', 'Japan'], 'Heavy rare earths critical for EV motors and wind turbines'),
('cmp-005', 'Nechalacho REE Mine', 'Vital Metals / Cheetah Resources', 'Rare Earth Elements', NULL, TRUE, 'Yellowknife', 'NT', 62.1667, -113.8833, 'Production', 5000, 250000000, 50000000, NULL, TRUE, TRUE, FALSE, ARRAY['USA'], 'First rare earths mine outside China in North America'),
('cmp-006', 'Separation Rapids Lithium Project', 'Avalon Advanced Materials', 'Lithium', ARRAY['Tantalum', 'Cesium'], TRUE, 'Kenora', 'ON', 50.6167, -93.8333, 'Feasibility', 25000, 900000000, 100000000, 30000000, FALSE, TRUE, TRUE, ARRAY['USA'], 'Petalite lithium deposit with domestic processing planned'),
('cmp-007', 'Nickel Rim South', 'Canada Nickel Company', 'Nickel', ARRAY['Cobalt', 'Platinum Group Metals'], TRUE, 'Timmins', 'ON', 48.4669, -81.3331, 'Permitting', 40000, 1200000000, 180000000, 54000000, TRUE, TRUE, TRUE, ARRAY['USA', 'Europe'], 'NetZero Metals - carbon neutral nickel production')
ON CONFLICT (id) DO NOTHING;

-- Supply chain facilities
INSERT INTO minerals_supply_chain (id, mineral, stage, facility_name, operator, location, province, country, input_capacity_tonnes_per_year, output_capacity_tonnes_per_year, processing_technology, status, is_domestic_gap) VALUES
('msc-001', 'Lithium', 'Refining', 'Nemaska Lithium Hydroxide Plant', 'Nemaska Lithium', 'Shawinigan', 'QC', 'Canada', 330000, 33000, 'Electrolysis', 'Under Construction', FALSE),
('msc-002', 'Nickel', 'Refining', 'Sudbury Nickel Refinery', 'Glencore', 'Sudbury', 'ON', 'Canada', 150000, 120000, 'Electrolytic', 'Operational', FALSE),
('msc-003', 'Cobalt', 'Refining', 'MISSING - Cobalt Refinery', 'N/A', 'N/A', NULL, 'N/A', NULL, NULL, NULL, 'Proposed', TRUE),
('msc-004', 'Graphite', 'Concentration', 'Lac Knife Graphite Processing', 'Mason Graphite', 'Baie-Comeau', 'QC', 'Canada', 52000, 50000, 'Flotation', 'Proposed', FALSE),
('msc-005', 'Rare Earth Elements', 'Processing', 'Saskatchewan REE Processing Facility', 'Saskatchewan Research Council', 'Saskatoon', 'SK', 'Canada', 5000, 4000, 'Hydrometallurgical', 'Operational', FALSE),
('msc-006', 'Copper', 'Refining', 'CCR Copper Refinery', 'Glencore', 'Montreal', 'QC', 'Canada', 250000, 225000, 'Electrolytic', 'Operational', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Battery supply chain facilities
INSERT INTO battery_supply_chain (id, facility_name, facility_type, location, province, country, battery_chemistry, annual_capacity_gwh, status, expected_operational_date, capital_investment_cad, lithium_required_tonnes_per_year, cobalt_required_tonnes_per_year, nickel_required_tonnes_per_year, graphite_required_tonnes_per_year, domestic_sourcing_percentage, import_countries, target_markets, operator) VALUES
('bsc-001', 'NextStar Energy EV Battery Plant', 'Cell Manufacturing', 'Windsor', 'ON', 'Canada', ARRAY['NMC'], 45, 'Under Construction', '2025-06-01', 5000000000, 9000, 3600, 18000, 13500, 25, ARRAY['Chile', 'Indonesia', 'DRC'], ARRAY['EV'], 'Stellantis/LG Energy Solution'),
('bsc-002', 'Northvolt Ett Battery Gigafactory', 'Cell Manufacturing', 'Montreal', 'QC', 'Canada', ARRAY['NMC', 'LFP'], 60, 'Under Construction', '2026-12-01', 7000000000, 12000, 4800, 24000, 18000, 40, ARRAY['Quebec', 'Finland'], ARRAY['EV', 'Grid Storage'], 'Northvolt'),
('bsc-003', 'BASF Cathode Materials Plant', 'Cathode Material Production', 'Bécancour', 'QC', 'Canada', ARRAY['NMC'], 15, 'Operational', '2025-01-01', 750000000, 3000, 1200, 6000, NULL, 30, ARRAY['Quebec', 'USA'], ARRAY['Battery Manufacturers'], 'BASF'),
('bsc-004', 'Li-Cycle Battery Recycling Hub', 'Recycling', 'Rochester', 'NY', 'USA', ARRAY['All'], 25, 'Operational', '2023-06-01', 650000000, NULL, NULL, NULL, NULL, NULL, ARRAY['Canada', 'USA'], ARRAY['Recovered Materials'], 'Li-Cycle')
ON CONFLICT (id) DO NOTHING;

-- Critical minerals prices (sample for key minerals, last 12 months)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, exchange, data_source)
SELECT
  'Lithium',
  (NOW()::date - interval '1 month' * generate_series(0, 11))::timestamp,
  18000 + (random() * 8000 - 4000), -- Price volatility around $18k/tonne
  'Battery Grade Lithium Carbonate',
  'Battery Grade (99.5% min)',
  'Spot Market',
  'Benchmark Minerals'
FROM generate_series(1, 1)
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
SELECT
  'Cobalt',
  (NOW()::date - interval '1 month' * generate_series(0, 11))::timestamp,
  32000 + (random() * 6000 - 3000),
  'Standard Grade',
  'Min 99.8%',
  'London Metal Exchange'
FROM generate_series(1, 1)
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
SELECT
  'Nickel',
  (NOW()::date - interval '1 month' * generate_series(0, 11))::timestamp,
  18500 + (random() * 4000 - 2000),
  'LME Nickel',
  'Class 1',
  'London Metal Exchange'
FROM generate_series(1, 1)
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Trade flows (sample Canada critical minerals imports and exports)
-- Lithium exports to USA
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
SELECT
  'Lithium',
  2024,
  generate_series(1, 12),
  'Export',
  'Canada',
  'USA',
  800 + (random() * 400 - 200),
  (800 + (random() * 400 - 200)) * 25000,
  'Lithium Hydroxide',
  'Statistics Canada'
FROM generate_series(1, 1)
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Lithium imports from Chile
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, is_china_sourced, data_source)
SELECT
  'Lithium',
  2024,
  generate_series(1, 12),
  'Import',
  'Chile',
  'Canada',
  500 + (random() * 200 - 100),
  (500 + (random() * 200 - 100)) * 22000,
  'Lithium Carbonate',
  FALSE,
  'Statistics Canada'
FROM generate_series(1, 1)
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Cobalt imports from DRC (via China processing)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, is_china_sourced, data_source)
SELECT
  'Cobalt',
  2024,
  generate_series(1, 12),
  'Import',
  'China',
  'Canada',
  150 + (random() * 100 - 50),
  (150 + (random() * 100 - 50)) * 35000,
  'Refined Cobalt',
  TRUE,
  'Statistics Canada'
FROM generate_series(1, 1)
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Nickel exports to USA
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
SELECT
  'Nickel',
  2024,
  generate_series(1, 12),
  'Export',
  'Canada',
  'USA',
  3000 + (random() * 1000 - 500),
  (3000 + (random() * 1000 - 500)) * 18000,
  'Class 1 Nickel',
  'Statistics Canada'
FROM generate_series(1, 1)
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Nickel exports to Europe
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
SELECT
  'Nickel',
  2024,
  generate_series(1, 12),
  'Export',
  'Canada',
  'Europe',
  1200 + (random() * 400 - 200),
  (1200 + (random() * 400 - 200)) * 18500,
  'Nickel Sulphate',
  'Statistics Canada'
FROM generate_series(1, 1)
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Graphite imports from China
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, is_china_sourced, data_source)
SELECT
  'Graphite',
  2024,
  generate_series(1, 12),
  'Import',
  'China',
  'Canada',
  400 + (random() * 200 - 100),
  (400 + (random() * 200 - 100)) * 2500,
  'Synthetic Graphite',
  TRUE,
  'Statistics Canada'
FROM generate_series(1, 1)
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Rare Earth Elements imports from China (high dependency)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, is_china_sourced, data_source)
SELECT
  'Rare Earth Elements',
  2024,
  generate_series(1, 12),
  'Import',
  'China',
  'Canada',
  200 + (random() * 100 - 50),
  (200 + (random() * 100 - 50)) * 45000,
  'Mixed REE Oxides',
  TRUE,
  'Statistics Canada'
FROM generate_series(1, 1)
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Copper exports to USA
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
SELECT
  'Copper',
  2024,
  generate_series(1, 12),
  'Export',
  'Canada',
  'USA',
  15000 + (random() * 5000 - 2500),
  (15000 + (random() * 5000 - 2500)) * 9000,
  'Refined Copper',
  'Statistics Canada'
FROM generate_series(1, 1)
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- EV minerals demand forecast
INSERT INTO ev_minerals_demand_forecast (year, scenario, ev_sales_canada, ev_fleet_size, battery_capacity_gwh, lithium_demand_tonnes, cobalt_demand_tonnes, nickel_demand_tonnes, graphite_demand_tonnes, copper_demand_tonnes)
SELECT
  2025 + generate_series(0, 10),
  'Base Case',
  300000 + (100000 * generate_series(0, 10)), -- Growing EV sales
  500000 + (300000 * generate_series(0, 10)), -- Growing fleet
  20 + (15 * generate_series(0, 10)), -- Battery demand
  4000 + (3000 * generate_series(0, 10)), -- Lithium
  1600 + (1200 * generate_series(0, 10)), -- Cobalt
  8000 + (6000 * generate_series(0, 10)), -- Nickel
  6000 + (4500 * generate_series(0, 10)), -- Graphite
  2000 + (1500 * generate_series(0, 10)) -- Copper
FROM generate_series(1, 1)
ON CONFLICT (year, scenario) DO NOTHING;

-- Strategic stockpile (sample)
INSERT INTO minerals_strategic_stockpile (mineral, timestamp, stockpile_tonnes, target_stockpile_tonnes, minimum_stockpile_tonnes, stockpile_adequacy, months_of_supply, storage_location, province, defence_production_act) VALUES
('Lithium', NOW(), 500, 2000, 1000, 'Low', 3.5, 'Secure Federal Facility', 'ON', TRUE),
('Cobalt', NOW(), 200, 800, 400, 'Critical', 1.8, 'Secure Federal Facility', 'ON', TRUE),
('Rare Earth Elements', NOW(), 150, 600, 300, 'Low', 4.2, 'Secure Federal Facility', 'QC', TRUE)
ON CONFLICT (mineral, timestamp) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get supply chain completeness by mineral
CREATE OR REPLACE FUNCTION get_supply_chain_completeness(target_mineral TEXT)
RETURNS TABLE(
  stage TEXT,
  has_domestic_capacity BOOLEAN,
  facility_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.stage,
    COUNT(*) > 0 as has_capacity,
    COUNT(*) as facilities
  FROM (
    VALUES ('Mining'), ('Concentration'), ('Refining'), ('Processing'), ('Manufacturing'), ('Recycling')
  ) AS stages(stage)
  LEFT JOIN minerals_supply_chain s
    ON s.stage = stages.stage
    AND s.mineral = target_mineral
    AND s.country = 'Canada'
    AND s.status IN ('Operational', 'Under Construction', 'Expansion')
  GROUP BY stages.stage
  ORDER BY
    CASE stages.stage
      WHEN 'Mining' THEN 1
      WHEN 'Concentration' THEN 2
      WHEN 'Refining' THEN 3
      WHEN 'Processing' THEN 4
      WHEN 'Manufacturing' THEN 5
      WHEN 'Recycling' THEN 6
    END;
END;
$$ LANGUAGE plpgsql;

-- Calculate China dependency percentage
CREATE OR REPLACE FUNCTION get_china_dependency()
RETURNS TABLE(
  mineral TEXT,
  total_imports_tonnes NUMERIC,
  china_imports_tonnes NUMERIC,
  china_dependency_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.mineral,
    SUM(t.volume_tonnes) as total_imports,
    SUM(CASE WHEN t.origin_country = 'China' OR t.is_china_sourced THEN t.volume_tonnes ELSE 0 END) as china_imports,
    (SUM(CASE WHEN t.origin_country = 'China' OR t.is_china_sourced THEN t.volume_tonnes ELSE 0 END) / NULLIF(SUM(t.volume_tonnes), 0) * 100) as china_pct
  FROM minerals_trade_flows t
  WHERE t.flow_type = 'Import'
    AND t.year = EXTRACT(YEAR FROM NOW())
  GROUP BY t.mineral
  HAVING SUM(t.volume_tonnes) > 0
  ORDER BY china_pct DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON critical_minerals_projects TO anon, authenticated;
GRANT SELECT ON minerals_supply_chain TO anon, authenticated;
GRANT SELECT ON minerals_prices TO anon, authenticated;
GRANT SELECT ON minerals_trade_flows TO anon, authenticated;
GRANT SELECT ON battery_supply_chain TO anon, authenticated;
GRANT SELECT ON minerals_strategic_stockpile TO anon, authenticated;
GRANT SELECT ON ev_minerals_demand_forecast TO anon, authenticated;
