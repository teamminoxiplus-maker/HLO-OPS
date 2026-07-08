-- ============================================================================
-- HLO Ops Hub — ONE-SHOT SETUP
-- ============================================================================
-- Paste this ENTIRE file into the Supabase SQL editor and hit Run.
-- Creates schema, security, views, email tables, and demo data. Safe to re-run.
-- After it succeeds:
--   1. Create your login: Dashboard > Authentication > Users > Add user
--      (email + password, tick "Auto Confirm User").
--   2. Promote yourself to admin with the UPDATE at the very bottom.
-- ============================================================================


-- ####################  0001_schema.sql  ####################
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
  create type brand_line as enum ('minoxiplus', 'pet_care', 'home_care');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Content is focused on Facebook + TikTok.
  create type content_platform as enum ('facebook', 'tiktok');
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


-- ####################  0002_rls.sql  ####################
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


-- ####################  0003_views.sql  ####################
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


-- ####################  0004_email.sql  ####################
-- ============================================================================
-- HLO Ops Hub — Email Marketing (subscribers + campaigns)
-- ============================================================================
-- Adds a subscriber list and a record of sent email blasts. Sending itself is
-- done from the app via the Resend API; this schema stores who to send to and
-- what was sent. Public unsubscribe is handled server-side with the service
-- role key, so RLS here stays locked to authenticated team members.
--
-- Safe to re-run. Paste into the Supabase SQL editor and Run.
-- ============================================================================

