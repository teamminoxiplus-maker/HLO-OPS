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
  -- Orders are website-only (minoxiplus.com); 'other' covers phone/Viber/walk-in.
  create type order_channel as enum ('website', 'other');
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
  channel                 order_channel not null default 'website',
  order_date              date not null default current_date,
  target_completion_date  date,
  payment_status          payment_status not null default 'unpaid',
  amount_total            numeric(12,2) not null default 0,
  amount_paid             numeric(12,2) not null default 0,
  assigned_to             uuid references public.users(id) on delete set null,
  status                  order_status not null default 'pending',
  tracking_number         text,
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
