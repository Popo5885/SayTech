import { NextResponse } from "next/server";
import { getCampaignLiveState } from "../../../../../lib/live-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await context.params;

  return NextResponse.json(await getCampaignLiveState(campaignId));
}
