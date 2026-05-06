import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@lottery/db";
import { auth } from "../../../auth";
import { SuccessSubmitButton } from "../../../components/success-submit-button";
import { getPrimaryStore } from "../../../lib/live-store";
import { normalizeIsraeliPhone } from "../../../lib/phone";
import { getBalance, getLedger, redeemPoints, POINTS_PER_NIS_DISCOUNT } from "../../../lib/affiliate-points";

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

async function addContactCardAction(formData: FormData) {
  "use server";

  const store = await getPrimaryStore();

  if (!store) {
    redirect("/dashboard/settings?error=workspace");
  }

  const displayName = String(formData.get("displayName") ?? "").trim();
  const phone = normalizeIsraeliPhone(String(formData.get("phone") ?? ""));
  const organization = String(formData.get("organization") ?? "").trim();

  if (!displayName || !phone) {
    redirect("/dashboard/settings?error=contact-card");
  }

  const sortOrder = await db.workspaceContactCard.count({
    where: {
      workspaceId: store.workspace.id
    }
  });

  await db.workspaceContactCard.create({
    data: {
      workspaceId: store.workspace.id,
      displayName,
      phone,
      organization: organization || null,
      sortOrder
    }
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=contact-card");
}

async function deleteContactCardAction(formData: FormData) {
  "use server";

  const store = await getPrimaryStore();

  if (!store) {
    redirect("/dashboard/settings?error=workspace");
  }

  const cardId = String(formData.get("cardId") ?? "");

  await db.workspaceContactCard.deleteMany({
    where: {
      id: cardId,
      workspaceId: store.workspace.id
    }
  });

  revalidatePath("/dashboard/settings");
  redirect("/dashboard/settings?saved=contact-card");
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
  const store = await getPrimaryStore();

  // Affiliate points
  const [pointsBalance, pointsLedger] = store
    ? await Promise.all([getBalance(store.workspace.id), getLedger(store.workspace.id, 10)])
    : [0, []];

  const contactCards = store
    ? await db.workspaceContactCard.findMany({
        where: {
          workspaceId: store.workspace.id
        },
        orderBy: [
          {
            sortOrder: "asc"
          },
          {
            createdAt: "asc"
          }
        ]
      })
    : [];

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
        {params?.saved === "contact-card" ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
            כרטיס איש הקשר נשמר בהצלחה.
          </div>
        ) : null}
        {params?.error === "missing" ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            צריך למלא שם וטלפון תקין.
          </div>
        ) : null}
        {params?.error === "contact-card" ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            צריך להזין שם ומספר טלפון תקין לכרטיס איש הקשר.
          </div>
        ) : null}
        {params?.error === "workspace" ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            עדיין אין סביבת עבודה פעילה לחשבון הזה.
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

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-cyan-700">בוט שמירת אנשי קשר</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">כרטיסי איש קשר לשליחה</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-500">
          המספרים כאן נשלחים למשתתף אחרי הודעת שמירת איש הקשר. עד שני אנשי קשר נשלחים ככרטיס WhatsApp, ושלושה ומעלה נשלחים כקובץ VCF לשמירה מהירה.
        </p>

        <form action={addContactCardAction} className="mt-6 grid gap-4 md:grid-cols-4">
          <label className="block">
            <span className="text-sm font-black text-slate-700">שם איש הקשר</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              name="displayName"
              placeholder="Magic Flow"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-black text-slate-700">טלפון</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-left outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              dir="ltr"
              name="phone"
              placeholder="+972542466340"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-black text-slate-700">חברה / ארגון</span>
            <input
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
              name="organization"
              placeholder="Magic Flow"
            />
          </label>
          <div className="flex items-end">
            <button className="h-12 rounded-2xl bg-cyan-600 px-5 font-black text-white" type="submit">
              הוסף כרטיס
            </button>
          </div>
        </form>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {contactCards.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
              עדיין לא הוגדר כרטיס איש קשר לשליחה.
            </div>
          ) : (
            contactCards.map((card: any) => (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4" key={card.id}>
                <div>
                  <p className="font-black text-slate-950">{card.displayName}</p>
                  <p className="text-sm text-slate-500" dir="ltr">{card.phone}</p>
                  {card.organization ? <p className="text-sm text-slate-500">{card.organization}</p> : null}
                </div>
                <form action={deleteContactCardAction}>
                  <input name="cardId" type="hidden" value={card.id} />
                  <button className="h-10 rounded-2xl border border-red-200 px-4 text-sm font-black text-red-700" type="submit">
                    הסר
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Affiliate & Points ─────────────────────────────────────────── */}
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-black text-violet-700">נקודות שותפים</p>
        <h2 className="mt-2 text-3xl font-black text-slate-950">יתרת נקודות</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-500">
          על כל תשלום מאומת מתווספות {20} נקודות לחשבון. כל {POINTS_PER_NIS_DISCOUNT} נקודות שוות הנחה של {POINTS_PER_NIS_DISCOUNT} ₪ על החשבונית הבאה.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-8 py-5 text-center">
            <p className="text-4xl font-black text-violet-900">{pointsBalance}</p>
            <p className="mt-1 text-sm font-bold text-violet-600">נקודות זמינות</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-8 py-5 text-center">
            <p className="text-4xl font-black text-emerald-900">
              {Math.floor(pointsBalance / POINTS_PER_NIS_DISCOUNT) * POINTS_PER_NIS_DISCOUNT}
            </p>
            <p className="mt-1 text-sm font-bold text-emerald-600">נקודות לממש (₪)</p>
          </div>
        </div>

        {pointsBalance >= POINTS_PER_NIS_DISCOUNT ? (
          <form
            action={async (formData: FormData) => {
              "use server";
              const sess = await auth();
              const uid = (sess?.user as any)?.id;
              if (!uid) redirect("/login");
              const ws = await getPrimaryStore();
              if (!ws) redirect("/dashboard/settings?error=workspace");
              const pts = Math.floor(pointsBalance / POINTS_PER_NIS_DISCOUNT) * POINTS_PER_NIS_DISCOUNT;
              try {
                await redeemPoints(ws.workspace.id, pts);
              } catch {
                /* balance shown will update on next load */
              }
              revalidatePath("/dashboard/settings");
              redirect("/dashboard/settings?saved=points");
            }}
            className="mt-5"
          >
            <button
              className="h-12 rounded-2xl bg-violet-600 px-6 font-black text-white transition hover:-translate-y-0.5 hover:bg-violet-700"
              type="submit"
            >
              ממש {Math.floor(pointsBalance / POINTS_PER_NIS_DISCOUNT) * POINTS_PER_NIS_DISCOUNT} נקודות ← הנחה של {Math.floor(pointsBalance / POINTS_PER_NIS_DISCOUNT) * POINTS_PER_NIS_DISCOUNT} ₪
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            נדרשות לפחות {POINTS_PER_NIS_DISCOUNT} נקודות למימוש. צבר עוד {POINTS_PER_NIS_DISCOUNT - pointsBalance} נקודות.
          </p>
        )}

        {pointsLedger.length > 0 ? (
          <div className="mt-6">
            <p className="mb-3 text-sm font-black text-slate-700">היסטוריית נקודות</p>
            <div className="space-y-2">
              {(pointsLedger as any[]).map((row: any) => (
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5" key={row.id}>
                  <span className="text-sm text-slate-600">{row.note ?? row.source}</span>
                  <span className={`text-sm font-black ${row.deltaPoints > 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {row.deltaPoints > 0 ? "+" : ""}{row.deltaPoints}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
