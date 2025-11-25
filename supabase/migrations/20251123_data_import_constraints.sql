-- 20251123_data_import_constraints.sql
-- Unique constraints to support idempotent ESG and industrial data imports

-- Ensure one ESG ratings row per company (use DO block for idempotency)
DO $$
BEGIN
  -- Only attempt to add the constraint if the table exists
  IF to_regclass('public.esg_ratings') IS NOT NULL THEN
    -- Deduplicate by company: keep the lowest-id row and delete the rest
    DELETE FROM esg_ratings e
    USING esg_ratings e2
    WHERE e.company = e2.company
      AND e.id > e2.id;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'esg_ratings_company_unique' 
      AND conrelid = 'esg_ratings'::regclass
    ) THEN
      ALTER TABLE esg_ratings ADD CONSTRAINT esg_ratings_company_unique UNIQUE (company);
    END IF;
  END IF;
END $$;

-- Ensure one facility emissions row per facility per reporting year
DO $$
BEGIN
  -- Only attempt to add the constraint if the table exists
  IF to_regclass('public.facility_emissions') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'facility_emissions_facility_year_unique' 
      AND conrelid = 'facility_emissions'::regclass
    ) THEN
      ALTER TABLE facility_emissions ADD CONSTRAINT facility_emissions_facility_year_unique UNIQUE (facility_name, reporting_year);
    END IF;
  END IF;
END $$;
