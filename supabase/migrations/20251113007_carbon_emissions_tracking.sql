-- Carbon Emissions Tracking Tables
-- Tracks GHG emissions from electricity generation across Canada
-- Data sources: Environment Canada, provincial reporting, ECCC GHG inventory

-- =============================================================================
-- 1. PROVINCIAL EMISSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS provincial_ghg_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code CHAR(2) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,
  reporting_year INTEGER NOT NULL CHECK (reporting_year >= 2000 AND reporting_year <= 2100),
  reporting_quarter TEXT CHECK (reporting_quarter IN ('Q1', 'Q2', 'Q3', 'Q4', 'Annual')),

  -- Emissions by sector (tonnes CO2e)
  electricity_generation_tco2e NUMERIC(12, 2),
  transportation_tco2e NUMERIC(12, 2),
  buildings_tco2e NUMERIC(12, 2),
  industry_tco2e NUMERIC(12, 2),
  agriculture_tco2e NUMERIC(12, 2),
  waste_tco2e NUMERIC(12, 2),
  total_emissions_tco2e NUMERIC(12, 2) NOT NULL,

  -- Emissions intensity
  emissions_intensity_gco2_per_kwh NUMERIC(8, 2), -- Grid emissions intensity
  population INTEGER,
  emissions_per_capita_tco2e NUMERIC(8, 2),
  gdp_millions_cad NUMERIC(12, 2),
  emissions_intensity_tco2e_per_million_gdp NUMERIC(8, 2),

  -- Metadata
  data_source TEXT DEFAULT 'Environment and Climate Change Canada',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_provincial_emissions UNIQUE (province_code, reporting_year, reporting_quarter)
);

CREATE INDEX idx_provincial_emissions_province ON provincial_ghg_emissions(province_code);
CREATE INDEX idx_provincial_emissions_year ON provincial_ghg_emissions(reporting_year);

-- =============================================================================
-- 2. GENERATION SOURCE EMISSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS generation_source_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type TEXT NOT NULL CHECK (fuel_type IN (
    'Coal', 'Natural Gas', 'Oil', 'Nuclear', 'Hydro', 'Wind', 'Solar',
    'Biomass', 'Geothermal', 'Tidal', 'Other'
  )),
  province_code CHAR(2) REFERENCES provinces(code) ON DELETE CASCADE,

  -- Lifecycle emissions factors (gCO2e/kWh)
  lifecycle_emissions_gco2_per_kwh NUMERIC(8, 2) NOT NULL,
  direct_emissions_gco2_per_kwh NUMERIC(8, 2), -- Combustion only
  upstream_emissions_gco2_per_kwh NUMERIC(8, 2), -- Extraction, refining
  downstream_emissions_gco2_per_kwh NUMERIC(8, 2), -- Waste, decommissioning

  -- Metadata
  methodology TEXT DEFAULT 'IPCC 2021 Guidelines',
  reference_year INTEGER,
  data_source TEXT,
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_generation_source_emissions UNIQUE (fuel_type, province_code)
);

CREATE INDEX idx_generation_emissions_fuel ON generation_source_emissions(fuel_type);

-- =============================================================================
-- 3. CARBON TARGETS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS carbon_reduction_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT NOT NULL, -- 'Federal' or province code
  target_year INTEGER NOT NULL CHECK (target_year >= 2020 AND target_year <= 2100),
  target_type TEXT NOT NULL CHECK (target_type IN (
    'Net Zero', 'Percentage Reduction', 'Absolute Emissions Cap', 'Intensity Target'
  )),

  -- Target details
  baseline_year INTEGER,
  baseline_emissions_mtco2e NUMERIC(10, 2),
  target_emissions_mtco2e NUMERIC(10, 2),
  reduction_percentage NUMERIC(5, 2), -- e.g., 40% reduction

  -- Sectoral targets
  electricity_sector_target_mtco2e NUMERIC(10, 2),
  electricity_grid_intensity_target_gco2_per_kwh NUMERIC(8, 2),

  -- Policy framework
  policy_instrument TEXT, -- e.g., 'Clean Electricity Regulations', 'Provincial Cap & Trade'
  legal_status TEXT CHECK (legal_status IN ('Legislated', 'Policy Commitment', 'Aspirational')),
  interim_milestones JSONB, -- Array of {year, target_mtco2e}

  -- Tracking
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Achieved', 'Revised', 'Abandoned')),
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_carbon_target UNIQUE (jurisdiction, target_year, target_type)
);

