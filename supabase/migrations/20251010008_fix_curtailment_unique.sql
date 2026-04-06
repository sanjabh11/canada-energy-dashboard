-- Fix curtailment_events table to support upsert operations
-- Add unique constraint for replay simulation

BEGIN;

-- Add unique constraint on province and occurred_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'curtailment_events_province_occurred_at_key'
  ) THEN
    ALTER TABLE public.curtailment_events
      ADD CONSTRAINT curtailment_events_province_occurred_at_key 
      UNIQUE (province, occurred_at);
  END IF;
END $$;

COMMIT;
