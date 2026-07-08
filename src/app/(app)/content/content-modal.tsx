"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload, FileCheck2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  labelize,
} from "@/lib/constants";
import { createContent, updateContent, deleteContent } from "./actions";
import type {
  Campaign,
  ContentItem,
  ContentPlatform,
  ContentStatus,
  ContentType,
  Product,
  UserProfile,
} from "@/lib/types";

export function ContentModal({
  open,
  onClose,
  item,
  products,
  campaigns,
  users,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  item: ContentItem | null;
  products: Product[];
  campaigns: Pick<Campaign, "id" | "name">[];
  users: UserProfile[];
  defaultDate?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("tiktok");
  const [ctype, setCtype] = useState<ContentType>("reel");
  const [status, setStatus] = useState<ContentStatus>("idea");
  const [publishDate, setPublishDate] = useState("");
  const [productId, setProductId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [asset, setAsset] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError("File is too large (max 25 MB).");
      return;
    }
    setError(null);
    setUploading(true);
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage
      .from("content-assets")
      .upload(path, file, { upsert: false });
    if (upErr) {
      setError(`Upload failed: ${upErr.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("content-assets").getPublicUrl(path);
    setAsset(data.publicUrl);
    setUploading(false);
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(item?.title ?? "");
    setPlatform(item?.platform ?? "tiktok");
    setCtype(item?.content_type ?? "reel");
    setStatus(item?.status ?? "idea");
    setPublishDate(item?.publish_date ?? defaultDate ?? "");
    setProductId(item?.product_id ?? "");
    setCampaignId(item?.campaign_id ?? "");
    setAssignedTo(item?.assigned_to ?? "");
    setNotes(item?.caption_or_notes ?? "");
    setAsset(item?.asset_link ?? "");
  }, [open, item, defaultDate]);

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const payload = {
      title,
      platform,
      content_type: ctype,
      status,
      publish_date: publishDate || null,
      product_id: productId || null,
      campaign_id: campaignId || null,
      assigned_to: assignedTo || null,
      caption_or_notes: notes || null,
      asset_link: asset || null,
    };
    start(async () => {
      const res = item
        ? await updateContent(item.id, payload)
        : await createContent(payload);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={item ? "Edit content" : "New content"}
      className="max-w-xl"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Platform</Label>
            <Select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as ContentPlatform)}
            >
              {CONTENT_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {labelize(p)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={ctype}
              onChange={(e) => setCtype(e.target.value as ContentType)}
            >
              {CONTENT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {labelize(c)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContentStatus)}
            >
              {CONTENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Publish date</Label>
            <Input
              type="date"
              value={publishDate}
              onChange={(e) => setPublishDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Product</Label>
            <Select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Brand-level / none</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Campaign</Label>
            <Select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">None</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Assignee</Label>
            <Select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Asset (upload or link)</Label>
            <div className="flex gap-2">
              <Input
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                placeholder="Upload a file or paste a Drive / Canva URL"
              />
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={onUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={uploading}
                title="Upload a file"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {uploading && (
              <p className="text-xs text-muted-foreground">Uploading…</p>
            )}
            {!uploading && asset && (
              <a
                href={asset}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <FileCheck2 className="h-3 w-3" /> View attached file
              </a>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label>Caption / notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Taglish ok…"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between border-t pt-3">
          {item ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteContent(item.id);
                  onClose();
                  router.refresh();
                })
              }
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Saving…" : item ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
