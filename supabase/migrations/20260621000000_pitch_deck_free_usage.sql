-- Pitch Deck Analyzer: anonymous free-tier metering.
-- Each IP gets a fixed number of free analyses (default 1). After that, visitors
-- must sign up and every analysis is credit-metered. We track attempts per IP so
-- the free try can't be farmed by clearing cookies/local state.

create table if not exists public.pitch_deck_free_usage (
  ip text primary key,
  attempts integer not null default 0,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now()
);

-- Only the service role (edge function) ever touches this table. Enable RLS with
-- no policies so anon/authenticated clients can't read or write it.
alter table public.pitch_deck_free_usage enable row level security;

-- Atomically reserve one free attempt for an IP. Returns true if the attempt is
-- allowed (and records it), false once the IP has hit p_max. The row lock makes
-- this safe against concurrent/parallel requests from the same IP.
create or replace function public.consume_pitch_deck_free_attempt(p_ip text, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur integer;
begin
  insert into public.pitch_deck_free_usage (ip, attempts)
  values (p_ip, 0)
  on conflict (ip) do nothing;

  select attempts into cur from public.pitch_deck_free_usage where ip = p_ip for update;

  if cur >= p_max then
    return false;
  end if;

  update public.pitch_deck_free_usage
  set attempts = attempts + 1, last_attempt_at = now()
  where ip = p_ip;

  return true;
end;
$$;

-- Give back a reserved attempt when the analysis fails, so a transient error
-- doesn't burn the visitor's free try.
create or replace function public.release_pitch_deck_free_attempt(p_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pitch_deck_free_usage
  set attempts = greatest(attempts - 1, 0)
  where ip = p_ip;
end;
$$;

revoke all on function public.consume_pitch_deck_free_attempt(text, integer) from public, anon, authenticated;
revoke all on function public.release_pitch_deck_free_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_pitch_deck_free_attempt(text, integer) to service_role;
grant execute on function public.release_pitch_deck_free_attempt(text) to service_role;
