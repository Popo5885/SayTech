import { NextResponse } from "next/server";
import type { CampaignSettingsUpdate } from "@lottery/core";
import { updateCampaignSettings } from "../../../../../lib/live-store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await context.params;
  const body = (await request.json()) as CampaignSettingsUpdate;

  return NextResponse.json({
    campaign: await updateCampaignSettings(campaignId, body),
    savedAt: new Date().toISOString()
  });
}
