-- FIX: Data import constraints (PostgreSQL-compatible syntax)
-- Run this in Supabase SQL Editor

-- Add unique constraint on esg_ratings.company if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'esg_ratings_company_unique' 
    AND conrelid = 'esg_ratings'::regclass
  ) THEN
    ALTER TABLE esg_ratings ADD CONSTRAINT esg_ratings_company_unique UNIQUE (company);
  END IF;
END $$;

-- Add unique constraint on facility_emissions (facility_name, reporting_year) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'facility_emissions_facility_year_unique' 
    AND conrelid = 'facility_emissions'::regclass
  ) THEN
    ALTER TABLE facility_emissions ADD CONSTRAINT facility_emissions_facility_year_unique UNIQUE (facility_name, reporting_year);
  END IF;
END $$;

SELECT 'Data import constraints applied' AS status;
