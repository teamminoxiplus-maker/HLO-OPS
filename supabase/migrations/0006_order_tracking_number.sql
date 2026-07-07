-- ============================================================================
-- HLO Ops Hub — add tracking_number to orders
-- ============================================================================
-- Courier / shipment tracking number, editable per order by the fulfillment
-- team. The orders_with_computed view is recreated so the new column flows
-- through (a view's `select o.*` is expanded at creation time and does NOT
-- pick up new columns automatically). Run once in the Supabase SQL editor.
-- ============================================================================

alter table public.orders
  add column if not exists tracking_number text;

-- Recreate the computed view so it includes tracking_number.
drop view if exists public.orders_with_computed;
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
