import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ImportWizard } from "./import-wizard";
import type { ImportMapping } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const supabase = createClient();
  const { data } = await supabase.from("import_mappings").select("*");

  const saved: Record<string, Record<string, string>> = {};
  (data as ImportMapping[] | null)?.forEach((m) => {
    saved[m.channel] = m.mapping;
  });

  return (
    <div className="space-y-4">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Import orders (CSV)</h1>
        <p className="text-sm text-muted-foreground">
          Upload a Seller Center order export. Map columns once per channel —
          the mapping is saved for next time. Re-importing updates existing
          orders (deduped on channel + order ref) instead of creating
          duplicates.
        </p>
      </div>
      <ImportWizard savedMappings={saved} />
    </div>
  );
}
