-- ============================================================================
-- HLO Ops Hub — Orders become WEBSITE-ONLY (minoxiplus.com)
-- ============================================================================
-- Replaces the marketplace channel set (shopee/lazada/tiktok_shop/direct/viber)
-- with just 'website' and 'other'. Every existing order is reassigned to
-- 'website'. Saved marketplace CSV column-mappings are cleared (no longer
-- relevant). Run once in the Supabase SQL editor.
-- ============================================================================

begin;

-- The computed view selects orders.* — drop it, recreate after the type swap.
drop view if exists public.orders_with_computed;

-- Swap the enum: create a fresh type and re-point the columns at it.
alter type order_channel rename to order_channel_old;
create type order_channel as enum ('website', 'other');

-- Every existing order is now a website order.
alter table public.orders
  alter column channel type order_channel using 'website'::order_channel;
alter table public.orders
  alter column channel set default 'website';

-- Old per-channel CSV mappings no longer apply.
delete from public.import_mappings;
alter table public.import_mappings
  alter column channel type order_channel using 'website'::order_channel;

drop type order_channel_old;

-- Recreate the computed view (identical to 0003).
create view public.orders_with_computed as
select
  o.*,
  case
    when o.status in ('delivered', 'cancelled') then null
    else (current_date - o.order_date)
  end as days_pending,
  u.name as assignee_name
from public.orders o
left join public.users u on u.id = o.assigned_to;

alter view public.orders_with_computed set (security_invoker = on);

commit;
