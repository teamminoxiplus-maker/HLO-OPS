"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CAMPAIGN_STATUSES, labelize } from "@/lib/constants";
import { saveCampaign } from "../actions";
import type { Campaign, CampaignStatus } from "@/lib/types";

export function CampaignModalTrigger({ campaign }: { campaign: Campaign | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(campaign?.name ?? "");
  const [startDate, setStartDate] = useState(campaign?.start_date ?? "");
  const [endDate, setEndDate] = useState(campaign?.end_date ?? "");
  const [status, setStatus] = useState<CampaignStatus>(
    campaign?.status ?? "planning",
  );
  const [notes, setNotes] = useState(campaign?.notes ?? "");

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    start(async () => {
      const res = await saveCampaign(campaign?.id ?? null, {
        name,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        notes: notes || null,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant={campaign ? "outline" : "default"}
        onClick={() => setOpen(true)}
      >
        {campaign ? (
          <>
            <Pencil className="h-4 w-4" /> Edit
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" /> New campaign
          </>
        )}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={campaign ? "Edit campaign" : "New campaign"}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="7.7 Shopee Mega Sale"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as CampaignStatus)}
            >
              {CAMPAIGN_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes (promo mechanics, voucher codes)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
