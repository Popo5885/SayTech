import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { prisma } from "@lottery/db";
import { SuccessSubmitButton } from "../../components/success-submit-button";
import { ownerEmail, sendSystemEmail } from "../../lib/email";
import { normalizeIsraeliPhone } from "../../lib/phone";

const db = prisma as any;

async function contactAction(formData: FormData) {
  "use server";

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = normalizeIsraeliPhone(String(formData.get("phone") ?? ""));
  const message = String(formData.get("message") ?? "").trim();
  const accepted = formData.get("accepted") === "on";

  if (!fullName || !email || !phone || !accepted) {
    redirect("/contact?error=missing");
  }

  await db.contactLead.create({
    data: {
      fullName,
      email,
      phone,
      message,
      acceptedTermsAt: new Date(),
      acceptedPrivacyAt: new Date()
    }
  });

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  const [visitorMailSent, ownerMailSent] = await Promise.all([
    sendSystemEmail({
      to: email,
      subject: "קיבלנו את הפנייה שלך ל-Magic Flow",
      html: `<h1>הפנייה התקבלה</h1><p>שלום ${fullName}, תודה שפנית לצוות Magic Flow.</p><p>הפנייה נשמרה כליד עסקי, וצוות התמיכה יחזור אליך בהקדם עם מענה מסודר.</p>`
    }),
    sendSystemEmail({
      to: ownerEmail(),
      subject: "ליד חדש מ-Magic Flow",
      html: `<h1>ליד חדש מצור קשר</h1><p><strong>${fullName}</strong></p><p>${email}</p><p dir="ltr">${phone}</p><p>${message || "לא נכתבה הודעה."}</p><p><a href="${baseUrl}/admin">מעבר ללוח הניהול</a></p>`
    })
  ]);

  if (!visitorMailSent || !ownerMailSent) {
    redirect("/contact?sent=1&mail=missing");
  }

  redirect("/contact?sent=1");
}

export default async function ContactPage({
  searchParams
}: {
  searchParams?: Promise<{ sent?: string; error?: string; mail?: string }>;
}) {
  const params = await searchParams;
  const sent = params?.sent === "1";
  const hasError = params?.error === "missing";
  const mailMissing = params?.mail === "missing";

  return (
    <main className="aurora-surface relative min-h-screen overflow-hidden bg-[#070914] px-4 py-10 text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/24 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          <Link className="inline-flex items-center gap-3 text-lg font-black" href="/">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-white shadow-[0_0_35px_rgba(34,211,238,0.24)]">
              <Sparkles className="h-5 w-5" />
            </span>
            Magic Flow
          </Link>

          <p className="mt-16 inline-flex rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-sm font-black text-cyan-100">
            פנייה עסקית לצוות Magic Flow
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight md:text-5xl">
            בודקים התאמה,
            <br />
            בלי לפתוח חשבון מיותר.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            השאירו פרטים ונחזור אליכם עם הסבר קצר וברור. הפנייה נשמרת כליד עסקי בלבד, ולא יוצרת חשבון פעיל במערכת.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-slate-300">
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
              בדיקה ידנית לפני פתיחת מערכת עבודה, כדי לשמור על איכות הלקוחות והתשתית.
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
              <MessageCircle className="mb-3 h-5 w-5 text-cyan-200" />
              תשובה מסודרת מצוות התמיכה, כולל הסבר על חיבור WhatsApp Official.
            </div>
          </div>

          <p className="mt-8 text-2xl font-black" dir="ltr">054-246-6340</p>
        </section>

        <section className="border-beam-card rounded-[34px] border border-white/10 bg-white/[0.08] p-6 text-white shadow-2xl backdrop-blur-xl md:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100">
              <Mail className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-3xl font-black">צור קשר</h2>
              <p className="mt-1 text-slate-300">נשמור את הפרטים ונחזור אליך בהקדם.</p>
            </div>
          </div>

          {sent ? (
            <div className="mt-6 rounded-3xl border border-emerald-300/25 bg-emerald-300/12 p-5 text-emerald-50">
              <p className="font-black">הפנייה נשלחה בהצלחה.</p>
              <p className="mt-2 text-sm leading-6 text-emerald-100">
                צוות Magic Flow יחזור אליך בהקדם.
                {mailMissing ? " שים לב: מערכת המיילים עדיין לא מוגדרת בסביבה הזו, לכן המייל לא נשלח בפועל." : ""}
              </p>
            </div>
          ) : (
            <form action={contactAction} className="mt-6 space-y-4">
              {hasError ? (
                <div className="rounded-2xl border border-red-300/25 bg-red-300/12 p-4 text-sm font-semibold text-red-100">
                  צריך למלא שם, אימייל, טלפון ואישור יצירת קשר.
                </div>
              ) : null}
              <label className="block">
                <span className="font-bold text-slate-200">שם מלא</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" name="fullName" required />
              </label>
              <label className="block">
                <span className="font-bold text-slate-200">אימייל</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" dir="ltr" name="email" required type="email" />
              </label>
              <label className="block">
                <span className="font-bold text-slate-200">טלפון</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-left text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" dir="ltr" name="phone" placeholder="0501234567" required />
              </label>
              <label className="block">
                <span className="font-bold text-slate-200">מה חשוב לך במערכת?</span>
                <textarea className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" name="message" placeholder="לדוגמה: הגרלה, שמירת אנשי קשר, WhatsApp Official, קבלות או אוטומציות." />
              </label>
              <label className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-300">
                <input className="mt-1" name="accepted" required type="checkbox" />
                <span>אני מאשר יצירת קשר ושמירת הפרטים לצורך טיפול בפנייה.</span>
              </label>
              <SuccessSubmitButton>שליחת פרטים</SuccessSubmitButton>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
