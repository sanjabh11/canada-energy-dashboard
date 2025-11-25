-- supabase/migrations/20251122_esg_dashboard.sql
-- ESG & Sustainable Finance tables for Sustainable Finance & ESG Dashboard

-- Green Bonds Table
CREATE TABLE IF NOT EXISTS green_bonds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer TEXT NOT NULL,
  issuer_type TEXT CHECK (issuer_type IN ('utility', 'oil_gas', 'renewable_developer', 'government')),
  amount_cad NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'CAD',
  issue_date DATE NOT NULL,
  maturity_date DATE,
  yield_percent NUMERIC(5,2),
  use_of_proceeds TEXT[], -- e.g., ['renewable_energy', 'efficiency', 'clean_transport']
  certification TEXT[], -- e.g., ['climate_bonds_initiative', 'green_bond_principles']
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ESG Ratings Table
CREATE TABLE IF NOT EXISTS esg_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  sector TEXT CHECK (sector IN ('oil_gas', 'utility', 'renewable', 'mining')),
  msci_score TEXT, -- e.g., 'AAA', 'AA', 'A', 'BBB', etc.
  msci_score_numeric NUMERIC(3,1), -- 0-10 scale
  sustainalytics_risk_score NUMERIC(4,1), -- 0-40 (lower is better)
  sp_global_score NUMERIC(3,0), -- 0-100
  cdp_climate_score TEXT, -- A+, A, A-, B, etc.
  rating_date DATE NOT NULL,
  peer_percentile NUMERIC(3,0), -- 0-100
  trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sustainability-Linked Loans Table
