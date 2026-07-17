// Question bank (spec §8). Typed config, NOT hardcoded JSX — copy gets edited
// often without touching components. Order here is the on-screen order (1–12).
import type { Answers } from "./types";

export type QuestionType = "single" | "multi";

export interface Option {
  value: string;
  label: string; // Taglish, shown on the tap target
  hint?: string; // optional secondary line
}

export interface Question {
  id: keyof Answers;
  type: QuestionType;
  // Screen number 1–12 (matches /assessment/q/[step]).
  step: number;
  title: string;
  options: Option[];
  // Safety questions are never skippable (spec §8, Q11).
  required: boolean;
  // For multi-select: a value that clears the others when picked ("Wala").
  exclusiveValue?: string;
}

export const QUESTIONS: Question[] = [
  {
    id: "sex",
    type: "single",
    step: 1,
    title: "Ano ang kasarian mo?",
    required: true,
    options: [
      { value: "male", label: "Lalaki" },
      { value: "female", label: "Babae" },
    ],
  },
  {
    id: "age_band",
    type: "single",
    step: 2,
    title: "Ilang taong gulang ka?",
    required: true,
    options: [
      { value: "below_18", label: "Below 18" },
      { value: "18_24", label: "18–24" },
      { value: "25_34", label: "25–34" },
      { value: "35_44", label: "35–44" },
      { value: "45_54", label: "45–54" },
      { value: "55_plus", label: "55+" },
    ],
  },
  {
    id: "duration",
    type: "single",
    step: 3,
    title: "Gaano na katagal ang hair loss mo?",
    required: true,
    options: [
      { value: "lt_6m", label: "Below 6 months" },
      { value: "6_12m", label: "6–12 months" },
      { value: "1_3y", label: "1–3 years" },
      { value: "gt_3y", label: "More than 3 years" },
    ],
  },
  {
    id: "pattern",
    type: "single",
    step: 4,
    title: "Saan mo pinaka-napapansin ang pagnipis?",
    required: true,
    options: [
      { value: "receding", label: "Receding hairline / temples", hint: "paurong ang noo" },
      { value: "crown", label: "Crown o gitna ng ulo", hint: "bald spot" },
      { value: "widening_part", label: "Lumalapad ang hati", hint: "part line" },
      { value: "diffuse", label: "Buong ulo, pantay ang pagnipis" },
      { value: "patchy", label: "Patchy, bilog-bilog na spots" },
      { value: "edges", label: "Sa gilid", hint: "kung saan hinihila ng ponytail o braids" },
    ],
  },
  {
    id: "shedding",
    type: "single",
    step: 5,
    title: "Ilang buhok ang nalalagas kada araw?",
    required: true,
    options: [
      { value: "normal", label: "Konti lang, normal" },
      { value: "noticeable", label: "Napapansin ko sa unan o drain" },
      { value: "clumps", label: "Marami — bukol-bukol pag nag-shampoo" },
    ],
  },
  {
    id: "scalp",
    type: "multi",
    step: 6,
    title: "Kumusta ang anit mo?",
    required: true,
    exclusiveValue: "normal",
    options: [
      { value: "dandruff", label: "Balakubak" },
      { value: "itchy", label: "Makati" },
      { value: "oily", label: "Madulas o oily" },
      { value: "wound", label: "Namamaga o may sugat" },
      { value: "normal", label: "Normal naman" },
    ],
  },
  {
    id: "family_history",
    type: "single",
    step: 7,
    title: "May kalbo ba sa pamilya mo (magulang, lolo, tita)?",
    required: true,
    options: [
      { value: "yes", label: "Oo" },
      { value: "no", label: "Hindi" },
      { value: "unknown", label: "Hindi ko alam" },
    ],
  },
  {
    id: "triggers",
    type: "multi",
    step: 8,
    title: "May naranasan ka ba nito sa nakaraang taon?",
    required: true,
    exclusiveValue: "none",
    options: [
      { value: "postpartum", label: "Nanganak (postpartum)" },
      { value: "stress", label: "Sobrang stress" },
      { value: "illness", label: "Malubhang sakit o lagnat" },
      { value: "crash_diet", label: "Crash diet o biglaang pagpayat" },
      { value: "surgery", label: "Operasyon" },
      { value: "none", label: "Wala naman" },
    ],
  },
  {
    id: "styling",
    type: "single",
    step: 9,
    title: "Madalas ka bang mag-tight ponytail, braids, bun, o extensions?",
    required: true,
    options: [
      { value: "daily", label: "Oo, araw-araw" },
      { value: "sometimes", label: "Minsan lang" },
      { value: "no", label: "Hindi" },
    ],
  },
  {
    id: "tried",
    type: "multi",
    step: 10,
    title: "Ano na ang nasubukan mo?",
    required: true,
    exclusiveValue: "none",
    options: [
      { value: "minoxidil", label: "Minoxidil" },
      { value: "finasteride", label: "Finasteride" },
      { value: "anti_dandruff", label: "Anti-dandruff shampoo" },
      { value: "supplements", label: "Supplements" },
      { value: "hair_spa", label: "Hair spa" },
      { value: "none", label: "Wala pa" },
    ],
  },
  {
    id: "medical_flags",
    type: "multi",
    step: 11,
    title: "Alin dito ang totoo sa'yo?",
    required: true, // hard safety question — never skippable (spec §8)
    exclusiveValue: "none",
    options: [
      { value: "pregnant", label: "Buntis o nagpapasuso" },
      { value: "planning_pregnancy", label: "Nagpaplanong magbuntis" },
      { value: "heart_bp", label: "May heart condition o BP maintenance" },
      { value: "minoxidil_allergy", label: "May allergy sa Minoxidil" },
      { value: "scalp_wound", label: "May sugat o skin condition sa anit" },
      { value: "none", label: "Wala sa mga ito" },
    ],
  },
  {
    id: "goal",
    type: "single",
    step: 12,
    title: "Ano ang pinakagusto mong mangyari?",
    required: true,
    options: [
      { value: "stop_shedding", label: "Itigil ang paglagas" },
      { value: "regrow", label: "Pabalikin ang nawalang buhok sa hairline o crown" },
      { value: "thicken", label: "Palapotin ang manipis na buhok" },
      { value: "fix_dandruff", label: "Ayusin ang balakubak at kati" },
    ],
  },
];

export const TOTAL_STEPS = QUESTIONS.length;

export function questionByStep(step: number): Question | undefined {
  return QUESTIONS.find((q) => q.step === step);
}

export function labelForAnswer(id: keyof Answers, value: string): string {
  const q = QUESTIONS.find((x) => x.id === id);
  return q?.options.find((o) => o.value === value)?.label ?? value;
}
