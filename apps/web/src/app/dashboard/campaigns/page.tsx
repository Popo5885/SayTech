import { CampaignOverview } from "../../../components/campaign-overview";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { Card, CardDescription, CardTitle } from "@lottery/ui";
import { getPrimaryStore } from "../../../lib/demo-store";

export default async function DashboardCampaignsPage() {
  const store = await getPrimaryStore();

  if (!store) {
    return (
      <EmptyWorkspaceState
        title="אין קמפיין פעיל"
        description="כל לקוח מקבל הגרלה אחת כברירת מחדל. רק SuperAdmin יכול לפתוח קמפיינים נוספים."
      />
    );
  }

  return (
    <div className="space-y-6">
      <CampaignOverview campaign={store.campaign} />

      <Card className="space-y-3">
        <CardTitle>כללי קמפיין</CardTitle>
        <CardDescription>
          לכל משתתף נשמר קישור אישי יציב, הפניות כפולות וניסיונות self-referral נחסמים
          בצד השרת, ומשתתפים יכולים לבקש סטטוס אישי ישירות מ-WhatsApp.
        </CardDescription>
      </Card>
    </div>
  );
}
