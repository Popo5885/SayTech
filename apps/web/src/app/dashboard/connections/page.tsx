import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { QrConnectionCard } from "../../../components/qr-connection-card";
import { ZeroTouchConnectionCard } from "../../../components/zero-touch-connection-card";
import { auth } from "../../../auth";
import { ownerEmail } from "../../../lib/email";
import { getConnectionSnapshot, getPrimaryStore } from "../../../lib/live-store";

export default async function DashboardConnectionsPage() {
  const store = await getPrimaryStore();

  if (!store) {
    return (
      <EmptyWorkspaceState
        title="אין חיבור להצגה"
        description="אחרי שהחשבון יופעל ויוקצה לו מספר WhatsApp Official, יופיע כאן סטטוס חיבור מוכן. אין צורך לבצע פעולה טכנית."
      />
    );
  }

  const snapshot = await getConnectionSnapshot(store.connection.id);
  const session = await auth();
  const adminEmail = ownerEmail().toLowerCase();
  const isAdmin =
    (session?.user as any)?.globalRole === "SUPER_ADMIN" ||
    session?.user?.email?.toLowerCase() === adminEmail;

  if (isAdmin) {
    const adminSnapshot = await getConnectionSnapshot(store.connection.id, { includeSensitive: true });
    return <QrConnectionCard initialSnapshot={adminSnapshot} />;
  }

  return <ZeroTouchConnectionCard snapshot={snapshot} workspace={store.workspace} />;
}
