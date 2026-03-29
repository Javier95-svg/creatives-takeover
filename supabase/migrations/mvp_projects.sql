create table if not exists public.mvp_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text default 'Untitled Project',
  prompt_history jsonb default '[]'::jsonb,
  generated_code text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.mvp_projects enable row level security;

drop policy if exists "Users can manage their own projects" on public.mvp_projects;

create policy "Users can manage their own projects"
  on public.mvp_projects
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
