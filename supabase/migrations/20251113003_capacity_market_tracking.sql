-- Migration: Capacity Market Tracking (IESO & Future AESO)
-- Created: 2025-11-13
-- Purpose: Track capacity auctions, commitments, availability payments, and market performance
-- Strategic Priority: IESO capacity auctions securing 2+ GW for reliability, Alberta REM transition monitoring
-- Gap Analysis: HIGH PRIORITY - Capacity market transparency (previously 0.5/5.0)

-- ============================================================================
-- CAPACITY MARKET AUCTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS capacity_market_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Market identification
  province_code TEXT NOT NULL CHECK (province_code IN ('ON', 'AB', 'SK', 'BC', 'MB', 'QC', 'NB', 'NS', 'NL')),
  iso_operator TEXT NOT NULL, -- IESO, AESO (future), etc.

  auction_id TEXT NOT NULL, -- Operator-specific auction ID
  auction_name TEXT, -- e.g., "2024 IESO Capacity Auction"
  auction_year INTEGER NOT NULL,

  -- Obligation period
  obligation_period TEXT CHECK (obligation_period IN ('Summer', 'Winter', 'Annual')),
  obligation_start_date DATE NOT NULL,
  obligation_end_date DATE NOT NULL,
  obligation_duration_months INTEGER,

  -- Auction timing
  auction_date DATE NOT NULL,
  qualification_deadline DATE,
  results_announcement_date DATE,

  -- Procurement target
  target_capacity_mw NUMERIC NOT NULL,
  target_capacity_met BOOLEAN,

  -- Auction results
  cleared_capacity_mw NUMERIC,
  clearing_price_cad_per_mw_day NUMERIC, -- $/MW-day
  clearing_price_cad_per_mw_month NUMERIC, -- $/MW-month
  clearing_price_cad_per_kw_year NUMERIC, -- $/kW-year

  -- Zone-specific results (if applicable)
  zone_name TEXT, -- e.g., "Southern Ontario", "Northern Ontario"
  zone_clearing_price_cad_per_mw_day NUMERIC,

  -- Participation
  qualified_capacity_mw NUMERIC, -- Total capacity that qualified to bid
  bid_capacity_mw NUMERIC, -- Total capacity that submitted bids
  offer_count INTEGER, -- Number of offers submitted
  cleared_offer_count INTEGER, -- Number of offers cleared

  -- Resource mix
  cleared_capacity_by_type JSONB, -- {"gas": 800, "hydro": 300, "storage": 500, ...}

  -- Market statistics
  total_auction_value_cad NUMERIC, -- Total availability payments for obligation period
  average_availability_payment_cad NUMERIC,

  -- Comparison to previous auction
  previous_auction_clearing_price_cad_per_mw_day NUMERIC,
  price_change_percent NUMERIC,

  -- Market design parameters
  demand_curve_type TEXT, -- "Downward sloping", "Step function", etc.
  administrative_price_cap_cad_per_mw_day NUMERIC,
  penalty_rate_cad_per_mwh NUMERIC,

  -- Auction status
  status TEXT CHECK (status IN ('Announced', 'Qualification Open', 'Bidding Open', 'Under Evaluation', 'Results Published', 'Cancelled')) DEFAULT 'Announced',

  -- Metadata
  auction_report_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(province_code, auction_year, obligation_period, zone_name)
);

CREATE INDEX idx_capacity_auction_province ON capacity_market_auctions(province_code);
CREATE INDEX idx_capacity_auction_iso ON capacity_market_auctions(iso_operator);
CREATE INDEX idx_capacity_auction_year ON capacity_market_auctions(auction_year);
CREATE INDEX idx_capacity_auction_period ON capacity_market_auctions(obligation_period);
CREATE INDEX idx_capacity_auction_status ON capacity_market_auctions(status);
CREATE INDEX idx_capacity_auction_date ON capacity_market_auctions(auction_date);

COMMENT ON TABLE capacity_market_auctions IS 'Capacity market auction results tracking clearing prices, procured capacity, and market performance';

-- ============================================================================
-- CAPACITY COMMITMENTS (Individual Resources)
-- ============================================================================

