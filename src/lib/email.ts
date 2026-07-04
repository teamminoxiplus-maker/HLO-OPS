// Email sending via the Resend API (https://resend.com).
// We call the REST API with fetch so there's no extra dependency.
//
// Required env:
//   RESEND_API_KEY   — from resend.com > API Keys
//   EMAIL_FROM       — e.g. "Happy Life Organics <news@happylifeorganics.ph>"
//                      Must be on a domain you've verified in Resend. If unset,
//                      falls back to Resend's shared test sender, which can only
//                      deliver to your own account email (fine for testing).
import { BRAND } from "@/lib/brand";

const RESEND_ENDPOINT = "https://api.resend.com/emails/batch";
const BATCH_SIZE = 100; // Resend batch endpoint accepts up to 100 per call.

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function emailFrom(): string {
  return (
    process.env.EMAIL_FROM || `${BRAND.name} <onboarding@resend.dev>`
  );
}

// True when we're on Resend's shared test sender (no verified domain yet).
export function usingTestSender(): boolean {
  return !process.env.EMAIL_FROM;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Plain-text body -> simple, safe HTML. Blank lines become paragraphs; single
// newlines become <br>. Bare URLs are linkified.
function bodyToHtml(body: string): string {
  const linkify = (line: string) =>
    line.replace(
      /(https?:\/\/[^\s]+)/g,
      (u) => `<a href="${u}" style="color:#0f766e;">${u}</a>`,
    );
  return body
    .trim()
    .split(/\n{2,}/)
    .map((para) => {
      const inner = para
        .split("\n")
        .map((line) => linkify(escapeHtml(line)))
        .join("<br>");
      return `<p style="margin:0 0 16px;">${inner}</p>`;
    })
    .join("");
}

// Wrap the message body in a lightweight responsive email shell with the
// required unsubscribe footer.
export function renderEmailHtml(body: string, unsubscribeUrl: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f5f7f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f5;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr><td style="background:#0f766e;padding:20px 28px;">
            <span style="color:#ffffff;font-size:18px;font-weight:700;">${escapeHtml(
              BRAND.name,
            )}</span>
          </td></tr>
          <tr><td style="padding:28px;font-size:15px;line-height:1.6;">
            ${bodyToHtml(body)}
          </td></tr>
          <tr><td style="padding:0 28px 28px;">
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
              You're receiving this because you're a customer of ${escapeHtml(
                BRAND.name,
              )}.<br>
              <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from these emails</a>
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendResult {
  sent: number;
  failed: number;
  errors: string[];
}

// Send a set of emails through Resend's batch endpoint, chunked by 100.
export async function sendEmails(messages: OutgoingEmail[]): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: 0, failed: messages.length, errors: ["RESEND_API_KEY is not set."] };

  const from = emailFrom();
  const result: SendResult = { sent: 0, failed: 0, errors: [] };

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          chunk.map((m) => ({
            from,
            to: [m.to],
            subject: m.subject,
            html: m.html,
            text: m.text,
          })),
        ),
      });
      if (res.ok) {
        result.sent += chunk.length;
      } else {
        result.failed += chunk.length;
        const detail = await res.text().catch(() => "");
        result.errors.push(
          `Batch ${i / BATCH_SIZE + 1}: ${res.status} ${detail.slice(0, 300)}`,
        );
      }
    } catch (e) {
      result.failed += chunk.length;
      result.errors.push(
        `Batch ${i / BATCH_SIZE + 1}: ${(e as Error).message}`,
      );
    }
  }

  return result;
}