CREATE INDEX idx_carbon_targets_jurisdiction ON carbon_reduction_targets(jurisdiction);
CREATE INDEX idx_carbon_targets_year ON carbon_reduction_targets(target_year);

-- =============================================================================
-- 4. AVOIDED EMISSIONS TABLE (Credits from Renewables/Nuclear)
-- =============================================================================

CREATE TABLE IF NOT EXISTS avoided_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code CHAR(2) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,
  reporting_year INTEGER NOT NULL,

  -- Clean generation (GWh)
  clean_generation_gwh NUMERIC(12, 2) NOT NULL,
  nuclear_gwh NUMERIC(12, 2),
  hydro_gwh NUMERIC(12, 2),
  wind_gwh NUMERIC(12, 2),
  solar_gwh NUMERIC(12, 2),
  other_renewables_gwh NUMERIC(12, 2),

  -- Avoided emissions (tonnes CO2e)
  total_avoided_tco2e NUMERIC(12, 2) NOT NULL,
  counterfactual_grid_intensity_gco2_per_kwh NUMERIC(8, 2), -- What emissions would have been with fossil fuels

  -- Economic value
  carbon_price_cad_per_tco2e NUMERIC(8, 2),
  economic_value_cad NUMERIC(12, 2), -- avoided_tco2e * carbon_price

  -- Metadata
  methodology TEXT DEFAULT 'Displaced grid average',
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_avoided_emissions UNIQUE (province_code, reporting_year)
);

CREATE INDEX idx_avoided_emissions_province ON avoided_emissions(province_code);
CREATE INDEX idx_avoided_emissions_year ON avoided_emissions(reporting_year);

-- =============================================================================
-- 5. MATERIALIZED VIEW: Provincial Emissions Summary
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS provincial_emissions_summary AS
SELECT
  p.code AS province_code,
  p.name AS province_name,
  pge.reporting_year,
  pge.total_emissions_tco2e,
  pge.electricity_generation_tco2e,
  pge.emissions_intensity_gco2_per_kwh,
  pge.emissions_per_capita_tco2e,
  ae.total_avoided_tco2e,
  ae.clean_generation_gwh,
  ROUND((ae.total_avoided_tco2e / NULLIF(pge.total_emissions_tco2e, 0)) * 100, 2) AS clean_energy_offset_percent
FROM provincial_ghg_emissions pge
JOIN provinces p ON pge.province_code = p.code
LEFT JOIN avoided_emissions ae ON pge.province_code = ae.province_code AND pge.reporting_year = ae.reporting_year
WHERE pge.reporting_quarter = 'Annual'
ORDER BY pge.reporting_year DESC, pge.total_emissions_tco2e DESC;

CREATE UNIQUE INDEX idx_provincial_emissions_summary ON provincial_emissions_summary(province_code, reporting_year);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Provincial GHG Emissions (2023 data from ECCC)
INSERT INTO provincial_ghg_emissions (province_code, reporting_year, reporting_quarter, electricity_generation_tco2e, total_emissions_tco2e, emissions_intensity_gco2_per_kwh, population, emissions_per_capita_tco2e) VALUES
('AB', 2023, 'Annual', 45000000, 265000000, 620, 4756408, 55.7),
('SK', 2023, 'Annual', 17000000, 72000000, 680, 1214618, 59.3),
('ON', 2023, 'Annual', 5000000, 150000000, 30, 15500632, 9.7),
('QC', 2023, 'Annual', 800000, 78000000, 1.5, 8775966, 8.9),
('BC', 2023, 'Annual', 2000000, 62000000, 12, 5519913, 11.2),
('MB', 2023, 'Annual', 300000, 21000000, 3, 1465440, 14.3),
('NS', 2023, 'Annual', 6500000, 16000000, 550, 1030281, 15.5),
('NB', 2023, 'Annual', 4000000, 14000000, 290, 842725, 16.6),
('NL', 2023, 'Annual', 1800000, 10500000, 85, 538605, 19.5),
('PE', 2023, 'Annual', 350000, 2000000, 45, 175853, 11.4);

