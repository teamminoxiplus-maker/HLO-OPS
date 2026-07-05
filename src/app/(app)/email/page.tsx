import Link from "next/link";
import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { emailConfigured, usingTestSender } from "@/lib/email";
import { buttonVariants } from "@/components/ui/button";
import { SectionTabs } from "@/components/section-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { EmailSetupNotice } from "./setup-notice";
import { SubscribersClient } from "./subscribers-client";
import type { EmailSubscriber, SubscriberStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const TABS = [
  { href: "/email", label: "Subscribers" },
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

  let query = supabase
    .from("email_subscribers")
    .select("*", { count: "exact" });
  if (statusFilter) query = query.eq("status", statusFilter);
  const from = (page - 1) * PAGE_SIZE;
  query = query
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const [
    { data: rows, count },
    subscribedRes,
    unsubscribedRes,
    allSubscribedRes,
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
    // All subscribed emails for the one-click "Copy for BCC" button.
    supabase
      .from("email_subscribers")
      .select("email")
      .eq("status", "subscribed")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const subscribed = subscribedRes.count ?? 0;
  const unsubscribed = unsubscribedRes.count ?? 0;
  const subscribedEmails = (
    (allSubscribedRes.data as { email: string }[]) ?? []
  ).map((r) => r.email);

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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 text-sm">
          <Link
            href="/email"
            className={`rounded-md px-3 py-1.5 ${!statusFilter ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            All
          </Link>
          <Link
            href="/email?status=subscribed"
            className={`rounded-md px-3 py-1.5 ${statusFilter === "subscribed" ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Subscribed
          </Link>
          <Link
            href="/email?status=unsubscribed"
            className={`rounded-md px-3 py-1.5 ${statusFilter === "unsubscribed" ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground"}`}
          >
            Unsubscribed
          </Link>
        </div>
        <Link
          href="/api/email/export"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Download className="h-4 w-4" /> Export CSV
        </Link>
      </div>

      <SubscribersClient
        subscribers={(rows as EmailSubscriber[]) ?? []}
        page={page}
        pageCount={pageCount}
        total={total}
        statusFilter={statusFilter}
        subscribedEmails={subscribedEmails}
      />
    </div>
  );
}
