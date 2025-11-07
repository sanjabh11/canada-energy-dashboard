-- ============================================================================
-- EDGE FUNCTION DIAGNOSTICS
-- ============================================================================
-- Run this to check if Edge Functions can access the data
-- ============================================================================

-- Check if anon role can read from tables
SELECT 'Testing anon role access to ai_data_centres:' as check;

SET ROLE anon;
SELECT COUNT(*) as accessible_rows FROM ai_data_centres;
RESET ROLE;

-- Check if authenticated role can read
SELECT 'Testing authenticated role access to ai_data_centres:' as check;

SET ROLE authenticated;
SELECT COUNT(*) as accessible_rows FROM ai_data_centres;
RESET ROLE;

-- Check current RLS status
SELECT 'Current RLS status:' as check, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('ai_data_centres', 'aeso_interconnection_queue')
ORDER BY tablename;

-- Check if there are any policies
SELECT 'RLS Policies:' as check, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('ai_data_centres', 'aeso_interconnection_queue')
ORDER BY tablename;

-- Sample data that Edge Function should be able to see
SELECT 'Sample data (what Edge Function should see):' as check;
SELECT id, facility_name, province, status, contracted_capacity_mw
FROM ai_data_centres
WHERE province = 'AB'
ORDER BY contracted_capacity_mw DESC
LIMIT 5;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- anon role: Should see 5 rows
-- authenticated role: Should see 5 rows
-- RLS status: rowsecurity = false (disabled)
-- Policies: No policies (or SELECT allowed)
-- Sample data: 5 rows showing Calgary, Edmonton, etc.
-- ============================================================================
