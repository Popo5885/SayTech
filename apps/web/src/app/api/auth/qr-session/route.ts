import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { rateLimit, rateLimitResponse, clientIp } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

const db = prisma as any;
const QR_TTL_MS = 3 * 60 * 1000;

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  const rl = rateLimit({ key: `qr-session:${ip}`, limit: 10, windowMs: 60_000 });

  const tooMany = rateLimitResponse(rl);
  if (tooMany) return tooMany;

  const expiresAt = new Date(Date.now() + QR_TTL_MS);
  const session = await db.qrLoginSession.create({
    data: { expiresAt }
  });

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  return NextResponse.json({
    token: session.token,
    qrUrl: `${baseUrl}/qr-login/${session.token}`,
    expiresAt: session.expiresAt.toISOString()
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  const session = await db.qrLoginSession.findUnique({
    where: { token }
  });

  if (!session) {
    return NextResponse.json({ status: "invalid" });
  }

  if (new Date() > session.expiresAt) {
    return NextResponse.json({ status: "expired" });
  }

  return NextResponse.json({ status: session.status, userId: session.userId ?? null });
}
