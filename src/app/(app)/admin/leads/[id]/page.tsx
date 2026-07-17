import Link from "next/link";
import { notFound } from "next/navigation";
import { getLead } from "@/lib/assessment/queries";
import { concernLabel, flagLabels, productList } from "@/lib/assessment/labels";
import { QUESTIONS, labelForAnswer } from "@/lib/assessment/questions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { LeadControls } from "./lead-controls";

export const dynamic = "force-dynamic";

// Full answer detail (spec §12).
export default async function LeadDetail({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) notFound();

  const answers = lead.answers ?? {};
  const field = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? "—"}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <Link href="/admin/leads" className="text-sm text-muted-foreground hover:underline">
        ← Back to leads
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {lead.full_name ?? "Draft submission"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(lead.created_at)} ·{" "}
            <span className="capitalize">{lead.status}</span>
          </p>
        </div>
        {lead.result_token && (
          <a
            href={`/assessment/result/${lead.result_token}`}
            target="_blank"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Open result page ↗
          </a>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Lead</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {field("Email", lead.email)}
              {field("Phone", lead.phone)}
              {field("Marketing consent", lead.consent_marketing ? "Yes" : "No")}
              {field("Source", lead.src)}
              {field("UTM source", lead.utm_source)}
              {field("UTM campaign", lead.utm_campaign)}
              {field("Referrer", lead.referrer)}
              {field("Device", lead.device_type)}
              {field("Completed", lead.completed_at ? formatDateTime(lead.completed_at) : "—")}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {field("Concern", concernLabel(lead.concern))}
            {field("Severity", lead.severity)}
            {field(
              "Flags",
              lead.flags && lead.flags.length > 0 ? flagLabels(lead.flags).join(", ") : "None",
            )}
            {field("Recommended", productList(lead.recommended_products))}
            {field("Referral required", lead.referral_required ? "Yes" : "No")}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Answers</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            {QUESTIONS.map((q) => {
              const raw = (answers as Record<string, unknown>)[q.id];
              let display = "—";
              if (Array.isArray(raw)) {
                display = raw.length
                  ? raw.map((v) => labelForAnswer(q.id, String(v))).join(", ")
                  : "—";
              } else if (raw !== undefined) {
                display = labelForAnswer(q.id, String(raw));
              }
              return (
                <div key={q.id}>
                  <dt className="text-xs text-muted-foreground">{q.title}</dt>
                  <dd className="text-sm font-medium">{display}</dd>
                </div>
              );
            })}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ops</CardTitle>
        </CardHeader>
        <CardContent>
          <LeadControls id={lead.id} contacted={lead.contacted} notes={lead.notes} />
        </CardContent>
      </Card>
    </div>
  );
}
