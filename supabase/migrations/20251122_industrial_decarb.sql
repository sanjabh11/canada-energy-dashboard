-- supabase/migrations/20251122_industrial_decarb.sql
-- Industrial Decarbonization tables for Industrial Decarb Dashboard

-- Facility Emissions Table (from NPRI data)
CREATE TABLE IF NOT EXISTS facility_emissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  province_code TEXT CHECK (province_code IN ('AB', 'BC', 'SK', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'MB', 'YT', 'NT', 'NU')),
  city TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  sector TEXT NOT NULL,
  emissions_tonnes NUMERIC(12,2) NOT NULL, -- Total GHG emissions (tonnes CO2e)
  co2_tonnes NUMERIC(12,2),
  ch4_tonnes NUMERIC(12,2), -- Methane in CO2e
  n2o_tonnes NUMERIC(12,2),
  hfc_tonnes NUMERIC(12,2),
  reporting_year INTEGER NOT NULL,
  emission_intensity NUMERIC(10,4), -- kg CO2e per unit (e.g., kg CO2/barrel)
  production_unit TEXT, -- e.g., 'barrel', 'MWh', 'tonne'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Methane Reduction Tracking
CREATE TABLE IF NOT EXISTS methane_reduction_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  sector TEXT NOT NULL,
  baseline_year INTEGER DEFAULT 2019,
  baseline_methane_tonnes NUMERIC(12,2) NOT NULL,
  current_year INTEGER NOT NULL,
  current_methane_tonnes NUMERIC(12,2) NOT NULL,
  reduction_percent NUMERIC(5,2) GENERATED ALWAYS AS ((baseline_methane_tonnes - current_methane_tonnes) / baseline_methane_tonnes * 100) STORED,
  target_2030_reduction_percent NUMERIC(5,2) DEFAULT 75, -- Federal target
  on_track BOOLEAN GENERATED ALWAYS AS (((baseline_methane_tonnes - current_methane_tonnes) / baseline_methane_tonnes * 100) >= (target_2030_reduction_percent * (current_year - baseline_year) / (2030 - baseline_year))) STORED,
  ldar_program_active BOOLEAN DEFAULT false, -- Leak Detection & Repair
  flare_reduction_program BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OBPS Compliance (Output-Based Pricing System)
