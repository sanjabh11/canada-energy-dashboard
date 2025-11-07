-- ============================================================================
-- PHASE 1 DATA VERIFICATION AND FIX
-- ============================================================================
-- Run this in Supabase Dashboard SQL Editor to check what data exists
-- and re-insert missing sample data if needed.
-- ============================================================================

-- STEP 1: Check which tables exist
SELECT
  '📋 Table Existence Check' as check_type,
  table_name,
  '✅ EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'ai_data_centres',
  'aeso_interconnection_queue',
  'hydrogen_facilities',
  'hydrogen_projects',
  'critical_minerals_projects',
  'minerals_supply_chain'
)
ORDER BY table_name;

-- STEP 2: Check row counts in each table
SELECT '📊 AI Data Centres' as table_name, COUNT(*) as row_count FROM ai_data_centres
UNION ALL
SELECT '📊 AESO Queue', COUNT(*) FROM aeso_interconnection_queue
UNION ALL
SELECT '📊 Hydrogen Facilities', COUNT(*) FROM hydrogen_facilities
UNION ALL
SELECT '📊 Hydrogen Projects', COUNT(*) FROM hydrogen_projects
UNION ALL
SELECT '📊 Critical Minerals Projects', COUNT(*) FROM critical_minerals_projects
UNION ALL
SELECT '📊 Minerals Supply Chain', COUNT(*) FROM minerals_supply_chain;

-- STEP 3: If AI Data Centres is empty (0 rows), check if IDs conflict
SELECT
  '🔍 Checking for ID conflicts in ai_data_centres' as check_type,
  id
FROM ai_data_centres
WHERE id IN ('dc-ab-001', 'dc-ab-002', 'dc-ab-003', 'dc-ab-004', 'dc-ab-005')
LIMIT 5;

-- STEP 4: If AESO Queue is empty (0 rows), check if IDs conflict
SELECT
  '🔍 Checking for ID conflicts in aeso_interconnection_queue' as check_type,
  id
FROM aeso_interconnection_queue
WHERE id LIKE 'aeso-%'
LIMIT 10;

-- ============================================================================
-- If row counts are 0, run the section below to re-insert sample data
-- ============================================================================

-- ONLY RUN THIS IF ai_data_centres has 0 rows:
-- First, let's check if there are ANY rows that might be blocking inserts
SELECT '🔍 All existing AI Data Centre IDs:' as info, id FROM ai_data_centres;

-- ONLY RUN THIS IF aeso_interconnection_queue has 0 rows:
SELECT '🔍 All existing AESO Queue IDs:' as info, id FROM aeso_interconnection_queue;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- After STEP 2, you should see:
-- ✅ AI Data Centres: 5 rows
-- ✅ AESO Queue: 8 rows
-- ✅ Hydrogen Facilities: 5 rows
-- ✅ Hydrogen Projects: 5 rows
-- ✅ Critical Minerals Projects: 7 rows
-- ✅ Minerals Supply Chain: 6 rows
--
-- If any are 0, the INSERT statements were skipped or failed.
-- ============================================================================
