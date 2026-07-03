"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ContentModal } from "../content-modal";
import {
  BRAND_LINES,
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
  CONTENT_STATUS_COLORS,
  labelize,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { updateContentStatus } from "../actions";
import type {
  Campaign,
  ContentItem,
  ContentStatus,
  Product,
  UserProfile,
} from "@/lib/types";

type ItemWithProduct = ContentItem & {
  products: { brand_line: string; name: string } | null;
};

export function ContentListClient({
  items,
  products,
  campaigns,
  users,
  page,
  pageCount,
  total,
}: {
  items: ItemWithProduct[];
  products: Product[];
  campaigns: Pick<Campaign, "id" | "name">[];
  users: UserProfile[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);

  const userName = Object.fromEntries(users.map((u) => [u.id, u.name]));

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/content/list?${params.toString()}`);
  }
  function pageLink(p: number) {
    const params = new URLSearchParams(sp.toString());
    params.set("page", String(p));
    return `/content/list?${params.toString()}`;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Input
            defaultValue={sp.get("q") ?? ""}
            placeholder="Search title…"
            className="w-40"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setParam("q", (e.target as HTMLInputElement).value);
            }}
          />
          <Select className="w-auto" value={sp.get("brand_line") ?? ""} onChange={(e) => setParam("brand_line", e.target.value)}>
            <option value="">All brands</option>
            {BRAND_LINES.map((b) => (
              <option key={b} value={b}>{labelize(b)}</option>
            ))}
          </Select>
          <Select className="w-auto" value={sp.get("platform") ?? ""} onChange={(e) => setParam("platform", e.target.value)}>
            <option value="">All platforms</option>
            {CONTENT_PLATFORMS.map((p) => (
              <option key={p} value={p}>{labelize(p)}</option>
            ))}
          </Select>
          <Select className="w-auto" value={sp.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
            <option value="">All statuses</option>
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>{labelize(s)}</option>
            ))}
          </Select>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditItem(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New content
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Publish</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Asset</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No content items.
                </TableCell>
              </TableRow>
            )}
            {items.map((it) => (
              <TableRow key={it.id}>
                <TableCell>
                  <button
                    className="text-left font-medium hover:underline"
                    onClick={() => {
                      setEditItem(it);
                      setModalOpen(true);
                    }}
                  >
                    {it.title}
                  </button>
                  {it.products?.name && (
                    <div className="text-xs text-muted-foreground">
                      {it.products.name}
                    </div>
                  )}
                </TableCell>
                <TableCell>{labelize(it.platform)}</TableCell>
                <TableCell>{labelize(it.content_type)}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDate(it.publish_date)}
                </TableCell>
                <TableCell>
                  <InlineStatus id={it.id} value={it.status} />
                </TableCell>
                <TableCell>
                  {it.assigned_to ? userName[it.assigned_to] : "—"}
                </TableCell>
                <TableCell>
                  {it.asset_link ? (
                    <a
                      href={it.asset_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {pageCount} · {total} total
        </span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => router.push(pageLink(page - 1))}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => router.push(pageLink(page + 1))}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ContentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        item={editItem}
        products={products}
        campaigns={campaigns}
        users={users}
      />
    </div>
  );
}

function InlineStatus({ id, value }: { id: string; value: ContentStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      className={`h-8 w-auto min-w-[120px] ${CONTENT_STATUS_COLORS[value]}`}
      value={value}
      disabled={pending}
      onChange={(e) =>
        start(async () => {
          await updateContentStatus(id, e.target.value as ContentStatus);
          router.refresh();
        })
      }
    >
      {CONTENT_STATUSES.map((s) => (
        <option key={s} value={s}>
          {labelize(s)}
        </option>
      ))}
    </Select>
  );
}
