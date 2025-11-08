-- Migration: Fix Price Volatility Data
-- Created: 2025-11-08
-- Purpose: Add sufficient price data points for meaningful volatility calculation
-- Issue: Original migration only created 1 price point per mineral, causing zero volatility

-- Delete existing sample price data to avoid conflicts
DELETE FROM minerals_prices WHERE data_source IN ('Benchmark Minerals', 'London Metal Exchange');

-- Lithium prices (12 months with realistic volatility)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, exchange, data_source)
SELECT
  'Lithium',
  (NOW()::date - interval '1 month' * series_month)::timestamp,
  CASE
    WHEN series_month = 0 THEN 22000  -- Current month
    WHEN series_month = 1 THEN 21500
    WHEN series_month = 2 THEN 19800
    WHEN series_month = 3 THEN 18200
    WHEN series_month = 4 THEN 17500
    WHEN series_month = 5 THEN 16800
    WHEN series_month = 6 THEN 15900
    WHEN series_month = 7 THEN 14500
    WHEN series_month = 8 THEN 13800
    WHEN series_month = 9 THEN 15200
    WHEN series_month = 10 THEN 16500
    WHEN series_month = 11 THEN 18000
  END,
  'Battery Grade Lithium Carbonate',
  'Battery Grade (99.5% min)',
  'Spot Market',
  'Benchmark Minerals'
FROM generate_series(0, 11) AS series_month
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Cobalt prices (12 months with moderate volatility)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
SELECT
  'Cobalt',
  (NOW()::date - interval '1 month' * series_month)::timestamp,
  CASE
    WHEN series_month = 0 THEN 35000  -- Current month
    WHEN series_month = 1 THEN 34200
    WHEN series_month = 2 THEN 33500
    WHEN series_month = 3 THEN 32800
    WHEN series_month = 4 THEN 31900
    WHEN series_month = 5 THEN 30500
    WHEN series_month = 6 THEN 29800
    WHEN series_month = 7 THEN 30200
    WHEN series_month = 8 THEN 31500
    WHEN series_month = 9 THEN 32800
    WHEN series_month = 10 THEN 33600
    WHEN series_month = 11 THEN 34500
  END,
  'Standard Grade',
  'Min 99.8%',
  'London Metal Exchange'
FROM generate_series(0, 11) AS series_month
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Nickel prices (12 months with lower volatility)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
SELECT
  'Nickel',
  (NOW()::date - interval '1 month' * series_month)::timestamp,
  CASE
    WHEN series_month = 0 THEN 19500  -- Current month
    WHEN series_month = 1 THEN 19200
    WHEN series_month = 2 THEN 18800
    WHEN series_month = 3 THEN 18500
    WHEN series_month = 4 THEN 18200
    WHEN series_month = 5 THEN 17900
    WHEN series_month = 6 THEN 17600
    WHEN series_month = 7 THEN 17800
    WHEN series_month = 8 THEN 18100
    WHEN series_month = 9 THEN 18400
    WHEN series_month = 10 THEN 18700
    WHEN series_month = 11 THEN 19000
  END,
  'LME Nickel',
  'Class 1',
  'London Metal Exchange'
FROM generate_series(0, 11) AS series_month
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Graphite prices (12 months with high volatility)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
SELECT
  'Graphite',
  (NOW()::date - interval '1 month' * series_month)::timestamp,
  CASE
    WHEN series_month = 0 THEN 3200   -- Current month
    WHEN series_month = 1 THEN 2900
    WHEN series_month = 2 THEN 2500
    WHEN series_month = 3 THEN 2800
    WHEN series_month = 4 THEN 3400
    WHEN series_month = 5 THEN 3100
    WHEN series_month = 6 THEN 2700
    WHEN series_month = 7 THEN 2400
    WHEN series_month = 8 THEN 2900
    WHEN series_month = 9 THEN 3300
    WHEN series_month = 10 THEN 3000
    WHEN series_month = 11 THEN 2800
  END,
  'Natural Flake',
  '94-97% Carbon',
  'London Metal Exchange'
FROM generate_series(0, 11) AS series_month
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Copper prices (12 months with moderate volatility)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
SELECT
  'Copper',
  (NOW()::date - interval '1 month' * series_month)::timestamp,
  CASE
    WHEN series_month = 0 THEN 9500   -- Current month
    WHEN series_month = 1 THEN 9300
    WHEN series_month = 2 THEN 9100
    WHEN series_month = 3 THEN 8900
    WHEN series_month = 4 THEN 8700
    WHEN series_month = 5 THEN 8500
    WHEN series_month = 6 THEN 8600
    WHEN series_month = 7 THEN 8800
    WHEN series_month = 8 THEN 9000
    WHEN series_month = 9 THEN 9200
    WHEN series_month = 10 THEN 9400
    WHEN series_month = 11 THEN 9600
  END,
  'Grade A Copper',
  '99.99% Pure',
  'London Metal Exchange'
FROM generate_series(0, 11) AS series_month
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Rare Earth Elements prices (12 months with very high volatility)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
SELECT
  'Rare Earth Elements',
  (NOW()::date - interval '1 month' * series_month)::timestamp,
  CASE
    WHEN series_month = 0 THEN 52000  -- Current month
    WHEN series_month = 1 THEN 48000
    WHEN series_month = 2 THEN 42000
    WHEN series_month = 3 THEN 38000
    WHEN series_month = 4 THEN 45000
    WHEN series_month = 5 THEN 50000
    WHEN series_month = 6 THEN 46000
    WHEN series_month = 7 THEN 40000
    WHEN series_month = 8 THEN 43000
    WHEN series_month = 9 THEN 47000
    WHEN series_month = 10 THEN 51000
    WHEN series_month = 11 THEN 49000
  END,
  'Mixed REE Oxides',
  'Heavy REEs',
  'Asian Metal Exchange'
FROM generate_series(0, 11) AS series_month
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Verify data was inserted
DO $$
DECLARE
  lithium_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO lithium_count FROM minerals_prices WHERE mineral = 'Lithium';
  SELECT COUNT(*) INTO total_count FROM minerals_prices;
  RAISE NOTICE 'Inserted price data: Lithium = %, Total = %', lithium_count, total_count;
END $$;

-- Calculate expected volatility for verification
SELECT
  mineral,
  COUNT(*) as data_points,
  ROUND(AVG(price_usd_per_tonne)::numeric, 0) as avg_price,
  ROUND(STDDEV(price_usd_per_tonne)::numeric, 0) as std_dev,
  ROUND((STDDEV(price_usd_per_tonne) / AVG(price_usd_per_tonne) * 100)::numeric, 1) as volatility_pct
FROM minerals_prices
GROUP BY mineral
ORDER BY volatility_pct DESC;
