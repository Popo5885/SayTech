import { NextResponse } from "next/server";
import type { CampaignSettingsUpdate } from "@lottery/core";
import { auth } from "../../../../../auth";
import { updateCampaignSettings } from "../../../../../lib/live-store";
import { rateLimitByIpAndUser } from "../../../../../lib/rate-limit";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  // SECURITY: workspace ownership is enforced by updateCampaignSettings ->
  // assertCampaignAccess. We additionally apply per-user/IP rate limiting so
  // a stolen session cannot grind through campaigns to burn provisioning quota.
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const tooMany = rateLimitByIpAndUser({
    request,
    userId,
    scope: "campaign-settings",
    ipLimit: 30,
    userLimit: 60,
    windowMs: 60_000
  });
  if (tooMany) return tooMany;

  const { campaignId } = await context.params;
  const body = (await request.json()) as CampaignSettingsUpdate;

  return NextResponse.json({
    campaign: await updateCampaignSettings(campaignId, body),
    savedAt: new Date().toISOString()
  });
}
