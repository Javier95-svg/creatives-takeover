-- Throttling + audit log for the send-password-reset edge function.
-- Service-role only: RLS is enabled with NO policies, so anon/authenticated
-- roles cannot read these emails; the edge function uses the service role,
-- which bypasses RLS.
create table if not exists public.password_reset_requests (
  id bigint generated always as identity primary key,
  email text not null,
  ip text,
  succeeded boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_requests_email_created_idx
  on public.password_reset_requests (email, created_at desc);

create index if not exists password_reset_requests_ip_created_idx
  on public.password_reset_requests (ip, created_at desc);

alter table public.password_reset_requests enable row level security;

comment on table public.password_reset_requests is
  'Throttling/audit log for the send-password-reset edge function. Service-role only; RLS enabled with no policies so anon/authenticated cannot read PII.';
