// SECURITY: edge middleware that applies a coarse, defense-in-depth rate limit
// to *all* /api/* requests by source IP. Per-route handlers can (and should)
// still apply finer-grained limits keyed by user id / email / phone.
//
// IMPORTANT: this runs in the Edge runtime, so it cannot import the Node-only
// `rate-limit` lib that uses `node:crypto`. We keep an in-memory fallback here.
//
// On a single Railway replica this gives meaningful protection. If you scale
// horizontally, swap the Map for a shared Redis backend (e.g. Upstash) so the
// counters survive cross-replica traffic.

import { NextResponse, type NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

// In-memory bucket store. The middleware module is reused across requests inside
// a single Node/Edge worker so the counters persist across calls.
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 50_000;

function gc(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

function tick(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  gc(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  return { ok: true, retryAfter: 0 };
}

function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

// Routes whose abuse would burn AI / WhatsApp / Google budget. Apply a stricter
// per-IP cap on top of the general API limit.
const STRICT_PREFIXES = [
  "/api/contacts",
  "/api/campaigns",
  "/api/connections",
  "/api/uploads",
  "/api/google",
  "/api/onboarding-tour"
];

function isStrict(pathname: string): boolean {
  return STRICT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard API requests. Static assets and pages are safe.
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Webhooks need their own (more permissive) limit because Meta retries fan-in.
  // Skip the global limit and let the route's own rateLimit() govern.
  if (pathname.startsWith("/api/webhook") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const ip = clientIp(request);
  const general = tick(`api:${ip}`, 240, 60_000); // 240 / min / IP across all /api

  if (!general.ok) {
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests. Please slow down.",
        retryAfterSec: general.retryAfter
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(general.retryAfter)
        }
      }
    );
  }

  if (isStrict(pathname)) {
    const strict = tick(`api-strict:${ip}`, 60, 60_000); // 60 / min / IP on costly endpoints
    if (!strict.ok) {
      return new NextResponse(
        JSON.stringify({
          error: "Too many requests. Please slow down.",
          retryAfterSec: strict.retryAfter
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(strict.retryAfter)
          }
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"]
};
