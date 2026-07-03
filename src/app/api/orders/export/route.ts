import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import type { OrderWithComputed } from "@/lib/types";

export const dynamic = "force-dynamic";

// CSV export of the current filtered order view for accounting (spec §4.3).
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  let query = supabase.from("orders_with_computed").select("*");

  if (sp.get("status")) query = query.eq("status", sp.get("status")!);
  if (sp.get("payment_status"))
    query = query.eq("payment_status", sp.get("payment_status")!);
  if (sp.get("channel")) query = query.eq("channel", sp.get("channel")!);
  if (sp.get("assigned_to"))
    query = query.eq("assigned_to", sp.get("assigned_to")!);
  if (sp.get("date_from")) query = query.gte("order_date", sp.get("date_from")!);
  if (sp.get("date_to")) query = query.lte("order_date", sp.get("date_to")!);
  if (sp.get("q")) {
    const q = sp.get("q")!.replace(/[%,]/g, " ").trim();
    query = query.or(`customer_name.ilike.%${q}%,order_ref.ilike.%${q}%`);
  }

  const sort = sp.get("sort") ?? "days_pending";
  const dir = sp.get("dir") === "asc";
  query = query.order(sort, { ascending: dir, nullsFirst: false }).limit(10000);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data as OrderWithComputed[]).map((o) => ({
    order_ref: o.order_ref,
    customer_name: o.customer_name,
    channel: o.channel,
    order_date: o.order_date,
    target_completion_date: o.target_completion_date ?? "",
    days_pending: o.days_pending ?? "",
    status: o.status,
    payment_status: o.payment_status,
    amount_total: o.amount_total,
    amount_paid: o.amount_paid,
    balance: Number(o.amount_total) - Number(o.amount_paid),
    assignee: o.assignee_name ?? "",
    notes: o.notes ?? "",
  }));

  const csv = Papa.unparse(rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hlo-orders-${stamp}.csv"`,
    },
  });
}
