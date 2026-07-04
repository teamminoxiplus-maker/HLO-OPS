"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Mail, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { sendTest, sendCampaign } from "../actions";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // keep in sync with actions.ts

interface Attachment {
  filename: string;
  content: string; // base64 (no data: prefix)
  size: number;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? ""); // strip "data:...;base64,"
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ComposeClient({
  subscribedCount,
  configured,
  testMode,
}: {
  subscribedCount: number;
  configured: boolean;
  testMode: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, startTest] = useTransition();
  const [sending, startSend] = useTransition();

  const totalBytes = attachments.reduce((s, a) => s + a.size, 0);
  const overCap = totalBytes > MAX_ATTACHMENT_BYTES;
  const disabled = !configured || testing || sending;

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const added: Attachment[] = [];
    for (const f of files) {
      added.push({
        filename: f.name,
        content: await readFileAsBase64(f),
        size: f.size,
      });
    }
    setAttachments((prev) => [...prev, ...added]);
    if (fileInput.current) fileInput.current.value = "";
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  }

  const payloadAttachments = () =>
    attachments.map((a) => ({ filename: a.filename, content: a.content }));

  function doTest() {
    setMsg(null);
    if (overCap)
      return setMsg({ ok: false, text: "Attachments exceed the 10 MB limit." });
    startTest(async () => {
      const res = await sendTest(subject, body, payloadAttachments());
      if (res?.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: `Test sent to ${res.to}. Check your inbox.` });
    });
  }

  function doSend() {
    setMsg(null);
    if (overCap)
      return setMsg({ ok: false, text: "Attachments exceed the 10 MB limit." });
    if (
      !confirm(
        `Send this to ${subscribedCount} subscribed contact${subscribedCount === 1 ? "" : "s"}? This can't be undone.`,
      )
    )
      return;
    startSend(async () => {
      const res = await sendCampaign(subject, body, payloadAttachments());
      if (res?.error) return setMsg({ ok: false, text: res.error });
      const failNote = res.failed ? ` (${res.failed} failed)` : "";
      setMsg({
        ok: true,
        text: `Sent to ${res.sent} contact${res.sent === 1 ? "" : "s"}${failNote}.`,
      });
      setSubject("");
      setBody("");
      setAttachments([]);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <Label htmlFor="cmp-subject">Subject</Label>
          <Input
            id="cmp-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Sale starts 7.7! Up to 15% off ✨"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cmp-body">Message</Label>
          <Textarea
            id="cmp-body"
            rows={12}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              "Kumusta! …\n\nWrite your message here. Leave a blank line between paragraphs. Links (https://…) become clickable.\n\nAn unsubscribe link is added automatically."
            }
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Plain text. Blank lines start new paragraphs; an unsubscribe link is
            added to the footer automatically.
          </p>
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={onFiles}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip className="h-4 w-4" /> Attach files
            </Button>
            {attachments.length > 0 && (
              <span
                className={
                  overCap
                    ? "text-xs text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {attachments.length} file{attachments.length === 1 ? "" : "s"} ·{" "}
                {prettySize(totalBytes)} / 10 MB
              </span>
            )}
          </div>

          {attachments.length > 0 && (
            <ul className="space-y-1">
              {attachments.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {a.filename}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({prettySize(a.size)})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="ml-2 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    aria-label={`Remove ${a.filename}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Attachments go to every recipient. Keep them small (max 10 MB total)
            — big files can trip spam filters. For large or many files, link to
            them in the message instead.
          </p>
        </div>

        {msg && (
          <p
            className={
              msg.ok
                ? "text-sm text-emerald-600 dark:text-emerald-400"
                : "text-sm text-destructive"
            }
          >
            {msg.text}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-sm text-muted-foreground">
            {testMode ? (
              <>Test mode — real send disabled until a domain is verified.</>
            ) : (
              <>
                Will send to{" "}
                <span className="font-semibold text-foreground">
                  {subscribedCount}
                </span>{" "}
                subscribed contact{subscribedCount === 1 ? "" : "s"}.
              </>
            )}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={doTest}
              disabled={disabled || overCap}
              title="Send a test to your own email"
            >
              <Mail className="h-4 w-4" />
              {testing ? "Sending…" : "Send test to me"}
            </Button>
            <Button
              onClick={doSend}
              disabled={disabled || overCap || testMode || subscribedCount === 0}
            >
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : "Send to all"}
            </Button>
          </div>
        </div>

        {!configured && (
          <p className="text-xs text-muted-foreground">
            Sending is disabled until <code>RESEND_API_KEY</code> is set — see
            the setup steps on the Subscribers tab.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
