-- Seed script for carbon_emissions table
-- Generates realistic provincial carbon emissions for the last 30 days
-- Run this in Supabase SQL Editor or via psql

-- Alberta emissions (hourly, mostly from natural gas generation)
INSERT INTO carbon_emissions (province, timestamp, emissions_tons)
SELECT 
    'AB' as province,
    ts as timestamp,
    -- Alberta: ~500-1500 tons/hour depending on demand/gas generation
    800 + 
        (EXTRACT(HOUR FROM ts) * -100 + 1200) * 0.3 +  -- Daily curve
        (random() * 400 - 200) as emissions_tons
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '1 hour'
) ts
ON CONFLICT DO NOTHING;

-- Ontario emissions (hourly, mix of nuclear, gas, hydro)
INSERT INTO carbon_emissions (province, timestamp, emissions_tons)
SELECT 
    'ON' as province,
    ts as timestamp,
    -- Ontario: ~200-800 tons/hour (lower due to nuclear base load)
    400 + 
        (EXTRACT(HOUR FROM ts) * -50 + 600) * 0.4 +  -- Daily curve
        (random() * 300 - 150) as emissions_tons
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '1 hour'
) ts
ON CONFLICT DO NOTHING;

-- British Columbia emissions (hourly, mostly clean hydro)
INSERT INTO carbon_emissions (province, timestamp, emissions_tons)
SELECT 
    'BC' as province,
    ts as timestamp,
    -- BC: ~50-200 tons/hour (very low due to hydro dominance)
    100 + 
        (EXTRACT(HOUR FROM ts) * -15 + 180) * 0.3 +  -- Daily curve
        (random() * 80 - 40) as emissions_tons
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '1 hour'
) ts
ON CONFLICT DO NOTHING;

-- Saskatchewan emissions (hourly, coal and gas)
INSERT INTO carbon_emissions (province, timestamp, emissions_tons)
SELECT 
    'SK' as province,
    ts as timestamp,
    -- SK: ~300-700 tons/hour (coal-heavy grid)
    450 + 
        (EXTRACT(HOUR FROM ts) * -40 + 480) * 0.35 +  -- Daily curve
        (random() * 200 - 100) as emissions_tons
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '1 hour'
) ts
ON CONFLICT DO NOTHING;

-- Quebec emissions (hourly, almost entirely hydro)
INSERT INTO carbon_emissions (province, timestamp, emissions_tons)
SELECT 
    'QC' as province,
    ts as timestamp,
    -- QC: ~20-80 tons/hour (extremely low, hydro dominant)
    40 + 
        (EXTRACT(HOUR FROM ts) * -5 + 60) * 0.3 +  -- Daily curve
        (random() * 30 - 15) as emissions_tons
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '1 hour'
) ts
ON CONFLICT DO NOTHING;

-- Verify insertion
SELECT 
    province, 
    COUNT(*) as row_count, 
    MIN(timestamp) as earliest, 
    MAX(timestamp) as latest,
    ROUND(SUM(emissions_tons)::numeric, 0) as total_emissions_tons,
    ROUND(AVG(emissions_tons)::numeric, 1) as avg_hourly_emissions
FROM carbon_emissions
GROUP BY province
ORDER BY province;
