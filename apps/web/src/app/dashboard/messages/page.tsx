import { DatabaseErrorState } from "../../../components/database-error-state";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { MessagesShell } from "../../../components/messages-shell";
import { getConnectionSnapshot, getPrimaryStore, getTemplates } from "../../../lib/live-store";
import { safeDbRead } from "../../../lib/safe-db";

export default async function DashboardMessagesPage() {
  const result = await safeDbRead("dashboard:messages", async () => {
    const store = await getPrimaryStore();

    if (!store) {
      return null;
    }

    const [templates, snapshot] = await Promise.all([
      getTemplates(store.campaign.id),
      getConnectionSnapshot(store.connection.id)
    ]);

    return {
      campaignId: store.campaign.id,
      connectionStatus: snapshot.workerOnline ? snapshot.status : "disconnected",
      templates
    };
  });

  if (!result.ok) {
    return <DatabaseErrorState retryHref="/dashboard/messages" />;
  }

  if (!result.data) {
    return (
      <EmptyWorkspaceState
        title="אין הגרלה לעריכת הודעות"
        description="אחרי יצירת הגרלה אמיתית, עורך ה-Magic Flow יופיע כאן."
      />
    );
  }

  return (
    <MessagesShell
      campaignId={result.data.campaignId}
      connectionStatus={result.data.connectionStatus}
      initialTemplates={result.data.templates}
    />
  );
}
