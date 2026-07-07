"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  OrderStatusBadge,
  PaymentBadge,
  DaysPendingBadge,
} from "@/components/badges";
import { ORDER_STATUSES, labelize } from "@/lib/constants";
import { formatPHP, formatDate, cn } from "@/lib/utils";
import {
  bulkMarkPaid,
  bulkUpdateOrders,
  bulkDeleteOrders,
  updateOrderField,
} from "./actions";
import { QuickAddOrder } from "./quick-add";
import type {
  OrderWithComputed,
  Product,
  UserProfile,
  OrderStatus,
} from "@/lib/types";

interface Props {
  orders: OrderWithComputed[];
  users: UserProfile[];
  products: Product[];
  thresholds: { green: number; yellow: number };
  page: number;
  pageCount: number;
  total: number;
  sort: string;
  dir: "asc" | "desc";
}

function needsCollection(o: OrderWithComputed) {
  return o.payment_status !== "paid" && o.status === "ready_to_ship";
}

export function OrdersTable({
  orders,
  users,
  products,
  thresholds,
  page,
  pageCount,
  total,
  sort,
  dir,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  // Refresh data when the tab regains focus so simultaneous edits surface
  // (spec §7: "UI should refresh data on focus").
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const allChecked = orders.length > 0 && selected.size === orders.length;
  const toggleAll = () =>
    setSelected(allChecked ? new Set() : new Set(orders.map((o) => o.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const sortLink = (col: string) => {
    const params = new URLSearchParams(sp.toString());
    const nextDir = sort === col && dir === "desc" ? "asc" : "desc";
    params.set("sort", col);
    params.set("dir", nextDir);
    return `/orders?${params.toString()}`;
  };

  const pageLink = (p: number) => {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    return `/orders?${params.toString()}`;
  };

  const ids = Array.from(selected);
  const runBulk = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res?.error) alert(res.error);
      setSelected(new Set());
      router.refresh();
    });

  const Th = ({ col, label }: { col: string; label: string }) => (
    <TableHead>
      <Link href={sortLink(col)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sort === col && "text-primary")} />
      </Link>
    </TableHead>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <QuickAddOrder users={users} products={products} />
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <Select
              className="h-8 w-auto"
              disabled={pending}
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                runBulk(() =>
                  bulkUpdateOrders(ids, { status: e.target.value as OrderStatus }),
                );
              }}
            >
              <option value="">Set status…</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </Select>
            <Select
              className="h-8 w-auto"
              disabled={pending}
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                const val = e.target.value === "none" ? null : e.target.value;
                runBulk(() => bulkUpdateOrders(ids, { assigned_to: val }));
              }}
            >
              <option value="">Assign to…</option>
              <option value="none">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => runBulk(() => bulkMarkPaid(ids))}
            >
              Mark paid
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={pending}
              onClick={() => {
                if (
                  confirm(
                    `Delete ${ids.length} order${ids.length === 1 ? "" : "s"}? This can't be undone.`,
                  )
                )
                  runBulk(() => bulkDeleteOrders(ids));
              }}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="h-4 w-4 rounded border-input"
                />
              </TableHead>
              <Th col="order_ref" label="Ref" />
              <Th col="customer_name" label="Customer" />
              <TableHead>Channel</TableHead>
              <Th col="order_date" label="Order date" />
              <Th col="days_pending" label="Days pending" />
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <Th col="amount_total" label="Total" />
              <TableHead>Assignee</TableHead>
              <TableHead>Tracking #</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  No orders match these filters.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => (
              <TableRow
                key={o.id}
                data-state={selected.has(o.id) ? "selected" : undefined}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(o.id)}
                    onChange={() => toggleOne(o.id)}
                    aria-label={`Select ${o.order_ref}`}
                    className="h-4 w-4 rounded border-input"
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/orders/${o.id}`} className="hover:underline">
                    {o.order_ref}
                  </Link>
                  {needsCollection(o) && (
                    <span
                      className="ml-1 inline-flex items-center text-rose-600"
                      title="Ready to ship but not fully paid — follow up collection"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-[160px] truncate">
                  {o.customer_name || "—"}
                </TableCell>
                <TableCell>{labelize(o.channel)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(o.order_date)}
                </TableCell>
                <TableCell>
                  <DaysPendingBadge days={o.days_pending} thresholds={thresholds} />
                </TableCell>
                <TableCell>
                  <InlineStatus id={o.id} value={o.status} />
                </TableCell>
                <TableCell>
                  <PaymentBadge
                    status={o.payment_status}
                    paid={o.amount_paid}
                    total={o.amount_total}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap font-medium tabular-nums">
                  {formatPHP(o.amount_total)}
                </TableCell>
                <TableCell>
                  <InlineAssignee
                    id={o.id}
                    value={o.assigned_to}
                    users={users}
                  />
                </TableCell>
                <TableCell>
                  <InlineTracking id={o.id} value={o.tracking_number} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {pageCount} · {total} total
        </span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(pageLink(page - 1))}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => router.push(pageLink(page + 1))}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InlineStatus({ id, value }: { id: string; value: OrderStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      className="h-8 w-auto min-w-[130px]"
      value={value}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await updateOrderField(id, { status: e.target.value as OrderStatus });
          router.refresh();
        })
      }
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {labelize(s)}
        </option>
      ))}
    </Select>
  );
}

function InlineAssignee({
  id,
  value,
  users,
}: {
  id: string;
  value: string | null;
  users: UserProfile[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      className="h-8 w-auto min-w-[120px]"
      value={value ?? ""}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await updateOrderField(id, {
            assigned_to: e.target.value || null,
          });
          router.refresh();
        })
      }
    >
      <option value="">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </Select>
  );
}

// Editable courier tracking number — saves on blur / Enter.
function InlineTracking({ id, value }: { id: string; value: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [val, setVal] = useState(value ?? "");

  useEffect(() => {
    setVal(value ?? "");
  }, [value]);

  function save() {
    const next = val.trim();
    if (next === (value ?? "")) return; // unchanged
    start(async () => {
      await updateOrderField(id, { tracking_number: next || null });
      router.refresh();
    });
  }

  return (
    <Input
      className="h-8 w-[140px]"
      value={val}
      disabled={pending}
      placeholder="Add tracking #"
      onChange={(e) => setVal(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
