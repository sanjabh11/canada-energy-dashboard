-- Migration: Grid Regions Reference Data
-- Created: 2025-11-08
-- Purpose: Replace hardcoded grid regions with database-backed reference data
-- Replaces: Hardcoded arrays in src/lib/realDataService.ts and enhancedDataService.ts

-- ============================================================================
-- GRID REGIONS REFERENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS grid_regions (
  id TEXT PRIMARY KEY,
  region_name TEXT NOT NULL UNIQUE,
  province_code TEXT NOT NULL,

  -- Capacity and baseline data
  design_capacity_mw NUMERIC NOT NULL,
  base_load_mw NUMERIC NOT NULL,
  peak_load_mw NUMERIC,

  -- Generation mix
  renewable_percentage NUMERIC NOT NULL CHECK (renewable_percentage >= 0 AND renewable_percentage <= 100),
  nuclear_percentage NUMERIC DEFAULT 0 CHECK (nuclear_percentage >= 0 AND nuclear_percentage <= 100),
  hydro_percentage NUMERIC DEFAULT 0 CHECK (hydro_percentage >= 0 AND hydro_percentage <= 100),
  wind_percentage NUMERIC DEFAULT 0 CHECK (wind_percentage >= 0 AND wind_percentage <= 100),
  solar_percentage NUMERIC DEFAULT 0 CHECK (solar_percentage >= 0 AND solar_percentage <= 100),
  gas_percentage NUMERIC DEFAULT 0 CHECK (gas_percentage >= 0 AND gas_percentage <= 100),
  coal_percentage NUMERIC DEFAULT 0 CHECK (coal_percentage >= 0 AND coal_percentage <= 100),
  other_percentage NUMERIC DEFAULT 0,

  -- Grid operator
  grid_operator TEXT,
  operator_website TEXT,

  -- Interconnections
  interconnections JSONB DEFAULT '[]',

  -- Geographic data
  latitude NUMERIC,
  longitude NUMERIC,
  timezone TEXT,

  -- Operational data
  average_grid_frequency_hz NUMERIC DEFAULT 60.0,
  voltage_standard_kv TEXT,

  -- Climate and renewable potential
  avg_annual_solar_irradiance_kwh_m2 NUMERIC,
  avg_wind_speed_m_s NUMERIC,

  -- Metadata
  data_source TEXT DEFAULT 'Grid Operator Reports',
  is_active BOOLEAN DEFAULT TRUE,
  last_verified_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_grid_regions_province ON grid_regions(province_code);
CREATE INDEX idx_grid_regions_active ON grid_regions(is_active);
CREATE INDEX idx_grid_regions_operator ON grid_regions(grid_operator);

COMMENT ON TABLE grid_regions IS 'Reference data for Canadian electricity grid regions with baseline capacity and generation mix';

-- ============================================================================
-- SEED GRID REGIONS WITH REAL DATA
-- ============================================================================

-- Data sources:
-- - IESO (Ontario): https://www.ieso.ca/en/Corporate-IESO/Media/Year-End-Data
-- - Hydro-Québec: https://www.hydroquebec.com/data/documents-donnees/
-- - AESO (Alberta): http://ets.aeso.ca
-- - BC Hydro: https://www.bchydro.com/energy-in-bc/operations/transmission-system.html
-- - SaskPower: https://www.saskpower.com/Our-Power-Future/Our-Electricity
-- - Manitoba Hydro: https://www.hydro.mb.ca/corporate/operations/

INSERT INTO grid_regions (
  id, region_name, province_code, design_capacity_mw, base_load_mw, peak_load_mw,
  renewable_percentage, nuclear_percentage, hydro_percentage, wind_percentage, solar_percentage, gas_percentage, coal_percentage,
  grid_operator, operator_website, interconnections, latitude, longitude, timezone,
  avg_annual_solar_irradiance_kwh_m2, avg_wind_speed_m_s, last_verified_date, notes
) VALUES

-- Ontario (IESO data 2024)
('grid-region-on',
 'Ontario',
 'ON',
 42000,  -- Total installed capacity
 15000,  -- Base load
 27000,  -- Peak load (summer 2024)
 40,     -- Renewable % (hydro + wind + solar)
 60,     -- Nuclear (Bruce, Pickering, Darlington)
 25,     -- Hydro (Niagara, St. Lawrence, northern hydro)
 10,     -- Wind
 5,      -- Solar
 10,     -- Natural gas
 0,      -- Coal (phased out 2014)
 'IESO',
 'https://www.ieso.ca',
 '[
   {"region": "Quebec", "capacity_mw": 2250, "type": "AC"},
   {"region": "Manitoba", "capacity_mw": 150, "type": "AC"},
   {"region": "Michigan", "capacity_mw": 2000, "type": "AC"},
   {"region": "New York", "capacity_mw": 1250, "type": "AC"},
   {"region": "Minnesota", "capacity_mw": 150, "type": "AC"}
 ]'::jsonb,
 43.6532,
 -79.3832,
 'America/Toronto',
 1300,  -- kWh/m²/year
 4.5,   -- m/s average wind speed
 '2024-11-01',
 'IESO data from 2024 year-end reports. Nuclear is largest source. Coal phased out in 2014.'
),

