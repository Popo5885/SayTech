import { NextResponse } from "next/server";
import type { CampaignTemplateUpdateInput } from "@lottery/core";
import { getTemplates, updateTemplates } from "../../../../../lib/demo-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await context.params;

  return NextResponse.json({
    templates: await getTemplates(campaignId)
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await context.params;
  const body = (await request.json()) as {
    templates: CampaignTemplateUpdateInput[];
  };

  return NextResponse.json({
    templates: await updateTemplates(campaignId, body.templates ?? []),
    savedAt: new Date().toISOString()
  });
}
