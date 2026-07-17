"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Kiosk PIN gate (spec §13). Compares to KIOSK_PIN server-side and sets a
// session cookie so the tablet stays unlocked for the session.
export async function unlockKiosk(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const pin = String(formData.get("pin") ?? "");
  const loc = String(formData.get("loc") ?? "").trim();
  const expected = process.env.KIOSK_PIN;

  if (!expected) {
    return { error: "Kiosk PIN not configured." };
  }
  if (pin !== expected) {
    return { error: "Maling PIN." };
  }

  cookies().set("kiosk_unlocked", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/kiosk",
    maxAge: 60 * 60 * 12, // 12h shift
  });
  if (loc) {
    cookies().set("kiosk_loc", loc, {
      httpOnly: false, // read by the client landing to tag src
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
  }
  redirect("/kiosk");
}
