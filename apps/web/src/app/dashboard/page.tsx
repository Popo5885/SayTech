import { EmptyWorkspaceState } from "../../components/empty-workspace-state";
import { SimpleDashboard } from "../../components/simple-dashboard";
import {
  getConnectionSnapshot,
  getDashboardStats,
  getPrimaryStore
} from "../../lib/live-store";

export default async function DashboardPage() {
  const store = await getPrimaryStore();

  if (!store) {
    return <EmptyWorkspaceState />;
  }

  const stats = await getDashboardStats(store.campaign.id);
  const connectionSnapshot = await getConnectionSnapshot(store.connection.id);

  return (
    <SimpleDashboard
      campaignId={store.campaign.id}
      initialCampaign={store.campaign}
      initialConnectionSnapshot={connectionSnapshot}
      initialParticipants={store.participants}
      initialStats={stats}
    />
  );
}
