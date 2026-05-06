import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles, Smartphone, CheckCircle, XCircle } from "lucide-react";
import { prisma } from "@lottery/db";
import { SuccessSubmitButton } from "../../../components/success-submit-button";
import { getAuthFeatureSettings } from "../../../lib/auth-settings";
import { normalizeIsraeliPhone } from "../../../lib/phone";
import { verifyPassword, createVerificationCode, hashVerificationCode } from "../../../lib/password";
import { sendWhatsAppText } from "../../../lib/whatsapp";

const db = prisma as any;

async function approveQrByPassword(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const session = await db.qrLoginSession.findUnique({ where: { token } });

  if (!session || session.status !== "pending" || new Date() > session.expiresAt) {
    redirect(`/qr-login/${token}?error=expired`);
  }

  const user = await db.user.findUnique({ where: { email } });

  if (!user || !verifyPassword(password, user.passwordHash) || user.accountStatus !== "active") {
    redirect(`/qr-login/${token}?error=credentials`);
  }

  await db.qrLoginSession.update({
    where: { token },
    data: { status: "authenticated", userId: user.id }
  });

  redirect(`/qr-login/${token}?approved=1`);
}

async function requestQrWhatsAppCode(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const phone = normalizeIsraeliPhone(String(formData.get("phone") ?? ""));
  const settings = await getAuthFeatureSettings();

  if (!settings.whatsappLoginEnabled) {
    redirect(`/qr-login/${token}?error=wa-disabled`);
  }

  if (!phone) {
    redirect(`/qr-login/${token}?error=wa-phone`);
  }

  const user = await db.user.findFirst({ where: { phone, accountStatus: "active" } });

  if (!user) {
    redirect(`/qr-login/${token}?error=wa-user&phone=${encodeURIComponent(phone)}`);
  }

  const code = createVerificationCode();
  const sent = await sendWhatsAppText({
    to: phone,
    body: `קוד האישור ל-Magic Flow הוא ${code}. הקוד תקף ל-10 דקות.`
  });

  if (!sent) {
    if (settings.whatsappManualCodeEnabled) {
      redirect(`/qr-login/${token}?wa=manual&phone=${encodeURIComponent(phone)}`);
    }

    redirect(`/qr-login/${token}?error=wa-config&phone=${encodeURIComponent(phone)}`);
  }

  await db.whatsAppLoginCode.create({
    data: {
      phone,
      codeHash: hashVerificationCode(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  redirect(`/qr-login/${token}?wa=sent&phone=${encodeURIComponent(phone)}`);
}

async function verifyQrWhatsAppCode(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const phone = normalizeIsraeliPhone(String(formData.get("phone") ?? ""));
  const otpCode = String(formData.get("otpCode") ?? "").trim();
  const settings = await getAuthFeatureSettings();

  if (!settings.whatsappLoginEnabled) {
    redirect(`/qr-login/${token}?error=wa-disabled`);
  }

  const loginCode = await db.whatsAppLoginCode.findFirst({
    where: {
      phone,
      codeHash: hashVerificationCode(otpCode),
      usedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  const user = loginCode
    ? await db.user.findFirst({ where: { phone, accountStatus: "active" } })
    : null;

  if (!loginCode || !user) {
    redirect(`/qr-login/${token}?error=wa-code&phone=${encodeURIComponent(phone ?? "")}&wa=sent`);
  }

  await Promise.all([
    db.whatsAppLoginCode.update({
      where: { id: loginCode.id },
      data: { usedAt: new Date() }
    }),
    db.qrLoginSession.update({
      where: { token },
      data: { status: "authenticated", userId: user.id }
    })
  ]);

  redirect(`/qr-login/${token}?approved=1`);
}

export default async function QrLoginPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ error?: string; phone?: string; wa?: string; approved?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;

  const session = await db.qrLoginSession.findUnique({ where: { token } });
  const expired = !session || new Date() > session.expiresAt;
  const alreadyUsed = session?.status === "used";
  const approved = sp?.approved === "1" || session?.status === "authenticated";

  const triedPhone = sp?.phone ?? "";
  const credError = sp?.error === "credentials";
  const waError = sp?.error?.startsWith("wa") ? sp.error : null;

  const settings = await getAuthFeatureSettings().catch(() => null);
  const whatsappReady = settings?.whatsappLoginEnabled ?? false;

  return (
    <main className="min-h-screen bg-[#070914] px-4 py-10 text-white" dir="rtl">
      <div className="mx-auto max-w-md">
        <Link className="inline-flex items-center gap-3 text-lg font-black" href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-white shadow-[0_0_35px_rgba(34,211,238,0.24)]">
            <Sparkles className="h-5 w-5" />
          </span>
          Magic Flow
        </Link>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-cyan-300" />
            <h1 className="text-2xl font-black">אישור כניסה ממכשיר נייד</h1>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            סרקת קוד QR מהמחשב. אמת את זהותך כאן כדי לאפשר את הכניסה.
          </p>

          {expired || alreadyUsed ? (
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <XCircle className="h-12 w-12 text-red-400" />
              <p className="font-black text-white">
                {alreadyUsed ? "הקוד כבר נוצל" : "קוד ה-QR פג תוקף"}
              </p>
              <p className="text-sm text-slate-300">חזור למחשב וסרוק קוד QR חדש.</p>
            </div>
          ) : approved ? (
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-400" />
              <p className="font-black text-white">הכניסה אושרה!</p>
              <p className="text-sm text-slate-300">
                המחשב שלך יתחבר אוטומטית תוך שניות ספורות.
              </p>
            </div>
          ) : (
            <>
              {credError && (
                <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/12 p-3 text-sm font-semibold text-amber-100">
                  פרטי הכניסה שגויים. נסה שוב.
                </div>
              )}
              {waError && (
                <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/12 p-3 text-sm font-semibold text-amber-100">
                  {waError === "wa-user"
                    ? "לא נמצא חשבון פעיל עם מספר זה."
                    : waError === "wa-code"
                      ? "הקוד שגוי או פג תוקף."
                      : "שגיאה בשליחת קוד WhatsApp."}
                </div>
              )}

              <form action={approveQrByPassword} className="mt-6 space-y-3">
                <input type="hidden" name="token" value={token} />
                <label className="block">
                  <span className="text-sm font-bold text-slate-200">אימייל</span>
                  <input
                    className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300"
                    dir="ltr"
                    name="email"
                    required
                    type="email"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-200">סיסמה</span>
                  <input
                    className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none focus:border-cyan-300"
                    name="password"
                    required
                    type="password"
                  />
                </label>
                <SuccessSubmitButton>אשר כניסה</SuccessSubmitButton>
              </form>

              {whatsappReady && (
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-sm font-black text-white">או אמת עם WhatsApp</p>
                  <form action={requestQrWhatsAppCode} className="mt-3 flex gap-2">
                    <input type="hidden" name="token" value={token} />
                    <input
                      className="h-10 flex-1 rounded-2xl border border-white/10 bg-white/10 px-3 text-left text-white outline-none focus:border-cyan-300"
                      defaultValue={triedPhone}
                      dir="ltr"
                      name="phone"
                      placeholder="0501234567"
                      required
                    />
                    <button
                      className="h-10 rounded-2xl bg-cyan-300 px-4 text-sm font-black text-slate-950"
                      type="submit"
                    >
                      שלח קוד
                    </button>
                  </form>
                  {(sp?.wa === "sent" || sp?.wa === "manual") && (
                    <form action={verifyQrWhatsAppCode} className="mt-3 flex gap-2">
                      <input type="hidden" name="token" value={token} />
                      <input type="hidden" name="phone" value={triedPhone} />
                      <input
                        className="h-10 flex-1 rounded-2xl border border-white/10 bg-white/10 px-3 text-center text-white outline-none focus:border-cyan-300"
                        dir="ltr"
                        inputMode="numeric"
                        name="otpCode"
                        placeholder="קוד 6 ספרות"
                        required
                      />
                      <button
                        className="h-10 rounded-2xl bg-emerald-400 px-4 text-sm font-black text-slate-950"
                        type="submit"
                      >
                        אמת
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
