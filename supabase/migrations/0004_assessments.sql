-- ============================================================================
-- MINOXIPLUS — Free Hair Loss Assessment (spec §11)
-- ============================================================================
-- Public capture (assessments) + funnel tracking (assessment_events) +
-- admin allowlist. Public flow writes ONLY via service-role server actions;
-- the anon key must never read leads (RLS in 0005_assessments_rls.sql).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- assessments — one row per session (draft → completed)
-- ---------------------------------------------------------------------------
create table if not exists public.assessments (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null,
  result_token          text unique,
  status                text not null default 'draft',   -- draft | completed
  created_at            timestamptz not null default now(),
  completed_at          timestamptz,
  -- lead
  full_name             text,
  email                 text,
  phone                 text,                              -- normalized +639XXXXXXXXX
  consent_privacy       boolean not null default false,
  consent_marketing     boolean not null default false,
  -- answers
  answers               jsonb not null default '{}'::jsonb,
  -- derived
  concern               text,
  severity              text,
  flags                 text[] not null default '{}',
  recommended_products  text[] not null default '{}',
  referral_required     boolean not null default false,
  -- attribution
  src                   text,
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  referrer              text,
  device_type           text,
  ip_hash               text,                              -- hashed, never raw
  -- ops
  contacted             boolean not null default false,
  contacted_at          timestamptz,
  notes                 text
);

create index if not exists idx_assessments_created on public.assessments(created_at desc);
create index if not exists idx_assessments_status_created on public.assessments(status, created_at desc);
create index if not exists idx_assessments_concern on public.assessments(concern);
create index if not exists idx_assessments_email on public.assessments(email);
-- One row per session: drafts upsert on this key.
create unique index if not exists uq_assessments_session on public.assessments(session_id);

-- ---------------------------------------------------------------------------
-- assessment_events — funnel tracking (drop-off by step)
-- ---------------------------------------------------------------------------
create table if not exists public.assessment_events (
  id          bigserial primary key,
  session_id  uuid not null,
  step        text not null,                               -- 'landing','q1'..'q12','contact','result'
  event       text not null,                               -- 'view','answer','abandon'
  created_at  timestamptz not null default now()
);
create index if not exists idx_events_session on public.assessment_events(session_id);
create index if not exists idx_events_step_created on public.assessment_events(step, created_at desc);

-- ---------------------------------------------------------------------------
-- admin_users — assessment admin allowlist (spec §11). ADMIN_ALLOWLIST env is
-- the operational gate in Phase 1; this table is here for future role work.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  role        text not null default 'viewer',              -- viewer | admin
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Retention: purge stale draft rows with no contact + no activity (spec §11).
-- Wire to a scheduled Supabase function (pg_cron) post-deploy.
-- ---------------------------------------------------------------------------
create or replace function public.purge_stale_drafts()
returns integer language plpgsql security definer set search_path = public as $$
declare
  removed integer;
begin
  with gone as (
    delete from public.assessments a
    where a.status = 'draft'
      and a.email is null
      and a.created_at < now() - interval '90 days'
    returning 1
  )
  select count(*) into removed from gone;
  return removed;
end $$;
