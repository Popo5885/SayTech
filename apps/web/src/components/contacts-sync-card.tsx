import type { Campaign, ContactSyncLedgerEntry, Workspace } from "@lottery/core/domain";
import { Badge, Card, CardDescription, CardTitle, Input } from "@lottery/ui";

function money(cents: number) {
  return `${(cents / 100).toLocaleString("he-IL")} ₪`;
}

export function ContactsSyncCard({
  workspace,
  campaign,
  entries,
  syncedContactsCount,
  systemContactsCount,
  duplicateContactsCount,
  pendingContactsCount,
  checkedContactsCount,
  latestSync,
  quota,
  requestQuotaUpgradeAction,
  sendVcfToEmailAction
}: {
  workspace: Workspace;
  campaign: Campaign;
  entries: ContactSyncLedgerEntry[];
  syncedContactsCount: number;
  systemContactsCount: number;
  duplicateContactsCount: number;
  pendingContactsCount: number;
  checkedContactsCount: number;
  latestSync: string | null;
  quota: {
    baseQuota: number;
    extraQuota: number;
    usedQuota: number;
    quotaLimit: number;
    quotaRemaining: number;
    monthlyPriceCents: number;
  };
  requestQuotaUpgradeAction: (formData: FormData) => Promise<void>;
  sendVcfToEmailAction: () => Promise<void>;
}) {
  const usagePercent =
    quota.quotaLimit > 0 ? Math.min(100, Math.round((quota.usedQuota / quota.quotaLimit) * 100)) : 0;
  const googleConnected = syncedContactsCount > 0 || Boolean(latestSync);
  const quotaIsFull = quota.quotaRemaining <= 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]" dir="rtl">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>בוט שמירת אנשי קשר</CardTitle>
          <Badge tone={quotaIsFull ? "warning" : "success"}>
            {quota.usedQuota.toLocaleString("he-IL")} מתוך {quota.quotaLimit.toLocaleString("he-IL")}
          </Badge>
        </div>
        <CardDescription>
          המסלול הפעיל כולל {quota.baseQuota.toLocaleString("he-IL")} אנשי קשר במחיר {money(quota.monthlyPriceCents)} לחודש. כל תוספת של 100 אנשי קשר עולה 5 ₪.
        </CardDescription>

        <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-center justify-between text-sm font-black text-stone-700">
            <span>ניצול מכסה</span>
            <span>{usagePercent}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200">
            <div
              className={`h-full rounded-full ${quotaIsFull ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-stone-600">
            נותרו {quota.quotaRemaining.toLocaleString("he-IL")} אנשי קשר זמינים. תוספות מאושרות: {quota.extraQuota.toLocaleString("he-IL")}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-[24px] border border-stone-200 bg-white p-4">
            <p className="text-xs font-black text-stone-500">נשמרו</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">{quota.usedQuota}</p>
          </div>
          <div className="rounded-[24px] border border-stone-200 bg-white p-4">
            <p className="text-xs font-black text-stone-500">Google</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">{syncedContactsCount}</p>
          </div>
          <div className="rounded-[24px] border border-stone-200 bg-white p-4">
            <p className="text-xs font-black text-stone-500">במערכת</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">{systemContactsCount}</p>
          </div>
          <div className="rounded-[24px] border border-stone-200 bg-white p-4">
            <p className="text-xs font-black text-stone-500">כפילויות</p>
            <p className="mt-2 text-3xl font-semibold text-stone-950">{duplicateContactsCount}</p>
          </div>
        </div>

        {quotaIsFull || pendingContactsCount > 0 ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950">
            יש אנשי קשר שממתינים בגלל מכסה מלאה או סנכרון שעדיין לא הושלם. הנתונים נשמרים במערכת ולא נמחקים.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
            href="/api/google/connect"
          >
            חבר Google Contacts
          </a>
          <a
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            href="/api/contacts/export"
          >
            הורד VCF
          </a>
          <form action={sendVcfToEmailAction}>
            <button className="h-11 rounded-2xl border border-cyan-300 bg-white px-4 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50" type="submit">
              שלח VCF למייל
            </button>
          </form>
        </div>
      </Card>

      <Card className="space-y-5">
        <CardTitle>הגדרות ושדרוג</CardTitle>
        <CardDescription>
          אם Google Contacts לא מחובר, הבוט עדיין שומר אנשי קשר במערכת. אפשר להוריד אותם כקובץ VCF או לשלוח למייל.
        </CardDescription>

        <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5 text-sm leading-6 text-stone-700">
          <p className="font-black text-stone-950">סטטוס חיבור</p>
          <p className="mt-2">{googleConnected ? "Google Contacts מחובר ומוכן לסנכרון." : "Google Contacts לא מחובר. נשמור את אנשי הקשר במערכת בלבד."}</p>
          <p className="mt-2">סנכרון אחרון: {latestSync ? new Date(latestSync).toLocaleString("he-IL") : "עדיין לא בוצע"}</p>
        </div>

        <label className="space-y-2 text-sm font-medium text-stone-700">
          תבנית שם לאיש קשר
          <Input defaultValue="{{name}}+בוט" readOnly />
        </label>

        <form action={requestQuotaUpgradeAction} className="rounded-[28px] border border-violet-200 bg-violet-50 p-5">
          <p className="font-black text-violet-950">שדרוג מכסה</p>
          <p className="mt-2 text-sm leading-6 text-violet-900">
            בחר כמה חבילות להוסיף. כל חבילה מוסיפה 100 אנשי קשר בעלות 5 ₪.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              className="h-11 w-28 rounded-2xl border border-violet-200 bg-white px-4 text-center text-sm font-black text-violet-950 outline-none focus:border-violet-500"
              defaultValue="1"
              min="1"
              name="packs"
              type="number"
            />
            <button className="h-11 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white transition hover:bg-violet-700" type="submit">
              בקש שדרוג
            </button>
          </div>
        </form>

        <div className="rounded-[28px] border border-stone-200 bg-white p-5 text-sm leading-6 text-stone-700">
          <p className="font-semibold text-stone-900">דוגמה לכרטיס איש קשר</p>
          <p className="mt-2">שם: {"{{name}}+בוט"}</p>
          <p dir="ltr">טלפון: +{"{{contact_phone}}"}</p>
          <p className="mt-2 text-stone-500">נבדקו עד עכשיו {checkedContactsCount.toLocaleString("he-IL")} רשומות.</p>
        </div>

        <div className="max-h-64 overflow-auto rounded-[28px] border border-stone-200 bg-stone-50 p-4">
          {entries.length === 0 ? (
            <p className="text-sm text-stone-500">עדיין אין אנשי קשר שמורים.</p>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 30).map((entry) => (
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2 text-sm" key={entry.id}>
                  <div>
                    <p className="font-bold text-stone-900">{entry.displayName}</p>
                    <p className="text-stone-500" dir="ltr">{entry.phone}</p>
                  </div>
                  <Badge tone={entry.status === "quota_exceeded" ? "warning" : entry.status === "synced_google" ? "success" : "neutral"}>
                    {entry.status === "synced_google"
                      ? "Google"
                      : entry.status === "quota_exceeded"
                        ? "ממתין"
                        : entry.status === "duplicate"
                          ? "כפול"
                          : "נשמר"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
