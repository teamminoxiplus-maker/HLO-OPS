"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  labelize,
} from "@/lib/constants";
import { createTask, updateTask } from "./actions";
import type {
  ProductionTask,
  Sop,
  TaskPriority,
  TaskStatus,
  UserProfile,
} from "@/lib/types";

type SopLite = Pick<Sop, "id" | "title" | "category">;

export function TaskModal({
  open,
  onClose,
  task,
  users,
  sops,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  task: ProductionTask | null;
  users: UserProfile[];
  sops: SopLite[];
  onDeleted: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [sopId, setSopId] = useState("");
  const [blocked, setBlocked] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setAssignedTo(task?.assigned_to ?? "");
    setDeadline(task?.deadline ?? "");
    setPriority(task?.priority ?? "medium");
    setStatus(task?.status ?? "pending");
    setSopId(task?.related_sop_id ?? "");
    setBlocked(task?.blocked_reason ?? "");
  }, [open, task]);

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (status !== "pending" && !assignedTo) {
      setError("Assign someone before setting this task past Pending.");
      return;
    }
    const payload = {
      title,
      description: description || null,
      related_sop_id: sopId || null,
      assigned_to: assignedTo || null,
      deadline: deadline || null,
      priority,
      status,
      blocked_reason: blocked || null,
    };
    start(async () => {
      const res = task
        ? await updateTask(task.id, payload)
        : await createTask(payload);
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
      title={task ? "Edit task" : "New task"}
      className="max-w-lg"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
            <Label>Deadline</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {labelize(p)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {labelize(s)}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Related SOP</Label>
          <Select value={sopId} onChange={(e) => setSopId(e.target.value)}>
            <option value="">None</option>
            {sops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Blocked reason (optional)</Label>
          <Input
            value={blocked}
            onChange={(e) => setBlocked(e.target.value)}
            placeholder="e.g. waiting for sample approval"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between border-t pt-3">
          {task ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={onDeleted}
              disabled={pending}
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
              {pending ? "Saving…" : task ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
