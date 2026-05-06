import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { prisma } from "@lottery/db";
import { SuccessSubmitButton } from "../../components/success-submit-button";
import { sendSystemEmail } from "../../lib/email";
import { createVerificationCode, hashVerificationCode } from "../../lib/password";
import { rateLimit } from "../../lib/rate-limit";

const db = prisma as any;

async function forgotPasswordAction(formData: FormData) {
  "use server";

  // SECURITY: rate-limit reset attempts per IP and per email to slow
  // email-bombing and account enumeration.
  const requestHeaders = await headers();
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown";

  const ipBucket = rateLimit({ key: `forgot:ip:${ip}`, limit: 5, windowMs: 5 * 60_000 });
  if (!ipBucket.ok) {
    redirect("/forgot-password?error=rate");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/forgot-password?error=missing");
  }

  const emailBucket = rateLimit({
    key: `forgot:email:${email}`,
    limit: 3,
    windowMs: 60 * 60_000
  });
  if (!emailBucket.ok) {
    redirect("/forgot-password?sent=1");
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    redirect("/forgot-password?sent=1");
  }

  const code = createVerificationCode();
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      codeHash: hashVerificationCode(code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  const sent = await sendSystemEmail({
    to: email,
    subject: "קוד איפוס סיסמה ל-Magic Flow",
    unsubscribeUrl: `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${user.unsubscribeToken}`,
    html: `<h1>קוד איפוס סיסמה</h1><p>הקוד שלך הוא:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px" dir="ltr">${code}</p><p>הקוד תקף ל-15 דקות. לאחר אימות הקוד ייפתח מסך בחירת סיסמה חדשה.</p>`
  });

  if (!sent) {
    redirect(`/forgot-password?error=email&email=${encodeURIComponent(email)}`);
  }

  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; email?: string; sent?: string; rate?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const sent = params?.sent === "1";

  return (
    <main className="aurora-surface relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070914] px-4 py-10 text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/24 blur-[130px]" />
      </div>
      <section className="border-beam-card relative w-full max-w-xl rounded-[34px] border border-white/10 bg-white/[0.08] p-8 shadow-2xl backdrop-blur-xl">
        <Link className="font-black text-white" href="/">Magic Flow</Link>
        <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100">
          <Mail className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-black">איפוס סיסמה</h1>
        <p className="mt-3 leading-7 text-slate-300">
          הכניסו את האימייל, נשלח קוד אימות, ורק אחרי אימות הקוד תיפתח אפשרות לבחור סיסמה חדשה.
        </p>

        {error === "email" ? (
          <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/12 p-4 text-sm font-semibold text-amber-100">
            מערכת המיילים עדיין לא מוגדרת בסביבה הזו. הגדירו `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` ו-`SMTP_FROM` ואז נסו שוב.
          </div>
        ) : null}
        {error === "missing" ? (
          <div className="mt-5 rounded-2xl border border-red-300/25 bg-red-300/12 p-4 text-sm font-semibold text-red-100">
            צריך להזין אימייל תקין.
          </div>
        ) : null}
        {error === "rate" ? (
          <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-300/12 p-4 text-sm font-semibold text-amber-100">
            יותר מדי בקשות מהכתובת הזאת. נסו שוב בעוד מספר דקות.
          </div>
        ) : null}
        {sent ? (
          <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/12 p-4 text-sm font-semibold text-emerald-100">
            אם קיים חשבון עם האימייל הזה, נשלח אליו קוד אימות.
          </div>
        ) : null}

        <form action={forgotPasswordAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-bold text-slate-200">אימייל</span>
            <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" defaultValue={params?.email ?? ""} dir="ltr" name="email" required type="email" />
          </label>
          <SuccessSubmitButton>שליחת קוד</SuccessSubmitButton>
        </form>
      </section>
    </main>
  );
}
