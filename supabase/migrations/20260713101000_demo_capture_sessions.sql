-- Live click-through capture sessions for Demo Studio. The founder starts a
-- session in the demo editor, opens their published MVP with a capture hash,
-- and the injected capture script records each click (page HTML + coords) and
-- posts it to demo-capture-ingest keyed by this row's unguessable id. The
-- editor polls for completion and imports the steps client-side (DOMPurify +
-- sandboxed iframe rendering, same as manual HTML import).

create table if not exists public.demo_capture_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  demo_id uuid not null,
  project_id uuid,
  source_url text,
  status text not null default 'pending' check (status in ('pending', 'complete')),
  steps jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists demo_capture_sessions_user_idx
  on public.demo_capture_sessions (user_id, created_at desc);

alter table public.demo_capture_sessions enable row level security;

drop policy if exists "Owners read their capture sessions" on public.demo_capture_sessions;
create policy "Owners read their capture sessions"
  on public.demo_capture_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Owners create their capture sessions" on public.demo_capture_sessions;
create policy "Owners create their capture sessions"
  on public.demo_capture_sessions for insert
  with check (auth.uid() = user_id);

-- Step writes come only from the demo-capture-ingest edge function (service role).
