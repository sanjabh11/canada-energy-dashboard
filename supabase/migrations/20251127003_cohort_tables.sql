-- Cohort-based learning tables for Edubiz

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  owner_edubiz_user_id uuid references public.edubiz_users(id) on delete cascade not null,
  name text not null,
  description text,
  start_date date,
  end_date date,
  status text check (status in ('draft','upcoming','active','completed','archived')) default 'draft' not null,
  max_learners int,
  stripe_price_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_cohorts_owner on public.cohorts(owner_edubiz_user_id);
create index if not exists idx_cohorts_status on public.cohorts(status);

alter table public.cohorts enable row level security;

create policy cohorts_select_own on public.cohorts
  for select
  using (
    owner_edubiz_user_id in (
      select id from public.edubiz_users where user_id = auth.uid()
    )
  );

create policy cohorts_insert_own on public.cohorts
  for insert
  with check (
    owner_edubiz_user_id in (
      select id from public.edubiz_users where user_id = auth.uid()
    )
  );

create policy cohorts_update_own on public.cohorts
  for update
  using (
    owner_edubiz_user_id in (
      select id from public.edubiz_users where user_id = auth.uid()
    )
  );

create policy cohorts_delete_own on public.cohorts
  for delete
  using (
    owner_edubiz_user_id in (
      select id from public.edubiz_users where user_id = auth.uid()
    )
  );

create policy cohorts_service_role_all on public.cohorts
  for all
  using (auth.role() = 'service_role');

create table if not exists public.cohort_members (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.cohorts(id) on delete cascade not null,
  learner_edubiz_user_id uuid references public.edubiz_users(id) on delete set null,
  learner_email text not null,
  learner_full_name text,
  role text check (role in ('learner','instructor','assistant')) default 'learner' not null,
  invited_at timestamptz default now() not null,
  joined_at timestamptz,
  completion_status text check (completion_status in ('not_started','in_progress','completed','withdrawn')) default 'not_started' not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_cohort_members_cohort on public.cohort_members(cohort_id);
create index if not exists idx_cohort_members_learner on public.cohort_members(learner_edubiz_user_id);

alter table public.cohort_members enable row level security;

create policy cohort_members_select_owner_or_self on public.cohort_members
  for select
  using (
    exists (
      select 1
      from public.cohorts c
      join public.edubiz_users eu on eu.id = c.owner_edubiz_user_id
      where c.id = cohort_members.cohort_id
        and eu.user_id = auth.uid()
    )
    or
    learner_edubiz_user_id in (
      select id from public.edubiz_users where user_id = auth.uid()
    )
  );

create policy cohort_members_insert_owner on public.cohort_members
  for insert
  with check (
    exists (
      select 1
      from public.cohorts c
      join public.edubiz_users eu on eu.id = c.owner_edubiz_user_id
      where c.id = cohort_id
        and eu.user_id = auth.uid()
    )
  );

create policy cohort_members_update_owner on public.cohort_members
  for update
  using (
    exists (
      select 1
      from public.cohorts c
      join public.edubiz_users eu on eu.id = c.owner_edubiz_user_id
      where c.id = cohort_members.cohort_id
        and eu.user_id = auth.uid()
    )
  );

create policy cohort_members_delete_owner on public.cohort_members
  for delete
  using (
    exists (
      select 1
      from public.cohorts c
      join public.edubiz_users eu on eu.id = c.owner_edubiz_user_id
      where c.id = cohort_members.cohort_id
        and eu.user_id = auth.uid()
    )
  );

create policy cohort_members_service_role_all on public.cohort_members
  for all
  using (auth.role() = 'service_role');
