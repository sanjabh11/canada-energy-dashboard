-- Create the missing LLM rate limiting table and function
create table if not exists public.llm_rate_limit (
  user_id text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (user_id, window_start)
);

-- Create the missing function that the LLM Edge Function expects
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
        last_reset = now()
  returning public.llm_rate_limit.count, p_default_limit;
$$;

-- Enable RLS on the rate limit table
alter table public.llm_rate_limit enable row level security;

-- Allow service role full access (the LLM function runs with service role)
create policy if not exists llm_rate_limit_service_role on public.llm_rate_limit
  for all to authenticated
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');