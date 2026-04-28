import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@lottery/db";
import { SuccessSubmitButton } from "../../components/success-submit-button";
import { hashPassword, hashVerificationCode } from "../../lib/password";

const db = prisma as any;

async function resetPasswordAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !code || password.length < 8) {
    redirect(`/reset-password?email=${encodeURIComponent(email)}&error=missing`);
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    redirect(`/reset-password?email=${encodeURIComponent(email)}&error=invalid`);
  }

  const token = await db.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      codeHash: hashVerificationCode(code),
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!token) {
    redirect(`/reset-password?email=${encodeURIComponent(email)}&error=invalid`);
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) }
    }),
    db.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() }
    })
  ]);

  redirect("/login");
}

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams?: Promise<{ email?: string; error?: string }>;
}) {
  const params = await searchParams;
  const email = params?.email ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10" dir="rtl">
      <section className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
        <Link className="font-black text-slate-950" href="/">Magic Flow</Link>
        <h1 className="mt-8 text-3xl font-black text-slate-950">בחירת סיסמה חדשה</h1>
        <p className="mt-3 leading-7 text-slate-600">הכנס את הקוד שקיבלת במייל ואת הסיסמה החדשה.</p>
        {params?.error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            הקוד לא תקין או שפג תוקפו.
          </div>
        ) : null}
        <form action={resetPasswordAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="font-bold text-slate-700">אימייל</span>
            <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" defaultValue={email} dir="ltr" name="email" required type="email" />
          </label>
          <label className="block">
            <span className="font-bold text-slate-700">קוד אימות</span>
            <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 text-left tracking-[0.3em] outline-none focus:border-blue-500" dir="ltr" name="code" required />
          </label>
          <label className="block">
            <span className="font-bold text-slate-700">סיסמה חדשה</span>
            <input className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-blue-500" name="password" required minLength={8} type="password" />
          </label>
          <SuccessSubmitButton>עדכון סיסמה</SuccessSubmitButton>
        </form>
      </section>
    </main>
  );
}
