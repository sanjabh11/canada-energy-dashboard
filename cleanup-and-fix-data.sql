-- ============================================================================
-- CLEANUP AND FIX SCRIPT - Run this FIRST before running the fix scripts
-- ============================================================================
-- Purpose: Remove existing synthetic data to avoid duplicate key errors
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Step 1: Delete existing minerals prices data
DELETE FROM minerals_prices
WHERE data_source IN ('LME', 'Benchmark Minerals Intelligence', 'China Domestic');

-- Verify deletion
SELECT COUNT(*) as minerals_prices_count FROM minerals_prices;
-- Expected: Should be 0 or very low

-- Step 2: Delete existing trade flows data
DELETE FROM minerals_trade_flows
WHERE data_source = 'Statistics Canada';

-- Verify deletion
SELECT COUNT(*) as trade_flows_count FROM minerals_trade_flows;
-- Expected: Should be much lower (only synthetic random() data should remain)

-- ============================================================================
-- NOW you can run the fix scripts in order:
-- 1. fix-minerals-prices-real-data.sql
-- 2. fix-trade-flows-real-data.sql
-- ============================================================================
