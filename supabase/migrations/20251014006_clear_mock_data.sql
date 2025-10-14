BEGIN;

-- ============================================================================
-- Clear Mock/Synthetic Data Migration
-- ============================================================================
-- Purpose: Remove synthetic test data to prepare for real data ingestion
-- Date: 2025-10-14
-- Impact: Clears mock data from seed file 20251014005_seed_test_data.sql
-- ============================================================================

-- Clear mock provincial generation (will be replaced with real/improved data)
-- Keep any data created after 2025-10-14 (real data collection started)
DO $$
BEGIN
  -- Remove duplicate rows within provincial_generation before applying filters
  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY date, province_code, source
             ORDER BY created_at NULLS LAST, id
           ) AS rn
    FROM public.provincial_generation
  )
  DELETE FROM public.provincial_generation
  WHERE id IN (
    SELECT id FROM ranked WHERE rn > 1
  );

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'provincial_generation'
      AND column_name = 'created_at'
  ) THEN
    EXECUTE '
      DELETE FROM public.provincial_generation
      WHERE created_at < ''2025-10-14''::timestamptz
        AND (
          generation_gwh::text LIKE ''%.%''
          OR created_at::date < current_date - interval ''31 days''
        )
    ';
  ELSE
    EXECUTE '
      DELETE FROM public.provincial_generation
    ';
  END IF;
END $$;

-- Clear mock Ontario demand (will be replaced with IESO data)
-- Mock data has sinusoidal pattern: 14000 + random() * 4000 + 2000 * sin(...)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ontario_hourly_demand'
      AND column_name = 'created_at'
  ) THEN
    EXECUTE '
      DELETE FROM public.ontario_hourly_demand
      WHERE created_at < ''2025-10-14''::timestamptz
    ';
  ELSE
    EXECUTE '
      DELETE FROM public.ontario_hourly_demand
    ';
  END IF;
END $$;

-- Clear mock Ontario prices (will be replaced with IESO data)
-- Mock data has pattern: 30 + random() * 40 + 15 * sin(...)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ontario_prices'
      AND column_name = 'created_at'
  ) THEN
    EXECUTE '
      DELETE FROM public.ontario_prices
      WHERE created_at < ''2025-10-14''::timestamptz
    ';
  ELSE
    EXECUTE '
      DELETE FROM public.ontario_prices
    ';
  END IF;
END $$;

-- Clear initial mock storage dispatch (keep real data from Oct 11+)
-- Real storage dispatch started around 2025-10-11
DELETE FROM public.storage_dispatch_logs 
WHERE dispatched_at < '2025-10-11'::timestamptz;

-- Clear mock forecast metrics
-- These are placeholder values with fixed MAE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'forecast_performance_metrics'
      AND column_name = 'calculated_at'
  ) THEN
    EXECUTE '
      DELETE FROM public.forecast_performance_metrics
      WHERE calculated_at < ''2025-10-14''::timestamptz
        AND mae IN (5.2, 4.9, 5.5)
    ';
  ELSE
    EXECUTE '
      DELETE FROM public.forecast_performance_metrics
      WHERE mae IN (5.2, 4.9, 5.5)
    ';
  END IF;
END $$;

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Mock data cleared successfully';
  RAISE NOTICE 'Ready for real data ingestion';
END $$;

COMMIT;