CREATE TABLE IF NOT EXISTS capacity_market_commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  auction_id UUID NOT NULL REFERENCES capacity_market_auctions(id) ON DELETE CASCADE,

  -- Resource identification
  facility_name TEXT NOT NULL,
  facility_operator TEXT,
  facility_id TEXT, -- Operator-assigned facility ID

  -- Location
  province_code TEXT NOT NULL,
  location_city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Resource type
  resource_type TEXT CHECK (resource_type IN (
    'Natural Gas - Combined Cycle',
    'Natural Gas - Simple Cycle',
    'Natural Gas - Cogeneration',
    'Hydroelectric',
    'Nuclear',
    'Coal',
    'Battery Storage',
    'Pumped Hydro Storage',
    'Demand Response',
    'Wind',
    'Solar',
    'Biomass',
    'Other'
  )) NOT NULL,

  fuel_type TEXT,
  emissions_intensity_kg_co2_per_mwh NUMERIC,

  -- Capacity commitment
  nameplate_capacity_mw NUMERIC,
  committed_capacity_mw NUMERIC NOT NULL,
  committed_capacity_mwh NUMERIC, -- For storage duration

  -- Auction clearing
  cleared BOOLEAN NOT NULL DEFAULT FALSE,
  offer_price_cad_per_mw_day NUMERIC, -- Bid price
  clearing_price_cad_per_mw_day NUMERIC, -- Auction clearing price (same for all cleared in zone)

  -- Availability payment
  total_availability_payment_cad NUMERIC, -- For entire obligation period
  monthly_availability_payment_cad NUMERIC,

  -- Performance obligations
  must_offer_hours_per_day INTEGER, -- e.g., 5 hours for storage
  must_offer_window_start_time TIME,
  must_offer_window_end_time TIME,

  -- Performance tracking
  availability_percent NUMERIC CHECK (availability_percent BETWEEN 0 AND 100),
  forced_outage_hours NUMERIC,
  planned_outage_hours NUMERIC,
  performance_penalty_cad NUMERIC,

  -- Resource characteristics
  online_date DATE,
  retirement_date DATE,
  refurbishment_planned BOOLEAN DEFAULT FALSE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_capacity_commit_auction ON capacity_market_commitments(auction_id);
CREATE INDEX idx_capacity_commit_facility ON capacity_market_commitments(facility_name);
CREATE INDEX idx_capacity_commit_type ON capacity_market_commitments(resource_type);
CREATE INDEX idx_capacity_commit_cleared ON capacity_market_commitments(cleared);
CREATE INDEX idx_capacity_commit_province ON capacity_market_commitments(province_code);

COMMENT ON TABLE capacity_market_commitments IS 'Individual resource capacity commitments and performance tracking';

-- ============================================================================
-- CAPACITY MARKET PERFORMANCE (Time Series)
-- ============================================================================

CREATE TABLE IF NOT EXISTS capacity_market_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  commitment_id UUID NOT NULL REFERENCES capacity_market_commitments(id) ON DELETE CASCADE,

  -- Performance period
  performance_date DATE NOT NULL,
  performance_hour INTEGER CHECK (performance_hour BETWEEN 0 AND 23),

  -- Availability
  available_capacity_mw NUMERIC NOT NULL,
  committed_capacity_mw NUMERIC NOT NULL,
  availability_percent NUMERIC,

  -- Outages
  outage_type TEXT CHECK (outage_type IN ('None', 'Forced', 'Planned', 'Ambient', 'Testing')),
  outage_capacity_mw NUMERIC,

  -- Performance in energy market
  energy_market_offer_mw NUMERIC,
  energy_market_dispatch_mw NUMERIC,

  -- Penalties/bonuses
  non_performance_penalty_cad NUMERIC,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_capacity_perf_commitment ON capacity_market_performance(commitment_id);
CREATE INDEX idx_capacity_perf_date ON capacity_market_performance(performance_date);
CREATE INDEX idx_capacity_perf_availability ON capacity_market_performance(availability_percent);

COMMENT ON TABLE capacity_market_performance IS 'Time-series tracking of capacity resource availability and performance';

-- ============================================================================
-- CAPACITY MARKET PRICE HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS capacity_market_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  province_code TEXT NOT NULL,
  iso_operator TEXT NOT NULL,

  -- Delivery period
  delivery_year INTEGER NOT NULL,
  delivery_period TEXT CHECK (delivery_period IN ('Summer', 'Winter', 'Annual')),

  -- Historical prices
  auction_year INTEGER NOT NULL,
  clearing_price_cad_per_mw_day NUMERIC NOT NULL,
  cleared_capacity_mw NUMERIC,

  -- Market context
  peak_demand_mw NUMERIC,
  reserve_margin_percent NUMERIC,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(province_code, delivery_year, delivery_period)
);

CREATE INDEX idx_capacity_price_province ON capacity_market_price_history(province_code);
CREATE INDEX idx_capacity_price_year ON capacity_market_price_history(delivery_year);

COMMENT ON TABLE capacity_market_price_history IS 'Historical capacity market clearing prices for trend analysis';

