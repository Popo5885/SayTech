import { NextResponse } from "next/server";
import type { CampaignTemplateUpdateInput } from "@lottery/core";
import { auth } from "../../../../../auth";
import { getTemplates, updateTemplates } from "../../../../../lib/live-store";
import { rateLimitByIpAndUser } from "../../../../../lib/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  // SECURITY: campaign access is verified inside getTemplates via
  // assertCampaignAccess. The handler also requires an active session so we
  // can apply a per-user rate limit (and avoid leaking 500s on unauth reads).
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const tooMany = rateLimitByIpAndUser({
    request,
    userId,
    scope: "templates-read",
    ipLimit: 60,
    userLimit: 120,
    windowMs: 60_000
  });
  if (tooMany) return tooMany;

  const { campaignId } = await context.params;

  return NextResponse.json({
    templates: await getTemplates(campaignId)
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const tooMany = rateLimitByIpAndUser({
    request,
    userId,
    scope: "templates-write",
    ipLimit: 20,
    userLimit: 40,
    windowMs: 60_000
  });
  if (tooMany) return tooMany;

  const { campaignId } = await context.params;
  const body = (await request.json()) as {
    templates: CampaignTemplateUpdateInput[];
  };

  return NextResponse.json({
    templates: await updateTemplates(campaignId, body.templates ?? []),
    savedAt: new Date().toISOString()
  });
}

export const PUT = PATCH;
