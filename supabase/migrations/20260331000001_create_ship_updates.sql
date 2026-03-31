-- Community "What did you ship this week?" feed
create table if not exists public.ship_updates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 280),
  stage       text,           -- e.g. 'stage_i', 'stage_ii', 'stage_iii'
  created_at  timestamptz not null default now()
);

-- Prevent more than 1 post per user per day
create unique index if not exists ship_updates_user_day
  on public.ship_updates (user_id, date_trunc('day', created_at at time zone 'utc'));

create index if not exists ship_updates_created_at_desc
  on public.ship_updates (created_at desc);

-- RLS: authenticated users can read all, write their own
alter table public.ship_updates enable row level security;

create policy "ship_updates_read_all" on public.ship_updates
  for select using (true);

create policy "ship_updates_insert_own" on public.ship_updates
  for insert with check (auth.uid() = user_id);

create policy "ship_updates_delete_own" on public.ship_updates
  for delete using (auth.uid() = user_id);
