import { createClient } from "@/lib/supabase/server";
import type { DaysPendingThresholds } from "@/lib/types";

const DEFAULT_THRESHOLDS: DaysPendingThresholds = { green: 3, yellow: 7 };

export async function getDaysPendingThresholds(): Promise<DaysPendingThresholds> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "days_pending_thresholds")
      .single();
    if (data?.value) {
      return { ...DEFAULT_THRESHOLDS, ...(data.value as DaysPendingThresholds) };
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_THRESHOLDS;
}
