"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addEmailToBatch, removeFromBatch } from "../actions";
import type { EmailSubscriber } from "@/lib/types";

type Contact = Pick<EmailSubscriber, "id" | "email" | "name" | "groups">;
interface Column {
  group: string;
  contacts: Contact[];
}

export function BatchesClient({
  columns,
  ungrouped,
}: {
  columns: Column[];
  ungrouped: Contact[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {columns.map((col) => (
          <BatchColumn key={col.group} group={col.group} contacts={col.contacts} />
        ))}
      </div>

      {ungrouped.length > 0 && (
        <div className="rounded-lg border bg-card p-3">
          <p className="mb-2 text-sm font-medium">
            No batch yet ({ungrouped.length})
          </p>
          <p className="mb-2 text-xs text-muted-foreground">
            These contacts aren&apos;t in any batch. Add them into one from the
            Subscribers tab, or re-add their email into a column above.
          </p>
          <div className="flex flex-wrap gap-1">
            {ungrouped.slice(0, 50).map((c) => (
              <span
                key={c.id}
                className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {c.email}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BatchColumn({
  group,
  contacts,
}: {
  group: string;
  contacts: Contact[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    setError(null);
    if (!email.trim()) return;
    start(async () => {
      const res = await addEmailToBatch({ email, name: name || null, group });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEmail("");
      setName("");
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      await removeFromBatch(id, group);
      router.refresh();
    });
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div>
          <p className="font-semibold capitalize">{group}</p>
          <p className="text-xs text-muted-foreground">
            {contacts.length} contact{contacts.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={`/email/compose?group=${encodeURIComponent(group)}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
          title={`Send an email to ${group}`}
        >
          <Send className="h-3.5 w-3.5" /> Send
        </Link>
      </div>

      <div className="flex-1 space-y-1 p-2">
        {contacts.length === 0 && (
          <p className="px-1 py-3 text-center text-xs text-muted-foreground">
            No emails yet. Add one below.
          </p>
        )}
        {contacts.map((c) => (
          <div
            key={c.id}
            className="group flex items-center justify-between gap-1 rounded-md border bg-background px-2 py-1.5 text-sm"
          >
            <span className="min-w-0">
              <span className="block truncate">{c.email}</span>
              {c.name && (
                <span className="block truncate text-xs text-muted-foreground">
                  {c.name}
                </span>
              )}
            </span>
            <button
              onClick={() => remove(c.id)}
              disabled={pending}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-destructive"
              title={`Remove from ${group}`}
              aria-label="Remove from batch"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-1 border-t p-2">
        <Input
          className="h-8"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@…"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Input
          className="h-8"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button
          size="sm"
          className="w-full"
          disabled={pending || !email.trim()}
          onClick={add}
        >
          <Plus className="h-4 w-4" /> Add to {group}
        </Button>
      </div>
    </div>
  );
}
