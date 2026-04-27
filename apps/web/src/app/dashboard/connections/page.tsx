import { Card, CardDescription, CardTitle } from "@lottery/ui";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import { QrConnectionCard } from "../../../components/qr-connection-card";
import { getConnectionSnapshot, getPrimaryStore } from "../../../lib/demo-store";

export default async function DashboardConnectionsPage() {
  const store = await getPrimaryStore();

  if (!store) {
    return (
      <EmptyWorkspaceState
        title="אין חיבור WhatsApp להצגה"
        description="רק אחרי ש-SuperAdmin יאשר את החשבון וישייך מספר, יופיע כאן חיבור אמיתי לסריקה או ל-Cloud API."
      />
    );
  }

  const snapshot = await getConnectionSnapshot(store.connection.id);

  return (
    <div className="space-y-6">
      <QrConnectionCard initialSnapshot={snapshot} />

      <Card>
        <CardTitle>איך מתחברים?</CardTitle>
        <CardDescription className="mt-3 max-w-3xl text-base leading-7">
          במסלול QR פותחים את WhatsApp בטלפון, נכנסים ל-Linked Devices וסורקים את הקוד
          שמגיע מה-Worker. במסלול הרשמי מחברים WhatsApp Business Cloud עם פרטי Meta
          מוצפנים, בלי להציג מצב מחובר לפני שהשרת מאמת את החיבור.
        </CardDescription>
      </Card>
    </div>
  );
}
