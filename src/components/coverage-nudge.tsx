import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BRAND_LINES, BRAND_LINE_COLORS, labelize } from "@/lib/constants";
import { todayManila, addDays } from "@/lib/utils";
import type { BrandLine } from "@/lib/types";

// Content count per brand_line over the last 30 days — makes neglected
// non-Minoxiplus lines visible (spec §4.1 coverage nudge).
export async function CoverageNudge() {
  const supabase = createClient();
  const since = addDays(todayManila(), -30);

  const { data } = await supabase
    .from("content_items")
    .select("id, products(brand_line)")
    .gte("created_at", `${since}T00:00:00+08:00`);

  const counts: Record<string, number> = Object.fromEntries(
    BRAND_LINES.map((b) => [b, 0]),
  );
  let unassigned = 0;

  for (const row of (data as any[]) ?? []) {
    const bl = row.products?.brand_line as BrandLine | undefined;
    if (bl && bl in counts) counts[bl]++;
    else unassigned++;
  }

  const max = Math.max(1, ...Object.values(counts));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Content coverage (last 30 days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {BRAND_LINES.map((b) => (
          <div key={b} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm">{labelize(b)}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${BRAND_LINE_COLORS[b]}`}
                style={{ width: `${(counts[b] / max) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
              {counts[b]}
            </span>
          </div>
        ))}
        {unassigned > 0 && (
          <p className="pt-1 text-xs text-muted-foreground">
            + {unassigned} brand-level / unassigned item(s)
          </p>
        )}
        {BRAND_LINES.some((b) => counts[b] === 0) && (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-amber-600">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Some brand lines have no content in the last 30 days.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
