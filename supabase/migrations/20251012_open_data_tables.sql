-- Migration: Open Data Tables for Canadian Government Sources
-- Created: 2025-10-12
-- Purpose: Support NRCan minerals, CER compliance, and climate policy data

-- ============================================================================
-- MINERALS DATA (NRCan / StatCan)
-- ============================================================================

-- Mineral production statistics from NRCan/StatCan
CREATE TABLE IF NOT EXISTS mineral_production_stats (
  id SERIAL PRIMARY KEY,
  province TEXT NOT NULL,
  mineral TEXT NOT NULL,
  year INTEGER NOT NULL,
  production_tonnes NUMERIC,
  production_value_cad NUMERIC,
  source TEXT DEFAULT 'NRCan/StatCan',
  last_updated TIMESTAMP DEFAULT NOW(),
  UNIQUE(province, mineral, year)
);

CREATE INDEX idx_mineral_production_province ON mineral_production_stats(province);
CREATE INDEX idx_mineral_production_mineral ON mineral_production_stats(mineral);
CREATE INDEX idx_mineral_production_year ON mineral_production_stats(year DESC);

COMMENT ON TABLE mineral_production_stats IS 'Annual mineral production statistics from Natural Resources Canada and Statistics Canada';

-- ============================================================================
-- CER COMPLIANCE DATA
-- ============================================================================

-- CER compliance and enforcement records
CREATE TABLE IF NOT EXISTS cer_compliance_records (
  id TEXT PRIMARY KEY,
  incident_type TEXT NOT NULL,
  company_name TEXT,
  province TEXT,
  date TIMESTAMP NOT NULL,
  severity TEXT CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  description TEXT,
  status TEXT CHECK (status IN ('Open', 'In Progress', 'Closed', 'Under Review')),
  report_url TEXT,
  source TEXT DEFAULT 'CER',
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cer_compliance_date ON cer_compliance_records(date DESC);
CREATE INDEX idx_cer_compliance_province ON cer_compliance_records(province);
CREATE INDEX idx_cer_compliance_severity ON cer_compliance_records(severity);
CREATE INDEX idx_cer_compliance_status ON cer_compliance_records(status);

COMMENT ON TABLE cer_compliance_records IS 'Canada Energy Regulator compliance and enforcement records from open data';

-- ============================================================================
-- CLIMATE POLICY DATA
-- ============================================================================

-- Canadian climate policies from PRISM and 440Mt tracker
CREATE TABLE IF NOT EXISTS climate_policies (
  id TEXT PRIMARY KEY,
  policy_name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  instrument_type TEXT,
  sector TEXT,
  status TEXT CHECK (status IN ('Proposed', 'Active', 'Expired', 'Repealed', 'Under Review')),
  date_effective DATE,
  date_expired DATE,
  description TEXT,
  source TEXT CHECK (source IN ('PRISM', '440Mt', 'Government', 'Other')),
  source_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_climate_policy_jurisdiction ON climate_policies(jurisdiction);
CREATE INDEX idx_climate_policy_sector ON climate_policies(sector);
CREATE INDEX idx_climate_policy_instrument ON climate_policies(instrument_type);
CREATE INDEX idx_climate_policy_status ON climate_policies(status);
CREATE INDEX idx_climate_policy_effective ON climate_policies(date_effective DESC);

COMMENT ON TABLE climate_policies IS 'Canadian climate policies from PRISM inventory and 440 Megatonnes tracker';

-- ============================================================================
-- API CACHE TABLE (for all open data endpoints)
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_cache (
  cache_key TEXT PRIMARY KEY,
  response_data JSONB NOT NULL,
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);

COMMENT ON TABLE api_cache IS 'Response cache for external API calls to reduce load and improve performance';

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM api_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- ============================================================================

-- Insert sample CER compliance records
INSERT INTO cer_compliance_records (id, incident_type, company_name, province, date, severity, description, status, report_url) VALUES
('cer-2024-001', 'Inspection', 'TransCanada Pipelines', 'AB', '2024-09-15', 'Low', 'Routine inspection - no issues found', 'Closed', 'https://www.cer-rec.gc.ca/en/safety-environment/industry-performance/reports-compliance-enforcement/'),
('cer-2024-002', 'Warning Letter', 'Enbridge Pipelines', 'ON', '2024-08-22', 'Medium', 'Minor procedural non-compliance identified', 'Closed', 'https://www.cer-rec.gc.ca/en/safety-environment/industry-performance/reports-compliance-enforcement/'),
('cer-2024-003', 'Inspection Officer Order', 'TC Energy', 'AB', '2024-07-10', 'High', 'Safety system deficiency requiring immediate action', 'Closed', 'https://www.cer-rec.gc.ca/en/safety-environment/industry-performance/reports-compliance-enforcement/')
ON CONFLICT (id) DO NOTHING;

-- Insert sample climate policies
INSERT INTO climate_policies (id, policy_name, jurisdiction, instrument_type, sector, status, date_effective, description, source, source_url) VALUES
('policy-fed-001', 'Federal Carbon Pricing', 'Federal', 'Carbon Tax', 'All Sectors', 'Active', '2019-01-01', 'Federal carbon pricing backstop for provinces without equivalent systems', 'PRISM', 'https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP3/SFYABX'),
('policy-fed-002', 'Clean Fuel Regulations', 'Federal', 'Regulatory', 'Transportation', 'Active', '2022-12-01', 'Regulations to reduce carbon intensity of liquid fossil fuels', '440Mt', 'https://440megatonnes.ca/policy-tracker/'),
('policy-on-001', 'Ontario Emissions Performance Standards', 'Ontario', 'Cap and Trade', 'Industry', 'Active', '2022-01-01', 'Output-based pricing system for large industrial emitters', 'PRISM', 'https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP3/SFYABX'),
('policy-ab-001', 'Technology Innovation and Emissions Reduction', 'Alberta', 'Regulatory', 'Industry', 'Active', '2020-01-01', 'TIER system replacing carbon levy for large emitters', 'PRISM', 'https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP3/SFYABX'),
('policy-bc-001', 'BC Carbon Tax', 'British Columbia', 'Carbon Tax', 'All Sectors', 'Active', '2008-07-01', 'Revenue-neutral carbon tax on fossil fuels', 'PRISM', 'https://borealisdata.ca/dataset.xhtml?persistentId=doi:10.5683/SP3/SFYABX')
ON CONFLICT (id) DO NOTHING;

-- Insert sample mineral production stats
INSERT INTO mineral_production_stats (province, mineral, year, production_tonnes, production_value_cad) VALUES
('ON', 'Nickel', 2023, 85000, 1250000000),
('ON', 'Copper', 2023, 42000, 890000000),
('QC', 'Lithium', 2023, 12000, 450000000),
('AB', 'Coal', 2023, 15000000, 2100000000),
('BC', 'Copper', 2023, 125000, 2800000000)
ON CONFLICT (province, mineral, year) DO NOTHING;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON mineral_production_stats TO anon, authenticated;
GRANT SELECT ON cer_compliance_records TO anon, authenticated;
GRANT SELECT ON climate_policies TO anon, authenticated;
GRANT SELECT ON api_cache TO anon, authenticated;
