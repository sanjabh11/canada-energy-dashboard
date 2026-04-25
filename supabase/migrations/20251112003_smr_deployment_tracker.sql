-- Migration: Small Modular Reactor (SMR) Deployment Tracker
-- Created: 2025-11-12
-- Purpose: Legacy SMR tracker schema kept as a no-op because it was superseded
-- by 20251113001_smr_nuclear_tracking.sql, which defines the canonical SMR schema.
-- create no-op marker for the migration verifier

DO $$
BEGIN
  RAISE NOTICE 'Skipping legacy SMR deployment tracker migration; superseded by 20251113001_smr_nuclear_tracking.sql';
END $$;
