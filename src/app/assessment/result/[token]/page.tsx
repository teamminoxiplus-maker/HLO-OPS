import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { MinoxShell } from "@/components/assessment/minox-brand";
import { ResultView } from "@/components/assessment/result-view";
import { KioskReset } from "@/components/assessment/kiosk-reset";
import { assessmentDb } from "@/lib/assessment/persist";
import type { Concern, EngineFlag, ProductId, Severity } from "@/lib/assessment/types";

export const metadata: Metadata = {
  title: "Ang Result Mo — MINOXIPLUS",
  robots: { index: false }, // unguessable token, but keep result pages out of search
};

export const dynamic = "force-dynamic";

// Result page (spec §10). Public, re-openable via unguessable token. No PII in
// the URL. Reads the stored derived fields via the service client.
export default async function ResultPage({
  params,
}: {
  params: { token: string };
}) {
  const db = assessmentDb();
  const { data } = await db
    .from("assessments")
    .select(
      "full_name, concern, severity, flags, recommended_products, referral_required, status",
    )
    .eq("result_token", params.token)
    .maybeSingle();

  if (!data || data.status !== "completed" || !data.concern) {
    notFound();
  }

  return (
    <MinoxShell>
      <ResultView
        concern={data.concern as Concern}
        severity={data.severity as Severity}
        flags={(data.flags ?? []) as EngineFlag[]}
        products={(data.recommended_products ?? []) as ProductId[]}
        referral={!!data.referral_required}
        fullName={data.full_name}
      />
      <Suspense>
        <KioskReset />
      </Suspense>
    </MinoxShell>
  );
}
