"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatDate, cn } from "@/lib/utils";
import { updateMetrics } from "../actions";
import type { ContentItem } from "@/lib/types";

type SortKey = "views" | "sales_attributed" | "clicks";

export function PerformanceClient({
  items,
  topThisMonth,
}: {
  items: ContentItem[];
  topThisMonth: { name: string; views: number }[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("views");

  const sorted = [...items].sort(
    (a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 posts by views (this month)</CardTitle>
        </CardHeader>
        <CardContent>
          {topThisMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published posts with views this month yet.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topThisMonth} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => (v.length > 20 ? v.slice(0, 19) + "…" : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Published</TableHead>
              <SortHead label="Views" k="views" sortKey={sortKey} onSort={setSortKey} />
              <TableHead>Likes</TableHead>
              <TableHead>Comments</TableHead>
              <TableHead>Shares</TableHead>
              <SortHead label="Clicks" k="clicks" sortKey={sortKey} onSort={setSortKey} />
              <SortHead
                label="Sales (₱)"
                k="sales_attributed"
                sortKey={sortKey}
                onSort={setSortKey}
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No published content yet.
                </TableCell>
              </TableRow>
            )}
            {sorted.map((it) => (
              <MetricRow key={it.id} item={it} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SortHead({
  label,
  k,
  sortKey,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
}) {
  return (
    <TableHead>
      <button
        onClick={() => onSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sortKey === k && "text-primary")} />
      </button>
    </TableHead>
  );
}

function MetricRow({ item }: { item: ContentItem }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [m, setM] = useState({
    views: item.views,
    likes: item.likes,
    comments: item.comments,
    shares: item.shares,
    clicks: item.clicks,
    sales_attributed: item.sales_attributed,
  });
  const [dirty, setDirty] = useState(false);

  function num(v: string): number | null {
    if (v === "") return null;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function save() {
    start(async () => {
      await updateMetrics(item.id, { ...m, performance_notes: item.performance_notes });
      setDirty(false);
      router.refresh();
    });
  }

  const Field = (key: keyof typeof m) => (
    <Input
      type="number"
      value={m[key] ?? ""}
      onChange={(e) => {
        setM((prev) => ({ ...prev, [key]: num(e.target.value) }));
        setDirty(true);
      }}
      onBlur={() => dirty && save()}
      className="h-8 w-20 tabular-nums"
      disabled={pending}
    />
  );

  return (
    <TableRow>
      <TableCell className="max-w-[200px] truncate font-medium">
        {item.title}
      </TableCell>
      <TableCell className="whitespace-nowrap text-muted-foreground">
        {formatDate(item.publish_date)}
      </TableCell>
      <TableCell>{Field("views")}</TableCell>
      <TableCell>{Field("likes")}</TableCell>
      <TableCell>{Field("comments")}</TableCell>
      <TableCell>{Field("shares")}</TableCell>
      <TableCell>{Field("clicks")}</TableCell>
      <TableCell>{Field("sales_attributed")}</TableCell>
    </TableRow>
  );
}
