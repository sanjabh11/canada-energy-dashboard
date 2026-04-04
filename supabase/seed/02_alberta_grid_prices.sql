-- Seed script for alberta_grid_prices table
-- Generates realistic AESO pool prices for the last 30 days
-- Run this in Supabase SQL Editor or via psql

-- Generate Alberta pool prices (hourly for last 30 days)
-- Typical price range: $20-$150 CAD/MWh with occasional spikes
INSERT INTO alberta_grid_prices (timestamp, pool_price, rolling_30d_avg)
SELECT 
    ts as timestamp,
    -- Base price with daily pattern (higher during peak hours 8-22)
    CASE 
        -- Off-peak hours (night): lower prices
        WHEN EXTRACT(HOUR FROM ts) BETWEEN 0 AND 6 THEN 25 + random() * 30
        -- Morning ramp: moderate prices  
        WHEN EXTRACT(HOUR FROM ts) BETWEEN 7 AND 10 THEN 45 + random() * 40
        -- Midday: moderate prices
        WHEN EXTRACT(HOUR FROM ts) BETWEEN 11 AND 16 THEN 35 + random() * 35
        -- Evening peak: highest prices
        WHEN EXTRACT(HOUR FROM ts) BETWEEN 17 AND 21 THEN 60 + random() * 60
        -- Late evening: declining prices
        ELSE 40 + random() * 40
    END as pool_price,
    -- Rolling average will be calculated by a trigger or updated separately
    NULL as rolling_30d_avg
FROM generate_series(
    NOW() - INTERVAL '30 days',
    NOW(),
    INTERVAL '1 hour'
) ts
ON CONFLICT DO NOTHING;

-- Add some price spikes for realism (high demand events)
UPDATE alberta_grid_prices 
SET pool_price = pool_price + 50 + random() * 100
WHERE pool_price > 80 
  AND random() < 0.05;  -- 5% of high prices get extra spike

-- Calculate rolling 30-day average (simplified)
WITH daily_avg AS (
    SELECT 
        DATE(timestamp) as date,
        AVG(pool_price) as avg_price
    FROM alberta_grid_prices
    GROUP BY DATE(timestamp)
)
UPDATE alberta_grid_prices agp
SET rolling_30d_avg = (
    SELECT AVG(avg_price) 
    FROM daily_avg 
    WHERE date BETWEEN DATE(agp.timestamp) - INTERVAL '30 days' AND DATE(agp.timestamp)
);

-- Verify insertion
SELECT 
    COUNT(*) as row_count, 
    MIN(timestamp) as earliest, 
    MAX(timestamp) as latest,
    ROUND(AVG(pool_price)::numeric, 2) as avg_price,
    MIN(pool_price) as min_price,
    MAX(pool_price) as max_price
FROM alberta_grid_prices;