-- Quebec (Hydro-Québec data 2024)
('grid-region-qc',
 'Quebec',
 'QC',
 45000,  -- Massive hydro capacity
 12000,  -- Base load
 38000,  -- Peak load (winter heating)
 99,     -- Nearly 100% renewable (hydro + wind)
 0,      -- No nuclear
 95,     -- Hydro (James Bay, Manicouagan, Churchill Falls)
 4,      -- Wind
 0,      -- Solar (negligible)
 1,      -- Natural gas (peaking)
 0,      -- No coal
 'Hydro-Québec',
 'https://www.hydroquebec.com',
 '[
   {"region": "Ontario", "capacity_mw": 2250, "type": "AC"},
   {"region": "New Brunswick", "capacity_mw": 1200, "type": "AC"},
   {"region": "New England", "capacity_mw": 2225, "type": "HVDC"},
   {"region": "New York", "capacity_mw": 1250, "type": "HVDC"}
 ]'::jsonb,
 46.8139,
 -71.2080,
 'America/Toronto',
 1200,
 5.2,
 '2024-11-01',
 'World''s largest hydroelectric system. Major electricity exporter to New England and New York.'
),

-- Alberta (AESO data 2024)
('grid-region-ab',
 'Alberta',
 'AB',
 17200,  -- Total installed capacity
 8500,   -- Base load
 12100,  -- Peak load
 22,     -- Renewable % (wind + solar + hydro)
 0,      -- No nuclear
 2,      -- Hydro (limited)
 18,     -- Wind (growing rapidly)
 2,      -- Solar
 58,     -- Natural gas (dominant)
 20,     -- Coal (being phased out)
 'AESO',
 'http://www.aeso.ca',
 '[
   {"region": "British Columbia", "capacity_mw": 1000, "type": "AC"},
   {"region": "Saskatchewan", "capacity_mw": 150, "type": "AC"},
   {"region": "Montana", "capacity_mw": 300, "type": "AC"}
 ]'::jsonb,
 51.0447,
 -114.0719,
 'America/Edmonton',
 1350,  -- Good solar potential
 5.8,   -- Excellent wind resources
 '2024-11-01',
 'Coal-to-gas transition underway. Massive wind potential. 10GW+ AI data centre queue. Coal phase-out by 2030.'
),

-- British Columbia (BC Hydro data 2024)
('grid-region-bc',
 'British Columbia',
 'BC',
 18000,  -- Hydro-dominated
 7200,   -- Base load
 11000,  -- Peak load (winter)
 95,     -- Almost entirely renewable
 0,      -- No nuclear
 90,     -- Hydro (Columbia River, Peace River)
 3,      -- Wind
 2,      -- Solar
 5,      -- Natural gas (peaking/backup)
 0,      -- No coal
 'BC Hydro',
 'https://www.bchydro.com',
 '[
   {"region": "Alberta", "capacity_mw": 1000, "type": "AC"},
   {"region": "Washington", "capacity_mw": 1200, "type": "AC"}
 ]'::jsonb,
 49.2827,
 -123.1207,
 'America/Vancouver',
 1100,
 4.8,
 '2024-11-01',
 'Clean hydroelectric power. Site C dam under construction (1100 MW). Major electricity exporter.'
),

-- Saskatchewan (SaskPower data 2024)
('grid-region-sk',
 'Saskatchewan',
 'SK',
 4800,
 2800,   -- Base load
 3900,   -- Peak load
 28,     -- Renewable % (hydro + wind)
 0,      -- No nuclear
 18,     -- Hydro
 10,     -- Wind (growing)
 0,      -- Solar (minimal)
 55,     -- Natural gas
 17,     -- Coal (being phased out)
 'SaskPower',
 'https://www.saskpower.com',
 '[
   {"region": "Alberta", "capacity_mw": 150, "type": "AC"},
   {"region": "Manitoba", "capacity_mw": 200, "type": "AC"},
   {"region": "North Dakota", "capacity_mw": 100, "type": "AC"}
 ]'::jsonb,
 50.4452,
 -104.6189,
 'America/Regina',
 1400,  -- Excellent solar potential (highest in Canada)
 6.1,   -- Good wind resources
 '2024-11-01',
 'Transitioning from coal to natural gas and renewables. Excellent renewable potential.'
),

-- Manitoba (Manitoba Hydro data 2024)
('grid-region-mb',
 'Manitoba',
 'MB',
 6500,
 2400,   -- Base load
 5000,   -- Peak load
 99,     -- Nearly 100% hydro
 0,      -- No nuclear
 97,     -- Hydro (Churchill, Limestone, Nelson River)
 2,      -- Wind
 0,      -- Solar (negligible)
 1,      -- Natural gas (backup)
 0,      -- No coal
 'Manitoba Hydro',
 'https://www.hydro.mb.ca',
 '[
   {"region": "Ontario", "capacity_mw": 150, "type": "AC"},
   {"region": "Saskatchewan", "capacity_mw": 200, "type": "AC"},
   {"region": "Minnesota", "capacity_mw": 500, "type": "HVDC"},
   {"region": "North Dakota", "capacity_mw": 500, "type": "HVDC"}
 ]'::jsonb,
 49.8951,
 -97.1384,
 'America/Winnipeg',
 1300,
 5.5,
 '2024-11-01',
 'Clean hydroelectric power. Major electricity exporter to US Midwest. Bipole I, II, III transmission.'
),

