import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";

// Returns the current authenticated user's profile (public.users row) or null.
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fallback to a minimal profile if the trigger row is missing.
  if (!data) {
    return {
      id: user.id,
      name: user.email?.split("@")[0] ?? "User",
      email: user.email ?? "",
      role: "member",
      department: null,
      created_at: user.created_at ?? new Date().toISOString(),
    };
  }
  return data as UserProfile;
}
