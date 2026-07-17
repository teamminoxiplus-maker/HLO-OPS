import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MinoxShell } from "@/components/assessment/minox-brand";
import { QuestionStep } from "@/components/assessment/question-step";
import { TOTAL_STEPS } from "@/lib/assessment/questions";

// Question steps 1–12 (spec §6). Invalid step numbers 404 — the path is
// load-bearing, so keep it strict.
export default function StepPage({ params }: { params: { step: string } }) {
  const step = Number(params.step);
  if (!Number.isInteger(step) || step < 1 || step > TOTAL_STEPS) {
    notFound();
  }
  return (
    <MinoxShell>
      <Suspense>
        <QuestionStep step={step} />
      </Suspense>
    </MinoxShell>
  );
}
