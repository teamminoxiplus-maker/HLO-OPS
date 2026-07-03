# Spec.md — Happy Life Organics Internal Operations Portal

See the project README for setup. This file is the product spec the app was
built against: an internal "HLO Ops Hub" covering three operational areas —
Content & Marketing Tracker, Production SOP & Task Board, and Order Tracking —
for a small internal team (~5–15 people).

Confirmed stack: Next.js 14 (App Router), Supabase (Postgres + Auth, roles
admin/member), Tailwind + shadcn-style UI, hosted on Vercel. English UI labels,
Taglish-friendly free-text fields, Asia/Manila timezone, PHP currency.

Order intake is via CSV import of Seller Center exports (Shopee/Lazada/TikTok
Shop) with a saved per-channel column mapping and dedupe on (channel, order_ref);
manual quick-add is for direct/Viber orders. Server-side pagination and the
indexes in the migrations support 200+ orders/day.

Full data models, feature breakdown, build phases, and acceptance criteria are
implemented across `supabase/migrations/*` and `src/app/**`. Refer to README.md
for the module-by-module summary.
