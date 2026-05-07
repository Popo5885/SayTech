import { notFound } from "next/navigation";
import { prisma } from "@lottery/db";
import { auth } from "../../../../../auth";
import { DatabaseErrorState } from "../../../../../components/database-error-state";
import { ParticipantsView } from "../../../../../components/participants-view";
import { isDatabaseUnavailableError } from "../../../../../lib/safe-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const db = prisma as any;

function isSuperAdmin(session: any): boolean {
  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
  return session?.user?.globalRole === "SUPER_ADMIN" || session?.user?.email?.toLowerCase() === adminEmail;
}

async function getParticipantsData(campaignId: string, userId: string, superAdmin: boolean) {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      slug: true,
      isActive: true,
    },
  });

  if (!campaign) return null;

  if (!superAdmin) {
    const membership = await db.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: campaign.workspaceId,
        role: { in: ["OWNER", "ADMIN", "EDITOR", "VIEWER"] },
      },
    });
    if (!membership) return null;
  }

  const participants = await db.participant.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: {
      referrer: { select: { id: true, name: true, phone: true } },
    },
  });

  const baseUrl = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return {
    campaign,
    participants: participants.map((p: any) => ({
      id: p.id,
      name: p.name ?? null,
      phone: p.phone,
      tickets: p.tickets,
      referralsCount: p.referralsCount,
      referrerName: p.referrer?.name ?? null,
      referrerPhone: p.referrer?.phone ?? null,
      contactSavedConfirmed: p.contactSavedConfirmed,
      createdAt: p.createdAt.toISOString(),
      referralLink: `${baseUrl}/join/${campaign.slug}?ref=${p.referralCode}`,
    })),
  };
}

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;

  if (!userId) notFound();

  const superAdmin = isSuperAdmin(session);

  let data: Awaited<ReturnType<typeof getParticipantsData>> = null;

  try {
    data = await getParticipantsData(id, userId, superAdmin);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseErrorState retryHref={`/dashboard/raffle/${id}/participants`} />;
    }
    return (
      <DatabaseErrorState
        description="אירעה שגיאה בטעינת רשימת המשתתפים."
        retryHref={`/dashboard/raffle/${id}`}
        title="שגיאה בטעינת הרשימה"
      />
    );
  }

  if (!data) notFound();

  return <ParticipantsView campaignId={id} data={data} />;
}
