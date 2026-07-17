import { CONCERN_COPY } from "@/lib/assessment/copy";
import type { LeadFilters } from "@/lib/assessment/queries";

const CONCERNS = Object.keys(CONCERN_COPY);

// GET-form filter bar (spec §12). No client JS — submitting reloads with query
// params, keeping server-side pagination authoritative.
export function LeadFilters({
  current,
  sources,
}: {
  current: LeadFilters;
  sources: string[];
}) {
  const sel =
    "h-9 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-muted-foreground">Search</label>
        <input
          name="q"
          defaultValue={current.q ?? ""}
          placeholder="name / email / phone"
          className="h-9 w-48 rounded-md border border-input bg-background px-2 text-sm"
        />
      </div>
      <select name="status" defaultValue={current.status ?? "all"} className={sel}>
        <option value="all">All status</option>
        <option value="completed">Completed</option>
        <option value="draft">Draft</option>
      </select>
      <select name="concern" defaultValue={current.concern ?? "all"} className={sel}>
        <option value="all">All concerns</option>
        {CONCERNS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select name="severity" defaultValue={current.severity ?? "all"} className={sel}>
        <option value="all">All severity</option>
        <option value="Early">Early</option>
        <option value="Moderate">Moderate</option>
        <option value="Advanced">Advanced</option>
      </select>
      <select name="sex" defaultValue={current.sex ?? "all"} className={sel}>
        <option value="all">All sex</option>
        <option value="male">Lalaki</option>
        <option value="female">Babae</option>
      </select>
      <select name="src" defaultValue={current.src ?? "all"} className={sel}>
        <option value="all">All sources</option>
        {sources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select name="contacted" defaultValue={current.contacted ?? "all"} className={sel}>
        <option value="all">Contacted?</option>
        <option value="yes">Contacted</option>
        <option value="no">Not contacted</option>
      </select>
      <select name="hasFlags" defaultValue={current.hasFlags ?? "all"} className={sel}>
        <option value="all">Any flags</option>
        <option value="yes">Has flags</option>
      </select>
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-muted-foreground">From</label>
        <input type="date" name="from" defaultValue={current.from ?? ""} className={sel} />
      </div>
      <div className="flex flex-col">
        <label className="mb-1 text-xs text-muted-foreground">To</label>
        <input type="date" name="to" defaultValue={current.to ?? ""} className={sel} />
      </div>
      <button
        type="submit"
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Filter
      </button>
      <a href="/admin/leads" className="h-9 rounded-md border px-4 text-sm leading-9 hover:bg-accent">
        Reset
      </a>
    </form>
  );
}
