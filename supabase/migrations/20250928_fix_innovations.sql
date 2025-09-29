-- Fix innovations table by adding missing columns
-- This is a simple migration to add the required columns

BEGIN;

-- Add missing columns one by one
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS innovation_name text;
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS technology_category text;
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS current_trl smallint;
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS target_trl smallint;
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS key_technologies text[];
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS primary_benefits text[];
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS technical_challenges text[];
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS market_maturity text DEFAULT 'early';
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS development_stage text DEFAULT 'concept';
ALTER TABLE public.innovations ADD COLUMN IF NOT EXISTS lead_organization text;

-- Simple seed data
INSERT INTO public.innovations (innovation_name, technology_category, description, current_trl, target_trl, market_maturity, development_stage, lead_organization)
SELECT * FROM (VALUES
  ('Advanced Flow Battery Storage', 'battery_storage', 'Long-duration energy storage using vanadium redox flow technology', 7, 9, 'growth', 'pilot', 'Canadian Battery Innovation Centre'),
  ('AI-Powered Grid Optimization', 'smart_grid', 'Machine learning for real-time grid balancing and optimization', 6, 8, 'growth', 'prototype', 'University of Toronto'),
  ('Solar Tracking with IoT', 'renewable_energy', 'Dual-axis solar tracking with predictive weather optimization', 8, 9, 'mature', 'commercial', 'SolarTech Canada')
) AS v(innovation_name, technology_category, description, current_trl, target_trl, market_maturity, development_stage, lead_organization)
WHERE NOT EXISTS (SELECT 1 FROM public.innovations WHERE innovation_name = v.innovation_name);

COMMIT;
