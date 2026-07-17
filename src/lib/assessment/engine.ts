// Classification + recommendation engine (spec §9). Pure, deterministic, no LLM,
// no I/O — every branch is unit-tested in engine.test.ts. The pipeline is:
//   classify(answers) -> severity(answers) -> mapProducts(...) -> applySafetyGates(...)
// Safety gates run LAST and can only REMOVE or DOWNGRADE recommendations.
import { PRODUCTS } from "./products";
import type {
  Answers,
  Concern,
  EngineFlag,
  EngineResult,
  ProductId,
  Severity,
} from "./types";

const AGA_MALE_PATTERNS = new Set(["receding", "crown"]);
const AGA_FEMALE_PATTERNS = new Set(["widening_part", "crown"]);
const AGA_PATTERNS = new Set(["receding", "crown", "widening_part"]);
const SCALP_IRRITATION = new Set(["dandruff", "itchy", "oily"]);
const TE_TRIGGERS = new Set([
  "postpartum",
  "stress",
  "illness",
  "crash_diet",
  "surgery",
]);

function hasAny<T>(arr: T[] | undefined, set: Set<T>): boolean {
  return !!arr && arr.some((v) => set.has(v));
}

// ---------------------------------------------------------------------------
// §9.1 Concern classification — first match wins.
// NOTE: MIXED (AGA pattern + scalp irritation) is evaluated BEFORE plain AGA.
// The spec lists it after, but "first match wins" would make it unreachable —
// treating both concerns is the more specific, correct outcome, so it wins.
// ---------------------------------------------------------------------------
export function classify(a: Answers): Concern {
  // 1. Patchy spots → possible alopecia areata. Refer, no product push.
  if (a.pattern === "patchy") return "REFER_PATCHY";

  // 2. Open scalp wound / skin condition → treat scalp first, refer.
  if (a.medical_flags.includes("scalp_wound")) return "REFER_SCALP";

  // 3. Traction — edge loss from tight styling.
  if (a.pattern === "edges" && (a.styling === "daily" || a.styling === "sometimes")) {
    return "TRACTION";
  }

  // 4. Telogen effluvium — diffuse shed after a recent trigger, ≤12 months.
  if (
    a.pattern === "diffuse" &&
    hasAny(a.triggers, TE_TRIGGERS) &&
    (a.duration === "lt_6m" || a.duration === "6_12m")
  ) {
    return "TELOGEN_EFFLUVIUM";
  }

  const scalpFlags = hasAny(a.scalp, SCALP_IRRITATION);

  // MIXED — an AGA pattern together with scalp irritation → treat both.
  if (AGA_PATTERNS.has(a.pattern) && scalpFlags) return "MIXED";

  // 5. Seborrheic dermatitis — irritation-driven shed, non-AGA pattern.
  if (scalpFlags && a.pattern === "diffuse") return "SEB_DERM";

  // 6. Male pattern (androgenetic).
  if (a.sex === "male" && AGA_MALE_PATTERNS.has(a.pattern)) return "AGA_MALE";

  // 7. Female pattern.
  if (a.sex === "female" && AGA_FEMALE_PATTERNS.has(a.pattern)) return "AGA_FEMALE";

  // 9. Fallback.
  return "INCONCLUSIVE";
}

// ---------------------------------------------------------------------------
// §9.2 Severity score
// ---------------------------------------------------------------------------
const DURATION_SCORE: Record<Answers["duration"], number> = {
  lt_6m: 0,
  "6_12m": 1,
  "1_3y": 2,
  gt_3y: 3,
};
const SHEDDING_SCORE: Record<Answers["shedding"], number> = {
  normal: 0,
  noticeable: 1,
  clumps: 2,
};
// Pattern intensity — how established the visible loss reads (0–2).
const PATTERN_INTENSITY: Record<Answers["pattern"], number> = {
  receding: 1,
  crown: 2,
  widening_part: 1,
  diffuse: 1,
  patchy: 2,
  edges: 1,
};

export function severityScore(a: Answers): number {
  return (
    DURATION_SCORE[a.duration] +
    SHEDDING_SCORE[a.shedding] +
    PATTERN_INTENSITY[a.pattern] +
    (a.family_history === "yes" ? 1 : 0)
  );
}

export function severity(a: Answers): Severity {
  const s = severityScore(a);
  if (s <= 2) return "Early";
  if (s <= 5) return "Moderate";
  return "Advanced";
}

