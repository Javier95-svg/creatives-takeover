-- Tracks retention emails sent to users to prevent duplicates
create table if not exists public.retention_email_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  sequence    text not null,  -- 'activation_nudge' | 'progress_nudge' | 'reengagement'
  sent_at     timestamptz not null default now(),
  resend_id   text
);

-- Index for dedup checks
create index if not exists retention_email_log_user_sequence_sent
  on public.retention_email_log (user_id, sequence, sent_at);

-- RLS: only service role can write; no user-facing reads needed
alter table public.retention_email_log enable row level security;

create policy "service_role_all" on public.retention_email_log
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
