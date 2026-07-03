import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "@/components/section-tabs";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { labelize, SOP_CATEGORIES } from "@/lib/constants";
import type { Sop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SopsPage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string };
}) {
  const supabase = createClient();
  let query = supabase.from("sops").select("*").order("title");
  if (searchParams.category)
    query = query.eq("category", searchParams.category);
  if (searchParams.q) query = query.ilike("title", `%${searchParams.q}%`);
  const { data } = await query;
  const sops = (data as Sop[]) ?? [];

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <form className="flex flex-wrap gap-2" action="/production/sops">
          <input
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search SOPs…"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select
            name="category"
            defaultValue={searchParams.category ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All categories</option>
            {SOP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labelize(c)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Filter
          </button>
        </form>
        <Link
          href="/production/sops/new"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="h-4 w-4" /> New SOP
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sops.length === 0 && (
          <p className="text-sm text-muted-foreground">No SOPs found.</p>
        )}
        {sops.map((s) => (
          <Link
            key={s.id}
            href={`/production/sops/${s.id}`}
            className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className="bg-secondary text-secondary-foreground">
                    {labelize(s.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    v{s.version} · updated {formatDateTime(s.updated_at)}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
