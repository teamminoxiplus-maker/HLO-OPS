"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SopMarkdown } from "@/components/sop-markdown";
import { SOP_CATEGORIES, labelize } from "@/lib/constants";
import { saveSop } from "../actions";
import type { Sop, SopCategory } from "@/lib/types";

export function SopEditor({ sop }: { sop: Sop | null }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(sop?.title ?? "");
  const [category, setCategory] = useState<SopCategory>(
    sop?.category ?? "formulation",
  );
  const [body, setBody] = useState(sop?.body ?? "# New SOP\n\n- [ ] First step\n");

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    start(async () => {
      const res = await saveSop(sop?.id ?? null, { title, category, body });
      // saveSop redirects on success; only returns on error.
      if (res && "error" in res) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <Link
        href={sop ? `/production/sops/${sop.id}` : "/production/sops"}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Cancel
      </Link>
      <h1 className="text-2xl font-bold">{sop ? "Edit SOP" : "New SOP"}</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as SopCategory)}
            >
              {SOP_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {labelize(c)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Body (Markdown)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="min-h-[400px] font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Use <code>- [ ]</code> for checklist steps, <code>#</code> /{" "}
              <code>##</code> for headings, <code>**bold**</code>.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : sop ? "Save (bumps version)" : "Create SOP"}
          </Button>
        </div>

        <div className="space-y-1">
          <Label>Preview</Label>
          <div className="rounded-lg border bg-card p-4">
            <SopMarkdown body={body} />
          </div>
        </div>
      </div>
    </div>
  );
}
