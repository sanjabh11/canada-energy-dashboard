-- ============================================================================
-- RENEWABLE ENERGY FORECASTING & OPTIMIZATION SYSTEM - COMPLETE MIGRATION
-- Purpose: Create all Phase 2 tables + extended fields in one script
-- Execute this in Supabase SQL Editor
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLE 1: RENEWABLE FORECASTS
-- ============================================================================
create table if not exists public.renewable_forecasts (
  id uuid primary key default gen_random_uuid(),
  province text not null check (province in (
    'ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'PE', 'NL', 'YT', 'NT', 'NU'
  )),
  source_type text not null check (source_type in ('solar', 'wind', 'hydro', 'mixed')),
  forecast_horizon_hours int not null check (forecast_horizon_hours in (1, 3, 6, 12, 24, 48)),
  predicted_output_mw numeric(10,2) not null check (predicted_output_mw >= 0),
  confidence_interval_lower_mw numeric(10,2),
  confidence_interval_upper_mw numeric(10,2),
  confidence_level text check (confidence_level in ('high', 'medium', 'low')),
  confidence_score numeric(3,2) check (confidence_score >= 0 and confidence_score <= 1),
  weather_data jsonb,
  model_version text not null default '1.0.0',
  model_type text check (model_type in ('persistence', 'arima', 'xgboost', 'lstm', 'ensemble')),
  feature_importance jsonb,
  generated_at timestamptz not null default now(),
  valid_at timestamptz not null,
  has_actual boolean default false,
  error_calculated boolean default false,
  notes text,
  created_by text default 'system'
);

create index if not exists idx_renewable_forecasts_province on public.renewable_forecasts(province);
create index if not exists idx_renewable_forecasts_valid_at on public.renewable_forecasts(valid_at desc);
create index if not exists idx_renewable_forecasts_lookup on public.renewable_forecasts(province, source_type, valid_at desc);

