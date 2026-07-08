// Shared enums + row types mirroring the Supabase schema.

export type UserRole = "admin" | "member";
export type Department =
  | "marketing"
  | "production"
  | "fulfillment"
  | "accounting"
  | "management";

export type BrandLine = "minoxiplus" | "pet_care" | "home_care";

export type ContentPlatform = "facebook" | "tiktok";

export type ContentType =
  | "reel"
  | "image_post"
  | "carousel"
  | "live"
  | "email_blast"
  | "product_listing"
  | "voucher_promo"
  | "other";

export type ContentStatus =
  | "idea"
  | "drafting"
  | "for_review"
  | "approved"
  | "scheduled"
  | "published";

export type CampaignStatus = "planning" | "live" | "ended";

export type SopCategory =
  | "formulation"
  | "sample_making"
  | "packaging"
  | "qa"
  | "other";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "pending" | "in_progress" | "done";

export type OrderChannel = "website" | "other";

export type PaymentStatus = "paid" | "partial" | "unpaid";

export type OrderStatus =
  | "pending"
  | "in_production"
  | "ready_to_ship"
  | "delivered"
  | "cancelled";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand_line: BrandLine;
  sku: string | null;
  active: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: CampaignStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ContentItem {
  id: string;
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
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
  sales_attributed: number | null;
  performance_notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Sop {
  id: string;
  title: string;
  category: SopCategory;
  body: string;
  version: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionTask {
  id: string;
  title: string;
  description: string | null;
  related_sop_id: string | null;
  assigned_to: string | null;
  deadline: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  blocked_reason: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface Order {
  id: string;
  order_ref: string;
  customer_name: string;
  channel: OrderChannel;
  order_date: string;
  target_completion_date: string | null;
  payment_status: PaymentStatus;
  amount_total: number;
  amount_paid: number;
  assigned_to: string | null;
  status: OrderStatus;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

// Order row joined with computed days_pending + assignee name (from the view).
export interface OrderWithComputed extends Order {
  days_pending: number | null;
  assignee_name: string | null;
}

export interface OrderLine {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string | null;
  quantity: number;
  unit_price: number;
}

export interface ImportMapping {
  id: string;
  channel: OrderChannel;
  mapping: Record<string, string>;
  updated_at: string;
  updated_by: string | null;
}

export interface DaysPendingThresholds {
  green: number;
  yellow: number;
}

export type SubscriberStatus = "subscribed" | "unsubscribed";

export interface EmailSubscriber {
  id: string;
  email: string;
  name: string | null;
  status: SubscriberStatus;
  source: string | null;
  groups: string[];
  unsubscribe_token: string;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  subject: string;
  body: string;
  from_label: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: "sent" | "partial" | "failed";
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
}
