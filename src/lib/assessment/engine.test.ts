import { describe, it, expect } from "vitest";
import {
  classify,
  severity,
  severityScore,
  mapProducts,
  applySafetyGates,
  runEngine,
} from "./engine";
import { PRODUCTS } from "./products";
import type { Answers, ProductId } from "./types";

// A neutral, valid baseline. Individual tests override just what they exercise.
function base(overrides: Partial<Answers> = {}): Answers {
  return {
    sex: "male",
    age_band: "25_34",
    duration: "6_12m",
    pattern: "receding",
    shedding: "noticeable",
    scalp: ["normal"],
    family_history: "no",
    triggers: ["none"],
    styling: "no",
    tried: ["none"],
    medical_flags: ["none"],
    goal: "regrow",
    ...overrides,
  };
}

const hasMinoxidil = (ids: ProductId[]) =>
  ids.some((id) => PRODUCTS[id].containsMinoxidil);

describe("classify — §9.1 order, first match wins", () => {
  it("patchy → REFER_PATCHY (beats everything)", () => {
    expect(classify(base({ pattern: "patchy", sex: "male" }))).toBe("REFER_PATCHY");
  });

  it("scalp wound → REFER_SCALP", () => {
    expect(
      classify(base({ pattern: "crown", medical_flags: ["scalp_wound"] })),
    ).toBe("REFER_SCALP");
  });

  it("edges + daily styling → TRACTION", () => {
    expect(classify(base({ sex: "female", pattern: "edges", styling: "daily" }))).toBe(
      "TRACTION",
    );
  });

  it("edges without styling → not traction", () => {
    expect(classify(base({ pattern: "edges", styling: "no" }))).not.toBe("TRACTION");
  });

  it("diffuse + trigger + recent → TELOGEN_EFFLUVIUM", () => {
    expect(
      classify(
        base({ pattern: "diffuse", triggers: ["postpartum"], duration: "lt_6m" }),
      ),
    ).toBe("TELOGEN_EFFLUVIUM");
  });

  it("diffuse + trigger but >12 months → not TE", () => {
    expect(
      classify(base({ pattern: "diffuse", triggers: ["stress"], duration: "1_3y" })),
    ).not.toBe("TELOGEN_EFFLUVIUM");
  });

  it("AGA pattern + scalp irritation → MIXED (before plain AGA)", () => {
    expect(classify(base({ pattern: "crown", scalp: ["dandruff"] }))).toBe("MIXED");
  });

  it("diffuse + dandruff, no trigger → SEB_DERM", () => {
    expect(
      classify(base({ pattern: "diffuse", scalp: ["dandruff", "oily"], triggers: ["none"] })),
    ).toBe("SEB_DERM");
  });

  it("male receding, clean scalp → AGA_MALE", () => {
    expect(classify(base({ sex: "male", pattern: "receding" }))).toBe("AGA_MALE");
  });

  it("female widening part → AGA_FEMALE", () => {
    expect(classify(base({ sex: "female", pattern: "widening_part" }))).toBe(
      "AGA_FEMALE",
    );
  });

  it("unmatched combo → INCONCLUSIVE", () => {
    expect(classify(base({ sex: "female", pattern: "receding", scalp: ["normal"] }))).toBe(
      "INCONCLUSIVE",
    );
  });
});

describe("severity — §9.2", () => {
  it("scores each component", () => {
    // duration 1_3y(2) + shedding clumps(2) + pattern crown(2) + family yes(1) = 7
    const s = severityScore(
      base({ duration: "1_3y", shedding: "clumps", pattern: "crown", family_history: "yes" }),
    );
    expect(s).toBe(7);
  });

  it("0–2 → Early", () => {
    expect(
      severity(base({ duration: "lt_6m", shedding: "normal", pattern: "edges", family_history: "no" })),
    ).toBe("Early");
  });

  it("3–5 → Moderate", () => {
    expect(
      severity(base({ duration: "1_3y", shedding: "noticeable", pattern: "receding", family_history: "no" })),
    ).toBe("Moderate");
  });

  it("6+ → Advanced", () => {
    expect(
      severity(base({ duration: "gt_3y", shedding: "clumps", pattern: "crown", family_history: "no" })),
    ).toBe("Advanced");
  });
});

describe("mapProducts — §9.3", () => {
  it("AGA_MALE early → Signature + Scalp Massager", () => {
    expect(mapProducts("AGA_MALE", "Early", base())).toEqual([
      "signature_hair_grower",
      "scalp_massager",
    ]);
  });

  it("AGA_MALE moderate → Tri Active routine", () => {
    expect(mapProducts("AGA_MALE", "Moderate", base())).toContain("tri_active");
  });

  it("TELOGEN adds Signature only when duration > 6 months", () => {
    expect(mapProducts("TELOGEN_EFFLUVIUM", "Early", base({ duration: "lt_6m" }))).not.toContain(
      "signature_hair_grower",
    );
    expect(mapProducts("TELOGEN_EFFLUVIUM", "Early", base({ duration: "6_12m" }))).toContain(
      "signature_hair_grower",
    );
  });

  it("REFER concerns map to no products", () => {
    expect(mapProducts("REFER_PATCHY", "Early", base())).toEqual([]);
    expect(mapProducts("INCONCLUSIVE", "Advanced", base())).toEqual([]);
  });
});

