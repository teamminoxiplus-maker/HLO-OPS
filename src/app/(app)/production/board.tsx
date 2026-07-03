"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Ban, CalendarClock, User2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/badges";
import { cn, formatDate, todayManila } from "@/lib/utils";
import { labelize } from "@/lib/constants";
import { moveTask, deleteTask } from "./actions";
import { TaskModal } from "./task-modal";
import type {
  ProductionTask,
  Sop,
  TaskStatus,
  UserProfile,
} from "@/lib/types";

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

type SopLite = Pick<Sop, "id" | "title" | "category">;

export function TaskBoard({
  tasks,
  users,
  sops,
  currentUserId,
}: {
  tasks: ProductionTask[];
  users: UserProfile[];
  sops: SopLite[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mineOnly, setMineOnly] = useState(false);
  const [modalTask, setModalTask] = useState<ProductionTask | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  const userName = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.name])),
    [users],
  );

  const visible = mineOnly
    ? tasks.filter((t) => t.assigned_to === currentUserId)
    : tasks;

  function onDrop(status: TaskStatus) {
    if (!dragId) return;
    const task = tasks.find((t) => t.id === dragId);
    setDragId(null);
    if (!task || task.status === status) return;
    startTransition(async () => {
      const res = await moveTask(task.id, status, task.assigned_to);
      if (res?.error) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  function openNew() {
    setModalTask(null);
    setModalOpen(true);
  }
  function openEdit(t: ProductionTask) {
    setModalTask(t);
    setModalOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(e) => setMineOnly(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          My tasks only
        </label>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTasks = visible.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.key)}
              className="flex flex-col rounded-lg border bg-muted/30"
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="rounded-full bg-background px-2 text-xs text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {colTasks.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    Drop tasks here
                  </p>
                )}
                {colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    assigneeName={t.assigned_to ? userName[t.assigned_to] : null}
                    sopTitle={sops.find((s) => s.id === t.related_sop_id)?.title}
                    onDragStart={() => setDragId(t.id)}
                    onClick={() => openEdit(t)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        task={modalTask}
        users={users}
        sops={sops}
        onDeleted={() =>
          modalTask &&
          startTransition(async () => {
            await deleteTask(modalTask.id);
            setModalOpen(false);
            router.refresh();
          })
        }
      />
    </div>
  );
}

function TaskCard({
  task,
  assigneeName,
  sopTitle,
  onDragStart,
  onClick,
}: {
  task: ProductionTask;
  assigneeName: string | null;
  sopTitle?: string;
  onDragStart: () => void;
  onClick: () => void;
}) {
  const overdue =
    task.deadline && task.status !== "done" && task.deadline < todayManila();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-pointer rounded-md border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <span className="font-medium leading-tight">{task.title}</span>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.blocked_reason && (
        <div className="mb-1.5 flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          <Ban className="h-3 w-3 shrink-0" /> {task.blocked_reason}
        </div>
      )}

      {sopTitle && (
        <div className="mb-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" /> {sopTitle}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {assigneeName ? (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {assigneeName.slice(0, 2).toUpperCase()}
              </span>
              {assigneeName.split(" ")[0]}
            </>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <User2 className="h-3 w-3" /> Unassigned
            </span>
          )}
        </span>
        {task.deadline && (
          <span
            className={cn(
              "flex items-center gap-1",
              overdue && "font-medium text-rose-600",
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {formatDate(task.deadline)}
          </span>
        )}
      </div>
    </div>
  );
}
