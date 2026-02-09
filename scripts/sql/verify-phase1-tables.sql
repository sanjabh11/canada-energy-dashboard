-- ============================================================================
-- PHASE 1 DATABASE VERIFICATION SCRIPT
-- ============================================================================
-- Copy and paste this entire script into Supabase Dashboard SQL Editor
-- to verify that all Phase 1 migrations were applied successfully.
--
-- Dashboard URL: https://supabase.com/dashboard/project/qnymbecjgeaoxsfphrti/sql/new
-- ============================================================================

-- Step 1: Check if all required tables exist
-- Expected: 18 tables
SELECT
  '✓ Tables Created' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 18 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing tables'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  -- AI Data Centres (5 tables)
  'ai_data_centres',
  'ai_dc_power_consumption',
  'aeso_interconnection_queue',
  'alberta_grid_capacity',
  'ai_dc_emissions',

  -- Hydrogen Economy (6 tables)
  'hydrogen_facilities',
  'hydrogen_production',
  'hydrogen_projects',
  'hydrogen_infrastructure',
  'hydrogen_prices',
  'hydrogen_demand',

  -- Critical Minerals (7 tables)
  'critical_minerals_projects',
  'minerals_supply_chain',
  'minerals_prices',
  'minerals_trade_flows',
  'battery_supply_chain',
  'minerals_strategic_stockpile',
  'ev_minerals_demand_forecast'
);

-- Step 2: List all Phase 1 tables that exist
SELECT
  '✓ Table Inventory' as check_type,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'ai_data_centres',
  'ai_dc_power_consumption',
  'aeso_interconnection_queue',
  'alberta_grid_capacity',
  'ai_dc_emissions',
  'hydrogen_facilities',
  'hydrogen_production',
  'hydrogen_projects',
  'hydrogen_infrastructure',
  'hydrogen_prices',
  'hydrogen_demand',
  'critical_minerals_projects',
  'minerals_supply_chain',
  'minerals_prices',
  'minerals_trade_flows',
  'battery_supply_chain',
  'minerals_strategic_stockpile',
  'ev_minerals_demand_forecast'
)
ORDER BY table_name;

-- Step 3: Check data counts in core tables
-- Expected row counts based on sample data
SELECT
  '✓ Data Counts' as check_type,
  'ai_data_centres' as table_name,
  COUNT(*) as row_count,
  CASE WHEN COUNT(*) >= 5 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM ai_data_centres

UNION ALL

SELECT
  '✓ Data Counts',
  'aeso_interconnection_queue',
  COUNT(*),
  CASE WHEN COUNT(*) >= 8 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM aeso_interconnection_queue

UNION ALL

SELECT
  '✓ Data Counts',
  'hydrogen_facilities',
  COUNT(*),
  CASE WHEN COUNT(*) >= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM hydrogen_facilities

UNION ALL

SELECT
  '✓ Data Counts',
  'hydrogen_projects',
  COUNT(*),
  CASE WHEN COUNT(*) >= 5 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM hydrogen_projects

UNION ALL

SELECT
  '✓ Data Counts',
  'critical_minerals_projects',
  COUNT(*),
  CASE WHEN COUNT(*) >= 7 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM critical_minerals_projects

UNION ALL

SELECT
  '✓ Data Counts',
  'battery_supply_chain',
  COUNT(*),
  CASE WHEN COUNT(*) >= 4 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM battery_supply_chain;

-- Step 4: Verify sample data in AI Data Centres
-- Should show Calgary, Edmonton, Red Deer, Fort Saskatchewan, Lethbridge
SELECT
  '✓ AI Data Centres Sample' as check_type,
  facility_name,
  location_city,
  contracted_capacity_mw,
  status
FROM ai_data_centres
ORDER BY contracted_capacity_mw DESC
LIMIT 5;

-- Step 5: Verify AESO queue projects
-- Should show 8 projects totaling ~3,270 MW
SELECT
  '✓ AESO Queue Sample' as check_type,
  project_name,
  capacity_mw,
  fuel_type,
  queue_status
FROM aeso_interconnection_queue
WHERE queue_status = 'Active'
ORDER BY capacity_mw DESC;

-- Step 6: Verify hydrogen facilities
-- Should show Edmonton and Calgary hubs
SELECT
  '✓ Hydrogen Facilities Sample' as check_type,
  facility_name,
  location_city,
  hydrogen_type,
  design_capacity_kg_per_day,
  status
FROM hydrogen_facilities
ORDER BY design_capacity_kg_per_day DESC
LIMIT 5;

-- Step 7: Verify critical minerals projects
-- Should show 7 projects worth ~$6.45B
SELECT
  '✓ Critical Minerals Sample' as check_type,
  project_name,
  primary_mineral,
  stage,
  total_capex_cad_millions,
  province
FROM critical_minerals_projects
ORDER BY total_capex_cad_millions DESC;

-- Step 8: Check for helper functions
-- Should include Phase 1 utility functions
SELECT
  '✓ Functions Created' as check_type,
  routine_name as function_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_phase1_remaining_capacity',
  'get_total_dc_grid_impact',
  'get_hydrogen_hub_summary',
  'get_supply_chain_completeness'
)
ORDER BY routine_name;

-- ============================================================================
-- VERIFICATION SUMMARY
-- ============================================================================
-- If all queries return expected results, migrations were successful!
--
-- Expected Results Summary:
-- ✅ 18 tables created
-- ✅ 5 AI data centres (2,180 MW total)
-- ✅ 8 AESO queue projects (3,270 MW total)
-- ✅ 5 hydrogen facilities
-- ✅ 5 hydrogen projects
-- ✅ 7 critical minerals projects ($6.45B total)
-- ✅ 4 battery facilities
-- ✅ Helper functions created
--
-- If any checks fail, re-run the corresponding migration file:
-- - 20251105001_ai_data_centres.sql
-- - 20251105002_hydrogen_economy.sql
-- - 20251105003_critical_minerals_enhanced.sql
-- ============================================================================
