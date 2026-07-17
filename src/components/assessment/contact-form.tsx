"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { QUESTIONS } from "@/lib/assessment/questions";
import { answersSchema, contactSchema } from "@/lib/assessment/schema";
import {
  clearSession,
  getAnswers,
  getAttribution,
  getKioskLoc,
  getSessionId,
  logEvent,
} from "@/lib/assessment/session";
import type { Answers } from "@/lib/assessment/types";

// Screen 13 — contact gate (spec §7). Reads the completed answer set from
// localStorage, validates the lead fields with the shared Zod schema, and posts
// to /api/assessment/submit.
export function ContactForm() {
  const router = useRouter();
  const kiosk = useSearchParams().get("kiosk") === "1";

  const [answers, setAnswersState] = useState<Answers | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    consent_privacy: false,
    consent_marketing: false,
    company: "", // honeypot
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const a = getAnswers(kiosk);
    logEvent(getSessionId(kiosk), "contact", "view");
    // Guard: if any question is unanswered, send them back to fill it.
    const parsed = answersSchema.safeParse(a);
    if (!parsed.success) {
      const firstMissing = QUESTIONS.find(
        (q) => a[q.id] === undefined || (Array.isArray(a[q.id]) && (a[q.id] as unknown[]).length === 0),
      );
      const q = kiosk ? "?kiosk=1" : "";
      router.replace(`/assessment/q/${firstMissing?.step ?? 1}${q}`);
      return;
    }
    setAnswersState(parsed.data);
  }, [router, kiosk]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!answers) return;

    const parsed = contactSchema.safeParse({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      consent_privacy: form.consent_privacy,
      consent_marketing: form.consent_marketing,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Pakisuri ang mga field.");
      return;
    }

    setSubmitting(true);
    const attr = kiosk ? null : getAttribution();
    try {
      const res = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: getSessionId(kiosk),
          answers,
          contact: {
            full_name: form.full_name,
            email: form.email,
            phone: form.phone,
            consent_privacy: form.consent_privacy,
            consent_marketing: form.consent_marketing,
          },
          company: form.company,
          src: kiosk
            ? `kiosk_${getKioskLoc() ?? "default"}`
            : attr?.src,
          utm_source: attr?.utm_source,
          utm_medium: attr?.utm_medium,
          utm_campaign: attr?.utm_campaign,
          referrer: attr?.referrer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "May mali. Subukan ulit.");
        setSubmitting(false);
        return;
      }
      logEvent(getSessionId(kiosk), "result", "view");
      const q = kiosk ? "?kiosk=1" : "";
      if (!kiosk) clearSession();
      router.push(`/assessment/result/${data.token}${q}`);
    } catch {
      setError("Walang koneksyon. Subukan ulit.");
      setSubmitting(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-lg border-2 border-slate-200 px-3.5 py-3 text-[15px] outline-none focus:border-blue-700";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Saan namin ipapadala ang result mo?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Isang beses lang ito. Ipapadala namin ang personalized na routine mo.
        </p>
      </div>

      {/* honeypot — hidden from users, catches bots (spec §14) */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label>
          Company
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </label>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">Buong pangalan</label>
        <input
          className={inputCls}
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          autoComplete="name"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          inputMode="email"
          className={inputCls}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoComplete="email"
          required
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Mobile number</label>
        <input
          type="tel"
          inputMode="tel"
          placeholder="09XXXXXXXXX"
          className={inputCls}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          autoComplete="tel"
          required
        />
      </div>

      <label className="flex items-start gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5"
          checked={form.consent_privacy}
          onChange={(e) => setForm({ ...form, consent_privacy: e.target.checked })}
        />
        <span>
          Sumasang-ayon ako sa{" "}
          <a href="/assessment/privacy" className="text-blue-700 underline">
            Privacy Policy
          </a>{" "}
          at sa pag-process ng aking sagot para sa aking hair assessment.
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-sm text-slate-700">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5"
          checked={form.consent_marketing}
          onChange={(e) => setForm({ ...form, consent_marketing: e.target.checked })}
        />
        <span>Gusto kong makatanggap ng tips at promos mula sa MINOXIPLUS.</span>
      </label>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !answers}
        className="w-full rounded-xl bg-blue-700 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-blue-800 disabled:opacity-50"
        style={{ minHeight: 52 }}
      >
        {submitting ? "Sandali lang…" : "Ipakita ang Result Ko"}
      </button>
    </form>
  );
}
