-- ============================================================================
-- HLO Ops Hub — Row Level Security
-- ============================================================================
-- Model: any authenticated internal user can read everything and write to the
-- operational tables (small trusted team). Admin-only for user management and
-- destructive product/settings changes. Anon has no access.
-- ============================================================================

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;

-- Enable RLS on every table.
do $$
declare t text;
begin
  foreach t in array array[
    'users','products','campaigns','content_items','sops',
    'production_tasks','orders','order_lines','import_mappings','app_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- users ----------
drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select using (auth.role() = 'authenticated');

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists users_admin_insert on public.users;
create policy users_admin_insert on public.users
  for insert with check (public.is_admin());

drop policy if exists users_admin_delete on public.users;
create policy users_admin_delete on public.users
  for delete using (public.is_admin());

-- ---------- Generic "authenticated can do everything" for operational tables ----------
do $$
declare t text;
begin
  foreach t in array array[
    'campaigns','content_items','sops','production_tasks','orders','order_lines','import_mappings'
  ] loop
    execute format('drop policy if exists %I_all on public.%I', t, t);
    execute format(
      'create policy %I_all on public.%I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'')',
      t, t
    );
  end loop;
end $$;

-- ---------- products: read for all authed, write for admin ----------
drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select using (auth.role() = 'authenticated');

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- app_settings: read for all authed, write for admin ----------
drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists settings_admin_write on public.app_settings;
create policy settings_admin_write on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());
