-- Migration: EV Charging Infrastructure Tracking
-- Created: 2025-11-13
-- Purpose: Track EV charging stations, networks, power consumption, and grid impact
-- Strategic Priority: Federal EV mandate (20% by 2026, 100% by 2035), grid load forecasting, V2G potential
-- Gap Analysis: MEDIUM PRIORITY - EV ecosystem tracking (previously 2.5/5.0)

-- ============================================================================
-- EV CHARGING STATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ev_charging_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT UNIQUE, -- Network-specific ID
  station_name TEXT NOT NULL,

  -- Network/operator
  network TEXT NOT NULL, -- Tesla Supercharger, ChargePoint, Electrify Canada, Flo, Petro-Canada, etc.
  operator TEXT, -- Site operator if different from network
  ownership_type TEXT CHECK (ownership_type IN ('Private Network', 'Public Utility', 'Municipal', 'Private Business', 'Condo/Apartment')),

  -- Location
  address TEXT,
  city TEXT NOT NULL,
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'AB', 'SK', 'BC', 'MB', 'QC', 'NB', 'NS', 'NL', 'PE', 'NT', 'YT', 'NU')),
  postal_code TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,

  -- Site characteristics
  location_type TEXT CHECK (location_type IN ('Highway', 'Urban', 'Suburban', 'Rural', 'Remote')),
  site_type TEXT CHECK (site_type IN ('Public', 'Semi-Public', 'Private', 'Workplace', 'Residential', 'Fleet')),
  access_type TEXT CHECK (access_type IN ('24/7', 'Business Hours', 'Restricted', 'Reservation Required')),

  -- Charging infrastructure
  charger_count INTEGER NOT NULL DEFAULT 1,
  charger_type TEXT CHECK (charger_type IN ('Level 1 (120V)', 'Level 2 (208-240V)', 'DC Fast Charging (DCFC)', 'Tesla Supercharger', 'Ultra-Fast (350kW+)')),

  -- Power specifications
  max_power_kw NUMERIC NOT NULL,
  total_site_capacity_kw NUMERIC, -- Sum of all chargers
  simultaneous_charging_capacity INTEGER, -- How many vehicles can charge at once

  -- Connector types
  connector_types TEXT[], -- Array: ['CCS', 'CHAdeMO', 'Tesla', 'J1772']
  ccs_connector_count INTEGER DEFAULT 0,
  chademo_connector_count INTEGER DEFAULT 0,
  tesla_connector_count INTEGER DEFAULT 0,
  j1772_connector_count INTEGER DEFAULT 0,

  -- Pricing
  pricing_model TEXT CHECK (pricing_model IN ('Free', 'Pay-per-kWh', 'Pay-per-minute', 'Pay-per-session', 'Subscription', 'Mixed')),
  price_per_kwh_cad NUMERIC,
  price_per_minute_cad NUMERIC,
  idle_fee_cad_per_minute NUMERIC,

  -- Grid connection
  grid_connection_type TEXT CHECK (grid_connection_type IN ('Utility Grid', 'Behind-the-Meter', 'Microgrid', 'Off-Grid')),
  distribution_voltage_kv NUMERIC,
  dedicated_transformer BOOLEAN DEFAULT FALSE,
  onsite_solar_kw NUMERIC DEFAULT 0,
  onsite_battery_kwh NUMERIC DEFAULT 0,

  -- V2G capability
  v2g_capable BOOLEAN DEFAULT FALSE,
  bidirectional_charging BOOLEAN DEFAULT FALSE,

  -- Operational status
  status TEXT CHECK (status IN ('Operational', 'Under Construction', 'Planned', 'Temporarily Offline', 'Decommissioned')) DEFAULT 'Operational',
  commissioned_date DATE,
  last_maintenance_date DATE,

  -- Utilization
  average_daily_sessions INTEGER,
  average_utilization_percent NUMERIC CHECK (average_utilization_percent BETWEEN 0 AND 100),
  peak_demand_time_start TIME,
  peak_demand_time_end TIME,

  -- Amenities
  amenities TEXT[], -- ['WiFi', 'Restaurant', 'Restrooms', 'Shopping', 'Covered Parking']
  accessibility_features BOOLEAN DEFAULT FALSE,

  -- Metadata
  nrcan_id TEXT, -- Natural Resources Canada charging station ID
  data_source TEXT DEFAULT 'NRCan',
  last_verified_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ev_station_network ON ev_charging_stations(network);
