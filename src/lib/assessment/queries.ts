import { assessmentDb } from "./persist";
import type { AssessmentRow } from "./types";

// Admin data access (spec §12). Reads go through the service-role client, gated
// upstream by the allowlist layout. Filtering/pagination happen server-side.

export interface LeadFilters {
  q?: string; // name / email / phone
  concern?: string;
  severity?: string;
  sex?: string;
  status?: string;
  src?: string;
  contacted?: string; // "yes" | "no"
  hasFlags?: string; // "yes"
  from?: string; // ISO date
  to?: string; // ISO date
  page?: number;
}

export const PAGE_SIZE = 50;

function applyFilters(query: any, f: LeadFilters) {
  if (f.status && f.status !== "all") query = query.eq("status", f.status);
  if (f.concern && f.concern !== "all") query = query.eq("concern", f.concern);
  if (f.severity && f.severity !== "all") query = query.eq("severity", f.severity);
  if (f.sex && f.sex !== "all") query = query.eq("answers->>sex", f.sex);
  if (f.src && f.src !== "all") query = query.eq("src", f.src);
  if (f.contacted === "yes") query = query.eq("contacted", true);
  if (f.contacted === "no") query = query.eq("contacted", false);
  if (f.hasFlags === "yes") query = query.not("flags", "eq", "{}");
  if (f.from) query = query.gte("created_at", f.from);
  if (f.to) query = query.lte("created_at", f.to);
  if (f.q) {
    const term = f.q.replace(/[%,]/g, "").trim();
    if (term) {
      query = query.or(
        `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
      );
    }
  }
  return query;
}

export async function listLeads(f: LeadFilters): Promise<{
  rows: AssessmentRow[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const page = Math.max(1, f.page ?? 1);
  const fromIdx = (page - 1) * PAGE_SIZE;
  const toIdx = fromIdx + PAGE_SIZE - 1;

  const db = assessmentDb();
  let query = db
    .from("assessments")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  query = applyFilters(query, f);

  const { data, count, error } = await query;
  if (error) {
    return { rows: [], total: 0, page, pageCount: 0 };
  }
  const total = count ?? 0;
  return {
    rows: (data ?? []) as AssessmentRow[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getLead(id: string): Promise<AssessmentRow | null> {
  const { data } = await assessmentDb()
    .from("assessments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as AssessmentRow) ?? null;
}

// Distinct src values for the source filter dropdown.
export async function distinctSources(): Promise<string[]> {
  const { data } = await assessmentDb()
    .from("assessments")
    .select("src")
    .not("src", "is", null)
    .limit(1000);
  const set = new Set<string>();
  (data ?? []).forEach((r: { src: string | null }) => r.src && set.add(r.src));
  return Array.from(set).sort();
}

// ---- Dashboard stats (spec §12) ----
export interface DashboardStats {
  today: number;
  last7: number;
  last30: number;
  started: number;
  completed: number;
  completionRate: number;
  concernMix: { concern: string; count: number }[];
  sourceMix: { src: string; count: number }[];
  dropOff: { step: string; count: number }[];
  recent: AssessmentRow[];
}

const STEP_ORDER = [
  "landing",
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
  "q11",
  "q12",
  "contact",
  "result",
];

export async function dashboardStats(): Promise<DashboardStats> {
  const db = assessmentDb();
  const now = Date.now();
  const dayAgo = new Date(now - 864e5).toISOString();
  const weekAgo = new Date(now - 7 * 864e5).toISOString();
  const monthAgo = new Date(now - 30 * 864e5).toISOString();

  const countSince = async (iso: string, status?: string) => {
    let q = db
      .from("assessments")
      .select("*", { count: "exact", head: true })
      .gte("created_at", iso);
    if (status) q = q.eq("status", status);
    const { count } = await q;
    return count ?? 0;
  };

  const [today, last7, last30, started, completed] = await Promise.all([
    countSince(dayAgo),
    countSince(weekAgo),
    countSince(monthAgo),
    countSince(monthAgo),
    countSince(monthAgo, "completed"),
  ]);

  // Concern mix (completed, last 30d).
  const { data: concernRows } = await db
    .from("assessments")
    .select("concern")
    .eq("status", "completed")
    .gte("created_at", monthAgo)
    .not("concern", "is", null)
    .limit(5000);
  const concernCounts = new Map<string, number>();
  (concernRows ?? []).forEach((r: { concern: string }) =>
    concernCounts.set(r.concern, (concernCounts.get(r.concern) ?? 0) + 1),
  );

  // Source mix (last 30d).
  const { data: srcRows } = await db
    .from("assessments")
    .select("src")
    .gte("created_at", monthAgo)
    .limit(5000);
  const srcCounts = new Map<string, number>();
  (srcRows ?? []).forEach((r: { src: string | null }) => {
    const key = r.src ?? "direct";
    srcCounts.set(key, (srcCounts.get(key) ?? 0) + 1);
  });

  // Drop-off: distinct sessions that reached each step (last 30d).
  const { data: eventRows } = await db
    .from("assessment_events")
    .select("session_id, step, event")
    .eq("event", "view")
    .gte("created_at", monthAgo)
    .limit(50000);
  const stepSessions = new Map<string, Set<string>>();
  (eventRows ?? []).forEach((r: { session_id: string; step: string }) => {
    if (!stepSessions.has(r.step)) stepSessions.set(r.step, new Set());
    stepSessions.get(r.step)!.add(r.session_id);
  });
  const dropOff = STEP_ORDER.map((step) => ({
    step,
    count: stepSessions.get(step)?.size ?? 0,
  })).filter((s) => s.count > 0);

  // Recent 10.
  const { data: recent } = await db
    .from("assessments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    today,
    last7,
    last30,
    started,
    completed,
    completionRate: started > 0 ? Math.round((completed / started) * 100) : 0,
    concernMix: Array.from(concernCounts, ([concern, count]) => ({ concern, count })).sort(
      (a, b) => b.count - a.count,
    ),
    sourceMix: Array.from(srcCounts, ([src, count]) => ({ src, count })).sort(
      (a, b) => b.count - a.count,
    ),
    dropOff,
    recent: (recent ?? []) as AssessmentRow[],
  };
}
