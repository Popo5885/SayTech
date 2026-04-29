import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { ZeroTouchConnectionCard } from "../../../components/zero-touch-connection-card";
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

  return <ZeroTouchConnectionCard snapshot={snapshot} workspace={store.workspace} />;
}
