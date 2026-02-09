-- ============================================================================
-- AESO SETUP - ULTRA-SAFE VERSION (No Extension Creation)
-- ============================================================================
-- This version assumes BOTH pg_cron and http extensions already exist
-- It ONLY creates tables, adds columns, and sets up the cron job
--
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: SCHEMA ALIGNMENT - GRID_STATUS TABLE
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

-- Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='grid_status' AND column_name='timestamp') THEN
    ALTER TABLE public.grid_status ADD COLUMN timestamp TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='grid_status' AND column_name='data_source') THEN
    ALTER TABLE public.grid_status ADD COLUMN data_source TEXT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_grid_status_region_ts ON public.grid_status(region, timestamp);
GRANT SELECT ON public.grid_status TO anon, authenticated;

COMMIT;

-- ============================================================================
-- STEP 2: UPDATE PROVINCIAL_GENERATION
-- ============================================================================

ALTER TABLE IF EXISTS public.provincial_generation ADD COLUMN IF NOT EXISTS data_source TEXT;
ALTER TABLE IF EXISTS public.provincial_generation ADD COLUMN IF NOT EXISTS version TEXT;
GRANT SELECT ON public.provincial_generation TO anon, authenticated;

-- ============================================================================
-- STEP 3: CREATE ALBERTA_GRID_PRICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alberta_grid_prices (
  timestamp TIMESTAMPTZ PRIMARY KEY,
  pool_price_cad_per_mwh NUMERIC,
  forecast_price_cad_per_mwh NUMERIC,
  market_demand_mw NUMERIC,
  data_source TEXT DEFAULT 'AESO Real-Time',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT SELECT ON public.alberta_grid_prices TO anon, authenticated;

-- ============================================================================
-- STEP 4: CREATE LOGGING TABLES
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS public.stream_health (
  stream_key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success TIMESTAMPTZ,
  last_error TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  metadata JSONB
);

GRANT SELECT ON public.edge_invocation_log TO anon, authenticated;
GRANT SELECT, UPDATE ON public.stream_health TO anon, authenticated;

-- ============================================================================
-- STEP 5: CREATE CRON JOB
-- ============================================================================

-- Drop existing job if exists
DO $$
BEGIN
  PERFORM cron.unschedule('aeso-stream-every-5-min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aeso-stream-every-5-min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create new cron job
SELECT cron.schedule(
  'aeso-stream-every-5-min',
  '*/5 * * * *',
  $$ SELECT net.http_post(url := 'https://qnymbecjgeaoxsfphrti.supabase.co/functions/v1/stream-aeso-grid-data', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'))); $$
);

-- ============================================================================
-- VERIFY
-- ============================================================================

SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'aeso-stream-every-5-min';
