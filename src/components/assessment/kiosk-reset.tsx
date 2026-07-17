"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearSession } from "@/lib/assessment/session";

// Kiosk auto-reset (spec §13): 15s after the result shows, wipe state and
// return to the kiosk landing. A "Salamat!" overlay with a manual Done button.
export function KioskReset() {
  const router = useRouter();
  const kiosk = useSearchParams().get("kiosk") === "1";
  const [count, setCount] = useState(15);

  useEffect(() => {
    if (!kiosk) return;
    const iv = setInterval(() => setCount((c) => c - 1), 1000);
    const to = setTimeout(() => {
      clearSession();
      router.push("/kiosk");
    }, 15000);
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }, [kiosk, router]);

  if (!kiosk) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white p-4 shadow-lg">
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">Salamat!</p>
          <p className="text-xs text-slate-500">
            Magre-reset sa {count}s para sa susunod na customer.
          </p>
        </div>
        <button
          onClick={() => {
            clearSession();
            router.push("/kiosk");
          }}
          className="rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}
