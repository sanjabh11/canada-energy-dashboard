-- ============================================================================
-- CHECK ALBERTA GRID CAPACITY TABLE
-- ============================================================================
-- The AI Data Centres Edge Function queries this table with .single()
-- If it's empty, the function will crash!
-- ============================================================================

-- Check if table exists
SELECT 'alberta_grid_capacity table exists?' as check,
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alberta_grid_capacity') as exists;

-- Check row count
SELECT 'alberta_grid_capacity row count:' as check, COUNT(*) as count FROM alberta_grid_capacity;

-- If empty, insert sample data
INSERT INTO alberta_grid_capacity (
    timestamp,
    current_peak_demand_mw,
    total_generation_capacity_mw,
    available_capacity_mw,
    total_dc_load_mw,
    dc_percentage_of_peak,
    phase1_allocated_mw,
    phase1_remaining_mw,
    total_queue_mw,
    dc_queue_mw,
    renewable_queue_mw,
    reserve_margin_percentage,
    reliability_rating,
    forecasted_demand_growth_2030_mw
) VALUES (
    NOW(),
    16000,  -- Current peak demand
    18500,  -- Total generation capacity
    2500,   -- Available capacity
    2180,   -- Total DC load (matches our 5 facilities)
    13.6,   -- DC as % of peak (2180/16000)
    780,    -- Phase 1 allocated (from our data centres)
    420,    -- Phase 1 remaining (1200 - 780)
    3270,   -- Total queue MW (from AESO queue)
    2120,   -- DC queue MW (from AESO queue DC projects)
    1150,   -- Renewable queue MW (solar + wind from queue)
    15.6,   -- Reserve margin %
    'Adequate',  -- Reliability rating
    5000    -- Forecasted growth by 2030
)
ON CONFLICT DO NOTHING;

-- Verify insert
SELECT 'alberta_grid_capacity after insert:' as check, COUNT(*) as count FROM alberta_grid_capacity;

-- Show the data
SELECT * FROM alberta_grid_capacity ORDER BY timestamp DESC LIMIT 1;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- Before insert: count = 0 (causing Edge Function to crash)
-- After insert: count = 1 (Edge Function will work)
-- ============================================================================
