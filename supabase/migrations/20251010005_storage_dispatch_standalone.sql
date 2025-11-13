-- Phase 5: Storage Dispatch Tables (Standalone - Safe to re-run)
-- Creates tables for battery storage dispatch tracking

BEGIN;

-- 1. Batteries State Table
CREATE TABLE IF NOT EXISTS public.batteries_state (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  province text NOT NULL,
  soc_percent double precision NOT NULL CHECK (soc_percent >= 0 AND soc_percent <= 100),
  soc_mwh double precision NOT NULL,
  capacity_mwh double precision NOT NULL,
  power_rating_mw double precision NOT NULL,
  efficiency_percent double precision DEFAULT 88,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(province)
);

-- 2. Storage Dispatch Logs Table
CREATE TABLE IF NOT EXISTS public.storage_dispatch_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  province text NOT NULL,
  action text NOT NULL CHECK (action IN ('charge', 'discharge', 'hold')),
  power_mw double precision NOT NULL,
  soc_before_percent double precision NOT NULL,
  soc_after_percent double precision NOT NULL,
  reason text,
  market_price_cad_per_mwh double precision,
  expected_revenue_cad double precision DEFAULT 0,
  renewable_absorption boolean DEFAULT false,
  curtailment_mitigation boolean DEFAULT false,
  dispatched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. Add provenance columns to renewable_forecasts if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'renewable_forecasts' AND column_name = 'baseline_persistence_mw'
  ) THEN
    ALTER TABLE public.renewable_forecasts
      ADD COLUMN baseline_persistence_mw double precision,
      ADD COLUMN baseline_seasonal_mw double precision,
      ADD COLUMN data_provenance text DEFAULT 'simulated',
      ADD COLUMN completeness_percent double precision DEFAULT 70;
  END IF;
END $$;

-- 4. Add provenance columns to curtailment_events if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'curtailment_events' AND column_name = 'data_provenance'
  ) THEN
    ALTER TABLE public.curtailment_events
      ADD COLUMN data_provenance text DEFAULT 'simulated',
      ADD COLUMN price_provenance text DEFAULT 'indicative';
  END IF;
END $$;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_batteries_state_province ON public.batteries_state(province);
CREATE INDEX IF NOT EXISTS idx_storage_dispatch_logs_province_time ON public.storage_dispatch_logs(province, dispatched_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_dispatch_logs_action ON public.storage_dispatch_logs(action);

-- 6. Enable RLS
ALTER TABLE public.batteries_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_dispatch_logs ENABLE ROW LEVEL SECURITY;

-- 7. Create permissive read policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'batteries_state'
      AND policyname = 'Allow public read access'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.batteries_state
      FOR SELECT USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'storage_dispatch_logs'
      AND policyname = 'Allow public read access'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.storage_dispatch_logs
      FOR SELECT USING (true)';
  END IF;
END $$;

-- 8. Seed initial battery states for provinces
INSERT INTO public.batteries_state (province, soc_percent, soc_mwh, capacity_mwh, power_rating_mw)
VALUES
  ('ON', 50, 125, 250, 100),
  ('AB', 50, 75, 150, 75),
  ('BC', 50, 100, 200, 80),
  ('QC', 50, 150, 300, 120)
ON CONFLICT (province) DO UPDATE
  SET last_updated = now();

COMMIT;
