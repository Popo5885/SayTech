import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import { getPrimaryStore } from "../../../../lib/live-store";
import { redeemPoints } from "../../../../lib/affiliate-points";
import { rateLimitByIpAndUser } from "../../../../lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tooMany = rateLimitByIpAndUser({ request, userId, scope: "affiliate-redeem", ipLimit: 5, userLimit: 10, windowMs: 60_000 });
  if (tooMany) return tooMany;

  const store = await getPrimaryStore();
  if (!store) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  let pointsToRedeem: number;
  try {
    const body = (await request.json()) as { points?: number };
    pointsToRedeem = Number(body.points ?? 0);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const result = await redeemPoints(store.workspace.id, pointsToRedeem);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "שגיאה בלתי ידועה";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