-- ============================================================================
-- SEED DATA: IESO Capacity Auctions (2022-2025)
-- ============================================================================

-- 2022 IESO Capacity Auction
INSERT INTO capacity_market_auctions (
  id, province_code, iso_operator,
  auction_id, auction_name, auction_year,
  obligation_period, obligation_start_date, obligation_end_date, obligation_duration_months,
  auction_date, results_announcement_date,
  target_capacity_mw, cleared_capacity_mw, target_capacity_met,
  clearing_price_cad_per_mw_day, zone_name,
  offer_count, cleared_offer_count,
  status, auction_report_url,
  notes
) VALUES
(
  '990e8400-e29b-41d4-a716-446655440001',
  'ON', 'IESO',
  'CA-2022', '2022 IESO Capacity Auction', 2022,
  'Summer', '2023-05-01', '2023-10-31', 6,
  '2022-12-08', '2022-12-08',
  1600, 1650, TRUE,
  150.00, 'Southern Ontario',
  NULL, NULL,
  'Results Published', 'https://www.ieso.ca/en/Sector-Participants/Market-Operations/Markets-and-Related-Programs/Capacity-Auction',
  'First IESO capacity auction. Secured 1,650 MW for summer 2023.'
),
(
  '990e8400-e29b-41d4-a716-446655440002',
  'ON', 'IESO',
  'CA-2022W', '2022 IESO Capacity Auction - Winter', 2022,
  'Winter', '2023-11-01', '2024-04-30', 6,
  '2022-12-08', '2022-12-08',
  1000, 1050, TRUE,
  75.00, 'Southern Ontario',
  NULL, NULL,
  'Results Published', 'https://www.ieso.ca/en/Sector-Participants/Market-Operations/Markets-and-Related-Programs/Capacity-Auction',
  'Winter 2023-24 obligation period.'
) ON CONFLICT DO NOTHING;

-- 2023 IESO Capacity Auction
INSERT INTO capacity_market_auctions (
  id, province_code, iso_operator,
  auction_id, auction_name, auction_year,
  obligation_period, obligation_start_date, obligation_end_date, obligation_duration_months,
  auction_date, results_announcement_date,
  target_capacity_mw, cleared_capacity_mw, target_capacity_met,
  clearing_price_cad_per_mw_day, zone_name,
  previous_auction_clearing_price_cad_per_mw_day, price_change_percent,
  status, auction_report_url,
  notes
) VALUES
(
  '990e8400-e29b-41d4-a716-446655440003',
  'ON', 'IESO',
  'CA-2023', '2023 Enhanced Capacity Auction', 2023,
  'Summer', '2024-05-01', '2024-10-31', 6,
  '2023-12-15', '2023-12-15',
  1800, 1900, TRUE,
  367.41, 'Southern Ontario',
  150.00, 144.9,
  'Results Published', 'https://www.ieso.ca/en/Sector-Participants/IESO-News/2023/12/IESO-Secures-Resources-Through-Enhanced-2023-Capacity-Auction',
  'Enhanced auction with higher clearing prices reflecting tight supply-demand balance.'
),
(
  '990e8400-e29b-41d4-a716-446655440004',
  'ON', 'IESO',
  'CA-2023W', '2023 Enhanced Capacity Auction - Winter', 2023,
  'Winter', '2024-11-01', '2025-04-30', 6,
  '2023-12-15', '2023-12-15',
  1100, 1200, TRUE,
  146.96, 'Southern Ontario',
  75.00, 95.9,
  'Results Published', 'https://www.ieso.ca/',
  'Winter 2024-25 obligation period. Prices increased due to growing demand.'
) ON CONFLICT DO NOTHING;

