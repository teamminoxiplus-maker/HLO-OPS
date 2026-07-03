import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "@/components/section-tabs";
import { PerformanceClient } from "./perf-client";
import { todayManila } from "@/lib/utils";
import type { ContentItem } from "@/lib/types";

export const dynamic = "force-dynamic";

const CONTENT_TABS = [
  { href: "/content", label: "Calendar" },
  { href: "/content/list", label: "List" },
  { href: "/content/performance", label: "Performance" },
  { href: "/content/campaigns", label: "Campaigns" },
];

export default async function PerformancePage() {
  const supabase = createClient();
  const monthStart = `${todayManila().slice(0, 7)}-01`;

  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("status", "published")
    .order("publish_date", { ascending: false, nullsFirst: false })
    .limit(500);

  const items = (data as ContentItem[]) ?? [];

  // Top 10 by views for content published this month (chart).
  const topThisMonth = items
    .filter((i) => (i.publish_date ?? "") >= monthStart && (i.views ?? 0) > 0)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 10)
    .map((i) => ({ name: i.title, views: i.views ?? 0 }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Content &amp; Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Manual performance metrics for published content.
        </p>
      </div>
      <SectionTabs tabs={CONTENT_TABS} />
      <PerformanceClient items={items} topThisMonth={topThisMonth} />
    </div>
  );
}
