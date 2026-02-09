-- ============================================================================
-- DIAGNOSTIC: Check what data actually exists
-- ============================================================================
-- Run this in Supabase Dashboard to see exactly what's in the database
-- ============================================================================

-- Check AI Data Centres count and sample
SELECT '🔍 AI Data Centres Count:' as check, COUNT(*) as total FROM ai_data_centres;

SELECT '📋 AI Data Centres Sample (all rows):' as info,
       id, facility_name, operator, location_city, status, contracted_capacity_mw
FROM ai_data_centres
ORDER BY contracted_capacity_mw DESC;

-- Check AESO Queue count and sample
SELECT '🔍 AESO Queue Count:' as check, COUNT(*) as total FROM aeso_interconnection_queue;

SELECT '📋 AESO Queue Sample (all rows):' as info,
       id, project_name, proponent, project_type, requested_capacity_mw, status
FROM aeso_interconnection_queue
ORDER BY requested_capacity_mw DESC;

-- Check if there are any RLS policies blocking reads
SELECT '🔒 RLS Policies on ai_data_centres:' as info,
       tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'ai_data_centres';

SELECT '🔒 RLS Policies on aeso_interconnection_queue:' as info,
       tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'aeso_interconnection_queue';

-- Check if RLS is enabled
SELECT '🔐 RLS Status:' as info,
       schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('ai_data_centres', 'aeso_interconnection_queue');

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- AI Data Centres Count: 5
-- AESO Queue Count: 8
-- RLS Status: Should show rowsecurity = false (or policies should allow SELECT)
--
-- If counts are correct but APIs return nothing, check:
-- 1. RLS policies blocking anon key reads
-- 2. Edge Function filters (province, status, etc.)
-- ============================================================================
