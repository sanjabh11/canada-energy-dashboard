-- ML forecasting governance and adapter tables
-- Supports deterministic calculators, v1 lightweight ML scoring, and future model-service adapters.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.ml_model_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key text NOT NULL UNIQUE,
  model_version text NOT NULL,
  domain text NOT NULL,
  model_type text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'shadow', 'retired')),
  methodology text NOT NULL,
  artifact_uri text,
  feature_schema jsonb DEFAULT '{}'::jsonb,
  training_window jsonb DEFAULT '{}'::jsonb,
  data_sources jsonb DEFAULT '[]'::jsonb,
  warnings jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_forecast_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key text NOT NULL,
  model_version text NOT NULL,
  domain text NOT NULL,
  province text,
  horizon_hours integer NOT NULL CHECK (horizon_hours > 0 AND horizon_hours <= 8760),
  scenario jsonb DEFAULT '{}'::jsonb,
  run_status text NOT NULL DEFAULT 'success' CHECK (run_status IN ('success', 'failed', 'partial')),
  confidence_score numeric(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  is_fallback boolean NOT NULL DEFAULT false,
  staleness_status text NOT NULL DEFAULT 'unknown' CHECK (staleness_status IN ('fresh', 'stale', 'unknown')),
  methodology text NOT NULL,
  warnings jsonb DEFAULT '[]'::jsonb,
  data_sources jsonb DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  valid_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_forecast_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.ml_forecast_runs(id) ON DELETE CASCADE,
  valid_at timestamptz NOT NULL,
  target_name text NOT NULL,
  predicted_value numeric NOT NULL CHECK (predicted_value >= 0),
  unit text NOT NULL,
  confidence_lower numeric,
  confidence_upper numeric,
  risk_score numeric(5,4) CHECK (risk_score >= 0 AND risk_score <= 1),
  drivers jsonb DEFAULT '[]'::jsonb,
  synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_feature_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.ml_forecast_runs(id) ON DELETE SET NULL,
  model_key text NOT NULL,
  feature_name text NOT NULL,
  rank integer NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  retained boolean NOT NULL DEFAULT true,
  drop_reason text,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(model_key, feature_name, calculated_at)
);

CREATE TABLE IF NOT EXISTS public.ml_drift_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key text NOT NULL,
  domain text NOT NULL,
  province text,
  feature_name text NOT NULL,
  baseline_window tstzrange,
  recent_window tstzrange,
  distance numeric NOT NULL,
  threshold numeric NOT NULL,
  drift_detected boolean NOT NULL DEFAULT false,
  confidence_multiplier numeric(5,4) CHECK (confidence_multiplier >= 0 AND confidence_multiplier <= 1),
  recommendation text,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_group text NOT NULL,
  source_url text NOT NULL,
  source_name text,
  content_hash text NOT NULL,
  title text,
  excerpt text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  consent_scope text DEFAULT 'public',
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(source_url, content_hash)
);

