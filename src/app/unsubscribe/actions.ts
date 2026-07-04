"use server";

import { createServiceClient } from "@/lib/supabase/server";

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public action (no auth) — uses the service role client so it bypasses RLS.
// Marks the subscriber matching the token as unsubscribed.
export async function doUnsubscribe(token: string) {
  if (!uuidRe.test(token)) return { error: "This unsubscribe link is invalid." };
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("email_subscribers")
    .update({ status: "unsubscribed" })
    .eq("unsubscribe_token", token)
    .select("email")
    .maybeSingle();
  if (error) return { error: "Something went wrong. Please try again." };
  if (!data) return { error: "This unsubscribe link is invalid." };
  return { ok: true, email: data.email as string };
}
