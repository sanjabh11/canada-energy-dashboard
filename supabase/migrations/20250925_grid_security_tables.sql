-- Grid Operations and Security Tables Migration
-- Creates schema required for Phase 2 grid optimisation and security monitoring dashboards
-- Safe to run multiple times (idempotent via IF NOT EXISTS / ON CONFLICT)

BEGIN;

-- Grid status snapshots (near real-time)
CREATE TABLE IF NOT EXISTS public.grid_status (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  region text NOT NULL,
  demand_mw numeric(10,2) NOT NULL,
  supply_mw numeric(10,2) NOT NULL,
  reserve_margin numeric(6,3),
  frequency_hz numeric(6,4),
  voltage_kv numeric(6,3),
  congestion_index numeric(6,3),
  data_source text DEFAULT 'mock',
  status text DEFAULT 'stable',
  captured_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grid_status_region_time
  ON public.grid_status (region, captured_at DESC);

-- Aggregated stability metrics per region
CREATE TABLE IF NOT EXISTS public.grid_stability_metrics (
  region text PRIMARY KEY,
  frequency_stability numeric(6,3),
  voltage_stability numeric(6,3),
  congestion_index numeric(6,3),
  reserve_margin numeric(6,3),
  last_updated timestamptz DEFAULT now()
);

-- AI/LLM generated optimisation recommendations
CREATE TABLE IF NOT EXISTS public.grid_recommendations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  region text NOT NULL,
  recommendation_type text NOT NULL,
  priority text NOT NULL,
  description text NOT NULL,
  expected_impact_percent numeric(6,3),
  implementation_time_minutes integer,
  confidence numeric(5,2),
  generated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grid_reco_region_priority
  ON public.grid_recommendations (region, priority, generated_at DESC);

-- Security incident tracking
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_type text NOT NULL,
  description text,
  severity text NOT NULL,
  likelihood text,
  status text DEFAULT 'open',
  detected_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  region text,
  asset text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_status
  ON public.security_incidents (status, severity DESC, detected_at DESC);

-- Threat modelling catalogue
CREATE TABLE IF NOT EXISTS public.threat_models (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category text NOT NULL,
  vector text NOT NULL,
  likelihood numeric(5,2),
  impact numeric(5,2),
  mitigation_summary text,
  last_reviewed timestamptz DEFAULT now()
);

-- Mitigation strategies table
CREATE TABLE IF NOT EXISTS public.mitigation_strategies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  strategy_name text NOT NULL,
  description text,
  effectiveness numeric(5,2),
  cost_estimate numeric(12,2),
  time_to_implement_days integer,
  related_threat uuid REFERENCES public.threat_models(id) ON DELETE SET NULL,
  status text DEFAULT 'proposed',
  last_updated timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mitigation_related_threat
  ON public.mitigation_strategies (related_threat);

-- Security metrics snapshot
CREATE TABLE IF NOT EXISTS public.security_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  region text,
  overall_risk_score numeric(5,2),
  detection_rate numeric(5,2),
  mitigation_coverage numeric(5,2),
  compliance_score numeric(5,2),
  active_incidents_count integer DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_metrics_region
  ON public.security_metrics (region, last_updated DESC);

-- Seed baseline data to unblock dashboards (no-op if already present)
INSERT INTO public.grid_stability_metrics (region, frequency_stability, voltage_stability, congestion_index, reserve_margin)
VALUES
  ('Ontario', 0.98, 0.95, 0.12, 0.08),
  ('Alberta', 0.96, 0.93, 0.18, 0.05)
ON CONFLICT (region) DO UPDATE
SET
  frequency_stability = EXCLUDED.frequency_stability,
  voltage_stability = EXCLUDED.voltage_stability,
  congestion_index = EXCLUDED.congestion_index,
  reserve_margin = EXCLUDED.reserve_margin,
  last_updated = now();

INSERT INTO public.security_metrics (region, overall_risk_score, detection_rate, mitigation_coverage, compliance_score, active_incidents_count)
VALUES
  ('Ontario', 62.5, 78.0, 54.0, 88.0, 1),
  ('Alberta', 58.0, 71.0, 49.0, 82.0, 2)
ON CONFLICT DO NOTHING;

COMMIT;
