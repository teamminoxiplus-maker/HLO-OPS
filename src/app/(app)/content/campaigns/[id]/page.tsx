import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge } from "@/components/badges";
import { CampaignModalTrigger } from "../campaign-modal";
import { formatDate, formatNumber, formatPHP } from "@/lib/utils";
import { labelize } from "@/lib/constants";
import type { Campaign, ContentItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!campaign) notFound();
  const c = campaign as Campaign;

  const { data: contentData } = await supabase
    .from("content_items")
    .select("*")
    .eq("campaign_id", c.id)
    .order("publish_date", { ascending: true, nullsFirst: false });
  const items = (contentData as ContentItem[]) ?? [];

  const agg = items.reduce(
    (a, it) => ({
      views: a.views + (it.views ?? 0),
      likes: a.likes + (it.likes ?? 0),
      clicks: a.clicks + (it.clicks ?? 0),
      sales: a.sales + (it.sales_attributed ?? 0),
    }),
    { views: 0, likes: 0, clicks: 0, sales: 0 },
  );

  return (
    <div className="space-y-4">
      <Link
        href="/content/campaigns"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Campaigns
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{c.name}</h1>
            <Badge className="bg-secondary text-secondary-foreground">
              {labelize(c.status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(c.start_date)} – {formatDate(c.end_date)}
          </p>
        </div>
        <CampaignModalTrigger campaign={c} />
      </div>

      {c.notes && (
        <Card>
          <CardContent className="p-4 text-sm whitespace-pre-wrap">
            {c.notes}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Total views" value={formatNumber(agg.views)} />
        <Metric label="Total likes" value={formatNumber(agg.likes)} />
        <Metric label="Total clicks" value={formatNumber(agg.clicks)} />
        <Metric label="Attributed sales" value={formatPHP(agg.sales)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Title</th>
                <th className="p-3 text-left">Platform</th>
                <th className="p-3 text-left">Publish</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Views</th>
                <th className="p-3 text-right">Sales</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No content linked to this campaign yet.
                  </td>
                </tr>
              )}
              {items.map((it) => (
                <tr key={it.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{it.title}</td>
                  <td className="p-3">{labelize(it.platform)}</td>
                  <td className="p-3 whitespace-nowrap">
                    {formatDate(it.publish_date)}
                  </td>
                  <td className="p-3">
                    <ContentStatusBadge status={it.status} />
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {formatNumber(it.views)}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {it.sales_attributed ? formatPHP(it.sales_attributed) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
