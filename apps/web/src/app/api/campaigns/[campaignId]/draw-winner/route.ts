import { NextResponse } from "next/server";
import { runWinnerDraw } from "../../../../../lib/live-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await context.params;

  return NextResponse.json(await runWinnerDraw(campaignId));
}
