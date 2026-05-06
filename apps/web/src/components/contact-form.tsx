"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";

type ContactValues = {
  fullName: string;
  email: string;
  phone: string;
  message: string;
  accepted: boolean;
};

type ContactField = keyof ContactValues | "form";
type FieldErrors = Partial<Record<ContactField, string>>;

const initialValues: ContactValues = {
  fullName: "",
  email: "",
  phone: "",
  message: "",
  accepted: false
};

const inputClass =
  "mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]";
const errorClass = "mt-2 text-sm font-bold leading-6 text-red-200";

function validate(values: ContactValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "צריך למלא שם מלא.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "צריך להזין אימייל תקין.";
  }

  if (values.phone.replace(/[^\d+]/g, "").length < 9) {
    errors.phone = "צריך להזין מספר טלפון תקין.";
  }

  if (!values.accepted) {
    errors.accepted = "צריך לאשר יצירת קשר ושמירת פרטים.";
  }

  return errors;
}

function SuccessMessage({ mailFailed }: { mailFailed: boolean }) {
  return (
    <div className="mt-6 rounded-3xl border border-emerald-300/25 bg-emerald-300/12 p-5 text-emerald-50">
      <p className="font-black">הפנייה נשלחה בהצלחה.</p>
      <p className="mt-2 text-sm leading-6 text-emerald-100">
        צוות Magic Flow יחזור אליך בהקדם.
      </p>
      {mailFailed ? (
        <p className="mt-3 rounded-2xl border border-amber-200/30 bg-amber-200/15 p-3 text-sm font-bold leading-6 text-amber-50">
          הפנייה נשמרה במערכת. מייל האישור לא יצא כי הגדרות SMTP עדיין לא מלאות.
        </p>
      ) : null}
    </div>
  );
}

export function ContactForm({
  initialSent = false,
  initialMailFailed = false,
  showInitialError = false
}: {
  initialSent?: boolean;
  initialMailFailed?: boolean;
  showInitialError?: boolean;
}) {
  const [values, setValues] = useState<ContactValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>(
    showInitialError ? { form: "צריך למלא את כל שדות החובה." } : {}
  );
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(initialSent);
  const [mailFailed, setMailFailed] = useState(initialMailFailed);

  function update<K extends keyof ContactValues>(key: K, value: ContactValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clientErrors = validate(values);

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setPending(true);
    setErrors({});

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: FieldErrors;
        mailSent?: boolean;
      };

      if (!response.ok) {
        setErrors(payload.fieldErrors ?? { form: payload.error ?? "שליחת הפנייה נכשלה." });
        return;
      }

      setMailFailed(payload.mailSent === false);
      setSent(true);
    } catch {
      setErrors({ form: "שליחת הפנייה נכשלה. הפרטים נשארו בטופס ואפשר לנסות שוב." });
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return <SuccessMessage mailFailed={mailFailed} />;
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
      {errors.form ? (
        <div className="rounded-2xl border border-red-300/25 bg-red-300/12 p-4 text-sm font-semibold text-red-100">
          {errors.form}
        </div>
      ) : null}

      <label className="block">
        <span className="font-bold text-slate-200">שם מלא</span>
        <input
          className={inputClass}
          name="fullName"
          onChange={(event) => update("fullName", event.target.value)}
          value={values.fullName}
        />
        {errors.fullName ? <p className={errorClass}>{errors.fullName}</p> : null}
      </label>

      <label className="block">
        <span className="font-bold text-slate-200">אימייל</span>
        <input
          className={inputClass}
          dir="ltr"
          name="email"
          onChange={(event) => update("email", event.target.value)}
          type="email"
          value={values.email}
        />
        {errors.email ? <p className={errorClass}>{errors.email}</p> : null}
      </label>

      <label className="block">
        <span className="font-bold text-slate-200">טלפון</span>
        <input
          className={`${inputClass} text-left placeholder:text-slate-500`}
          dir="ltr"
          name="phone"
          onChange={(event) => update("phone", event.target.value)}
          placeholder="0501234567"
          value={values.phone}
        />
        {errors.phone ? <p className={errorClass}>{errors.phone}</p> : null}
      </label>

      <label className="block">
        <span className="font-bold text-slate-200">מה חשוב לך במערכת?</span>
        <textarea
          className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
          name="message"
          onChange={(event) => update("message", event.target.value)}
          placeholder="לדוגמה: הגרלה, שמירת אנשי קשר, WhatsApp Official, קבלות או אוטומציות."
          value={values.message}
        />
      </label>

      <label className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-300">
        <input
          checked={values.accepted}
          className="mt-1"
          name="accepted"
          onChange={(event) => update("accepted", event.target.checked)}
          type="checkbox"
        />
        <span>אני מאשר יצירת קשר ושמירת הפרטים לצורך טיפול בפנייה.</span>
      </label>
      {errors.accepted ? <p className={errorClass}>{errors.accepted}</p> : null}

      <button
        className={`success-submit-btn ${sent ? "done" : ""}`}
        disabled={pending}
        type="submit"
      >
        <span className="label">{pending ? "שולח..." : "שליחת פרטים"}</span>
        <Check className="check-svg" aria-hidden="true" />
      </button>
    </form>
  );
}
