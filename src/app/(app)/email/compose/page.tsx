import { createClient } from "@/lib/supabase/server";
import { emailConfigured, usingTestSender } from "@/lib/email";
import { SectionTabs } from "@/components/section-tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { ComposeClient } from "./compose-client";
import type { EmailCampaign } from "@/lib/types";

export const dynamic = "force-dynamic";
// Sending a blast can take a few seconds for larger lists.
export const maxDuration = 60;

const TABS = [
  { href: "/email", label: "Subscribers" },
  { href: "/email/batches", label: "Batches" },
  { href: "/email/compose", label: "Compose & Send" },
];

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export default async function ComposePage({
  searchParams,
}: {
  searchParams: { group?: string };
}) {
  const supabase = createClient();
  const initialGroup = searchParams.group?.trim().toLowerCase() || "";

  const [subsRes, campaignsRes] = await Promise.all([
    supabase
      .from("email_subscribers")
      .select("groups")
      .eq("status", "subscribed")
      .limit(10000),
    supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const subRows = (subsRes.data as { groups: string[] }[]) ?? [];
  const subscribedCount = subRows.length;
  const counts = new Map<string, number>();
  for (const r of subRows)
    for (const g of r.groups ?? []) counts.set(g, (counts.get(g) ?? 0) + 1);
  const groups = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
  // Ensure a linked-to batch is selectable even if it has 0 contacts.
  if (initialGroup && !groups.some((g) => g.name === initialGroup))
    groups.push({ name: initialGroup, count: 0 });

  const campaigns = (campaignsRes.data as EmailCampaign[]) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Email Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Your contact list and email blasts, all in one place.
        </p>
      </div>

      <SectionTabs tabs={TABS} />

      <ComposeClient
        subscribedCount={subscribedCount}
        groups={groups}
        initialGroup={initialGroup}
        configured={emailConfigured()}
        testMode={usingTestSender()}
      />

      {campaigns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent sends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(c.sent_at ?? c.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {c.sent_count}/{c.recipient_count} sent
                    {c.failed_count > 0 ? ` · ${c.failed_count} failed` : ""}
                  </span>
                  <Badge className={STATUS_COLORS[c.status] ?? ""}>
                    {c.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
