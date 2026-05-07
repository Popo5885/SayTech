import { AnalyticsPanel } from "../../../components/analytics-panel";
import { DatabaseErrorState } from "../../../components/database-error-state";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { getDashboardStats, getPrimaryStore } from "../../../lib/live-store";
import { safeDbRead } from "../../../lib/safe-db";

export default async function DashboardAnalyticsPage() {
  const result = await safeDbRead("dashboard:analytics", async () => {
    const store = await getPrimaryStore();

    if (!store) {
      return null;
    }

    return {
      store,
      stats: await getDashboardStats(store.campaign.id)
    };
  });

  if (!result.ok) {
    return <DatabaseErrorState retryHref="/dashboard/analytics" />;
  }

  if (!result.data) {
    return (
      <EmptyWorkspaceState
        title="אין נתוני הגרלה עדיין"
        description="לא מוצגים מספרים מומצאים. כשתהיה הגרלה פעילה עם משתתפים אמיתיים, הנתונים יופיעו כאן."
      />
    );
  }

  return (
    <AnalyticsPanel
      campaignId={result.data.store.campaign.id}
      initialStats={result.data.stats}
    />
  );
}
