import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { auth } from "../../../../../auth";

const db = prisma as any;

function sessionUserId(session: any): string | null {
  return session?.user?.id ? String(session.user.id) : null;
}

function isSuperAdmin(session: any): boolean {
  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
  return session?.user?.globalRole === "SUPER_ADMIN" || session?.user?.email?.toLowerCase() === adminEmail;
}

function escapeCsv(value: string | null | undefined): string {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const session = await auth();
  const userId = sessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "לא מחובר." }, { status: 401 });
  }

  const { campaignId } = await params;
  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "all"; // "all" | "saved" | "unsaved"

  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, workspaceId: true, name: true, slug: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "ההגרלה לא נמצאה." }, { status: 404 });
  }

  if (!isSuperAdmin(session)) {
    const membership = await db.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: campaign.workspaceId,
        role: { in: ["OWNER", "ADMIN", "EDITOR", "VIEWER"] },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "אין הרשאה לפעולה זו." }, { status: 403 });
    }
  }

  const whereClause: any = { campaignId };
  if (filter === "saved") whereClause.contactSavedConfirmed = true;
  if (filter === "unsaved") whereClause.contactSavedConfirmed = false;

  const participants = await db.participant.findMany({
    where: whereClause,
    orderBy: { createdAt: "asc" },
    include: {
      referrer: { select: { name: true, phone: true } },
    },
  });

  const baseUrl = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const header = "שם מלא,טלפון,כרטיסים,הפניות,מי הפנה,שמר איש קשר,תאריך הרשמה,קישור אישי\n";
  const rows = participants.map((p: any) => {
    const date = new Date(p.createdAt).toLocaleDateString("he-IL");
    const referredBy = p.referrer ? `${p.referrer.name ?? ""}(${p.referrer.phone})` : "";
    const link = `${baseUrl}/join/${campaign.slug}?ref=${p.referralCode}`;
    return [
      escapeCsv(p.name),
      escapeCsv(p.phone),
      p.tickets,
      p.referralsCount,
      escapeCsv(referredBy),
      p.contactSavedConfirmed ? "כן" : "לא",
      date,
      escapeCsv(link),
    ].join(",");
  });

  const csv = "﻿" + header + rows.join("\n"); // BOM for Excel Hebrew support

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": `attachment; filename="${campaign.slug}-participants.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
