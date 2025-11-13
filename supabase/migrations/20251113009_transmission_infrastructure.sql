-- Transmission Infrastructure Monitoring Tables
-- Tracks transmission lines, substations, congestion, and grid capacity
-- Data sources: TSOs (IESO, AESO, etc.), NERC, NEB/CER

-- =============================================================================
-- 1. TRANSMISSION LINES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS transmission_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_name TEXT NOT NULL,
  line_code TEXT UNIQUE, -- e.g., 'L4C', 'M2B'
  operator TEXT NOT NULL, -- e.g., 'Hydro One', 'ATCO', 'Hydro-Québec'
  province_code CHAR(2) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,

  -- Technical specifications
  voltage_kv INTEGER NOT NULL CHECK (voltage_kv IN (69, 115, 138, 230, 345, 500, 735)),
  line_type TEXT CHECK (line_type IN ('AC', 'DC HVDC')),
  circuit_count INTEGER DEFAULT 1 CHECK (circuit_count >= 1 AND circuit_count <= 4),
  conductor_type TEXT, -- e.g., 'ACSR Drake', 'Bundled conductor'

  -- Capacity ratings
  normal_rating_mva INTEGER, -- Normal thermal limit
  emergency_rating_mva INTEGER, -- Short-term emergency limit
  thermal_limit_mw INTEGER, -- Real power limit

  -- Geographic
  from_substation TEXT NOT NULL,
  to_substation TEXT NOT NULL,
  length_km NUMERIC(8, 2),
  route_geojson JSONB, -- GeoJSON LineString for mapping

  -- Age and condition
  commissioned_year INTEGER CHECK (commissioned_year >= 1900 AND commissioned_year <= 2100),
  last_major_upgrade INTEGER,
  expected_retirement_year INTEGER,
  condition_rating TEXT CHECK (condition_rating IN ('Excellent', 'Good', 'Fair', 'Poor', 'Critical')),

  -- Operational status
  status TEXT DEFAULT 'In Service' CHECK (status IN (
    'In Service', 'Out of Service - Maintenance', 'Out of Service - Outage',
    'Under Construction', 'Planned', 'Decommissioned'
  )),

  -- Criticality
  is_critical_infrastructure BOOLEAN DEFAULT FALSE,
  redundancy_available BOOLEAN DEFAULT TRUE,

  -- Metadata
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transmission_lines_province ON transmission_lines(province_code);
CREATE INDEX idx_transmission_lines_operator ON transmission_lines(operator);
CREATE INDEX idx_transmission_lines_voltage ON transmission_lines(voltage_kv);
CREATE INDEX idx_transmission_lines_status ON transmission_lines(status);

-- =============================================================================
-- 2. SUBSTATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS substations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  substation_name TEXT NOT NULL,
  substation_code TEXT UNIQUE,
  operator TEXT NOT NULL,
  province_code CHAR(2) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,

  -- Type
  substation_type TEXT CHECK (substation_type IN (
    'Transmission', 'Distribution', 'Switching Station', 'Converter Station'
  )),

  -- Voltage levels served
  voltage_levels INTEGER[] NOT NULL, -- e.g., {500, 230, 115}
  transformer_capacity_mva INTEGER,

  -- Geographic
  latitude NUMERIC(10, 6),
  longitude NUMERIC(10, 6),
  nearest_city TEXT,

  -- Operational
  commissioned_year INTEGER,
  status TEXT DEFAULT 'In Service' CHECK (status IN ('In Service', 'Under Construction', 'Planned', 'Decommissioned')),

  -- Equipment counts
  transformer_count INTEGER,
  breaker_count INTEGER,
  capacitor_bank_count INTEGER,

  -- Metadata
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_substations_province ON substations(province_code);
CREATE INDEX idx_substations_operator ON substations(operator);
CREATE INDEX idx_substations_location ON substations USING GIST (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =============================================================================
-- 3. TRANSMISSION CONGESTION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS transmission_congestion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transmission_line_id UUID REFERENCES transmission_lines(id) ON DELETE CASCADE,
  congestion_timestamp TIMESTAMP NOT NULL,
  congestion_date DATE GENERATED ALWAYS AS (congestion_timestamp::DATE) STORED,
  congestion_hour INTEGER CHECK (congestion_hour >= 0 AND congestion_hour <= 23),

  -- Loading metrics
  actual_flow_mw NUMERIC(10, 2) NOT NULL,
  flow_limit_mw NUMERIC(10, 2) NOT NULL,
  utilization_percent NUMERIC(5, 2) GENERATED ALWAYS AS (
    ROUND((actual_flow_mw / NULLIF(flow_limit_mw, 0)) * 100, 2)
  ) STORED,

  -- Congestion flags
  is_congested BOOLEAN GENERATED ALWAYS AS (
    (actual_flow_mw / NULLIF(flow_limit_mw, 0)) >= 0.95
  ) STORED,
  congestion_severity TEXT CHECK (congestion_severity IN ('None', 'Minor', 'Moderate', 'Severe', 'Critical')),

  -- Economic impact
  congestion_cost_cad NUMERIC(10, 2), -- Cost of redispatch or curtailment
  locational_marginal_price_differential_cad_per_mwh NUMERIC(8, 2), -- LMP difference across constraint

  -- Cause
  congestion_cause TEXT CHECK (congestion_cause IN (
    'High Demand', 'Line Outage', 'Generation Pattern', 'Renewable Variability',
    'Import/Export Flow', 'Maintenance', 'Equipment Failure', 'Other'
  )),

  -- Resolution
  mitigation_action TEXT, -- e.g., 'Generator redispatch', 'Load curtailment', 'Topology change'
  duration_minutes INTEGER,

  -- Metadata
  data_source TEXT DEFAULT 'ISO/TSO SCADA',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_congestion_event UNIQUE (transmission_line_id, congestion_timestamp)
);

