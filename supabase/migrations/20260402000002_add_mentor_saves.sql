create table if not exists public.mentor_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mentor_id uuid not null references public.mentors(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists mentor_saves_user_mentor_unique
  on public.mentor_saves (user_id, mentor_id);

create index if not exists mentor_saves_user_created_idx
  on public.mentor_saves (user_id, created_at desc);

create index if not exists mentor_saves_mentor_created_idx
  on public.mentor_saves (mentor_id, created_at desc);

alter table public.mentor_saves enable row level security;

drop policy if exists "Users can view their own mentor saves" on public.mentor_saves;
create policy "Users can view their own mentor saves"
on public.mentor_saves
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own mentor saves" on public.mentor_saves;
create policy "Users can insert their own mentor saves"
on public.mentor_saves
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own mentor saves" on public.mentor_saves;
create policy "Users can delete their own mentor saves"
on public.mentor_saves
for delete
using (auth.uid() = user_id);

comment on table public.mentor_saves is
'Tracks mentors a user explicitly saved so the product can drive activation and retention loops around mentor follow-up.';
