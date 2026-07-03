"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus, SopCategory } from "@/lib/types";

async function currentUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface TaskInput {
  title: string;
  description: string | null;
  related_sop_id: string | null;
  assigned_to: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  blocked_reason: string | null;
}

export async function createTask(input: TaskInput) {
  if (input.status !== "pending" && !input.assigned_to) {
    return { error: "A task must have an assignee to leave Pending." };
  }
  const supabase = createClient();
  const uid = await currentUserId();
  const { error } = await supabase.from("production_tasks").insert({
    ...input,
    title: input.title.trim(),
    updated_by: uid,
  });
  if (error) return { error: error.message };
  revalidatePath("/production");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateTask(id: string, input: Partial<TaskInput>) {
  const supabase = createClient();
  const uid = await currentUserId();
  const { error } = await supabase
    .from("production_tasks")
    .update({ ...input, updated_by: uid })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/production");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Move a task between columns. Guards the assignee rule.
export async function moveTask(
  id: string,
  status: TaskStatus,
  assignedTo: string | null,
) {
  if (status !== "pending" && !assignedTo) {
    return {
      error: "Assign someone before moving this task out of Pending.",
    };
  }
  return updateTask(id, { status });
}

export async function deleteTask(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("production_tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/production");
  return { ok: true };
}

// ---------------- SOPs ----------------
export async function saveSop(
  id: string | null,
  input: { title: string; category: SopCategory; body: string },
) {
  const supabase = createClient();
  const uid = await currentUserId();

  if (id) {
    // version auto-increments via DB trigger on body/title/category change.
    const { error } = await supabase
      .from("sops")
      .update({ ...input, updated_by: uid })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath(`/production/sops/${id}`);
    revalidatePath("/production/sops");
    redirect(`/production/sops/${id}`);
  } else {
    const { data, error } = await supabase
      .from("sops")
      .insert({ ...input, updated_by: uid })
      .select("id")
      .single();
    if (error) return { error: error.message };
    revalidatePath("/production/sops");
    redirect(`/production/sops/${data.id}`);
  }
}
