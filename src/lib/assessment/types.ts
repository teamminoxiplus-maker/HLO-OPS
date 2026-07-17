// Types for the MINOXIPLUS free hair loss assessment (spec §8–§11).
// The answer value strings are the STORED contract — they land in the
// `answers` jsonb column and CSV exports, so never rename them casually.

export type Sex = "male" | "female";

export type AgeBand =
  | "below_18"
  | "18_24"
  | "25_34"
  | "35_44"
  | "45_54"
  | "55_plus";

export type Duration = "lt_6m" | "6_12m" | "1_3y" | "gt_3y";

export type Pattern =
  | "receding" // paurong ang noo
  | "crown" // bald spot sa gitna
  | "widening_part" // lumalapad ang hati
  | "diffuse" // buong ulo, pantay
  | "patchy" // bilog-bilog na spots
  | "edges"; // gilid — hinihila ng ponytail

export type Shedding = "normal" | "noticeable" | "clumps";

export type ScalpFlag = "dandruff" | "itchy" | "oily" | "wound" | "normal";

export type FamilyHistory = "yes" | "no" | "unknown";

export type Trigger =
  | "postpartum"
  | "stress"
  | "illness"
  | "crash_diet"
  | "surgery"
  | "none";

export type Styling = "daily" | "sometimes" | "no";

export type Tried =
  | "minoxidil"
  | "finasteride"
  | "anti_dandruff"
  | "supplements"
  | "hair_spa"
  | "none";

export type MedicalFlag =
  | "pregnant"
  | "planning_pregnancy"
  | "heart_bp"
  | "minoxidil_allergy"
  | "scalp_wound"
  | "none";

export type Goal = "stop_shedding" | "regrow" | "thicken" | "fix_dandruff";

// A fully answered assessment. Single-select questions are one string;
// multi-select questions are string arrays.
export interface Answers {
  sex: Sex;
  age_band: AgeBand;
  duration: Duration;
  pattern: Pattern;
  shedding: Shedding;
  scalp: ScalpFlag[];
  family_history: FamilyHistory;
  triggers: Trigger[];
  styling: Styling;
  tried: Tried[];
  medical_flags: MedicalFlag[];
  goal: Goal;
}

// Partial answers, as they exist mid-flow (autosave drafts).
export type PartialAnswers = Partial<Answers>;

export type Concern =
  | "AGA_MALE"
  | "AGA_FEMALE"
  | "TELOGEN_EFFLUVIUM"
  | "SEB_DERM"
  | "TRACTION"
  | "MIXED"
  | "REFER_PATCHY"
  | "REFER_SCALP"
  | "INCONCLUSIVE";

export type Severity = "Early" | "Moderate" | "Advanced";

// Safety / routing flags surfaced to the result page and admin.
export type EngineFlag =
  | "NEEDS_DOC_CLEARANCE"
  | "UNDER_18"
  | "PREGNANCY"
  | "MINOXIDIL_ALLERGY"
  | "SCALP_CONDITION"
  | "MEN_ONLY_FILTERED";

export type ProductId =
  | "signature_hair_grower"
  | "tri_active"
  | "keto_shampoo"
  | "hair_supplement"
  | "scalp_massager"
  | "derma_stamp";

export interface EngineResult {
  concern: Concern;
  severity: Severity;
  flags: EngineFlag[];
  recommended_products: ProductId[];
  referral_required: boolean;
}

// A stored assessment row (subset used by the admin dashboard, spec §12).
export interface AssessmentRow {
  id: string;
  session_id: string;
  result_token: string | null;
  status: "draft" | "completed";
  created_at: string;
  completed_at: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  consent_privacy: boolean;
  consent_marketing: boolean;
  answers: Partial<Answers>;
  concern: Concern | null;
  severity: Severity | null;
  flags: EngineFlag[];
  recommended_products: ProductId[];
  referral_required: boolean;
  src: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  device_type: string | null;
  contacted: boolean;
  contacted_at: string | null;
  notes: string | null;
}
