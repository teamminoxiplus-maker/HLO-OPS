// Pull attribution params off a URLSearchParams-like object (spec §6).
// NOTE: keep this file free of node-only imports — it's imported by client
// components. Server-only helpers (IP hashing) live in attribution-server.ts.
export interface Attribution {
  src?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export function readAttribution(
  params: URLSearchParams | Record<string, string | undefined>,
): Attribution {
  const get = (k: string) =>
    params instanceof URLSearchParams ? params.get(k) ?? undefined : params[k];
  return {
    src: get("src") ?? undefined,
    utm_source: get("utm_source") ?? undefined,
    utm_medium: get("utm_medium") ?? undefined,
    utm_campaign: get("utm_campaign") ?? undefined,
  };
}

// Coarse device bucket from a UA string (spec §11 device_type).
export function deviceType(ua: string | null | undefined): string {
  if (!ua) return "unknown";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop";
}

