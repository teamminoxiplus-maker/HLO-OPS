import { NextResponse } from "next/server";
import { eventSchema } from "@/lib/assessment/schema";
import { assessmentDb } from "@/lib/assessment/persist";
import { rateLimit } from "@/lib/assessment/ratelimit";
import { clientIp } from "@/lib/assessment/attribution-server";

export const runtime = "nodejs";

// Funnel beacon (spec §11). Records view/answer/abandon per step for drop-off.
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const rl = await rateLimit(`event:${ip ?? "anon"}`, 300, 3600);
  if (!rl.allowed) return NextResponse.json({ ok: false }, { status: 429 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    await assessmentDb().from("assessment_events").insert(parsed.data);
  } catch {
    // ignore — analytics is non-critical
  }
  return NextResponse.json({ ok: true });
}