// ---------------------------------------------------------------------------
// §9.3 Product mapping — pre-safety recommendation.
// ---------------------------------------------------------------------------
export function mapProducts(
  concern: Concern,
  sev: Severity,
  a: Answers,
): ProductId[] {
  const advanced = sev === "Moderate" || sev === "Advanced";
  switch (concern) {
    case "AGA_MALE":
      return advanced
        ? ["tri_active", "hair_supplement", "derma_stamp"]
        : ["signature_hair_grower", "scalp_massager"];
    case "AGA_FEMALE":
      return advanced
        ? ["signature_hair_grower", "hair_supplement", "derma_stamp"]
        : ["signature_hair_grower", "hair_supplement"];
    case "TELOGEN_EFFLUVIUM": {
      const base: ProductId[] = ["hair_supplement", "scalp_massager"];
      // + Signature if duration > 6 months.
      if (a.duration !== "lt_6m") base.push("signature_hair_grower");
      return base;
    }
    case "SEB_DERM": {
      const base: ProductId[] = ["keto_shampoo"];
      // + Signature if also thinning.
      if (a.shedding !== "normal") base.push("signature_hair_grower");
      return base;
    }
    case "TRACTION":
      return ["signature_hair_grower", "scalp_massager"];
    case "MIXED":
      return ["keto_shampoo", "signature_hair_grower"];
    case "REFER_PATCHY":
    case "REFER_SCALP":
    case "INCONCLUSIVE":
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// §9.4 Safety gates — NON-NEGOTIABLE. Runs after mapping. Only removes or
// downgrades. If everything is stripped, returns a REFER route.
// ---------------------------------------------------------------------------
export function applySafetyGates(
  products: ProductId[],
  a: Answers,
): { products: ProductId[]; flags: EngineFlag[]; referral: boolean } {
  const flags = new Set<EngineFlag>();
  let list = [...products];

  const remove = (pred: (id: ProductId) => boolean) => {
    list = list.filter((id) => !pred(id));
  };

  const isMale = a.sex === "male";
  const under18 = a.age_band === "below_18";
  const pregnancy =
    a.medical_flags.includes("pregnant") ||
    a.medical_flags.includes("planning_pregnancy");
  const heartBp = a.medical_flags.includes("heart_bp");
  const minoxAllergy = a.medical_flags.includes("minoxidil_allergy");
  const scalpCondition = a.medical_flags.includes("scalp_wound");

  // 1. Tri Active is MEN ONLY — hard filter, always.
  if (!isMale && list.includes("tri_active")) flags.add("MEN_ONLY_FILTERED");
  if (!isMale) remove((id) => PRODUCTS[id].menOnly);

  // 2. Under 18 → no Minoxidil / Finasteride / Tri Active. Consult only.
  if (under18) {
    flags.add("UNDER_18");
    remove((id) => PRODUCTS[id].containsMinoxidil || PRODUCTS[id].containsFinasteride);
  }

  // 3. Pregnant / breastfeeding / planning → no Minoxidil, Tri Active, supplements.
  if (pregnancy) {
    flags.add("PREGNANCY");
    remove(
      (id) =>
        PRODUCTS[id].containsMinoxidil ||
        PRODUCTS[id].containsFinasteride ||
        PRODUCTS[id].supplement,
    );
  }

  // 4. Heart / BP → Minoxidil allowed but flag for doctor clearance.
  if (heartBp && list.some((id) => PRODUCTS[id].containsMinoxidil)) {
    flags.add("NEEDS_DOC_CLEARANCE");
  }

  // 5. Allergy to Minoxidil → remove all Minoxidil-containing products.
  if (minoxAllergy) {
    flags.add("MINOXIDIL_ALLERGY");
    remove((id) => PRODUCTS[id].containsMinoxidil);
  }

  // 6. Scalp wound / skin condition → suppress topicals, refer.
  if (scalpCondition) {
    flags.add("SCALP_CONDITION");
    remove((id) => PRODUCTS[id].topical);
  }

  // Under-18 and pregnancy are consult-only routes regardless of leftovers.
  const consultOnly = under18 || pregnancy || scalpCondition;

  // 7. If gates strip everything (or a consult-only route), refer.
  if (list.length === 0 || consultOnly) {
    return {
      products: consultOnly ? [] : list,
      flags: Array.from(flags),
      referral: true,
    };
  }

  return { products: list, flags: Array.from(flags), referral: false };
}

// ---------------------------------------------------------------------------
// Top-level entry — classify → severity → map → gate.
// ---------------------------------------------------------------------------
export function runEngine(a: Answers): EngineResult {
  const concern = classify(a);
  const sev = severity(a);
  const mapped = mapProducts(concern, sev, a);
  const gated = applySafetyGates(mapped, a);

  const isReferConcern =
    concern === "REFER_PATCHY" || concern === "REFER_SCALP";
  const referral_required = isReferConcern || gated.referral;

  return {
    concern,
    severity: sev,
    flags: gated.flags,
    recommended_products: gated.products,
    referral_required,
  };
}
