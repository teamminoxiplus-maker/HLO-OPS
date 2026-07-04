"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { sendTest, sendCampaign } from "../actions";

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
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, startTest] = useTransition();
  const [sending, startSend] = useTransition();

  const disabled = !configured || testing || sending;

  function doTest() {
    setMsg(null);
    startTest(async () => {
      const res = await sendTest(subject, body);
      if (res?.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: `Test sent to ${res.to}. Check your inbox.` });
    });
  }

  function doSend() {
    setMsg(null);
    if (
      !confirm(
        `Send this to ${subscribedCount} subscribed contact${subscribedCount === 1 ? "" : "s"}? This can't be undone.`,
      )
    )
      return;
    startSend(async () => {
      const res = await sendCampaign(subject, body);
      if (res?.error) return setMsg({ ok: false, text: res.error });
      const failNote = res.failed ? ` (${res.failed} failed)` : "";
      setMsg({
        ok: true,
        text: `Sent to ${res.sent} contact${res.sent === 1 ? "" : "s"}${failNote}.`,
      });
      setSubject("");
      setBody("");
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
              disabled={disabled}
              title="Send a test to your own email"
            >
              <Mail className="h-4 w-4" />
              {testing ? "Sending…" : "Send test to me"}
            </Button>
            <Button
              onClick={doSend}
              disabled={disabled || testMode || subscribedCount === 0}
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
