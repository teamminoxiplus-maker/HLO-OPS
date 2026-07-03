"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ORDER_CHANNELS,
  PAYMENT_STATUSES,
  labelize,
} from "@/lib/constants";
import { todayManila } from "@/lib/utils";
import { createOrder } from "./actions";
import type {
  OrderChannel,
  PaymentStatus,
  Product,
  UserProfile,
} from "@/lib/types";

interface LineRow {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export function QuickAddOrder({
  users,
  products,
}: {
  users: UserProfile[];
  products: Product[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [ref, setRef] = useState("");
  const [customer, setCustomer] = useState("");
  const [channel, setChannel] = useState<OrderChannel>("direct");
  const [orderDate, setOrderDate] = useState(todayManila());
  const [targetDate, setTargetDate] = useState("");
  const [payment, setPayment] = useState<PaymentStatus>("unpaid");
  const [amountPaid, setAmountPaid] = useState("0");
  const [assignee, setAssignee] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineRow[]>([
    { product_id: "", quantity: 1, unit_price: 0 },
  ]);

  const computedTotal = lines.reduce(
    (sum, l) => sum + l.quantity * l.unit_price,
    0,
  );

  function reset() {
    setRef("");
    setCustomer("");
    setChannel("direct");
    setOrderDate(todayManila());
    setTargetDate("");
    setPayment("unpaid");
    setAmountPaid("0");
    setAssignee("");
    setNotes("");
    setLines([{ product_id: "", quantity: 1, unit_price: 0 }]);
    setError(null);
  }

  function submit() {
    setError(null);
    if (!ref.trim()) {
      setError("Order ref is required.");
      return;
    }
    start(async () => {
      const res = await createOrder({
        order_ref: ref,
        customer_name: customer,
        channel,
        order_date: orderDate,
        target_completion_date: targetDate || null,
        payment_status: payment,
        amount_total: computedTotal,
        amount_paid:
          payment === "paid" ? computedTotal : parseFloat(amountPaid) || 0,
        assigned_to: assignee || null,
        notes: notes || null,
        lines: lines
          .filter((l) => l.product_id)
          .map((l) => {
            const p = products.find((pr) => pr.id === l.product_id);
            return {
              product_id: l.product_id,
              product_name: p?.name ?? null,
              quantity: l.quantity,
              unit_price: l.unit_price,
            };
          }),
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Quick add order
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Quick add order"
        description="For direct / Viber orders. Marketplace orders come in via CSV import."
        className="max-w-xl"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="qa-ref">Order ref *</Label>
              <Input
                id="qa-ref"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="DIR-000046"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qa-cust">Customer</Label>
              <Input
                id="qa-cust"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select
                value={channel}
                onChange={(e) => setChannel(e.target.value as OrderChannel)}
              >
                {ORDER_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {labelize(c)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assignee</Label>
              <Select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="qa-od">Order date</Label>
              <Input
                id="qa-od"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qa-td">Target completion</Label>
              <Input
                id="qa-td"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <Label>Products</Label>
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  className="flex-1"
                  value={l.product_id}
                  onChange={(e) => {
                    const p = products.find((pr) => pr.id === e.target.value);
                    setLines((prev) =>
                      prev.map((row, idx) =>
                        idx === i
                          ? {
                              ...row,
                              product_id: e.target.value,
                              unit_price: row.unit_price,
                            }
                          : row,
                      ),
                    );
                    void p;
                  }}
                >
                  <option value="">Select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={1}
                  className="w-16"
                  value={l.quantity}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((row, idx) =>
                        idx === i
                          ? { ...row, quantity: parseInt(e.target.value) || 1 }
                          : row,
                      ),
                    )
                  }
                  aria-label="Quantity"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-24"
                  value={l.unit_price}
                  placeholder="₱ price"
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((row, idx) =>
                        idx === i
                          ? { ...row, unit_price: parseFloat(e.target.value) || 0 }
                          : row,
                      ),
                    )
                  }
                  aria-label="Unit price"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() =>
                    setLines((prev) =>
                      prev.length === 1
                        ? prev
                        : prev.filter((_, idx) => idx !== i),
                    )
                  }
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  { product_id: "", quantity: 1, unit_price: 0 },
                ])
              }
            >
              <Plus className="h-4 w-4" /> Add product
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Payment status</Label>
              <Select
                value={payment}
                onChange={(e) => setPayment(e.target.value as PaymentStatus)}
              >
                {PAYMENT_STATUSES.map((p) => (
                  <option key={p} value={p}>
                    {labelize(p)}
                  </option>
                ))}
              </Select>
            </div>
            {payment === "partial" && (
              <div className="space-y-1">
                <Label htmlFor="qa-paid">Amount paid</Label>
                <Input
                  id="qa-paid"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="qa-notes">Notes</Label>
            <Textarea
              id="qa-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Taglish notes ok…"
            />
          </div>

          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-semibold text-foreground">
                ₱{computedTotal.toLocaleString()}
              </span>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={pending}>
                {pending ? "Saving…" : "Create order"}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </Modal>
    </>
  );
}