CREATE TABLE IF NOT EXISTS sustainability_linked_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  lender TEXT NOT NULL,
  amount_cad NUMERIC(15,2) NOT NULL,
  announcement_date DATE NOT NULL,
  maturity_years INTEGER,
  kpi_type TEXT[], -- e.g., ['renewable_capacity', 'emission_intensity', 'water_efficiency']
  kpi_target TEXT,
  rate_adjustment_bps INTEGER, -- basis points (e.g., 25 bps)
  current_status TEXT CHECK (current_status IN ('on_track', 'at_risk', 'achieved', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Carbon Pricing Exposure Table
CREATE TABLE IF NOT EXISTS carbon_pricing_exposure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  sector TEXT NOT NULL,
  annual_emissions_mt NUMERIC(10,2), -- megatonnes CO2e
  current_carbon_price_per_tonne NUMERIC(6,2), -- CAD
  current_annual_cost_millions NUMERIC(10,2), -- CAD millions
  projected_2030_price NUMERIC(6,2) DEFAULT 170, -- CAD/tonne
  projected_2030_cost_millions NUMERIC(10,2), -- CAD millions
  revenue_at_risk_percent NUMERIC(4,1), -- % of revenue
  mitigation_strategy TEXT[], -- e.g., ['ccus', 'electrification', 'renewable_power']
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE green_bonds ENABLE ROW LEVEL SECURITY;
ALTER TABLE esg_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sustainability_linked_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_pricing_exposure ENABLE ROW LEVEL SECURITY;

-- Public read access (drop first for idempotency, then create)
DROP POLICY IF EXISTS "Allow authenticated read access" ON green_bonds;
DROP POLICY IF EXISTS "Allow authenticated read access" ON esg_ratings;
DROP POLICY IF EXISTS "Allow authenticated read access" ON sustainability_linked_loans;
DROP POLICY IF EXISTS "Allow authenticated read access" ON carbon_pricing_exposure;
DROP POLICY IF EXISTS "Allow anon read access" ON green_bonds;
DROP POLICY IF EXISTS "Allow anon read access" ON esg_ratings;
DROP POLICY IF EXISTS "Allow anon read access" ON sustainability_linked_loans;
DROP POLICY IF EXISTS "Allow anon read access" ON carbon_pricing_exposure;

CREATE POLICY "Allow authenticated read access" ON green_bonds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON esg_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON sustainability_linked_loans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON carbon_pricing_exposure FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow anon read access" ON green_bonds FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read access" ON esg_ratings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read access" ON sustainability_linked_loans FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read access" ON carbon_pricing_exposure FOR SELECT TO anon USING (true);

-- Seed sample data

-- Insert sample green bonds
INSERT INTO green_bonds (issuer, issuer_type, amount_cad, issue_date, maturity_date, yield_percent, use_of_proceeds, certification)
VALUES
  ('TransAlta Corporation', 'utility', 400000000, '2021-06-15', '2031-06-15', 2.85, ARRAY['renewable_energy', 'wind_solar'], ARRAY['green_bond_principles']),
  ('Capital Power Corporation', 'utility', 300000000, '2022-03-10', '2032-03-10', 3.10, ARRAY['renewable_energy', 'battery_storage'], ARRAY['climate_bonds_initiative']),
  ('Enbridge Inc.', 'oil_gas', 750000000, '2021-10-05', '2031-10-05', 2.95, ARRAY['renewable_natural_gas', 'carbon_capture'], ARRAY['green_bond_principles']),
  ('TC Energy', 'oil_gas', 500000000, '2023-01-20', '2033-01-20', 3.25, ARRAY['renewable_energy', 'emission_reduction'], ARRAY['green_bond_principles']),
  ('Hydro-Québec', 'utility', 1000000000, '2020-09-15', '2030-09-15', 2.45, ARRAY['renewable_energy', 'grid_modernization'], ARRAY['climate_bonds_initiative', 'green_bond_principles']);

-- Insert sample ESG ratings
INSERT INTO esg_ratings (company, sector, msci_score, msci_score_numeric, sustainalytics_risk_score, sp_global_score, cdp_climate_score, rating_date, peer_percentile, trend)
VALUES
  ('Suncor Energy', 'oil_gas', 'BB', 4.0, 33.5, 42, 'B', '2024-12-01', 35, 'improving'),
  ('Canadian Natural Resources', 'oil_gas', 'B', 3.5, 36.2, 38, 'C', '2024-12-01', 28, 'stable'),
  ('TransAlta', 'utility', 'A', 6.5, 22.8, 68, 'A-', '2024-12-01', 72, 'improving'),
  ('Capital Power', 'utility', 'BBB', 5.5, 25.5, 62, 'B', '2024-12-01', 58, 'improving'),
  ('Brookfield Renewable', 'renewable', 'AA', 7.5, 18.2, 78, 'A', '2024-12-01', 88, 'stable'),
  ('Teck Resources', 'mining', 'A', 6.0, 24.1, 65, 'A-', '2024-12-01', 65, 'improving');

-- Insert sample sustainability-linked loans
INSERT INTO sustainability_linked_loans (company, lender, amount_cad, announcement_date, maturity_years, kpi_type, kpi_target, rate_adjustment_bps, current_status)
VALUES
  ('TransAlta', 'TD Bank', 1200000000, '2021-06-01', 5, ARRAY['renewable_capacity', 'emission_intensity'], 'Increase renewable capacity to 4 GW by 2025, reduce emission intensity by 40%', 25, 'achieved'),
  ('Capital Power', 'CIBC', 800000000, '2022-09-15', 7, ARRAY['renewable_capacity'], 'Achieve 50% renewable generation by 2028', 20, 'on_track'),
  ('Suncor Energy', 'RBC', 2500000000, '2023-03-20', 5, ARRAY['emission_intensity', 'water_efficiency'], 'Reduce oil sands emission intensity by 15% by 2027', 30, 'on_track');

-- Insert sample carbon pricing exposure
INSERT INTO carbon_pricing_exposure (company, sector, annual_emissions_mt, current_carbon_price_per_tonne, current_annual_cost_millions, projected_2030_price, projected_2030_cost_millions, revenue_at_risk_percent, mitigation_strategy)
VALUES
  ('Suncor Energy', 'oil_gas', 28.5, 65, 1852.5, 170, 4845.0, 8.2, ARRAY['ccus', 'renewable_power', 'electrification']),
  ('Canadian Natural Resources', 'oil_gas', 32.1, 65, 2086.5, 170, 5457.0, 9.5, ARRAY['ccus', 'methane_reduction']),
  ('Imperial Oil', 'oil_gas', 24.8, 65, 1612.0, 170, 4216.0, 7.8, ARRAY['ccus', 'hydrogen']),
  ('Cenovus Energy', 'oil_gas', 19.2, 65, 1248.0, 170, 3264.0, 6.5, ARRAY['ccus', 'renewable_power']);
