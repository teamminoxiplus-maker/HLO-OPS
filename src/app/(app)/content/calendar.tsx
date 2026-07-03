"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ContentModal } from "./content-modal";
import {
  BRAND_LINES,
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
  PLATFORM_COLORS,
  labelize,
} from "@/lib/constants";
import { cn, todayManila } from "@/lib/utils";
import type {
  Campaign,
  ContentItem,
  Product,
  UserProfile,
} from "@/lib/types";

type ItemWithProduct = ContentItem & {
  products: { brand_line: string; name: string } | null;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ContentCalendar({
  month,
  items,
  products,
  campaigns,
  users,
}: {
  month: string;
  items: ItemWithProduct[];
  products: Product[];
  campaigns: Pick<Campaign, "id" | "name">[];
  users: UserProfile[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  const [fBrand, setFBrand] = useState("");
  const [fPlatform, setFPlatform] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fAssignee, setFAssignee] = useState("");

  const filtered = items.filter((it) => {
    if (fBrand && it.products?.brand_line !== fBrand) return false;
    if (fPlatform && it.platform !== fPlatform) return false;
    if (fStatus && it.status !== fStatus) return false;
    if (fAssignee && it.assigned_to !== fAssignee) return false;
    return true;
  });

  const byDate = useMemo(() => {
    const map: Record<string, ItemWithProduct[]> = {};
    for (const it of filtered) {
      if (!it.publish_date) continue;
      (map[it.publish_date] ??= []).push(it);
    }
    return map;
  }, [filtered]);

  const [y, m] = month.split("-").map(Number);
  const firstDow = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = todayManila();

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    const nm = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    router.push(`/content?month=${nm}`);
  }

  const monthLabel = new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(new Date(Date.UTC(y, m - 1, 1)));

  function openNew(date?: string) {
    setEditItem(null);
    setDefaultDate(date);
    setModalOpen(true);
  }
  function openEdit(it: ContentItem) {
    setEditItem(it);
    setDefaultDate(undefined);
    setModalOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-semibold">
            {monthLabel}
          </span>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" onClick={() => openNew()}>
          <Plus className="h-4 w-4" /> New content
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select className="w-auto" value={fBrand} onChange={(e) => setFBrand(e.target.value)}>
          <option value="">All brand lines</option>
          {BRAND_LINES.map((b) => (
            <option key={b} value={b}>
              {labelize(b)}
            </option>
          ))}
        </Select>
        <Select className="w-auto" value={fPlatform} onChange={(e) => setFPlatform(e.target.value)}>
          <option value="">All platforms</option>
          {CONTENT_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {labelize(p)}
            </option>
          ))}
        </Select>
        <Select className="w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All statuses</option>
          {CONTENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelize(s)}
            </option>
          ))}
        </Select>
        <Select className="w-auto" value={fAssignee} onChange={(e) => setFAssignee(e.target.value)}>
          <option value="">Anyone</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Platform legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {CONTENT_PLATFORMS.map((p) => (
          <span key={p} className="inline-flex items-center gap-1">
            <span className={cn("h-2.5 w-2.5 rounded-full", PLATFORM_COLORS[p])} />
            {labelize(p)}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 gap-px rounded-t-lg bg-border">
            {DOW.map((d) => (
              <div
                key={d}
                className="bg-card py-1.5 text-center text-xs font-semibold text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px rounded-b-lg bg-border">
            {cells.map((day, i) => {
              const dateStr = day
                ? `${month}-${String(day).padStart(2, "0")}`
                : null;
              const dayItems = dateStr ? byDate[dateStr] ?? [] : [];
              const isToday = dateStr === today;
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[92px] bg-card p-1",
                    !day && "bg-muted/30",
                  )}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            "text-xs",
                            isToday
                              ? "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {day}
                        </span>
                        <button
                          onClick={() => openNew(dateStr!)}
                          className="text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                          aria-label="Add content"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="mt-1 space-y-1">
                        {dayItems.slice(0, 4).map((it) => (
                          <button
                            key={it.id}
                            onClick={() => openEdit(it)}
                            className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] hover:bg-accent"
                            title={`${it.title} · ${labelize(it.platform)} · ${labelize(it.status)}`}
                          >
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                PLATFORM_COLORS[it.platform],
                              )}
                            />
                            <span className="truncate">{it.title}</span>
                          </button>
                        ))}
                        {dayItems.length > 4 && (
                          <span className="px-1 text-[10px] text-muted-foreground">
                            +{dayItems.length - 4} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ContentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        item={editItem}
        products={products}
        campaigns={campaigns}
        users={users}
        defaultDate={defaultDate}
      />
    </div>
  );
}
