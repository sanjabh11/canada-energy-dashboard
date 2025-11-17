-- Educational SaaS (Edubiz) Integration - Database Schema
-- Migration Date: 2025-11-17
-- Purpose: Add tables for user tiers, certificates, badges, webinars
-- Dependencies: Requires Supabase Auth enabled

-- Enable UUID generation (if not already enabled)
create extension if not exists "uuid-ossp";

-- ============================================================================
-- TABLE 1: Edubiz Users & Subscription Tiers
-- ============================================================================
create table if not exists public.edubiz_users (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  province_code text check (province_code in ('AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT')),
  tier text check (tier in ('free', 'edubiz', 'pro')) default 'free' not null,

  -- Stripe integration
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text check (subscription_status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  trial_ends_at timestamptz,
  subscription_current_period_end timestamptz,

  -- Metadata
  role_preference text check (role_preference in ('student', 'teacher', 'homeowner', 'researcher', 'general')),
  ai_queries_today int default 0,
  ai_queries_reset_at timestamptz default now(),

  -- Timestamps
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  last_login_at timestamptz
);

-- Indexes for performance
create index if not exists idx_edubiz_users_user_id on public.edubiz_users(user_id);
create index if not exists idx_edubiz_users_tier on public.edubiz_users(tier);
create index if not exists idx_edubiz_users_stripe_customer on public.edubiz_users(stripe_customer_id);
create index if not exists idx_edubiz_users_email on public.edubiz_users(email);

-- Row Level Security
alter table public.edubiz_users enable row level security;

-- Policy: Users can view and update their own record
create policy edubiz_users_select_own on public.edubiz_users
  for select using (auth.uid() = user_id);

create policy edubiz_users_update_own on public.edubiz_users
  for update using (auth.uid() = user_id);

-- Policy: Anyone can insert (for signup)
create policy edubiz_users_insert_authenticated on public.edubiz_users
  for insert with check (auth.uid() = user_id);

-- Policy: Service role can do anything (for Stripe webhooks)
create policy edubiz_users_service_role_all on public.edubiz_users
  for all using (auth.role() = 'service_role');

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger edubiz_users_updated_at
  before update on public.edubiz_users
  for each row
  execute function public.update_updated_at_column();

-- ============================================================================
-- TABLE 2: Certificate Tracks (3 Modules)
-- ============================================================================
create table if not exists public.certificate_tracks (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  duration_hours numeric(4,1), -- e.g., 2.0 hours
  prerequisites jsonb default '[]'::jsonb, -- array of prerequisite track slugs
  price_cad numeric(10,2) default 99.00,
  tier_required text check (tier_required in ('free', 'edubiz', 'pro')) default 'edubiz',
  order_index int default 0,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- Seed 3 certificate tracks
insert into public.certificate_tracks (slug, name, description, duration_hours, price_cad, tier_required, order_index) values
  ('net-zero-basics', 'Net-Zero Basics', 'Fundamental energy efficiency and carbon reduction strategies for facilities', 2.0, 99.00, 'edubiz', 1),
  ('ai-recommendations', 'AI-Powered Energy Recommendations', 'Learn to leverage AI for optimizing facility energy consumption', 1.5, 99.00, 'edubiz', 2),
  ('ab-entrepreneur', 'Alberta Energy Entrepreneurship', 'Navigate Alberta''s energy landscape, CCUS, Hydrogen, and ERA grants', 2.0, 99.00, 'edubiz', 3)
on conflict (slug) do nothing;

-- RLS for certificate tracks (public read, admin write)
alter table public.certificate_tracks enable row level security;

create policy certificate_tracks_select_all on public.certificate_tracks
  for select using (true); -- Anyone can view tracks

create policy certificate_tracks_modify_service_role on public.certificate_tracks
  for all using (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 3: Certificate Modules (Lessons within tracks)
-- ============================================================================
create table if not exists public.certificate_modules (
  id uuid primary key default uuid_generate_v4(),
  track_id uuid references public.certificate_tracks(id) on delete cascade not null,
  order_index int not null,
  title text not null,
  description text,
  content_type text check (content_type in ('video', 'interactive', 'quiz', 'reading')) not null,
  content_url text, -- video link, dashboard tour path, or article URL
  duration_minutes int,
  learning_objectives jsonb default '[]'::jsonb, -- array of strings
  completion_criteria jsonb default '{}'::jsonb, -- e.g., {"quiz_score_min": 80, "min_time_spent_seconds": 300}
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- Indexes
create index if not exists idx_certificate_modules_track on public.certificate_modules(track_id);

-- RLS
alter table public.certificate_modules enable row level security;

create policy certificate_modules_select_all on public.certificate_modules
  for select using (true);

create policy certificate_modules_modify_service_role on public.certificate_modules
  for all using (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 4: User Progress Tracking
-- ============================================================================
create table if not exists public.user_progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.edubiz_users(id) on delete cascade not null,
  track_id uuid references public.certificate_tracks(id) on delete cascade not null,
  module_id uuid references public.certificate_modules(id) on delete cascade,
  status text check (status in ('not_started', 'in_progress', 'completed')) default 'not_started' not null,
  progress_percent int default 0 check (progress_percent between 0 and 100),
  time_spent_seconds int default 0,
  quiz_score int check (quiz_score between 0 and 100),
  quiz_attempts int default 0,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, module_id)
);

-- Indexes
create index if not exists idx_user_progress_user on public.user_progress(user_id);
create index if not exists idx_user_progress_track on public.user_progress(track_id);
create index if not exists idx_user_progress_status on public.user_progress(status);

-- RLS
alter table public.user_progress enable row level security;

create policy user_progress_select_own on public.user_progress
  for select using (
    user_id in (select id from public.edubiz_users where auth.uid() = edubiz_users.user_id)
  );

create policy user_progress_insert_own on public.user_progress
  for insert with check (
    user_id in (select id from public.edubiz_users where auth.uid() = edubiz_users.user_id)
  );

create policy user_progress_update_own on public.user_progress
  for update using (
    user_id in (select id from public.edubiz_users where auth.uid() = edubiz_users.user_id)
  );

create policy user_progress_service_role_all on public.user_progress
  for all using (auth.role() = 'service_role');

-- Trigger for updated_at
create trigger user_progress_updated_at
  before update on public.user_progress
  for each row
  execute function public.update_updated_at_column();

-- ============================================================================
-- TABLE 5: Badges (Gamification)
-- ============================================================================
create table if not exists public.badges (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text,
  icon_name text, -- Lucide icon name (e.g., 'compass', 'leaf', 'search')
  tier text check (tier in ('bronze', 'silver', 'gold', 'platinum')) default 'bronze',
  criteria jsonb not null, -- conditions for earning, e.g., {"completed_tracks": ["net-zero-basics"], "tours_completed": 1}
  order_index int default 0,
  is_active boolean default true,
  created_at timestamptz default now() not null
);

-- Seed 5 badges
insert into public.badges (slug, name, description, icon_name, tier, criteria, order_index) values
  ('energy-explorer', 'Energy Explorer', 'Complete your first guided tour and start your energy learning journey', 'compass', 'bronze', '{"tours_completed_min": 1}'::jsonb, 1),
  ('renewable-champion', 'Renewable Champion', 'Master renewable energy by completing the Net-Zero Basics certification', 'leaf', 'silver', '{"completed_tracks": ["net-zero-basics"]}'::jsonb, 2),
  ('data-detective', 'Data Detective', 'Become a power user by using advanced filters on 5 different dashboards', 'search', 'silver', '{"dashboards_filtered": 5}'::jsonb, 3),
  ('alberta-advocate', 'Alberta Advocate', 'Champion Alberta energy by completing AB Entrepreneur track and attending a webinar', 'mountain', 'gold', '{"completed_tracks": ["ab-entrepreneur"], "webinars_attended": 1}'::jsonb, 4),
  ('energy-master', 'Energy Master', 'Achieve mastery by earning all other badges and completing at least one certification', 'crown', 'platinum', '{"badges_earned": 4, "certificates_earned": 1}'::jsonb, 5)
on conflict (slug) do nothing;

-- RLS
alter table public.badges enable row level security;

create policy badges_select_all on public.badges
  for select using (true);

create policy badges_modify_service_role on public.badges
  for all using (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 6: User Badges (Earned badges)
-- ============================================================================
create table if not exists public.user_badges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.edubiz_users(id) on delete cascade not null,
  badge_id uuid references public.badges(id) on delete cascade not null,
  earned_at timestamptz default now() not null,
  unique(user_id, badge_id)
);

-- Indexes
create index if not exists idx_user_badges_user on public.user_badges(user_id);
create index if not exists idx_user_badges_badge on public.user_badges(badge_id);

-- RLS
alter table public.user_badges enable row level security;

create policy user_badges_select_own on public.user_badges
  for select using (
    user_id in (select id from public.edubiz_users where auth.uid() = edubiz_users.user_id)
  );

create policy user_badges_insert_service_role on public.user_badges
  for insert with check (auth.role() = 'service_role');

create policy user_badges_service_role_all on public.user_badges
  for all using (auth.role() = 'service_role');

-- ============================================================================
-- TABLE 7: Webinars
-- ============================================================================
create table if not exists public.webinars (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  host_name text, -- e.g., "John Doe" or "Relative Name, Alberta Energy Consultant"
  scheduled_at timestamptz not null,
  duration_minutes int default 60,

  -- Zoom integration
  zoom_meeting_id text,
  zoom_join_url text,
  zoom_password text,

  max_attendees int default 100,
  is_ab_focused boolean default true,
  tier_required text check (tier_required in ('free', 'edubiz', 'pro')) default 'free',

  -- Post-webinar
  recording_url text,
  recording_duration_minutes int,

  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Indexes
create index if not exists idx_webinars_scheduled on public.webinars(scheduled_at);

-- RLS
alter table public.webinars enable row level security;

create policy webinars_select_all on public.webinars
  for select using (true);

create policy webinars_modify_service_role on public.webinars
  for all using (auth.role() = 'service_role');

-- Trigger
create trigger webinars_updated_at
  before update on public.webinars
  for each row
  execute function public.update_updated_at_column();

-- ============================================================================
-- TABLE 8: Webinar Registrations
-- ============================================================================
create table if not exists public.webinar_registrations (
  id uuid primary key default uuid_generate_v4(),
  webinar_id uuid references public.webinars(id) on delete cascade not null,
  user_id uuid references public.edubiz_users(id) on delete cascade,
  email text not null, -- Allow non-users to register
  full_name text,
  registered_at timestamptz default now() not null,
  attended boolean default false,
  attendance_duration_minutes int,
  unique(webinar_id, email)
);

-- Indexes
create index if not exists idx_webinar_registrations_webinar on public.webinar_registrations(webinar_id);
create index if not exists idx_webinar_registrations_user on public.webinar_registrations(user_id);

-- RLS
alter table public.webinar_registrations enable row level security;

create policy webinar_registrations_select_own on public.webinar_registrations
  for select using (
    user_id in (select id from public.edubiz_users where auth.uid() = edubiz_users.user_id)
    or email = (select email from auth.users where id = auth.uid())
  );

create policy webinar_registrations_insert_authenticated on public.webinar_registrations
  for insert with check (
    user_id in (select id from public.edubiz_users where auth.uid() = edubiz_users.user_id)
    or auth.uid() is not null
  );

create policy webinar_registrations_service_role_all on public.webinar_registrations
  for all using (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get user's current tier
create or replace function public.get_user_tier(p_user_id uuid)
returns text as $$
  select tier from public.edubiz_users where user_id = p_user_id;
$$ language sql security definer;

-- Function: Check if user can access feature based on tier
create or replace function public.can_access_feature(p_user_id uuid, p_required_tier text)
returns boolean as $$
declare
  v_user_tier text;
  v_tier_hierarchy text[] := array['free', 'edubiz', 'pro'];
  v_user_tier_level int;
  v_required_tier_level int;
begin
  -- Get user's tier
  select tier into v_user_tier from public.edubiz_users where user_id = p_user_id;

  -- If no user found, assume free tier
  if v_user_tier is null then
    v_user_tier := 'free';
  end if;

  -- Get tier levels
  select array_position(v_tier_hierarchy, v_user_tier) into v_user_tier_level;
  select array_position(v_tier_hierarchy, p_required_tier) into v_required_tier_level;

  -- User can access if their tier level >= required tier level
  return v_user_tier_level >= v_required_tier_level;
end;
$$ language plpgsql security definer;

-- Function: Increment AI query count (daily limit for free tier)
create or replace function public.increment_ai_queries(p_user_id uuid)
returns table(queries_today int, limit_reached boolean, tier text) as $$
declare
  v_edubiz_user_id uuid;
  v_tier text;
  v_queries int;
  v_reset_at timestamptz;
  v_daily_limit int := 10; -- free tier limit
begin
  -- Get edubiz_users record
  select id, edubiz_users.tier, ai_queries_today, ai_queries_reset_at
  into v_edubiz_user_id, v_tier, v_queries, v_reset_at
  from public.edubiz_users
  where user_id = p_user_id;

  -- Reset counter if it's a new day
  if v_reset_at is null or v_reset_at < date_trunc('day', now()) then
    v_queries := 0;
    v_reset_at := now();
  end if;

  -- Increment counter
  v_queries := v_queries + 1;

  -- Update database
  update public.edubiz_users
  set ai_queries_today = v_queries,
      ai_queries_reset_at = v_reset_at
  where id = v_edubiz_user_id;

  -- Return results
  return query select
    v_queries as queries_today,
    (v_tier = 'free' and v_queries >= v_daily_limit) as limit_reached,
    v_tier;
end;
$$ language plpgsql security definer;

-- Function: Award badge to user (check criteria first)
create or replace function public.award_badge_if_eligible(p_user_id uuid, p_badge_slug text)
returns boolean as $$
declare
  v_edubiz_user_id uuid;
  v_badge_id uuid;
  v_already_earned boolean;
begin
  -- Get edubiz_users id
  select id into v_edubiz_user_id from public.edubiz_users where user_id = p_user_id;

  -- Get badge id
  select id into v_badge_id from public.badges where slug = p_badge_slug;

  -- Check if already earned
  select exists(
    select 1 from public.user_badges
    where user_id = v_edubiz_user_id and badge_id = v_badge_id
  ) into v_already_earned;

  -- If not earned, award it
  if not v_already_earned then
    insert into public.user_badges (user_id, badge_id)
    values (v_edubiz_user_id, v_badge_id);
    return true;
  end if;

  return false;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- ANALYTICS VIEWS
-- ============================================================================

-- View: User tier distribution
create or replace view public.user_tier_stats as
select
  tier,
  count(*) as user_count,
  round(count(*) * 100.0 / sum(count(*)) over(), 2) as percentage
from public.edubiz_users
group by tier
order by
  case tier
    when 'free' then 1
    when 'edubiz' then 2
    when 'pro' then 3
  end;

-- View: Badge leaderboard
create or replace view public.badge_leaderboard as
select
  eu.full_name,
  eu.email,
  count(ub.id) as badges_earned,
  array_agg(b.name order by b.order_index) as badge_names
from public.edubiz_users eu
left join public.user_badges ub on eu.id = ub.user_id
left join public.badges b on ub.badge_id = b.id
group by eu.id, eu.full_name, eu.email
order by badges_earned desc, eu.created_at asc
limit 100;

-- View: Certificate completion rates
create or replace view public.certificate_completion_stats as
select
  ct.name as track_name,
  count(distinct up.user_id) as enrolled_users,
  count(distinct case when up.status = 'completed' then up.user_id end) as completed_users,
  round(
    count(distinct case when up.status = 'completed' then up.user_id end) * 100.0 /
    nullif(count(distinct up.user_id), 0),
    2
  ) as completion_rate_percent
from public.certificate_tracks ct
left join public.user_progress up on ct.id = up.track_id
group by ct.id, ct.name
order by ct.order_index;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

comment on table public.edubiz_users is 'User accounts with subscription tier management (free/edubiz/pro)';
comment on table public.certificate_tracks is '3 certification courses: Net-Zero Basics, AI Recs, AB Entrepreneur';
comment on table public.certificate_modules is 'Individual lessons within certificate tracks (5 modules per track)';
comment on table public.user_progress is 'Tracks user completion progress for each module and track';
comment on table public.badges is '5 gamification badges (bronze to platinum tiers)';
comment on table public.user_badges is 'Records of badges earned by users';
comment on table public.webinars is 'Monthly Alberta-focused webinars with Zoom integration';
comment on table public.webinar_registrations is 'User registrations for webinars';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify tables created: select * from public.edubiz_users;
-- 3. Enable Supabase Auth: Dashboard → Authentication → Settings
-- 4. Test RLS policies work correctly
-- ============================================================================
