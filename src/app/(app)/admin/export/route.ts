import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/assessment/admin";
import { assessmentDb } from "@/lib/assessment/persist";
import { productLabel } from "@/lib/assessment/labels";
import type { LeadFilters } from "@/lib/assessment/queries";
import type { AssessmentRow, ProductId } from "@/lib/assessment/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// CSV columns the email-lifecycle tool expects (spec §12).
const COLUMNS = [
  "full_name",
  "email",
  "phone",
  "sex",
  "age_band",
  "concern",
  "severity",
  "recommended_products",
  "flags",
  "consent_marketing",
  "src",
  "created_at",
] as const;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowToCsv(r: AssessmentRow): string {
  const cells = [
    r.full_name,
    r.email,
    r.phone,
    r.answers?.sex ?? "",
    r.answers?.age_band ?? "",
    r.concern ?? "",
    r.severity ?? "",
    (r.recommended_products ?? []).map((p) => productLabel(p as ProductId)).join(" | "),
    (r.flags ?? []).join(" | "),
    r.consent_marketing ? "yes" : "no",
    r.src ?? "",
    r.created_at,
  ];
  return cells.map(csvCell).join(",");
}

function toFilters(sp: URLSearchParams): LeadFilters {
  const g = (k: string) => sp.get(k) ?? undefined;
  return {
    q: g("q"),
    status: g("status"),
    concern: g("concern"),
    severity: g("severity"),
    sex: g("sex"),
    src: g("src"),
    contacted: g("contacted"),
    hasFlags: g("hasFlags"),
    from: sp.get("from") ? `${sp.get("from")}T00:00:00+08:00` : undefined,
    to: sp.get("to") ? `${sp.get("to")}T23:59:59+08:00` : undefined,
  };
}

// Streamed CSV export honoring current filters (spec §12). Pages through the
// table in chunks so the whole file is never held in memory.
export async function GET(req: NextRequest) {
  if (!(await getAdminEmail())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const f = toFilters(req.nextUrl.searchParams);
  const db = assessmentDb();
  const CHUNK = 1000;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(COLUMNS.join(",") + "\n"));

      let offset = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let query = db
          .from("assessments")
          .select("*")
          .order("created_at", { ascending: false })
          .range(offset, offset + CHUNK - 1);

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
          if (term)
            query = query.or(
              `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
            );
        }

        const { data, error } = await query;
        if (error || !data || data.length === 0) break;

        const chunk = (data as AssessmentRow[]).map(rowToCsv).join("\n") + "\n";
        controller.enqueue(enc.encode(chunk));

        if (data.length < CHUNK) break;
        offset += CHUNK;
      }
      controller.close();
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="minoxiplus-leads-${stamp}.csv"`,
    },
  });
}