do $$ begin
  create type subscriber_status as enum ('subscribed', 'unsubscribed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Subscribers
-- ---------------------------------------------------------------------------
create table if not exists public.email_subscribers (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null,
  name               text,
  status             subscriber_status not null default 'subscribed',
  source             text,                       -- e.g. 'viber', 'signup_form', 'manual', 'import'
  groups             text[] not null default '{}', -- batches/segments, e.g. {new,reorder}
  unsubscribe_token  uuid not null default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
-- Case-insensitive unique email so re-imports dedupe cleanly.
create unique index if not exists uq_email_subscribers_email
  on public.email_subscribers (lower(email));
create unique index if not exists uq_email_subscribers_token
  on public.email_subscribers (unsubscribe_token);
create index if not exists idx_email_subscribers_status
  on public.email_subscribers (status);

-- ---------------------------------------------------------------------------
-- Campaigns (a record of each blast that was sent)
-- ---------------------------------------------------------------------------
create table if not exists public.email_campaigns (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  body             text not null,
  from_label       text,
  recipient_count  integer not null default 0,
  sent_count       integer not null default 0,
  failed_count     integer not null default 0,
  status           text not null default 'sent',  -- 'sent' | 'partial' | 'failed'
  sent_at          timestamptz,
  created_by       uuid references public.users(id),
  created_at       timestamptz not null default now()
);
create index if not exists idx_email_campaigns_created
  on public.email_campaigns (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger for subscribers (reuses public.set_updated_at)
-- ---------------------------------------------------------------------------
drop trigger if exists trg_set_updated_at on public.email_subscribers;
create trigger trg_set_updated_at
  before update on public.email_subscribers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: authenticated team members can do everything; anon has no access.
-- The public unsubscribe page updates rows via the service role (bypasses RLS).
-- ---------------------------------------------------------------------------
alter table public.email_subscribers enable row level security;
alter table public.email_campaigns  enable row level security;

drop policy if exists email_subscribers_all on public.email_subscribers;
create policy email_subscribers_all on public.email_subscribers
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists email_campaigns_all on public.email_campaigns;
create policy email_campaigns_all on public.email_campaigns
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- ####################  seed.sql (demo data)  ####################
-- ============================================================================
-- HLO Ops Hub — Seed data (demo)
-- ============================================================================
-- NOTE ON USERS: auth.users cannot be created from plain SQL with a working
-- password reliably across Supabase versions. Create the auth users first
-- (Dashboard > Authentication > Add user, or the Admin API — see
-- scripts/seed-users.mjs), then this file backfills their profile fields.
-- The handle_new_user trigger already inserts a bare profile row on signup;
-- here we upsert richer values keyed by email.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
insert into public.products (name, brand_line, sku, active) values
  ('Minoxiplus Minoxidil 5% Solution',    'minoxiplus',    'MNX-MIN5',   true),
  ('Minoxiplus Ketoconazole Shampoo',     'minoxiplus',    'MNX-KETO',   true),
  ('Minoxiplus Hair Food Supplement',     'minoxiplus',    'MNX-HFS',    true),
  ('Minoxiplus Scalp Massager',           'minoxiplus',    'MNX-MASSG',  true),
  ('Minoxiplus Derma Stamp',              'minoxiplus',    'MNX-DERMA',  true),
  ('Minoxiplus Starter Bundle',           'minoxiplus',    'MNX-BND-ST', true),
  ('Minoxiplus Advanced Bundle',          'minoxiplus',    'MNX-BND-AD', true),
  ('Minoxiplus Pro Bundle',               'minoxiplus',    'MNX-BND-PR', true),
  ('Pet Care Shampoo (placeholder)',      'pet_care',      'PET-SHMP',   true),
  ('Pet Care Supplement (placeholder)',   'pet_care',      'PET-SUPP',   true),
  ('Home Care Cleaner (placeholder)',     'home_care',     'HC-CLNR',    true),
  ('Home Care Detergent (placeholder)',   'home_care',     'HC-DTRG',    true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- SOPs (3 examples with placeholder steps)
-- ---------------------------------------------------------------------------
insert into public.sops (title, category, body, version) values
(
  'Formulation Process — Minoxidil Solution',
  'formulation',
$body$# Formulation Process — Minoxidil 5% Solution

**Goal:** Produce a consistent, stable 5% minoxidil topical solution.

## Materials
- [ ] Minoxidil USP powder
- [ ] Propylene glycol
- [ ] Ethanol (denatured, cosmetic grade)
- [ ] Purified water
- [ ] Calibrated scale + graduated cylinders

## Steps
- [ ] 1. Sanitize workspace and all glassware.
- [ ] 2. Weigh minoxidil powder per batch sheet (5g / 100mL).
- [ ] 3. Dissolve minoxidil in propylene glycol under gentle heat.
- [ ] 4. Add ethanol slowly while stirring.
- [ ] 5. Top up to final volume with purified water.
- [ ] 6. Verify pH and clarity. Record on batch sheet.
- [ ] 7. Label batch number + date. Move to QA.

## Notes
Palitan lang ang batch size sa sheet kapag mas malaki ang order. Always double check yung pH bago i-release.
$body$,
  1
),
(
  'Sample Making — New Product Trial',
  'sample_making',
$body$# Sample Making — New Product Trial

## When to use
Bago mag-full production, gumawa muna ng maliit na sample batch for approval.

## Steps
- [ ] 1. Confirm target formula with R&D.
- [ ] 2. Prepare 3 small variants (A/B/C) if testing ratios.
- [ ] 3. Label each variant clearly.
- [ ] 4. Photo-document each sample.
- [ ] 5. Route to management for approval (attach photos + notes).
- [ ] 6. Log approval decision + chosen variant.
$body$,
  1
),
(
  'Packaging & Labeling Checklist',
  'packaging',
$body$# Packaging & Labeling Checklist

- [ ] 1. Verify product matches order line items.
- [ ] 2. Check bottle/pouch seal integrity.
- [ ] 3. Apply correct label (batch + expiry).
- [ ] 4. Insert instruction card.
- [ ] 5. Box + add packing slip.
- [ ] 6. Weigh + confirm vs courier size tier.
- [ ] 7. Mark order ready_to_ship in the Ops Hub.
$body$,
  1
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Campaign
-- ---------------------------------------------------------------------------
insert into public.campaigns (name, start_date, end_date, status, notes) values
  ('7.7 Shopee Mega Sale', date '2026-07-01', date '2026-07-07', 'live',
   'Voucher HLO77 = 15% off, capped ₱150. Free shipping min ₱499.')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Sample orders (5, across statuses / payment states)
-- ---------------------------------------------------------------------------
insert into public.orders
  (order_ref, customer_name, channel, order_date, target_completion_date, payment_status, amount_total, amount_paid, status, notes)
values
  ('WEB-100201', 'Maria Santos',   'website',    current_date - 9, current_date - 2, 'paid',    1499.00, 1499.00, 'pending',        'Rush daw, birthday gift.'),
  ('WEB-556012', 'Juan Dela Cruz', 'website',    current_date - 6, current_date + 1, 'partial', 2999.00, 1000.00, 'in_production',  'Balance on delivery.'),
  ('WEB-778820', 'Ana Reyes',      'website',    current_date - 5, current_date,     'unpaid',  899.00,  0.00,    'ready_to_ship',  'COD — follow up collection.'),
  ('ORD-000045', 'Coach Ramon',    'other',      current_date - 3, current_date + 2, 'paid',    4999.00, 4999.00, 'in_production',  'Pro bundle x1, Viber order.'),
  ('WEB-100333', 'Liza M.',        'website',    current_date - 12,current_date - 5, 'paid',    599.00,  599.00,  'delivered',      'Delivered, feedback 5 stars.')
on conflict (channel, order_ref) do nothing;

-- Order lines for the sample orders (best-effort product matches)
insert into public.order_lines (order_id, product_id, product_name, quantity, unit_price)
select o.id, p.id, p.name, 1, o.amount_total
from public.orders o
join public.products p on p.sku = case o.order_ref
    when 'WEB-100201' then 'MNX-BND-ST'
    when 'WEB-556012' then 'MNX-BND-AD'
    when 'WEB-778820' then 'MNX-KETO'
    when 'ORD-000045' then 'MNX-BND-PR'
    when 'WEB-100333' then 'MNX-HFS'
  end
where not exists (select 1 from public.order_lines ol where ol.order_id = o.id);

-- ---------------------------------------------------------------------------
-- Production tasks (a few, unassigned stay pending per constraint)
-- ---------------------------------------------------------------------------
insert into public.production_tasks (title, description, priority, status, blocked_reason, deadline)
values
  ('Formulate 10L Minoxidil batch', 'For Shopee 7.7 stock replenishment.', 'high', 'pending', null, current_date + 3),
  ('QA check Ketoconazole batch #42', 'pH + clarity verification.', 'medium', 'pending', 'waiting for sample approval', current_date + 1),
  ('Pack ORD-000045 Pro bundle', 'Coach Ramon direct order.', 'urgent', 'pending', null, current_date + 2)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Content items (a handful across brand lines + platforms)
-- ---------------------------------------------------------------------------
insert into public.content_items (title, platform, content_type, status, publish_date, caption_or_notes)
values
  ('7.7 Minoxidil hero reel',       'tiktok',    'reel',            'scheduled', current_date + 1, 'Before/after 3 months. Hook: "Sayang ang buhok mo?"'),
  ('Ketoconazole shampoo carousel', 'facebook',  'carousel',        'for_review',current_date + 2, 'Educational — dandruff + hairfall.'),
  ('7.7 voucher banner',            'facebook',  'voucher_promo',   'published', current_date - 1, 'HLO77 15% off.'),
  ('Pet shampoo intro post',        'facebook',  'image_post',      'idea',      current_date + 5, 'Non-Minoxiplus coverage — pet care line.'),
  ('7.7 preview teaser',            'tiktok',    'reel',            'drafting',  current_date + 3, 'Teaser: Sale starts 7.7!')
on conflict do nothing;

-- Link content to the 7.7 campaign + set some performance on the published one
update public.content_items ci
  set campaign_id = c.id
  from public.campaigns c
  where c.name = '7.7 Shopee Mega Sale'
    and ci.title in ('7.7 Minoxidil hero reel', '7.7 voucher banner', '7.7 preview teaser');

update public.content_items
  set views = 12400, likes = 890, comments = 74, shares = 210, clicks = 540, sales_attributed = 18500.00
  where title = '7.7 voucher banner';


-- ####################  MAKE YOURSELF ADMIN  ####################
--   update public.users set role='admin', department='management'
--    where email = 'you@happylifeorganics.ph';