-- 2024 IESO Capacity Auction
INSERT INTO capacity_market_auctions (
  id, province_code, iso_operator,
  auction_id, auction_name, auction_year,
  obligation_period, obligation_start_date, obligation_end_date, obligation_duration_months,
  auction_date, results_announcement_date,
  target_capacity_mw, cleared_capacity_mw, target_capacity_met,
  clearing_price_cad_per_mw_day, zone_name,
  previous_auction_clearing_price_cad_per_mw_day, price_change_percent,
  offer_count, cleared_offer_count,
  total_auction_value_cad,
  status, auction_report_url,
  notes
) VALUES
(
  '990e8400-e29b-41d4-a716-446655440005',
  'ON', 'IESO',
  'CA-2024', '2024 IESO Capacity Auction', 2024,
  'Summer', '2025-05-01', '2025-10-31', 6,
  '2024-12-12', '2024-12-12',
  1600, 2122.2, TRUE,
  332.39, 'Southern Ontario',
  367.41, -9.5,
  NULL, NULL,
  1283000000, -- ~$1.28B for 6-month period
  'Results Published', 'https://www.ieso.ca/Sector-Participants/IESO-News/2024/12/IESO-Secures-More-Megawatts-at-Lower-Price-in-2024-Capacity-Auction',
  'Exceeded target by 522 MW. Clearing price decreased 9.5% vs 2023. Total 2,122.2 MW secured.'
),
(
  '990e8400-e29b-41d4-a716-446655440006',
  'ON', 'IESO',
  'CA-2024W', '2024 IESO Capacity Auction - Winter', 2024,
  'Winter', '2025-11-01', '2026-04-30', 6,
  '2024-12-12', '2024-12-12',
  1000, 1523.6, TRUE,
  139.00, 'Southern Ontario',
  146.96, -5.4,
  NULL, NULL,
  387000000, -- ~$387M for 6-month period
  'Results Published', 'https://www.ieso.ca/',
  'Exceeded target by 523.6 MW. Prices decreased 5.4% vs 2023 winter.'
) ON CONFLICT DO NOTHING;

-- 2025 IESO Capacity Auction (Future)
INSERT INTO capacity_market_auctions (
  id, province_code, iso_operator,
  auction_id, auction_name, auction_year,
  obligation_period, obligation_start_date, obligation_end_date, obligation_duration_months,
  auction_date,
  target_capacity_mw,
  status, auction_report_url,
  notes
) VALUES
(
  '990e8400-e29b-41d4-a716-446655440007',
  'ON', 'IESO',
  'CA-2025', '2025 IESO Capacity Auction', 2025,
  'Summer', '2026-05-01', '2026-10-31', 6,
  '2025-12-01',
  1800,
  'Announced', 'https://www.ieso.ca/Sector-Participants/IESO-News/2025/06/2025-Capacity-Auction-Timelines',
  'Target: 1,800 MW for Summer 2026, 1,200 MW for Winter 2026-27.'
),
(
  '990e8400-e29b-41d4-a716-446655440008',
  'ON', 'IESO',
  'CA-2025W', '2025 IESO Capacity Auction - Winter', 2025,
  'Winter', '2026-11-01', '2027-04-30', 6,
  '2025-12-01',
  1200,
  'Announced', 'https://www.ieso.ca/',
  'Winter 2026-27 obligation period. Auction scheduled December 2025.'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- CAPACITY MARKET PRICE HISTORY
-- ============================================================================

INSERT INTO capacity_market_price_history (
  province_code, iso_operator,
  delivery_year, delivery_period,
  auction_year, clearing_price_cad_per_mw_day, cleared_capacity_mw,
  notes
) VALUES
('ON', 'IESO', 2023, 'Summer', 2022, 150.00, 1650, 'First IESO capacity auction'),
('ON', 'IESO', 2023, 'Winter', 2022, 75.00, 1050, NULL),
('ON', 'IESO', 2024, 'Summer', 2023, 367.41, 1900, 'Prices increased 145% due to tight supply'),
('ON', 'IESO', 2024, 'Winter', 2023, 146.96, 1200, NULL),
('ON', 'IESO', 2025, 'Summer', 2024, 332.39, 2122.2, 'Prices decreased 9.5%, supply increased'),
('ON', 'IESO', 2025, 'Winter', 2024, 139.00, 1523.6, 'Prices decreased 5.4%')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

CREATE OR REPLACE VIEW capacity_auction_trends AS
SELECT
  province_code,
  iso_operator,
  auction_year,
  obligation_period,
  target_capacity_mw,
  cleared_capacity_mw,
  clearing_price_cad_per_mw_day,
  ROUND((cleared_capacity_mw::NUMERIC / target_capacity_mw) * 100, 1) as procurement_rate_percent,
  total_auction_value_cad,
  status
FROM capacity_market_auctions
WHERE status = 'Results Published'
ORDER BY auction_year DESC, obligation_period;

COMMENT ON VIEW capacity_auction_trends IS 'Historical capacity auction results for trend analysis';

CREATE OR REPLACE VIEW capacity_resource_mix AS
SELECT
  cm.province_code,
  cm.resource_type,
  COUNT(DISTINCT cm.facility_name) as facility_count,
  SUM(cm.committed_capacity_mw) as total_committed_capacity_mw,
  AVG(cm.availability_percent) as average_availability_percent
FROM capacity_market_commitments cm
WHERE cm.cleared = TRUE
GROUP BY cm.province_code, cm.resource_type
ORDER BY total_committed_capacity_mw DESC;

COMMENT ON VIEW capacity_resource_mix IS 'Summary of cleared capacity by resource type';
