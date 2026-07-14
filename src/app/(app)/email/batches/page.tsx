import { createClient } from "@/lib/supabase/server";
import { SectionTabs } from "@/components/section-tabs";
import { BatchesClient } from "./batches-client";
import type { EmailSubscriber } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { href: "/email", label: "Subscribers" },
  { href: "/email/batches", label: "Batches" },
  { href: "/email/compose", label: "Compose & Send" },
];

// Starter columns. Any other groups found in the data are added automatically.
const DEFAULT_BATCHES = ["buyer a", "buyer b", "buyer c", "buyer d"];

type Contact = Pick<EmailSubscriber, "id" | "email" | "name" | "groups">;

export default async function BatchesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("email_subscribers")
    .select("id, email, name, groups")
    .eq("status", "subscribed")
    .order("created_at", { ascending: false })
    .limit(10000);

  const contacts = (data as Contact[]) ?? [];

  // Column order: the 4 defaults first, then any extra groups (sorted).
  const extra = new Set<string>();
  for (const c of contacts)
    for (const g of c.groups ?? [])
      if (!DEFAULT_BATCHES.includes(g)) extra.add(g);
  const batches = [...DEFAULT_BATCHES, ...Array.from(extra).sort()];

  const columns = batches.map((b) => ({
    group: b,
    contacts: contacts.filter((c) => (c.groups ?? []).includes(b)),
  }));

  const ungrouped = contacts.filter((c) => (c.groups ?? []).length === 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Email Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Sort your contacts into batches, then send each batch its own email.
        </p>
      </div>

      <SectionTabs tabs={TABS} />

      <BatchesClient columns={columns} ungrouped={ungrouped} />
    </div>
  );
}