CREATE INDEX idx_congestion_line ON transmission_congestion(transmission_line_id);
CREATE INDEX idx_congestion_timestamp ON transmission_congestion(congestion_timestamp);
CREATE INDEX idx_congestion_date ON transmission_congestion(congestion_date);
CREATE INDEX idx_congestion_severity ON transmission_congestion(congestion_severity);

-- =============================================================================
-- 4. GRID EXPANSION PROJECTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS grid_expansion_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  project_type TEXT CHECK (project_type IN (
    'New Transmission Line', 'Line Upgrade', 'New Substation', 'Substation Upgrade',
    'HVDC Interconnection', 'Smart Grid Technology', 'Grid Modernization'
  )),
  operator TEXT NOT NULL,
  province_code CHAR(2) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,

  -- Scope
  voltage_kv INTEGER,
  capacity_increase_mw INTEGER,
  line_length_km NUMERIC(8, 2),

  -- Timeline
  announcement_date DATE,
  construction_start_date DATE,
  expected_in_service_date DATE,
  actual_in_service_date DATE,
  project_status TEXT CHECK (project_status IN (
    'Proposed', 'Planning', 'Regulatory Approval', 'Approved',
    'Under Construction', 'In Service', 'Cancelled', 'Deferred'
  )),

  -- Economics
  estimated_capex_cad_millions NUMERIC(10, 2),
  actual_capex_cad_millions NUMERIC(10, 2),

  -- Rationale
  primary_driver TEXT CHECK (primary_driver IN (
    'Demand Growth', 'Renewable Integration', 'Reliability', 'Asset Replacement',
    'Interconnection', 'Congestion Relief', 'Electrification'
  )),
  renewable_capacity_enabled_mw INTEGER, -- How much renewable capacity this enables

  -- Regulatory
  regulator_approval_body TEXT, -- e.g., 'OEB', 'AUC', 'BCUC'
  approval_decision_date DATE,
  environmental_assessment_required BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_grid_expansion_province ON grid_expansion_projects(province_code);
CREATE INDEX idx_grid_expansion_status ON grid_expansion_projects(project_status);
CREATE INDEX idx_grid_expansion_in_service ON grid_expansion_projects(expected_in_service_date);

-- =============================================================================
-- 5. MATERIALIZED VIEW: Transmission Congestion Summary
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS transmission_congestion_summary AS
SELECT
  tl.province_code,
  tl.operator,
  tl.voltage_kv,
  COUNT(*) AS congestion_events,
  AVG(tc.utilization_percent) AS avg_utilization,
  SUM(CASE WHEN tc.is_congested THEN 1 ELSE 0 END) AS congested_hours,
  SUM(tc.congestion_cost_cad) AS total_congestion_cost_cad,
  MAX(tc.congestion_timestamp) AS last_congestion_event
FROM transmission_congestion tc
JOIN transmission_lines tl ON tc.transmission_line_id = tl.id
WHERE tc.congestion_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tl.province_code, tl.operator, tl.voltage_kv
ORDER BY congestion_events DESC;

CREATE INDEX idx_transmission_congestion_summary_province ON transmission_congestion_summary(province_code);

-- =============================================================================
-- SEED DATA
-- =============================================================================

