"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { FileUp, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ORDER_CHANNELS, labelize } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  IMPORT_FIELDS,
  importOrders,
  saveMapping,
  type ImportSummary,
} from "./actions";
import type { OrderChannel } from "@/lib/types";

type ParsedFile = { headers: string[]; rows: Record<string, string>[] };

export function ImportWizard({
  savedMappings,
}: {
  savedMappings: Record<string, Record<string, string>>;
}) {
  const [channel, setChannel] = useState<OrderChannel>("website");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [pending, start] = useTransition();
  const [savedNote, setSavedNote] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onChannelChange(c: OrderChannel) {
    setChannel(c);
    setMapping(savedMappings[c] ?? {});
    setSummary(null);
  }

  function handleFile(file: File) {
    setSummary(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        // Auto-map from saved mapping, else best-effort by fuzzy header match.
        const saved = savedMappings[channel] ?? {};
        const auto: Record<string, string> = {};
        for (const f of IMPORT_FIELDS) {
          if (saved[f.key] && headers.includes(saved[f.key])) {
            auto[f.key] = saved[f.key];
            continue;
          }
          const guess = headers.find((h) =>
            fuzzyMatch(h, f.key, f.label),
          );
          if (guess) auto[f.key] = guess;
        }
        setMapping((prev) => ({ ...auto, ...prev, ...auto }));
        setParsed({ headers, rows: res.data });
      },
    });
  }

  const mappedRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((row) => {
      const out: Record<string, string> = {};
      for (const f of IMPORT_FIELDS) {
        const col = mapping[f.key];
        if (col && row[col] !== undefined) out[f.key] = row[col];
      }
      return out;
    });
  }, [parsed, mapping]);

  const refMapped = !!mapping.order_ref;

  function doSaveMapping() {
    start(async () => {
      await saveMapping(channel, mapping);
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 2500);
    });
  }

  function doImport() {
    start(async () => {
      const res = await importOrders(channel, mappedRows);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      setSummary(res);
    });
  }

  return (
    <div className="space-y-4">
      {/* Step 1 — channel + file */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Choose channel &amp; file</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>Channel</Label>
              <Select
                value={channel}
                onChange={(e) => onChannelChange(e.target.value as OrderChannel)}
                className="w-48"
              >
                {ORDER_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {labelize(c)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4" />
                {parsed ? "Choose different file" : "Choose CSV file"}
              </Button>
            </div>
            {parsed && (
              <span className="text-sm text-muted-foreground">
                {parsed.rows.length} rows · {parsed.headers.length} columns
              </span>
            )}
          </div>
          {savedMappings[channel] && (
            <p className="text-xs text-muted-foreground">
              A saved mapping exists for {labelize(channel)} and will be applied
              automatically.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — column mapping */}
      {parsed && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">2. Map columns</CardTitle>
            <div className="flex items-center gap-2">
              {savedNote && (
                <span className="text-xs text-emerald-600">Mapping saved</span>
              )}
              <Button variant="outline" size="sm" onClick={doSaveMapping} disabled={pending}>
                <Save className="h-4 w-4" /> Save mapping
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center justify-between gap-3">
                  <Label className="shrink-0">
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </Label>
                  <Select
                    className="max-w-[220px]"
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [f.key]: e.target.value }))
                    }
                  >
                    <option value="">— not mapped —</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            {!refMapped && (
              <p className="mt-3 flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> Order Ref must be mapped to
                import.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 — preview + import */}
      {parsed && refMapped && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Preview &amp; import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PreviewTable rows={mappedRows.slice(0, 5)} />
            <div className="flex items-center gap-3">
              <Button onClick={doImport} disabled={pending}>
                {pending ? "Importing…" : `Import ${mappedRows.length} orders`}
              </Button>
              <span className="text-xs text-muted-foreground">
                Deduped on channel + order ref. Existing orders are updated.
              </span>
            </div>

            {summary && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> Import complete
                </div>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <Stat label="New" value={summary.inserted} />
                  <Stat label="Updated" value={summary.updated} />
                  <Stat label="Skipped" value={summary.skipped} />
                </div>
                {summary.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-destructive">
                      {summary.errors.length} error(s)
                    </summary>
                    <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                      {summary.errors.slice(0, 20).map((e, i) => (
                        <li key={i}>
                          Row {e.row}: {e.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <Link
                  href="/orders"
                  className="mt-2 inline-block text-primary hover:underline"
                >
                  View orders →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-background p-2 text-center">
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function PreviewTable({ rows }: { rows: Record<string, string>[] }) {
  if (!rows.length)
    return <p className="text-sm text-muted-foreground">No rows to preview.</p>;
  const cols = IMPORT_FIELDS.filter((f) => rows.some((r) => r[f.key]));
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="bg-muted/50">
          <tr>
            {cols.map((c) => (
              <th key={c.key} className="px-2 py-1.5 text-left font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {cols.map((c) => (
                <td key={c.key} className="max-w-[160px] truncate px-2 py-1.5">
                  {r[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Loose header matching for auto-mapping suggestions.
function fuzzyMatch(header: string, key: string, label: string): boolean {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
  const candidates = [key, label].map((s) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  const extra: Record<string, string[]> = {
    order_ref: ["ordernumber", "orderid", "ordersn", "ordercode", "reference"],
    customer_name: ["buyer", "recipient", "customer", "buyername", "name"],
    order_date: ["createtime", "orderdate", "createdat", "datecreated", "time"],
    amount_total: ["total", "grandtotal", "orderamount", "totalamount", "paidprice"],
    amount_paid: ["paid", "amountpaid", "paidamount"],
    payment_status: ["paymentstatus", "paymentmethod", "payment"],
    status: ["orderstatus", "status", "fulfillmentstatus"],
    notes: ["remark", "note", "message", "buyermessage"],
  };
  const all = [...candidates, ...(extra[key] ?? [])];
  return all.some((c) => h === c || h.includes(c) || c.includes(h));
}
