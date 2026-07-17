import { CONCERN_COPY } from "./copy";
import { PRODUCTS } from "./products";
import type { Concern, EngineFlag, ProductId } from "./types";

// Short admin-facing labels (spec §12 table).
export function concernLabel(c: Concern | null | undefined): string {
  if (!c) return "—";
  return CONCERN_COPY[c]?.label ?? c;
}

export function productLabel(id: ProductId): string {
  return PRODUCTS[id]?.name ?? id;
}

export function productList(ids: ProductId[] | null | undefined): string {
  if (!ids || ids.length === 0) return "—";
  return ids.map(productLabel).join(", ");
}

export const FLAG_LABEL: Record<EngineFlag, string> = {
  NEEDS_DOC_CLEARANCE: "Doc clearance",
  UNDER_18: "Under 18",
  PREGNANCY: "Pregnancy",
  MINOXIDIL_ALLERGY: "Minoxidil allergy",
  SCALP_CONDITION: "Scalp condition",
  MEN_ONLY_FILTERED: "Men-only filtered",
};

export function flagLabels(flags: EngineFlag[] | null | undefined): string[] {
  return (flags ?? []).map((f) => FLAG_LABEL[f] ?? f);
}
