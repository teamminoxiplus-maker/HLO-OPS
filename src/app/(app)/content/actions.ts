"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ContentPlatform,
  ContentStatus,
  ContentType,
  CampaignStatus,
} from "@/lib/types";

async function currentUserId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export interface ContentInput {
  title: string;
  product_id: string | null;
  campaign_id: string | null;
  platform: ContentPlatform;
  content_type: ContentType;
  status: ContentStatus;
  publish_date: string | null;
  assigned_to: string | null;
  caption_or_notes: string | null;
  asset_link: string | null;
}

export async function createContent(input: ContentInput) {
  const supabase = createClient();
  const uid = await currentUserId();
  const { error } = await supabase
    .from("content_items")
    .insert({ ...input, title: input.title.trim(), updated_by: uid });
  if (error) return { error: error.message };
  revalidatePath("/content");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateContent(
  id: string,
  input: Partial<ContentInput>,
) {
  const supabase = createClient();
  const uid = await currentUserId();
  const { error } = await supabase
    .from("content_items")
    .update({ ...input, updated_by: uid })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/content");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateContentStatus(id: string, status: ContentStatus) {
  return updateContent(id, { status });
}

export async function deleteContent(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/content");
  return { ok: true };
}

export interface MetricsInput {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  sales_attributed: number | null;
  performance_notes: string | null;
}

export async function updateMetrics(id: string, metrics: MetricsInput) {
  const supabase = createClient();
  const uid = await currentUserId();
  const { error } = await supabase
    .from("content_items")
    .update({ ...metrics, updated_by: uid })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/content/performance");
  return { ok: true };
}

// ---------------- Campaigns ----------------
export interface CampaignInput {
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: CampaignStatus;
  notes: string | null;
}

export async function saveCampaign(id: string | null, input: CampaignInput) {
  const supabase = createClient();
  const uid = await currentUserId();
  if (id) {
    const { error } = await supabase
      .from("campaigns")
      .update({ ...input, updated_by: uid })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("campaigns")
      .insert({ ...input, name: input.name.trim(), updated_by: uid });
    if (error) return { error: error.message };
  }
  revalidatePath("/content/campaigns");
  return { ok: true };
}
