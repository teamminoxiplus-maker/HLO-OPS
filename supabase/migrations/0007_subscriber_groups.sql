-- ============================================================================
-- HLO Ops Hub — Subscriber groups / segments
-- ============================================================================
-- Lets you tag email subscribers into batches (e.g. "new", "reorder", "vip")
-- and send different content to each. A subscriber can belong to several
-- groups. Run once in the Supabase SQL editor.
-- ============================================================================

alter table public.email_subscribers
  add column if not exists groups text[] not null default '{}';

-- GIN index so "contains group X" filters stay fast.
create index if not exists idx_email_subscribers_groups
  on public.email_subscribers using gin (groups);
