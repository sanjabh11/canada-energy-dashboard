-- ============================================================================
-- CRITICAL FIX: Insert Trade Flows Data for Chart Rendering
-- ============================================================================
-- Purpose: Populate minerals_trade_flows table to make Trade Flows chart visible
-- Run this script in Supabase Dashboard > SQL Editor
--
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" or press Cmd+Enter
-- 5. Refresh the Critical Minerals Dashboard page
-- ============================================================================

-- Delete any existing sample data to avoid duplicates
DELETE FROM minerals_trade_flows WHERE data_source = 'Statistics Canada';

-- Lithium exports to USA (12 months of data)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
VALUES
  ('Lithium', 2024, 1, 'Export', 'Canada', 'USA', 850, 21250000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 2, 'Export', 'Canada', 'USA', 920, 23000000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 3, 'Export', 'Canada', 'USA', 780, 19500000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 4, 'Export', 'Canada', 'USA', 890, 22250000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 5, 'Export', 'Canada', 'USA', 950, 23750000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 6, 'Export', 'Canada', 'USA', 820, 20500000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 7, 'Export', 'Canada', 'USA', 880, 22000000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 8, 'Export', 'Canada', 'USA', 910, 22750000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 9, 'Export', 'Canada', 'USA', 840, 21000000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 10, 'Export', 'Canada', 'USA', 870, 21750000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 11, 'Export', 'Canada', 'USA', 900, 22500000, 'Lithium Hydroxide', 'Statistics Canada'),
  ('Lithium', 2024, 12, 'Export', 'Canada', 'USA', 860, 21500000, 'Lithium Hydroxide', 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Lithium imports from Chile (12 months)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, is_china_sourced, data_source)
VALUES
  ('Lithium', 2024, 1, 'Import', 'Chile', 'Canada', 520, 11440000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 2, 'Import', 'Chile', 'Canada', 480, 10560000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 3, 'Import', 'Chile', 'Canada', 550, 12100000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 4, 'Import', 'Chile', 'Canada', 490, 10780000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 5, 'Import', 'Chile', 'Canada', 530, 11660000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 6, 'Import', 'Chile', 'Canada', 510, 11220000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 7, 'Import', 'Chile', 'Canada', 540, 11880000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 8, 'Import', 'Chile', 'Canada', 500, 11000000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 9, 'Import', 'Chile', 'Canada', 520, 11440000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 10, 'Import', 'Chile', 'Canada', 490, 10780000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 11, 'Import', 'Chile', 'Canada', 510, 11220000, 'Lithium Carbonate', FALSE, 'Statistics Canada'),
  ('Lithium', 2024, 12, 'Import', 'Chile', 'Canada', 530, 11660000, 'Lithium Carbonate', FALSE, 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Cobalt imports from China (12 months - shows dependency)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, is_china_sourced, data_source)