alter table public.renewable_forecasts enable row level security;
drop policy if exists renewable_forecasts_read_all on public.renewable_forecasts;
create policy renewable_forecasts_read_all on public.renewable_forecasts for select to anon, authenticated using (true);
drop policy if exists renewable_forecasts_insert_service on public.renewable_forecasts;
create policy renewable_forecasts_insert_service on public.renewable_forecasts for insert to authenticated with check (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 2: FORECAST ACTUALS
-- ============================================================================
create table if not exists public.forecast_actuals (
  id uuid primary key default gen_random_uuid(),
  forecast_id uuid not null references public.renewable_forecasts(id) on delete cascade,
  actual_output_mw numeric(10,2) not null check (actual_output_mw >= 0),
  error_mw numeric(10,2),
  absolute_error_mw numeric(10,2),
  error_percent numeric(6,2),
  absolute_percentage_error numeric(6,2),
  squared_error numeric(15,4),
  data_source text check (data_source in ('ieso', 'aeso', 'bc_hydro', 'hydro_quebec', 'manual')),
  recorded_at timestamptz not null default now(),
  valid_for timestamptz not null,
  notes text
);

create index if not exists idx_forecast_actuals_forecast_id on public.forecast_actuals(forecast_id);
alter table public.forecast_actuals enable row level security;
drop policy if exists forecast_actuals_read_all on public.forecast_actuals;
create policy forecast_actuals_read_all on public.forecast_actuals for select to anon, authenticated using (true);
drop policy if exists forecast_actuals_insert_service on public.forecast_actuals;
create policy forecast_actuals_insert_service on public.forecast_actuals for insert to authenticated with check (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 3: FORECAST PERFORMANCE
-- ============================================================================
create table if not exists public.forecast_performance (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  source_type text not null,
  horizon_hours int not null,
  model_version text not null,
  period_start date not null,
  period_end date not null,
  mae_mw numeric(10,2),
  mae_percent numeric(6,2),
  mape_percent numeric(6,2),
  rmse_mw numeric(10,2),
  bias_mw numeric(10,2),
  forecast_count int not null check (forecast_count > 0),
  avg_predicted_mw numeric(10,2),
  avg_actual_mw numeric(10,2),
  improvement_vs_baseline numeric(6,2),
  calculated_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_forecast_performance_lookup on public.forecast_performance(province, source_type, period_start desc);
alter table public.forecast_performance enable row level security;
drop policy if exists forecast_performance_read_all on public.forecast_performance;
create policy forecast_performance_read_all on public.forecast_performance for select to anon, authenticated using (true);
drop policy if exists forecast_performance_insert_service on public.forecast_performance;
create policy forecast_performance_insert_service on public.forecast_performance for insert to authenticated with check (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 4: WEATHER OBSERVATIONS
-- ============================================================================
create table if not exists public.weather_observations (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  station_id text,
  latitude numeric(8,5),
  longitude numeric(8,5),
  temperature_c numeric(5,2),
  humidity_percent numeric(5,2),
  wind_speed_ms numeric(5,2),
  wind_direction_deg numeric(5,2),
  cloud_cover_percent numeric(5,2),
  solar_radiation_wm2 numeric(8,2),
  precipitation_mm numeric(6,2),
  condition_code text,
  source text not null check (source in ('environment_canada', 'openweathermap', 'weatherapi')),
  observed_at timestamptz not null,
  received_at timestamptz not null default now(),
  raw_data jsonb
);

create index if not exists idx_weather_observations_recent on public.weather_observations(province, observed_at desc);
alter table public.weather_observations enable row level security;
drop policy if exists weather_observations_read_all on public.weather_observations;
create policy weather_observations_read_all on public.weather_observations for select to anon, authenticated using (true);
drop policy if exists weather_observations_insert_service on public.weather_observations;
create policy weather_observations_insert_service on public.weather_observations for insert to authenticated with check (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 5: CURTAILMENT EVENTS
-- ============================================================================
create table if not exists public.curtailment_events (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  source_type text not null check (source_type in ('solar', 'wind', 'hydro', 'mixed')),
  curtailed_mw numeric(10,2) not null check (curtailed_mw > 0),
  available_capacity_mw numeric(10,2),
  curtailment_percent numeric(5,2),
  duration_hours numeric(8,2),
  total_energy_curtailed_mwh numeric(12,2),
  reason text not null check (reason in (
    'transmission_congestion', 'oversupply', 'negative_pricing',
    'frequency_regulation', 'voltage_constraint', 'other'
  )),
  reason_detail text,
  market_price_cad_per_mwh numeric(8,2),
  opportunity_cost_cad numeric(12,2),
  grid_demand_mw numeric(10,2),
  mitigation_actions jsonb,
  mitigation_effective boolean,
  occurred_at timestamptz not null,
  ended_at timestamptz,
  detected_at timestamptz not null default now(),
  data_source text,
  notes text
);

create index if not exists idx_curtailment_events_province on public.curtailment_events(province);
create index if not exists idx_curtailment_events_occurred_at on public.curtailment_events(occurred_at desc);
alter table public.curtailment_events enable row level security;
drop policy if exists curtailment_events_read_all on public.curtailment_events;
create policy curtailment_events_read_all on public.curtailment_events for select to anon, authenticated using (true);
drop policy if exists curtailment_events_insert_service on public.curtailment_events;
create policy curtailment_events_insert_service on public.curtailment_events for insert to authenticated with check (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 6: CURTAILMENT REDUCTION RECOMMENDATIONS (WITH EXTENDED FIELDS)
-- ============================================================================
create table if not exists public.curtailment_reduction_recommendations (
  id uuid primary key default gen_random_uuid(),
  curtailment_event_id uuid references public.curtailment_events(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in (
    'demand_response', 'storage_charge', 'export_intertie', 'industrial_load_shift'
  )),
  target_mw numeric(10,2) not null,
  expected_reduction_mw numeric(10,2) not null,
  confidence numeric(3,2) not null check (confidence >= 0 and confidence <= 1),
  priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
  reasoning text,
  model_version text,
  implementation_cost_cad numeric(10,2),
  expected_benefit_cad numeric(10,2),
  recommendation_status text check (recommendation_status in (
    'pending', 'approved', 'rejected', 'implemented', 'failed'
  )) default 'pending',
  actual_reduction_mw numeric(10,2),
  generated_at timestamptz not null default now(),
  notes text,
  -- Extended fields for dashboard
  implemented boolean default false,
  estimated_mwh_saved numeric(10,2),
  actual_mwh_saved numeric(10,2),
  estimated_cost_cad numeric(10,2),
  actual_cost_cad numeric(10,2),
  estimated_revenue_cad numeric(10,2),
  cost_benefit_ratio numeric(10,2),
  confidence_score numeric(3,2),
  llm_reasoning text,
  recommended_actions text[],
  implementation_timeline text,
  responsible_party text,
  effectiveness_rating numeric(3,2)
);

create index if not exists idx_curtailment_recommendations_event on public.curtailment_reduction_recommendations(curtailment_event_id);
alter table public.curtailment_reduction_recommendations enable row level security;
drop policy if exists curtailment_recommendations_read_all on public.curtailment_reduction_recommendations;
create policy curtailment_recommendations_read_all on public.curtailment_reduction_recommendations for select to anon, authenticated using (true);
drop policy if exists curtailment_recommendations_insert_service on public.curtailment_reduction_recommendations;
create policy curtailment_recommendations_insert_service on public.curtailment_reduction_recommendations for insert to authenticated with check (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 7: STORAGE DISPATCH LOG
-- ============================================================================
create table if not exists public.storage_dispatch_log (
  id uuid primary key default gen_random_uuid(),
  battery_id text not null,
  battery_name text,
  province text not null,
  decision_timestamp timestamptz not null,
  action text not null check (action in ('charge', 'discharge', 'hold')),
  magnitude_mw numeric(10,2) check (magnitude_mw >= 0),
  duration_minutes int,
  soc_before_percent numeric(5,2) check (soc_before_percent >= 0 and soc_before_percent <= 100),
  soc_after_percent numeric(5,2) check (soc_after_percent >= 0 and soc_after_percent <= 100),
  capacity_mwh numeric(10,2),
  grid_price_cad_per_mwh numeric(8,2),
  grid_demand_mw numeric(10,2),
  renewable_curtailment_risk boolean default false,
  grid_service_provided text check (grid_service_provided in (
    'arbitrage', 'peak_shaving', 'frequency_regulation', 'renewable_absorption'
  )),
  energy_mwh numeric(10,4),
  revenue_impact_cad numeric(10,2),
  round_trip_efficiency_percent numeric(5,2),
  decision_source text check (decision_source in ('ai_optimization', 'manual', 'pre_scheduled')),
  model_version text,
  confidence_score numeric(3,2),
  reasoning text,
  execution_status text check (execution_status in ('pending', 'executing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_storage_dispatch_battery on public.storage_dispatch_log(battery_id);
create index if not exists idx_storage_dispatch_timestamp on public.storage_dispatch_log(decision_timestamp desc);
alter table public.storage_dispatch_log enable row level security;
drop policy if exists storage_dispatch_read_all on public.storage_dispatch_log;
create policy storage_dispatch_read_all on public.storage_dispatch_log for select to anon, authenticated using (true);
drop policy if exists storage_dispatch_insert_service on public.storage_dispatch_log;
create policy storage_dispatch_insert_service on public.storage_dispatch_log for insert to authenticated with check (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 8: RENEWABLE CAPACITY REGISTRY
-- ============================================================================
create table if not exists public.renewable_capacity_registry (
  id uuid primary key default gen_random_uuid(),
  province text not null,
  facility_name text not null,
  facility_type text check (facility_type in ('solar_farm', 'wind_farm', 'hydro_dam', 'battery_storage')),
  nameplate_capacity_mw numeric(10,2) not null check (nameplate_capacity_mw > 0),
  technology text,
  latitude numeric(8,5),
  longitude numeric(8,5),
  operational_status text check (operational_status in ('operational', 'under_construction', 'planned')),
  commissioned_date date,
  owner_name text,
  is_indigenous_owned boolean default false,
  typical_capacity_factor numeric(4,3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_capacity_registry_province on public.renewable_capacity_registry(province);
alter table public.renewable_capacity_registry enable row level security;
drop policy if exists capacity_registry_read_all on public.renewable_capacity_registry;
create policy capacity_registry_read_all on public.renewable_capacity_registry for select to anon, authenticated using (true);
drop policy if exists capacity_registry_insert_service on public.renewable_capacity_registry;
create policy capacity_registry_insert_service on public.renewable_capacity_registry for insert to authenticated with check (auth.role() = 'service_role');

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

create or replace function public.calculate_forecast_error(p_forecast_id uuid, p_actual_mw numeric)
returns void language plpgsql as $$
declare v_predicted_mw numeric; v_error_mw numeric;
begin
  select predicted_output_mw into v_predicted_mw from public.renewable_forecasts where id = p_forecast_id;
  v_error_mw := p_actual_mw - v_predicted_mw;
  insert into public.forecast_actuals (forecast_id, actual_output_mw, error_mw, absolute_error_mw, error_percent, absolute_percentage_error, squared_error, valid_for)
  select p_forecast_id, p_actual_mw, v_error_mw, abs(v_error_mw), 
    case when p_actual_mw = 0 then 0 else (v_error_mw / p_actual_mw) * 100 end,
    case when p_actual_mw = 0 then 0 else abs((v_error_mw / p_actual_mw) * 100) end,
    power(v_error_mw, 2), valid_at from public.renewable_forecasts where id = p_forecast_id;
  update public.renewable_forecasts set has_actual = true, error_calculated = true where id = p_forecast_id;
end; $$;

create or replace function public.aggregate_forecast_performance(
  p_province text, p_source_type text, p_horizon_hours int, p_start_date date, p_end_date date
) returns uuid language plpgsql as $$
declare v_performance_id uuid; v_mae_mw numeric; v_mape_percent numeric; v_count int;
begin
  select avg(abs(fa.error_mw)), avg(abs(fa.error_percent)), count(*)
  into v_mae_mw, v_mape_percent, v_count
  from public.forecast_actuals fa
  join public.renewable_forecasts rf on fa.forecast_id = rf.id
  where rf.province = p_province and rf.source_type = p_source_type 
    and rf.forecast_horizon_hours = p_horizon_hours
    and rf.valid_at::date between p_start_date and p_end_date;
  if v_count = 0 then return null; end if;
  insert into public.forecast_performance (province, source_type, horizon_hours, model_version, period_start, period_end, mae_mw, mape_percent, forecast_count)
  values (p_province, p_source_type, p_horizon_hours, '1.0.0', p_start_date, p_end_date, v_mae_mw, v_mape_percent, v_count)
  returning id into v_performance_id;
  return v_performance_id;
end; $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
do $$
begin
  raise notice '✅ Phase 2 tables created successfully';
  raise notice '✅ Extended recommendation fields added';
  raise notice '✅ All indexes and policies configured';
  raise notice '✅ Utility functions deployed';
end $$;
