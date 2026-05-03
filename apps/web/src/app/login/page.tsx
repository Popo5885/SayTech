import Link from "next/link";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";
import { prisma } from "@lottery/db";
import { signIn } from "../../auth";
import { SuccessSubmitButton } from "../../components/success-submit-button";
import { getAuthFeatureSettings, isGoogleLoginEnabled, isWhatsAppLoginEnabled } from "../../lib/auth-settings";
import { normalizeIsraeliPhone } from "../../lib/phone";
import { createVerificationCode, hashVerificationCode } from "../../lib/password";
import { sendWhatsAppText } from "../../lib/whatsapp";

const db = prisma as any;

async function loginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
  // Track consecutive failures so the client can auto-surface the Forgot-Password CTA.
  const prevAttempts = Math.max(0, parseInt(String(formData.get("attempts") ?? "0"), 10) || 0);

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

    const nextAttempts = prevAttempts + 1;
    redirect(`/login?error=credentials&email=${encodeURIComponent(email)}&attempts=${nextAttempts}`);
  }
}

async function googleAction() {
  "use server";

  if (!(await isGoogleLoginEnabled())) {
    redirect("/login?error=google-config");
  }

  await signIn("google", { redirectTo: "/dashboard" });
}

async function requestWhatsAppCodeAction(formData: FormData) {
  "use server";

  const phone = normalizeIsraeliPhone(String(formData.get("phone") ?? ""));

  if (!(await isWhatsAppLoginEnabled())) {
    redirect("/login?error=wa-disabled");
  }

  if (!phone) {
    redirect("/login?error=wa-phone");
  }

  const user = await db.user.findFirst({
    where: {
      phone
    }
  });

  if (!user) {
    redirect(`/login?error=wa-user&phone=${encodeURIComponent(phone)}`);
  }

  if (user.accountStatus === "suspended") {
    redirect(`/login?error=locked&phone=${encodeURIComponent(phone)}`);
  }

  if (user.accountStatus !== "active") {
    redirect(`/login?error=wa-user&phone=${encodeURIComponent(phone)}`);
  }

  const code = createVerificationCode();

  const sent = await sendWhatsAppText({
    to: phone,
    body: `קוד הכניסה שלך ל-Magic Flow הוא ${code}. הקוד תקף ל-10 דקות.`
  });

  if (!sent) {
    const settings = await getAuthFeatureSettings();

    if (settings.whatsappManualCodeEnabled) {
      redirect(`/login?wa=manual&phone=${encodeURIComponent(phone)}`);
    }

    redirect(`/login?error=wa-config&phone=${encodeURIComponent(phone)}`);
  }

  await db.whatsAppLoginCode.create({
    data: {
      phone,
      codeHash: hashVerificationCode(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  redirect(`/login?wa=sent&phone=${encodeURIComponent(phone)}`);
}

async function verifyWhatsAppCodeAction(formData: FormData) {
  "use server";

  const phone = normalizeIsraeliPhone(String(formData.get("phone") ?? ""));
  const otpCode = String(formData.get("otpCode") ?? "").trim();

  if (!(await isWhatsAppLoginEnabled())) {
    redirect("/login?error=wa-disabled");
  }

  try {
    await signIn("credentials", {
      phone,
      otpCode,
      redirectTo: "/dashboard"
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirect(`/login?error=wa-code&phone=${encodeURIComponent(phone ?? "")}&wa=sent`);
  }
}

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; email?: string; phone?: string; wa?: string; attempts?: string }>;
}) {
  const params = await searchParams;
  const hasCredentialsError = params?.error === "credentials" || params?.error === "CredentialsSignin";
  const hasConfigError = params?.error === "Configuration" || params?.error === "google-config";
  const whatsappError = params?.error?.startsWith("wa") ? params.error : null;
  const lockedError = params?.error === "locked";
  const triedEmail = params?.email ?? "";
  const triedPhone = params?.phone ?? "";
  // Number of consecutive failed credential attempts (reset when the user navigates away).
  const failureAttempts = Math.max(0, parseInt(params?.attempts ?? "0", 10) || 0);
  const autoShowForgotPassword = failureAttempts >= 2;

  // The login page must never crash because the DB is unreachable. If
  // settings can't be loaded, fall back to a minimal-but-usable form.
  let authSettings: Awaited<ReturnType<typeof getAuthFeatureSettings>>;
  let infrastructureWarning: string | null = null;
  try {
    authSettings = await getAuthFeatureSettings();
  } catch (error) {
    console.error("[login:settings-failed]", error);
    authSettings = {
      googleConfigured: false,
      googleLoginAdminEnabled: false,
      googleLoginEnabled: false,
      whatsappLoginEnabled: false,
      whatsappManualCodeEnabled: false,
      whatsappSenderConfigured: false
    };
    infrastructureWarning =
      "המערכת לא הצליחה להגיע לבסיס הנתונים כרגע. אפשר לנסות להתחבר עם מייל וסיסמה — אם זה לא עובד, נסה שוב בעוד דקה.";
  }
  const googleReady = authSettings.googleLoginEnabled;
  const whatsappReady = authSettings.whatsappLoginEnabled;
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
          <h1 className="mt-16 text-4xl font-black leading-tight md:text-5xl">כניסה למערכת</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            התחברות פשוטה ללקוחות Magic Flow. אם החשבון עדיין ממתין לאישור, נעביר אותך למסך המתנה מסודר.
          </p>
          <div className="mt-8 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm font-semibold leading-7 text-emerald-100">
            אפשר להיכנס עם מייל וסיסמה, Google או קוד חד-פעמי ב-WhatsApp.
          </div>
        </section>

        <section className="border-beam-card rounded-[34px] border border-white/10 bg-white/[0.08] p-6 text-white shadow-2xl backdrop-blur-xl md:p-8">
          <h2 className="text-3xl font-black">טוב שחזרת</h2>
          <p className="mt-2 text-slate-300">בחר דרך כניסה והמשך לדשבורד שלך.</p>

          {infrastructureWarning ? (
            <div className="mt-5 rounded-3xl border border-amber-300/25 bg-amber-300/12 p-4 text-sm font-semibold leading-7 text-amber-100">
              {infrastructureWarning}
            </div>
          ) : null}

          {hasCredentialsError && !autoShowForgotPassword ? (
            <div className="mt-5 rounded-3xl border border-amber-300/25 bg-amber-300/12 p-4 text-sm font-semibold leading-7 text-amber-100">
              <p>פרטי ההתחברות לא זוהו. אפשר לפתוח חשבון חדש או לאפס סיסמה.</p>
              <Link className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-black text-slate-950 transition hover:-translate-y-0.5" href={registerHref}>
                פתיחת חשבון
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          ) : null}

          {/* Auto-surface Forgot Password after 2 consecutive failures */}
          {autoShowForgotPassword ? (
            <div className="mt-5 rounded-3xl border border-red-400/30 bg-red-500/15 p-5 text-sm font-semibold leading-7 text-red-100">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                <div>
                  <p className="font-black text-white">נראה שהסיסמה לא נכונה</p>
                  <p className="mt-1">
                    ניסית להתחבר {failureAttempts} פעמים ללא הצלחה. כדאי לאפס את הסיסמה.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 font-black text-slate-950 transition hover:-translate-y-0.5"
                      href={`/forgot-password${triedEmail ? `?email=${encodeURIComponent(triedEmail)}` : ""}`}
                    >
                      איפוס סיסמה
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <Link
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-4 py-2 font-bold text-white transition hover:-translate-y-0.5"
                      href={registerHref}
                    >
                      פתיחת חשבון חדש
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {hasConfigError ? (
            <div className="mt-5 rounded-3xl border border-red-300/25 bg-red-300/12 p-4 text-sm font-semibold leading-7 text-red-100">
              Google Login עדיין לא פעיל. צריך להגדיר GOOGLE_CLIENT_SECRET ולהפעיל את הכניסה דרך ממשק הניהול.
            </div>
          ) : null}

          {whatsappError ? (
            <div className="mt-5 rounded-3xl border border-amber-300/25 bg-amber-300/12 p-4 text-sm font-semibold leading-7 text-amber-100">
              {whatsappError === "wa-config"
                ? "שליחת קוד WhatsApp לא זמינה כרגע. צריך להגדיר WHATSAPP_ACCESS_TOKEN ו-WHATSAPP_PHONE_NUMBER_ID."
                : whatsappError === "wa-disabled"
                  ? "כניסה עם WhatsApp כבויה כרגע בממשק הניהול."
                : whatsappError === "wa-user"
                  ? "לא נמצא חשבון פעיל עם מספר הטלפון הזה."
                  : whatsappError === "wa-code"
                    ? "הקוד שהוזן לא תקין או פג תוקף."
                    : "צריך להזין מספר טלפון תקין."}
            </div>
          ) : null}

          {lockedError ? (
            <div className="mt-5 rounded-3xl border border-red-300/25 bg-red-300/12 p-4 text-sm font-semibold leading-7 text-red-100">
              המשתמש נעול. יש לפנות לתמיכה של Magic Flow במספר <span dir="ltr">054-246-6340</span>.
            </div>
          ) : null}

          <form action={loginAction} className="mt-6 space-y-4">
            {/* Carry the failure counter forward so loginAction can increment it */}
            <input type="hidden" name="attempts" value={failureAttempts} />
            <label className="block">
              <span className="font-bold text-slate-200">אימייל</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" defaultValue={triedEmail} dir="ltr" name="email" required type="email" />
            </label>
            <label className="block">
              <span className="font-bold text-slate-200">סיסמה</span>
              <input className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]" name="password" required type="password" />
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

          {googleReady ? (
            <form action={googleAction}>
              <button className="h-12 w-full rounded-2xl border border-white/10 bg-white text-sm font-black text-slate-950 transition hover:-translate-y-0.5" type="submit">
                כניסה עם Google
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-semibold leading-7 text-slate-200">
              התחברות Google תופעל אחרי הגדרת GOOGLE_CLIENT_SECRET בסביבת השרת והפעלה בממשק הניהול.
            </div>
          )}

          {whatsappReady ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <p className="font-black text-white">כניסה עם WhatsApp</p>
              <form action={requestWhatsAppCodeAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 text-left text-white outline-none focus:border-cyan-300" defaultValue={triedPhone} dir="ltr" name="phone" placeholder="0501234567" required />
                <button className="h-11 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950" type="submit">שלח קוד</button>
              </form>
              {params?.wa === "manual" ? (
                <div className="mt-3 rounded-2xl border border-cyan-200/20 bg-cyan-200/10 p-3 text-sm font-semibold leading-6 text-cyan-50">
                  אין כרגע שולח WhatsApp פעיל. אפשר להזין כאן קוד שהוגדר בממשק הניהול.
                </div>
              ) : null}
              {params?.wa === "sent" || params?.wa === "manual" ? (
                <form action={verifyWhatsAppCodeAction} className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input name="phone" type="hidden" value={triedPhone} />
                  <input className="h-11 flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 text-center text-white outline-none focus:border-cyan-300" dir="ltr" inputMode="numeric" name="otpCode" placeholder="קוד בן 6 ספרות" required />
                  <button className="h-11 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-slate-950" type="submit">אמת והיכנס</button>
                </form>
              ) : null}
            </div>
          ) : null}

          <p className="mt-6 text-sm text-slate-300">
            עדיין אין חשבון? <Link className="font-bold text-cyan-200 hover:text-white" href="/register">הרשמה</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
