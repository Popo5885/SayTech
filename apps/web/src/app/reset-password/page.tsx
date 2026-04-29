import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { prisma } from "@lottery/db";
import { SuccessSubmitButton } from "../../components/success-submit-button";
import { hashPassword, hashVerificationCode, isEnglishPassword } from "../../lib/password";

const db = prisma as any;

async function verifyResetCodeAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const code = String(formData.get("code") ?? "").trim();

  if (!email || !code) {
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

  (await cookies()).set("password_reset_token_id", token.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/reset-password",
    maxAge: 10 * 60
  });

  redirect(`/reset-password?email=${encodeURIComponent(email)}&verified=1`);
}

async function resetPasswordAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const tokenId = (await cookies()).get("password_reset_token_id")?.value;

  if (!email || !isEnglishPassword(password) || !tokenId) {
    redirect(`/reset-password?email=${encodeURIComponent(email)}&verified=1&error=missing`);
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    redirect(`/reset-password?email=${encodeURIComponent(email)}&error=invalid`);
  }

  const token = await db.passwordResetToken.findFirst({
    where: {
      id: tokenId,
      userId: user.id,
      usedAt: null,
      expiresAt: { gt: new Date() }
    }
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

  (await cookies()).delete("password_reset_token_id");

  redirect("/login");
}

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams?: Promise<{ email?: string; error?: string; verified?: string }>;
}) {
  const params = await searchParams;
  const email = params?.email ?? "";
  const verified = params?.verified === "1";

  return (
    <main className="aurora-surface relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070914] px-4 py-10 text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/24 blur-[130px]" />
      </div>

      <section className="border-beam-card relative w-full max-w-xl rounded-[34px] border border-white/10 bg-white/[0.08] p-8 shadow-2xl backdrop-blur-xl">
        <Link className="font-black text-white" href="/">Magic Flow</Link>
        <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100">
          {verified ? <KeyRound className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
        </div>
        <h1 className="mt-5 text-3xl font-black">
          {verified ? "בחירת סיסמה חדשה" : "אימות קוד לפני החלפת סיסמה"}
        </h1>
        <p className="mt-3 leading-7 text-slate-300">
          {verified
            ? "האימות עבר בהצלחה. עכשיו אפשר לבחור סיסמה חדשה לחשבון."
            : "הכניסו את הקוד שקיבלתם במייל. רק אחרי אימות הקוד ייפתח מסך החלפת הסיסמה."}
        </p>
        {params?.error ? (
          <div className="mt-5 rounded-2xl border border-red-300/25 bg-red-300/12 p-4 text-sm font-semibold text-red-100">
            הקוד לא תקין, פג תוקף, או שחסר פרט נדרש.
          </div>
        ) : null}

        {verified ? (
          <form action={resetPasswordAction} className="mt-6 space-y-4">
            <input name="email" type="hidden" value={email} />
            <label className="block">
              <span className="font-bold text-slate-200">סיסמה חדשה</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" name="password" required minLength={8} pattern="[A-Za-z0-9]+" title="סיסמה באנגלית ומספרים בלבד" type="password" />
            </label>
            <SuccessSubmitButton>עדכון סיסמה</SuccessSubmitButton>
          </form>
        ) : (
          <form action={verifyResetCodeAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="font-bold text-slate-200">אימייל</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" defaultValue={email} dir="ltr" name="email" required type="email" />
            </label>
            <label className="block">
              <span className="font-bold text-slate-200">קוד אימות</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-left tracking-[0.3em] text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" dir="ltr" name="code" required />
            </label>
            <SuccessSubmitButton>אימות קוד</SuccessSubmitButton>
          </form>
        )}
      </section>
    </main>
  );
}
