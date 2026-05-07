import { auth } from "../../../auth";
import { DatabaseErrorState } from "../../../components/database-error-state";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { QrConnectionCard } from "../../../components/qr-connection-card";
import { ZeroTouchConnectionCard } from "../../../components/zero-touch-connection-card";
import { ownerEmail } from "../../../lib/email";
import { getConnectionSnapshot, getPrimaryStore } from "../../../lib/live-store";
import { safeDbRead } from "../../../lib/safe-db";

export default async function DashboardConnectionsPage() {
  const result = await safeDbRead("dashboard:connections", async () => {
    const store = await getPrimaryStore();

    if (!store) {
      return null;
    }

    const session = await auth();
    const adminEmail = ownerEmail().toLowerCase();
    const isAdmin =
      (session?.user as any)?.globalRole === "SUPER_ADMIN" ||
      session?.user?.email?.toLowerCase() === adminEmail;
    const snapshot = await getConnectionSnapshot(store.connection.id, {
      includeSensitive: isAdmin
    });

    return {
      isAdmin,
      snapshot,
      workspace: store.workspace
    };
  });

  if (!result.ok) {
    return <DatabaseErrorState retryHref="/dashboard/connections" />;
  }

  if (!result.data) {
    return (
      <EmptyWorkspaceState
        title="אין חיבור להצגה"
        description="אחרי שהחשבון יופעל ויוקצה לו מספר WhatsApp Official, יופיע כאן סטטוס חיבור מוכן."
      />
    );
  }

  if (result.data.isAdmin) {
    return <QrConnectionCard initialSnapshot={result.data.snapshot} />;
  }

  return (
    <ZeroTouchConnectionCard
      snapshot={result.data.snapshot}
      workspace={result.data.workspace}
    />
  );
}
