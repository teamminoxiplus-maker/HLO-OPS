-- ============================================================================
-- MINOXIPLUS Assessment — Row Level Security (spec §11)
-- ============================================================================
-- HARD RULE: the anon key must never read leads. Public capture happens only
-- through service-role server actions (which bypass RLS). No SELECT policy is
-- created for anon/authenticated on assessments, so PostgREST returns nothing.
-- Admin reads also go through the service role, gated in app code by
-- ADMIN_ALLOWLIST (see src/lib/assessment/admin.ts).
-- ============================================================================

alter table public.assessments      enable row level security;
alter table public.assessment_events enable row level security;
alter table public.admin_users        enable row level security;

-- assessments: NO policies for anon/authenticated → no direct access at all.
-- (Service role bypasses RLS entirely, which is how the app reads/writes.)
-- Explicitly drop any legacy permissive policies if they exist.
drop policy if exists assessments_public_select on public.assessments;
drop policy if exists assessments_public_all on public.assessments;

-- assessment_events: same posture — service-role only.
drop policy if exists events_public_all on public.assessment_events;

-- admin_users: a signed-in user may read ONLY their own row.
drop policy if exists admin_users_self_select on public.admin_users;
create policy admin_users_self_select on public.admin_users
  for select using (id = auth.uid());

-- Revoke the default table grants from the anon/authenticated roles as a
-- belt-and-suspenders measure alongside RLS.
revoke all on public.assessments from anon, authenticated;
revoke all on public.assessment_events from anon, authenticated;
grant select on public.admin_users to authenticated;