-- Major Transmission Lines (Sample)
INSERT INTO transmission_lines (line_name, line_code, operator, province_code, voltage_kv, line_type, normal_rating_mva, from_substation, to_substation, length_km, commissioned_year, status) VALUES
('Bruce-Milton Line', 'B2M', 'Hydro One', 'ON', 500, 'AC', 3200, 'Bruce TS', 'Milton SS', 220, 2018, 'In Service'),
('Alberta-BC Intertie', 'L1L', 'AESO', 'AB', 500, 'AC', 1200, 'Langdon', 'BC Border', 185, 1985, 'In Service'),
('Nelson River HVDC', 'NR-HVDC', 'Manitoba Hydro', 'MB', 500, 'DC HVDC', 2000, 'Radisson', 'Dorsey', 890, 1977, 'In Service'),
('Hydro-Québec 735kV Backbone', 'HQ735-1', 'Hydro-Québec', 'QC', 735, 'AC', 5000, 'James Bay', 'Montréal', 1100, 1978, 'In Service'),
('Interior-Lower Mainland', 'ILM', 'BC Hydro', 'BC', 500, 'AC', 2800, 'Mica', 'Vancouver', 620, 1982, 'In Service');

-- Substations (Sample)
INSERT INTO substations (substation_name, substation_code, operator, province_code, substation_type, voltage_levels, transformer_capacity_mva, latitude, longitude, commissioned_year, status) VALUES
('Bruce Transmission Station', 'BRUCE-TS', 'Hydro One', 'ON', 'Transmission', ARRAY[500, 230], 6600, 44.3319, -81.5997, 1977, 'In Service'),
('Dorsey Converter Station', 'DORSEY-CS', 'Manitoba Hydro', 'MB', 'Converter Station', ARRAY[500, 230], 2000, 50.0153, -97.0369, 1972, 'In Service'),
('Langdon Substation', 'LANGDON-SS', 'AESO', 'AB', 'Transmission', ARRAY[500, 240], 1500, 50.9753, -113.7545, 1985, 'In Service'),
('Arnaud Substation', 'ARNAUD', 'Hydro-Québec', 'QC', 'Transmission', ARRAY[735, 315], 4500, 45.9517, -73.7489, 1985, 'In Service');

-- Transmission Congestion Events (Sample)
INSERT INTO transmission_congestion (transmission_line_id, congestion_timestamp, congestion_hour, actual_flow_mw, flow_limit_mw, congestion_severity, congestion_cause, congestion_cost_cad)
SELECT
  (SELECT id FROM transmission_lines WHERE line_name = 'Bruce-Milton Line'),
  NOW() - (n || ' hours')::INTERVAL AS congestion_timestamp,
  EXTRACT(HOUR FROM NOW() - (n || ' hours')::INTERVAL)::INTEGER AS congestion_hour,
  2800 + (RANDOM() * 600)::NUMERIC(10,2) AS actual_flow_mw,
  3200 AS flow_limit_mw,
  CASE WHEN RANDOM() > 0.7 THEN 'Moderate' ELSE 'Minor' END AS congestion_severity,
  'High Demand' AS congestion_cause,
  (RANDOM() * 50000)::NUMERIC(10,2) AS congestion_cost_cad
FROM generate_series(0, 23) AS n;

-- Grid Expansion Projects (Sample)
INSERT INTO grid_expansion_projects (project_name, project_type, operator, province_code, voltage_kv, capacity_increase_mw, expected_in_service_date, project_status, estimated_capex_cad_millions, primary_driver) VALUES
('Waasigan Transmission Line', 'New Transmission Line', 'Hydro One', 'ON', 230, 800, '2025-12-31', 'Under Construction', 777, 'Renewable Integration'),
('Eastern Alberta Transmission Line', 'New Transmission Line', 'AESO', 'AB', 240, 600, '2026-06-30', 'Under Construction', 615, 'Renewable Integration'),
('Keeyask Transmission Project', 'New Transmission Line', 'Manitoba Hydro', 'MB', 230, 695, '2024-12-31', 'In Service', 1425, 'Renewable Integration'),
('Lower Churchill Transmission', 'HVDC Interconnection', 'Nalcor Energy', 'NL', 500, 900, '2025-12-31', 'Under Construction', 3200, 'Interconnection');

-- Refresh materialized view
REFRESH MATERIALIZED VIEW transmission_congestion_summary;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE transmission_lines IS 'High-voltage transmission lines with technical specifications and capacity';
COMMENT ON TABLE substations IS 'Transmission and distribution substations with equipment inventory';
COMMENT ON TABLE transmission_congestion IS 'Real-time and historical transmission congestion events and costs';
COMMENT ON TABLE grid_expansion_projects IS 'Planned and under-construction grid infrastructure projects';
COMMENT ON MATERIALIZED VIEW transmission_congestion_summary IS 'Aggregated 30-day congestion summary by province and voltage';
