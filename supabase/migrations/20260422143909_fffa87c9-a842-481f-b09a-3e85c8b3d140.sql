-- Auto-grant admin role to the configured admin email on signup.
-- We avoid hardcoding the email by using a trigger that checks against a settings row.
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
create policy "Admins manage app_settings" on public.app_settings
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Authenticated read app_settings" on public.app_settings
  for select to authenticated using (true);

insert into public.app_settings (key, value) values ('admin_email', 'aleciamassiah1@gmail.com')
  on conflict (key) do update set value = excluded.value, updated_at = now();

create or replace function public.handle_new_user_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  configured_admin text;
begin
  select value into configured_admin from public.app_settings where key = 'admin_email';
  if configured_admin is not null and lower(new.email) = lower(configured_admin) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin')
      on conflict (user_id, role) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_admin on auth.users;
create trigger on_auth_user_created_admin
  after insert on auth.users
  for each row execute function public.handle_new_user_admin();