CREATE INDEX idx_ev_station_province ON ev_charging_stations(province_code);
CREATE INDEX idx_ev_station_city ON ev_charging_stations(city);
CREATE INDEX idx_ev_station_type ON ev_charging_stations(charger_type);
CREATE INDEX idx_ev_station_status ON ev_charging_stations(status);
CREATE INDEX idx_ev_station_location ON ev_charging_stations USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX idx_ev_station_v2g ON ev_charging_stations(v2g_capable) WHERE v2g_capable = TRUE;

COMMENT ON TABLE ev_charging_stations IS 'Registry of EV charging stations with power, pricing, and grid connection specifications';

-- ============================================================================
-- EV CHARGING NETWORKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ev_charging_networks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  network_name TEXT NOT NULL UNIQUE,

  -- Network details
  network_type TEXT CHECK (network_type IN ('National', 'Regional', 'Provincial', 'Municipal', 'Private Fleet')),
  parent_company TEXT,
  headquarters_country TEXT,

  -- Coverage
  provinces_served TEXT[], -- Array of province codes
  station_count_canada INTEGER,
  charger_count_canada INTEGER,

  -- Technology
  proprietary_connector BOOLEAN DEFAULT FALSE,
  open_access BOOLEAN DEFAULT TRUE, -- Non-proprietary access
  roaming_agreements TEXT[], -- Networks with roaming

  -- Membership/payment
  membership_required BOOLEAN DEFAULT FALSE,
  membership_fee_cad_per_month NUMERIC,
  accepts_credit_card BOOLEAN DEFAULT TRUE,
  mobile_app_available BOOLEAN DEFAULT TRUE,

  -- Expansion plans
  expansion_target_stations_2025 INTEGER,
  expansion_target_stations_2030 INTEGER,
  federal_funding_received_cad NUMERIC,

  website_url TEXT,
  mobile_app_url TEXT,
  customer_support_phone TEXT,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ev_network_name ON ev_charging_networks(network_name);
CREATE INDEX idx_ev_network_type ON ev_charging_networks(network_type);

COMMENT ON TABLE ev_charging_networks IS 'Registry of EV charging networks operating in Canada';

-- ============================================================================
-- EV ADOPTION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS ev_adoption_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'AB', 'SK', 'BC', 'MB', 'QC', 'NB', 'NS', 'NL', 'PE', 'NT', 'YT', 'NU', 'CA')),
  tracking_period_start DATE NOT NULL,
  tracking_period_end DATE NOT NULL,

  -- Sales data
  bev_sales INTEGER, -- Battery Electric Vehicles
  phev_sales INTEGER, -- Plug-in Hybrid Electric Vehicles
  total_ev_sales INTEGER NOT NULL,
  total_vehicle_sales INTEGER NOT NULL,
  ev_market_share_percent NUMERIC,

  -- Fleet data
  cumulative_ev_registrations INTEGER,
  ev_percent_of_total_fleet NUMERIC,

  -- Federal mandate tracking
  federal_target_percent NUMERIC, -- 20% by 2026, 60% by 2030, 100% by 2035
  compliance_status TEXT CHECK (compliance_status IN ('On Track', 'At Risk', 'Behind Target', 'Exceeding Target')),

  -- Vehicle types
  passenger_cars_ev INTEGER,
  light_trucks_ev INTEGER,
  medium_duty_ev INTEGER,
  heavy_duty_ev INTEGER,
  buses_ev INTEGER,

  data_source TEXT DEFAULT 'Statistics Canada',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(province_code, tracking_period_start, tracking_period_end)
);

CREATE INDEX idx_ev_adoption_province ON ev_adoption_tracking(province_code);
CREATE INDEX idx_ev_adoption_period ON ev_adoption_tracking(tracking_period_start);

COMMENT ON TABLE ev_adoption_tracking IS 'EV adoption rates and federal mandate compliance tracking';

