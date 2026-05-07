/**
 * n8n Webhook: Campaign Status Check
 *
 * n8n queries this before processing any new message to verify the campaign
 * is still active. Returns isActive + relevant config.
 */
import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";

const db = prisma as any;

function verifySecret(request: Request): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-n8n-secret") === secret;
}

export async function GET(request: Request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const campaignId = url.searchParams.get("campaign_id");
  const slug = url.searchParams.get("slug");

  if (!campaignId && !slug) {
    return NextResponse.json(
      { error: "חובה לספק campaign_id או slug." },
      { status: 422 }
    );
  }

  const campaign = await db.campaign.findFirst({
    where: campaignId ? { id: campaignId } : { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      triggerWord: true,
      drawDate: true,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "ההגרלה לא נמצאה." }, { status: 404 });
  }

  return NextResponse.json({
    campaign_id: campaign.id,
    slug: campaign.slug,
    name: campaign.name,
    is_active: campaign.isActive,
    trigger_word: campaign.triggerWord,
    draw_date: campaign.drawDate,
    ended_message: campaign.isActive ? null : "ההגרלה הסתיימה, תודה רבה.",
  });
}
