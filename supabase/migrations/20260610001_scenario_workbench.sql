-- Migration: Scenario Workbench Substrate
-- Creates tables for Scenarios, Assumption Packs, Scenario Runs,
-- Partitioned Time-Series, and Policy Graph Relationships.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. SCENARIOS TABLE
CREATE TABLE IF NOT EXISTS public.scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  jurisdiction text NOT NULL,
  horizon_years integer[] NOT NULL,
  sectors text[] NOT NULL,
  technologies text[] NOT NULL,
  policy_levers jsonb NOT NULL DEFAULT '{}'::jsonb,
  macro_assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  demand_assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  reliability_assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  affordability_assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. ASSUMPTION PACKS TABLE
CREATE TABLE IF NOT EXISTS public.assumption_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  name text NOT NULL,
  description text,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  owner text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  reproducibility_hash text NOT NULL,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. SCENARIO RUNS TABLE
CREATE TABLE IF NOT EXISTS public.scenario_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES public.scenarios(id) ON DELETE CASCADE,
  assumption_pack_id uuid REFERENCES public.assumption_packs(id) ON DELETE SET NULL,
  model_versions jsonb NOT NULL DEFAULT '{}'::jsonb,
  input_hashes text NOT NULL,
  random_seed integer NOT NULL DEFAULT 42,
  run_status text NOT NULL CHECK (run_status IN ('pending', 'completed', 'failed')),
  warnings text[] NOT NULL DEFAULT '{}'::text[],
  outcome_series_pointers text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 4. PARTITIONED ENERGY TIME SERIES TABLE (List partitioned by geography)
CREATE TABLE IF NOT EXISTS public.energy_time_series (
  id uuid DEFAULT gen_random_uuid(),
  scenario_id uuid REFERENCES public.scenarios(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.scenario_runs(id) ON DELETE CASCADE,
  metric text NOT NULL,
  geography text NOT NULL,
  sector text NOT NULL,
  fuel text,
  technology text,
  unit text NOT NULL,
  years integer[] NOT NULL,
  values numeric[] NOT NULL,
  uncertainty_lower numeric[],
  uncertainty_upper numeric[],
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, geography)
) PARTITION BY LIST (geography);

-- Create Partitions
CREATE TABLE IF NOT EXISTS public.energy_time_series_ab
  PARTITION OF public.energy_time_series FOR VALUES IN ('AB');

CREATE TABLE IF NOT EXISTS public.energy_time_series_on
  PARTITION OF public.energy_time_series FOR VALUES IN ('ON');

CREATE TABLE IF NOT EXISTS public.energy_time_series_other
  PARTITION OF public.energy_time_series DEFAULT;

-- 5. POLICY RELATIONSHIP GRAPH TABLES
CREATE TABLE IF NOT EXISTS public.policy_graph_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type text NOT NULL,
  name text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.policy_graph_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id uuid REFERENCES public.policy_graph_nodes(id) ON DELETE CASCADE,
  target_node_id uuid REFERENCES public.policy_graph_nodes(id) ON DELETE CASCADE,
  edge_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_node_id, target_node_id, edge_type)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_energy_time_series_metric ON public.energy_time_series(metric);
CREATE INDEX IF NOT EXISTS idx_energy_time_series_run ON public.energy_time_series(run_id);
CREATE INDEX IF NOT EXISTS idx_policy_graph_edges_source ON public.policy_graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_policy_graph_edges_target ON public.policy_graph_edges(target_node_id);

-- Enable RLS
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assumption_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_time_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_graph_edges ENABLE ROW LEVEL SECURITY;

-- Select policies (Public read-only access)
CREATE POLICY scenarios_read_all ON public.scenarios FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY assumption_packs_read_all ON public.assumption_packs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY scenario_runs_read_all ON public.scenario_runs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY energy_time_series_read_all ON public.energy_time_series FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY policy_graph_nodes_read_all ON public.policy_graph_nodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY policy_graph_edges_read_all ON public.policy_graph_edges FOR SELECT TO anon, authenticated USING (true);

-- Service Role policies (Full write access)
CREATE POLICY scenarios_service_all ON public.scenarios FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY assumption_packs_service_all ON public.assumption_packs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY scenario_runs_service_all ON public.scenario_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY energy_time_series_service_all ON public.energy_time_series FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY policy_graph_nodes_service_all ON public.policy_graph_nodes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY policy_graph_edges_service_all ON public.policy_graph_edges FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
