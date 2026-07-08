import type {
  BrandLine,
  ContentPlatform,
  ContentStatus,
  ContentType,
  Department,
  OrderChannel,
  OrderStatus,
  PaymentStatus,
  SopCategory,
  TaskPriority,
  TaskStatus,
  CampaignStatus,
} from "./types";

export function labelize<T extends string>(v: T): string {
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---- Option lists (value + label) for selects ----
export const BRAND_LINES: BrandLine[] = ["minoxiplus", "pet_care", "home_care"];

export const DEPARTMENTS: Department[] = [
  "marketing",
  "production",
  "fulfillment",
  "accounting",
  "management",
];

// Orders are website-only (minoxiplus.com); "other" is a catch-all for the
// occasional phone / Viber / walk-in order.
export const ORDER_CHANNELS: OrderChannel[] = ["website", "other"];

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "in_production",
  "ready_to_ship",
  "delivered",
  "cancelled",
];

export const PAYMENT_STATUSES: PaymentStatus[] = ["paid", "partial", "unpaid"];

export const CONTENT_PLATFORMS: ContentPlatform[] = ["facebook", "tiktok"];

export const CONTENT_TYPES: ContentType[] = [
  "reel",
  "image_post",
  "carousel",
  "live",
  "email_blast",
  "product_listing",
  "voucher_promo",
  "other",
];

export const CONTENT_STATUSES: ContentStatus[] = [
  "idea",
  "drafting",
  "for_review",
  "approved",
  "scheduled",
  "published",
];

export const CAMPAIGN_STATUSES: CampaignStatus[] = ["planning", "live", "ended"];

export const SOP_CATEGORIES: SopCategory[] = [
  "formulation",
  "sample_making",
  "packaging",
  "qa",
  "other",
];

export const TASK_PRIORITIES: TaskPriority[] = ["low", "medium", "high", "urgent"];
export const TASK_STATUSES: TaskStatus[] = ["pending", "in_progress", "done"];

// ---- Badge color classes (Tailwind) keyed by enum value ----
export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  in_production: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  ready_to_ship:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  delivered:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  unpaid: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  urgent: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export const CONTENT_STATUS_COLORS: Record<ContentStatus, string> = {
  idea: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  drafting: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  for_review: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  published:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

// Calendar color-coding by platform (spec §4.1).
export const PLATFORM_COLORS: Record<ContentPlatform, string> = {
  facebook: "bg-blue-600",
  tiktok: "bg-slate-800",
};

export const BRAND_LINE_COLORS: Record<BrandLine, string> = {
  minoxiplus: "bg-emerald-500",
  pet_care: "bg-amber-500",
  home_care: "bg-violet-500",
};
