-- Security tables alignment migration
-- Adds missing columns and seeds baseline records for dashboards

BEGIN;

-- Extend threat models to include UI-required fields
ALTER TABLE public.threat_models
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS affected_assets text[],
  ADD COLUMN IF NOT EXISTS mitigation_strategies text[],
  ADD COLUMN IF NOT EXISTS detection_methods text[];

-- Extend security incidents with response metadata
ALTER TABLE public.security_incidents
  ADD COLUMN IF NOT EXISTS affected_systems text[],
  ADD COLUMN IF NOT EXISTS response_time_minutes integer,
  ADD COLUMN IF NOT EXISTS resolution_time_minutes integer;

-- Extend mitigation strategies with priority and ownership
ALTER TABLE public.mitigation_strategies
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS responsible_party text;

-- Seed canonical threat model (idempotent)
INSERT INTO public.threat_models (
  id, category, vector, likelihood, impact, mitigation_summary,
  severity, description, affected_assets, mitigation_strategies, detection_methods, last_reviewed
)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  'cyber',
  'SCADA credential compromise',
  0.65,
  0.85,
  'Rotate credentials, implement MFA, isolate control networks.',
  'high',
  'Credential reuse attempt detected against SCADA operator accounts.',
  ARRAY['Ontario Control Center', 'Backup SCADA Node'],
  ARRAY['Zero-trust rollout', 'Privileged access reviews'],
  ARRAY['SIEM alerting', 'Network anomaly detection'],
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.threat_models WHERE id = '11111111-1111-1111-1111-111111111111'
);

-- Seed mitigation strategy tied to canonical threat
INSERT INTO public.mitigation_strategies (
  id, strategy_name, description, effectiveness, cost_estimate,
  time_to_implement_days, related_threat, status, priority, responsible_party, last_updated
)
SELECT
  '33333333-3333-3333-3333-333333333333'::uuid,
  'Deploy MFA for SCADA operators',
  'Roll out hardware token MFA for all privileged SCADA accounts.',
  0.75,
  250000,
  30,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'in_progress',
  'high',
  'Operations Security Team',
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.mitigation_strategies WHERE id = '33333333-3333-3333-3333-333333333333'
);

-- Seed representative security incidents
INSERT INTO public.security_incidents (
  id, incident_type, description, severity, likelihood, status,
  detected_at, resolved_at, region, asset, metadata,
  affected_systems, response_time_minutes, resolution_time_minutes
)
SELECT
  '22222222-2222-2222-2222-222222222222'::uuid,
  'cyber_intrusion',
  'Unauthorized VPN access attempt detected and blocked.',
  'medium',
  'possible',
  'contained',
  now() - interval '4 hours',
  now() - interval '2 hours',
  'Ontario',
  'Ontario Control Center',
  jsonb_build_object('source', 'seed', 'notes', 'Initial seed data'),
  ARRAY['VPN Gateway', 'SOC Dashboard'],
  12,
  120
WHERE NOT EXISTS (
  SELECT 1 FROM public.security_incidents WHERE id = '22222222-2222-2222-2222-222222222222'
);

-- Seed additional grid recommendations for dashboards
INSERT INTO public.grid_recommendations (
  id, region, recommendation_type, priority, description,
  expected_impact_percent, implementation_time_minutes, confidence, generated_at
)
SELECT
  '44444444-4444-4444-4444-444444444444'::uuid,
  'Ontario',
  'demand_response',
  'high',
  'Initiate industrial demand response to cover evening peak.',
  3.5,
  45,
  0.82,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.grid_recommendations WHERE id = '44444444-4444-4444-4444-444444444444'
);

COMMIT;
