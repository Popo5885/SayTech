import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { runWinnerDraw } from "../../../../../lib/live-store";
import { rateLimitByIpAndUser } from "../../../../../lib/rate-limit";

export async function POST(
  request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  // SECURITY: authenticate the caller before touching the draw.
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // SECURITY: rate-limit draws — expensive operation, must not be spammed.
  const tooMany = rateLimitByIpAndUser({
    request,
    userId,
    scope: "draw-winner",
    ipLimit: 10,
    userLimit: 20,
    windowMs: 60_000
  });
  if (tooMany) return tooMany;

  const { campaignId } = await context.params;

  return NextResponse.json(await runWinnerDraw(campaignId));
}
