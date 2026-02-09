-- ============================================================================
-- CLEANUP AND FIX SCRIPT - Run this FIRST before running the fix scripts
-- ============================================================================
-- Purpose: Remove existing synthetic data to avoid duplicate key errors
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Step 1: Delete ALL existing minerals prices data (aggressive cleanup)
DELETE FROM minerals_prices;

-- Verify deletion
SELECT COUNT(*) as minerals_prices_count FROM minerals_prices;
-- Expected: 0

-- Step 2: Delete ALL existing trade flows data (aggressive cleanup)
DELETE FROM minerals_trade_flows;

-- Verify deletion
SELECT COUNT(*) as trade_flows_count FROM minerals_trade_flows;
-- Expected: 0

-- ============================================================================
-- NOW you can run the fix scripts in order:
-- 1. fix-minerals-prices-real-data.sql
-- 2. fix-trade-flows-real-data.sql
-- ============================================================================
