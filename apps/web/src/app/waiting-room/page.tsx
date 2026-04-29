import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Headphones, MailCheck, ShieldCheck } from "lucide-react";
import { auth } from "../../auth";
import { ownerEmail } from "../../lib/email";

const supportPhone = "972542466340";

export default async function WaitingRoomPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;
  const adminEmail = ownerEmail().toLowerCase();
  const isAdmin =
    user.globalRole === "SUPER_ADMIN" || user.email?.toLowerCase() === adminEmail;

  if (user.accountStatus === "active") {
    redirect(isAdmin ? "/admin" : "/dashboard");
  }

  const name = session.user.name ?? "לקוח יקר";
  const supportHref = `https://wa.me/${supportPhone}?text=${encodeURIComponent(
    "שלום צוות Magic Flow, אשמח לבדוק את סטטוס החשבון שלי."
  )}`;

  return (
    <main className="aurora-surface relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070914] px-4 py-10 text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-10rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-cyan-300/20 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-[-10rem] h-[36rem] w-[36rem] rounded-full bg-violet-500/25 blur-[130px]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/12 blur-[90px]" />
      </div>

      <section className="border-beam-card relative w-full max-w-2xl rounded-[36px] border border-white/10 bg-white/[0.08] p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-300/15 text-amber-200 ring-1 ring-amber-200/20">
          <Clock className="h-8 w-8" />
        </div>
        <p className="mt-5 text-sm font-black text-cyan-100">כניסה מבוקרת</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          החשבון בבדיקה קצרה
        </h1>
        <p className="mt-5 text-lg leading-9 text-slate-200">
          שלום {name}, קיבלנו את פרטיך. כדי לשמור על איכות המערכת והעבודה מול WhatsApp Official,
          כל חשבון עובר בדיקה ידנית. נשלח לך מייל ברגע שהכל יהיה מוכן עבורך.
        </p>

        <div className="mt-7 grid gap-3 text-right md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-sm leading-7 text-slate-300">
            <div className="flex items-center gap-2 font-black text-white">
              <ShieldCheck className="h-5 w-5 text-emerald-300" />
              בדיקת איכות
            </div>
            <p className="mt-2">
              צוות Magic Flow בודק שהחשבון מתאים לעבודה יציבה ובטוחה מול התשתית הרשמית.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 text-sm leading-7 text-slate-300">
            <div className="flex items-center gap-2 font-black text-white">
              <MailCheck className="h-5 w-5 text-cyan-300" />
              עדכון במייל
            </div>
            <p className="mt-2">
              לאחר האישור תקבל מייל, והכניסה הבאה תוביל אותך ישר ללוח העבודה.
            </p>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-white px-6 font-black text-slate-950 transition hover:-translate-y-0.5"
            href={supportHref}
            rel="noreferrer"
            target="_blank"
          >
            <Headphones className="h-5 w-5" />
            צור קשר עם התמיכה
          </a>
          <Link
            className="inline-flex h-12 items-center rounded-2xl border border-white/15 px-6 font-black text-white transition hover:bg-white/10"
            href="/"
          >
            חזרה לדף הבית
          </Link>
        </div>
      </section>
    </main>
  );
}
