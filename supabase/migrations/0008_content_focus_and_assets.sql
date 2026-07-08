-- ============================================================================
-- HLO Ops Hub — Focus content on Facebook + TikTok, trim brand lines, and add
-- a storage bucket for uploaded content assets.
-- ============================================================================
-- Run once in the Supabase SQL editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Content platforms -> facebook, tiktok only
-- ---------------------------------------------------------------------------
-- Move any existing content off removed platforms first.
update public.content_items
  set platform = 'facebook'
  where platform::text not in ('facebook', 'tiktok');

alter type content_platform rename to content_platform_old;
create type content_platform as enum ('facebook', 'tiktok');
alter table public.content_items
  alter column platform type content_platform
  using platform::text::content_platform;
drop type content_platform_old;

-- ---------------------------------------------------------------------------
-- 2. Brand lines -> minoxiplus, pet_care, home_care
-- ---------------------------------------------------------------------------
-- Remove the (placeholder) personal_care products; content keeps working since
-- content_items.product_id is ON DELETE SET NULL.
delete from public.products where brand_line = 'personal_care';
-- Safety: reassign anything else outside the new set.
update public.products
  set brand_line = 'home_care'
  where brand_line::text not in ('minoxiplus', 'pet_care', 'home_care');

alter type brand_line rename to brand_line_old;
create type brand_line as enum ('minoxiplus', 'pet_care', 'home_care');
alter table public.products
  alter column brand_line type brand_line
  using brand_line::text::brand_line;
drop type brand_line_old;

-- ---------------------------------------------------------------------------
-- 3. Storage bucket for uploaded content assets (images/videos)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('content-assets', 'content-assets', true)
on conflict (id) do nothing;

-- Public read; authenticated team members can upload / change / remove.
drop policy if exists "content_assets_read" on storage.objects;
create policy "content_assets_read" on storage.objects
  for select using (bucket_id = 'content-assets');

drop policy if exists "content_assets_insert" on storage.objects;
create policy "content_assets_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'content-assets');

drop policy if exists "content_assets_update" on storage.objects;
create policy "content_assets_update" on storage.objects
  for update to authenticated using (bucket_id = 'content-assets');

drop policy if exists "content_assets_delete" on storage.objects;
create policy "content_assets_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'content-assets');
