import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { auth } from "../../../../../auth";
import { sendSystemEmail } from "../../../../../lib/email";
import { buildRaffleStoppedEmail } from "../../../../../lib/email-templates";

const db = prisma as any;
const BASE_URL = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

function sessionUserId(session: any): string | null {
  return session?.user?.id ? String(session?.user?.id) : null;
}

function isSuperAdmin(session: any): boolean {
  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
  return session?.user?.globalRole === "SUPER_ADMIN" || session?.user?.email?.toLowerCase() === adminEmail;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  const userId = sessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "לא מחובר." }, { status: 401 });
  }

  const { campaignId } = await params;

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, workspaceId: true, isActive: true, name: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "ההגרלה לא נמצאה." }, { status: 404 });
  }

  if (!isSuperAdmin(session)) {
    const membership = await db.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: campaign.workspaceId,
        role: { in: ["OWNER", "ADMIN", "AGENCY_MANAGER"] },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "אין הרשאה לפעולה זו." }, { status: 403 });
    }
  }

  if (!campaign.isActive) {
    return NextResponse.json({ error: "ההגרלה כבר הסתיימה." }, { status: 409 });
  }

  // Fetch stats before marking ended (for email summary)
  const [totalParticipants, totalTickets, savedCount] = await Promise.all([
    db.participant.count({ where: { campaignId } }),
    db.participant.aggregate({ where: { campaignId }, _sum: { tickets: true } }),
    db.participant.count({ where: { campaignId, contactSavedConfirmed: true } }),
  ]);

  // End campaign
  await db.campaign.update({
    where: { id: campaignId },
    data: { isActive: false },
  });

  await db.adminAuditLog.create({
    data: {
      actorUserId: userId,
      action: "CAMPAIGN_ENDED",
      targetType: "Campaign",
      targetId: campaignId,
      metadata: { campaignName: campaign.name },
    },
  });

  // Send confirmation email to workspace owner — fire-and-forget
  void (async () => {
    try {
      const workspace = await db.workspace.findUnique({
        where: { id: campaign.workspaceId },
        select: { ownerEmail: true, ownerName: true, name: true },
      });

      const ownerEmail = workspace?.ownerEmail;
      if (!ownerEmail) return;

      const user = await db.user.findUnique({
        where: { email: ownerEmail },
        select: { unsubscribeToken: true, fullName: true, name: true },
      });

      const html = buildRaffleStoppedEmail({
        recipientName: user?.fullName ?? user?.name ?? workspace?.ownerName ?? "לקוח יקר",
        recipientEmail: ownerEmail,
        campaignName: campaign.name,
        totalParticipants,
        totalTickets: totalTickets._sum?.tickets ?? 0,
        totalSaved: savedCount,
        dashboardUrl: `${BASE_URL}/dashboard/raffle/${campaignId}`,
        unsubscribeUrl: user?.unsubscribeToken
          ? `${BASE_URL}/unsubscribe/${user.unsubscribeToken}`
          : `${BASE_URL}/unsubscribe`,
      });

      await sendSystemEmail({
        to: ownerEmail,
        subject: `ההגרלה "${campaign.name}" הופסקה בהצלחה | SayTech`,
        html,
      });
    } catch (err) {
      console.error("[campaign-end:email-failed]", err);
    }
  })();

  // Notify n8n — best-effort
  const n8nEndRaffleUrl = process.env.N8N_END_RAFFLE_WEBHOOK_URL;
  if (n8nEndRaffleUrl) {
    try {
      await fetch(n8nEndRaffleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          campaignName: campaign.name,
          workspaceId: campaign.workspaceId,
          endedAt: new Date().toISOString(),
        }),
      });
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({ ok: true, message: "ההגרלה הסתיימה בהצלחה." });
}
