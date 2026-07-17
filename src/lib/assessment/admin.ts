import { createClient } from "@/lib/supabase/server";

// Admin access = a signed-in Supabase user whose email is on ADMIN_ALLOWLIST
// (spec §12). Sign-in can succeed for anyone; /admin gates on this.
export function adminAllowlist(): string[] {
  return (process.env.ADMIN_ALLOWLIST ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminEmail(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  if (!email) return null;
  const allow = adminAllowlist();
  // Empty allowlist = locked down (no one). Populate ADMIN_ALLOWLIST to grant.
  if (allow.length === 0 || !allow.includes(email)) return null;
  return email;
}
