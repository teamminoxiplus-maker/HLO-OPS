"use server";

import { revalidatePath } from "next/cache";
import { getAdminEmail } from "@/lib/assessment/admin";
import { assessmentDb } from "@/lib/assessment/persist";

// Toggle the Contacted flag on a lead (spec §12). Allowlist-gated.
export async function toggleContacted(id: string, next: boolean) {
  if (!(await getAdminEmail())) throw new Error("Forbidden");
  await assessmentDb()
    .from("assessments")
    .update({
      contacted: next,
      contacted_at: next ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
}

// Save free-text ops notes on a lead (spec §12).
export async function saveNotes(id: string, notes: string) {
  if (!(await getAdminEmail())) throw new Error("Forbidden");
  await assessmentDb()
    .from("assessments")
    .update({ notes })
    .eq("id", id);
  revalidatePath(`/admin/leads/${id}`);
}
