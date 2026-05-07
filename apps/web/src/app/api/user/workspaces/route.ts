import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { auth } from "../../../../auth";
import type { WorkspaceSummary } from "../../../../lib/rbac";

const db = prisma as any;

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id ? String((session.user as any).id) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db.workspaceMember.findMany({
    where: { userId },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          ownerEmail: true,
          accountStatus: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const cookieStore = await cookies();
  const activeWorkspaceId = cookieStore.get("active_workspace_id")?.value ?? null;

  const workspaces: WorkspaceSummary[] = memberships.map((m: any) => ({
    workspaceId: m.workspaceId,
    workspaceName: m.workspace.name,
    ownerEmail: m.workspace.ownerEmail ?? null,
    role: m.role,
    accountStatus: m.workspace.accountStatus,
  }));

  const resolvedActiveId =
    activeWorkspaceId && workspaces.some((w) => w.workspaceId === activeWorkspaceId)
      ? activeWorkspaceId
      : (workspaces[0]?.workspaceId ?? null);

  return NextResponse.json({ workspaces, activeWorkspaceId: resolvedActiveId });
}
