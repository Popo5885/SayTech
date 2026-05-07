/**
 * n8n Webhook: Participant Registered
 *
 * n8n calls this endpoint when a new participant joins via WhatsApp bot.
 * We create/update the participant record, check for referrals, and return
 * the referral link so n8n can send it back to the user.
 *
 * Security: protected by a shared secret header X-N8N-Secret matching
 * the N8N_WEBHOOK_SECRET env var.
 */
import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";

const db = prisma as any;

function verifySecret(request: Request): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return true; // allow if not configured (dev mode)
  return request.headers.get("x-n8n-secret") === secret;
}

function makeReferralCode(phone: string): string {
  const clean = phone.replace(/\D/g, "").slice(-8);
  return clean + Math.random().toString(36).slice(2, 5).toUpperCase();
}

export async function POST(request: Request) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין." }, { status: 400 });
  }

  const { campaign_id, phone, name, referral_code: incomingReferralCode } = body ?? {};

  if (!campaign_id || !phone) {
    return NextResponse.json(
      { error: "שדות חובה חסרים: campaign_id, phone." },
      { status: 422 }
    );
  }

  const campaign = await db.campaign.findUnique({
    where: { id: campaign_id },
    select: { id: true, workspaceId: true, isActive: true, slug: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "ההגרלה לא נמצאה." }, { status: 404 });
  }

  if (!campaign.isActive) {
    return NextResponse.json(
      { registered: false, reason: "ended", message: "ההגרלה הסתיימה, תודה רבה." },
      { status: 200 }
    );
  }

  // Resolve referrer
  let referrerId: string | null = null;
  if (incomingReferralCode) {
    const referrer = await db.participant.findUnique({
      where: { campaignId_referralCode: { campaignId: campaign_id, referralCode: incomingReferralCode } },
      select: { id: true },
    });
    referrerId = referrer?.id ?? null;
  }

  const baseUrl = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  // Upsert participant (idempotent — same phone + campaign = same record)
  const existing = await db.participant.findUnique({
    where: { campaignId_phone: { campaignId: campaign_id, phone } },
  });

  if (existing) {
    return NextResponse.json({
      registered: false,
      reason: "duplicate",
      message: "כבר רשום להגרלה.",
      participant_id: existing.id,
      referral_link: existing.referralLink,
      tickets: existing.tickets,
    });
  }

  const referralCode = makeReferralCode(phone);
  const referralLink = `${baseUrl}/join/${campaign.slug}?ref=${referralCode}`;

  const participant = await db.participant.create({
    data: {
      campaignId: campaign_id,
      phone,
      name: name ?? null,
      referralCode,
      referralLink,
      referrerId,
      tickets: 1,
    },
  });

  // Award referrer a bonus ticket
  if (referrerId) {
    await db.participant.update({
      where: { id: referrerId },
      data: { tickets: { increment: 1 }, referralsCount: { increment: 1 } },
    });
  }

  return NextResponse.json({
    registered: true,
    participant_id: participant.id,
    referral_code: referralCode,
    referral_link: referralLink,
    tickets: participant.tickets,
    message: `נרשמת בהצלחה להגרלה! הקישור האישי שלך: ${referralLink}`,
  });
}
