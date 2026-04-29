import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "../../auth";
import { DashboardShell } from "../../components/dashboard-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardLayout({
  children
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

  return <DashboardShell>{children}</DashboardShell>;
}
