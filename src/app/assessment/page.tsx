import type { Metadata } from "next";
import { MinoxShell } from "@/components/assessment/minox-brand";
import { LandingClient } from "@/components/assessment/landing-client";
import { DISCLAIMER, REVIEWED_BY } from "@/lib/assessment/copy";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Libreng Hair Loss Assessment — MINOXIPLUS",
  description:
    "90 seconds lang. Sagutin mo at malalaman mo kung anong hair problem meron ka — at kung anong tamang routine para sa'yo.",
};

// Screen 0 — Landing (spec §7). QR codes land here. Must never 404 and must
// work with no query param.
export default function AssessmentLanding() {
  return (
    <MinoxShell>
      <div className="pt-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
          Free Hair Loss Assessment
        </p>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900">
          Libreng Hair Loss Assessment
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
          90 seconds lang. Sagutin mo, at malalaman mo kung anong hair problem
          meron ka — at kung anong tamang routine para sa&apos;yo.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
          <span aria-hidden>✔</span> {REVIEWED_BY}
        </div>

        <Suspense>
          <LandingClient />
        </Suspense>

        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          Hindi ito medical diagnosis. Guide lang ito para sa tamang routine.
        </p>
      </div>

      <ul className="mt-8 space-y-2 text-sm text-slate-600">
        {[
          "12 mabilis na tanong, isa-isa lang",
          "Walang download, walang login",
          "Personalized na routine sa dulo",
        ].map((t) => (
          <li key={t} className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-700" aria-hidden>
              ●
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>

      <p className="mt-10 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400">
        {DISCLAIMER}
      </p>
    </MinoxShell>
  );
}
