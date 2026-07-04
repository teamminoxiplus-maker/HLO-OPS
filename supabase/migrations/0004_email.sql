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
