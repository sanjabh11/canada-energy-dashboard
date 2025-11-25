-- FIX: ESG Dashboard RLS policies (PostgreSQL-compatible syntax)
-- Run this in Supabase SQL Editor after tables are created

-- Drop existing policies if they exist, then create fresh
DROP POLICY IF EXISTS "Allow authenticated read access" ON green_bonds;
DROP POLICY IF EXISTS "Allow authenticated read access" ON esg_ratings;
DROP POLICY IF EXISTS "Allow authenticated read access" ON sustainability_linked_loans;
DROP POLICY IF EXISTS "Allow authenticated read access" ON carbon_pricing_exposure;

-- Also allow anon access for public dashboard
DROP POLICY IF EXISTS "Allow anon read access" ON green_bonds;
DROP POLICY IF EXISTS "Allow anon read access" ON esg_ratings;
DROP POLICY IF EXISTS "Allow anon read access" ON sustainability_linked_loans;
DROP POLICY IF EXISTS "Allow anon read access" ON carbon_pricing_exposure;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated read access" ON green_bonds 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON esg_ratings 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON sustainability_linked_loans 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read access" ON carbon_pricing_exposure 
  FOR SELECT TO authenticated USING (true);

-- Create policies for anon users (public dashboard access)
CREATE POLICY "Allow anon read access" ON green_bonds 
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read access" ON esg_ratings 
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read access" ON sustainability_linked_loans 
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read access" ON carbon_pricing_exposure 
  FOR SELECT TO anon USING (true);

-- Seed sample data (use ON CONFLICT to make idempotent)
-- Note: These tables don't have unique constraints yet, so we'll skip if data exists

INSERT INTO green_bonds (issuer, issuer_type, amount_cad, issue_date, maturity_date, yield_percent, use_of_proceeds, certification)
SELECT * FROM (VALUES
  ('TransAlta Corporation', 'utility', 400000000::numeric, '2021-06-15'::date, '2031-06-15'::date, 2.85::numeric, ARRAY['renewable_energy', 'wind_solar'], ARRAY['green_bond_principles']),
  ('Capital Power Corporation', 'utility', 300000000, '2022-03-10', '2032-03-10', 3.10, ARRAY['renewable_energy', 'battery_storage'], ARRAY['climate_bonds_initiative']),
  ('Enbridge Inc.', 'oil_gas', 750000000, '2021-10-05', '2031-10-05', 2.95, ARRAY['renewable_natural_gas', 'carbon_capture'], ARRAY['green_bond_principles']),
  ('TC Energy', 'oil_gas', 500000000, '2023-01-20', '2033-01-20', 3.25, ARRAY['renewable_energy', 'emission_reduction'], ARRAY['green_bond_principles']),
  ('Hydro-Québec', 'utility', 1000000000, '2020-09-15', '2030-09-15', 2.45, ARRAY['renewable_energy', 'grid_modernization'], ARRAY['climate_bonds_initiative', 'green_bond_principles'])
) AS v(issuer, issuer_type, amount_cad, issue_date, maturity_date, yield_percent, use_of_proceeds, certification)
WHERE NOT EXISTS (SELECT 1 FROM green_bonds LIMIT 1);

INSERT INTO esg_ratings (company, sector, msci_score, msci_score_numeric, sustainalytics_risk_score, sp_global_score, cdp_climate_score, rating_date, peer_percentile, trend)
SELECT * FROM (VALUES
  ('Suncor Energy', 'oil_gas', 'BB', 4.0::numeric, 33.5::numeric, 42::numeric, 'B', '2024-12-01'::date, 35::numeric, 'improving'),
  ('Canadian Natural Resources', 'oil_gas', 'B', 3.5, 36.2, 38, 'C', '2024-12-01', 28, 'stable'),
  ('TransAlta', 'utility', 'A', 6.5, 22.8, 68, 'A-', '2024-12-01', 72, 'improving'),
  ('Capital Power', 'utility', 'BBB', 5.5, 25.5, 62, 'B', '2024-12-01', 58, 'improving'),
  ('Brookfield Renewable', 'renewable', 'AA', 7.5, 18.2, 78, 'A', '2024-12-01', 88, 'stable'),
  ('Teck Resources', 'mining', 'A', 6.0, 24.1, 65, 'A-', '2024-12-01', 65, 'improving')
) AS v(company, sector, msci_score, msci_score_numeric, sustainalytics_risk_score, sp_global_score, cdp_climate_score, rating_date, peer_percentile, trend)
WHERE NOT EXISTS (SELECT 1 FROM esg_ratings LIMIT 1);

INSERT INTO sustainability_linked_loans (company, lender, amount_cad, announcement_date, maturity_years, kpi_type, kpi_target, rate_adjustment_bps, current_status)
SELECT * FROM (VALUES
  ('TransAlta', 'TD Bank', 1200000000::numeric, '2021-06-01'::date, 5, ARRAY['renewable_capacity', 'emission_intensity'], 'Increase renewable capacity to 4 GW by 2025, reduce emission intensity by 40%', 25, 'achieved'),
  ('Capital Power', 'CIBC', 800000000, '2022-09-15', 7, ARRAY['renewable_capacity'], 'Achieve 50% renewable generation by 2028', 20, 'on_track'),
  ('Suncor Energy', 'RBC', 2500000000, '2023-03-20', 5, ARRAY['emission_intensity', 'water_efficiency'], 'Reduce oil sands emission intensity by 15% by 2027', 30, 'on_track')
) AS v(company, lender, amount_cad, announcement_date, maturity_years, kpi_type, kpi_target, rate_adjustment_bps, current_status)
WHERE NOT EXISTS (SELECT 1 FROM sustainability_linked_loans LIMIT 1);

INSERT INTO carbon_pricing_exposure (company, sector, annual_emissions_mt, current_carbon_price_per_tonne, current_annual_cost_millions, projected_2030_price, projected_2030_cost_millions, revenue_at_risk_percent, mitigation_strategy)
SELECT * FROM (VALUES
  ('Suncor Energy', 'oil_gas', 28.5::numeric, 65::numeric, 1852.5::numeric, 170::numeric, 4845.0::numeric, 8.2::numeric, ARRAY['ccus', 'renewable_power', 'electrification']),
  ('Canadian Natural Resources', 'oil_gas', 32.1, 65, 2086.5, 170, 5457.0, 9.5, ARRAY['ccus', 'methane_reduction']),
  ('Imperial Oil', 'oil_gas', 24.8, 65, 1612.0, 170, 4216.0, 7.8, ARRAY['ccus', 'hydrogen']),
  ('Cenovus Energy', 'oil_gas', 19.2, 65, 1248.0, 170, 3264.0, 6.5, ARRAY['ccus', 'renewable_power'])
) AS v(company, sector, annual_emissions_mt, current_carbon_price_per_tonne, current_annual_cost_millions, projected_2030_price, projected_2030_cost_millions, revenue_at_risk_percent, mitigation_strategy)
WHERE NOT EXISTS (SELECT 1 FROM carbon_pricing_exposure LIMIT 1);

SELECT 'ESG Dashboard policies and seed data applied' AS status;
