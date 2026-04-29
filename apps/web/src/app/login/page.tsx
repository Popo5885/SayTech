import Link from "next/link";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ArrowLeft, Sparkles } from "lucide-react";
import { signIn } from "../../auth";
import { SuccessSubmitButton } from "../../components/success-submit-button";

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: email === adminEmail ? "/admin" : "/dashboard"
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(`/login?error=credentials&email=${encodeURIComponent(email)}`);
  }
}

async function googleAction() {
  "use server";

  await signIn("google", { redirectTo: "/admin" });
}

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const hasCredentialsError = params?.error === "credentials" || params?.error === "CredentialsSignin";
  const triedEmail = params?.email ?? "";
  const registerHref = triedEmail
    ? `/register?email=${encodeURIComponent(triedEmail)}`
    : "/register";

  return (
    <main className="aurora-surface relative min-h-screen overflow-hidden bg-[#070914] px-4 py-10 text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/24 blur-[130px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          <Link className="inline-flex items-center gap-3 text-lg font-black" href="/">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-white shadow-[0_0_35px_rgba(34,211,238,0.24)]">
              <Sparkles className="h-5 w-5" />
            </span>
            Magic Flow
          </Link>
          <h1 className="mt-16 text-4xl font-black leading-tight md:text-5xl">כניסה שקטה למערכת</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            אחרי שהחשבון מופעל, נכנסים ללוח עבודה קצר: חיבור, הודעות והגרלה בלבד.
          </p>
          <div className="mt-8 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm font-semibold leading-7 text-emerald-100">
            חשבון שממתין לאישור יעבור אוטומטית למסך המתנה מסודר.
          </div>
        </section>

        <section className="border-beam-card rounded-[34px] border border-white/10 bg-white/[0.08] p-6 text-white shadow-2xl backdrop-blur-xl md:p-8">
          <h2 className="text-3xl font-black">טוב שחזרת</h2>
          <p className="mt-2 text-slate-300">אפשר להתחבר עם מייל וסיסמה או עם Google.</p>

          {hasCredentialsError ? (
            <div className="mt-5 rounded-3xl border border-amber-300/25 bg-amber-300/12 p-4 text-sm font-semibold leading-7 text-amber-100">
              <p>פרטים לא מזוהים. רוצה לפתוח חשבון חדש?</p>
              <Link className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-black text-slate-950 transition hover:-translate-y-0.5" href={registerHref}>
                פתיחת חשבון עכשיו
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          ) : null}

          <form action={loginAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="font-bold text-slate-200">אימייל</span>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                defaultValue={triedEmail}
                dir="ltr"
                name="email"
                required
                type="email"
              />
            </label>
            <label className="block">
              <span className="font-bold text-slate-200">סיסמה</span>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                name="password"
                required
                type="password"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <SuccessSubmitButton>כניסה</SuccessSubmitButton>
              <Link className="font-bold text-cyan-200 hover:text-white" href="/forgot-password">שכחתי סיסמה</Link>
            </div>
          </form>

          <div className="my-6 flex items-center gap-3 text-sm text-slate-400">
            <span className="h-px flex-1 bg-white/10" />
            או
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form action={googleAction}>
            <button className="h-12 w-full rounded-2xl border border-white/10 bg-white text-sm font-black text-slate-950 transition hover:-translate-y-0.5" type="submit">
              כניסה עם Google
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-300">
            עדיין אין חשבון? <Link className="font-bold text-cyan-200 hover:text-white" href="/register">הרשמה</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
