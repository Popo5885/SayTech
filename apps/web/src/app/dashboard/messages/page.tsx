import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { MessageEditor } from "../../../components/message-editor";
import { getConnectionSnapshot, getPrimaryStore, getTemplates } from "../../../lib/demo-store";

export default async function DashboardMessagesPage() {
  const store = await getPrimaryStore();

  if (!store) {
    return (
      <EmptyWorkspaceState
        title="אין קמפיין לעריכת הודעות"
        description="עורך ה-Magic Flow יוצג אחרי יצירת Workspace וקמפיין אמיתי במסד הנתונים."
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