-- ============================================================================
-- EV CHARGING POWER CONSUMPTION (Time Series)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ev_charging_power_consumption (
  id SERIAL PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES ev_charging_stations(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,

  -- Power metrics
  instantaneous_power_kw NUMERIC NOT NULL,
  total_site_power_kw NUMERIC,
  active_chargers INTEGER,

  -- Grid impact
  grid_import_kw NUMERIC,
  solar_generation_kw NUMERIC DEFAULT 0,
  battery_discharge_kw NUMERIC DEFAULT 0,

  -- V2G metrics (if applicable)
  v2g_discharge_kw NUMERIC DEFAULT 0,

  -- Sessions
  active_sessions INTEGER,
  energy_delivered_kwh NUMERIC,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ev_power_station ON ev_charging_power_consumption(station_id);
CREATE INDEX idx_ev_power_timestamp ON ev_charging_power_consumption(timestamp);

COMMENT ON TABLE ev_charging_power_consumption IS 'Time-series tracking of EV charging station power consumption and grid impact';

-- ============================================================================
-- SEED DATA: Major Charging Networks
-- ============================================================================

INSERT INTO ev_charging_networks (
  id, network_name, network_type, parent_company, headquarters_country,
  provinces_served, station_count_canada,
  proprietary_connector, open_access, membership_required,
  mobile_app_available,
  expansion_target_stations_2025,
  website_url, notes
) VALUES
(
  'aa0e8400-e29b-41d4-a716-446655440001',
  'Tesla Supercharger', 'National', 'Tesla Inc.', 'USA',
  ARRAY['ON', 'AB', 'BC', 'QC', 'SK', 'MB', 'NB', 'NS', 'NL', 'PE'], 209,
  TRUE, FALSE, FALSE,
  TRUE,
  260,
  'https://www.tesla.com/findus?v=2&bounds=', 'Proprietary network opening to non-Tesla EVs. 50+ new sites planned for 2025.'
),
(
  'aa0e8400-e29b-41d4-a716-446655440002',
  'Electrify Canada', 'National', 'Volkswagen Group', 'Germany',
  ARRAY['ON', 'AB', 'BC', 'QC', 'SK', 'NB', 'NS'], 34,
  FALSE, TRUE, FALSE,
  TRUE,
  50,
  'https://www.electrify-canada.ca/', '150kW and 350kW ultra-fast charging. Expanded to 7 provinces by 2025.'
),
(
  'aa0e8400-e29b-41d4-a716-446655440003',
  'FLO', 'National', 'AddÉnergie Technologies', 'Canada',
  ARRAY['ON', 'AB', 'BC', 'QC', 'SK', 'MB', 'NB', 'NS', 'NL', 'PE'], NULL,
  FALSE, TRUE, FALSE,
  TRUE,
  NULL,
  'https://www.flo.ca/', 'Canadian company. Mix of Level 2 and DC fast charging. 215 DCFC and 2,003 Level 2 added in 2024.'
),
(
  'aa0e8400-e29b-41d4-a716-446655440004',
  'ChargePoint', 'National', 'ChargePoint Holdings Inc.', 'USA',
  ARRAY['ON', 'AB', 'BC', 'QC', 'SK', 'MB', 'NB', 'NS', 'NL', 'PE'], NULL,
  FALSE, TRUE, FALSE,
  TRUE,
  NULL,
  'https://www.chargepoint.com/', 'North America''s largest network. 33 DCFC and 1,394 Level 2 ports added in Canada in 2023.'
),
(
  'aa0e8400-e29b-41d4-a716-446655440005',
  'Petro-Canada EV Fast Charge', 'National', 'Suncor Energy', 'Canada',
  ARRAY['ON', 'AB', 'BC', 'QC', 'SK', 'MB'], NULL,
  FALSE, TRUE, FALSE,
  TRUE,
  NULL,
  'https://www.petro-canada.ca/en/personal/fuel/electric-vehicle-charging', 'Petro-Canada retail locations. Coast-to-coast coverage on Trans-Canada Highway.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED DATA: Sample Charging Stations
-- ============================================================================

-- Tesla Supercharger - Calgary
INSERT INTO ev_charging_stations (
  id, station_id, station_name,
  network, ownership_type,
  address, city, province_code, postal_code, latitude, longitude,
  location_type, site_type, access_type,
  charger_count, charger_type, max_power_kw, total_site_capacity_kw,
  connector_types, tesla_connector_count,
  pricing_model, price_per_kwh_cad,
  grid_connection_type,
  v2g_capable, bidirectional_charging,
  status, commissioned_date,
  amenities,
  data_source, notes
) VALUES
(
  'bb0e8400-e29b-41d4-a716-446655440001',
  'TESLA-CALGARY-001', 'Tesla Supercharger - Calgary Chinook',
  'Tesla Supercharger', 'Private Network',
  '6455 Macleod Trail SW', 'Calgary', 'AB', 'T2H 0K8', 51.0355, -114.0780,
  'Urban', 'Public', '24/7',
  12, 'Tesla Supercharger', 250, 3000,
  ARRAY['Tesla'], 12,
  'Pay-per-kWh', 0.52,
  'Utility Grid',
  FALSE, FALSE,
  'Operational', '2020-06-15',
  ARRAY['Shopping', 'Restaurant', 'WiFi'],
  'Tesla', '12 V3 Superchargers (250 kW each). Adjacent to Chinook Centre.'
) ON CONFLICT (id) DO NOTHING;

-- Electrify Canada - Toronto
INSERT INTO ev_charging_stations (
  id, station_id, station_name,
  network, ownership_type,
  city, province_code, latitude, longitude,
  location_type, site_type, access_type,
  charger_count, charger_type, max_power_kw, total_site_capacity_kw,
  connector_types, ccs_connector_count, chademo_connector_count,
  pricing_model, price_per_minute_cad, idle_fee_cad_per_minute,
  grid_connection_type, dedicated_transformer,
  v2g_capable,
  status, commissioned_date,
  data_source, notes
) VALUES
(
  'bb0e8400-e29b-41d4-a716-446655440002',
  'EC-ON-TOR-001', 'Electrify Canada - Toronto Yorkdale',
  'Electrify Canada', 'Private Network',
  'Toronto', 'ON', 43.7255, -79.4527,
  'Urban', 'Public', '24/7',
  8, 'Ultra-Fast (350kW+)', 350, 2800,
  ARRAY['CCS', 'CHAdeMO'], 6, 2,
  'Pay-per-minute', 0.48, 0.40,
  'Utility Grid', TRUE,
  FALSE,
  'Operational', '2021-09-01',
  'Electrify Canada', '6x 350kW CCS and 2x 50kW CHAdeMO chargers. Yorkdale Shopping Centre.'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EV ADOPTION TRACKING SEED DATA
-- ============================================================================

-- Q4 2024 - Ontario
INSERT INTO ev_adoption_tracking (
  province_code, tracking_period_start, tracking_period_end,
  bev_sales, phev_sales, total_ev_sales, total_vehicle_sales,
  ev_market_share_percent, cumulative_ev_registrations,
  federal_target_percent, compliance_status,
  data_source, notes
) VALUES
(
  'ON', '2024-10-01', '2024-12-31',
  12500, 3200, 15700, 95000,
  16.5, 285000,
  20.0, 'At Risk',
  'Statistics Canada, DesRosiers Automotive Consultants',
  'Ontario EV sales Q4 2024. Approaching 20% federal 2026 target but growth needed.'
) ON CONFLICT DO NOTHING;

-- Q4 2024 - Quebec (leading province)
INSERT INTO ev_adoption_tracking (
  province_code, tracking_period_start, tracking_period_end,
  total_ev_sales, total_vehicle_sales,
  ev_market_share_percent, cumulative_ev_registrations,
  federal_target_percent, compliance_status,
  data_source, notes
) VALUES
(
  'QC', '2024-10-01', '2024-12-31',
  22000, 85000,
  25.9, 420000,
  20.0, 'Exceeding Target',
  'Statistics Canada, AVÉQ',
  'Quebec leading Canada in EV adoption. Provincial ZEV mandate driving sales.'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW ev_charging_infrastructure_summary AS
SELECT
  province_code,
  network,
  charger_type,
  COUNT(*) as station_count,
  SUM(charger_count) as total_chargers,
  SUM(total_site_capacity_kw) as total_capacity_kw,
  AVG(max_power_kw) as avg_charger_power_kw,
  SUM(CASE WHEN v2g_capable THEN 1 ELSE 0 END) as v2g_capable_stations
FROM ev_charging_stations
WHERE status = 'Operational'
GROUP BY province_code, network, charger_type
ORDER BY province_code, total_capacity_kw DESC;

COMMENT ON VIEW ev_charging_infrastructure_summary IS 'Summary of EV charging infrastructure by province, network, and charger type';

CREATE OR REPLACE VIEW ev_adoption_progress AS
SELECT
  province_code,
  tracking_period_end,
  ev_market_share_percent,
  federal_target_percent,
  compliance_status,
  cumulative_ev_registrations,
  (federal_target_percent - ev_market_share_percent) as gap_to_target_percent
FROM ev_adoption_tracking
WHERE tracking_period_end >= CURRENT_DATE - INTERVAL '1 year'
ORDER BY tracking_period_end DESC, province_code;

COMMENT ON VIEW ev_adoption_progress IS 'EV adoption progress vs federal mandate targets';
