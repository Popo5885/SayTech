import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { prisma } from "@lottery/db";
import { signIn } from "../../auth";
import { SuccessSubmitButton } from "../../components/success-submit-button";
import { isGoogleOAuthConfigured } from "../../lib/auth-settings";
import { registerSchema } from "../../lib/auth-schemas";
import { ownerEmail, sendSystemEmail } from "../../lib/email";
import { hashPassword } from "../../lib/password";
import { normalizeIsraeliPhone } from "../../lib/phone";

const db = prisma as any;

async function googleRegisterAction() {
  "use server";

  if (!(await isGoogleOAuthConfigured())) {
    redirect("/register?error=google-config");
  }

  await signIn("google", { redirectTo: "/register/google" });
}

async function registerAction(formData: FormData) {
  "use server";

  const input = {
    fullName: String(formData.get("fullName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    accepted: formData.get("accepted") === "on"
  };
  const parsed = registerSchema.safeParse(input);
  const phone = parsed.success ? normalizeIsraeliPhone(parsed.data.phone) : null;

  if (!parsed.success || !phone) {
    redirect(`/register?error=missing&email=${encodeURIComponent(input.email)}`);
  }

  const { fullName, email, password } = parsed.data;
  const now = new Date();
  const user = await db.user.upsert({
    where: { email },
    update: {
      fullName,
      name: fullName,
      phone,
      passwordHash: hashPassword(password),
      acceptedTermsAt: now,
      acceptedPrivacyAt: now
    },
    create: {
      email,
      fullName,
      name: fullName,
      phone,
      passwordHash: hashPassword(password),
      accountStatus: "pending",
      acceptedTermsAt: now,
      acceptedPrivacyAt: now
    }
  });

  const unsubscribeUrl = `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${user.unsubscribeToken}`;

  await Promise.all([
    sendSystemEmail({
      to: email,
      subject: "קיבלנו את בקשת ההרשמה שלך ל-Magic Flow",
      unsubscribeUrl,
      html: `<h1>ההרשמה התקבלה</h1><p>שלום ${fullName}, הבקשה התקבלה. צוות Magic Flow יבדוק אותה ויעדכן אותך במייל ברגע שהחשבון יופעל.</p>`
    }),
    sendSystemEmail({
      to: ownerEmail(),
      subject: "משתמש חדש ממתין לאישור",
      html: `<h1>משתמש חדש ממתין לאישור</h1><p><strong>${fullName}</strong></p><p>${email}</p><p dir="ltr">${phone}</p><p><a href="${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/admin">מעבר ללוח הניהול</a></p>`
    })
  ]);

  redirect("/waiting-room");
}

export default async function RegisterPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const hasError = params?.error === "missing";
  const hasGoogleConfigError = params?.error === "google-config";
  const initialEmail = params?.email ?? "";

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
          <div className="mt-10 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-black text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            מסלול VIP בלבד
          </div>
          <h1 className="mt-6 text-4xl font-black leading-tight md:text-5xl">טופס בקשת הצטרפות VIP</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Magic Flow היא מערכת DFY (Done-For-You) בלעדית. צוות Magic Flow בונה עבורך את מערכת ה-WhatsApp מהיסוד, מקצה מספר, ומפעיל את ההגרלה.
          </p>
          <div className="mt-8 space-y-4 text-sm font-semibold text-slate-300">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 text-xs font-black text-amber-300">1</span>
              <span>שליחת טופס הצטרפות VIP</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 text-xs font-black text-amber-300">2</span>
              <span>בדיקה ואישור ידני על-ידי הצוות</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/20 text-xs font-black text-amber-300">3</span>
              <span>קבלת גישה לחדר הבקרה האישי שלך</span>
            </div>
          </div>
        </section>

        <section className="border-beam-card rounded-[34px] border border-white/10 bg-white/[0.08] p-6 text-white shadow-2xl backdrop-blur-xl md:p-8">
          <h2 className="text-3xl font-black">בקשת הצטרפות VIP</h2>
          <p className="mt-2 text-slate-300">הבקשה תישלח לצוות לאישור. תקבלו עדכון במייל ברגע שהחשבון מוכן.</p>

          {hasError ? (
            <div className="mt-5 rounded-3xl border border-red-300/25 bg-red-300/12 p-4 text-sm font-semibold text-red-100">
              צריך למלא שם, אימייל, סיסמה באנגלית ומספרים בלבד של 8 תווים לפחות, טלפון ואישור תנאים.
            </div>
          ) : null}

          {hasGoogleConfigError ? (
            <div className="mt-5 rounded-3xl border border-amber-300/25 bg-amber-300/12 p-4 text-sm font-semibold text-amber-100">
              הרשמה עם Google לא זמינה כרגע. יש לבדוק שהגדרות OAuth זמינות בסביבה.
            </div>
          ) : null}

          <form action={googleRegisterAction} className="mt-6">
            <button aria-label="Register with Google" className="h-12 w-full rounded-2xl border border-white/10 bg-white text-sm font-black text-slate-950 transition hover:-translate-y-0.5" type="submit">
              הרשמה עם Google
            </button>
          </form>
          <div className="my-6 flex items-center gap-3 text-sm text-slate-400">
            <span className="h-px flex-1 bg-white/10" />
            או הרשמה ידנית
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form action={registerAction} className="space-y-4">
            <label className="block">
              <span className="font-bold text-slate-200">שם מלא</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" name="fullName" required />
            </label>
            <label className="block">
              <span className="font-bold text-slate-200">אימייל</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" defaultValue={initialEmail} dir="ltr" name="email" required type="email" />
            </label>
            <label className="block">
              <span className="font-bold text-slate-200">סיסמה</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" minLength={8} name="password" pattern="[A-Za-z0-9]+" required title="סיסמה באנגלית ומספרים בלבד" type="password" />
            </label>
            <label className="block">
              <span className="font-bold text-slate-200">טלפון</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-left text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" dir="ltr" name="phone" placeholder="0501234567" required />
            </label>
            <label className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-300">
              <input className="mt-1" name="accepted" required type="checkbox" />
              <span>
                קראתי ואישרתי את <Link className="font-bold text-cyan-200 hover:text-white" href="/terms">תנאי השימוש</Link> ואת <Link className="font-bold text-cyan-200 hover:text-white" href="/privacy">מדיניות הפרטיות</Link>.
              </span>
            </label>
            <SuccessSubmitButton>שלח בקשת הצטרפות VIP</SuccessSubmitButton>
          </form>

          <p className="mt-6 text-sm text-slate-300">
            כבר יש לך חשבון? <Link className="font-bold text-cyan-200 hover:text-white" href="/login">כניסה למערכת</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
