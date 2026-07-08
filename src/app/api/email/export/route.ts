import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import type { EmailSubscriber } from "@/lib/types";

export const dynamic = "force-dynamic";

// CSV export of the email subscriber list.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  let query = supabase
    .from("email_subscribers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50000);
  if (sp.get("status")) query = query.eq("status", sp.get("status")!);
  if (sp.get("group"))
    query = query.contains("groups", [sp.get("group")!.toLowerCase()]);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data as EmailSubscriber[]).map((s) => ({
    email: s.email,
    name: s.name ?? "",
    status: s.status,
    groups: (s.groups ?? []).join(" | "),
    source: s.source ?? "",
    added: s.created_at,
  }));

  const csv = Papa.unparse(rows);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hlo-subscribers-${stamp}.csv"`,
    },
  });
}
