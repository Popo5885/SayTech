import Link from "next/link";
import { redirect } from "next/navigation";
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
      html: `<h1>קוד איפוס סיסמה</h1><p>הקוד שלך הוא:</p><p style="font-size:28px;font-weight:800;letter-spacing:4px" dir="ltr">${code}</p><p>הקוד תקף ל-15 דקות.</p>`
    });
  }

  redirect(`/reset-password?email=${encodeURIComponent(email)}`);
}

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10" dir="rtl">
      <section className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
        <Link className="font-black text-slate-950" href="/">Magic Flow</Link>
        <h1 className="mt-8 text-3xl font-black text-slate-950">איפוס סיסמה</h1>
        <p className="mt-3 leading-7 text-slate-600">הכנס את האימייל שלך ונשלח קוד אימות חד פעמי.</p>
        <form action={forgotPasswordAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-bold text-slate-700">אימייל</span>
            <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" dir="ltr" name="email" required type="email" />
          </label>
          <SuccessSubmitButton>שליחת קוד</SuccessSubmitButton>
        </form>
      </section>
    </main>
  );
}
