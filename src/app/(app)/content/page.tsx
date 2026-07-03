import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "@/components/section-tabs";
import { ContentCalendar } from "./calendar";
import { todayManila } from "@/lib/utils";
import type { Campaign, ContentItem, Product, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

const CONTENT_TABS = [
  { href: "/content", label: "Calendar" },
  { href: "/content/list", label: "List" },
  { href: "/content/performance", label: "Performance" },
  { href: "/content/campaigns", label: "Campaigns" },
];

export default async function ContentPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase = createClient();

  // month = YYYY-MM (default current Manila month)
  const month = searchParams.month ?? todayManila().slice(0, 7);
  const first = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = `${month}-${String(lastDay).padStart(2, "0")}`;

  const [contentRes, productsRes, campaignsRes, usersRes] = await Promise.all([
    supabase
      .from("content_items")
      .select("*, products(brand_line, name)")
      .gte("publish_date", first)
      .lte("publish_date", last)
      .order("publish_date"),
    supabase.from("products").select("*").eq("active", true).order("name"),
    supabase.from("campaigns").select("id, name").order("name"),
    supabase.from("users").select("*").order("name"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Content &amp; Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Plan and track content across all brand lines and platforms.
        </p>
      </div>
      <SectionTabs tabs={CONTENT_TABS} />
      <ContentCalendar
        month={month}
        items={(contentRes.data as (ContentItem & { products: any })[]) ?? []}
        products={(productsRes.data as Product[]) ?? []}
        campaigns={(campaignsRes.data as Pick<Campaign, "id" | "name">[]) ?? []}
        users={(usersRes.data as UserProfile[]) ?? []}
      />
    </div>
  );
}
