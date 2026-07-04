"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { doUnsubscribe } from "./actions";

export function UnsubscribeClient({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function confirm() {
    setError(null);
    start(async () => {
      const res = await doUnsubscribe(token);
      if (res?.error) return setError(res.error);
      setDone(res.email ?? email);
    });
  }

  if (done) {
    return (
      <p className="text-sm text-muted-foreground">
        Done — <span className="font-medium text-foreground">{done}</span> has
        been unsubscribed. Salamat, and sorry to see you go!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Unsubscribe{" "}
        <span className="font-medium text-foreground">{email}</span> from
        marketing emails?
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={confirm} disabled={pending} className="w-full">
        {pending ? "Unsubscribing…" : "Unsubscribe"}
      </Button>
    </div>
  );
}
