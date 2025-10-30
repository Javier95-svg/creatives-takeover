-- Activity events for critical user actions
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event text not null,
  properties jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_user_created_idx on public.activity_events (user_id, created_at desc);
create index if not exists activity_events_event_created_idx on public.activity_events (event, created_at desc);

alter table if exists public.activity_events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='activity_events' and policyname='activity_events_insert_self') then
    create policy "activity_events_insert_self" on public.activity_events for insert with check ( user_id is null or user_id = auth.uid() );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='activity_events' and policyname='activity_events_select_self_or_public') then
    create policy "activity_events_select_self_or_public" on public.activity_events for select using ( true );
  end if;
end $$;


