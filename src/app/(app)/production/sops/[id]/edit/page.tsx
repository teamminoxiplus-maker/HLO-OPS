import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SopEditor } from "../../sop-editor";
import type { Sop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditSopPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("sops")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!data) notFound();
  return <SopEditor sop={data as Sop} />;
}
