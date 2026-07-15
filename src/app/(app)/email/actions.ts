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
  type EmailAttachment,
} from "@/lib/email";
import type { SubscriberStatus, EmailSubscriber } from "@/lib/types";

// Attachments are the same for every recipient. Cap the total decoded size to
// keep sends deliverable and within the Server Action body limit.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

function validateAttachments(
  attachments: EmailAttachment[] | undefined,
): string | null {
  if (!attachments?.length) return null;
  // base64 length * 3/4 ≈ decoded bytes.
  const totalBytes = attachments.reduce(
    (sum, a) => sum + Math.floor((a.content?.length ?? 0) * 0.75),
    0,
  );
  if (totalBytes > MAX_ATTACHMENT_BYTES)
    return "Attachments are too large (max 10 MB total). Consider linking to the file instead.";
  return null;
}

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

// Normalize a group list: accept an array or comma-separated string; trim,
// lowercase, drop blanks, dedupe. Group names are case-insensitive.
function normalizeGroups(input: string | string[] | null | undefined): string[] {
  if (!input) return [];
  const arr = Array.isArray(input) ? input : input.split(",");
  const out: string[] = [];
  for (const g of arr) {
    const v = g.trim().toLowerCase();
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

// ---------------- Subscribers ----------------
export async function addSubscriber(input: {
  email: string;
  name: string | null;
  source: string | null;
  groups?: string[] | null;
}) {
  const email = input.email.trim().toLowerCase();
  if (!emailRe.test(email)) return { error: "Please enter a valid email." };

  const supabase = createClient();
  const { error } = await supabase.from("email_subscribers").insert({
    email,
    name: input.name?.trim() || null,
    source: input.source || "manual",
    groups: normalizeGroups(input.groups),
  });
  if (error) {
    if (error.code === "23505") return { error: "That email is already on the list." };
    return { error: error.message };
  }
  revalidatePath("/email");
  return { ok: true };
}

// Bulk add from pasted/CSV emails. Dedupes against existing + within the batch.
// `group` (optional) tags every imported contact into that batch.
export async function importSubscribers(
  rows: { email: string; name?: string | null; groups?: string[] | null }[],
  group?: string | null,
) {
  const supabase = createClient();
  const batchGroups = normalizeGroups(group); // applied to every row

  // Collapse the file to ONE entry per email, MERGING groups across rows.
  // (Same email under Buyer A + Buyer B -> one contact in both batches.)
  const map = new Map<string, { name: string | null; groups: string[] }>();
  let invalid = 0;
  for (const r of rows) {
    const email = (r.email ?? "").trim().toLowerCase();
    if (!emailRe.test(email)) {
      invalid++;
      continue;
    }
    const rowGroups = normalizeGroups([...(r.groups ?? []), ...batchGroups]);
    const prev = map.get(email);
    if (prev) {
      prev.groups = normalizeGroups([...prev.groups, ...rowGroups]);
      if (!prev.name && r.name?.trim()) prev.name = r.name.trim();
    } else {
      map.set(email, { name: r.name?.trim() || null, groups: rowGroups });
    }
  }
  const emails = Array.from(map.keys());
  if (emails.length === 0) return { added: 0, updated: 0, invalid };

  // Which already exist? Fetch their current groups so we can union, not clobber.
  const existing = new Map<string, { id: string; groups: string[] }>();
  for (let i = 0; i < emails.length; i += 500) {
    const chunk = emails.slice(i, i + 500);
    const { data } = await supabase
      .from("email_subscribers")
      .select("id, email, groups")
      .in("email", chunk);
    for (const row of (data as { id: string; email: string; groups: string[] }[]) ?? [])
      existing.set(row.email, { id: row.id, groups: row.groups ?? [] });
  }

  // Existing contacts: add any new batches (union). New contacts: insert.
  let updated = 0;
  const toInsert: {
    email: string;
    name: string | null;
    source: string;
    groups: string[];
  }[] = [];
  for (const [email, v] of Array.from(map.entries())) {
    const ex = existing.get(email);
    if (ex) {
      const merged = normalizeGroups([...ex.groups, ...v.groups]);
      const changed =
        merged.length !== ex.groups.length ||
        merged.some((g) => !ex.groups.includes(g));
      if (changed) {
        const { error } = await supabase
          .from("email_subscribers")
          .update({ groups: merged })
          .eq("id", ex.id);
        if (error) return { error: error.message };
        updated++;
      }
    } else {
      toInsert.push({ email, name: v.name, source: "import", groups: v.groups });
    }
  }

  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await supabase
      .from("email_subscribers")
      .insert(toInsert.slice(i, i + 500));
    if (error) return { error: error.message };
  }

  revalidatePath("/email");
  revalidatePath("/email/batches");
  return { added: toInsert.length, updated, invalid };
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

// Delete EVERY contact (clear the whole list). Sent-email history is untouched.
export async function deleteAllSubscribers() {
  const supabase = createClient();
  // A DELETE needs a filter; created_at is always set, so this matches all rows.
  const { error } = await supabase
    .from("email_subscribers")
    .delete()
    .gte("created_at", "1900-01-01");
  if (error) return { error: error.message };
  revalidatePath("/email");
  revalidatePath("/email/batches");
  return { ok: true };
}

// Replace one subscriber's groups entirely.
export async function setSubscriberGroups(id: string, groups: string[]) {
  const supabase = createClient();
  const { error } = await supabase
    .from("email_subscribers")
    .update({ groups: normalizeGroups(groups) })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/email");
  return { ok: true };
}

// Add one email straight into a batch (column). Creates the contact if new,
// otherwise just adds the batch to their existing groups.
export async function addEmailToBatch(input: {
  email: string;
  name: string | null;
  group: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!emailRe.test(email)) return { error: "Please enter a valid email." };
  const groups = normalizeGroups(input.group);
  if (groups.length === 0) return { error: "Missing batch." };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from("email_subscribers")
    .select("id, groups")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    const merged = normalizeGroups([...(existing.groups ?? []), ...groups]);
    const { error } = await supabase
      .from("email_subscribers")
      .update({ groups: merged })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("email_subscribers").insert({
      email,
      name: input.name?.trim() || null,
      source: "batch",
      groups,
    });
    if (error) return { error: error.message };
  }
  revalidatePath("/email/batches");
  revalidatePath("/email");
  return { ok: true };
}

// Remove a single group/batch from one subscriber (keeps the contact).
export async function removeFromBatch(id: string, group: string) {
  const g = normalizeGroups(group);
  const supabase = createClient();
  const { data, error: readErr } = await supabase
    .from("email_subscribers")
    .select("groups")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  const next = (data?.groups ?? []).filter((x: string) => !g.includes(x));
  const { error } = await supabase
    .from("email_subscribers")
    .update({ groups: next })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/email/batches");
  revalidatePath("/email");
  return { ok: true };
}

// Add a group to many subscribers at once (union — keeps existing groups).
export async function bulkAddGroup(ids: string[], group: string) {
  const g = normalizeGroups(group);
  if (!ids.length || g.length === 0) return { ok: true };
  const supabase = createClient();

  const { data, error: readErr } = await supabase
    .from("email_subscribers")
    .select("id, groups")
    .in("id", ids);
  if (readErr) return { error: readErr.message };

  for (const row of (data as { id: string; groups: string[] }[]) ?? []) {
    const merged = normalizeGroups([...(row.groups ?? []), ...g]);
    const { error } = await supabase
      .from("email_subscribers")
      .update({ groups: merged })
      .eq("id", row.id);
    if (error) return { error: error.message };
  }
  revalidatePath("/email");
  return { ok: true };
}

// ---------------- Sending ----------------
export async function sendTest(
  subject: string,
  body: string,
  attachments?: EmailAttachment[],
) {
  if (!emailConfigured())
    return { error: "Email isn't set up yet. Add RESEND_API_KEY in Vercel first." };
  if (!subject.trim() || !body.trim())
    return { error: "Add a subject and message before sending a test." };
  const sizeErr = validateAttachments(attachments);
  if (sizeErr) return { error: sizeErr };

  const user = await currentUser();
  if (!user?.email) return { error: "Could not find your email address." };

  const url = `${baseUrl()}/unsubscribe?token=preview`;
  const msg: OutgoingEmail = {
    to: user.email,
    subject: `[TEST] ${subject.trim()}`,
    html: renderEmailHtml(body, url),
    text: `${body}\n\n---\nUnsubscribe: ${url}`,
    attachments,
  };
  const res = await sendEmails([msg]);
  if (res.failed > 0)
    return { error: res.errors[0] ?? "Test send failed." };
  return { ok: true, to: user.email };
}

export async function sendCampaign(
  subject: string,
  body: string,
  attachments?: EmailAttachment[],
  group?: string | null,
) {
  if (!emailConfigured())
    return { error: "Email isn't set up yet. Add RESEND_API_KEY in Vercel first." };
  if (!subject.trim() || !body.trim())
    return { error: "Add a subject and message before sending." };
  const sizeErr = validateAttachments(attachments);
  if (sizeErr) return { error: sizeErr };

  const supabase = createClient();
  const user = await currentUser();

  let subQuery = supabase
    .from("email_subscribers")
    .select("*")
    .eq("status", "subscribed");
  const g = normalizeGroups(group);
  if (g.length > 0) subQuery = subQuery.contains("groups", g);
  const { data: subs, error: subErr } = await subQuery;
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
      attachments,
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
