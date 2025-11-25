-- FIX: Industrial Decarb RLS policies (PostgreSQL-compatible syntax)
-- Run this in Supabase SQL Editor after tables are created

-- Drop existing policies if they exist, then create fresh
DROP POLICY IF EXISTS "Allow authenticated read" ON facility_emissions;
DROP POLICY IF EXISTS "Allow authenticated read" ON methane_reduction_tracker;
DROP POLICY IF EXISTS "Allow authenticated read" ON obps_compliance;
DROP POLICY IF EXISTS "Allow authenticated read" ON efficiency_projects;

-- Also allow anon access for public dashboard
DROP POLICY IF EXISTS "Allow anon read" ON facility_emissions;
DROP POLICY IF EXISTS "Allow anon read" ON methane_reduction_tracker;
DROP POLICY IF EXISTS "Allow anon read" ON obps_compliance;
DROP POLICY IF EXISTS "Allow anon read" ON efficiency_projects;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read" ON facility_emissions 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON methane_reduction_tracker 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON obps_compliance 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read" ON efficiency_projects 
  FOR SELECT TO authenticated USING (true);

-- Create policies for anon users (public dashboard access)
CREATE POLICY "Allow anon read" ON facility_emissions 
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read" ON methane_reduction_tracker 
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read" ON obps_compliance 
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read" ON efficiency_projects 
  FOR SELECT TO anon USING (true);

-- Seed sample data (skip if data already exists)

INSERT INTO methane_reduction_tracker (company, sector, baseline_year, baseline_methane_tonnes, current_year, current_methane_tonnes, ldar_program_active, flare_reduction_program)
SELECT * FROM (VALUES
  ('Suncor Energy', 'oil_gas', 2019, 1250000::numeric, 2024, 875000::numeric, true, true),
  ('Canadian Natural Resources', 'oil_gas', 2019, 1450000, 2024, 1087500, true, false),
  ('Imperial Oil', 'oil_gas', 2019, 980000, 2024, 735000, true, true),
  ('Cenovus Energy', 'oil_gas', 2019, 820000, 2024, 574000, true, true)
) AS v(company, sector, baseline_year, baseline_methane_tonnes, current_year, current_methane_tonnes, ldar_program_active, flare_reduction_program)
WHERE NOT EXISTS (SELECT 1 FROM methane_reduction_tracker LIMIT 1);

INSERT INTO obps_compliance (facility_name, operator, province_code, reporting_year, production_volume, production_unit, baseline_emission_intensity, actual_emission_intensity, credit_market_price_per_tonne, compliance_status)
SELECT * FROM (VALUES
  ('Base Plant', 'Suncor Energy', 'AB', 2023, 350000000::numeric, 'barrel', 0.082::numeric, 0.075::numeric, 65::numeric, 'surplus'),
  ('Horizon Oil Sands', 'Canadian Natural Resources', 'AB', 2023, 180000000, 'barrel', 0.095, 0.098, 65, 'deficit'),
  ('Kearl Oil Sands', 'Imperial Oil', 'AB', 2023, 280000000, 'barrel', 0.088, 0.081, 65, 'surplus'),
  ('Christina Lake', 'Cenovus Energy', 'AB', 2023, 220000000, 'barrel', 0.078, 0.072, 65, 'surplus')
) AS v(facility_name, operator, province_code, reporting_year, production_volume, production_unit, baseline_emission_intensity, actual_emission_intensity, credit_market_price_per_tonne, compliance_status)
WHERE NOT EXISTS (SELECT 1 FROM obps_compliance LIMIT 1);

INSERT INTO efficiency_projects (project_name, company, facility_name, province_code, project_type, investment_cad, start_date, completion_date, status, annual_emissions_avoided_tonnes, annual_cost_savings_cad, government_funding_cad, funding_source)
SELECT * FROM (VALUES
  ('Cogeneration Unit 4', 'Suncor Energy', 'Base Plant', 'AB', 'cogeneration', 450000000::numeric, '2021-01-15'::date, '2024-06-30'::date, 'operational', 850000::numeric, 120000000::numeric, 75000000::numeric, ARRAY['EMRF']),
  ('Heat Recovery Optimization', 'Imperial Oil', 'Kearl Oil Sands', 'AB', 'heat_recovery', 180000000, '2022-03-01', '2024-09-15', 'operational', 320000, 45000000, 30000000, ARRAY['EMRF', 'ERA']),
  ('Solvent-Assisted SAGD', 'Cenovus Energy', 'Christina Lake', 'AB', 'process_optimization', 650000000, '2020-06-01', '2023-12-31', 'operational', 1200000, 180000000, 100000000, ARRAY['EMRF']),
  ('Electric Drive Replacement', 'Canadian Natural Resources', 'Horizon Oil Sands', 'AB', 'electrification', 220000000, '2023-01-01', '2025-12-31', 'under_construction', 450000, 65000000, 40000000, ARRAY['EMRF'])
) AS v(project_name, company, facility_name, province_code, project_type, investment_cad, start_date, completion_date, status, annual_emissions_avoided_tonnes, annual_cost_savings_cad, government_funding_cad, funding_source)
WHERE NOT EXISTS (SELECT 1 FROM efficiency_projects LIMIT 1);

SELECT 'Industrial Decarb policies and seed data applied' AS status;
