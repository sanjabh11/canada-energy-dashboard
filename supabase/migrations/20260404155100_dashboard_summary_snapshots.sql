CREATE TABLE IF NOT EXISTS public.dashboard_summary_snapshots (
  dashboard_key TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  summary_payload JSONB NOT NULL,
  source_label TEXT,
  source_updated_at TIMESTAMPTZ,
  snapshot_stored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_partial BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dashboard_key, variant_key)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_summary_snapshots_dashboard_key
  ON public.dashboard_summary_snapshots(dashboard_key);

CREATE INDEX IF NOT EXISTS idx_dashboard_summary_snapshots_snapshot_stored_at
  ON public.dashboard_summary_snapshots(snapshot_stored_at DESC);

CREATE OR REPLACE FUNCTION public.set_dashboard_summary_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dashboard_summary_snapshots_updated_at ON public.dashboard_summary_snapshots;
CREATE TRIGGER trg_dashboard_summary_snapshots_updated_at
BEFORE UPDATE ON public.dashboard_summary_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_summary_snapshots_updated_at();

ALTER TABLE public.dashboard_summary_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to dashboard summary snapshots" ON public.dashboard_summary_snapshots;
CREATE POLICY "Allow public read access to dashboard summary snapshots"
  ON public.dashboard_summary_snapshots
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.dashboard_summary_snapshots IS 'Persisted dashboard summary snapshots for truthful degraded-mode fallback.';
