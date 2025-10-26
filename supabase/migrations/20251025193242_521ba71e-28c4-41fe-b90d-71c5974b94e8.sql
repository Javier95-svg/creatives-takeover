-- Create the user_roles table if it doesn't exist
create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    created_at timestamp with time zone default now(),
    unique (user_id, role)
);

-- Enable Row-Level Security
alter table public.user_roles enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own roles" on public.user_roles;
drop policy if exists "Admins can view all roles" on public.user_roles;

-- Create a security definer function to check roles (create or replace)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS Policies
create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can view all roles"
on public.user_roles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));