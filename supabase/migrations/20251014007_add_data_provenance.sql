BEGIN;

-- ============================================================================
-- Add Data Provenance Tracking
-- ============================================================================
-- Purpose: Track data sources and quality tiers for transparency
-- Date: 2025-10-14
-- Impact: Adds provenance columns and reference table
-- ============================================================================

-- Add provenance column to provincial_generation if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'provincial_generation' 
      AND column_name = 'data_provenance'
  ) THEN
    ALTER TABLE public.provincial_generation 
    ADD COLUMN data_provenance text DEFAULT 'unknown';
    
    RAISE NOTICE 'Added data_provenance to provincial_generation';
  END IF;
END $$;

-- Add provenance column to ontario_hourly_demand if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'ontario_hourly_demand' 
      AND column_name = 'data_provenance'
  ) THEN
    ALTER TABLE public.ontario_hourly_demand 
    ADD COLUMN data_provenance text DEFAULT 'ieso_real_time';
    
    RAISE NOTICE 'Added data_provenance to ontario_hourly_demand';
  END IF;
END $$;

-- Add provenance column to ontario_prices if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'ontario_prices' 
      AND column_name = 'data_provenance'
  ) THEN
    ALTER TABLE public.ontario_prices 
    ADD COLUMN data_provenance text DEFAULT 'ieso_real_time';
    
    RAISE NOTICE 'Added data_provenance to ontario_prices';
  END IF;
END $$;

-- Create provenance reference table
CREATE TABLE IF NOT EXISTS public.data_provenance_types (
  code text PRIMARY KEY,
  description text NOT NULL,
  quality_tier text NOT NULL CHECK (quality_tier IN ('real_time', 'historical', 'modeled', 'synthetic')),
  source_authority text,
  update_frequency text,
  reliability_score numeric(3,2) DEFAULT 1.0 CHECK (reliability_score >= 0 AND reliability_score <= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on provenance types
ALTER TABLE public.data_provenance_types ENABLE ROW LEVEL SECURITY;

-- Allow public read access to provenance types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_provenance_types'
      AND policyname = 'allow read data_provenance_types'
  ) THEN
    CREATE POLICY "allow read data_provenance_types" 
    ON public.data_provenance_types
    FOR SELECT USING (true);
  END IF;
END $$;

-- Insert provenance types
INSERT INTO public.data_provenance_types (
  code, 
  description, 
  quality_tier, 
  source_authority, 
  update_frequency,
  reliability_score
)
VALUES
  ('ieso_real_time', 'Real-time data from IESO API', 'real_time', 'IESO', 'Hourly', 1.0),
  ('ieso_historical', 'Historical data from IESO archives', 'historical', 'IESO', 'Daily', 0.95),
  ('ieso_derived', 'Derived from IESO reports', 'historical', 'IESO', 'Daily', 0.90),
  ('aeso_real_time', 'Real-time data from AESO API', 'real_time', 'AESO', 'Hourly', 1.0),
  ('open_meteo', 'Real-time weather from Open-Meteo API', 'real_time', 'Open-Meteo', 'Every 3 hours', 0.95),
  ('calculated', 'Calculated from optimization engine', 'real_time', 'Internal', 'Every 30 min', 0.85),
  ('modeled_realistic', 'Modeled using realistic provincial profiles', 'modeled', 'Internal', 'Daily', 0.70),
  ('synthetic', 'Synthetic test data', 'synthetic', 'Internal', 'N/A', 0.0)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  quality_tier = EXCLUDED.quality_tier,
  source_authority = EXCLUDED.source_authority,
  update_frequency = EXCLUDED.update_frequency,
  reliability_score = EXCLUDED.reliability_score,
  updated_at = now();

-- Create index for faster provenance lookups
CREATE INDEX IF NOT EXISTS idx_provincial_generation_provenance 
ON public.provincial_generation (data_provenance);

CREATE INDEX IF NOT EXISTS idx_ontario_demand_provenance 
ON public.ontario_hourly_demand (data_provenance);

CREATE INDEX IF NOT EXISTS idx_ontario_prices_provenance 
ON public.ontario_prices (data_provenance);

-- Create view for data quality summary
CREATE OR REPLACE VIEW public.data_quality_summary AS
SELECT 
  'provincial_generation' as table_name,
  data_provenance,
  COUNT(*) as record_count,
  MIN(date) as earliest_date,
  MAX(date) as latest_date,
  COUNT(DISTINCT province_code) as province_count
FROM public.provincial_generation
GROUP BY data_provenance

UNION ALL

SELECT 
  'ontario_hourly_demand' as table_name,
  data_provenance,
  COUNT(*) as record_count,
  MIN(hour) as earliest_date,
  MAX(hour) as latest_date,
  1 as province_count
FROM public.ontario_hourly_demand
GROUP BY data_provenance

UNION ALL

SELECT 
  'ontario_prices' as table_name,
  data_provenance,
  COUNT(*) as record_count,
  MIN(datetime) as earliest_date,
  MAX(datetime) as latest_date,
  1 as province_count
FROM public.ontario_prices
GROUP BY data_provenance;

-- Grant access to view
GRANT SELECT ON public.data_quality_summary TO anon, authenticated;

COMMIT;
