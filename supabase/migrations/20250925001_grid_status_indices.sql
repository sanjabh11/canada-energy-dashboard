-- Ensure grid_status snapshots stay unique per region/timestamp
-- Adds supporting indexes for upsert-heavy ingestion

BEGIN;

-- Spread out any duplicate snapshots so we can enforce uniqueness going forward
WITH ranked AS (
  SELECT id,
         captured_at,
         region,
         row_number() OVER (PARTITION BY region, captured_at ORDER BY id) AS rn
  FROM public.grid_status
)
UPDATE public.grid_status gs
SET captured_at = gs.captured_at + (ranked.rn - 1) * interval '1 second'
FROM ranked
WHERE gs.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_grid_status_region_captured_at
  ON public.grid_status (region, captured_at);

CREATE INDEX IF NOT EXISTS idx_grid_recommendations_region_generated
  ON public.grid_recommendations (region, generated_at DESC);

COMMIT;
