"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  emailConfigured,
  emailFrom,
  renderEmailHtml,
  sendEmails,
  type OutgoingEmail,
} from "@/lib/email";
import type { SubscriberStatus, EmailSubscriber } from "@/lib/types";

async function currentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

function baseUrl(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------- Subscribers ----------------
export async function addSubscriber(input: {
  email: string;
  name: string | null;
  source: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (!emailRe.test(email)) return { error: "Please enter a valid email." };

  const supabase = createClient();
  const { error } = await supabase.from("email_subscribers").insert({
    email,
    name: input.name?.trim() || null,
    source: input.source || "manual",
  });
  if (error) {
    if (error.code === "23505") return { error: "That email is already on the list." };
    return { error: error.message };
  }
  revalidatePath("/email");
  return { ok: true };
}

// Bulk add from pasted/CSV emails. Dedupes against existing + within the batch.
export async function importSubscribers(
  rows: { email: string; name?: string | null }[],
) {
  const supabase = createClient();

  // Normalize + dedupe within the incoming set.
  const seen = new Set<string>();
  const clean: { email: string; name: string | null }[] = [];
  let invalid = 0;
  for (const r of rows) {
    const email = (r.email ?? "").trim().toLowerCase();
    if (!emailRe.test(email)) {
      invalid++;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    clean.push({ email, name: r.name?.trim() || null });
  }
  if (clean.length === 0) return { added: 0, skipped: 0, invalid };

  // Skip ones already stored (emails are always stored lowercased).
  const { data: existing } = await supabase
    .from("email_subscribers")
    .select("email")
    .in(
      "email",
      clean.map((c) => c.email),
    );
  const existingSet = new Set((existing ?? []).map((e: { email: string }) => e.email));
  const toInsert = clean.filter((c) => !existingSet.has(c.email));

  if (toInsert.length > 0) {
    const { error } = await supabase.from("email_subscribers").insert(
      toInsert.map((c) => ({ ...c, source: "import" })),
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/email");
  return { added: toInsert.length, skipped: clean.length - toInsert.length, invalid };
}

export async function setSubscriberStatus(id: string, status: SubscriberStatus) {
  const supabase = createClient();
  const { error } = await supabase
    .from("email_subscribers")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/email");
  return { ok: true };
}

export async function deleteSubscriber(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("email_subscribers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/email");
  return { ok: true };
}

// ---------------- Sending ----------------
export async function sendTest(subject: string, body: string) {
  if (!emailConfigured())
    return { error: "Email isn't set up yet. Add RESEND_API_KEY in Vercel first." };
  if (!subject.trim() || !body.trim())
    return { error: "Add a subject and message before sending a test." };

  const user = await currentUser();
  if (!user?.email) return { error: "Could not find your email address." };

  const url = `${baseUrl()}/unsubscribe?token=preview`;
  const msg: OutgoingEmail = {
    to: user.email,
    subject: `[TEST] ${subject.trim()}`,
    html: renderEmailHtml(body, url),
    text: `${body}\n\n---\nUnsubscribe: ${url}`,
  };
  const res = await sendEmails([msg]);
  if (res.failed > 0)
    return { error: res.errors[0] ?? "Test send failed." };
  return { ok: true, to: user.email };
}

export async function sendCampaign(subject: string, body: string) {
  if (!emailConfigured())
    return { error: "Email isn't set up yet. Add RESEND_API_KEY in Vercel first." };
  if (!subject.trim() || !body.trim())
    return { error: "Add a subject and message before sending." };

  const supabase = createClient();
  const user = await currentUser();

  const { data: subs, error: subErr } = await supabase
    .from("email_subscribers")
    .select("*")
    .eq("status", "subscribed");
  if (subErr) return { error: subErr.message };
  const subscribers = (subs as EmailSubscriber[]) ?? [];
  if (subscribers.length === 0)
    return { error: "No subscribed contacts to send to yet." };

  const base = baseUrl();
  const messages: OutgoingEmail[] = subscribers.map((s) => {
    const url = `${base}/unsubscribe?token=${s.unsubscribe_token}`;
    return {
      to: s.email,
      subject: subject.trim(),
      html: renderEmailHtml(body, url),
      text: `${body}\n\n---\nUnsubscribe: ${url}`,
    };
  });

  const res = await sendEmails(messages);
  const status =
    res.failed === 0 ? "sent" : res.sent === 0 ? "failed" : "partial";

  await supabase.from("email_campaigns").insert({
    subject: subject.trim(),
    body,
    from_label: emailFrom(),
    recipient_count: messages.length,
    sent_count: res.sent,
    failed_count: res.failed,
    status,
    sent_at: new Date().toISOString(),
    created_by: user?.id ?? null,
  });

  revalidatePath("/email/compose");
  return {
    ok: res.sent > 0,
    sent: res.sent,
    failed: res.failed,
    errors: res.errors,
  };
}
