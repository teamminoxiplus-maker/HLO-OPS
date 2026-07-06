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
  ('Personal Care Soap (placeholder)',    'personal_care', 'PC-SOAP',    true),
  ('Personal Care Lotion (placeholder)',  'personal_care', 'PC-LOTN',    true),
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
  ('Shopee 7.7 voucher banner',     'shopee',    'voucher_promo',   'published', current_date - 1, 'HLO77 15% off.'),
  ('Pet shampoo intro post',        'instagram', 'image_post',      'idea',      current_date + 5, 'Non-Minoxiplus coverage — pet care line.'),
  ('Email blast — 7.7 preview',     'email',     'email_blast',     'drafting',  current_date + 3, 'Subject: Sale starts 7.7!')
on conflict do nothing;

-- Link content to the 7.7 campaign + set some performance on the published one
update public.content_items ci
  set campaign_id = c.id
  from public.campaigns c
  where c.name = '7.7 Shopee Mega Sale'
    and ci.title in ('7.7 Minoxidil hero reel', 'Shopee 7.7 voucher banner', 'Email blast — 7.7 preview');

update public.content_items
  set views = 12400, likes = 890, comments = 74, shares = 210, clicks = 540, sales_attributed = 18500.00
  where title = 'Shopee 7.7 voucher banner';
