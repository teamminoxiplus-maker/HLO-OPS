# Happy Life Organics-Operations Hub

Internal operations portal for **Happy Life Organics Philippines** — the single
source of truth for order tracking, production, and content/marketing across all
brand lines (Minoxiplus, pet care, personal care, home care).

Built to the spec in [`Spec.md`](./Spec.md).

## What's inside

| Module | Highlights |
|---|---|
| **Dashboard** | At-a-glance cards (pending/overdue/unpaid orders, tasks due, blocked tasks, scheduled content, review backlog) + content coverage nudge. Every card deep-links into its module with a filter pre-applied. |
| **Orders** | Server-paginated master table, DB-computed **Days Pending** badge (green/yellow/red, thresholds configurable), filters + sortable columns, inline status/assignee edits, quick-add modal, **bulk actions**, **CSV import with per-channel column mapping + dedupe**, CSV export, collection warning on unpaid + ready-to-ship. |
| **Production** | Kanban board (Pending / In Progress / Done) with drag-and-drop, assignee-required rule, blocked indicators, overdue deadlines, My Tasks filter. SOP library (searchable) + editor with live markdown preview and auto-incrementing version. |
| **Content** | Calendar (month grid, color-coded by platform), list view with inline status editing, performance tab (manual metrics + top-10 chart), campaigns with aggregate metrics, coverage nudge. |
| **Email** | Subscriber list (add / import / export / unsubscribe), compose & send email blasts via Resend, per-recipient unsubscribe links + public unsubscribe page, send-test-to-self, recent-sends history. |
| **Search** | Global search across orders, tasks, SOPs, and content. |

## Tech stack

- **Next.js 14** (App Router) — single deployable app
- **Supabase** (Postgres + Auth) — email/password, 2 roles (`admin` / `member`), RLS
- **Tailwind CSS** + lightweight shadcn-style components
- **Recharts** for the performance chart, **PapaParse** for CSV
- **Vercel** for hosting

All dates render in **Asia/Manila**; currency is **PHP (₱)**. UI labels are
English; every free-text field accepts Taglish content.

## Getting started

### 1. Create a Supabase project

From the [Supabase dashboard](https://supabase.com/dashboard), create a project
and grab the API keys (Project Settings → API).

### 2. Run the database migrations

In the Supabase **SQL editor**, run these files in order:

1. `supabase/migrations/0001_schema.sql` — tables, enums, indexes, triggers
2. `supabase/migrations/0002_rls.sql` — row-level security
3. `supabase/migrations/0003_views.sql` — `orders_with_computed` (days_pending)

(Or use the Supabase CLI: `supabase db push`.)

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` (server-only — used by the user-seeding script).

### 4. Seed users + demo data

```bash
npm install
npm run seed:users          # creates 1 admin + a member per department
```

Then run `supabase/seed.sql` in the SQL editor for demo products, SOPs, orders,
tasks, and content.

Default password for every seeded account is `ChangeMe123!` — change it after
first login. Accounts:

| Email | Role | Department |
|---|---|---|
| admin@happylifeorganics.ph | admin | management |
| marketing@happylifeorganics.ph | member | marketing |
| production@happylifeorganics.ph | member | production |
| fulfillment@happylifeorganics.ph | member | fulfillment |
| accounting@happylifeorganics.ph | member | accounting |

### 5. Run it

```bash
npm run dev          # http://localhost:3000
```

## CSV import (the primary order intake)

Orders → **Import CSV**:

1. Pick the channel (**Website** / Other).
2. Upload your website order export (e.g. from your store platform). Headers are
   auto-detected and fuzzy-matched to our fields; adjust the **column mapping**
   and **Save mapping** — it's remembered per channel for next time.
3. Preview and import. Rows are **deduped on `(channel, order_ref)`**:
   re-importing the same file updates existing orders instead of duplicating,
   and you get a summary of new / updated / skipped.

> Orders are website-only (minoxiplus.com). If your store's export format
> changes, re-check the column mapping.

## Email marketing (optional module)

The Email module collects contacts and sends blasts through
[Resend](https://resend.com). To enable **sending**:

1. Run `supabase/migrations/0004_email.sql` (already included in `setup.sql`).
2. Create a Resend account → copy an API key → add `RESEND_API_KEY` to your
   environment (Vercel).
3. To send from your own address, verify your domain in Resend and set
   `EMAIL_FROM` (e.g. `Happy Life Organics <news@happylifeorganics.ph>`).
   Without it, the app uses Resend's shared test sender, which only delivers to
   your own Resend account email.

The contact list and unsubscribe flow work without any of this — only the
actual send requires the key. Every email includes a per-recipient unsubscribe
link that points at the public `/unsubscribe` page.

> Note: marketplace exports (Shopee/Lazada/TikTok) usually don't include buyer
> emails, so your list will mostly come from direct/Viber customers and sign-ups.

## Project layout

```
src/
  app/
    login/                     auth (email + password)
    (app)/
      dashboard/               landing cards + coverage nudge
      orders/                  table, quick-add, bulk actions, [id] detail
        import/                CSV mapping wizard + batch upsert
      production/              Kanban board + task modal
        sops/                  library, detail, editor
      content/                 calendar, list, performance, campaigns
      search/                  global search
    api/orders/export/         filtered CSV export
  components/                  UI primitives, badges, nav, coverage nudge
  lib/                         types, constants, utils, Supabase clients, auth
supabase/
  migrations/                  schema, RLS, views
  seed.sql                     demo data
scripts/seed-users.mjs         auth user bootstrap
```

## Notes on the spec's open questions

- **Roles**: shipped with `admin` / `member`. Accounting-only payment edit rights
  would be a narrow RLS policy addition if needed later.
- **Order line detail**: CSV import is **order-level** (open question #3 —
  order-level is enough for tracking in v1). The quick-add modal and the schema
  still support line items for direct orders.
- **Sample export files**: the import mapper is format-agnostic by design — feed
  it a real Shopee/Lazada/TikTok export and map columns once.

## Deploy

Push to a Vercel project, set the same three environment variables in Vercel,
and deploy. Monitor Supabase free-tier limits as order volume grows (budget for
the Pro tier around 200+ orders/day).
