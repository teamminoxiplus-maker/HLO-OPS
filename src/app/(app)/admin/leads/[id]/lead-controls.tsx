"use client";

import { useState, useTransition } from "react";
import { saveNotes, toggleContacted } from "../../actions";

// Inline contacted toggle + notes editor (spec §12).
export function LeadControls({
  id,
  contacted,
  notes,
}: {
  id: string;
  contacted: boolean;
  notes: string | null;
}) {
  const [isContacted, setContacted] = useState(contacted);
  const [text, setText] = useState(notes ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = !isContacted;
    setContacted(next);
    startTransition(() => toggleContacted(id, next));
  };

  const save = () => {
    setSaved(false);
    startTransition(async () => {
      await saveNotes(id, text);
      setSaved(true);
    });
  };

  return (
    <div className="space-y-4">
      <button
        onClick={toggle}
        disabled={pending}
        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
          isContacted
            ? "bg-emerald-100 text-emerald-800"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {isContacted ? "✓ Contacted" : "Mark as contacted"}
      </button>

      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          rows={4}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
          placeholder="Follow-up notes, Viber status, etc."
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {pending ? "Saving…" : "Save notes"}
          </button>
          {saved && <span className="text-xs text-emerald-600">Saved.</span>}
        </div>
      </div>
    </div>
  );
}
