-- Create observation tables for historical data storage
-- Phase 5: Historical data pipeline

BEGIN;

-- Energy observations table (generation by source type)
CREATE TABLE IF NOT EXISTS public.energy_observations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  province text NOT NULL,
  source_type text NOT NULL,
  observed_at timestamptz NOT NULL,
  generation_mw double precision NOT NULL,
  data_source text,
  data_provenance text DEFAULT 'historical_archive',
  completeness_percent double precision DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  UNIQUE(province, observed_at, source_type)
);

-- Demand observations table
CREATE TABLE IF NOT EXISTS public.demand_observations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  province text NOT NULL,
  metric_type text DEFAULT 'demand',
  observed_at timestamptz NOT NULL,
  demand_mw double precision NOT NULL,
  data_source text,
  data_provenance text DEFAULT 'historical_archive',
  completeness_percent double precision DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  UNIQUE(province, observed_at)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_energy_obs_province_time 
  ON public.energy_observations(province, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_energy_obs_source 
  ON public.energy_observations(source_type);
CREATE INDEX IF NOT EXISTS idx_demand_obs_province_time 
  ON public.demand_observations(province, observed_at DESC);

-- Enable RLS
ALTER TABLE public.energy_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_observations ENABLE ROW LEVEL SECURITY;

-- Create permissive read policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'energy_observations'
      AND policyname = 'Allow public read access'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.energy_observations
      FOR SELECT USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'demand_observations'
      AND policyname = 'Allow public read access'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow public read access" ON public.demand_observations
      FOR SELECT USING (true)';
  END IF;
END $$;

COMMIT;
