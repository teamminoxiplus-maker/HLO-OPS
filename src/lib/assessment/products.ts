// MINOXIPLUS product catalog (spec §1) with the safety-relevant attributes the
// engine reads. Buy links point at the real storefronts; swap the URLs when the
// canonical listing pages are confirmed.
import type { ProductId } from "./types";

export interface ProductInfo {
  id: ProductId;
  name: string;
  actives: string;
  // One-line "bakit ito para sa'yo" shown on the result card.
  why: string;
  howToUse: string;
  // --- safety attributes read by applySafetyGates (spec §9.4) ---
  containsMinoxidil: boolean;
  containsFinasteride: boolean;
  menOnly: boolean;
  minAge: number; // 0 = no age restriction
  topical: boolean; // applied to the scalp
  supplement: boolean;
  // Product image lives under /public; a placeholder ships with the repo.
  image: string;
}

export const PRODUCTS: Record<ProductId, ProductInfo> = {
  signature_hair_grower: {
    id: "signature_hair_grower",
    name: "Signature Hair Grower",
    actives: "5% Minoxidil topical spray",
    why: "Sinusuportahan ang regrowth ng buhok sa hairline at crown.",
    howToUse: "1 ml spray, 2x kada araw sa tuyong anit. Huwag hugasan ng 4 na oras.",
    containsMinoxidil: true,
    containsFinasteride: false,
    menOnly: false,
    minAge: 18,
    topical: true,
    supplement: false,
    image: "/products/signature-hair-grower.svg",
  },
  tri_active: {
    id: "tri_active",
    name: "Tri Active",
    actives: "Minoxidil + Finasteride + Bakuchiol",
    why: "Triple-action para sa moderate hanggang advanced na pattern hair loss ng lalaki.",
    howToUse: "Sundin ang direksyon sa label. Kumonsulta muna kay Doc bago simulan.",
    containsMinoxidil: true,
    containsFinasteride: true,
    menOnly: true, // spec §9.4.1 — MEN ONLY, hard filter
    minAge: 18,
    topical: true,
    supplement: false,
    image: "/products/tri-active.svg",
  },
  keto_shampoo: {
    id: "keto_shampoo",
    name: "Ketoconazole 2% Shampoo",
    actives: "Ketoconazole 2%",
    why: "Tinutugunan ang balakubak at kati na nagpapalagas ng buhok.",
    howToUse: "2–3x kada linggo. Iwanan 3–5 minuto bago banlawan.",
    containsMinoxidil: false,
    containsFinasteride: false,
    menOnly: false,
    minAge: 0,
    topical: true,
    supplement: false,
    image: "/products/keto-shampoo.svg",
  },
  hair_supplement: {
    id: "hair_supplement",
    name: "Hair Supplement Capsules",
    actives: "Hair-support vitamins",
    why: "Sinusuportahan ang lakas at kapal ng buhok mula sa loob.",
    howToUse: "1 capsule kada araw kasabay ng pagkain.",
    containsMinoxidil: false,
    containsFinasteride: false,
    menOnly: false,
    minAge: 0,
    topical: false,
    supplement: true,
    image: "/products/hair-supplement.svg",
  },
  scalp_massager: {
    id: "scalp_massager",
    name: "Scalp Massager",
    actives: "Device",
    why: "Nagpapaganda ng blood flow sa anit para mas epektibo ang topicals.",
    howToUse: "3–5 minuto kada araw, marahang pagmasahe sa anit.",
    containsMinoxidil: false,
    containsFinasteride: false,
    menOnly: false,
    minAge: 0,
    topical: false,
    supplement: false,
    image: "/products/scalp-massager.svg",
  },
  derma_stamp: {
    id: "derma_stamp",
    name: "Derma Stamp",
    actives: "Device",
    why: "Micro-needling na tumutulong sa absorption ng topical treatment.",
    howToUse: "1x kada linggo. Linisin bago at pagkatapos gamitin.",
    containsMinoxidil: false,
    containsFinasteride: false,
    menOnly: false,
    minAge: 0,
    topical: false,
    supplement: false,
    image: "/products/derma-stamp.svg",
  },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS) as ProductId[];

export function productName(id: ProductId): string {
  return PRODUCTS[id].name;
}

// Storefront buttons for the result page (spec §10 §6).
export const STOREFRONTS = {
  website: "https://minoxiplus.com",
  shopee: "https://shopee.ph/minoxiplus",
  lazada: "https://www.lazada.com.ph/shop/minoxiplus",
  tiktok: "https://www.tiktok.com/@minoxiplus",
} as const;

// Consult channels (spec §10 §7).
export const CONSULT = {
  viber: "https://invite.viber.com/?g2=minoxiplus",
  facebook: "https://m.me/minoxiplus",
  email: "care@minoxiplus.com",
} as const;
