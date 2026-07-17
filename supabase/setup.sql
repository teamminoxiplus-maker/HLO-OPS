-- ============================================================================
-- HLO Ops Hub + MINOXIPLUS Assessment — combined setup
-- ============================================================================
-- One-shot bootstrap: paste this whole file into the Supabase SQL editor and
-- run it once on a fresh project. It is the 5 migrations concatenated in order:
--   0001 schema · 0002 rls · 0003 views · 0004 assessments · 0005 assessments_rls
-- Safe to re-run (idempotent-ish: guarded enums, IF NOT EXISTS, drop-then-create
-- policies). For demo data, run supabase/seed.sql afterwards.
-- Generated from supabase/migrations/*.sql — edit those, then regenerate.
-- ============================================================================



-- ####################################################################
-- ## BEGIN 0001_schema.sql
-- ####################################################################

-- ============================================================================
-- HLO Ops Hub — Core schema
-- Happy Life Organics Internal Operations Portal
-- ============================================================================
-- Postgres / Supabase. Run in the Supabase SQL editor or via `supabase db push`.
-- Idempotent-ish: uses IF NOT EXISTS where practical. Enums are created guarded.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type department as enum ('marketing', 'production', 'fulfillment', 'accounting', 'management');
exception when duplicate_object then null; end $$;

do $$ begin
  create type brand_line as enum ('minoxiplus', 'pet_care', 'personal_care', 'home_care');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_platform as enum ('shopee', 'lazada', 'tiktok_shop', 'facebook', 'instagram', 'tiktok', 'viber', 'email', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_type as enum ('reel', 'image_post', 'carousel', 'live', 'email_blast', 'product_listing', 'voucher_promo', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status as enum ('idea', 'drafting', 'for_review', 'approved', 'scheduled', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status as enum ('planning', 'live', 'ended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sop_category as enum ('formulation', 'sample_making', 'packaging', 'qa', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high', 'urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('pending', 'in_progress', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_channel as enum ('shopee', 'lazada', 'tiktok_shop', 'direct', 'viber', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('paid', 'partial', 'unpaid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending', 'in_production', 'ready_to_ship', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Users  (profile row mirrors auth.users; id == auth.users.id)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        user_role not null default 'member',
  department  department,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  brand_line  brand_line not null,
  sku         text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_products_brand_line on public.products(brand_line);
create index if not exists idx_products_active on public.products(active);

-- ---------------------------------------------------------------------------
-- Campaigns
-- ---------------------------------------------------------------------------
create table if not exists public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date,
  end_date    date,
  status      campaign_status not null default 'planning',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users(id)
);

-- ---------------------------------------------------------------------------
-- Content items  (Marketing Tracker)
-- ---------------------------------------------------------------------------
create table if not exists public.content_items (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  product_id         uuid references public.products(id) on delete set null,
  campaign_id        uuid references public.campaigns(id) on delete set null,
  platform           content_platform not null,
  content_type       content_type not null default 'other',
  status             content_status not null default 'idea',
  publish_date       date,
  assigned_to        uuid references public.users(id) on delete set null,
  caption_or_notes   text,
  asset_link         text,
  -- performance (manual entry after publish)
  views              integer,
  likes              integer,
  comments           integer,
  shares             integer,
  clicks             integer,
  sales_attributed   numeric(12,2),
  performance_notes  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by         uuid references public.users(id)
);
create index if not exists idx_content_publish_date on public.content_items(publish_date);
create index if not exists idx_content_status on public.content_items(status);
create index if not exists idx_content_platform on public.content_items(platform);
create index if not exists idx_content_campaign on public.content_items(campaign_id);
create index if not exists idx_content_assigned on public.content_items(assigned_to);

-- ---------------------------------------------------------------------------
-- SOPs
-- ---------------------------------------------------------------------------
create table if not exists public.sops (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    sop_category not null default 'other',
  body        text not null default '',
  version     integer not null default 1,
  updated_by  uuid references public.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_sops_category on public.sops(category);

-- ---------------------------------------------------------------------------
-- Production tasks  (Kanban)
-- ---------------------------------------------------------------------------
create table if not exists public.production_tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  related_sop_id  uuid references public.sops(id) on delete set null,
  assigned_to     uuid references public.users(id) on delete set null,
  deadline        date,
  priority        task_priority not null default 'medium',
  status          task_status not null default 'pending',
  blocked_reason  text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.users(id)
);
create index if not exists idx_tasks_status on public.production_tasks(status);
create index if not exists idx_tasks_assigned on public.production_tasks(assigned_to);
create index if not exists idx_tasks_deadline on public.production_tasks(deadline);

-- Enforce: a task cannot be in_progress / done without an assignee.
alter table public.production_tasks
  drop constraint if exists chk_task_assignee_required;
alter table public.production_tasks
  add constraint chk_task_assignee_required
  check (status = 'pending' or assigned_to is not null);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                      uuid primary key default gen_random_uuid(),
  order_ref               text not null,
  customer_name           text not null default '',
  channel                 order_channel not null,
  order_date              date not null default current_date,
  target_completion_date  date,
  payment_status          payment_status not null default 'unpaid',
  amount_total            numeric(12,2) not null default 0,
  amount_paid             numeric(12,2) not null default 0,
  assigned_to             uuid references public.users(id) on delete set null,
  status                  order_status not null default 'pending',
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  updated_by              uuid references public.users(id)
);

-- Dedupe key for CSV upsert: unique (channel, order_ref).
create unique index if not exists uq_orders_channel_ref on public.orders(channel, order_ref);

-- Query indexes required at 200+ orders/day (spec §3.9)
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_order_date on public.orders(order_date);
create index if not exists idx_orders_channel on public.orders(channel);
create index if not exists idx_orders_assigned on public.orders(assigned_to);

-- ---------------------------------------------------------------------------
-- Order lines
-- ---------------------------------------------------------------------------
create table if not exists public.order_lines (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  product_name text,             -- free text fallback for CSV rows w/o matched product
  quantity    integer not null default 1,
  unit_price  numeric(12,2) not null default 0
);
create index if not exists idx_order_lines_order on public.order_lines(order_id);

-- ---------------------------------------------------------------------------
-- CSV column mappings — save "their column -> our field" once per channel
-- ---------------------------------------------------------------------------
create table if not exists public.import_mappings (
  id          uuid primary key default gen_random_uuid(),
  channel     order_channel not null unique,
  mapping     jsonb not null default '{}'::jsonb,  -- { our_field: "their column header" }
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.users(id)
);

-- ---------------------------------------------------------------------------
-- App settings — configurable days_pending thresholds, etc.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  key    text primary key,
  value  jsonb not null
);
insert into public.app_settings(key, value)
values ('days_pending_thresholds', '{"green": 3, "yellow": 7}'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['campaigns','content_items','sops','production_tasks','orders']
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I', t);
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- SOP version auto-increment on body/title/category edit
-- ---------------------------------------------------------------------------
create or replace function public.bump_sop_version()
returns trigger language plpgsql as $$
begin
  if (new.body is distinct from old.body)
     or (new.title is distinct from old.title)
     or (new.category is distinct from old.category) then
    new.version = old.version + 1;
  end if;
  return new;
end $$;

drop trigger if exists trg_bump_sop_version on public.sops;
create trigger trg_bump_sop_version
  before update on public.sops
  for each row execute function public.bump_sop_version();

-- ---------------------------------------------------------------------------
-- New-user profile bootstrap: create a public.users row on auth signup.
-- Name comes from metadata if present, else email local-part.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, email, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'member'),
    (new.raw_user_meta_data->>'department')::department
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ## END 0001_schema.sql


-- ####################################################################
-- ## BEGIN 0002_rls.sql
-- ####################################################################

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

-- ## END 0002_rls.sql


-- ####################################################################
-- ## BEGIN 0003_views.sql
-- ####################################################################

-- ============================================================================
-- HLO Ops Hub — Views
-- ============================================================================
-- orders_with_computed: days_pending computed in-query (spec §3.7 / §3.9), so
-- it is sortable/filterable at the DB level. NOT stored on the table.
-- days_pending is null once the order is delivered/cancelled.
-- ============================================================================

create or replace view public.orders_with_computed as
select
  o.*,
  case
    when o.status in ('delivered', 'cancelled') then null
    else (current_date - o.order_date)
  end as days_pending,
  u.name as assignee_name
from public.orders o
left join public.users u on u.id = o.assigned_to;

-- Views run with the querying user's privileges via security_invoker so the
-- underlying orders RLS still applies (Postgres 15+, Supabase default).
alter view public.orders_with_computed set (security_invoker = on);

-- ## END 0003_views.sql


-- ####################################################################
-- ## BEGIN 0004_assessments.sql
-- ####################################################################

-- ============================================================================
-- MINOXIPLUS — Free Hair Loss Assessment (spec §11)
-- ============================================================================
-- Public capture (assessments) + funnel tracking (assessment_events) +
-- admin allowlist. Public flow writes ONLY via service-role server actions;
-- the anon key must never read leads (RLS in 0005_assessments_rls.sql).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- assessments — one row per session (draft → completed)
-- ---------------------------------------------------------------------------
create table if not exists public.assessments (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null,
  result_token          text unique,
  status                text not null default 'draft',   -- draft | completed
  created_at            timestamptz not null default now(),
  completed_at          timestamptz,
  -- lead
  full_name             text,
  email                 text,
  phone                 text,                              -- normalized +639XXXXXXXXX
  consent_privacy       boolean not null default false,
  consent_marketing     boolean not null default false,
  -- answers
  answers               jsonb not null default '{}'::jsonb,
  -- derived
  concern               text,
  severity              text,
  flags                 text[] not null default '{}',
  recommended_products  text[] not null default '{}',
  referral_required     boolean not null default false,
  -- attribution
  src                   text,
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  referrer              text,
  device_type           text,
  ip_hash               text,                              -- hashed, never raw
  -- ops
  contacted             boolean not null default false,
  contacted_at          timestamptz,
  notes                 text
);

create index if not exists idx_assessments_created on public.assessments(created_at desc);
create index if not exists idx_assessments_status_created on public.assessments(status, created_at desc);
create index if not exists idx_assessments_concern on public.assessments(concern);
create index if not exists idx_assessments_email on public.assessments(email);
-- One row per session: drafts upsert on this key.
create unique index if not exists uq_assessments_session on public.assessments(session_id);

-- ---------------------------------------------------------------------------
-- assessment_events — funnel tracking (drop-off by step)
-- ---------------------------------------------------------------------------
create table if not exists public.assessment_events (
  id          bigserial primary key,
  session_id  uuid not null,
  step        text not null,                               -- 'landing','q1'..'q12','contact','result'
  event       text not null,                               -- 'view','answer','abandon'
  created_at  timestamptz not null default now()
);
create index if not exists idx_events_session on public.assessment_events(session_id);
create index if not exists idx_events_step_created on public.assessment_events(step, created_at desc);

-- ---------------------------------------------------------------------------
-- admin_users — assessment admin allowlist (spec §11). ADMIN_ALLOWLIST env is
-- the operational gate in Phase 1; this table is here for future role work.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  role        text not null default 'viewer',              -- viewer | admin
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Retention: purge stale draft rows with no contact + no activity (spec §11).
-- Wire to a scheduled Supabase function (pg_cron) post-deploy.
-- ---------------------------------------------------------------------------
create or replace function public.purge_stale_drafts()
returns integer language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  with gone as (
    delete from public.assessments a
    where a.status = 'draft'
      and a.email is null
      and a.created_at < now() - interval '90 days'
    returning 1
  )
  select count(*) into removed from gone;
  return removed;
end $$;

-- ## END 0004_assessments.sql


-- ####################################################################
-- ## BEGIN 0005_assessments_rls.sql
-- ####################################################################

-- ============================================================================
-- MINOXIPLUS Assessment — Row Level Security (spec §11)
-- ============================================================================
-- HARD RULE: the anon key must never read leads. Public capture happens only
-- through service-role server actions (which bypass RLS). No SELECT policy is
-- created for anon/authenticated on assessments, so PostgREST returns nothing.
-- Admin reads also go through the service role, gated in app code by
-- ADMIN_ALLOWLIST (see src/lib/assessment/admin.ts).
-- ============================================================================

alter table public.assessments      enable row level security;
alter table public.assessment_events enable row level security;
alter table public.admin_users        enable row level security;

-- assessments: NO policies for anon/authenticated → no direct access at all.
-- (Service role bypasses RLS entirely, which is how the app reads/writes.)
-- Explicitly drop any legacy permissive policies if they exist.
drop policy if exists assessments_public_select on public.assessments;
drop policy if exists assessments_public_all on public.assessments;

-- assessment_events: same posture — service-role only.
drop policy if exists events_public_all on public.assessment_events;

-- admin_users: a signed-in user may read ONLY their own row.
drop policy if exists admin_users_self_select on public.admin_users;
create policy admin_users_self_select on public.admin_users
  for select using (id = auth.uid());

-- Revoke the default table grants from the anon/authenticated roles as a
-- belt-and-suspenders measure alongside RLS.
revoke all on public.assessments from anon, authenticated;
revoke all on public.assessment_events from anon, authenticated;
grant select on public.admin_users to authenticated;

-- ## END 0005_assessments_rls.sql

