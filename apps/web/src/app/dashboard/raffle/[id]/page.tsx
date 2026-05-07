import { notFound } from "next/navigation";
import { DatabaseErrorState } from "../../../../components/database-error-state";
import { RaffleDashboard } from "../../../../components/raffle-dashboard";
import { getRaffleDashboardData } from "../../../../lib/live-store";
import type { RaffleDashboardData } from "../../../../lib/raffle-dashboard-types";
import { isDatabaseUnavailableError } from "../../../../lib/safe-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RaffleDashboardPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let data: RaffleDashboardData | null = null;

  try {
    data = await getRaffleDashboardData(id);
  } catch (error) {
    console.error("[dashboard:raffle]", error);

    if (isDatabaseUnavailableError(error)) {
      return <DatabaseErrorState retryHref={`/dashboard/raffle/${id}`} />;
    }

    return (
      <DatabaseErrorState
        title="לא ניתן לפתוח את דשבורד ההגרלה"
        description="המערכת לא הצליחה לטעון את ההגרלה או שאין הרשאה לצפות בה. הפרטים הטכניים נשמרו בלוג השרת."
        retryHref="/dashboard"
      />
    );
  }

  if (!data) {
    notFound();
  }

  return <RaffleDashboard data={data} />;
}
