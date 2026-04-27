import type { Campaign, Workspace } from "@lottery/core/domain";
import { Badge, Card, CardDescription, CardTitle, Input } from "@lottery/ui";

export function ContactsSyncCard({
  workspace,
  campaign,
  syncedContactsCount,
  checkedContactsCount,
  latestSync
}: {
  workspace: Workspace;
  campaign: Campaign;
  syncedContactsCount: number;
  checkedContactsCount: number;
  latestSync: string | null;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]" dir="rtl">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>סנכרון Google Contacts</CardTitle>
          <Badge tone={syncedContactsCount > 0 ? "success" : "warning"}>
            {syncedContactsCount > 0 ? "מסונכרן" : "ממתין לחיבור Google"}
          </Badge>
        </div>
        <CardDescription>
          רק משתתפים שסיימו הרשמה נכנסים לאנשי הקשר. אם Google לא מחובר, המערכת עדיין
          מאפשרת להוריד קובץ אנשי קשר ידני בפורמט `.vcf`.
        </CardDescription>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">סונכרנו</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">{syncedContactsCount}</p>
          </div>
          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">נבדקו</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">{checkedContactsCount}</p>
          </div>
          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">תגית</p>
            <p className="mt-2 text-sm font-semibold text-stone-950">{campaign.contactTagName}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5 text-sm leading-6 text-stone-700">
          <p>Workspace: {workspace.name}</p>
          <p className="mt-2">
            סנכרון אחרון: {latestSync ? new Date(latestSync).toLocaleString("he-IL") : "עדיין לא בוצע"}
          </p>
          <p className="mt-2">
            פורמט טלפון לשמירה: <code dir="ltr">+{"{{contact_phone}}"}</code>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            href="/api/google/connect"
          >
            חבר חשבון Google
          </a>
          <a
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            href="/api/contacts/export"
          >
            הורד קובץ אנשי קשר
          </a>
        </div>
      </Card>

      <Card className="space-y-5">
        <CardTitle>איך המשתתף שומר איש קשר?</CardTitle>
        <CardDescription>
          עד שני אנשי קשר אפשר לשלוח כהודעות/כרטיסי קשר. מעל שני אנשי קשר, המערכת תשלח
          קובץ `.vcf` אחד שהלקוח יכול לפתוח ולשמור בלחיצה.
        </CardDescription>

        <label className="space-y-2 text-sm font-medium text-stone-700">
          תבנית שם לאנשי קשר
          <Input defaultValue="{{name}} - Magic Flow" />
        </label>

        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
          כל Workspace רואה רק את הנתונים שלו. גם Google Contacts וגם קובץ הייצוא נוצרים מתוך
          משתתפים מאושרים בלבד, כדי שלא ייכנסו אנשי קשר חצי-רשומים.
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5 text-sm leading-6 text-stone-700">
          <p className="font-semibold text-stone-900">דוגמה לכרטיס קשר</p>
          <p className="mt-2">שם: {"{{name}} - Magic Flow"}</p>
          <p dir="ltr">טלפון: +{"{{contact_phone}}"}</p>
        </div>
      </Card>
    </div>
  );
}
