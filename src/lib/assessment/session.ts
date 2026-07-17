"use client";

// Client-side flow state for the public assessment (spec §7 autosave rule).
// A UUID session_id lives in localStorage; answers autosave locally and POST to
// /api/assessment/draft on every step transition. In kiosk mode we keep state
// in memory only so nothing persists between customers (spec §13).
import type { PartialAnswers } from "./types";
import type { Attribution } from "./attribution";

const SID_KEY = "mxp_session_id";
const ANS_KEY = "mxp_answers";
const ATTR_KEY = "mxp_attr";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

let memSid: string | null = null;
let memAnswers: PartialAnswers = {};
let memLoc: string | null = null;

// Kiosk location tag (spec §13: src auto-set to kiosk_[location]). Kept in
// memory — survives SPA navigation within one kiosk session, cleared on reset.
export function setKioskLoc(loc: string | null): void {
  memLoc = loc;
}
export function getKioskLoc(): string | null {
  return memLoc;
}

export function getSessionId(kiosk = false): string {
  if (kiosk) {
    if (!memSid) memSid = uuid();
    return memSid;
  }
  if (typeof window === "undefined") return uuid();
  let sid = window.localStorage.getItem(SID_KEY);
  if (!sid) {
    sid = uuid();
    window.localStorage.setItem(SID_KEY, sid);
  }
  return sid;
}

export function getAnswers(kiosk = false): PartialAnswers {
  if (kiosk) return { ...memAnswers };
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ANS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function setAnswers(next: PartialAnswers, kiosk = false): void {
  if (kiosk) {
    memAnswers = next;
    return;
  }
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANS_KEY, JSON.stringify(next));
}

export function saveAttribution(attr: Attribution & { referrer?: string }): void {
  if (typeof window === "undefined") return;
  const existing = getAttribution();
  // First-touch wins — don't clobber an earlier captured source.
  if (existing && existing.src) return;
  window.localStorage.setItem(ATTR_KEY, JSON.stringify(attr));
}

export function getAttribution(): (Attribution & { referrer?: string }) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ATTR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  memSid = null;
  memAnswers = {};
  memLoc = null;
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SID_KEY);
  window.localStorage.removeItem(ANS_KEY);
  // Keep attribution so a re-take within the visit still attributes correctly.
}

// Fire-and-forget draft autosave. Never blocks navigation.
export function postDraft(body: Record<string, unknown>): void {
  try {
    const payload = JSON.stringify(body);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/assessment/draft",
        new Blob([payload], { type: "application/json" }),
      );
    } else {
      fetch("/api/assessment/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Autosave is best-effort — never surface an error to the customer.
  }
}

// Funnel event beacon (spec §11 assessment_events).
export function logEvent(session_id: string, step: string, event: string): void {
  try {
    const payload = JSON.stringify({ session_id, step, event });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/assessment/event",
        new Blob([payload], { type: "application/json" }),
      );
    }
  } catch {
    // ignore
  }
}
