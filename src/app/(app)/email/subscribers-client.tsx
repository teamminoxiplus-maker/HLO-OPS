"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  Plus,
  Upload,
  Trash2,
  UserMinus,
  UserCheck,
  ClipboardCopy,
  Check,
  Tag,
  Pencil,
  FileDown,
  FileUp,
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
  setSubscriberGroups,
  bulkAddGroup,
  deleteSubscriber,
  deleteAllSubscribers,
} from "./actions";
import type { EmailSubscriber, SubscriberStatus } from "@/lib/types";

export function SubscribersClient({
  subscribers,
  page,
  pageCount,
  total,
  statusFilter,
  groupFilter,
  subscribedEmails,
  knownGroups,
}: {
  subscribers: EmailSubscriber[];
  page: number;
  pageCount: number;
  total: number;
  statusFilter: SubscriberStatus | null;
  groupFilter: string | null;
  subscribedEmails: string[];
  knownGroups: string[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const ids = Array.from(selected);
  const allChecked =
    subscribers.length > 0 && selected.size === subscribers.length;

  function toggleAll() {
    setSelected(
      allChecked ? new Set() : new Set(subscribers.map((s) => s.id)),
    );
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function copyForBcc() {
    if (subscribedEmails.length === 0) return;
    const text = subscribedEmails.join(", ");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
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

  function editGroups(s: EmailSubscriber) {
    const next = window.prompt(
      `Groups for ${s.email} (comma-separated, e.g. "new, reorder"):`,
      (s.groups ?? []).join(", "),
    );
    if (next === null) return;
    start(async () => {
      await setSubscriberGroups(
        s.id,
        next.split(",").map((g) => g.trim()).filter(Boolean),
      );
      router.refresh();
    });
  }

  function bulkGroup() {
    const g = window.prompt(
      `Add ${ids.length} contact${ids.length === 1 ? "" : "s"} to which group? (e.g. "reorder")`,
    );
    if (!g || !g.trim()) return;
    start(async () => {
      await bulkAddGroup(ids, g);
      setSelected(new Set());
      router.refresh();
    });
  }

  function clearList() {
    if (total === 0) return;
    const typed = window.prompt(
      `This deletes ALL ${total} contact${total === 1 ? "" : "s"} in every batch. This cannot be undone.\n\nType DELETE to confirm:`,
    );
    if (typed?.trim().toUpperCase() !== "DELETE") return;
    start(async () => {
      const res = await deleteAllSubscribers();
      if (res?.error) {
        alert(res.error);
        return;
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  const pageHref = (p: number) =>
    `/email?${new URLSearchParams({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(groupFilter ? { group: groupFilter } : {}),
      page: String(p),
    }).toString()}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
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
          title="Copy the shown subscribed emails, comma-separated, for Gmail Bcc"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <ClipboardCopy className="h-4 w-4" />
          )}
          {copied
            ? `Copied ${subscribedEmails.length}`
            : groupFilter
              ? `Copy BCC (${groupFilter})`
              : "Copy emails for BCC"}
        </Button>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" disabled={pending} onClick={bulkGroup}>
              <Tag className="h-4 w-4" /> Add to group
            </Button>
          </div>
        )}

        {total > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto text-destructive hover:text-destructive"
            disabled={pending}
            onClick={clearList}
            title="Delete all contacts"
          >
            <Trash2 className="h-4 w-4" /> Clear list
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  aria-label="Select all"
                  className="h-4 w-4 rounded border-input"
                />
              </TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden sm:table-cell">Name</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscribers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No contacts here yet. Add one, or import a list.
                </TableCell>
              </TableRow>
            )}
            {subscribers.map((s) => (
              <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleOne(s.id)}
                    aria-label={`Select ${s.email}`}
                    className="h-4 w-4 rounded border-input"
                  />
                </TableCell>
                <TableCell className="font-medium">{s.email}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {s.name ?? "—"}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => editGroups(s)}
                    className="flex flex-wrap items-center gap-1 text-left"
                    title="Edit groups"
                  >
                    {(s.groups ?? []).length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3" /> add
                      </span>
                    ) : (
                      s.groups.map((g) => (
                        <Badge
                          key={g}
                          className="bg-teal-100 capitalize text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                        >
                          {g}
                        </Badge>
                      ))
                    )}
                  </button>
                </TableCell>
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} contact{total === 1 ? "" : "s"}
          {groupFilter ? ` in "${groupFilter}"` : ""}
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
        knownGroups={knownGroups}
        onClose={() => setAddOpen(false)}
        onDone={() => {
          setAddOpen(false);
          router.refresh();
        }}
      />
      <ImportModal
        open={importOpen}
        knownGroups={knownGroups}
        onClose={() => setImportOpen(false)}
        onDone={() => {
          setImportOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function GroupHint({ knownGroups }: { knownGroups: string[] }) {
  if (knownGroups.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Existing groups: {knownGroups.join(", ")}
    </p>
  );
}

function AddModal({
  open,
  knownGroups,
  onClose,
  onDone,
}: {
  open: boolean;
  knownGroups: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [groups, setGroups] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await addSubscriber({
        email,
        name: name || null,
        source: source || null,
        groups: groups.split(",").map((g) => g.trim()).filter(Boolean),
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEmail("");
      setName("");
      setSource("");
      setGroups("");
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
          <Label htmlFor="sub-groups">Groups</Label>
          <Input
            id="sub-groups"
            value={groups}
            onChange={(e) => setGroups(e.target.value)}
            placeholder="new, reorder, vip"
          />
          <GroupHint knownGroups={knownGroups} />
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

interface ImportRow {
  email: string;
  name?: string | null;
  groups?: string[];
}

function ImportModal({
  open,
  knownGroups,
  onClose,
  onDone,
}: {
  open: boolean;
  knownGroups: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [group, setGroup] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function runImport(rows: ImportRow[]) {
    setError(null);
    setResult(null);
    if (rows.length === 0) {
      setError("No email addresses found.");
      return;
    }
    start(async () => {
      const res = await importSubscribers(rows, group || null);
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

  // Download a ready-to-fill CSV template.
  function downloadTemplate() {
    const csv =
      "email,name,groups\n" +
      "maria.santos@email.com,Maria Santos,new\n" +
      'juan.delacruz@email.com,Juan Dela Cruz,"reorder, vip"\n';
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hlo-contacts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Parse an uploaded CSV: needs an email column; name + group(s) optional.
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    setError(null);
    setResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const find = (kw: string) =>
          headers.find((h) => h.toLowerCase().includes(kw));
        const eCol = find("email");
        const nCol = find("name");
        const gCol = find("group");
        if (!eCol) {
          setError('Your file needs an "email" column.');
          return;
        }
        const rows: ImportRow[] = (res.data as Record<string, string>[]).map(
          (r) => ({
            email: r[eCol],
            name: nCol ? r[nCol] : null,
            groups:
              gCol && r[gCol]
                ? r[gCol].split(/[,;|]/).map((g) => g.trim()).filter(Boolean)
                : [],
          }),
        );
        runImport(rows);
      },
    });
  }

  // Paste path: "email" or "email, name" per line.
  function submitPaste() {
    const rows: ImportRow[] = text
      .split(/[\n]+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        return { email: parts[0], name: parts[1] || null };
      });
    runImport(rows);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import contacts"
      description="Upload a filled-in template file, or paste emails."
    >
      <div className="space-y-4">
        {/* Option 1 — file */}
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Option 1 — upload a file</p>
          <p className="text-xs text-muted-foreground">
            Columns: <code>email</code>, <code>name</code>, <code>groups</code>{" "}
            (groups can list several, e.g. <code>reorder, vip</code>). Each row
            goes to its own batch.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFile}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <FileDown className="h-4 w-4" /> Download template
            </Button>
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
            >
              <FileUp className="h-4 w-4" />
              {pending ? "Importing…" : "Upload CSV"}
            </Button>
          </div>
        </div>

        {/* Option 2 — paste */}
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Option 2 — paste emails</p>
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"maria@email.com, Maria Santos\njuan@email.com\n…"}
          />
          <Button size="sm" onClick={submitPaste} disabled={pending || !text.trim()}>
            {pending ? "Importing…" : "Import pasted"}
          </Button>
        </div>

        <div className="space-y-1">
          <Label htmlFor="imp-group">
            Also add everyone imported to this group (optional)
          </Label>
          <Input
            id="imp-group"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="e.g. reorder"
          />
          <GroupHint knownGroups={knownGroups} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {result}
          </p>
        )}
        <div className="flex justify-end border-t pt-3">
          <Button variant="outline" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
