import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { SectionTabs } from "@/components/section-tabs";
import { TaskBoard } from "./board";
import type { ProductionTask, Sop, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();

  const [tasksRes, usersRes, sopsRes] = await Promise.all([
    supabase
      .from("production_tasks")
      .select("*")
      .order("priority", { ascending: false })
      .order("deadline", { ascending: true, nullsFirst: false }),
    supabase.from("users").select("*").order("name"),
    supabase.from("sops").select("id, title, category").order("title"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Production</h1>
        <p className="text-sm text-muted-foreground">
          Task board &amp; standard operating procedures.
        </p>
      </div>

      <SectionTabs
        tabs={[
          { href: "/production", label: "Task board" },
          { href: "/production/sops", label: "SOP library" },
        ]}
      />

      <TaskBoard
        tasks={(tasksRes.data as ProductionTask[]) ?? []}
        users={(usersRes.data as UserProfile[]) ?? []}
        sops={(sopsRes.data as Pick<Sop, "id" | "title" | "category">[]) ?? []}
        currentUserId={profile?.id ?? null}
      />
    </div>
  );
}
