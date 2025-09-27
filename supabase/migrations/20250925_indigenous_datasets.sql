-- Indigenous dashboard data tables and sample governance-safe seed

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.indigenous_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  province text,
  community text,
  consultation_status text NOT NULL DEFAULT 'not_started',
  fpic_status text NOT NULL DEFAULT 'unknown',
  governance_status text NOT NULL DEFAULT 'pending',
  traditional_territory text,
  centroid geometry(Point, 4326),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.indigenous_projects_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid REFERENCES public.indigenous_territories(id) ON DELETE CASCADE,
  name text NOT NULL,
  community text,
  energy_type text,
  stage text,
  consultation_status text,
  fpic_status text,
  governance_status text,
  revenue_share_percent numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.indigenous_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid REFERENCES public.indigenous_territories(id) ON DELETE CASCADE,
  title text,
  status text,
  meeting_date date,
  participants integer,
  outcomes text[],
  recorded_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.indigenous_tek_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id uuid REFERENCES public.indigenous_territories(id) ON DELETE CASCADE,
  title text,
  category text,
  description text,
  custodians text[],
  recorded_at date,
  governance_reference text
);

INSERT INTO public.indigenous_territories (name, province, community, consultation_status, fpic_status, governance_status, traditional_territory, centroid)
VALUES
  (
    'Treaty 5 Territory',
    'Manitoba',
    'Cree, Ojibwe, Dene',
    'completed',
    'obtained',
    'approved',
    'Treaty 5 Nation',
    ST_SetSRID(ST_MakePoint(-95.0, 55.0), 4326)
  ),
  (
    'Treaty 9 Territory',
    'Ontario',
    'Ojibwe, Cree, Oji-Cree',
    'ongoing',
    'in_progress',
    'pending',
    'Treaty 9 Nation',
    ST_SetSRID(ST_MakePoint(-80.0, 50.0), 4326)
  )
ON CONFLICT (name) DO UPDATE SET
  province = EXCLUDED.province,
  community = EXCLUDED.community,
  consultation_status = EXCLUDED.consultation_status,
  fpic_status = EXCLUDED.fpic_status,
  governance_status = EXCLUDED.governance_status,
  traditional_territory = EXCLUDED.traditional_territory,
  centroid = EXCLUDED.centroid,
  updated_at = now();

INSERT INTO public.indigenous_projects_v2 (territory_id, name, community, energy_type, stage, consultation_status, fpic_status, governance_status, revenue_share_percent)
SELECT id,
  CASE name
    WHEN 'Treaty 5 Territory' THEN 'Northern Grid Microgeneration'
    ELSE 'James Bay Storage Upgrade'
  END,
  community,
  CASE name
    WHEN 'Treaty 5 Territory' THEN 'solar'
    ELSE 'hydro'
  END,
  'planning',
  consultation_status,
  fpic_status,
  governance_status,
  CASE name
    WHEN 'Treaty 5 Territory' THEN 12.5
    ELSE 9.0
  END
FROM public.indigenous_territories
ON CONFLICT (territory_id) DO UPDATE SET
  community = EXCLUDED.community,
  stage = EXCLUDED.stage,
  consultation_status = EXCLUDED.consultation_status,
  fpic_status = EXCLUDED.fpic_status,
  governance_status = EXCLUDED.governance_status,
  revenue_share_percent = EXCLUDED.revenue_share_percent,
  updated_at = now();

WITH territory_ids AS (
  SELECT id, name FROM public.indigenous_territories
)
INSERT INTO public.indigenous_consultations (territory_id, title, status, meeting_date, participants, outcomes)
SELECT
  t.id,
  CONCAT(t.name, ' Leadership Meeting'),
  'completed',
  CURRENT_DATE - interval '30 days',
  24,
  ARRAY['Capacity funding secured', 'Benefit sharing draft prepared']
FROM territory_ids t
ON CONFLICT (territory_id, meeting_date) DO NOTHING;

WITH territory_ids AS (
  SELECT id, name FROM public.indigenous_territories
)
INSERT INTO public.indigenous_tek_entries (territory_id, title, category, description, custodians, recorded_at, governance_reference)
SELECT
  t.id,
  CONCAT(t.name, ' Traditional Land Use'),
  'cultural',
  'Documented seasonal travel routes and sacred water sources for infrastructure planning.',
  ARRAY['Elder Council'],
  CURRENT_DATE - interval '180 days',
  'public-domain-summary'
FROM territory_ids t
ON CONFLICT (territory_id, title) DO NOTHING;

COMMIT;
