/**
 * n8n Webhook: Contact Saved
 *
 * Called by n8n after successfully saving a contact to Google Contacts.
 * Updates contactSavedConfirmed on the participant and the ContactSyncLedger.
 */
import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";

const db = prisma as any;

function verifySecret(request: Request): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return true;
  return request.headers.get("x-n8n-secret") === secret;
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

  const {
    campaign_id,
    phone,
    name,
    google_person_resource_name,
    workspace_id,
  } = body ?? {};

  if (!campaign_id || !phone) {
    return NextResponse.json(
      { error: "שדות חובה חסרים: campaign_id, phone." },
      { status: 422 }
    );
  }

  // Update participant
  const participant = await db.participant.findUnique({
    where: { campaignId_phone: { campaignId: campaign_id, phone } },
    select: { id: true, campaignId: true },
  });

  if (participant) {
    await db.participant.update({
      where: { id: participant.id },
      data: { contactSavedConfirmed: true },
    });
  }

  // Upsert contact sync ledger
  if (workspace_id) {
    const displayName = name
      ? `${name} בוט`
      : "משתתף בוט";

    await db.contactSyncLedger.upsert({
      where: { workspaceId_phone: { workspaceId: workspace_id, phone } },
      create: {
        workspaceId: workspace_id,
        phone: `+${phone.replace(/^\+/, "")}`,
        displayName,
        lastCampaignId: campaign_id,
        status: google_person_resource_name ? "synced_google" : "saved_system",
        googlePersonResourceName: google_person_resource_name ?? null,
        syncedAt: new Date(),
      },
      update: {
        displayName,
        lastCampaignId: campaign_id,
        status: google_person_resource_name ? "synced_google" : "saved_system",
        googlePersonResourceName: google_person_resource_name ?? null,
        syncedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true, message: "סטטוס איש הקשר עודכן בהצלחה." });
}
