# HLO Ops Hub — Deployment Checklist

Hand this to whoever owns the Supabase + Vercel + GitHub accounts. Start to
finish is ~15 minutes. No coding required — just copy-paste.

You will need three secrets from Supabase (Step 2). Keep the **service_role**
key private — it goes into Vercel only, never into a browser or a chat.

---

## 1. Create the Supabase project
- [ ] supabase.com/dashboard → **New project**
- [ ] Name: `hlo-ops` · set a **database password** (save it somewhere safe)
- [ ] Region: **Southeast Asia (Singapore)** (closest to Manila)
- [ ] Wait for provisioning to finish (~2 min)

## 2. Copy the 3 API keys
**Project Settings → API**:
- [ ] **Project URL**  → will be `NEXT_PUBLIC_SUPABASE_URL`
- [ ] **anon / public** key → will be `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **service_role** key → will be `SUPABASE_SERVICE_ROLE_KEY` *(secret)*

Paste all three into a temporary note; you'll need them in Step 5.

## 3. Build the database (one paste)
- [ ] Supabase → **SQL Editor** → **New query**
- [ ] Paste the entire contents of **`supabase/setup.sql`** → **Run**
- [ ] Confirm it says success (creates tables, security, `days_pending` view,
      and demo data)

## 4. Create the first admin login
- [ ] **Authentication → Users → Add user**: email + password, tick
      **Auto Confirm User**, Create
- [ ] SQL Editor → run (with the real email):
      ```sql
      update public.users set role='admin', department='management'
      where email='you@happylifeorganics.ph';
      ```
- [ ] (Optional) Add each teammate the same way in Authentication → Users.
      They default to `member` — no SQL needed.

## 5. Deploy to Vercel
- [ ] vercel.com → **Add New → Project** → import `teamminoxiplus-maker/HLO-OPS`
- [ ] **Production branch:** set to `claude/hlo-ops-hub-spec-axf6kw`
      (Settings → Git) *or* merge that branch into `main` first
- [ ] **Environment Variables** — add all three from Step 2:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **Deploy** (framework auto-detects as Next.js — no build config needed)

## 6. Verify it works
- [ ] Open the Vercel URL → log in with the admin email/password from Step 4
- [ ] Dashboard loads with demo cards
- [ ] Orders page shows the 5 sample orders, sorted oldest-first
- [ ] Open on a phone (375px) — layout is usable

## 7. Go live with real data
- [ ] **Orders → Import CSV** → pick a channel → upload a real Seller Center
      export → map columns once (saved per channel) → import
- [ ] When ready, remove the demo rows: SQL Editor → run
      **`supabase/cleanup_demo.sql`** (keeps your real data + product catalog)

---

### Notes
- **Costs:** Supabase free tier is fine for months 1–3; budget for Pro
  (~$25/mo) as order volume grows past ~200/day. Vercel Hobby tier is free.
- **Re-running SQL:** `setup.sql` is safe to re-run; it won't duplicate data.
- **Security keys:** if the service_role key is ever exposed, rotate it in
  Supabase (Settings → API) and update the Vercel env var.
