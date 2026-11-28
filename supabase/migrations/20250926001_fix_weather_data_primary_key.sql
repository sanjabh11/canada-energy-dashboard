-- Repair weather_data primary key before dependent upsert logic.
--
-- 20250104002_create_missing_tables.sql creates weather_data with
-- PRIMARY KEY (timestamp) only, but the canonical schema (used by the
-- 20250927 seed upsert ON CONFLICT (timestamp, station_id) and by
-- multi-station ingestion) requires the composite key. On the hosted
-- replay this caused the 20250927 ON CONFLICT clause to fail because the
-- single-column pkey already satisfied the conname guard.
--
-- Ported from target-only migration `20250927_fix_weather_data_primary_key`
-- applied during the qktgjpbifknqjpvrgkrj migration (deviation ledger entry).
-- Ordered after 20250104002 and before 20250927_create_missing_core_tables.
BEGIN;

-- Backfill missing station ids (PK columns are implicitly NOT NULL).
UPDATE public.weather_data SET station_id = 'UNKNOWN' WHERE station_id IS NULL;

-- Drop duplicate (timestamp, station_id) rows, keeping the newest.
DELETE FROM public.weather_data a
USING public.weather_data b
WHERE a.timestamp = b.timestamp
  AND a.station_id = b.station_id
  AND (a.created_at < b.created_at
       OR (a.created_at = b.created_at AND a.ctid < b.ctid));

ALTER TABLE public.weather_data
  DROP CONSTRAINT IF EXISTS weather_data_pkey;

ALTER TABLE public.weather_data
  ADD CONSTRAINT weather_data_pkey PRIMARY KEY (timestamp, station_id);

COMMIT;
