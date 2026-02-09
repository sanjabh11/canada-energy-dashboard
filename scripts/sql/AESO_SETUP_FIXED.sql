-- ============================================================================
-- AESO REAL-TIME INTEGRATION - FIXED SETUP SCRIPT
-- ============================================================================
-- This version SKIPS pg_cron extension creation (it already exists)
-- and focuses on schema updates and cron job creation.
--
-- Run this script in Supabase Dashboard > SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY EXTENSIONS (Don't create, just verify they exist)
-- ============================================================================

-- Check if pg_cron exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE EXCEPTION 'pg_cron extension is not installed. Contact Supabase support.';
  END IF;
END $$;

-- Check if http extension exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'http'
  ) THEN
    -- Try to create http extension (this usually works)
    CREATE EXTENSION http WITH SCHEMA net;
  END IF;
END $$;

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
  ELSE
    RAISE NOTICE 'timestamp column already exists in grid_status';
  END IF;

  -- Add reserve_margin column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='grid_status' AND column_name='reserve_margin'
  ) THEN
    ALTER TABLE public.grid_status ADD COLUMN reserve_margin NUMERIC;
    RAISE NOTICE 'Added reserve_margin column to grid_status';
  ELSE
    RAISE NOTICE 'reserve_margin column already exists in grid_status';
  END IF;

  -- Add frequency_hz column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='grid_status' AND column_name='frequency_hz'
  ) THEN
    ALTER TABLE public.grid_status ADD COLUMN frequency_hz NUMERIC;
    RAISE NOTICE 'Added frequency_hz column to grid_status';
  ELSE
    RAISE NOTICE 'frequency_hz column already exists in grid_status';
  END IF;

  -- Add data_source column (needed to track real-time vs mock data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='grid_status' AND column_name='data_source'
  ) THEN
    ALTER TABLE public.grid_status ADD COLUMN data_source TEXT;
    RAISE NOTICE 'Added data_source column to grid_status';
  ELSE
    RAISE NOTICE 'data_source column already exists in grid_status';
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
-- STEP 6: CREATE HELPER FUNCTIONS
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
DO $$
BEGIN
  PERFORM cron.unschedule('aeso-stream-every-5-min')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'aeso-stream-every-5-min'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Job doesn't exist yet, that's fine
    NULL;
END $$;

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
-- SUCCESS MESSAGES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ AESO SETUP COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Manually test the function (see below)';
  RAISE NOTICE '2. Wait 5 minutes and verify data appears';
  RAISE NOTICE '3. Check cron job logs for any errors';
  RAISE NOTICE '';
END $$;
