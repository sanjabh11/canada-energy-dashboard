-- LLM integration schemas and policies
-- Requires pgcrypto for gen_random_uuid(); enable if not already
-- create extension if not exists pgcrypto;

-- 1) LLM call log
create table if not exists public.llm_call_log (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  endpoint text not null,
  dataset_path text,
  panel_id text,
  user_id text,
  prompt text,
  response_summary text,
  provenance jsonb,
  status_code int,
  duration_ms int,
  cost_usd numeric(10,4),
  meta jsonb
);

alter table public.llm_call_log enable row level security;

-- 2) LLM feedback
create table if not exists public.llm_feedback (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  user_id text,
  endpoint text not null,
  feedback text check (feedback in ('up','down')),
  detail jsonb
);

alter table public.llm_feedback enable row level security;

-- 3) Simple rate limit counters (optional)
create table if not exists public.llm_rate_limit (
  user_id text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, window_start)
);

alter table public.llm_rate_limit enable row level security;

-- RLS policies: restrict to service role only by default
-- Allow service role full access
create policy llm_call_log_service_role on public.llm_call_log
  for all to authenticated
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy llm_feedback_service_role on public.llm_feedback
  for all to authenticated
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy llm_rate_limit_service_role on public.llm_rate_limit
  for all to authenticated
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- Optional: allow anonymous inserts for feedback only, if desired
-- create policy llm_feedback_anon_insert on public.llm_feedback
--   for insert to anon using (true) with check (true);

-- Harden schema additions (idempotent)
alter table if exists public.llm_call_log
  add column if not exists token_cost numeric(12,0);

-- Optional: store PII redaction summary
alter table if exists public.llm_call_log
  add column if not exists redaction_summary jsonb;

alter table if exists public.llm_rate_limit
  add column if not exists user_quota integer default 60,
  add column if not exists last_reset timestamptz default now();

create index if not exists llm_rate_limit_user_id_idx on public.llm_rate_limit (user_id);

-- Atomic rate-limit increment function (service role will call via RPC)
create or replace function public.llm_rl_increment(
  p_user_id text,
  p_window timestamptz,
  p_default_limit integer
) returns table(count integer, user_quota integer)
language sql
as $$
  insert into public.llm_rate_limit(user_id, window_start, count)
  values (p_user_id, p_window, 1)
  on conflict (user_id, window_start) do update
    set count = public.llm_rate_limit.count + 1,
        last_reset = now(),
        user_quota = coalesce(public.llm_rate_limit.user_quota, p_default_limit)
  returning public.llm_rate_limit.count, coalesce(public.llm_rate_limit.user_quota, p_default_limit);
$$;

-- Retention helpers
create or replace function public.llm_purge_old()
returns void language sql as $$
  delete from public.llm_call_log where ts < now() - interval '180 days';
  delete from public.llm_feedback where ts < now() - interval '365 days';
$$;

-- Daily spend materialized view and refresh helper
create materialized view if not exists public.mv_llm_daily_spend as
select date_trunc('day', ts) as day,
       endpoint,
       sum(coalesce(token_cost,0)) as tokens,
       sum(coalesce(cost_usd,0)) as spend_usd,
       count(*) as calls
from public.llm_call_log
group by day, endpoint
order by day desc;

create or replace function public.refresh_mv_llm_daily_spend()
returns void language sql as $$
  refresh materialized view public.mv_llm_daily_spend;
$$;
