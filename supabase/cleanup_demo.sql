-- ============================================================================
-- HLO Ops Hub — REMOVE DEMO DATA
-- ============================================================================
-- Deletes ONLY the demo rows created by seed.sql / setup.sql, matched by their
-- exact seed identifiers (order refs, titles, campaign name). It will NOT touch
-- any real orders/tasks/content you have added yourself.
--
-- Run this in the Supabase SQL editor once real data is in.
--
-- KEEPS by default: the product catalog and the 3 starter SOPs (useful
-- templates). To also remove those, uncomment the two blocks at the bottom.
-- ============================================================================

begin;

-- Demo orders (order_lines are removed automatically via ON DELETE CASCADE).
-- Matched by order_ref so it works regardless of channel.
delete from public.orders
where order_ref in (
  'WEB-100201', 'WEB-556012', 'WEB-778820', 'ORD-000045', 'WEB-100333',
  -- also match the original marketplace-style refs, in case demo data predates
  -- the website-only change:
  'SHP-100201', 'LAZ-556012', 'TTS-778820', 'DIR-000045', 'SHP-100333'
);

-- Demo production tasks.
delete from public.production_tasks
where title in (
  'Formulate 10L Minoxidil batch',
  'QA check Ketoconazole batch #42',
  'Pack ORD-000045 Pro bundle',
  'Pack DIR-000045 Pro bundle'
);

-- Demo content items (unlinked from campaign first is unnecessary — the FK is
-- ON DELETE SET NULL, and we delete the campaign after).
delete from public.content_items
where title in (
  '7.7 Minoxidil hero reel',
  'Ketoconazole shampoo carousel',
  'Shopee 7.7 voucher banner',
  'Pet shampoo intro post',
  'Email blast — 7.7 preview'
);

-- Demo campaign.
delete from public.campaigns
where name = '7.7 Shopee Mega Sale';

commit;

-- Sanity check — expect 0 rows for each of the demo identifiers above:
--   select count(*) from public.orders where order_ref like 'SHP-1003%';

-- ----------------------------------------------------------------------------
-- OPTIONAL: also remove the starter SOPs (uncomment to run).
-- ----------------------------------------------------------------------------
-- delete from public.sops where title in (
--   'Formulation Process — Minoxidil Solution',
--   'Sample Making — New Product Trial',
--   'Packaging & Labeling Checklist'
-- );

-- ----------------------------------------------------------------------------
-- OPTIONAL: also remove the placeholder non-Minoxiplus products (uncomment).
-- Keeps real Minoxiplus SKUs; drops the "(placeholder)" catalog rows.
-- ----------------------------------------------------------------------------
-- delete from public.products where name like '%(placeholder)%';
