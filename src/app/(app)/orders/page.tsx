import Link from "next/link";
import { Upload, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDaysPendingThresholds } from "@/lib/settings";
import { buttonVariants } from "@/components/ui/button";
import { OrderFilters } from "./filters";
import { OrdersTable } from "./orders-table";
import type { OrderWithComputed, Product, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const SORTABLE = new Set([
  "days_pending",
  "order_date",
  "amount_total",
  "customer_name",
  "order_ref",
]);

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const supabase = createClient();
  const thresholds = await getDaysPendingThresholds();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const sort = SORTABLE.has(searchParams.sort ?? "")
    ? (searchParams.sort as string)
    : "days_pending";
  const dir = searchParams.dir === "asc" ? "asc" : "desc";

  let query = supabase
    .from("orders_with_computed")
    .select("*", { count: "exact" });

  if (searchParams.status) query = query.eq("status", searchParams.status);
  if (searchParams.payment_status)
    query = query.eq("payment_status", searchParams.payment_status);
  if (searchParams.channel) query = query.eq("channel", searchParams.channel);
  if (searchParams.assigned_to)
    query = query.eq("assigned_to", searchParams.assigned_to);
  if (searchParams.date_from)
    query = query.gte("order_date", searchParams.date_from);
  if (searchParams.date_to)
    query = query.lte("order_date", searchParams.date_to);
  if (searchParams.q) {
    const q = searchParams.q.replace(/[%,]/g, " ").trim();
    query = query.or(`customer_name.ilike.%${q}%,order_ref.ilike.%${q}%`);
  }

  // days_pending is null for delivered/cancelled; nullsFirst:false keeps
  // active orders on top when sorting desc.
  query = query.order(sort, { ascending: dir === "asc", nullsFirst: false });

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const [{ data: orders, count }, usersRes, productsRes] = await Promise.all([
    query,
    supabase.from("users").select("*").order("name"),
    supabase.from("products").select("*").eq("active", true).order("name"),
  ]);

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {total} order{total === 1 ? "" : "s"} · oldest pending on top
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/api/orders/export?${new URLSearchParams(cleanParams(searchParams)).toString()}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Link>
          <Link
            href="/orders/import"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Upload className="h-4 w-4" /> Import CSV
          </Link>
        </div>
      </div>

      <OrderFilters users={(usersRes.data as UserProfile[]) ?? []} />

      <OrdersTable
        orders={(orders as OrderWithComputed[]) ?? []}
        users={(usersRes.data as UserProfile[]) ?? []}
        products={(productsRes.data as Product[]) ?? []}
        thresholds={thresholds}
        page={page}
        pageCount={pageCount}
        total={total}
        sort={sort}
        dir={dir as "asc" | "desc"}
      />
    </div>
  );
}

// Only pass through the filter params to the export link (drop pagination).
function cleanParams(sp: Record<string, string | undefined>) {
  const out: Record<string, string> = {};
  for (const k of [
    "status",
    "payment_status",
    "channel",
    "assigned_to",
    "date_from",
    "date_to",
    "q",
    "sort",
    "dir",
  ]) {
    if (sp[k]) out[k] = sp[k] as string;
  }
  return out;
}
