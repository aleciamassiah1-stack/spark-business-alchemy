-- App roles + admin role infrastructure (security definer pattern)
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- RLS for user_roles: users can read their own; admins manage all
create policy "Users read own roles" on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins read all roles" on public.user_roles
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins insert roles" on public.user_roles
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins delete roles" on public.user_roles
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all subscriptions for the dashboard
create policy "Admins read all subscriptions" on public.subscriptions
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Helper: is the calling user an admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin')
$$;

-- Comp/manual access table: lets admins grant access without a Stripe charge
create table public.manual_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  granted_by uuid references auth.users(id) on delete set null,
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.manual_access enable row level security;

create policy "Users read own manual access" on public.manual_access
  for select to authenticated
  using (auth.uid() = user_id);

create policy "Admins manage manual access" on public.manual_access
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Update has_active_subscription to also honor manual_access grants and admin role
create or replace function public.has_active_subscription(user_uuid uuid, check_env text default 'live')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Admins always have access
    public.has_role(user_uuid, 'admin')
    -- Manually granted access (unexpired)
    or exists (
      select 1 from public.manual_access
      where user_id = user_uuid
        and (expires_at is null or expires_at > now())
    )
    -- Active or trialing paid subscription
    or exists (
      select 1 from public.subscriptions
      where user_id = user_uuid
        and environment = check_env
        and (
          (status in ('active', 'trialing') and (current_period_end is null or current_period_end > now()))
          or (status = 'canceled' and current_period_end > now())
        )
    )
$$;
