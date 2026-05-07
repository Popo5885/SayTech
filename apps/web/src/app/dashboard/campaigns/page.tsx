import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@lottery/ui";
import { CampaignOverview } from "../../../components/campaign-overview";
import { CampaignSettingsEditor } from "../../../components/campaign-settings-editor";
import { DatabaseErrorState } from "../../../components/database-error-state";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { getPrimaryStore } from "../../../lib/live-store";
import { safeDbRead } from "../../../lib/safe-db";

export default async function DashboardCampaignsPage() {
  const result = await safeDbRead("dashboard:campaigns", async () => {
    return await getPrimaryStore();
  });

  if (!result.ok) {
    return <DatabaseErrorState retryHref="/dashboard/campaigns" />;
  }

  if (!result.data) {
    return (
      <EmptyWorkspaceState
        title="אין קמפיין פעיל"
        description="כל לקוח מקבל הגרלה אחת כברירת מחדל. רק מנהל המערכת יכול לפתוח הגרלות נוספות."
      />
    );
  }

  const store = result.data;

  return (
    <div className="space-y-6">
      <CampaignOverview campaign={store.campaign} />

      <CampaignSettingsEditor campaign={store.campaign} />

      <Card className="space-y-4">
        <CardTitle>כללי קמפיין</CardTitle>
        <CardDescription>
          לכל משתתף נשמר קישור אישי קבוע. המערכת מונעת הפניות כפולות והפניה עצמית,
          והמשתתפים יכולים לבדוק סטטוס אישי ישירות מ-WhatsApp.
        </CardDescription>
        <Link
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
          href={`/dashboard/raffle/${store.campaign.id}`}
        >
          <BarChart3 className="h-4 w-4" />
          מעבר לדשבורד ההגרלה החדש
        </Link>
      </Card>
    </div>
  );
}
