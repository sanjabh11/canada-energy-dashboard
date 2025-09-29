-- Seed provincial generation snapshots for streaming

BEGIN;

INSERT INTO public.provincial_generation (
  id,
  date,
  province_code,
  source,
  generation_gwh
)
VALUES
  (gen_random_uuid(), '2025-09-24', 'ON', 'ieso', 450.2),
  (gen_random_uuid(), '2025-09-24', 'QC', 'hydro-quebec', 612.7),
  (gen_random_uuid(), '2025-09-24', 'BC', 'bchydro', 305.4),
  (gen_random_uuid(), '2025-09-24', 'AB', 'aeso', 275.6),
  (gen_random_uuid(), '2025-09-25', 'ON', 'ieso', 462.8),
  (gen_random_uuid(), '2025-09-25', 'QC', 'hydro-quebec', 618.1),
  (gen_random_uuid(), '2025-09-25', 'BC', 'bchydro', 311.0),
  (gen_random_uuid(), '2025-09-25', 'AB', 'aeso', 280.5);

COMMIT;
