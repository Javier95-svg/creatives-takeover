create table if not exists public.bizmap_shared_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('icp', 'pmf', 'gtm')),
  source_id uuid not null,
  slug text not null unique,
  title text not null,
  summary text not null,
  snapshot jsonb not null default '{}'::jsonb,
  visibility text not null default 'unlisted' check (visibility in ('private', 'unlisted', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz not null default now()
);

create unique index if not exists idx_bizmap_shared_outputs_source
  on public.bizmap_shared_outputs (user_id, source_type, source_id);

create index if not exists idx_bizmap_shared_outputs_slug
  on public.bizmap_shared_outputs (slug);

create index if not exists idx_bizmap_shared_outputs_visibility
  on public.bizmap_shared_outputs (visibility);

alter table public.bizmap_shared_outputs enable row level security;

drop policy if exists "Users manage their own BizMap shared outputs" on public.bizmap_shared_outputs;
create policy "Users manage their own BizMap shared outputs"
  on public.bizmap_shared_outputs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Public can read shareable BizMap outputs" on public.bizmap_shared_outputs;
create policy "Public can read shareable BizMap outputs"
  on public.bizmap_shared_outputs
  for select
  using (visibility in ('unlisted', 'public'));

create or replace function public.update_bizmap_shared_outputs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bizmap_shared_outputs_updated_at on public.bizmap_shared_outputs;
create trigger trg_bizmap_shared_outputs_updated_at
before update on public.bizmap_shared_outputs
for each row
execute function public.update_bizmap_shared_outputs_updated_at();
