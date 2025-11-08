-- Migration: Alberta Grid Prices Table
-- Created: 2025-11-08
-- Purpose: Store real-time AESO pool prices for Alberta electricity market
-- Source: AESO Pool Price Reports (http://ets.aeso.ca)

-- ============================================================================
-- ALBERTA GRID PRICES (AESO Pool Price)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alberta_grid_prices (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,

  -- AESO Pool Price (real-time market clearing price)
  pool_price_cad_per_mwh NUMERIC NOT NULL,
  forecast_price_cad_per_mwh NUMERIC,

  -- Price components (if available from AESO)
  energy_price_cad_per_mwh NUMERIC,
  ancillary_services_price_cad_per_mwh NUMERIC,

  -- Volume and demand context
  market_demand_mw NUMERIC,

  -- Data quality
  data_source TEXT DEFAULT 'AESO Real-Time',
  data_quality TEXT CHECK (data_quality IN ('Real-time', 'Forecast', 'Backfilled', 'Estimated')),

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(timestamp)
);

CREATE INDEX idx_alberta_prices_timestamp ON alberta_grid_prices(timestamp DESC);
CREATE INDEX idx_alberta_prices_pool_price ON alberta_grid_prices(pool_price_cad_per_mwh);

COMMENT ON TABLE alberta_grid_prices IS 'AESO real-time pool prices for Alberta electricity market';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON alberta_grid_prices TO anon, authenticated;

-- ============================================================================
-- SAMPLE DATA (for testing, will be replaced by real-time data)
-- ============================================================================

-- Insert last 24 hours of sample pool prices
INSERT INTO alberta_grid_prices (timestamp, pool_price_cad_per_mwh, forecast_price_cad_per_mwh, market_demand_mw, data_source, data_quality)
SELECT
  NOW() - (interval '1 hour' * generate_series(0, 23)),
  45 + (random() * 30 - 15) + 10 * sin(generate_series(0, 23) * 2 * pi() / 24), -- Price variation $30-$60/MWh with daily cycle
  45 + (random() * 30 - 15) + 10 * sin((generate_series(0, 23) + 1) * 2 * pi() / 24), -- Forecast slightly ahead
  9000 + (random() * 2000 - 1000) + 1500 * sin(generate_series(0, 23) * 2 * pi() / 24), -- Demand 8000-11000 MW
  'Sample Data',
  'Backfilled'
FROM generate_series(1, 1)
ON CONFLICT (timestamp) DO NOTHING;

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================

-- Get current AESO pool price
CREATE OR REPLACE FUNCTION get_current_aeso_pool_price()
RETURNS NUMERIC AS $$
DECLARE
  current_price NUMERIC;
BEGIN
  SELECT pool_price_cad_per_mwh INTO current_price
  FROM alberta_grid_prices
  WHERE data_source = 'AESO Real-Time'
  ORDER BY timestamp DESC
  LIMIT 1;

  RETURN COALESCE(current_price, 50.0); -- Default $50/MWh if no data
END;
$$ LANGUAGE plpgsql;

-- Get average pool price for last N hours
CREATE OR REPLACE FUNCTION get_aeso_average_price(hours INT DEFAULT 24)
RETURNS NUMERIC AS $$
DECLARE
  avg_price NUMERIC;
BEGIN
  SELECT AVG(pool_price_cad_per_mwh) INTO avg_price
  FROM alberta_grid_prices
  WHERE timestamp >= NOW() - (hours || ' hours')::interval
  AND data_source = 'AESO Real-Time';

  RETURN COALESCE(avg_price, 50.0);
END;
$$ LANGUAGE plpgsql;
