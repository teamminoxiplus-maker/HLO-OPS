// Zod schemas shared by client and server (spec §5). The answers schema is the
// single validation source for drafts, submits, and the engine input.
import { z } from "zod";

export const answersSchema = z.object({
  sex: z.enum(["male", "female"]),
  age_band: z.enum(["below_18", "18_24", "25_34", "35_44", "45_54", "55_plus"]),
  duration: z.enum(["lt_6m", "6_12m", "1_3y", "gt_3y"]),
  pattern: z.enum([
    "receding",
    "crown",
    "widening_part",
    "diffuse",
    "patchy",
    "edges",
  ]),
  shedding: z.enum(["normal", "noticeable", "clumps"]),
  scalp: z.array(z.enum(["dandruff", "itchy", "oily", "wound", "normal"])).min(1),
  family_history: z.enum(["yes", "no", "unknown"]),
  triggers: z
    .array(
      z.enum(["postpartum", "stress", "illness", "crash_diet", "surgery", "none"]),
    )
    .min(1),
  styling: z.enum(["daily", "sometimes", "no"]),
  tried: z
    .array(
      z.enum([
        "minoxidil",
        "finasteride",
        "anti_dandruff",
        "supplements",
        "hair_spa",
        "none",
      ]),
    )
    .min(1),
  medical_flags: z
    .array(
      z.enum([
        "pregnant",
        "planning_pregnancy",
        "heart_bp",
        "minoxidil_allergy",
        "scalp_wound",
        "none",
      ]),
    )
    .min(1),
  goal: z.enum(["stop_shedding", "regrow", "thicken", "fix_dandruff"]),
});

// Drafts may be partial — every field optional.
export const partialAnswersSchema = answersSchema.partial();

// PH mobile: accepts 09XXXXXXXXX, +639XXXXXXXXX, 639XXXXXXXXX (spec §14).
const phoneRegex = /^(?:\+?63|0)9\d{9}$/;

export const contactSchema = z.object({
  full_name: z.string().trim().min(2, "Pakilagay ang buong pangalan.").max(120),
  email: z.string().trim().toLowerCase().email("Hindi wastong email."),
  phone: z
    .string()
    .trim()
    .refine((v) => phoneRegex.test(v.replace(/[\s-]/g, "")), {
      message: "Gumamit ng wastong PH mobile number (09XXXXXXXXX).",
    }),
  consent_privacy: z.literal(true, {
    errorMap: () => ({ message: "Kailangan ang pahintulot para magpatuloy." }),
  }),
  consent_marketing: z.boolean().optional().default(false),
});

// Full submit payload posted to /api/assessment/submit.
export const submitSchema = z.object({
  session_id: z.string().uuid(),
  answers: answersSchema,
  contact: contactSchema,
  // attribution (spec §6) — all optional, captured best-effort
  src: z.string().max(120).optional(),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  referrer: z.string().max(500).optional(),
  // Honeypot field (spec §14). Accept any value here — the submit route checks
  // it and silently drops bots with a fake success, never signalling detection.
  company: z.string().max(200).optional().default(""),
});

export const draftSchema = z.object({
  session_id: z.string().uuid(),
  answers: partialAnswersSchema,
  step: z.string().max(20).optional(),
  src: z.string().max(120).optional(),
  utm_source: z.string().max(120).optional(),
  utm_medium: z.string().max(120).optional(),
  utm_campaign: z.string().max(120).optional(),
  referrer: z.string().max(500).optional(),
});

// Funnel event beacon (spec §11 assessment_events).
export const eventSchema = z.object({
  session_id: z.string().uuid(),
  step: z.string().max(20),
  event: z.enum(["view", "answer", "abandon"]),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type SubmitInput = z.infer<typeof submitSchema>;
export type DraftInput = z.infer<typeof draftSchema>;
