"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ORDER_CHANNELS,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  labelize,
} from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

export function OrderFilters({ users }: { users: UserProfile[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page"); // reset pagination on any filter change
      router.push(`/orders?${params.toString()}`);
    },
    [router, sp],
  );

  const hasFilters = [
    "status",
    "payment_status",
    "channel",
    "assigned_to",
    "date_from",
    "date_to",
    "q",
  ].some((k) => sp.get(k));

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            defaultValue={sp.get("q") ?? ""}
            placeholder="Customer or order ref…"
            className="pl-8"
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setParam("q", (e.target as HTMLInputElement).value);
            }}
            onBlur={(e) => {
              if (e.target.value !== (sp.get("q") ?? ""))
                setParam("q", e.target.value);
            }}
          />
        </div>

        <Select
          className="w-auto"
          value={sp.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelize(s)}
            </option>
          ))}
        </Select>

        <Select
          className="w-auto"
          value={sp.get("payment_status") ?? ""}
          onChange={(e) => setParam("payment_status", e.target.value)}
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelize(s)}
            </option>
          ))}
        </Select>

        <Select
          className="w-auto"
          value={sp.get("channel") ?? ""}
          onChange={(e) => setParam("channel", e.target.value)}
        >
          <option value="">All channels</option>
          {ORDER_CHANNELS.map((s) => (
            <option key={s} value={s}>
              {labelize(s)}
            </option>
          ))}
        </Select>

        <Select
          className="w-auto"
          value={sp.get("assigned_to") ?? ""}
          onChange={(e) => setParam("assigned_to", e.target.value)}
        >
          <option value="">Anyone</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>

        <Input
          type="date"
          className="w-auto"
          value={sp.get("date_from") ?? ""}
          onChange={(e) => setParam("date_from", e.target.value)}
          aria-label="Order date from"
        />
        <Input
          type="date"
          className="w-auto"
          value={sp.get("date_to") ?? ""}
          onChange={(e) => setParam("date_to", e.target.value)}
          aria-label="Order date to"
        />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/orders")}
          >
            <X className="h-4 w-4" /> Clear
          </Button>
        )}
      </div>
    </div>
  );
}
