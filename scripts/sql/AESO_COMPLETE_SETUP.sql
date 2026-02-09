-- ============================================================================
-- AESO REAL-TIME INTEGRATION - COMPLETE SETUP SCRIPT
-- ============================================================================
-- Run this script in Supabase Dashboard > SQL Editor
-- This is a single, comprehensive script that sets up everything needed
-- for Alberta real-time grid data streaming.
--
-- PREREQUISITES:
-- 1. Environment variables set in Dashboard (see section below)
-- 2. stream-aeso-grid-data Edge Function deployed
--
-- WHAT THIS SCRIPT DOES:
-- ✅ Creates/updates all required database tables
-- ✅ Adds missing columns to existing tables
-- ✅ Creates logging and health monitoring tables
-- ✅ Enables required PostgreSQL extensions
-- ✅ Sets up 5-minute cron job for data ingestion
-- ✅ Grants proper permissions
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE REQUIRED EXTENSIONS
-- ============================================================================

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA net;

-- ============================================================================
-- STEP 2: SCHEMA ALIGNMENT - GRID_STATUS TABLE
-- ============================================================================

BEGIN;

-- Create grid_status table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.grid_status (
  region TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  demand_mw NUMERIC,
  supply_mw NUMERIC,
  reserve_margin NUMERIC,
  frequency_hz NUMERIC,
  voltage_kv NUMERIC,
  congestion_index NUMERIC,
  data_source TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns (idempotent - safe to run multiple times)
DO $$
BEGIN
  -- Add timestamp column (needed by Edge Function)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='grid_status' AND column_name='timestamp'
  ) THEN
    ALTER TABLE public.grid_status ADD COLUMN timestamp TIMESTAMPTZ;
    RAISE NOTICE 'Added timestamp column to grid_status';
  END IF;

  -- Add reserve_margin column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='grid_status' AND column_name='reserve_margin'
  ) THEN
    ALTER TABLE public.grid_status ADD COLUMN reserve_margin NUMERIC;
    RAISE NOTICE 'Added reserve_margin column to grid_status';
  END IF;

  -- Add frequency_hz column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='grid_status' AND column_name='frequency_hz'
  ) THEN
    ALTER TABLE public.grid_status ADD COLUMN frequency_hz NUMERIC;
    RAISE NOTICE 'Added frequency_hz column to grid_status';
  END IF;

  -- Add data_source column (needed to track real-time vs mock data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='grid_status' AND column_name='data_source'
  ) THEN
    ALTER TABLE public.grid_status ADD COLUMN data_source TEXT;
    RAISE NOTICE 'Added data_source column to grid_status';
  END IF;
END $$;

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS ux_grid_status_region_ts
  ON public.grid_status(region, timestamp);

CREATE UNIQUE INDEX IF NOT EXISTS ux_grid_status_region_captured
  ON public.grid_status(region, captured_at);

-- Grant permissions
GRANT SELECT ON public.grid_status TO anon, authenticated;

COMMIT;

-- ============================================================================
-- STEP 3: UPDATE PROVINCIAL_GENERATION TABLE
-- ============================================================================

-- Add missing columns to provincial_generation
ALTER TABLE IF EXISTS public.provincial_generation
  ADD COLUMN IF NOT EXISTS data_source TEXT,
  ADD COLUMN IF NOT EXISTS version TEXT;

GRANT SELECT ON public.provincial_generation TO anon, authenticated;

