-- Add missing fields to curtailment_reduction_recommendations table
-- These fields are used by the CurtailmentAnalyticsDashboard component

-- Add fields for tracking implementation and effectiveness
alter table public.curtailment_reduction_recommendations
  add column if not exists implemented boolean default false,
  add column if not exists estimated_mwh_saved numeric(10,2),
  add column if not exists actual_mwh_saved numeric(10,2),
  add column if not exists estimated_cost_cad numeric(10,2),
  add column if not exists actual_cost_cad numeric(10,2),
  add column if not exists estimated_revenue_cad numeric(10,2),
  add column if not exists cost_benefit_ratio numeric(10,2),
  add column if not exists confidence_score numeric(3,2),
  add column if not exists llm_reasoning text,
  add column if not exists recommended_actions text[],
  add column if not exists implementation_timeline text,
  add column if not exists responsible_party text,
  add column if not exists effectiveness_rating numeric(3,2);

-- Add comment explaining the schema extension
comment on column public.curtailment_reduction_recommendations.implemented is 'Whether the recommendation has been implemented';
comment on column public.curtailment_reduction_recommendations.estimated_mwh_saved is 'Estimated energy saved in MWh';
comment on column public.curtailment_reduction_recommendations.actual_mwh_saved is 'Actual energy saved in MWh after implementation';
comment on column public.curtailment_reduction_recommendations.estimated_cost_cad is 'Estimated implementation cost in CAD';
comment on column public.curtailment_reduction_recommendations.actual_cost_cad is 'Actual implementation cost in CAD';
comment on column public.curtailment_reduction_recommendations.estimated_revenue_cad is 'Estimated revenue benefit in CAD';
comment on column public.curtailment_reduction_recommendations.cost_benefit_ratio is 'Ratio of benefit to cost';
comment on column public.curtailment_reduction_recommendations.confidence_score is 'AI confidence score (0-1)';
comment on column public.curtailment_reduction_recommendations.llm_reasoning is 'LLM-generated reasoning for the recommendation';
comment on column public.curtailment_reduction_recommendations.recommended_actions is 'Array of recommended action steps';
comment on column public.curtailment_reduction_recommendations.implementation_timeline is 'Expected timeline for implementation';
comment on column public.curtailment_reduction_recommendations.responsible_party is 'Party responsible for implementation';
comment on column public.curtailment_reduction_recommendations.effectiveness_rating is 'Post-implementation effectiveness rating (0-1)';
