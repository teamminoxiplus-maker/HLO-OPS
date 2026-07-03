import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "@/components/section-tabs";
import { ContentListClient } from "./list-client";
import type { Campaign, ContentItem, Product, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const CONTENT_TABS = [
  { href: "/content", label: "Calendar" },
  { href: "/content/list", label: "List" },
  { href: "/content/performance", label: "Performance" },
  { href: "/content/campaigns", label: "Campaigns" },
];

export default async function ContentListPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const brand = searchParams.brand_line;

  const embed = brand ? "products!inner(brand_line, name)" : "products(brand_line, name)";
  let query = supabase
    .from("content_items")
    .select(`*, ${embed}`, { count: "exact" })
    .order("publish_date", { ascending: false, nullsFirst: false });

  if (brand) query = query.eq("products.brand_line", brand);
  if (searchParams.platform) query = query.eq("platform", searchParams.platform);
  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.assigned_to)
    query = query.eq("assigned_to", searchParams.assigned_to);
  if (searchParams.q) query = query.ilike("title", `%${searchParams.q}%`);

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const [contentRes, productsRes, campaignsRes, usersRes] = await Promise.all([
    query,
    supabase.from("products").select("*").eq("active", true).order("name"),
    supabase.from("campaigns").select("id, name").order("name"),
    supabase.from("users").select("*").order("name"),
  ]);

  const total = contentRes.count ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Content &amp; Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Plan and track content across all brand lines and platforms.
        </p>
      </div>
      <SectionTabs tabs={CONTENT_TABS} />
      <ContentListClient
        items={(contentRes.data as (ContentItem & { products: any })[]) ?? []}
        products={(productsRes.data as Product[]) ?? []}
        campaigns={(campaignsRes.data as Pick<Campaign, "id" | "name">[]) ?? []}
        users={(usersRes.data as UserProfile[]) ?? []}
        page={page}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        total={total}
      />
    </div>
  );
}
