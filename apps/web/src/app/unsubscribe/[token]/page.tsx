import Link from "next/link";
import { prisma } from "@lottery/db";

const db = prisma as any;

export default async function UnsubscribePage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await db.user.findUnique({ where: { unsubscribeToken: token } });

  if (user && !user.emailUnsubscribedAt) {
    await db.user.update({
      where: { id: user.id },
      data: { emailUnsubscribedAt: new Date() }
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10" dir="rtl">
      <section className="max-w-xl rounded-[32px] bg-white p-8 text-center shadow-xl">
        <h1 className="text-3xl font-black text-slate-950">הוסרת מרשימת התפוצה</h1>
        <p className="mt-4 leading-7 text-slate-600">
          לא נשלח אליך ניוזלטרים ועדכונים שיווקיים. מיילי מערכת חשובים עדיין עשויים להישלח כשצריך.
        </p>
        <Link className="mt-6 inline-flex h-12 items-center rounded-2xl bg-slate-950 px-6 font-black text-white" href="/">
          חזרה לדף הבית
        </Link>
      </section>
    </main>
  );
}
