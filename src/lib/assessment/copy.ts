// Result copy — SINGLE SOURCE OF TRUTH for both the web result page and the
// email (spec §10). All strings follow the §9.5 claim rules: no "cure",
// "guaranteed", "permanent", "100%", no "diagnosis"; use "posible"/"malamang".
import type { Concern, EngineFlag, Severity } from "./types";

// Carried on every result page and email (spec §9.5).
export const DISCLAIMER =
  "Hindi ito medical diagnosis. Para sa personal na advice, message mo lang kami o kausapin si Doc Ryan Encabo.";

export const REVIEWED_BY = "Reviewed by Doc Ryan Encabo";

export const PREGNANCY_LINE =
  "Para sa safety mo at ng baby, kausapin muna natin si Doc bago mag-simula ng anumang treatment.";

export interface ConcernCopy {
  label: string; // shown after "Based sa sagot mo:"
  headline: string; // 2–3 sentence plain-Taglish explanation
  whatsHappening: string; // short educational block
  routineIntro: string; // lead-in above product cards
}

export const CONCERN_COPY: Record<Concern, ConcernCopy> = {
  AGA_MALE: {
    label: "Male Pattern Hair Loss",
    headline:
      "Based sa sagot mo, malamang na male pattern hair loss ang nararanasan mo — ang pinakakaraniwang dahilan ng pagnipis sa lalaki. Unti-unti itong nangyayari, kaya mas maaga mong simulan, mas maganda ang resulta.",
    whatsHappening:
      "Sanhi ito ng sensitivity ng hair follicles sa DHT, na nagpapanipis ng buhok sa hairline at crown. Ang consistent na paggamit ng tamang topical ang susi.",
    routineIntro: "Ito ang routine na base sa stage mo:",
  },
  AGA_FEMALE: {
    label: "Female Pattern Hair Loss",
    headline:
      "Based sa sagot mo, posibleng female pattern hair loss ang dahilan ng pagnipis mo — kadalasang nakikita sa paglapad ng hati o pangkalahatang pagnipis sa itaas. Kayang suportahan ito ng tamang routine.",
    whatsHappening:
      "Sa kababaihan, unti-unting naninipis ang buhok pero bihirang tuluyang makalbo. Ang minoxidil at hair-support na sustansya ay tumutulong sa lakas at kapal.",
    routineIntro: "Ito ang routine na para sa'yo:",
  },
  TELOGEN_EFFLUVIUM: {
    label: "Telogen Effluvium (temporary shedding)",
    headline:
      "Based sa sagot mo, malamang na telogen effluvium ito — pansamantalang paglagas na kadalasang dulot ng panganganak, stress, sakit, o biglaang pagbabago sa katawan. Madalas itong bumabalik sa normal.",
    whatsHappening:
      "Nagulat ang hair cycle mo kaya sabay-sabay na nagpahinga ang mga follicle. Habang gumagaling ka, tumutulong ang sustansya at scalp care na mapabilis ang recovery.",
    routineIntro: "Para suportahan ang recovery mo:",
  },
  SEB_DERM: {
    label: "Balakubak / Scalp Irritation",
    headline:
      "Based sa sagot mo, ang balakubak o irritation sa anit ang malamang na nagpapalagas ng buhok mo. Kapag naayos ang anit, kadalasang humihinto rin ang paglagas.",
    whatsHappening:
      "Ang balakubak at kati ay nakaka-apekto sa kalusugan ng follicle. Ang medicated na shampoo ang unang hakbang bago ang anumang regrowth routine.",
    routineIntro: "Simulan sa pag-ayos ng anit:",
  },
  TRACTION: {
    label: "Traction (dulot ng tight hairstyles)",
    headline:
      "Based sa sagot mo, posibleng traction ang sanhi — naninipis ang buhok sa gilid dahil sa madalas na mahigpit na ponytail, braids, o extensions. Ang mabuting balita: kayang bumawi kapag na-adjust ang styling.",
    whatsHappening:
      "Ang paulit-ulit na paghila ay nakaka-stress sa follicle sa gilid ng ulo. Luwagan ang hairstyle at suportahan ng scalp care para bumalik ang buhok.",
    routineIntro: "Bukod sa pag-iwas sa mahigpit na style:",
  },
  MIXED: {
    label: "Pattern Hair Loss + Scalp Irritation",
    headline:
      "Based sa sagot mo, may pattern hair loss ka na sabay sa balakubak o irritation. Kailangan i-address ang dalawa — linisin muna ang anit habang sinusuportahan ang regrowth.",
    whatsHappening:
      "Kapag may irritation ang anit, hindi ganoon ka-epektibo ang regrowth treatment. Kaya sabay nating aayusin ang anit at ang pagnipis.",
    routineIntro: "Dobleng aksyon na routine:",
  },
  REFER_PATCHY: {
    label: "Kailangan ng Konsultasyon",
    headline:
      "Based sa sagot mo, patchy o bilog-bilog na spots ang napapansin mo. Ito ay maaaring may ibang dahilan na kailangang tingnan nang personal bago mag-recommend ng anumang produkto.",
    whatsHappening:
      "Ang patchy hair loss ay hindi tinutugunan ng over-the-counter na regrowth products. Mas ligtas na kausapin muna si Doc Ryan Encabo.",
    routineIntro: "",
  },
  REFER_SCALP: {
    label: "Kailangan Munang Ayusin ang Anit",
    headline:
      "Based sa sagot mo, may sugat o skin condition sa anit mo. Kailangan itong gamutin muna bago maglagay ng anumang topical treatment.",
    whatsHappening:
      "Ang paglalagay ng topical sa may sugat na anit ay maaaring makasama. Kausapin muna natin si Doc para sa tamang unang hakbang.",
    routineIntro: "",
  },
  INCONCLUSIVE: {
    label: "Kailangan ng Kaunting Detalye",
    headline:
      "Based sa sagot mo, hindi pa namin ma-pin down ang isang malinaw na dahilan. Huwag mag-alala — kaya kang tulungan ng team namin nang personal.",
    whatsHappening:
      "May mga kaso na kailangan ng kaunting follow-up na tanong para masigurong tama ang routine. Message mo lang kami.",
    routineIntro: "",
  },
};

