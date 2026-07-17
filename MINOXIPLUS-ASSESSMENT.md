# MINOXIPLUS — Free Hair Loss Assessment

Phase 1 of the MINOXIPLUS free hair loss assessment, built into the HLO Ops Hub
app (Next.js 14 + Supabase) so the two can share a deploy. Built to the spec
`MINOXIPLUS Spec.md v1.0`.

## What shipped

- **Public assessment** (`/assessment`) — mobile-first, no login, Taglish. Landing
  → 12 one-per-screen questions with progress bar + back button + autosave →
  contact gate (name/email/PH mobile + consent) → tokenized result page.
- **Rules engine** (`src/lib/assessment/engine.ts`) — pure, deterministic,
  unit-tested. `classify → severity → mapProducts → applySafetyGates`. **30 tests**
  cover every §9.4 safety gate.
- **Result email** via Resend, built from the same `copy.ts` blocks as the web
  page so the two never drift.
- **Admin** (`/admin`, gated by `ADMIN_ALLOWLIST`) — funnel dashboard (drop-off,
  concern mix, source mix, recent), leads table with server-side pagination +
  search + filters, lead detail with contacted toggle + notes, streamed CSV export.
- **Kiosk mode** (`/kiosk`) — PIN-gated, in-memory state (nothing persists between
  customers), 15s auto-reset after result, `src=kiosk_[location]`.
- **Spam protection** — honeypot field, 5 submits/hour/IP (Upstash Redis or
  in-memory fallback), PH mobile + email validation.
- **Privacy** (`/assessment/privacy`) — RA 10173 notice with a working
  data-deletion email path.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/assessment` | Public | Landing (QR lands here). Never 404s, works with no query param. |
| `/assessment/q/[step]` | Public | Question steps 1–12 |
| `/assessment/contact` | Public | Contact + consent gate |
| `/assessment/result/[token]` | Public (22-char token) | Personalized result, re-openable |
| `/assessment/privacy` | Public | Privacy notice |
| `/admin` | Auth + allowlist | Funnel dashboard |
| `/admin/leads`, `/admin/leads/[id]` | Auth + allowlist | Leads table + detail |
| `/admin/export` | Auth + allowlist | Streamed filtered CSV |
| `/kiosk` | Public + PIN | Kiosk wrapper |
| `/api/assessment/draft` · `/submit` · `/event` | Public (rate-limited) | Autosave · submit · funnel beacon |

**QR destination:** `https://minoxiplus.com/assessment?src=qr_[placement]`. The
path is load-bearing — print one QR per placement with a different `src`; the
path stays identical (see spec §2.5 / §6).

## Safety gates (spec §9.4 — non-negotiable)

Enforced server-side in `applySafetyGates`, which runs after mapping and can only
remove/downgrade. Every rule has a unit test:

1. **Tri Active is MEN ONLY** — hard filter, never reaches a non-male user.
2. **Under 18** → no Minoxidil/Finasteride → consult route.
3. **Pregnant / breastfeeding / planning** → no Minoxidil/Tri Active/supplements → consult route.
4. **Heart / BP** → Minoxidil allowed but flagged `NEEDS_DOC_CLEARANCE`.
5. **Minoxidil allergy** → all Minoxidil products removed.
6. **Scalp wound / skin condition** → topicals suppressed, refer.
7. If everything is stripped → `REFER` with a consult CTA (never an empty "Buy now").

> Classification note: `MIXED` (AGA pattern + scalp irritation) is evaluated
> *before* plain AGA. The spec lists it after, but under "first match wins" that
> would make it unreachable — treating both concerns is the correct outcome.

## Data & security

- Tables: `assessments`, `assessment_events`, `admin_users` (migrations 0004/0005).
- **Leads are not readable with the anon key** — `assessments` has no anon/authed
  SELECT policy and table grants are revoked; all reads/writes go through the
  service-role client in server code only (`src/lib/assessment/persist.ts`).
- IPs are hashed before storage; no PII in result URLs.
- Retention: `purge_stale_drafts()` deletes contactless drafts older than 90 days
  (wire to pg_cron post-deploy).

## Config

New env vars (see `.env.example`): `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, `ADMIN_ALLOWLIST`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, `KIOSK_PIN`, `IP_HASH_SALT`. Email, Redis, and the
kiosk PIN degrade gracefully when unset (email skipped, in-memory rate limit).

## Tests

```bash
npm test          # 30 engine unit tests (Vitest)
```

## Editing content

- **Questions**: `src/lib/assessment/questions.ts` (typed config, no JSX).
- **Result / email copy**: `src/lib/assessment/copy.ts` (single source of truth,
  follows the §9.5 claim-language rules — no "cure/guaranteed/permanent/100%/diagnosis").
- **Products, buy links, consult channels**: `src/lib/assessment/products.ts`.

## Still to do before launch (spec open questions)

- Confirm storefront/consult URLs in `products.ts` (placeholders shipped).
- Doc Ryan sign-off on result copy.
- Populate `ADMIN_ALLOWLIST` and set `KIOSK_PIN`.
- Product images (`/products/*.svg`) are referenced but the result cards are
  text-only today — add art when available.
- Phase 0 migration: stand up the `/assessment` 302 redirect and reprint QRs
  before removing the redirect at launch.
