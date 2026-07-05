"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Upload,
  Trash2,
  UserMinus,
  UserCheck,
  ClipboardCopy,
  Check,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import {
  addSubscriber,
  importSubscribers,
  setSubscriberStatus,
  deleteSubscriber,
} from "./actions";
import type { EmailSubscriber, SubscriberStatus } from "@/lib/types";

export function SubscribersClient({
  subscribers,
  page,
  pageCount,
  total,
  statusFilter,
  subscribedEmails,
}: {
  subscribers: EmailSubscriber[];
  page: number;
  pageCount: number;
  total: number;
  statusFilter: SubscriberStatus | null;
  subscribedEmails: string[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  async function copyForBcc() {
    if (subscribedEmails.length === 0) return;
    const text = subscribedEmails.join(", ");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers that block the async clipboard API.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // Refresh data when the tab regains focus (spec §7 concurrent edits).
  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  function toggleStatus(s: EmailSubscriber) {
    start(async () => {
      await setSubscriberStatus(
        s.id,
        s.status === "subscribed" ? "unsubscribed" : "subscribed",
      );
      router.refresh();
    });
  }

  function remove(s: EmailSubscriber) {
    if (!confirm(`Remove ${s.email} from the list?`)) return;
    start(async () => {
      await deleteSubscriber(s.id);
      router.refresh();
    });
  }

  const pageHref = (p: number) =>
    `/email?${new URLSearchParams({
      ...(statusFilter ? { status: statusFilter } : {}),
      page: String(p),
    }).toString()}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add contact
        </Button>
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> Import emails
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={copyForBcc}
          disabled={subscribedEmails.length === 0}
          title="Copy all subscribed emails, comma-separated, to paste into Gmail Bcc"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <ClipboardCopy className="h-4 w-4" />
          )}
          {copied
            ? `Copied ${subscribedEmails.length}`
            : "Copy emails for BCC"}
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Source</TableHead>
              <TableHead className="hidden sm:table-cell">Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No contacts yet. Add one, or import a list.
                </TableCell>
              </TableRow>
            )}
            {subscribers.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.email}</TableCell>
                <TableCell>{s.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      s.status === "subscribed"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }
                  >
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden capitalize sm:table-cell">
                  {s.source ?? "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {formatDate(s.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      disabled={pending}
                      onClick={() => toggleStatus(s)}
                      title={
                        s.status === "subscribed"
                          ? "Mark unsubscribed"
                          : "Re-subscribe"
                      }
                    >
                      {s.status === "subscribed" ? (
                        <UserMinus className="h-4 w-4" />
                      ) : (
                        <UserCheck className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      disabled={pending}
                      onClick={() => remove(s)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} contact{total === 1 ? "" : "s"}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(pageHref(page - 1))}
            >
              Prev
            </Button>
            <span>
              {page} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => router.push(pageHref(page + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <AddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onDone={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onDone={() => {
          setImportOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function AddModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await addSubscriber({
        email,
        name: name || null,
        source: source || null,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEmail("");
      setName("");
      setSource("");
      onDone();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add contact">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="sub-email">Email *</Label>
          <Input
            id="sub-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@email.com"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sub-name">Name</Label>
          <Input
            id="sub-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Juan Dela Cruz"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sub-source">Source</Label>
          <Input
            id="sub-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="viber, signup form, walk-in…"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Adding…" : "Add contact"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ImportModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Accept "email" or "email, name" per line (also comma/semicolon/tab separated).
  function parse(): { email: string; name?: string | null }[] {
    return text
      .split(/[\n]+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        return { email: parts[0], name: parts[1] || null };
      });
  }

  function submit() {
    setError(null);
    setResult(null);
    const rows = parse();
    if (rows.length === 0) {
      setError("Paste at least one email address.");
      return;
    }
    start(async () => {
      const res = await importSubscribers(rows);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setResult(
        `Added ${res.added ?? 0}, skipped ${res.skipped ?? 0} existing${
          res.invalid ? `, ${res.invalid} invalid` : ""
        }.`,
      );
      setText("");
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import emails"
      description="One email per line. Optionally add a name after a comma: juan@email.com, Juan"
    >
      <div className="space-y-3">
        <Textarea
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"maria@email.com, Maria Santos\njuan@email.com\n…"}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {result}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={onDone}>
            Done
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Importing…" : "Import"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
