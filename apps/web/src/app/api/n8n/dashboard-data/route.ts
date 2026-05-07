/**
 * n8n Webhook: Dashboard Data Export
 *
 * Returns full participant list + stats for a campaign so n8n can
 * process bulk operations (mass contact-save, leaderboard updates, etc.)
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
  const onlyUnsaved = url.searchParams.get("only_unsaved") === "true";

  if (!campaignId) {
    return NextResponse.json({ error: "campaign_id חסר." }, { status: 422 });
  }

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, workspaceId: true, name: true, isActive: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "ההגרלה לא נמצאה." }, { status: 404 });
  }

  const whereClause: any = { campaignId };
  if (onlyUnsaved) whereClause.contactSavedConfirmed = false;

  const participants = await db.participant.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      phone: true,
      name: true,
      referralCode: true,
      tickets: true,
      referralsCount: true,
      contactSavedConfirmed: true,
      createdAt: true,
    },
  });

  const total = await db.participant.count({ where: { campaignId } });
  const saved = await db.participant.count({ where: { campaignId, contactSavedConfirmed: true } });

  return NextResponse.json({
    campaign_id: campaignId,
    campaign_name: campaign.name,
    workspace_id: campaign.workspaceId,
    is_active: campaign.isActive,
    stats: {
      total,
      saved,
      unsaved: total - saved,
    },
    participants: participants.map((p: any) => ({
      id: p.id,
      phone: `+${p.phone.replace(/^\+/, "")}`,
      name: p.name ?? null,
      display_name: p.name ? `${p.name} בוט` : "משתתף בוט",
      referral_code: p.referralCode,
      tickets: p.tickets,
      referrals_count: p.referralsCount,
      contact_saved: p.contactSavedConfirmed,
      created_at: p.createdAt,
    })),
  });
}
