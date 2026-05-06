import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { auth } from "../../../auth";
import { rateLimitByIpAndUser } from "../../../lib/rate-limit";

const db = prisma as any;

async function getWorkspaceForCurrentUser() {
  const session = await auth();
  const user = session?.user as any;
  const userId = user?.id ? String(user.id) : null;

  if (!userId) {
    return null;
  }

  const membership = await db.workspaceMember.findFirst({
    where: {
      userId,
      workspace: {
        accountStatus: "active"
      }
    },
    include: {
      workspace: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!membership?.workspace) {
    return null;
  }

  return {
    userId,
    workspace: membership.workspace
  };
}

export async function GET() {
  const context = await getWorkspaceForCurrentUser();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    onboardingTourStep: context.workspace.onboardingTourStep ?? 0,
    onboardingTourCompletedAt: context.workspace.onboardingTourCompletedAt?.toISOString() ?? null
  });
}

export async function POST() {
  const context = await getWorkspaceForCurrentUser();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await db.workspace.update({
    where: {
      id: context.workspace.id
    },
    data: {
      onboardingTourStep: Math.max(context.workspace.onboardingTourStep ?? 0, 1)
    }
  });

  return NextResponse.json({
    onboardingTourStep: workspace.onboardingTourStep,
    onboardingTourCompletedAt: workspace.onboardingTourCompletedAt?.toISOString() ?? null
  });
}

export async function PATCH(request: Request) {
  const context = await getWorkspaceForCurrentUser();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tooMany = rateLimitByIpAndUser({
    request,
    userId: context.userId,
    scope: "onboarding-tour",
    ipLimit: 30,
    userLimit: 60,
    windowMs: 60_000
  });
  if (tooMany) return tooMany;

  const body = (await request.json().catch(() => ({}))) as {
    step?: number;
    completed?: boolean;
  };
  const step = Math.max(0, Math.min(12, Number(body.step ?? 0)));
  const completed = Boolean(body.completed);

  const workspace = await db.workspace.update({
    where: {
      id: context.workspace.id
    },
    data: {
      onboardingTourStep: completed ? 12 : step,
      onboardingTourCompletedAt: completed ? new Date() : undefined
    }
  });

  if (completed) {
    await db.adminAuditLog.create({
      data: {
        actorUserId: context.userId,
        action: "ONBOARDING_TOUR_COMPLETED",
        targetType: "Workspace",
        targetId: context.workspace.id,
        metadata: {
          completedAt: new Date().toISOString()
        }
      }
    });
  }

  return NextResponse.json({
    onboardingTourStep: workspace.onboardingTourStep,
    onboardingTourCompletedAt: workspace.onboardingTourCompletedAt?.toISOString() ?? null
  });
}
