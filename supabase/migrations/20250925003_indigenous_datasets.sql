-- Indigenous dashboard data tables and sample governance-safe seed

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.indigenous_territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
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
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.indigenous_projects_v2
      ADD CONSTRAINT indigenous_projects_v2_territory_id_key UNIQUE (territory_id);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
    WHEN unique_violation THEN
      -- Clean up legacy duplicates then retry once.
      WITH duplicate_projects AS (
        SELECT ctid
        FROM (
          SELECT ctid,
                 row_number() OVER (PARTITION BY territory_id ORDER BY updated_at DESC, created_at DESC) AS rn
          FROM public.indigenous_projects_v2
          WHERE territory_id IS NOT NULL
        ) ranked
        WHERE ranked.rn > 1
      )
      DELETE FROM public.indigenous_projects_v2
      WHERE ctid IN (SELECT ctid FROM duplicate_projects);

      ALTER TABLE public.indigenous_projects_v2
        ADD CONSTRAINT indigenous_projects_v2_territory_id_key UNIQUE (territory_id);
  END;
END$$;

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

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.indigenous_consultations
      ADD CONSTRAINT indigenous_consultations_territory_meeting_key UNIQUE (territory_id, meeting_date);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
    WHEN unique_violation THEN
      WITH duplicate_rows AS (
        SELECT ctid
        FROM (
          SELECT ctid,
                 row_number() OVER (PARTITION BY territory_id, meeting_date ORDER BY recorded_at DESC, id DESC) AS rn
          FROM public.indigenous_consultations
          WHERE territory_id IS NOT NULL AND meeting_date IS NOT NULL
        ) ranked
        WHERE ranked.rn > 1
      )
      DELETE FROM public.indigenous_consultations
      WHERE ctid IN (SELECT ctid FROM duplicate_rows);

      ALTER TABLE public.indigenous_consultations
        ADD CONSTRAINT indigenous_consultations_territory_meeting_key UNIQUE (territory_id, meeting_date);
  END;
END$$;

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

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.indigenous_tek_entries
      ADD CONSTRAINT indigenous_tek_entries_territory_title_key UNIQUE (territory_id, title);
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
    WHEN unique_violation THEN
      WITH duplicate_rows AS (
        SELECT ctid
        FROM (
          SELECT ctid,
                 row_number() OVER (PARTITION BY territory_id, title ORDER BY recorded_at DESC, id DESC) AS rn
          FROM public.indigenous_tek_entries
          WHERE territory_id IS NOT NULL AND title IS NOT NULL
        ) ranked
        WHERE ranked.rn > 1
      )
      DELETE FROM public.indigenous_tek_entries
      WHERE ctid IN (SELECT ctid FROM duplicate_rows);

      ALTER TABLE public.indigenous_tek_entries
        ADD CONSTRAINT indigenous_tek_entries_territory_title_key UNIQUE (territory_id, title);
  END;
END$$;

-- Insert new territories
INSERT INTO public.indigenous_territories (name, province, community, consultation_status, fpic_status, governance_status, traditional_territory, centroid)
SELECT * FROM (
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
) AS seed_data(name, province, community, consultation_status, fpic_status, governance_status, traditional_territory, centroid)
WHERE NOT EXISTS (
  SELECT 1 FROM public.indigenous_territories it WHERE it.name = seed_data.name
);

-- Update existing territories
UPDATE public.indigenous_territories it
SET
  province = seed_data.province,
  community = seed_data.community,
  consultation_status = seed_data.consultation_status,
  fpic_status = seed_data.fpic_status,
  governance_status = seed_data.governance_status,
  traditional_territory = seed_data.traditional_territory,
  centroid = seed_data.centroid,
  updated_at = now()
FROM (
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
) AS seed_data(name, province, community, consultation_status, fpic_status, governance_status, traditional_territory, centroid)
WHERE it.name = seed_data.name;

-- Insert new projects
INSERT INTO public.indigenous_projects_v2 (
  territory_id,
  name,
  community,
  energy_type,
  stage,
  consultation_status,
  fpic_status,
  governance_status,
  revenue_share_percent
)
SELECT
  t.id AS territory_id,
  CASE t.name
    WHEN 'Treaty 5 Territory' THEN 'Northern Grid Microgeneration'
    ELSE 'James Bay Storage Upgrade'
  END AS project_name,
  t.community,
  CASE t.name
    WHEN 'Treaty 5 Territory' THEN 'solar'
    ELSE 'hydro'
  END AS energy_type,
  'planning',
  t.consultation_status,
  t.fpic_status,
  t.governance_status,
  CASE t.name
    WHEN 'Treaty 5 Territory' THEN 12.5
    ELSE 9.0
  END AS revenue_share_percent
FROM public.indigenous_territories t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.indigenous_projects_v2 p
  WHERE p.territory_id = t.id
);

-- Update existing projects
UPDATE public.indigenous_projects_v2 p
SET
  community = t.community,
  stage = 'planning',
  consultation_status = t.consultation_status,
  fpic_status = t.fpic_status,
  governance_status = t.governance_status,
  revenue_share_percent = CASE t.name
    WHEN 'Treaty 5 Territory' THEN 12.5
    ELSE 9.0
  END,
  updated_at = now()
FROM public.indigenous_territories t
WHERE p.territory_id = t.id;

-- Insert consultations
INSERT INTO public.indigenous_consultations (territory_id, title, status, meeting_date, participants, outcomes)
SELECT
  t.id,
  CONCAT(t.name, ' Leadership Meeting'),
  'completed',
  CURRENT_DATE - interval '30 days',
  24,
  ARRAY['Capacity funding secured', 'Benefit sharing draft prepared']
FROM public.indigenous_territories t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.indigenous_consultations c
  WHERE c.territory_id = t.id
    AND c.meeting_date = CURRENT_DATE - interval '30 days'
);

-- Insert TEK entries
INSERT INTO public.indigenous_tek_entries (territory_id, title, category, description, custodians, recorded_at, governance_reference)
SELECT
  t.id,
  CONCAT(t.name, ' Traditional Land Use'),
  'cultural',
  'Documented seasonal travel routes and sacred water sources for infrastructure planning.',
  ARRAY['Elder Council'],
  CURRENT_DATE - interval '180 days',
  'public-domain-summary'
FROM public.indigenous_territories t
WHERE NOT EXISTS (
  SELECT 1
  FROM public.indigenous_tek_entries e
  WHERE e.territory_id = t.id
    AND e.title = CONCAT(t.name, ' Traditional Land Use')
);

COMMIT;
