import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@lottery/db";
import { auth } from "../../../auth";
import { SuccessSubmitButton } from "../../../components/success-submit-button";
import { normalizeIsraeliPhone } from "../../../lib/phone";

const db = prisma as any;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function updateProfileAction(formData: FormData) {
  "use server";

  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    redirect("/login");
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = normalizeIsraeliPhone(String(formData.get("phone") ?? ""));

  if (!fullName || !phone) {
    redirect("/dashboard/settings?error=missing");
  }

  await db.user.update({
    where: { id: userId },
    data: {
      fullName,
      name: fullName,
      phone
    }
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=1");
}

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as any)?.id;

  if (!userId) {
    redirect("/login");
  }

  const params = await searchParams;
  const user = await db.user.findUnique({ where: { id: userId } });

  return (
    <main className="space-y-6" dir="rtl">
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-emerald-700">הגדרות חשבון</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">פרטים אישיים</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-500">
          כאן מעדכנים שם וטלפון. המייל נשאר קבוע כדי לשמור על זיהוי חשבון מדויק ועל חיבור Google תקין.
        </p>

        {params?.saved === "1" ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            ההגדרות נשמרו בהצלחה.
          </div>
        ) : null}
        {params?.error === "missing" ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            צריך למלא שם וטלפון תקין.
          </div>
        ) : null}

        <form action={updateProfileAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-black text-slate-700">אימייל</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 outline-none"
              dir="ltr"
              readOnly
              value={user?.email ?? ""}
            />
          </label>
          <label className="block">
            <span className="text-sm font-black text-slate-700">שם מלא</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              defaultValue={user?.fullName ?? user?.name ?? ""}
              name="fullName"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-black text-slate-700">טלפון</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-left outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              defaultValue={user?.phone ?? ""}
              dir="ltr"
              name="phone"
              placeholder="0501234567"
              required
            />
          </label>
          <div className="flex items-end">
            <SuccessSubmitButton>שמירת הגדרות</SuccessSubmitButton>
          </div>
        </form>
      </section>
    </main>
  );
}
