import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@lottery/db";
import { auth } from "../../auth";
import { DashboardShell } from "../../components/dashboard-shell";
import type { WorkspaceSummary } from "../../lib/rbac";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const db = prisma as any;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const user = session.user as any;

  if (user.accountStatus !== "active") {
    redirect("/waiting-room");
  }

  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
  const isSuperAdmin =
    user.globalRole === "SUPER_ADMIN" || user.email?.toLowerCase() === adminEmail;
  const adminWorkspaceId = (await cookies()).get("admin_workspace_id")?.value;

  if (isSuperAdmin && !adminWorkspaceId) {
    redirect("/admin");
  }

  const userId = user.id ? String(user.id) : null;

  let workspaces: WorkspaceSummary[] = [];
  let activeWorkspaceId: string | null = null;

  if (userId && !isSuperAdmin) {
    try {
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

      workspaces = (memberships as any[]).map((m) => ({
        workspaceId: m.workspaceId,
        workspaceName: m.workspace.name,
        ownerEmail: m.workspace.ownerEmail ?? null,
        role: m.role,
        accountStatus: m.workspace.accountStatus,
      }));

      const cookieStore = await cookies();
      const cookieWs = cookieStore.get("active_workspace_id")?.value ?? null;
      activeWorkspaceId =
        cookieWs && workspaces.some((w) => w.workspaceId === cookieWs)
          ? cookieWs
          : (workspaces[0]?.workspaceId ?? null);
    } catch {
      // non-fatal: switcher will just be empty
    }
  }

  return (
    <DashboardShell
      activeWorkspaceId={activeWorkspaceId}
      currentUserEmail={user.email ?? undefined}
      currentUserName={user.name ?? user.fullName ?? undefined}
      workspaces={workspaces}
    >
      {children}
    </DashboardShell>
  );
}
