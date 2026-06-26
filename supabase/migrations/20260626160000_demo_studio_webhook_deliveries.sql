-- Demo Studio webhook delivery reliability: log every outbound webhook attempt for a
-- launch-page signup, so failures are visible and can be retried with backoff (by the
-- demo-studio-webhook-retry function on a 5-min cron). Owner can read their own; only
-- the service role (edge functions) writes.

create table if not exists public.demo_studio_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.demo_studio_projects(id) on delete cascade,
  signup_id uuid references public.demo_studio_signups(id) on delete set null,
  webhook_url text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','success','failed','exhausted')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  last_status_code int,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists demo_studio_webhook_deliveries_due_idx
  on public.demo_studio_webhook_deliveries (status, next_attempt_at);
create index if not exists demo_studio_webhook_deliveries_project_idx
  on public.demo_studio_webhook_deliveries (project_id, created_at desc);

alter table public.demo_studio_webhook_deliveries enable row level security;

-- Owner can read their project's deliveries (mirrors demo_studio_events_owner_read).
drop policy if exists demo_studio_webhook_deliveries_owner_read on public.demo_studio_webhook_deliveries;
create policy demo_studio_webhook_deliveries_owner_read
  on public.demo_studio_webhook_deliveries for select
  using (exists (
    select 1 from public.demo_studio_projects p
    where p.id = demo_studio_webhook_deliveries.project_id and p.owner_id = auth.uid()
  ));
-- No anon/authenticated insert/update policies: writes happen via the service role only.
