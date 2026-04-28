import Link from "next/link";
import { redirect } from "next/navigation";
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

  await Promise.all([
    sendSystemEmail({
      to: email,
      subject: "קיבלנו את הפנייה שלך",
      html: `<h1>הפנייה התקבלה</h1><p>שלום ${fullName}, תודה שפנית לצוות Magic Flow. נחזור אליך בהקדם.</p>`
    }),
    sendSystemEmail({
      to: ownerEmail(),
      subject: "ליד חדש מ-Magic Flow",
      html: `<h1>ליד חדש</h1><p><strong>${fullName}</strong></p><p>${email}</p><p dir="ltr">${phone}</p><p>${message || "לא נכתבה הודעה."}</p><p><a href="${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/admin">מעבר ללוח הניהול</a></p>`
    })
  ]);

  redirect("/contact?sent=1");
}

export default async function ContactPage({
  searchParams
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  const sent = params?.sent === "1";
  const hasError = params?.error === "missing";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10" dir="rtl">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[32px] bg-slate-950 p-8 text-white">
          <Link className="text-lg font-black" href="/">Magic Flow</Link>
          <h1 className="mt-14 text-4xl font-black leading-tight">רוצה להבין אם זה מתאים לעסק שלך?</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            שלח פרטים ונחזור אליך. זו פנייה עסקית בלבד, לא פתיחת חשבון פעיל.
          </p>
          <p className="mt-8 text-2xl font-black" dir="ltr">054-246-6340</p>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl md:p-8">
          <h2 className="text-3xl font-black text-slate-950">צור קשר</h2>
          <p className="mt-2 text-slate-500">נשמור את הפנייה כליד ונשלח אישור למייל.</p>

          {sent ? (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              הפנייה נשלחה בהצלחה. צוות Magic Flow יחזור אליך בהקדם.
            </div>
          ) : (
            <form action={contactAction} className="mt-6 space-y-4">
              {hasError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  צריך למלא שם, אימייל, טלפון ואישור תנאים.
                </div>
              ) : null}
              <label className="block">
                <span className="font-bold text-slate-700">שם מלא</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" name="fullName" required />
              </label>
              <label className="block">
                <span className="font-bold text-slate-700">אימייל</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" dir="ltr" name="email" required type="email" />
              </label>
              <label className="block">
                <span className="font-bold text-slate-700">טלפון</span>
                <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-left outline-none focus:border-blue-500" dir="ltr" name="phone" placeholder="0501234567" required />
              </label>
              <label className="block">
                <span className="font-bold text-slate-700">מה חשוב לך במערכת?</span>
                <textarea className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" name="message" />
              </label>
              <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
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