-- Generation Source Emissions Factors (IPCC 2021)
INSERT INTO generation_source_emissions (fuel_type, lifecycle_emissions_gco2_per_kwh, direct_emissions_gco2_per_kwh, methodology) VALUES
('Coal', 820, 950, 'IPCC 2021 Guidelines'),
('Natural Gas', 490, 490, 'IPCC 2021 Guidelines - Combined Cycle'),
('Oil', 650, 720, 'IPCC 2021 Guidelines'),
('Nuclear', 12, 0, 'IPCC 2021 Guidelines - Lifecycle'),
('Hydro', 24, 0, 'IPCC 2021 Guidelines - Lifecycle'),
('Wind', 11, 0, 'IPCC 2021 Guidelines - Lifecycle'),
('Solar', 48, 0, 'IPCC 2021 Guidelines - Lifecycle PV'),
('Biomass', 230, 0, 'IPCC 2021 Guidelines - Sustainable'),
('Geothermal', 38, 0, 'IPCC 2021 Guidelines'),
('Tidal', 15, 0, 'IPCC 2021 Guidelines');

-- Carbon Reduction Targets
INSERT INTO carbon_reduction_targets (jurisdiction, target_year, target_type, baseline_year, baseline_emissions_mtco2e, target_emissions_mtco2e, reduction_percentage, policy_instrument, legal_status) VALUES
('Federal', 2030, 'Percentage Reduction', 2005, 730, 438, 40, '2030 Emissions Reduction Plan', 'Legislated'),
('Federal', 2050, 'Net Zero', 2005, 730, 0, 100, 'Net-Zero Emissions Accountability Act', 'Legislated'),
('ON', 2030, 'Percentage Reduction', 2005, 200, 134, 30, 'Ontario Climate Plan', 'Policy Commitment'),
('QC', 2030, 'Percentage Reduction', 1990, 89, 62, 37.5, 'Quebec 2030 Plan', 'Legislated'),
('BC', 2030, 'Percentage Reduction', 2007, 68, 27, 40, 'CleanBC Plan', 'Legislated'),
('AB', 2050, 'Net Zero', 2005, 280, 0, 100, 'Alberta Emissions Reduction Plan', 'Policy Commitment');

-- Avoided Emissions (2023 estimates)
INSERT INTO avoided_emissions (province_code, reporting_year, clean_generation_gwh, total_avoided_tco2e, counterfactual_grid_intensity_gco2_per_kwh, carbon_price_cad_per_tco2e) VALUES
('ON', 2023, 135000, 78000000, 600, 65),
('QC', 2023, 195000, 113000000, 600, 65),
('BC', 2023, 78000, 45000000, 600, 65),
('MB', 2023, 35000, 20000000, 600, 65);

-- Refresh materialized view
REFRESH MATERIALIZED VIEW provincial_emissions_summary;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE provincial_ghg_emissions IS 'Provincial greenhouse gas emissions by sector and year';
COMMENT ON TABLE generation_source_emissions IS 'Lifecycle emissions factors for different generation sources';
COMMENT ON TABLE carbon_reduction_targets IS 'Federal and provincial carbon reduction targets and net-zero commitments';
COMMENT ON TABLE avoided_emissions IS 'Emissions avoided through clean electricity generation (renewables, nuclear)';
COMMENT ON MATERIALIZED VIEW provincial_emissions_summary IS 'Aggregated provincial emissions with clean energy offsets';
