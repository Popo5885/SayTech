// SECURITY: lightweight in-memory rate limiter.
//
// Suitable for the current single-replica Railway deployment. If you scale to
// multiple replicas, replace the in-memory map with Redis / Upstash so the
// counters are shared across processes.
//
// Use:
//   const decision = rateLimit({ key: `login:${ip}`, limit: 10, windowMs: 60_000 });
//   if (!decision.ok) return new Response("Too many requests", { status: 429 });

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 100_000;

function gc(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitDecision = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
  resetAt: number;
};

export function rateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitDecision {
  const now = Date.now();
  gc(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0, resetAt: now + windowMs };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      resetAt: existing.resetAt
    };
  }

  return {
    ok: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: 0,
    resetAt: existing.resetAt
  };
}

/**
 * Best-effort client-IP extraction from common proxy headers. Falls back to
 * "unknown" so a single rate-limit bucket still applies to anonymous traffic.
 */
export function clientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");

  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = headers.get("x-real-ip");
  if (real) return real;

  return "unknown";
}

/**
 * Apply a combined per-IP and per-user rate limit. Returns a 429 Response if
 * either bucket is exhausted, otherwise null. Use in route handlers that
 * consume costly downstream resources (AI, WhatsApp Cloud API, Google quotas).
 */
export function rateLimitByIpAndUser(opts: {
  request: Request;
  userId?: string | null;
  scope: string;
  ipLimit?: number;
  userLimit?: number;
  windowMs?: number;
}): Response | null {
  const ipLimit = opts.ipLimit ?? 30;
  const userLimit = opts.userLimit ?? 60;
  const windowMs = opts.windowMs ?? 60_000;
  const ip = clientIp(opts.request);

  const ipDecision = rateLimit({ key: `${opts.scope}:ip:${ip}`, limit: ipLimit, windowMs });
  if (!ipDecision.ok) return rateLimitResponse(ipDecision);

  if (opts.userId) {
    const userDecision = rateLimit({
      key: `${opts.scope}:user:${opts.userId}`,
      limit: userLimit,
      windowMs
    });
    if (!userDecision.ok) return rateLimitResponse(userDecision);
  }

  return null;
}

/**
 * Convenience helper for HTTP route handlers. Returns a NextResponse-like
 * Response with 429 + Retry-After when blocked, otherwise null.
 */
export function rateLimitResponse(decision: RateLimitDecision): Response | null {
  if (decision.ok) return null;

  return new Response(
    JSON.stringify({
      error: "Too many requests. Please slow down.",
      retryAfterSec: decision.retryAfterSec
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(decision.retryAfterSec)
      }
    }
  );
}
