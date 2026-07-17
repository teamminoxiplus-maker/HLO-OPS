import Link from "next/link";
import { dashboardStats } from "@/lib/assessment/queries";
import { concernLabel } from "@/lib/assessment/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { ConcernDonut, DropOffChart } from "./charts";

export const dynamic = "force-dynamic";

// Assessment dashboard (spec §12).
export default async function AdminDashboard() {
  const s = await dashboardStats();

  const stat = (label: string, value: string | number, sub?: string) => (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assessment</h1>
          <p className="text-sm text-muted-foreground">
            MINOXIPLUS free hair loss assessment — leads & funnel.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/leads"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            View leads
          </Link>
          <Link
            href="/admin/export"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Export CSV
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat("Today", s.today)}
        {stat("Last 7 days", s.last7)}
        {stat("Last 30 days", s.last30)}
        {stat("Completion rate", `${s.completionRate}%`, `${s.completed}/${s.started} completed`)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Drop-off by step (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <DropOffChart data={s.dropOff} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Concern mix (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ConcernDonut
              data={s.concernMix.map((c) => ({
                concern: concernLabel(c.concern as never),
                count: c.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source mix (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            {s.sourceMix.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="space-y-2">
                {s.sourceMix.map((row) => (
                  <li key={row.src} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{row.src}</span>
                    <span className="tabular-nums text-muted-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {s.recent.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <ul className="divide-y">
                {s.recent.map((r) => (
                  <li key={r.id} className="py-2">
                    <Link
                      href={`/admin/leads/${r.id}`}
                      className="flex items-center justify-between gap-2 text-sm hover:underline"
                    >
                      <span className="truncate">
                        {r.full_name ?? <em className="text-muted-foreground">draft</em>}
                        {r.concern && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {concernLabel(r.concern)}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(r.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
