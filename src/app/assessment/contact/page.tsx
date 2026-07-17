import { Suspense } from "react";
import { MinoxShell } from "@/components/assessment/minox-brand";
import { ContactForm } from "@/components/assessment/contact-form";

// Screen 13 — contact gate (spec §7).
export default function ContactPage() {
  return (
    <MinoxShell>
      <Suspense>
        <ContactForm />
      </Suspense>
    </MinoxShell>
  );
}
