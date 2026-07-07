"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OrderChannel, PaymentStatus, OrderStatus } from "@/lib/types";

// Our importable fields. order_ref is required; the rest are best-effort.
export const IMPORT_FIELDS = [
  { key: "order_ref", label: "Order Ref", required: true },
  { key: "customer_name", label: "Customer Name", required: false },
  { key: "order_date", label: "Order Date", required: false },
  { key: "target_completion_date", label: "Target Completion Date", required: false },
  { key: "amount_total", label: "Amount Total", required: false },
  { key: "amount_paid", label: "Amount Paid", required: false },
  { key: "payment_status", label: "Payment Status", required: false },
  { key: "status", label: "Order Status", required: false },
  { key: "tracking_number", label: "Tracking #", required: false },
  { key: "notes", label: "Notes", required: false },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

async function currentUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function saveMapping(
  channel: OrderChannel,
  mapping: Record<string, string>,
) {
  const supabase = createClient();
  const uid = await currentUserId();
  const { error } = await supabase
    .from("import_mappings")
    .upsert(
      { channel, mapping, updated_by: uid, updated_at: new Date().toISOString() },
      { onConflict: "channel" },
    );
  if (error) return { error: error.message };
  return { ok: true };
}

function parseMoney(v: unknown): number {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  const s = String(v).trim();
  // Already ISO-ish
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizePayment(v: unknown): PaymentStatus {
  const s = String(v ?? "").toLowerCase();
  if (/paid|completed|success/.test(s) && !/unpaid|partial/.test(s)) return "paid";
  if (/partial|balance|downpayment|dp/.test(s)) return "partial";
  return "unpaid";
}

function normalizeStatus(v: unknown): OrderStatus {
  const s = String(v ?? "").toLowerCase();
  if (/deliver|complete|received/.test(s)) return "delivered";
  if (/cancel|refund|return/.test(s)) return "cancelled";
  if (/ship|out for|transit|ready/.test(s)) return "ready_to_ship";
  if (/pack|process|production|prepar/.test(s)) return "in_production";
  return "pending";
}

export interface ImportSummary {
  inserted: number;
  updated: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

// rows: already mapped to our field keys (client applies the column mapping).
export async function importOrders(
  channel: OrderChannel,
  rows: Record<string, string>[],
): Promise<ImportSummary | { error: string }> {
  const supabase = createClient();
  const uid = await currentUserId();

  const summary: ImportSummary = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  // Build clean payloads, dedupe within file (last row wins per order_ref).
  const byRef = new Map<string, Record<string, unknown>>();
  rows.forEach((r, i) => {
    const ref = (r.order_ref ?? "").trim();
    if (!ref) {
      summary.errors.push({ row: i + 1, reason: "Missing order_ref" });
      summary.skipped++;
      return;
    }
    byRef.set(ref, {
      order_ref: ref,
      channel,
      customer_name: (r.customer_name ?? "").trim(),
      order_date: parseDate(r.order_date) ?? new Date().toISOString().slice(0, 10),
      target_completion_date: parseDate(r.target_completion_date),
      amount_total: parseMoney(r.amount_total),
      amount_paid: parseMoney(r.amount_paid),
      payment_status: r.payment_status
        ? normalizePayment(r.payment_status)
        : "unpaid",
      status: r.status ? normalizeStatus(r.status) : "pending",
      tracking_number: r.tracking_number ? String(r.tracking_number).trim() : null,
      notes: r.notes ? String(r.notes).trim() : null,
      updated_by: uid,
    });
  });

  const payloads = Array.from(byRef.values());
  const refs = payloads.map((p) => p.order_ref as string);

  // Which refs already exist for this channel? (for new/updated counts)
  const existing = new Set<string>();
  for (let i = 0; i < refs.length; i += 500) {
    const chunk = refs.slice(i, i + 500);
    const { data } = await supabase
      .from("orders")
      .select("order_ref")
      .eq("channel", channel)
      .in("order_ref", chunk);
    (data ?? []).forEach((o: { order_ref: string }) => existing.add(o.order_ref));
  }

  // Batch upsert (500/batch) with dedupe on (channel, order_ref).
  for (let i = 0; i < payloads.length; i += 500) {
    const batch = payloads.slice(i, i + 500);
    const { error } = await supabase
      .from("orders")
      .upsert(batch, { onConflict: "channel,order_ref" });
    if (error) {
      summary.errors.push({ row: i + 1, reason: error.message });
      summary.skipped += batch.length;
      continue;
    }
    for (const p of batch) {
      if (existing.has(p.order_ref as string)) summary.updated++;
      else summary.inserted++;
    }
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return summary;
}
