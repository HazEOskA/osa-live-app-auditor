import { createHash, timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 2_000_000;
const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 30;

const hits = new Map<string, number[]>();

export function resetRateLimit(): void {
  hits.clear();
}

function json(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers });
}

function digest(s: string): Buffer {
  return createHash("sha256").update(s).digest();
}

/** Best-effort per-instance limiter. On serverless it is per warm instance; the hard cost cap is the provider spend limit. */
function rateLimited(ip: string, now: number): number | null {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(ip, recent);
    return Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
  return null;
}

/**
 * Shared gate for every /api route: fail-closed access password, rate limit, body size cap.
 * Returns a Response when the request must be rejected, otherwise null.
 */
export function guardRequest(req: Request, now = Date.now()): Response | null {
  const expected = process.env.ACCESS_PASSWORD ?? "";
  const open = process.env.ALLOW_OPEN_ACCESS === "true";

  if (!expected && !open) {
    return json(503, { error: "access_not_configured", message: "Set ACCESS_PASSWORD (or ALLOW_OPEN_ACCESS=true for local dev)." });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const wait = rateLimited(ip, now);
  if (wait !== null) return json(429, { error: "rate_limited", message: "Too many requests." }, { "retry-after": String(wait) });

  if (expected) {
    const given = req.headers.get("x-access-password") ?? "";
    if (!timingSafeEqual(digest(given), digest(expected))) {
      return json(401, { error: "unauthorized", message: "Wrong or missing access password." });
    }
  }

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) return json(413, { error: "too_large", message: "Request body too large." });
  return null;
}

export async function readJson(req: Request): Promise<{ ok: true; data: unknown } | { ok: false; response: Response }> {
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return { ok: false, response: json(413, { error: "too_large", message: "Request body too large." }) };
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, response: json(400, { error: "bad_json", message: "Body must be valid JSON." }) };
  }
}
