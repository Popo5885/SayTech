import { redirect } from "next/navigation";
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
    redirect("/pending");
  }

  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
  const isSuperAdmin =
    user.globalRole === "SUPER_ADMIN" || user.email?.toLowerCase() === adminEmail;

  return <DashboardShell isSuperAdmin={isSuperAdmin}>{children}</DashboardShell>;
}
