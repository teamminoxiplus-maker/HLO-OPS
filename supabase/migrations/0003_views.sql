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