describe("safety gates — §9.4 (NON-NEGOTIABLE)", () => {
  it("gate 1: Tri Active NEVER reaches a female user", () => {
    const female = base({ sex: "female" });
    const gated = applySafetyGates(["tri_active", "signature_hair_grower"], female);
    expect(gated.products).not.toContain("tri_active");
    expect(gated.flags).toContain("MEN_ONLY_FILTERED");
  });

  it("gate 1: full pipeline — female Moderate AGA never yields Tri Active", () => {
    const r = runEngine(
      base({
        sex: "female",
        pattern: "widening_part",
        duration: "1_3y",
        shedding: "clumps",
        family_history: "yes",
      }),
    );
    expect(r.severity).not.toBe("Early");
    expect(r.recommended_products).not.toContain("tri_active");
    expect(r.recommended_products).toContain("signature_hair_grower");
  });

  it("gate 2: under 18 → no Minoxidil/Finasteride, consult route", () => {
    const r = runEngine(base({ age_band: "below_18", pattern: "receding" }));
    expect(hasMinoxidil(r.recommended_products)).toBe(false);
    expect(r.recommended_products).toEqual([]);
    expect(r.referral_required).toBe(true);
    expect(r.flags).toContain("UNDER_18");
  });

  it("gate 3: pregnant → no minoxidil/finasteride/supplements, consult only", () => {
    const r = runEngine(
      base({ sex: "female", pattern: "widening_part", medical_flags: ["pregnant"] }),
    );
    expect(r.recommended_products).toEqual([]);
    expect(r.referral_required).toBe(true);
    expect(r.flags).toContain("PREGNANCY");
  });

  it("gate 3: planning pregnancy is treated the same", () => {
    const gated = applySafetyGates(
      ["signature_hair_grower", "hair_supplement"],
      base({ sex: "female", medical_flags: ["planning_pregnancy"] }),
    );
    expect(gated.products).toEqual([]);
    expect(gated.referral).toBe(true);
  });

  it("gate 4: heart/BP → minoxidil allowed but flagged for clearance", () => {
    const gated = applySafetyGates(
      ["signature_hair_grower", "scalp_massager"],
      base({ medical_flags: ["heart_bp"] }),
    );
    expect(gated.products).toContain("signature_hair_grower");
    expect(gated.flags).toContain("NEEDS_DOC_CLEARANCE");
    expect(gated.referral).toBe(false);
  });

  it("gate 5: minoxidil allergy → all minoxidil products removed", () => {
    const gated = applySafetyGates(
      ["signature_hair_grower", "tri_active", "hair_supplement"],
      base({ medical_flags: ["minoxidil_allergy"] }),
    );
    expect(hasMinoxidil(gated.products)).toBe(false);
    expect(gated.products).toContain("hair_supplement");
    expect(gated.flags).toContain("MINOXIDIL_ALLERGY");
  });

  it("gate 6: scalp wound → topicals suppressed + refer (via classify)", () => {
    const r = runEngine(base({ medical_flags: ["scalp_wound"], pattern: "crown" }));
    expect(r.concern).toBe("REFER_SCALP");
    expect(r.recommended_products).toEqual([]);
    expect(r.referral_required).toBe(true);
  });

  it("gate 7: never return empty products with referral=false", () => {
    const r = runEngine(
      base({ age_band: "below_18", pattern: "crown", sex: "male", shedding: "clumps" }),
    );
    if (r.recommended_products.length === 0) {
      expect(r.referral_required).toBe(true);
    }
  });
});

describe("runEngine — end to end sanity", () => {
  it("male moderate AGA → Tri Active present (men allowed)", () => {
    const r = runEngine(
      base({
        sex: "male",
        pattern: "crown",
        duration: "gt_3y",
        shedding: "clumps",
        family_history: "yes",
      }),
    );
    expect(r.concern).toBe("AGA_MALE");
    expect(r.severity).toBe("Advanced");
    expect(r.recommended_products).toContain("tri_active");
  });

  it("SEB_DERM → Ketoconazole shampoo recommended", () => {
    const r = runEngine(
      base({ pattern: "diffuse", scalp: ["dandruff", "oily"], triggers: ["none"] }),
    );
    expect(r.concern).toBe("SEB_DERM");
    expect(r.recommended_products).toContain("keto_shampoo");
  });
});
