import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { emailConfigured, usingTestSender } from "@/lib/email";
import { buttonVariants } from "@/components/ui/button";
import { SectionTabs } from "@/components/section-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EmailSetupNotice } from "./setup-notice";
import { SubscribersClient } from "./subscribers-client";
import type { EmailSubscriber, SubscriberStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
// Large CSV imports (thousands of contacts) can take a bit.
export const maxDuration = 60;

const PAGE_SIZE = 50;

const TABS = [
  { href: "/email", label: "Subscribers" },
  { href: "/email/batches", label: "Batches" },
  { href: "/email/compose", label: "Compose & Send" },
];

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const supabase = createClient();

  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const statusFilter = (["subscribed", "unsubscribed"] as string[]).includes(
    searchParams.status ?? "",
  )
    ? (searchParams.status as SubscriberStatus)
    : null;
  const groupFilter = searchParams.group?.trim().toLowerCase() || null;

  let query = supabase
    .from("email_subscribers")
    .select("*", { count: "exact" });
  if (statusFilter) query = query.eq("status", statusFilter);
  if (groupFilter) query = query.contains("groups", [groupFilter]);
  const from = (page - 1) * PAGE_SIZE;
  query = query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  // Emails for the "Copy for BCC" button — respect the active group filter.
  let bccQuery = supabase
    .from("email_subscribers")
    .select("email")
    .eq("status", "subscribed")
    .limit(5000);
  if (groupFilter) bccQuery = bccQuery.contains("groups", [groupFilter]);

  const [
    { data: rows, count },
    subscribedRes,
    unsubscribedRes,
    bccRes,
    allGroupsRes,
  ] = await Promise.all([
    query,
    supabase
      .from("email_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "subscribed"),
    supabase
      .from("email_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "unsubscribed"),
    bccQuery,
    supabase.from("email_subscribers").select("groups").limit(10000),
  ]);

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const subscribed = subscribedRes.count ?? 0;
  const unsubscribed = unsubscribedRes.count ?? 0;
  const subscribedEmails = (
    (bccRes.data as { email: string }[]) ?? []
  ).map((r) => r.email);

  // Distinct group names across all subscribers, for filter chips.
  const groupSet = new Set<string>();
  for (const r of (allGroupsRes.data as { groups: string[] }[]) ?? []) {
    for (const g of r.groups ?? []) groupSet.add(g);
  }
  const allGroups = Array.from(groupSet).sort();

  const filterHref = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    if (statusFilter) p.set("status", statusFilter);
    if (groupFilter) p.set("group", groupFilter);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    p.delete("page");
    const s = p.toString();
    return s ? `/email?${s}` : "/email";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Email Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Your contact list and email blasts, all in one place.
        </p>
      </div>

      <SectionTabs tabs={TABS} />

      {!emailConfigured() ? (
        <EmailSetupNotice />
      ) : (
        usingTestSender() && (
          <Card className="border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
            <CardContent className="p-4 text-sm text-amber-800 dark:text-amber-200">
              <strong>Test mode:</strong> no verified sending domain yet, so
              emails can only be delivered to your own account address. Verify a
              domain in Resend and set <code>EMAIL_FROM</code> to send to real
              subscribers.
            </CardContent>
          </Card>
        )
      )}

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {subscribed}
            </p>
            <p className="text-sm text-muted-foreground">Subscribed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-muted-foreground">
              {unsubscribed}
            </p>
            <p className="text-sm text-muted-foreground">Unsubscribed</p>
          </CardContent>
        </Card>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 text-sm">
          <Link
            href={filterHref({ status: null })}
            className={cn(
              "rounded-md px-3 py-1.5",
              !statusFilter
                ? "bg-accent font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </Link>
          <Link
            href={filterHref({ status: "subscribed" })}
            className={cn(
              "rounded-md px-3 py-1.5",
              statusFilter === "subscribed"
                ? "bg-accent font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Subscribed
          </Link>
          <Link
            href={filterHref({ status: "unsubscribed" })}
            className={cn(
              "rounded-md px-3 py-1.5",
              statusFilter === "unsubscribed"
                ? "bg-accent font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Unsubscribed
          </Link>
        </div>
        <Link
          href={`/api/email/export${groupFilter ? `?group=${encodeURIComponent(groupFilter)}` : ""}`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Link>
      </div>

      {/* Group filter */}
      {allGroups.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Group:
          </span>
          <Link
            href={filterHref({ group: null })}
            className={cn(
              "rounded-full px-3 py-1",
              !groupFilter
                ? "bg-primary text-primary-foreground"
                : "border text-muted-foreground hover:text-foreground",
            )}
          >
            All
          </Link>
          {allGroups.map((g) => (
            <Link
              key={g}
              href={filterHref({ group: g })}
              className={cn(
                "rounded-full px-3 py-1 capitalize",
                groupFilter === g
                  ? "bg-primary text-primary-foreground"
                  : "border text-muted-foreground hover:text-foreground",
              )}
            >
              {g}
            </Link>
          ))}
        </div>
      )}

      <SubscribersClient
        subscribers={(rows as EmailSubscriber[]) ?? []}
        page={page}
        pageCount={pageCount}
        total={total}
        statusFilter={statusFilter}
        groupFilter={groupFilter}
        subscribedEmails={subscribedEmails}
        knownGroups={allGroups}
      />
    </div>
  );
}
