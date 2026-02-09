-- ============================================================================
-- VERIFICATION QUERY: Check Trade Flows Data in Database
-- ============================================================================
-- Run this in Supabase SQL Editor to verify data was inserted correctly

-- 1. Check total records
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT mineral) as minerals_tracked,
  COUNT(DISTINCT year) as years_available,
  MIN(year) as earliest_year,
  MAX(year) as latest_year
FROM minerals_trade_flows;

-- 2. Show summary by mineral
SELECT
  mineral,
  COUNT(*) as record_count,
  SUM(CASE WHEN flow_type = 'Import' THEN volume_tonnes ELSE 0 END) as total_imports,
  SUM(CASE WHEN flow_type = 'Export' THEN volume_tonnes ELSE 0 END) as total_exports,
  SUM(CASE WHEN flow_type = 'Export' THEN volume_tonnes ELSE 0 END) -
  SUM(CASE WHEN flow_type = 'Import' THEN volume_tonnes ELSE 0 END) as net_balance
FROM minerals_trade_flows
WHERE year = 2024
GROUP BY mineral
ORDER BY total_exports DESC;

-- 3. Sample records to verify data format
SELECT * FROM minerals_trade_flows
WHERE year = 2024
ORDER BY mineral, flow_type, month
LIMIT 20;

-- 4. Check for any data quality issues
SELECT
  mineral,
  flow_type,
  COUNT(*) as records,
  MIN(volume_tonnes) as min_volume,
  MAX(volume_tonnes) as max_volume,
  AVG(volume_tonnes)::INTEGER as avg_volume
FROM minerals_trade_flows
WHERE year = 2024
GROUP BY mineral, flow_type
ORDER BY mineral, flow_type;
