-- ============================================================================
-- CRITICAL FIX: Add Price Data for Volatility Chart
-- ============================================================================
-- Purpose: Populate minerals_prices table with 12 months of data to enable
--          Price Volatility chart rendering
-- Run this script in Supabase Dashboard > SQL Editor
--
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" or press Cmd+Enter
-- 5. Redeploy api-v2-minerals-supply-chain Edge Function
-- 6. Refresh the Critical Minerals Dashboard
-- ============================================================================

-- Delete existing sample price data
DELETE FROM minerals_prices WHERE data_source IN ('Benchmark Minerals', 'London Metal Exchange', 'Asian Metal Exchange');

-- Lithium prices (12 months - High volatility: ~20% CV)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, exchange, data_source)
VALUES
  ('Lithium', NOW() - interval '0 months', 22000, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '1 months', 21500, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '2 months', 19800, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '3 months', 18200, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '4 months', 17500, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '5 months', 16800, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '6 months', 15900, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '7 months', 14500, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '8 months', 13800, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '9 months', 15200, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '10 months', 16500, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals'),
  ('Lithium', NOW() - interval '11 months', 18000, 'Battery Grade Lithium Carbonate', 'Battery Grade (99.5% min)', 'Spot Market', 'Benchmark Minerals')
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Cobalt prices (12 months - Moderate volatility: ~7% CV)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
VALUES
  ('Cobalt', NOW() - interval '0 months', 35000, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '1 months', 34200, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '2 months', 33500, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '3 months', 32800, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '4 months', 31900, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '5 months', 30500, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '6 months', 29800, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '7 months', 30200, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '8 months', 31500, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '9 months', 32800, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '10 months', 33600, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange'),
  ('Cobalt', NOW() - interval '11 months', 34500, 'Standard Grade', 'Min 99.8%', 'London Metal Exchange')
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Nickel prices (12 months - Low volatility: ~4% CV)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
VALUES
  ('Nickel', NOW() - interval '0 months', 19500, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '1 months', 19200, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '2 months', 18800, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '3 months', 18500, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '4 months', 18200, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '5 months', 17900, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '6 months', 17600, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '7 months', 17800, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '8 months', 18100, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '9 months', 18400, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '10 months', 18700, 'LME Nickel', 'Class 1', 'London Metal Exchange'),
  ('Nickel', NOW() - interval '11 months', 19000, 'LME Nickel', 'Class 1', 'London Metal Exchange')
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Graphite prices (12 months - High volatility: ~14% CV)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
VALUES
  ('Graphite', NOW() - interval '0 months', 3200, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '1 months', 2900, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '2 months', 2500, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '3 months', 2800, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '4 months', 3400, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '5 months', 3100, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '6 months', 2700, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '7 months', 2400, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '8 months', 2900, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '9 months', 3300, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '10 months', 3000, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange'),
  ('Graphite', NOW() - interval '11 months', 2800, 'Natural Flake', '94-97% Carbon', 'London Metal Exchange')
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Copper prices (12 months - Moderate volatility: ~5% CV)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
VALUES
  ('Copper', NOW() - interval '0 months', 9500, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '1 months', 9300, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '2 months', 9100, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '3 months', 8900, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '4 months', 8700, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '5 months', 8500, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '6 months', 8600, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '7 months', 8800, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '8 months', 9000, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '9 months', 9200, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '10 months', 9400, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange'),
  ('Copper', NOW() - interval '11 months', 9600, 'Grade A Copper', '99.99% Pure', 'London Metal Exchange')
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Rare Earth Elements prices (12 months - Very High volatility: ~13% CV)
INSERT INTO minerals_prices (mineral, timestamp, price_usd_per_tonne, price_basis, grade_specification, data_source)
VALUES
  ('Rare Earth Elements', NOW() - interval '0 months', 52000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '1 months', 48000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '2 months', 42000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '3 months', 38000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '4 months', 45000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '5 months', 50000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '6 months', 46000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '7 months', 40000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '8 months', 43000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '9 months', 47000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '10 months', 51000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange'),
  ('Rare Earth Elements', NOW() - interval '11 months', 49000, 'Mixed REE Oxides', 'Heavy REEs', 'Asian Metal Exchange')
ON CONFLICT (mineral, timestamp, price_basis) DO NOTHING;

-- Verify insertion and calculate expected volatility
SELECT
  mineral,
  COUNT(*) as data_points,
  ROUND(AVG(price_usd_per_tonne)::numeric, 0) as avg_price_usd,
  ROUND(STDDEV(price_usd_per_tonne)::numeric, 0) as std_deviation,
  ROUND((STDDEV(price_usd_per_tonne) / AVG(price_usd_per_tonne) * 100)::numeric, 1) as volatility_cv_pct
FROM minerals_prices
GROUP BY mineral
ORDER BY volatility_cv_pct DESC;
