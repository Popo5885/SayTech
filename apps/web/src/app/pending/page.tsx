import Link from "next/link";
import { Clock, MailCheck } from "lucide-react";
import { auth } from "../../auth";

export default async function PendingPage() {
  const session = await auth();
  const greeting = session?.user?.name ? `שלום ${session.user.name},` : "שלום,";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080b16] px-4 py-10 text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-10rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-cyan-300/20 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-[-10rem] h-[36rem] w-[36rem] rounded-full bg-violet-500/25 blur-[130px]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/12 blur-[90px]" />
      </div>

      <section className="relative max-w-2xl rounded-[36px] border border-white/10 bg-white/[0.08] p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-200/20">
          <Clock className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight md:text-5xl">החשבון בבדיקה קצרה</h1>
        <p className="mt-5 text-lg leading-9 text-slate-200">
          {greeting} קיבלנו את פנייתך. כדי לשמור על איכות המערכת, כל לקוח עובר בדיקה ידנית על ידי צוות Magic Flow. נחזור אליך תוך זמן קצר עם אישור הכניסה.
        </p>
        <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-right text-sm leading-7 text-slate-300">
          <div className="flex items-center gap-2 font-black text-white">
            <MailCheck className="h-5 w-5 text-emerald-300" />
            מה קורה עכשיו?
          </div>
          <p className="mt-2">
            צוות Magic Flow בודק את הבקשה, מפעיל את החשבון ומכין את סביבת העבודה.
          </p>
        </div>
        <Link className="mt-7 inline-flex h-12 items-center rounded-2xl bg-white px-6 font-black text-slate-950 transition hover:-translate-y-0.5" href="/">
          חזרה לדף הבית
        </Link>
      </section>
    </main>
  );
}
