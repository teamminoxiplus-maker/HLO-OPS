// Transactional result email via Resend REST API (spec §5, §9). Built from the
// same copy.ts blocks as the web result page so email + web never drift.
// No SDK dependency — a single fetch to Resend. No-ops cleanly if unconfigured.
import { CONCERN_COPY, DISCLAIMER, FLAG_COPY, REVIEWED_BY, SEVERITY_COPY, TIMELINE, CONSULT_COPY } from "./copy";
import { PRODUCTS, STOREFRONTS, CONSULT } from "./products";
import type { EngineResult } from "./types";

interface EmailArgs {
  to: string;
  fullName: string;
  result: EngineResult;
  token: string;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

function buildHtml({ fullName, result, token }: EmailArgs): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://minoxiplus.com";
  const cc = CONCERN_COPY[result.concern];
  const sev = SEVERITY_COPY[result.severity];
  const resultUrl = `${site}/assessment/result/${token}`;
  const isRefer = result.referral_required;

  const flagLines = result.flags
    .map((f) => FLAG_COPY[f])
    .filter(Boolean)
    .map((t) => `<p style="margin:6px 0;color:#92400e;font-size:14px">⚠️ ${esc(t as string)}</p>`)
    .join("");

  const routine = isRefer
    ? `<div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:16px 0">
         <h3 style="margin:0 0 6px">${esc(CONSULT_COPY.heading)}</h3>
         <p style="margin:0 0 12px;font-size:14px;color:#334155">${esc(CONSULT_COPY.body)}</p>
         <a href="${CONSULT.facebook}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${esc(CONSULT_COPY.cta)}</a>
       </div>`
    : `<h3 style="margin:20px 0 6px">${esc(cc.routineIntro)}</h3>` +
      result.recommended_products
        .map((id) => {
          const p = PRODUCTS[id];
          return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin:8px 0">
              <strong style="font-size:15px">${esc(p.name)}</strong>
              <p style="margin:4px 0;font-size:13px;color:#475569">${esc(p.why)}</p>
              <p style="margin:4px 0;font-size:12px;color:#64748b">Paano gamitin: ${esc(p.howToUse)}</p>
            </div>`;
        })
        .join("");

  const timeline = isRefer
    ? ""
    : `<h3 style="margin:20px 0 6px">Ano ang aasahan</h3>` +
      TIMELINE.map(
        (t) =>
          `<p style="margin:6px 0;font-size:13px"><strong>${esc(t.when)}:</strong> ${esc(t.note)}</p>`,
      ).join("");

  const buy = isRefer
    ? ""
    : `<h3 style="margin:20px 0 6px">Saan bibili</h3>
       <p>
         <a href="${STOREFRONTS.website}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;margin:4px 4px 4px 0">minoxiplus.com</a>
         <a href="${STOREFRONTS.shopee}" style="display:inline-block;border:1px solid #cbd5e1;color:#1e293b;padding:10px 16px;border-radius:8px;text-decoration:none;margin:4px 4px 4px 0">Shopee</a>
         <a href="${STOREFRONTS.lazada}" style="display:inline-block;border:1px solid #cbd5e1;color:#1e293b;padding:10px 16px;border-radius:8px;text-decoration:none;margin:4px 4px 4px 0">Lazada</a>
         <a href="${STOREFRONTS.tiktok}" style="display:inline-block;border:1px solid #cbd5e1;color:#1e293b;padding:10px 16px;border-radius:8px;text-decoration:none;margin:4px 4px 4px 0">TikTok Shop</a>
       </p>`;

  return `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#0b1f4d;border-radius:12px;padding:20px;color:#fff">
        <div style="font-weight:800;letter-spacing:1px">MINOXIPLUS</div>
        <div style="font-size:12px;opacity:.8">Libreng Hair Loss Assessment</div>
      </div>
      <div style="background:#fff;border-radius:12px;padding:20px;margin-top:12px">
        <p style="margin:0 0 4px;font-size:14px">Hi ${esc(fullName)},</p>
        <p style="margin:0 0 2px;font-size:13px;color:#64748b">Based sa sagot mo:</p>
        <h2 style="margin:0 0 10px">${esc(cc.label)}</h2>
        <p style="font-size:14px;line-height:1.55">${esc(cc.headline)}</p>
        <div style="background:#eff6ff;border-radius:10px;padding:10px 14px;margin:12px 0">
          <strong>${esc(sev.label)}</strong>
          <p style="margin:4px 0 0;font-size:13px;color:#475569">${esc(sev.note)}</p>
        </div>
        <p style="font-size:13px;color:#475569"><em>${esc(cc.whatsHappening)}</em></p>
        <p style="font-size:12px;color:#64748b">${esc(REVIEWED_BY)}</p>
        ${flagLines}
        ${routine}
        ${timeline}
        ${buy}
        <p style="margin:20px 0 0"><a href="${resultUrl}" style="color:#1e3a8a">Buksan ang buong result mo →</a></p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:18px 0">
        <p style="font-size:11px;color:#94a3b8;line-height:1.5">${esc(DISCLAIMER)}</p>
      </div>
    </div>
  </body></html>`;
}

export async function sendResultEmail(args: EmailArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    // Unconfigured (e.g. local dev) — skip silently, do not fail the submit.
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: "Ang Hair Loss Assessment Result mo — MINOXIPLUS",
        html: buildHtml(args),
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
