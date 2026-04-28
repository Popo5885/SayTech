import { AnalyticsPanel } from "../../../components/analytics-panel";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { getDashboardStats, getPrimaryStore } from "../../../lib/live-store";

export default async function DashboardAnalyticsPage() {
  const store = await getPrimaryStore();

  if (!store) {
    return (
      <EmptyWorkspaceState
        title="אין נתוני הגרלה עדיין"
        description="לא מוצגים מספרים מומצאים. כשתהיה הגרלה פעילה עם משתתפים אמיתיים, הנתונים יופיעו כאן."
      />
    );
  }

  const stats = await getDashboardStats(store.campaign.id);

  return <AnalyticsPanel campaignId={store.campaign.id} initialStats={stats} />;
}