CREATE TABLE IF NOT EXISTS public.ml_intelligence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id uuid REFERENCES public.ml_source_documents(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('outage', 'delay', 'interconnection', 'price_spike', 'policy', 'weather', 'other')),
  province text,
  location_name text,
  latitude numeric,
  longitude numeric,
  affected_asset text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  event_timestamp timestamptz,
  confidence_score numeric(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  summary text NOT NULL,
  source_url text,
  synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_grid_topology_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_key text NOT NULL UNIQUE,
  region text NOT NULL,
  node_type text NOT NULL CHECK (node_type IN ('generator', 'load', 'substation', 'storage', 'intertie', 'distribution')),
  status text NOT NULL DEFAULT 'online',
  capacity_mw numeric DEFAULT 0,
  latitude numeric,
  longitude numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_grid_topology_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_key text NOT NULL UNIQUE,
  region text NOT NULL,
  from_node_key text NOT NULL,
  to_node_key text NOT NULL,
  limit_mw numeric NOT NULL DEFAULT 0,
  current_mw numeric NOT NULL DEFAULT 0,
  impedance_pu numeric,
  status text NOT NULL DEFAULT 'online',
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ml_alert_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  province text,
  subject_key text,
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  claim_label text NOT NULL DEFAULT 'estimated',
  confidence_score numeric(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  warnings jsonb DEFAULT '[]'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ml_runs_domain_province ON public.ml_forecast_runs(domain, province, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_run_valid ON public.ml_forecast_predictions(run_id, valid_at);
CREATE INDEX IF NOT EXISTS idx_ml_feature_rankings_model ON public.ml_feature_rankings(model_key, retained, rank);
CREATE INDEX IF NOT EXISTS idx_ml_drift_model_feature ON public.ml_drift_metrics(model_key, feature_name, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_events_province_created ON public.ml_intelligence_events(province, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_events_type ON public.ml_intelligence_events(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_ml_topology_nodes_region ON public.ml_grid_topology_nodes(region, node_type);
CREATE INDEX IF NOT EXISTS idx_ml_topology_edges_region ON public.ml_grid_topology_edges(region, status);
CREATE INDEX IF NOT EXISTS idx_ml_alerts_type ON public.ml_alert_evaluations(alert_type, evaluated_at DESC);

ALTER TABLE public.ml_model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_forecast_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_forecast_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_feature_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_drift_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_intelligence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_grid_topology_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_grid_topology_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_alert_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ml_model_registry_read_all ON public.ml_model_registry FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ml_forecast_runs_read_all ON public.ml_forecast_runs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ml_forecast_predictions_read_all ON public.ml_forecast_predictions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ml_feature_rankings_read_all ON public.ml_feature_rankings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ml_drift_metrics_read_all ON public.ml_drift_metrics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ml_source_documents_read_all ON public.ml_source_documents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ml_intelligence_events_read_all ON public.ml_intelligence_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ml_grid_topology_nodes_read_all ON public.ml_grid_topology_nodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ml_grid_topology_edges_read_all ON public.ml_grid_topology_edges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY ml_alert_evaluations_read_all ON public.ml_alert_evaluations FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY ml_model_registry_service_all ON public.ml_model_registry FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY ml_forecast_runs_service_all ON public.ml_forecast_runs FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY ml_forecast_predictions_service_all ON public.ml_forecast_predictions FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY ml_feature_rankings_service_all ON public.ml_feature_rankings FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY ml_drift_metrics_service_all ON public.ml_drift_metrics FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY ml_source_documents_service_all ON public.ml_source_documents FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY ml_intelligence_events_service_all ON public.ml_intelligence_events FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY ml_grid_topology_nodes_service_all ON public.ml_grid_topology_nodes FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY ml_grid_topology_edges_service_all ON public.ml_grid_topology_edges FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY ml_alert_evaluations_service_all ON public.ml_alert_evaluations FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

INSERT INTO public.ml_model_registry (model_key, model_version, domain, model_type, methodology, data_sources, warnings)
VALUES
  ('tier-deterministic-v1', 'tier-deterministic-v1', 'tier', 'deterministic_simulator', 'Deterministic Alberta TIER pathway comparison with versioned pricing assumptions.', '[{"name":"Alberta TIER Regulation"}]'::jsonb, '["Verify current pricing before binding decisions."]'::jsonb),
  ('rate-watchdog-v1', 'rate-watchdog-v1', 'rate_watchdog', 'deterministic_calculator', 'RoLR-to-retailer estimated savings calculator.', '[{"name":"UCA RoLR and retailer rate sources"}]'::jsonb, '["Savings are estimates, not guarantees."]'::jsonb),
  ('svm-rfe-adapter-v1', 'svm-rfe-adapter-v1', 'feature_pruning', 'feature_ranking', 'Standardized recursive feature ranking adapter for weather/load sensor pruning.', '[]'::jsonb, '[]'::jsonb),
  ('wasserstein-drift-v1', 'wasserstein-drift-v1', 'model_monitoring', 'drift_detector', 'Quantile Wasserstein-style distance for baseline-vs-recent feature drift.', '[]'::jsonb, '[]'::jsonb),
  ('bagged-threshold-price-spike-v1', 'bagged-threshold-price-spike-v1', 'price_spike', 'threshold_ensemble', 'Bagged deterministic threshold ensemble for Alberta pool-price spike screening.', '[{"name":"AESO price/load/weather feeds"}]'::jsonb, '["Backtest before claiming uplift over persistence."]'::jsonb),
  ('constraint-grid-risk-v1', 'constraint-grid-risk-v1', 'grid_risk', 'constraint_validator', 'Constraint-aware advisory validation; not a full AC optimal power-flow solver.', '[]'::jsonb, '["PINN/GNN integrations are adapter-ready but not active solvers."]'::jsonb)
ON CONFLICT (model_key) DO UPDATE SET
  model_version = EXCLUDED.model_version,
  methodology = EXCLUDED.methodology,
  data_sources = EXCLUDED.data_sources,
  warnings = EXCLUDED.warnings,
  updated_at = now();

COMMIT;
