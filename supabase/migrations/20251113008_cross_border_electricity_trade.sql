-- Cross-Border Electricity Trade Tables
-- Tracks electricity imports/exports between Canada and USA
-- Data sources: Statistics Canada, NEB/CER, EIA, NERC

-- =============================================================================
-- 1. INTERCONNECTION POINTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS interconnection_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interconnection_name TEXT NOT NULL UNIQUE,
  canadian_province CHAR(2) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,
  us_state CHAR(2) NOT NULL, -- US state code
  us_utility TEXT, -- e.g., 'New York Power Authority', 'Bonneville Power Admin'

  -- Technical specifications
  voltage_kv INTEGER, -- Transmission line voltage
  capacity_mw INTEGER NOT NULL, -- Maximum transfer capability
  interconnection_type TEXT CHECK (interconnection_type IN ('AC', 'DC', 'Back-to-back')),

  -- Geographic
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  nearest_city_ca TEXT,
  nearest_city_us TEXT,

  -- Operational
  commissioned_year INTEGER,
  operator_ca TEXT, -- Canadian operator (e.g., 'Hydro-Québec', 'Manitoba Hydro')
  operator_us TEXT,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Under Construction', 'Decommissioned')),

  -- Metadata
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interconnection_province ON interconnection_points(canadian_province);
CREATE INDEX idx_interconnection_state ON interconnection_points(us_state);

-- =============================================================================
-- 2. CROSS-BORDER TRADE FLOWS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS cross_border_electricity_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interconnection_id UUID REFERENCES interconnection_points(id) ON DELETE CASCADE,
  flow_timestamp TIMESTAMP NOT NULL,
  flow_date DATE GENERATED ALWAYS AS (flow_timestamp::DATE) STORED,
  flow_hour INTEGER CHECK (flow_hour >= 0 AND flow_hour <= 23),

  -- Flow data (positive = export to US, negative = import from US)
  net_flow_mw NUMERIC(10, 2) NOT NULL, -- Positive = export, negative = import
  export_mw NUMERIC(10, 2) CHECK (export_mw >= 0),
  import_mw NUMERIC(10, 2) CHECK (import_mw >= 0),

  -- Energy volumes
  energy_mwh NUMERIC(12, 2), -- For hourly or daily aggregates

  -- Pricing (if available)
  canadian_price_cad_per_mwh NUMERIC(10, 2),
  us_price_usd_per_mwh NUMERIC(10, 2),
  price_differential_cad_per_mwh NUMERIC(10, 2), -- Can indicate arbitrage opportunities

  -- Metadata
  data_source TEXT DEFAULT 'Statistics Canada Table 25-10-0016-01',
  data_quality TEXT CHECK (data_quality IN ('Actual', 'Estimated', 'Preliminary')),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_flow_timestamp UNIQUE (interconnection_id, flow_timestamp)
);

CREATE INDEX idx_flows_interconnection ON cross_border_electricity_flows(interconnection_id);
CREATE INDEX idx_flows_timestamp ON cross_border_electricity_flows(flow_timestamp);
CREATE INDEX idx_flows_date ON cross_border_electricity_flows(flow_date);

-- =============================================================================
-- 3. PROVINCIAL TRADE SUMMARY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS provincial_trade_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code CHAR(2) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,
  reporting_year INTEGER NOT NULL CHECK (reporting_year >= 2000),
  reporting_month INTEGER CHECK (reporting_month >= 1 AND reporting_month <= 12),

  -- Trade volumes (GWh)
  total_exports_gwh NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_imports_gwh NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_exports_gwh NUMERIC(12, 2) GENERATED ALWAYS AS (total_exports_gwh - total_imports_gwh) STORED,

  -- Destinations/Sources
  exports_to_us_gwh NUMERIC(12, 2),
  imports_from_us_gwh NUMERIC(12, 2),
  interprovincial_exports_gwh NUMERIC(12, 2),
  interprovincial_imports_gwh NUMERIC(12, 2),

  -- Economic value (CAD millions)
  export_revenue_cad_millions NUMERIC(10, 2),
  import_cost_cad_millions NUMERIC(10, 2),
  net_trade_balance_cad_millions NUMERIC(10, 2),
  avg_export_price_cad_per_mwh NUMERIC(8, 2),
  avg_import_price_cad_per_mwh NUMERIC(8, 2),

  -- Trade dependency metrics
  exports_as_percent_of_generation NUMERIC(5, 2), -- % of provincial generation exported
  imports_as_percent_of_demand NUMERIC(5, 2), -- % of provincial demand imported

  -- Metadata
  data_source TEXT DEFAULT 'Statistics Canada, NEB/CER',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_provincial_trade UNIQUE (province_code, reporting_year, reporting_month)
);

