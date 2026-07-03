import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPHP, formatDate, formatDateTime } from "@/lib/utils";
import { labelize } from "@/lib/constants";
import { OrderDetailEditor } from "./editor";
import type { Order, OrderLine, UserProfile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!order) notFound();
  const o = order as Order;

  const [linesRes, usersRes, updaterRes] = await Promise.all([
    supabase.from("order_lines").select("*").eq("order_id", o.id),
    supabase.from("users").select("*").order("name"),
    o.updated_by
      ? supabase.from("users").select("name").eq("id", o.updated_by).single()
      : Promise.resolve({ data: null }),
  ]);

  const lines = (linesRes.data as OrderLine[]) ?? [];
  const users = (usersRes.data as UserProfile[]) ?? [];
  const updaterName = (updaterRes.data as { name: string } | null)?.name;

  return (
    <div className="space-y-4">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{o.order_ref}</h1>
          <p className="text-sm text-muted-foreground">
            {labelize(o.channel)} · {o.customer_name || "No customer name"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <OrderDetailEditor order={o} users={users} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Line items</CardTitle>
            </CardHeader>
            <CardContent>
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No line items (order-level import).
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-1.5 text-left">Product</th>
                      <th className="py-1.5 text-right">Qty</th>
                      <th className="py-1.5 text-right">Unit price</th>
                      <th className="py-1.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id} className="border-b last:border-0">
                        <td className="py-1.5">{l.product_name ?? "—"}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {l.quantity}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatPHP(l.unit_price)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {formatPHP(l.quantity * l.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Order date" value={formatDate(o.order_date)} />
            <Row
              label="Target completion"
              value={formatDate(o.target_completion_date)}
            />
            <Row label="Total" value={formatPHP(o.amount_total)} />
            <Row label="Paid" value={formatPHP(o.amount_paid)} />
            <Row
              label="Balance"
              value={formatPHP(o.amount_total - o.amount_paid)}
            />
            <div className="border-t pt-2 text-xs text-muted-foreground">
              Last updated {formatDateTime(o.updated_at)}
              {updaterName ? ` by ${updaterName}` : ""}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
