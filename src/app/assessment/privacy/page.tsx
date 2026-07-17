import type { Metadata } from "next";
import { MinoxShell } from "@/components/assessment/minox-brand";
import { CONSULT } from "@/lib/assessment/products";

export const metadata: Metadata = {
  title: "Privacy Policy — MINOXIPLUS Assessment",
};

// Phase-1 privacy notice for the assessment (spec §14, RA 10173). A working
// data-deletion path via email is acceptable for Phase 1.
export default function PrivacyPage() {
  return (
    <MinoxShell>
      <article className="space-y-4 text-sm leading-relaxed text-slate-700">
        <h1 className="text-xl font-extrabold text-slate-900">Privacy Notice</h1>
        <p>
          Ang MINOXIPLUS (Happy Life Organics Philippines) ang nangongolekta ng
          iyong impormasyon sa libreng hair loss assessment na ito, alinsunod sa
          Republic Act 10173 (Data Privacy Act of 2012).
        </p>

        <h2 className="pt-2 text-base font-bold text-slate-900">
          Anong kino-kolekta namin
        </h2>
        <p>
          Pangalan, email, mobile number, mga sagot mo sa assessment, at basic na
          technical info (device type, source ng pag-scan). Hindi namin
          iniimbak ang iyong buong IP address — naka-hash lamang ito.
        </p>

        <h2 className="pt-2 text-base font-bold text-slate-900">
          Bakit namin ito ginagamit
        </h2>
        <p>
          Para ibigay ang iyong personalized na routine, ipadala ang iyong
          result, at (kung pumayag ka) magpadala ng tips at promos. Hindi namin
          ibinebenta ang iyong data sa iba.
        </p>

        <h2 className="pt-2 text-base font-bold text-slate-900">Retention</h2>
        <p>
          Itinatago namin ang iyong assessment habang aktibo ang iyong relasyon
          sa amin. Ang mga hindi kumpletong entry na walang contact info ay
          awtomatikong binubura pagkalipas ng 90 araw.
        </p>

        <h2 className="pt-2 text-base font-bold text-slate-900">
          Ang iyong mga karapatan
        </h2>
        <p>
          May karapatan kang tingnan, iwasto, o ipabura ang iyong data. Para
          humiling ng deletion o may tanong tungkol sa privacy, mag-email sa{" "}
          <a href={`mailto:${CONSULT.email}`} className="text-blue-700 underline">
            {CONSULT.email}
          </a>
          .
        </p>

        <p className="pt-2 text-xs text-slate-400">
          Hindi ito medical diagnosis. Guide lang ito para sa tamang routine.
        </p>
      </article>
    </MinoxShell>
  );
}
