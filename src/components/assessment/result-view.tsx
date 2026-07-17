import {
  CONCERN_COPY,
  CONSULT_COPY,
  DISCLAIMER,
  FLAG_COPY,
  REVIEWED_BY,
  SEVERITY_COPY,
  TIMELINE,
} from "@/lib/assessment/copy";
import { CONSULT, PRODUCTS, STOREFRONTS } from "@/lib/assessment/products";
import type { Concern, EngineFlag, ProductId, Severity } from "@/lib/assessment/types";

// Renders the result from the stored derived fields (spec §10). Same copy.ts
// blocks as the email → the two never drift.
export function ResultView({
  concern,
  severity,
  flags,
  products,
  referral,
  fullName,
}: {
  concern: Concern;
  severity: Severity;
  flags: EngineFlag[];
  products: ProductId[];
  referral: boolean;
  fullName?: string | null;
}) {
  const cc = CONCERN_COPY[concern];
  const sev = SEVERITY_COPY[severity];
  const flagLines = flags.map((f) => FLAG_COPY[f]).filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <section>
        {fullName && (
          <p className="text-sm text-slate-500">Hi {fullName}!</p>
        )}
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          Based sa sagot mo:
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight text-slate-900">
          {cc.label}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
          {cc.headline}
        </p>
      </section>

      {/* 2. Stage */}
      {!referral && (
        <section className="rounded-xl bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-blue-900">{sev.label}</span>
            <StageDots severity={severity} />
          </div>
          <p className="mt-2 text-sm text-blue-900/80">{sev.note}</p>
        </section>
      )}

      {/* safety flag lines */}
      {flagLines.length > 0 && (
        <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          {flagLines.map((t) => (
            <p key={t} className="text-sm text-amber-900">
              ⚠️ {t}
            </p>
          ))}
        </section>
      )}

      {/* 3. What's happening */}
      <section>
        <h2 className="text-sm font-bold text-slate-900">Ano ang nangyayari</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          {cc.whatsHappening}
        </p>
        <p className="mt-2 text-xs font-medium text-slate-400">{REVIEWED_BY}</p>
      </section>

      {referral ? (
        /* Consult block replaces routine / timeline / buy (spec §10) */
        <section className="rounded-xl border-2 border-blue-700 bg-white p-5 text-center">
          <h2 className="text-lg font-bold text-slate-900">
            {CONSULT_COPY.heading}
          </h2>
          <p className="mt-2 text-sm text-slate-600">{CONSULT_COPY.body}</p>
          <div className="mt-4 flex flex-col gap-2">
            <a
              href={CONSULT.facebook}
              className="rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white"
            >
              {CONSULT_COPY.cta}
            </a>
            <a
              href={CONSULT.viber}
              className="rounded-lg border-2 border-slate-200 px-4 py-3 font-semibold text-slate-800"
            >
              Viber
            </a>
          </div>
        </section>
      ) : (
        <>
          {/* 4. Routine */}
          <section>
            <h2 className="text-sm font-bold text-slate-900">
              {cc.routineIntro || "Ang routine mo"}
            </h2>
            <div className="mt-3 space-y-3">
              {products.map((id) => {
                const p = PRODUCTS[id];
                return (
                  <div
                    key={id}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900">{p.name}</h3>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                        {p.actives}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-700">{p.why}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Paano gamitin: {p.howToUse}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5. Timeline */}
          <section>
            <h2 className="text-sm font-bold text-slate-900">Ano ang aasahan</h2>
            <ol className="mt-3 space-y-3">
              {TIMELINE.map((t) => (
                <li key={t.when} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-blue-700 px-2.5 py-0.5 text-xs font-semibold text-white">
                    {t.when}
                  </span>
                  <span className="text-sm text-slate-700">{t.note}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 6. Where to buy */}
          <section>
            <h2 className="text-sm font-bold text-slate-900">Saan bibili</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={STOREFRONTS.website}
                className="col-span-2 rounded-lg bg-blue-700 px-4 py-3 text-center font-semibold text-white"
              >
                minoxiplus.com
              </a>
              <a
                href={STOREFRONTS.shopee}
                className="rounded-lg border-2 border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-800"
              >
                Shopee
              </a>
              <a
                href={STOREFRONTS.lazada}
                className="rounded-lg border-2 border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-800"
              >
                Lazada
              </a>
              <a
                href={STOREFRONTS.tiktok}
                className="col-span-2 rounded-lg border-2 border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-800"
              >
                TikTok Shop
              </a>
            </div>
          </section>
        </>
      )}

      {/* 7. Consult CTA (also on product results) */}
      {!referral && (
        <section className="rounded-xl bg-slate-100 p-4 text-center">
          <p className="text-sm text-slate-700">May tanong? Message mo lang kami.</p>
          <div className="mt-3 flex justify-center gap-2">
            <a
              href={CONSULT.facebook}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Messenger
            </a>
            <a
              href={CONSULT.viber}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Viber
            </a>
          </div>
        </section>
      )}

      {/* 8. Disclaimer */}
      <p className="border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400">
        {DISCLAIMER}
      </p>
    </div>
  );
}

function StageDots({ severity }: { severity: Severity }) {
  const level = severity === "Early" ? 1 : severity === "Moderate" ? 2 : 3;
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-2.5 w-6 rounded-full ${n <= level ? "bg-blue-700" : "bg-blue-200"}`}
        />
      ))}
    </div>
  );
}
