import { DatabaseErrorState } from "../../components/database-error-state";
import { EmptyWorkspaceState } from "../../components/empty-workspace-state";
import { SimpleDashboard } from "../../components/simple-dashboard";
import {
  getConnectionSnapshot,
  getDashboardStats,
  getPrimaryStore
} from "../../lib/live-store";
import { safeDbRead } from "../../lib/safe-db";

export default async function DashboardPage() {
  const result = await safeDbRead("dashboard:home", async () => {
    const store = await getPrimaryStore();

    if (!store) {
      return null;
    }

    const [stats, connectionSnapshot] = await Promise.all([
      getDashboardStats(store.campaign.id),
      getConnectionSnapshot(store.connection.id)
    ]);

    return {
      store,
      stats,
      connectionSnapshot
    };
  });

  if (!result.ok) {
    return <DatabaseErrorState retryHref="/dashboard" />;
  }

  if (!result.data) {
    return <EmptyWorkspaceState />;
  }

  const { connectionSnapshot, stats, store } = result.data;

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
