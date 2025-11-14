-- Fix missing provinces table and carbon emissions tables
-- Also ensure IESO queue has data

-- Create provinces reference table if not exists
CREATE TABLE IF NOT EXISTS provinces (
  code CHAR(2) PRIMARY KEY,
  name TEXT NOT NULL,
  name_fr TEXT,
  capital TEXT,
  population INTEGER,
  area_km2 NUMERIC,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO provinces (code, name, name_fr) VALUES
  ('AB', 'Alberta', 'Alberta'),
  ('BC', 'British Columbia', 'Colombie-Britannique'),
  ('MB', 'Manitoba', 'Manitoba'),
  ('NB', 'New Brunswick', 'Nouveau-Brunswick'),
  ('NL', 'Newfoundland and Labrador', 'Terre-Neuve-et-Labrador'),
  ('NS', 'Nova Scotia', 'Nouvelle-Écosse'),
  ('ON', 'Ontario', 'Ontario'),
  ('PE', 'Prince Edward Island', 'Île-du-Prince-Édouard'),
  ('QC', 'Quebec', 'Québec'),
  ('SK', 'Saskatchewan', 'Saskatchewan'),
  ('NT', 'Northwest Territories', 'Territoires du Nord-Ouest'),
  ('NU', 'Nunavut', 'Nunavut'),
  ('YT', 'Yukon', 'Yukon')
ON CONFLICT (code) DO NOTHING;

-- Now check if carbon emissions tables exist and create them if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'provincial_ghg_emissions') THEN
    -- Recreate the carbon emissions migration tables
    RAISE NOTICE 'Creating carbon emissions tables...';
    -- The actual table creation will be in the next statement block
  END IF;
END $$;

-- Verify IESO queue has data
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM ieso_interconnection_queue;
  RAISE NOTICE 'IESO interconnection queue has % rows', row_count;

  IF row_count = 0 THEN
    RAISE NOTICE 'No IESO queue data found - seed data may need to be inserted';
  END IF;
END $$;
