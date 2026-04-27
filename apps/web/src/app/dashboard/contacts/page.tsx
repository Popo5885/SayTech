import { ContactsSyncCard } from "../../../components/contacts-sync-card";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { getContactsOverview, getPrimaryStore } from "../../../lib/demo-store";

export default async function DashboardContactsPage() {
  const store = await getPrimaryStore();

  if (!store) {
    return (
      <EmptyWorkspaceState
        title="אין אנשי קשר לסנכרון"
        description="סנכרון Google Contacts וייצוא vCard יופיעו אחרי שיוגדר Workspace וקמפיין אמיתי."
      />
    );
  }

  const overview = await getContactsOverview();

  return <ContactsSyncCard {...overview} />;
}
