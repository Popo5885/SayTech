import { CampaignOverview } from "../../../components/campaign-overview";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { Card, CardDescription, CardTitle } from "@lottery/ui";
import { getPrimaryStore } from "../../../lib/live-store";

export default async function DashboardCampaignsPage() {
  const store = await getPrimaryStore();

  if (!store) {
    return (
      <EmptyWorkspaceState
        title="אין קמפיין פעיל"
        description="כל לקוח מקבל הגרלה אחת כברירת מחדל. רק מנהל המערכת יכול לפתוח הגרלות נוספות."
      />
    );
  }

  return (
    <div className="space-y-6">
      <CampaignOverview campaign={store.campaign} />

      <Card className="space-y-3">
        <CardTitle>כללי קמפיין</CardTitle>
        <CardDescription>
          לכל משתתף נשמר קישור אישי קבוע. המערכת מונעת הפניות כפולות והפניה עצמית,
          והמשתתפים יכולים לבדוק סטטוס אישי ישירות מ-WhatsApp.
        </CardDescription>
      </Card>
    </div>
  );
}
