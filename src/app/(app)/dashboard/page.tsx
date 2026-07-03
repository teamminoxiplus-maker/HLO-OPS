import Link from "next/link";
import {
  Package,
  AlertTriangle,
  Wallet,
  CalendarClock,
  Ban,
  CalendarDays,
  Clock,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { todayManila, addDays } from "@/lib/utils";
import { CoverageNudge } from "@/components/coverage-nudge";

export const dynamic = "force-dynamic";

async function countOrders(
  build: (q: any) => any,
): Promise<number> {
  const supabase = createClient();
  const q = build(
    supabase.from("orders").select("id", { count: "exact", head: true }),
  );
  const { count } = await q;
  return count ?? 0;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const profile = await getCurrentProfile();
  const today = todayManila();
  const weekAhead = addDays(today, 7);
  const threeDaysAgo = addDays(today, -3);

  const [
    pendingOrders,
    overdueOrders,
    unpaidOrders,
    tasksDue,
    blockedTasks,
    scheduledContent,
    stuckReview,
  ] = await Promise.all([
    countOrders((q) => q.eq("status", "pending")),
    countOrders((q) =>
      q
        .lt("target_completion_date", today)
        .not("status", "in", "(delivered,cancelled)"),
    ),
    countOrders((q) =>
      q
        .in("payment_status", ["unpaid", "partial"])
        .not("status", "in", "(delivered,cancelled)"),
    ),
    supabase
      .from("production_tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "done")
      .gte("deadline", today)
      .lte("deadline", weekAhead)
      .then((r) => r.count ?? 0),
    supabase
      .from("production_tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "done")
      .not("blocked_reason", "is", null)
      .then((r) => r.count ?? 0),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .gte("publish_date", today)
      .lte("publish_date", weekAhead)
      .then((r) => r.count ?? 0),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "for_review")
      .lt("updated_at", `${threeDaysAgo}T00:00:00+08:00`)
      .then((r) => r.count ?? 0),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Kumusta{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s where operations stand today.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Orders
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            href="/orders?status=pending"
            label="Pending orders"
            value={pendingOrders}
            icon={Package}
            tone="slate"
          />
          <StatCard
            href={`/orders?date_to=${today}`}
            label="Overdue (past target)"
            value={overdueOrders}
            icon={AlertTriangle}
            tone="rose"
          />
          <StatCard
            href="/orders?payment_status=unpaid"
            label="Unpaid / partial"
            value={unpaidOrders}
            icon={Wallet}
            tone="amber"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Production
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            href="/production"
            label="Tasks due this week"
            value={tasksDue}
            icon={CalendarClock}
            tone="blue"
          />
          <StatCard
            href="/production"
            label="Blocked tasks"
            value={blockedTasks}
            icon={Ban}
            tone="rose"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Content
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard
            href="/content?status=scheduled"
            label="Scheduled this week"
            value={scheduledContent}
            icon={CalendarDays}
            tone="violet"
          />
          <StatCard
            href="/content?status=for_review"
            label="Stuck in review > 3 days"
            value={stuckReview}
            icon={Clock}
            tone="amber"
          />
        </div>
      </section>

      <CoverageNudge />
    </div>
  );
}

const TONES: Record<string, string> = {
  slate: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300",
  rose: "text-rose-600 bg-rose-100 dark:bg-rose-950 dark:text-rose-300",
  amber: "text-amber-600 bg-amber-100 dark:bg-amber-950 dark:text-amber-300",
  blue: "text-blue-600 bg-blue-100 dark:bg-blue-950 dark:text-blue-300",
  violet: "text-violet-600 bg-violet-100 dark:bg-violet-950 dark:text-violet-300",
};

function StatCard({
  href,
  label,
  value,
  icon: Icon,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="transition-colors group-hover:border-primary/50">
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${TONES[tone]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-2xl font-bold tabular-nums">{value}</div>
            <div className="truncate text-sm text-muted-foreground">{label}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </CardContent>
      </Card>
    </Link>
  );
}
