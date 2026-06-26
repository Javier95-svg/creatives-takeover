-- Restore the rate-limit infra from 20251030191000, which is referenced by edge
-- functions (demo-studio-generator's /try path, demo-studio-lead) and DB helpers
-- but was missing on the remote project — every assert_rate_limit() call was
-- erroring, turning the anonymous paths into 500s. Idempotent: safe to re-run.

create table if not exists public.api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists api_rate_limits_key_created_idx on public.api_rate_limits (key, created_at desc);
create index if not exists api_rate_limits_user_created_idx on public.api_rate_limits (user_id, created_at desc);

create or replace function public.assert_rate_limit(p_key text, p_user_id uuid, p_max_per_minute int)
returns void language plpgsql as $$
declare
  ts_threshold timestamptz := now() - interval '60 seconds';
  cnt int;
begin
  delete from public.api_rate_limits where created_at < ts_threshold;
  select count(*) into cnt from public.api_rate_limits where key = p_key and (p_user_id is null or user_id = p_user_id) and created_at >= ts_threshold;
  if cnt >= p_max_per_minute then
    raise exception 'rate_limit_exceeded';
  end if;
  insert into public.api_rate_limits(key, user_id) values (p_key, p_user_id);
end $$;
