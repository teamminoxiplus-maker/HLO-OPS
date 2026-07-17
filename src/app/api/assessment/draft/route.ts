import { NextResponse } from "next/server";
import { draftSchema } from "@/lib/assessment/schema";
import { assessmentDb } from "@/lib/assessment/persist";
import { rateLimit } from "@/lib/assessment/ratelimit";
import { deviceType } from "@/lib/assessment/attribution";
import { clientIp, hashIp } from "@/lib/assessment/attribution-server";

export const runtime = "nodejs";

// Autosave partial answers (spec §7). Upserts a draft row keyed by session_id.
// Best-effort — a failure here must never break the customer's flow.
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  // Generous ceiling: drafts fire on every step. Only blocks abuse.
  const rl = await rateLimit(`draft:${ip ?? "anon"}`, 120, 3600);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = draftSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const d = parsed.data;

  try {
    const db = assessmentDb();
    // Don't overwrite a completed row with a stray late draft beacon.
    const { data: existing } = await db
      .from("assessments")
      .select("status")
      .eq("session_id", d.session_id)
      .maybeSingle();

    if (existing?.status === "completed") {
      return NextResponse.json({ ok: true });
    }

    await db.from("assessments").upsert(
      {
        session_id: d.session_id,
        status: "draft",
        answers: d.answers,
        src: d.src,
        utm_source: d.utm_source,
        utm_medium: d.utm_medium,
        utm_campaign: d.utm_campaign,
        referrer: d.referrer,
        device_type: deviceType(req.headers.get("user-agent")),
        ip_hash: hashIp(ip),
      },
      { onConflict: "session_id" },
    );
  } catch {
    // Swallow — autosave is non-critical.
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
