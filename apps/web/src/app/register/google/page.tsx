import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { prisma } from "@lottery/db";
import { auth } from "../../../auth";
import { SuccessSubmitButton } from "../../../components/success-submit-button";
import { ownerEmail, sendSystemEmail } from "../../../lib/email";
import { normalizeIsraeliPhone } from "../../../lib/phone";

const db = prisma as any;

async function completeGoogleRegistrationAction(formData: FormData) {
  "use server";

  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase();

  if (!sessionEmail) {
    redirect("/register");
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = normalizeIsraeliPhone(String(formData.get("phone") ?? ""));
  const accepted = formData.get("accepted") === "on";

  if (!fullName || !phone || !accepted) {
    redirect("/register/google?error=missing");
  }

  const now = new Date();
  const user = await db.user.update({
    where: { email: sessionEmail },
    data: {
      fullName,
      name: fullName,
      phone,
      acceptedTermsAt: now,
      acceptedPrivacyAt: now,
      accountStatus: sessionEmail === ownerEmail().toLowerCase() ? "active" : "pending"
    }
  });

  const unsubscribeUrl = `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${user.unsubscribeToken}`;

  await Promise.all([
    sendSystemEmail({
      to: sessionEmail,
      subject: "קיבלנו את בקשת ההרשמה שלך ל-Magic Flow",
      unsubscribeUrl,
      html: `<h1>ההרשמה התקבלה</h1><p>שלום ${fullName}, הפרטים נשמרו. צוות Magic Flow יעדכן אותך במייל ברגע שהחשבון יהיה מוכן.</p>`
    }),
    sendSystemEmail({
      to: ownerEmail(),
      subject: "משתמש Google חדש ממתין לאישור",
      html: `<h1>משתמש Google חדש ממתין לאישור</h1><p><strong>${fullName}</strong></p><p>${sessionEmail}</p><p dir="ltr">${phone}</p><p><a href="${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/admin">מעבר ללוח הניהול</a></p>`
    })
  ]);

  redirect(sessionEmail === ownerEmail().toLowerCase() ? "/admin" : "/waiting-room");
}

export default async function GoogleRegistrationPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/register");
  }

  const params = await searchParams;
  const hasError = params?.error === "missing";
  const email = session.user.email.toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  const initialName = user?.fullName ?? session.user.name ?? "";

  return (
    <main className="aurora-surface relative min-h-screen overflow-hidden bg-[#070914] px-4 py-10 text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/24 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          <Link className="inline-flex items-center gap-3 text-lg font-black" href="/">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-white shadow-[0_0_35px_rgba(34,211,238,0.24)]">
              <Sparkles className="h-5 w-5" />
            </span>
            Magic Flow
          </Link>
          <h1 className="mt-16 text-4xl font-black leading-tight md:text-5xl">השלמת הרשמה עם Google</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            זיהינו את המייל והשם מחשבון Google. המייל נעול כדי למנוע כפילויות, ואת השם אפשר לעדכן לפני שליחת הבקשה.
          </p>
        </section>

        <section className="border-beam-card rounded-[34px] border border-white/10 bg-white/[0.08] p-6 text-white shadow-2xl backdrop-blur-xl md:p-8">
          <h2 className="text-3xl font-black">פרטי חשבון</h2>
          {hasError ? (
            <div className="mt-5 rounded-3xl border border-red-300/25 bg-red-300/12 p-4 text-sm font-semibold text-red-100">
              צריך למלא שם, טלפון ואישור תנאים.
            </div>
          ) : null}
          <form action={completeGoogleRegistrationAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="font-bold text-slate-200">אימייל</span>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-slate-300 outline-none"
                dir="ltr"
                readOnly
                value={email}
              />
            </label>
            <label className="block">
              <span className="font-bold text-slate-200">שם מלא</span>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                defaultValue={initialName}
                name="fullName"
                required
              />
            </label>
            <label className="block">
              <span className="font-bold text-slate-200">טלפון</span>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-left text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                dir="ltr"
                name="phone"
                placeholder="0501234567"
                required
              />
            </label>
            <label className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-300">
              <input className="mt-1" name="accepted" required type="checkbox" />
              <span>
                קראתי ואישרתי את <Link className="font-bold text-cyan-200 hover:text-white" href="/terms">תנאי השימוש</Link> ואת <Link className="font-bold text-cyan-200 hover:text-white" href="/privacy">מדיניות הפרטיות</Link>.
              </span>
            </label>
            <SuccessSubmitButton>שליחת בקשה</SuccessSubmitButton>
          </form>
        </section>
      </div>
    </main>
  );
}
