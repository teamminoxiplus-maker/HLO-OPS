import Link from "next/link";
import { Search, Package, ClipboardList, FileText, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { OrderStatusBadge, ContentStatusBadge } from "@/components/badges";
import { labelize } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { ContentItem, Order, ProductionTask, Sop } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const supabase = createClient();

  let orders: Order[] = [];
  let tasks: ProductionTask[] = [];
  let sops: Sop[] = [];
  let content: ContentItem[] = [];

  if (q) {
    const safe = q.replace(/[%,]/g, " ");
    const [o, t, s, c] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .or(`customer_name.ilike.%${safe}%,order_ref.ilike.%${safe}%,notes.ilike.%${safe}%`)
        .limit(20),
      supabase
        .from("production_tasks")
        .select("*")
        .or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
        .limit(20),
      supabase
        .from("sops")
        .select("*")
        .or(`title.ilike.%${safe}%,body.ilike.%${safe}%`)
        .limit(20),
      supabase
        .from("content_items")
        .select("*")
        .or(`title.ilike.%${safe}%,caption_or_notes.ilike.%${safe}%`)
        .limit(20),
    ]);
    orders = (o.data as Order[]) ?? [];
    tasks = (t.data as ProductionTask[]) ?? [];
    sops = (s.data as Sop[]) ?? [];
    content = (c.data as ContentItem[]) ?? [];
  }

  const totalResults = orders.length + tasks.length + sops.length + content.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-sm text-muted-foreground">
          Orders, tasks, SOPs, and content — all in one place.
        </p>
      </div>

      <form action="/search" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search customer, order ref, task, SOP, content…"
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
          />
        </div>
        <button type="submit" className={buttonVariants({ size: "sm" })}>
          Search
        </button>
      </form>

      {q && (
        <p className="text-sm text-muted-foreground">
          {totalResults} result{totalResults === 1 ? "" : "s"} for “{q}”
        </p>
      )}

      {orders.length > 0 && (
        <Group icon={Package} title="Orders">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:border-primary/50"
            >
              <span>
                <span className="font-medium">{o.order_ref}</span>
                <span className="text-muted-foreground"> · {o.customer_name || "—"}</span>
              </span>
              <OrderStatusBadge status={o.status} />
            </Link>
          ))}
        </Group>
      )}

      {tasks.length > 0 && (
        <Group icon={ClipboardList} title="Production tasks">
          {tasks.map((t) => (
            <Link
              key={t.id}
              href="/production"
              className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:border-primary/50"
            >
              <span className="font-medium">{t.title}</span>
              <span className="text-xs text-muted-foreground">
                {labelize(t.status)}
              </span>
            </Link>
          ))}
        </Group>
      )}

      {sops.length > 0 && (
        <Group icon={FileText} title="SOPs">
          {sops.map((s) => (
            <Link
              key={s.id}
              href={`/production/sops/${s.id}`}
              className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:border-primary/50"
            >
              <span className="font-medium">{s.title}</span>
              <span className="text-xs text-muted-foreground">
                {labelize(s.category)} · v{s.version}
              </span>
            </Link>
          ))}
        </Group>
      )}

      {content.length > 0 && (
        <Group icon={Megaphone} title="Content">
          {content.map((it) => (
            <Link
              key={it.id}
              href="/content/list"
              className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm hover:border-primary/50"
            >
              <span>
                <span className="font-medium">{it.title}</span>
                <span className="text-muted-foreground">
                  {" "}· {labelize(it.platform)} · {formatDate(it.publish_date)}
                </span>
              </span>
              <ContentStatusBadge status={it.status} />
            </Link>
          ))}
        </Group>
      )}

      {q && totalResults === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No results found.
        </p>
      )}
    </div>
  );
}

function Group({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </h2>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
