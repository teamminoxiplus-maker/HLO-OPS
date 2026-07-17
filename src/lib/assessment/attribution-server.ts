import { createHash } from "node:crypto";

// Server-only attribution helpers (spec §11). Kept separate from
// attribution.ts so the client bundle never pulls in node:crypto.

// Hash the client IP before storage — never store raw (spec §11 ip_hash).
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT ?? "minoxiplus";
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 32);
}

// Best-effort client IP from proxy headers.
export function clientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip");
}
