"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "#1d4ed8",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#64748b",
  "#22c55e",
  "#ec4899",
];

// Drop-off by funnel step (spec §12) — shows which step loses the most people.
export function DropOffChart({
  data,
}: {
  data: { step: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
        <XAxis
          dataKey="step"
          tick={{ fontSize: 11 }}
          interval={0}
          angle={-40}
          textAnchor="end"
          height={50}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Concern mix donut (spec §12).
export function ConcernDonut({
  data,
}: {
  data: { concern: string; count: number }[];
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No data yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="concern"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
