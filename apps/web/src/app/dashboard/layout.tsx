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

  if ((session.user as any).accountStatus !== "active") {
    redirect("/pending");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
