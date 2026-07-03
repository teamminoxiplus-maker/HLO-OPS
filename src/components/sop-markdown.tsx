"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Minimal markdown renderer for SOP bodies. Supports headings (#/##/###),
// bullet + checkbox lists (- [ ] / - [x]), **bold**, `code`, and paragraphs.
// Checkboxes are interactive but per-view only (not saved) — SOPs are guides.

function inline(text: string, keyBase: string) {
  // Split on **bold** and `code`, keep delimiters.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return <code key={`${keyBase}-${i}`}>{p.slice(1, -1)}</code>;
    }
    return <span key={`${keyBase}-${i}`}>{p}</span>;
  });
}

export function SopMarkdown({ body }: { body: string }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const lines = body.replace(/\r\n/g, "\n").split("\n");

  const out: React.ReactNode[] = [];
  let list: React.ReactNode[] = [];
  let cbIndex = 0;

  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="space-y-1">
          {list}
        </ul>,
      );
      list = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
      return;
    }
    if (line.startsWith("### ")) {
      flush();
      out.push(<h3 key={i}>{inline(line.slice(4), `h3-${i}`)}</h3>);
    } else if (line.startsWith("## ")) {
      flush();
      out.push(<h2 key={i}>{inline(line.slice(3), `h2-${i}`)}</h2>);
    } else if (line.startsWith("# ")) {
      flush();
      out.push(<h1 key={i}>{inline(line.slice(2), `h1-${i}`)}</h1>);
    } else if (/^-\s*\[[ xX]\]\s/.test(line)) {
      const idx = cbIndex++;
      const isChecked =
        checked[idx] ?? /\[[xX]\]/.test(line.match(/\[[ xX]\]/)![0]);
      const label = line.replace(/^-\s*\[[ xX]\]\s/, "");
      list.push(
        <li key={i} className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) =>
              setChecked((prev) => ({ ...prev, [idx]: e.target.checked }))
            }
            className="mt-1 h-4 w-4 rounded border-input"
          />
          <span className={cn(isChecked && "text-muted-foreground line-through")}>
            {inline(label, `cb-${i}`)}
          </span>
        </li>,
      );
    } else if (/^[-*]\s/.test(line)) {
      list.push(
        <li key={i} className="ml-5 list-disc">
          {inline(line.replace(/^[-*]\s/, ""), `li-${i}`)}
        </li>,
      );
    } else {
      flush();
      out.push(<p key={i}>{inline(line, `p-${i}`)}</p>);
    }
  });
  flush();

  return <div className="prose-sop max-w-none text-sm">{out}</div>;
}
