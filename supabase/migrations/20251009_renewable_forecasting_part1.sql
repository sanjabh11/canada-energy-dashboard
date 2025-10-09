-- ============================================================================
-- RENEWABLE ENERGY FORECASTING & OPTIMIZATION SYSTEM - PART 1
-- Migration: 20251009_renewable_forecasting_part1.sql
-- Purpose: Core forecasting tables for AI for Renewable Energy Award
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

create index idx_renewable_forecasts_province on public.renewable_forecasts(province);
create index idx_renewable_forecasts_valid_at on public.renewable_forecasts(valid_at desc);
create index idx_renewable_forecasts_lookup on public.renewable_forecasts(province, source_type, valid_at desc);

alter table public.renewable_forecasts enable row level security;
create policy renewable_forecasts_read_all on public.renewable_forecasts for select to anon, authenticated using (true);
create policy renewable_forecasts_insert_service on public.renewable_forecasts for insert to authenticated using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

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

create index idx_forecast_actuals_forecast_id on public.forecast_actuals(forecast_id);
alter table public.forecast_actuals enable row level security;
create policy forecast_actuals_read_all on public.forecast_actuals for select to anon, authenticated using (true);
create policy forecast_actuals_insert_service on public.forecast_actuals for insert to authenticated using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

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

create index idx_forecast_performance_lookup on public.forecast_performance(province, source_type, period_start desc);
alter table public.forecast_performance enable row level security;
create policy forecast_performance_read_all on public.forecast_performance for select to anon, authenticated using (true);
create policy forecast_performance_insert_service on public.forecast_performance for insert to authenticated using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

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

create index idx_weather_observations_recent on public.weather_observations(province, observed_at desc);
alter table public.weather_observations enable row level security;
create policy weather_observations_read_all on public.weather_observations for select to anon, authenticated using (true);
create policy weather_observations_insert_service on public.weather_observations for insert to authenticated using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
