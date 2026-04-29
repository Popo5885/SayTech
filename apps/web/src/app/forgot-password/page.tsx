import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { prisma } from "@lottery/db";
import { SuccessSubmitButton } from "../../components/success-submit-button";
import { sendSystemEmail } from "../../lib/email";
import { createVerificationCode, hashVerificationCode } from "../../lib/password";

const db = prisma as any;

async function forgotPasswordAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/forgot-password?sent=1");
  }

  const user = await db.user.findUnique({ where: { email } });

  if (user) {
    const code = createVerificationCode();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash: hashVerificationCode(code),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });
    await sendSystemEmail({
      to: email,
      subject: "קוד איפוס סיסמה ל-Magic Flow",
      unsubscribeUrl: `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${user.unsubscribeToken}`,
      html: `<h1>קוד איפוס סיסמה</h1><p>הקוד שלך הוא:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px" dir="ltr">${code}</p><p>הקוד תקף ל-15 דקות. לאחר אימות הקוד ייפתח מסך בחירת סיסמה חדשה.</p>`
    });
  }

  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

export default function ForgotPasswordPage() {
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
        <form action={forgotPasswordAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-bold text-slate-200">אימייל</span>
            <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" dir="ltr" name="email" required type="email" />
          </label>
          <SuccessSubmitButton>שליחת קוד</SuccessSubmitButton>
        </form>
      </section>
    </main>
  );
}