-- ============================================================================
-- STEP 4: CREATE ALBERTA_GRID_PRICES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alberta_grid_prices (
  timestamp TIMESTAMPTZ PRIMARY KEY,
  pool_price_cad_per_mwh NUMERIC,
  forecast_price_cad_per_mwh NUMERIC,
  market_demand_mw NUMERIC,
  data_source TEXT DEFAULT 'AESO Real-Time',
  data_quality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alberta_prices_timestamp
  ON public.alberta_grid_prices(timestamp DESC);

GRANT SELECT ON public.alberta_grid_prices TO anon, authenticated;

COMMENT ON TABLE public.alberta_grid_prices IS 'Alberta electricity pool prices from AESO real-time API';

-- ============================================================================
-- STEP 5: CREATE LOGGING AND HEALTH MONITORING TABLES
-- ============================================================================

-- Edge function invocation logging
CREATE TABLE IF NOT EXISTS public.edge_invocation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invocation_log_function
  ON public.edge_invocation_log(function_name, created_at DESC);

GRANT SELECT ON public.edge_invocation_log TO anon, authenticated;

-- Stream health monitoring
CREATE TABLE IF NOT EXISTS public.stream_health (
  stream_key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success TIMESTAMPTZ,
  last_error TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  metadata JSONB
);

GRANT SELECT, UPDATE ON public.stream_health TO anon, authenticated;

COMMENT ON TABLE public.stream_health IS 'Health status for real-time data streams';

-- ============================================================================
-- STEP 6: CREATE HELPER FUNCTIONS (Optional but useful)
-- ============================================================================

-- Function to get current AESO pool price
CREATE OR REPLACE FUNCTION get_current_aeso_pool_price()
RETURNS NUMERIC AS $$
  SELECT pool_price_cad_per_mwh
  FROM alberta_grid_prices
  ORDER BY timestamp DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to get average AESO price over last N hours
CREATE OR REPLACE FUNCTION get_aeso_average_price(hours INT DEFAULT 24)
RETURNS NUMERIC AS $$
  SELECT AVG(pool_price_cad_per_mwh)::NUMERIC(10,2)
  FROM alberta_grid_prices
  WHERE timestamp >= NOW() - (hours || ' hours')::INTERVAL;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- STEP 7: SET UP AUTOMATED CRON JOB (Every 5 minutes)
-- ============================================================================

-- First, drop existing job if it exists (to avoid duplicates)
SELECT cron.unschedule('aeso-stream-every-5-min')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'aeso-stream-every-5-min'
);

-- Create new cron job to invoke stream-aeso-grid-data every 5 minutes
SELECT cron.schedule(
  'aeso-stream-every-5-min',           -- Job name
  '*/5 * * * *',                        -- Cron expression (every 5 minutes)
  $$
  SELECT net.http_post(
    url := 'https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-aeso-grid-data',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    )
  );
  $$
);

-- ============================================================================
-- STEP 8: VERIFICATION QUERIES
-- ============================================================================

-- Verify cron job was created
SELECT
  jobid,
  jobname,
  schedule,
  active,
  database
FROM cron.job
WHERE jobname = 'aeso-stream-every-5-min';

-- Check if tables exist
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('grid_status', 'provincial_generation', 'alberta_grid_prices', 'edge_invocation_log', 'stream_health')
  AND schemaname = 'public'
ORDER BY tablename;

-- Count columns in grid_status (should have timestamp, data_source, etc.)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'grid_status'
ORDER BY ordinal_position;

-- ============================================================================
-- EXPECTED OUTPUT
-- ============================================================================
-- After running this script, you should see:
--
-- 1. NOTICES about columns being added
-- 2. Cron job verification showing 1 row with jobname='aeso-stream-every-5-min'
-- 3. Tables verification showing all 5 tables exist
-- 4. Columns verification showing grid_status has timestamp, data_source, etc.
--
-- If you see errors, check:
-- - Extensions are installed (pg_cron, http)
-- - Service role key is configured
-- - Edge Function is deployed
-- ============================================================================

-- ============================================================================
-- POST-SETUP: MANUAL TEST
-- ============================================================================
-- You can manually trigger the data fetch with this SQL:
-- (Run this AFTER the script completes to test immediately)
/*
SELECT net.http_post(
  url := 'https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-aeso-grid-data',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
  )
);
*/

-- Then verify data was inserted:
/*
SELECT
  region,
  COALESCE(timestamp, captured_at) AS ts,
  demand_mw,
  supply_mw,
  data_source
FROM grid_status
WHERE region = 'Alberta'
ORDER BY COALESCE(timestamp, captured_at) DESC
LIMIT 5;
*/

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================
-- If cron job doesn't run:
-- 1. Check: SELECT * FROM cron.job WHERE jobname = 'aeso-stream-every-5-min';
-- 2. Check logs: Dashboard > Edge Functions > stream-aeso-grid-data > Logs
-- 3. Check health: SELECT * FROM stream_health WHERE stream_key = 'aeso-grid-data';
--
-- If no data appears:
-- 1. Manually test function with curl (see DEPLOY_AESO_INTEGRATION.md)
-- 2. Check Edge Function logs for errors
-- 3. Verify AESO API is accessible: curl http://ets.aeso.ca/ets_web/ip/Market/Reports/CSDReportServlet
-- ============================================================================

-- Script complete! ✅
-- Next step: Wait 5 minutes and check if data appears in grid_status table
