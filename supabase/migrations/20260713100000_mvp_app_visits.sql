-- Platform-verified visitor tracking for published MVP Builder sites.
-- One row per (project, visitor, day). Inserted only by the mvp-app-visit edge
-- function (service role); owners can read their own rows. Feeds the Traction
-- Engine retention snapshot autofill and the verified traction report.

create table if not exists public.mvp_app_visits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  user_id uuid not null,
  visitor_id text not null,
  visit_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (project_id, visitor_id, visit_date)
);

create index if not exists mvp_app_visits_user_date_idx
  on public.mvp_app_visits (user_id, visit_date);

alter table public.mvp_app_visits enable row level security;

drop policy if exists "Owners read their app visits" on public.mvp_app_visits;
create policy "Owners read their app visits"
  on public.mvp_app_visits for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies: writes go through the service role only.

-- Retention snapshot aggregates for the calling user, across all their
-- published projects. Week starts Monday to match tractionEngine.ts
-- getCurrentWeekStart (date_trunc('week') is ISO Monday).
create or replace function public.get_mvp_retention_snapshot()
returns table (
  new_users_week integer,
  seven_day_active integer,
  thirty_day_active integer,
  total_visitors integer,
  tracked_since date
)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select visitor_id, visit_date
    from public.mvp_app_visits
    where user_id = auth.uid()
  ),
  firsts as (
    select visitor_id, min(visit_date) as first_date
    from mine
    group by visitor_id
  )
  select
    (select count(*) from firsts where first_date >= date_trunc('week', current_date)::date)::integer,
    (select count(distinct visitor_id) from mine where visit_date >= current_date - 6)::integer,
    (select count(distinct visitor_id) from mine where visit_date >= current_date - 29)::integer,
    (select count(*) from firsts)::integer,
    (select min(visit_date) from mine);
$$;

revoke all on function public.get_mvp_retention_snapshot() from public;
grant execute on function public.get_mvp_retention_snapshot() to authenticated;