CREATE TABLE IF NOT EXISTS obps_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_name TEXT NOT NULL,
  operator TEXT NOT NULL,
  province_code TEXT NOT NULL,
  reporting_year INTEGER NOT NULL,
  production_volume NUMERIC(15,2) NOT NULL,
  production_unit TEXT NOT NULL,
  baseline_emission_intensity NUMERIC(10,4) NOT NULL, -- tonnes CO2e per unit
  actual_emission_intensity NUMERIC(10,4) NOT NULL,
  credits_debits_tonnes NUMERIC(12,2) GENERATED ALWAYS AS ((baseline_emission_intensity - actual_emission_intensity) * production_volume) STORED,
  credit_market_price_per_tonne NUMERIC(8,2), -- Current market price for credits
  financial_value_cad NUMERIC(15,2) GENERATED ALWAYS AS (((baseline_emission_intensity - actual_emission_intensity) * production_volume) * credit_market_price_per_tonne) STORED,
  compliance_status TEXT CHECK (compliance_status IN ('surplus', 'deficit', 'neutral')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Process Efficiency Projects
CREATE TABLE IF NOT EXISTS efficiency_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  company TEXT NOT NULL,
  facility_name TEXT,
  province_code TEXT NOT NULL,
  project_type TEXT CHECK (project_type IN ('heat_recovery', 'cogeneration', 'electrification', 'process_optimization', 'waste_heat_utilization')),
  investment_cad NUMERIC(15,2) NOT NULL,
  start_date DATE,
  completion_date DATE,
  status TEXT CHECK (status IN ('planned', 'under_construction', 'operational', 'cancelled')),
  annual_emissions_avoided_tonnes NUMERIC(10,2),
  annual_cost_savings_cad NUMERIC(12,2),
  payback_period_years NUMERIC(4,1) GENERATED ALWAYS AS (investment_cad / NULLIF(annual_cost_savings_cad, 0)) STORED,
  government_funding_cad NUMERIC(15,2), -- e.g., from EMRF (Emissions Reduction Fund)
  funding_source TEXT[], -- e.g., ['EMRF', 'SDTC', 'provincial']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE facility_emissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE methane_reduction_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE obps_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE efficiency_projects ENABLE ROW LEVEL SECURITY;

-- Public read access (drop first for idempotency, then create)
DROP POLICY IF EXISTS "Allow authenticated read" ON facility_emissions;
DROP POLICY IF EXISTS "Allow authenticated read" ON methane_reduction_tracker;
DROP POLICY IF EXISTS "Allow authenticated read" ON obps_compliance;
DROP POLICY IF EXISTS "Allow authenticated read" ON efficiency_projects;
DROP POLICY IF EXISTS "Allow anon read" ON facility_emissions;
DROP POLICY IF EXISTS "Allow anon read" ON methane_reduction_tracker;
DROP POLICY IF EXISTS "Allow anon read" ON obps_compliance;
DROP POLICY IF EXISTS "Allow anon read" ON efficiency_projects;

CREATE POLICY "Allow authenticated read" ON facility_emissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON methane_reduction_tracker FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON obps_compliance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON efficiency_projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow anon read" ON facility_emissions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read" ON methane_reduction_tracker FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read" ON obps_compliance FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read" ON efficiency_projects FOR SELECT TO anon USING (true);

-- Seed sample data for methane reduction, OBPS, and efficiency projects

-- Insert sample methane reduction data
INSERT INTO methane_reduction_tracker (company, sector, baseline_year, baseline_methane_tonnes, current_year, current_methane_tonnes, ldar_program_active, flare_reduction_program)
VALUES
  ('Suncor Energy', 'oil_gas', 2019, 1250000, 2024, 875000, true, true),
  ('Canadian Natural Resources', 'oil_gas', 2019, 1450000, 2024, 1087500, true, false),
  ('Imperial Oil', 'oil_gas', 2019, 980000, 2024, 735000, true, true),
  ('Cenovus Energy', 'oil_gas', 2019, 820000, 2024, 574000, true, true);

-- Insert sample OBPS compliance data
INSERT INTO obps_compliance (facility_name, operator, province_code, reporting_year, production_volume, production_unit, baseline_emission_intensity, actual_emission_intensity, credit_market_price_per_tonne, compliance_status)
VALUES
  ('Base Plant', 'Suncor Energy', 'AB', 2023, 350000000, 'barrel', 0.082, 0.075, 65, 'surplus'),
  ('Horizon Oil Sands', 'Canadian Natural Resources', 'AB', 2023, 180000000, 'barrel', 0.095, 0.098, 65, 'deficit'),
  ('Kearl Oil Sands', 'Imperial Oil', 'AB', 2023, 280000000, 'barrel', 0.088, 0.081, 65, 'surplus'),
  ('Christina Lake', 'Cenovus Energy', 'AB', 2023, 220000000, 'barrel', 0.078, 0.072, 65, 'surplus');

-- Insert sample efficiency projects
INSERT INTO efficiency_projects (project_name, company, facility_name, province_code, project_type, investment_cad, start_date, completion_date, status, annual_emissions_avoided_tonnes, annual_cost_savings_cad, government_funding_cad, funding_source)
VALUES
  ('Cogeneration Unit 4', 'Suncor Energy', 'Base Plant', 'AB', 'cogeneration', 450000000, '2021-01-15', '2024-06-30', 'operational', 850000, 120000000, 75000000, ARRAY['EMRF']),
  ('Heat Recovery Optimization', 'Imperial Oil', 'Kearl Oil Sands', 'AB', 'heat_recovery', 180000000, '2022-03-01', '2024-09-15', 'operational', 320000, 45000000, 30000000, ARRAY['EMRF', 'ERA']),
  ('Solvent-Assisted SAGD', 'Cenovus Energy', 'Christina Lake', 'AB', 'process_optimization', 650000000, '2020-06-01', '2023-12-31', 'operational', 1200000, 180000000, 100000000, ARRAY['EMRF']),
  ('Electric Drive Replacement', 'Canadian Natural Resources', 'Horizon Oil Sands', 'AB', 'electrification', 220000000, '2023-01-01', '2025-12-31', 'under_construction', 450000, 65000000, 40000000, ARRAY['EMRF']);