CREATE INDEX idx_provincial_trade_province ON provincial_trade_summary(province_code);
CREATE INDEX idx_provincial_trade_year ON provincial_trade_summary(reporting_year);

-- =============================================================================
-- 4. TRADE AGREEMENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS electricity_trade_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_name TEXT NOT NULL UNIQUE,
  parties TEXT[] NOT NULL, -- e.g., ['BC', 'WA', 'CA'], ['QC', 'NY', 'VT']
  agreement_type TEXT CHECK (agreement_type IN (
    'Bilateral Contract', 'Interconnection Agreement', 'Regional Market', 'Emergency Support'
  )),

  -- Contract terms
  start_date DATE NOT NULL,
  end_date DATE,
  contract_capacity_mw INTEGER,
  firm_energy_gwh_per_year NUMERIC(10, 2), -- Firm energy commitment

  -- Pricing
  pricing_mechanism TEXT, -- e.g., 'Fixed price', 'Market-based', 'Cost-plus'
  contract_price_cad_per_mwh NUMERIC(8, 2),

  -- Reliability
  emergency_support BOOLEAN DEFAULT FALSE,
  reserve_sharing BOOLEAN DEFAULT FALSE,

  -- Metadata
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Renegotiating', 'Cancelled')),
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trade_agreements_status ON electricity_trade_agreements(status);

-- =============================================================================
-- 5. MATERIALIZED VIEW: Cross-Border Trade Summary
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS cross_border_trade_summary AS
SELECT
  p.code AS province_code,
  p.name AS province_name,
  pts.reporting_year,
  pts.total_exports_gwh,
  pts.total_imports_gwh,
  pts.net_exports_gwh,
  pts.exports_to_us_gwh,
  pts.imports_from_us_gwh,
  pts.export_revenue_cad_millions,
  pts.import_cost_cad_millions,
  pts.net_trade_balance_cad_millions,
  pts.exports_as_percent_of_generation,
  pts.imports_as_percent_of_demand,
  COUNT(DISTINCT ip.id) AS interconnection_count
FROM provincial_trade_summary pts
JOIN provinces p ON pts.province_code = p.code
LEFT JOIN interconnection_points ip ON pts.province_code = ip.canadian_province
WHERE pts.reporting_month IS NULL -- Annual data only
GROUP BY p.code, p.name, pts.reporting_year, pts.total_exports_gwh, pts.total_imports_gwh,
         pts.net_exports_gwh, pts.exports_to_us_gwh, pts.imports_from_us_gwh,
         pts.export_revenue_cad_millions, pts.import_cost_cad_millions,
         pts.net_trade_balance_cad_millions, pts.exports_as_percent_of_generation,
         pts.imports_as_percent_of_demand
ORDER BY pts.reporting_year DESC, pts.net_exports_gwh DESC;

CREATE UNIQUE INDEX idx_cross_border_trade_summary ON cross_border_trade_summary(province_code, reporting_year);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Major Interconnection Points
INSERT INTO interconnection_points (interconnection_name, canadian_province, us_state, capacity_mw, voltage_kv, interconnection_type, operator_ca, operator_us, commissioned_year) VALUES
('BC-Washington Intertie', 'BC', 'WA', 3150, 500, 'AC', 'BC Hydro', 'Bonneville Power Administration', 1977),
('Quebec-New York Interconnection', 'QC', 'NY', 1000, 765, 'AC', 'Hydro-Québec', 'New York Power Authority', 1984),
('Manitoba-Minnesota Tie', 'MB', 'MN', 500, 230, 'AC', 'Manitoba Hydro', 'MISO', 1970),
('Saskatchewan-North Dakota Tie', 'SK', 'ND', 150, 230, 'AC', 'SaskPower', 'Basin Electric', 1978),
('Ontario-Michigan Interconnection', 'ON', 'MI', 2000, 230, 'AC', 'IESO/Hydro One', 'MISO', 1965),
('New Brunswick-Maine Tie', 'NB', 'ME', 700, 345, 'AC', 'NB Power', 'ISO New England', 1980),
('Quebec-Vermont HVDC', 'QC', 'VT', 225, 450, 'DC', 'Hydro-Québec', 'Vermont Electric Power Company', 1986);

