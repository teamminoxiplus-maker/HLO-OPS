import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SopMarkdown } from "@/components/sop-markdown";
import { formatDateTime } from "@/lib/utils";
import { labelize } from "@/lib/constants";
import type { Sop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SopDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("sops")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!data) notFound();
  const sop = data as Sop;

  let updater: string | null = null;
  if (sop.updated_by) {
    const { data: u } = await supabase
      .from("users")
      .select("name")
      .eq("id", sop.updated_by)
      .single();
    updater = (u as { name: string } | null)?.name ?? null;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/production/sops"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> SOP library
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{sop.title}</h1>
            <Badge className="bg-secondary text-secondary-foreground">
              {labelize(sop.category)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Version {sop.version} · Last updated {formatDateTime(sop.updated_at)}
            {updater ? ` by ${updater}` : ""}
          </p>
        </div>
        <Link
          href={`/production/sops/${sop.id}/edit`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Pencil className="h-4 w-4" /> Edit
        </Link>
      </div>

      <div className="rounded-lg border bg-card p-5">
        <SopMarkdown body={sop.body} />
      </div>
      <p className="text-xs text-muted-foreground">
        Checkbox ticks here are just for following along — they aren&apos;t
        saved. Log actual work in the task board.
      </p>
    </div>
  );
}
