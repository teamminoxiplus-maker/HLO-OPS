import Link from "next/link";
import { distinctSources, listLeads, type LeadFilters } from "@/lib/assessment/queries";
import { concernLabel, flagLabels, productList } from "@/lib/assessment/labels";
import { formatDateTime } from "@/lib/utils";
import { LeadFilters as FilterBar } from "./filters";

export const dynamic = "force-dynamic";

function toFilters(sp: Record<string, string | undefined>): LeadFilters {
  return {
    q: sp.q,
    status: sp.status,
    concern: sp.concern,
    severity: sp.severity,
    sex: sp.sex,
    src: sp.src,
    contacted: sp.contacted,
    hasFlags: sp.hasFlags,
    from: sp.from ? `${sp.from}T00:00:00+08:00` : undefined,
    to: sp.to ? `${sp.to}T23:59:59+08:00` : undefined,
    page: sp.page ? Number(sp.page) : 1,
  };
}

// Query string builder preserving current filters across pagination.
function qs(sp: Record<string, string | undefined>, page: number): string {
  const p = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v && k !== "page") p.set(k, v);
  });
  p.set("page", String(page));
  return `?${p.toString()}`;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const filters = toFilters(searchParams);
  const [{ rows, total, page, pageCount }, sources] = await Promise.all([
    listLeads(filters),
    distinctSources(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {total} total · page {page} of {pageCount}
          </p>
        </div>
        <Link
          href={`/admin/export${qs(searchParams, 1).replace(/[&?]page=\d+/, "")}`}
          className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Export CSV (filtered)
        </Link>
      </div>

      <FilterBar
        current={{ ...filters, from: searchParams.from, to: searchParams.to }}
        sources={sources}
      />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Sex</th>
              <th className="px-3 py-2 font-medium">Concern</th>
              <th className="px-3 py-2 font-medium">Severity</th>
              <th className="px-3 py-2 font-medium">Flags</th>
              <th className="px-3 py-2 font-medium">Recommended</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Contacted</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-10 text-center text-muted-foreground">
                  No leads match these filters.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-accent/40">
                <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                  <Link href={`/admin/leads/${r.id}`} className="hover:underline">
                    {formatDateTime(r.created_at)}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/leads/${r.id}`} className="font-medium hover:underline">
                    {r.full_name ?? <em className="text-muted-foreground">draft</em>}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs">{r.email ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.phone ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{r.answers?.sex ?? "—"}</td>
                <td className="px-3 py-2">{concernLabel(r.concern)}</td>
                <td className="px-3 py-2">{r.severity ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.flags && r.flags.length > 0 ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      {flagLabels(r.flags).join(", ")}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="max-w-[180px] truncate px-3 py-2 text-xs">
                  {productList(r.recommended_products)}
                </td>
                <td className="px-3 py-2 text-xs">{r.src ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.contacted ? (
                    <span className="text-emerald-600">✓</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          {page > 1 ? (
            <Link href={`/admin/leads${qs(searchParams, page - 1)}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={`/admin/leads${qs(searchParams, page + 1)}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
