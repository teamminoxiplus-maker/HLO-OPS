// Rate limiting (spec §14: 5 submits/hour/IP). Uses Upstash Redis REST when
// configured, else an in-memory fallback for dev (spec §5). Fixed 1-hour window.
type Window = { count: number; resetAt: number };
const memory = new Map<string, Window>();

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function upstash(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

export interface RateResult {
  allowed: boolean;
  remaining: number;
}

// Returns whether the action is allowed and how many remain in the window.
export async function rateLimit(
  key: string,
  limit = 5,
  windowSeconds = 3600,
): Promise<RateResult> {
  const redisKey = `rl:${key}`;

  if (URL && TOKEN) {
    try {
      const count = (await upstash(["INCR", redisKey])) as number;
      if (count === 1) await upstash(["EXPIRE", redisKey, windowSeconds]);
      return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
    } catch {
      // Fail open on Redis errors — do not block real customers.
      return { allowed: true, remaining: limit };
    }
  }

  // In-memory fallback (single instance / dev only).
  const now = Date.now();
  const win = memory.get(redisKey);
  if (!win || now > win.resetAt) {
    memory.set(redisKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1 };
  }
  win.count += 1;
  return { allowed: win.count <= limit, remaining: Math.max(0, limit - win.count) };
}