// Severity block (spec §10 §2).
export const SEVERITY_COPY: Record<Severity, { label: string; note: string }> = {
  Early: {
    label: "Early Stage",
    note: "Maaga pa — malaki ang tsansang mapigilan at mapabalik ang buhok sa tamang routine.",
  },
  Moderate: {
    label: "Moderate Stage",
    note: "May kababaang nangyayari na, pero epektibo pa ang treatment kapag consistent.",
  },
  Advanced: {
    label: "Advanced Stage",
    note: "Mas matagal na — mas kailangan ng consistent na routine at posibleng konsultasyon.",
  },
};

// Honest timeline expectation, incl. the shedding phase (spec §10 §5).
export const TIMELINE = [
  {
    when: "Month 1",
    note: "Simula pa lang. Normal na may bahagyang dagdag na shedding — bahagi ito ng cycle, hindi ito paglala.",
  },
  {
    when: "Month 3",
    note: "Kadalasang humihina na ang paglagas. Baby hairs ay maaaring magsimulang lumitaw.",
  },
  {
    when: "Month 6",
    note: "Dito karaniwang nakikita ang pinakamalinaw na improvement sa kapal — kung consistent ang paggamit.",
  },
];

// Human-readable flag lines shown before the purchase CTA (spec §9.4).
export const FLAG_COPY: Partial<Record<EngineFlag, string>> = {
  NEEDS_DOC_CLEARANCE:
    "May naisama kang heart condition o BP maintenance. Kumonsulta muna sa doktor bago simulan ang Minoxidil.",
  PREGNANCY: PREGNANCY_LINE,
  UNDER_18:
    "Ang mga treatment na ito ay para sa 18+ pataas. Message mo kami para sa ligtas na alternatibo.",
  MINOXIDIL_ALLERGY:
    "Dahil sa allergy sa Minoxidil, inalis namin ang mga produktong may Minoxidil sa rekomendasyon mo.",
  SCALP_CONDITION:
    "Dahil sa kondisyon ng anit, kailangan itong ayusin muna bago ang topical treatment.",
};

// Consult block copy for REFER routes (spec §10 — replaces sections 4–6).
export const CONSULT_COPY = {
  heading: "Kausapin muna natin ang team",
  body: "Para masigurong tama at ligtas ang routine para sa'yo, mas maganda kung personal ka munang makakausap ng team namin — o si Doc Ryan Encabo. Libre ang tanong.",
  cta: "Message mo kami",
};
