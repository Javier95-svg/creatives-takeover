-- Create table to persist BizMap AI wizard progress per user
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text,
  current_step integer not null default 0,
  answers jsonb not null default '{}'::jsonb,
  launch_report text,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful index for queries by user and recency
create index if not exists idx_chat_sessions_user_updated_at
  on public.chat_sessions (user_id, updated_at desc);

-- Enable Row Level Security
alter table public.chat_sessions enable row level security;

-- RLS policies: users can fully manage only their own sessions
drop policy if exists "Users can view their own chat sessions" on public.chat_sessions;
create policy "Users can view their own chat sessions"
  on public.chat_sessions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own chat sessions" on public.chat_sessions;
create policy "Users can insert their own chat sessions"
  on public.chat_sessions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own chat sessions" on public.chat_sessions;
create policy "Users can update their own chat sessions"
  on public.chat_sessions
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own chat sessions" on public.chat_sessions;
create policy "Users can delete their own chat sessions"
  on public.chat_sessions
  for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on updates
drop trigger if exists update_chat_sessions_updated_at on public.chat_sessions;
create trigger update_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.update_updated_at_column();