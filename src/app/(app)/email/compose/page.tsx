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
  { href: "/email/compose", label: "Compose & Send" },
];

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export default async function ComposePage() {
  const supabase = createClient();

  const [subRes, campaignsRes] = await Promise.all([
    supabase
      .from("email_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "subscribed"),
    supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const subscribedCount = subRes.count ?? 0;
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