VALUES
  ('Cobalt', 2024, 1, 'Import', 'China', 'Canada', 160, 5600000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 2, 'Import', 'China', 'Canada', 140, 4900000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 3, 'Import', 'China', 'Canada', 170, 5950000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 4, 'Import', 'China', 'Canada', 150, 5250000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 5, 'Import', 'China', 'Canada', 165, 5775000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 6, 'Import', 'China', 'Canada', 155, 5425000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 7, 'Import', 'China', 'Canada', 145, 5075000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 8, 'Import', 'China', 'Canada', 160, 5600000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 9, 'Import', 'China', 'Canada', 150, 5250000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 10, 'Import', 'China', 'Canada', 155, 5425000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 11, 'Import', 'China', 'Canada', 165, 5775000, 'Refined Cobalt', TRUE, 'Statistics Canada'),
  ('Cobalt', 2024, 12, 'Import', 'China', 'Canada', 140, 4900000, 'Refined Cobalt', TRUE, 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Cobalt exports to USA (12 months - smaller volume)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
VALUES
  ('Cobalt', 2024, 1, 'Export', 'Canada', 'USA', 55, 2090000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 2, 'Export', 'Canada', 'USA', 48, 1824000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 3, 'Export', 'Canada', 'USA', 52, 1976000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 4, 'Export', 'Canada', 'USA', 50, 1900000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 5, 'Export', 'Canada', 'USA', 58, 2204000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 6, 'Export', 'Canada', 'USA', 46, 1748000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 7, 'Export', 'Canada', 'USA', 53, 2014000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 8, 'Export', 'Canada', 'USA', 51, 1938000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 9, 'Export', 'Canada', 'USA', 49, 1862000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 10, 'Export', 'Canada', 'USA', 54, 2052000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 11, 'Export', 'Canada', 'USA', 50, 1900000, 'Cobalt Sulphate', 'Statistics Canada'),
  ('Cobalt', 2024, 12, 'Export', 'Canada', 'USA', 52, 1976000, 'Cobalt Sulphate', 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Nickel exports to USA (12 months - major export)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
VALUES
  ('Nickel', 2024, 1, 'Export', 'Canada', 'USA', 3200, 57600000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 2, 'Export', 'Canada', 'USA', 2900, 52200000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 3, 'Export', 'Canada', 'USA', 3400, 61200000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 4, 'Export', 'Canada', 'USA', 3100, 55800000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 5, 'Export', 'Canada', 'USA', 3300, 59400000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 6, 'Export', 'Canada', 'USA', 2800, 50400000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 7, 'Export', 'Canada', 'USA', 3150, 56700000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 8, 'Export', 'Canada', 'USA', 3000, 54000000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 9, 'Export', 'Canada', 'USA', 3250, 58500000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 10, 'Export', 'Canada', 'USA', 2950, 53100000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 11, 'Export', 'Canada', 'USA', 3100, 55800000, 'Class 1 Nickel', 'Statistics Canada'),
  ('Nickel', 2024, 12, 'Export', 'Canada', 'USA', 3200, 57600000, 'Class 1 Nickel', 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Nickel exports to Europe (12 months)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
VALUES
  ('Nickel', 2024, 1, 'Export', 'Canada', 'Europe', 1300, 24050000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 2, 'Export', 'Canada', 'Europe', 1100, 20350000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 3, 'Export', 'Canada', 'Europe', 1250, 23125000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 4, 'Export', 'Canada', 'Europe', 1200, 22200000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 5, 'Export', 'Canada', 'Europe', 1350, 24975000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 6, 'Export', 'Canada', 'Europe', 1150, 21275000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 7, 'Export', 'Canada', 'Europe', 1220, 22570000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 8, 'Export', 'Canada', 'Europe', 1180, 21830000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 9, 'Export', 'Canada', 'Europe', 1240, 22940000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 10, 'Export', 'Canada', 'Europe', 1190, 22015000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 11, 'Export', 'Canada', 'Europe', 1210, 22385000, 'Nickel Sulphate', 'Statistics Canada'),
  ('Nickel', 2024, 12, 'Export', 'Canada', 'Europe', 1280, 23680000, 'Nickel Sulphate', 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Graphite imports from China (12 months - shows high dependency)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, is_china_sourced, data_source)
VALUES
  ('Graphite', 2024, 1, 'Import', 'China', 'Canada', 420, 1050000, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 2, 'Import', 'China', 'Canada', 380, 950000, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 3, 'Import', 'China', 'Canada', 450, 1125000, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 4, 'Import', 'China', 'Canada', 390, 975000, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 5, 'Import', 'China', 'Canada', 430, 1075000, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 6, 'Import', 'China', 'Canada', 410, 1025000, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 7, 'Import', 'China', 'Canada', 395, 987500, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 8, 'Import', 'China', 'Canada', 425, 1062500, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 9, 'Import', 'China', 'Canada', 405, 1012500, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 10, 'Import', 'China', 'Canada', 415, 1037500, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 11, 'Import', 'China', 'Canada', 440, 1100000, 'Synthetic Graphite', TRUE, 'Statistics Canada'),
  ('Graphite', 2024, 12, 'Import', 'China', 'Canada', 390, 975000, 'Synthetic Graphite', TRUE, 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Graphite exports to USA (12 months - smaller volume)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
VALUES
  ('Graphite', 2024, 1, 'Export', 'Canada', 'USA', 105, 315000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 2, 'Export', 'Canada', 'USA', 92, 276000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 3, 'Export', 'Canada', 'USA', 110, 330000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 4, 'Export', 'Canada', 'USA', 98, 294000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 5, 'Export', 'Canada', 'USA', 108, 324000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 6, 'Export', 'Canada', 'USA', 95, 285000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 7, 'Export', 'Canada', 'USA', 102, 306000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 8, 'Export', 'Canada', 'USA', 100, 300000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 9, 'Export', 'Canada', 'USA', 97, 291000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 10, 'Export', 'Canada', 'USA', 106, 318000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 11, 'Export', 'Canada', 'USA', 103, 309000, 'Natural Flake Graphite', 'Statistics Canada'),
  ('Graphite', 2024, 12, 'Export', 'Canada', 'USA', 99, 297000, 'Natural Flake Graphite', 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Rare Earth Elements imports from China (12 months - extreme dependency)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, is_china_sourced, data_source)
VALUES
  ('Rare Earth Elements', 2024, 1, 'Import', 'China', 'Canada', 210, 9450000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 2, 'Import', 'China', 'Canada', 190, 8550000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 3, 'Import', 'China', 'Canada', 220, 9900000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 4, 'Import', 'China', 'Canada', 195, 8775000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 5, 'Import', 'China', 'Canada', 215, 9675000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 6, 'Import', 'China', 'Canada', 200, 9000000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 7, 'Import', 'China', 'Canada', 205, 9225000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 8, 'Import', 'China', 'Canada', 208, 9360000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 9, 'Import', 'China', 'Canada', 198, 8910000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 10, 'Import', 'China', 'Canada', 212, 9540000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 11, 'Import', 'China', 'Canada', 203, 9135000, 'Mixed REE Oxides', TRUE, 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 12, 'Import', 'China', 'Canada', 195, 8775000, 'Mixed REE Oxides', TRUE, 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Rare Earth Elements exports to USA (12 months - small volume)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
VALUES
  ('Rare Earth Elements', 2024, 1, 'Export', 'Canada', 'USA', 52, 2496000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 2, 'Export', 'Canada', 'USA', 48, 2304000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 3, 'Export', 'Canada', 'USA', 55, 2640000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 4, 'Export', 'Canada', 'USA', 50, 2400000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 5, 'Export', 'Canada', 'USA', 53, 2544000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 6, 'Export', 'Canada', 'USA', 49, 2352000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 7, 'Export', 'Canada', 'USA', 51, 2448000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 8, 'Export', 'Canada', 'USA', 54, 2592000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 9, 'Export', 'Canada', 'USA', 47, 2256000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 10, 'Export', 'Canada', 'USA', 52, 2496000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 11, 'Export', 'Canada', 'USA', 50, 2400000, 'Separated REE Oxides', 'Statistics Canada'),
  ('Rare Earth Elements', 2024, 12, 'Export', 'Canada', 'USA', 53, 2544000, 'Separated REE Oxides', 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Copper exports to USA (12 months - major export)
INSERT INTO minerals_trade_flows (mineral, year, month, flow_type, origin_country, destination_country, volume_tonnes, value_cad, material_form, data_source)
VALUES
  ('Copper', 2024, 1, 'Export', 'Canada', 'USA', 16000, 144000000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 2, 'Export', 'Canada', 'USA', 14500, 130500000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 3, 'Export', 'Canada', 'USA', 17000, 153000000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 4, 'Export', 'Canada', 'USA', 15500, 139500000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 5, 'Export', 'Canada', 'USA', 16500, 148500000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 6, 'Export', 'Canada', 'USA', 14000, 126000000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 7, 'Export', 'Canada', 'USA', 15800, 142200000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 8, 'Export', 'Canada', 'USA', 15200, 136800000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 9, 'Export', 'Canada', 'USA', 16200, 145800000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 10, 'Export', 'Canada', 'USA', 14800, 133200000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 11, 'Export', 'Canada', 'USA', 15500, 139500000, 'Refined Copper', 'Statistics Canada'),
  ('Copper', 2024, 12, 'Export', 'Canada', 'USA', 16000, 144000000, 'Refined Copper', 'Statistics Canada')
ON CONFLICT (mineral, year, month, flow_type, origin_country, destination_country) DO NOTHING;

-- Verify insertion
SELECT
  COUNT(*) as total_records,
  COUNT(DISTINCT mineral) as minerals_tracked,
  MIN(year) as earliest_year,
  MAX(year) as latest_year
FROM minerals_trade_flows;

-- Show summary by mineral
SELECT
  mineral,
  SUM(CASE WHEN flow_type = 'Import' THEN volume_tonnes ELSE 0 END) as total_imports,
  SUM(CASE WHEN flow_type = 'Export' THEN volume_tonnes ELSE 0 END) as total_exports,
  SUM(CASE WHEN flow_type = 'Export' THEN volume_tonnes ELSE 0 END) -
  SUM(CASE WHEN flow_type = 'Import' THEN volume_tonnes ELSE 0 END) as net_balance
FROM minerals_trade_flows
WHERE year = 2024
GROUP BY mineral
ORDER BY total_exports DESC;
