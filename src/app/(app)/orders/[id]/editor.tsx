"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  labelize,
} from "@/lib/constants";
import { updateOrderField } from "../actions";
import type {
  Order,
  OrderStatus,
  PaymentStatus,
  UserProfile,
} from "@/lib/types";

export function OrderDetailEditor({
  order,
  users,
}: {
  order: Order;
  users: UserProfile[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [payment, setPayment] = useState<PaymentStatus>(order.payment_status);
  const [assignee, setAssignee] = useState(order.assigned_to ?? "");
  const [amountPaid, setAmountPaid] = useState(String(order.amount_paid));
  const [targetDate, setTargetDate] = useState(
    order.target_completion_date ?? "",
  );
  const [notes, setNotes] = useState(order.notes ?? "");

  const showWarning = payment !== "paid" && status === "ready_to_ship";

  function save() {
    start(async () => {
      await updateOrderField(order.id, {
        status,
        payment_status: payment,
        assigned_to: assignee || null,
        amount_paid: parseFloat(amountPaid) || 0,
        target_completion_date: targetDate || null,
        notes,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Details</CardTitle>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </CardHeader>
      <CardContent className="space-y-3">
        {showWarning && (
          <div className="flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Ready to ship but not fully paid — follow up collection before
            releasing.
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Order status</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Payment status</Label>
            <Select
              value={payment}
              onChange={(e) => setPayment(e.target.value as PaymentStatus)}
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
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
            <Label>Amount paid (₱)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Target completion</Label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
