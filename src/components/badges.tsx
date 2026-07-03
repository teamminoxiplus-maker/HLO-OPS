import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  TASK_PRIORITY_COLORS,
  CONTENT_STATUS_COLORS,
  labelize,
} from "@/lib/constants";
import type {
  OrderStatus,
  PaymentStatus,
  TaskPriority,
  ContentStatus,
  DaysPendingThresholds,
} from "@/lib/types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge className={ORDER_STATUS_COLORS[status]}>{labelize(status)}</Badge>;
}

export function PaymentBadge({
  status,
  paid,
  total,
}: {
  status: PaymentStatus;
  paid?: number;
  total?: number;
}) {
  return (
    <span className="inline-flex flex-col gap-0.5">
      <Badge className={PAYMENT_STATUS_COLORS[status]}>{labelize(status)}</Badge>
      {status === "partial" && total !== undefined && (
        <span className="text-[11px] text-muted-foreground">
          ₱{(paid ?? 0).toLocaleString()} / ₱{total.toLocaleString()}
        </span>
      )}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge className={TASK_PRIORITY_COLORS[priority]}>{labelize(priority)}</Badge>
  );
}

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  return (
    <Badge className={CONTENT_STATUS_COLORS[status]}>{labelize(status)}</Badge>
  );
}

// Days-pending badge: green ≤ green threshold, yellow ≤ yellow threshold, red above.
export function DaysPendingBadge({
  days,
  thresholds,
}: {
  days: number | null;
  thresholds: DaysPendingThresholds;
}) {
  if (days === null || days === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  let color: string;
  if (days <= thresholds.green) {
    color =
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  } else if (days <= thresholds.yellow) {
    color = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  } else {
    color = "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300";
  }
  return (
    <Badge className={cn("tabular-nums", color)}>
      {days} {days === 1 ? "day" : "days"}
    </Badge>
  );
}