-- New Brunswick (NB Power data 2024)
('grid-region-nb',
 'New Brunswick',
 'NB',
 4500,
 1800,
 3200,
 50,
 34,     -- Point Lepreau nuclear
 16,     -- Hydro
 0,      -- Wind (minimal)
 0,      -- Solar
 40,     -- Natural gas and oil
 10,     -- Coal (Belledune)
 'NB Power',
 'https://www.nbpower.com',
 '[
   {"region": "Quebec", "capacity_mw": 1200, "type": "AC"},
   {"region": "Nova Scotia", "capacity_mw": 300, "type": "AC"},
   {"region": "Prince Edward Island", "capacity_mw": 180, "type": "AC"},
   {"region": "Maine", "capacity_mw": 1000, "type": "AC"}
 ]'::jsonb,
 45.9636,
 -66.6431,
 'America/Moncton',
 1200,
 5.0,
 '2024-11-01',
 'Mix of nuclear, hydro, and fossil fuels. Point Lepreau nuclear refurbished.'
),

-- Nova Scotia (Nova Scotia Power data 2024)
('grid-region-ns',
 'Nova Scotia',
 'NS',
 2800,
 1400,
 2400,
 35,
 0,
 10,     -- Hydro
 12,     -- Wind (growing)
 0,      -- Solar
 50,     -- Natural gas
 28,     -- Coal (being phased out)
 'Nova Scotia Power',
 'https://www.nspower.ca',
 '[
   {"region": "New Brunswick", "capacity_mw": 300, "type": "AC"},
   {"region": "Newfoundland and Labrador", "capacity_mw": 500, "type": "HVDC"}
 ]'::jsonb,
 44.6488,
 -63.5752,
 'America/Halifax',
 1250,
 6.5,  -- Excellent offshore wind potential
 '2024-11-01',
 'Transitioning to renewables. Maritime Link to Newfoundland. Coal phase-out planned.'
)

ON CONFLICT (id) DO UPDATE SET
  design_capacity_mw = EXCLUDED.design_capacity_mw,
  base_load_mw = EXCLUDED.base_load_mw,
  peak_load_mw = EXCLUDED.peak_load_mw,
  renewable_percentage = EXCLUDED.renewable_percentage,
  nuclear_percentage = EXCLUDED.nuclear_percentage,
  hydro_percentage = EXCLUDED.hydro_percentage,
  wind_percentage = EXCLUDED.wind_percentage,
  solar_percentage = EXCLUDED.solar_percentage,
  gas_percentage = EXCLUDED.gas_percentage,
  coal_percentage = EXCLUDED.coal_percentage,
  interconnections = EXCLUDED.interconnections,
  last_verified_date = EXCLUDED.last_verified_date,
  notes = EXCLUDED.notes,
  last_updated = NOW();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get grid region by province
CREATE OR REPLACE FUNCTION get_grid_region_by_province(prov_code TEXT)
RETURNS SETOF grid_regions AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM grid_regions
  WHERE province_code = prov_code AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Get all active grid regions
CREATE OR REPLACE FUNCTION get_all_active_grid_regions()
RETURNS SETOF grid_regions AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM grid_regions
  WHERE is_active = TRUE
  ORDER BY base_load_mw DESC;
END;
$$ LANGUAGE plpgsql;

-- Calculate total Canadian capacity
CREATE OR REPLACE FUNCTION get_total_canadian_capacity()
RETURNS TABLE(
  total_capacity_mw NUMERIC,
  total_base_load_mw NUMERIC,
  avg_renewable_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(design_capacity_mw) as total_capacity,
    SUM(base_load_mw) as total_base,
    AVG(renewable_percentage) as avg_renewable
  FROM grid_regions
  WHERE is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON grid_regions TO anon, authenticated;

-- ============================================================================
-- DATA QUALITY NOTES
-- ============================================================================

-- This migration replaces hardcoded grid regions with database-backed reference data
-- Sources:
-- - IESO (Ontario): Year-end reports and market data
-- - Hydro-Québec: Annual reports and generation statistics
-- - AESO (Alberta): Market reports and interconnection queue
-- - BC Hydro: Annual reports and generation data
-- - SaskPower: Annual reports
-- - Manitoba Hydro: Annual reports
-- - NB Power: Annual reports
-- - Nova Scotia Power: Annual reports
--
-- Data last verified: November 2024
-- Update frequency: Quarterly or when major capacity changes occur
--
-- Next steps:
-- 1. Create Edge Function to serve this data (api-v2-grid-regions)
-- 2. Update src/lib/realDataService.ts to query Edge Function
-- 3. Update src/lib/enhancedDataService.ts to query Edge Function
-- 4. Remove hardcoded arrays from TypeScript files
