"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  OrderChannel,
  OrderStatus,
  PaymentStatus,
} from "@/lib/types";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

interface QuickAddLine {
  product_id: string | null;
  product_name?: string | null;
  quantity: number;
  unit_price: number;
}

export interface QuickAddInput {
  order_ref: string;
  customer_name: string;
  channel: OrderChannel;
  order_date: string;
  target_completion_date: string | null;
  payment_status: PaymentStatus;
  amount_total: number;
  amount_paid: number;
  assigned_to: string | null;
  notes: string | null;
  lines: QuickAddLine[];
}

export async function createOrder(input: QuickAddInput) {
  const supabase = createClient();
  const uid = await currentUserId();

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      order_ref: input.order_ref.trim(),
      customer_name: input.customer_name.trim(),
      channel: input.channel,
      order_date: input.order_date,
      target_completion_date: input.target_completion_date,
      payment_status: input.payment_status,
      amount_total: input.amount_total,
      amount_paid: input.amount_paid,
      assigned_to: input.assigned_to,
      notes: input.notes,
      updated_by: uid,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const lines = input.lines.filter(
    (l) => l.product_id || (l.product_name && l.product_name.trim()),
  );
  if (lines.length && order) {
    const { error: lineErr } = await supabase.from("order_lines").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.product_id,
        product_name: l.product_name ?? null,
        quantity: l.quantity,
        unit_price: l.unit_price,
      })),
    );
    if (lineErr) return { error: lineErr.message };
  }

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateOrderField(
  id: string,
  patch: Partial<{
    status: OrderStatus;
    payment_status: PaymentStatus;
    assigned_to: string | null;
    amount_paid: number;
    notes: string;
    target_completion_date: string | null;
  }>,
) {
  const supabase = createClient();
  const uid = await currentUserId();
  const { error } = await supabase
    .from("orders")
    .update({ ...patch, updated_by: uid })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---- Bulk actions ----
export async function bulkUpdateOrders(
  ids: string[],
  patch: Partial<{
    status: OrderStatus;
    payment_status: PaymentStatus;
    assigned_to: string | null;
  }>,
) {
  if (!ids.length) return { ok: true };
  const supabase = createClient();
  const uid = await currentUserId();
  const { error } = await supabase
    .from("orders")
    .update({ ...patch, updated_by: uid })
    .in("id", ids);
  if (error) return { error: error.message };
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Permanently delete the selected orders (order_lines cascade).
export async function bulkDeleteOrders(ids: string[]) {
  if (!ids.length) return { ok: true };
  const supabase = createClient();
  const { error } = await supabase.from("orders").delete().in("id", ids);
  if (error) return { error: error.message };
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: true };
}

// Mark selected orders fully paid (amount_paid := amount_total, status paid).
export async function bulkMarkPaid(ids: string[]) {
  if (!ids.length) return { ok: true };
  const supabase = createClient();
  const uid = await currentUserId();

  const { data: rows, error: readErr } = await supabase
    .from("orders")
    .select("id, amount_total")
    .in("id", ids);
  if (readErr) return { error: readErr.message };

  // Update each so amount_paid tracks that order's total.
  for (const r of rows ?? []) {
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        amount_paid: r.amount_total,
        updated_by: uid,
      })
      .eq("id", r.id);
    if (error) return { error: error.message };
  }
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: true };
}
