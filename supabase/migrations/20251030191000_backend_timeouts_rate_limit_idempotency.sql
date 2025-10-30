-- Role-level safeguards: timeouts to prevent runaway queries for anon/authenticated
alter role anon set statement_timeout = '5s';
alter role authenticated set statement_timeout = '5s';
alter role anon set idle_in_transaction_session_timeout = '5s';
alter role authenticated set idle_in_transaction_session_timeout = '5s';

-- Infra tables for rate limiting and idempotency
create table if not exists public.api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists api_rate_limits_key_created_idx on public.api_rate_limits (key, created_at desc);
create index if not exists api_rate_limits_user_created_idx on public.api_rate_limits (user_id, created_at desc);

create table if not exists public.function_idempotency (
  id text primary key,
  created_at timestamptz not null default now(),
  result jsonb,
  status text default 'completed'
);

-- Helpers: assert_rate_limit and upsert_idempotency
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

create or replace function public.idempotency_put(p_id text, p_result jsonb)
returns void language sql as $$
  insert into public.function_idempotency(id, result, status)
  values (p_id, p_result, 'completed')
  on conflict (id) do update set result = excluded.result, status='completed';
$$;

create or replace function public.idempotency_get(p_id text)
returns jsonb language sql as $$
  select result from public.function_idempotency where id = p_id;
$$;

-- Example: a capped RPC for latest posts that enforces a server-side limit + rate limit
create or replace function public.get_latest_community_posts(p_limit int default 20)
returns setof public.community_posts
language plpgsql security definer as $$
declare l_limit int := least(greatest(coalesce(p_limit,20), 1), 50);
begin
  perform public.assert_rate_limit('get_latest_community_posts', auth.uid(), 60);
  return query select * from public.community_posts order by created_at desc limit l_limit;
end $$;


