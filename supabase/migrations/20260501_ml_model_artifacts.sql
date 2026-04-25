BEGIN;

CREATE TABLE IF NOT EXISTS public.ml_model_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key text NOT NULL REFERENCES public.ml_model_registry(model_key),
  model_version text NOT NULL,
  artifact_sha256 text NOT NULL,
  training_data_profile text NOT NULL,
  simulator_config jsonb NOT NULL,
  metrics jsonb NOT NULL,
  artifact_size_bytes integer NOT NULL CHECK (artifact_size_bytes >= 0),
  git_commit_sha text NOT NULL,
  trained_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model_key, model_version, artifact_sha256)
);

CREATE INDEX IF NOT EXISTS idx_ml_model_artifacts_model_trained ON public.ml_model_artifacts(model_key, trained_at DESC);

ALTER TABLE public.ml_model_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ml_model_artifacts_read_all ON public.ml_model_artifacts;
CREATE POLICY ml_model_artifacts_read_all
  ON public.ml_model_artifacts
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS ml_model_artifacts_service_all ON public.ml_model_artifacts;
CREATE POLICY ml_model_artifacts_service_all
  ON public.ml_model_artifacts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON public.ml_model_artifacts TO anon, authenticated;

INSERT INTO public.ml_model_registry (model_key, model_version, domain, model_type, methodology, artifact_uri, data_sources, warnings)
VALUES
  (
    'pinn-dispatch-v2',
    'pinn-dispatch-v2',
    'dispatch',
    'simulator_calibrated_mlp',
    'Simulator-calibrated dispatch MLP trained on pandapower DC-OPF IEEE-30 scenarios.',
    'src/lib/modelWeights/dispatch-pinn-v2.json',
    '[{"name":"pandapower IEEE-30 simulator"}]'::jsonb,
    '["Simulator-calibrated runtime candidate."]'::jsonb
  ),
  (
    'pv-gnn-v2',
    'pv-gnn-v2',
    'pv_fault',
    'simulator_calibrated_gnn',
    'Simulator-calibrated PV fault graph model trained on pvlib + mv_oberrhein synthetic faults.',
    'src/lib/modelWeights/pv-gnn-v2.json',
    '[{"name":"pvlib mv_oberrhein simulator"}]'::jsonb,
    '["Simulator-calibrated runtime candidate."]'::jsonb
  )
ON CONFLICT (model_key) DO UPDATE SET
  model_version = EXCLUDED.model_version,
  methodology = EXCLUDED.methodology,
  artifact_uri = EXCLUDED.artifact_uri,
  data_sources = EXCLUDED.data_sources,
  warnings = EXCLUDED.warnings,
  updated_at = now();

COMMIT;
