"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getSessionId,
  saveAttribution,
  logEvent,
  setKioskLoc,
} from "@/lib/assessment/session";
import { readAttribution } from "@/lib/assessment/attribution";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Captures attribution (?src / ?utm_* / referrer) on first landing and logs the
// funnel 'landing' view (spec §6, §7). The path never REQUIRES a param — a
// scanner may strip the query and the assessment must still work (spec §6).
export function LandingClient({ kiosk = false }: { kiosk?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sid = getSessionId(kiosk);
    if (!kiosk) {
      const attr = readAttribution(params);
      saveAttribution({ ...attr, referrer: document.referrer || undefined });
    } else {
      setKioskLoc(readCookie("kiosk_loc"));
    }
    logEvent(sid, "landing", "view");
    setReady(true);
  }, [params, kiosk]);

  const start = () => {
    const q = kiosk ? "?kiosk=1" : "";
    router.push(`/assessment/q/1${q}`);
  };

  return (
    <button
      onClick={start}
      disabled={!ready}
      className="mt-6 w-full rounded-xl bg-blue-700 px-6 py-4 text-center text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:opacity-60"
      style={{ minHeight: 52 }}
    >
      Simulan ang Assessment
    </button>
  );
}
