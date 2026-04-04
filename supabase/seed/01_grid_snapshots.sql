-- Seed script for grid_snapshots table
-- Generates realistic Alberta and Ontario grid data for the last 30 days
-- Run this in Supabase SQL Editor or via psql

-- Generate Alberta grid snapshots (hourly for last 30 days)
INSERT INTO grid_snapshots (province, timestamp, demand_mw, supply_mw, imports_mw, exports_mw)
SELECT 
    'AB' as province,
    ts as timestamp,
    -- Alberta demand typically 10,000-12,000 MW with daily pattern
    10500 + 
        (EXTRACT(HOUR FROM ts) * -200 + 2400) * 0.3 +  -- Daily curve (higher evening)
        (random() * 500 - 250) as demand_mw,
    -- Supply matches demand plus small margin
    10500 + 
        (EXTRACT(HOUR FROM ts) * -200 + 2400) * 0.3 + 
        (random() * 500 - 250) + 
        (random() * 300 + 100) as supply_mw,
    -- Alberta typically imports 50-200 MW
    100 + random() * 100 as imports_mw,
    -- Alberta typically exports 100-800 MW depending on wind
    200 + random() * 500 as exports_mw
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '1 hour'
) ts
ON CONFLICT DO NOTHING;

-- Generate Ontario grid snapshots (hourly for last 30 days)
INSERT INTO grid_snapshots (province, timestamp, demand_mw, supply_mw, imports_mw, exports_mw)
SELECT 
    'ON' as province,
    ts as timestamp,
    -- Ontario demand typically 15,000-22,000 MW
    17000 + 
        (EXTRACT(HOUR FROM ts) * -500 + 6000) * 0.4 +  -- Daily curve
        (random() * 800 - 400) as demand_mw,
    -- Supply matches demand
    17000 + 
        (EXTRACT(HOUR FROM ts) * -500 + 6000) * 0.4 + 
        (random() * 800 - 400) + 
        (random() * 400 + 100) as supply_mw,
    -- Ontario imports from Quebec/Manitoba/NY 500-2000 MW
    800 + random() * 1200 as imports_mw,
    -- Ontario exports to US 0-500 MW
    random() * 500 as exports_mw
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '1 hour'
) ts
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT province, COUNT(*) as row_count, MIN(timestamp) as earliest, MAX(timestamp) as latest
FROM grid_snapshots
GROUP BY province
ORDER BY province;
