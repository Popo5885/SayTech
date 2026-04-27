import { Card, CardDescription, CardTitle } from "@lottery/ui";

export function EmptyWorkspaceState({
  title = "עדיין אין סביבת עבודה פעילה",
  description = "המסך הזה מציג רק נתונים אמיתיים. ברגע שיוגדר Workspace, חיבור WhatsApp וקמפיין במסד הנתונים, הנתונים יופיעו כאן."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card className="mx-auto max-w-3xl space-y-4 text-right" dir="rtl">
      <div className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
        אין נתוני דמו
      </div>
      <CardTitle>{title}</CardTitle>
      <CardDescription className="text-base leading-7">{description}</CardDescription>
      <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm leading-7 text-stone-600">
        כדי להתחיל, מנהל המערכת צריך לאשר חשבון, ליצור Workspace, לשייך חיבור WhatsApp
        ולהגדיר קמפיין אחד לפחות.
      </div>
    </Card>
  );
}
