// Seed HLO Ops Hub auth users + profiles.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-users.mjs
//
// Creates one admin + one member per department. The handle_new_user trigger
// turns the auth metadata (name/role/department) into a public.users profile.
// Default password for every seeded account: ChangeMe123!  (change after login)

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PASSWORD = process.env.SEED_PASSWORD ?? "ChangeMe123!";

const users = [
  { name: "Admin Lead", email: "admin@happylifeorganics.ph", role: "admin", department: "management" },
  { name: "Marketing Member", email: "marketing@happylifeorganics.ph", role: "member", department: "marketing" },
  { name: "Production Member", email: "production@happylifeorganics.ph", role: "member", department: "production" },
  { name: "Fulfillment Member", email: "fulfillment@happylifeorganics.ph", role: "member", department: "fulfillment" },
  { name: "Accounting Member", email: "accounting@happylifeorganics.ph", role: "member", department: "accounting" },
];

for (const u of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: u.name, role: u.role, department: u.department },
  });
  if (error) {
    if (/registered|exists/i.test(error.message)) {
      console.log(`• ${u.email} already exists — skipping`);
    } else {
      console.error(`✗ ${u.email}: ${error.message}`);
    }
    continue;
  }
  // Ensure profile fields are set (in case trigger defaults differ).
  await supabase
    .from("users")
    .upsert(
      { id: data.user.id, name: u.name, email: u.email, role: u.role, department: u.department },
      { onConflict: "id" },
    );
  console.log(`✓ created ${u.email} (${u.role})`);
}

console.log(`\nDone. Password for all seeded users: ${PASSWORD}`);
console.log("Log in and change it, then run supabase/seed.sql for demo data.");
