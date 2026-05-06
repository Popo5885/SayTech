import { NextResponse } from "next/server";
import { maskEmail } from "@lottery/core";
import { prisma } from "@lottery/db";
import { ownerEmail, sendSystemEmail } from "../../../lib/email";
import { normalizeIsraeliPhone } from "../../../lib/phone";

const db = prisma as any;

type ContactPayload = {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  accepted?: unknown;
};

type FieldErrors = Partial<Record<"fullName" | "email" | "phone" | "accepted", string>>;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validate(payload: ContactPayload) {
  const fullName = String(payload.fullName ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const rawPhone = String(payload.phone ?? "");
  const phone = normalizeIsraeliPhone(rawPhone);
  const message = String(payload.message ?? "").trim();
  const accepted = payload.accepted === true;
  const fieldErrors: FieldErrors = {};

  if (!fullName) {
    fieldErrors.fullName = "צריך למלא שם מלא.";
  }

  if (!isValidEmail(email)) {
    fieldErrors.email = "צריך להזין אימייל תקין.";
  }

  if (!phone) {
    fieldErrors.phone = "צריך להזין מספר טלפון תקין.";
  }

  if (!accepted) {
    fieldErrors.accepted = "צריך לאשר יצירת קשר ושמירת פרטים.";
  }

  return {
    values: { fullName, email, phone, message },
    fieldErrors
  };
}

export async function POST(request: Request) {
  let payload: ContactPayload;

  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { values, fieldErrors } = validate(payload);

  if (Object.keys(fieldErrors).length > 0 || !values.phone) {
    return NextResponse.json({ fieldErrors }, { status: 400 });
  }

  try {
    await db.contactLead.create({
      data: {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        message: values.message,
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date()
      }
    });

    const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
    const [visitorMailSent, ownerMailSent] = await Promise.all([
      sendSystemEmail({
        to: values.email,
        subject: "קיבלנו את הפנייה שלך ל-Magic Flow",
        html: `<h1>הפנייה התקבלה</h1><p>שלום ${values.fullName}, תודה שפנית לצוות Magic Flow.</p><p>הפנייה נשמרה כליד עסקי, וצוות התמיכה יחזור אליך בהקדם עם מענה מסודר.</p>`
      }),
      sendSystemEmail({
        to: ownerEmail(),
        subject: "ליד חדש מ-Magic Flow",
        html: `<h1>ליד חדש מצור קשר</h1><p><strong>${values.fullName}</strong></p><p>${values.email}</p><p dir="ltr">${values.phone}</p><p>${values.message || "לא נכתבה הודעה."}</p><p><a href="${baseUrl}/admin">מעבר ללוח הניהול</a></p>`
      })
    ]);

    if (!visitorMailSent || !ownerMailSent) {
      console.error("[contact:email-failed]", {
        visitorMailSent,
        ownerMailSent,
        leadEmailMasked: maskEmail(values.email)
      });
    }

    return NextResponse.json({
      ok: true,
      mailSent: visitorMailSent && ownerMailSent
    });
  } catch (error) {
    console.error("[contact:submit-failed]", {
      leadEmailMasked: values.email ? maskEmail(values.email) : null,
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: "שליחת הפנייה נכשלה. הפרטים נשארו בטופס ואפשר לנסות שוב." },
      { status: 500 }
    );
  }
}
