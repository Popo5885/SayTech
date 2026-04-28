import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { MessageEditor } from "../../../components/message-editor";
import { getConnectionSnapshot, getPrimaryStore, getTemplates } from "../../../lib/live-store";

export default async function DashboardMessagesPage() {
  const store = await getPrimaryStore();

  if (!store) {
    return (
      <EmptyWorkspaceState
        title="אין הגרלה לעריכת הודעות"
        description="אחרי יצירת הגרלה אמיתית, עורך ה-Magic Flow יופיע כאן."
      />
    );
  }

  const templates = await getTemplates(store.campaign.id);
  const snapshot = await getConnectionSnapshot(store.connection.id);

  return (
    <MessageEditor
      campaignId={store.campaign.id}
      connectionStatus={snapshot.workerOnline ? snapshot.status : "disconnected"}
      initialTemplates={templates}
    />
  );
}
