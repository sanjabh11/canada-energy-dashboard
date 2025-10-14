BEGIN;

-- ============================================================================
-- Add Unique Constraints for Data Deduplication
-- ============================================================================
-- Purpose: Add unique constraints to support ON CONFLICT clauses in backfill scripts
-- Date: 2025-10-14
-- ============================================================================

-- Add unique constraint to provincial_generation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'provincial_generation_date_province_source_key'
  ) THEN
    ALTER TABLE public.provincial_generation
    ADD CONSTRAINT provincial_generation_date_province_source_key
    UNIQUE (date, province_code, source);
    
    RAISE NOTICE 'Added unique constraint to provincial_generation';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on provincial_generation';
  END IF;
END $$;

-- Add unique constraint to ontario_hourly_demand (hour is already primary key, but ensure it)
-- No action needed - hour is already PRIMARY KEY

-- Add unique constraint to ontario_prices (datetime is already primary key)
-- No action needed - datetime is already PRIMARY KEY

-- Create index on provincial_generation for faster lookups
CREATE INDEX IF NOT EXISTS idx_provincial_generation_date_province
ON public.provincial_generation (date, province_code);

COMMIT;