-- Provincial Trade Summary (2023 data)
INSERT INTO provincial_trade_summary (province_code, reporting_year, total_exports_gwh, total_imports_gwh, exports_to_us_gwh, export_revenue_cad_millions, avg_export_price_cad_per_mwh, exports_as_percent_of_generation) VALUES
('QC', 2023, 34000, 1200, 32000, 1360, 40, 17.4),
('MB', 2023, 12000, 800, 11500, 460, 38, 33.3),
('BC', 2023, 9500, 3200, 9000, 450, 47, 12.6),
('ON', 2023, 2500, 5800, 2200, 110, 44, -2.1),
('NB', 2023, 3500, 2100, 2800, 140, 40, 16.3),
('SK', 2023, 1800, 400, 1600, 72, 40, 6.8);

-- Trade Agreements (Sample)
INSERT INTO electricity_trade_agreements (agreement_name, parties, agreement_type, start_date, end_date, contract_capacity_mw, firm_energy_gwh_per_year, pricing_mechanism, status) VALUES
('BC Hydro - BPA Capacity/Energy Exchange', ARRAY['BC', 'WA'], 'Bilateral Contract', '2013-10-01', '2033-09-30', 1100, 4380, 'Market-based', 'Active'),
('Hydro-Québec - NYPA Long-term Contract', ARRAY['QC', 'NY'], 'Bilateral Contract', '2023-01-01', '2043-12-31', 1250, 10950, 'Fixed price', 'Active'),
('Manitoba Hydro - MISO Export', ARRAY['MB', 'MN', 'WI'], 'Regional Market', '2015-04-01', NULL, 500, 3500, 'Market-based', 'Active'),
('NB Power - ISO-NE Market Participation', ARRAY['NB', 'ME', 'MA'], 'Regional Market', '2018-01-01', NULL, 700, 2500, 'Market-based', 'Active');

-- Sample hourly flows (last 24 hours for one interconnection)
INSERT INTO cross_border_electricity_flows (interconnection_id, flow_timestamp, flow_hour, net_flow_mw, export_mw, import_mw, energy_mwh, data_quality)
SELECT
  (SELECT id FROM interconnection_points WHERE interconnection_name = 'Quebec-New York Interconnection'),
  NOW() - (n || ' hours')::INTERVAL AS flow_timestamp,
  EXTRACT(HOUR FROM NOW() - (n || ' hours')::INTERVAL)::INTEGER AS flow_hour,
  800 + (RANDOM() * 400 - 200)::NUMERIC(10,2) AS net_flow_mw,
  GREATEST(0, 800 + (RANDOM() * 400 - 200))::NUMERIC(10,2) AS export_mw,
  0 AS import_mw,
  (800 + (RANDOM() * 400 - 200))::NUMERIC(12,2) AS energy_mwh,
  'Actual' AS data_quality
FROM generate_series(0, 23) AS n;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW cross_border_trade_summary;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE interconnection_points IS 'Physical interconnection points between Canadian provinces and US states';
COMMENT ON TABLE cross_border_electricity_flows IS 'Real-time and historical electricity flows across Canada-US border';
COMMENT ON TABLE provincial_trade_summary IS 'Aggregated provincial electricity import/export summary';
COMMENT ON TABLE electricity_trade_agreements IS 'Long-term electricity trade agreements between jurisdictions';
COMMENT ON MATERIALIZED VIEW cross_border_trade_summary IS 'Annual cross-border trade summary with interconnection counts';
