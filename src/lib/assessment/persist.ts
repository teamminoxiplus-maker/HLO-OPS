import { createServiceClient } from "@/lib/supabase/server";

// All public writes go through the service-role client so the anon key can
// never touch the leads table (spec §11 RLS). Import only in server code.
export function assessmentDb() {
  return createServiceClient();
}
