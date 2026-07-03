import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "@/components/section-tabs";
import { Badge } from "@/components/ui/badge";
import { CampaignModalTrigger } from "./campaign-modal";
import { formatDate } from "@/lib/utils";
import { labelize } from "@/lib/constants";
import type { Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

const CONTENT_TABS = [
  { href: "/content", label: "Calendar" },
  { href: "/content/list", label: "List" },
  { href: "/content/performance", label: "Performance" },
  { href: "/content/campaigns", label: "Campaigns" },
];

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  live: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  ended: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

export default async function CampaignsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .order("start_date", { ascending: false, nullsFirst: false });
  const campaigns = (data as Campaign[]) ?? [];

  // Content counts per campaign.
  const { data: counts } = await supabase
    .from("content_items")
    .select("campaign_id")
    .not("campaign_id", "is", null);
  const countMap: Record<string, number> = {};
  (counts as { campaign_id: string }[] | null)?.forEach((c) => {
    countMap[c.campaign_id] = (countMap[c.campaign_id] ?? 0) + 1;
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Content &amp; Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Campaigns group content and roll up performance.
        </p>
      </div>
      <SectionTabs tabs={CONTENT_TABS} />

      <div className="flex justify-end">
        <CampaignModalTrigger campaign={null} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.length === 0 && (
          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
        )}
        {campaigns.map((c) => (
          <Link
            key={c.id}
            href={`/content/campaigns/${c.id}`}
            className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{c.name}</span>
              <Badge className={STATUS_COLORS[c.status]}>
                {labelize(c.status)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(c.start_date)} – {formatDate(c.end_date)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {countMap[c.id] ?? 0} content item(s)
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
