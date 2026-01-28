-- Create tech_stack_reports table for saved Tech Stack budgets

create table if not exists public.tech_stack_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text,
  selected_products jsonb not null,
  budget_total numeric not null default 0,
  budget_breakdown jsonb not null default '[]'::jsonb,
  has_variable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tech_stack_reports_user_created
  on public.tech_stack_reports (user_id, created_at desc);

alter table public.tech_stack_reports enable row level security;

create policy "tech_stack_reports_select_own"
  on public.tech_stack_reports
  for select
  using (auth.uid() = user_id);

create policy "tech_stack_reports_insert_own"
  on public.tech_stack_reports
  for insert
  with check (auth.uid() = user_id);

create policy "tech_stack_reports_update_own"
  on public.tech_stack_reports
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tech_stack_reports_delete_own"
  on public.tech_stack_reports
  for delete
  using (auth.uid() = user_id);

create trigger update_tech_stack_reports_updated_at
  before update on public.tech_stack_reports
  for each row execute function public.update_updated_at_column();
