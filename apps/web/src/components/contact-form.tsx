"use client";

import { useRef, useState } from "react";

type FieldErrors = {
  fullName?: string;
  email?: string;
  phone?: string;
  accepted?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^0[0-9]{8,9}$/.test(value.replace(/[\s\-]/g, ""));
}

export function ContactForm({
  action,
  mailFailed
}: {
  action: (data: FormData) => Promise<void>;
  mailFailed?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(form: HTMLFormElement): FieldErrors {
    const errs: FieldErrors = {};
    const fullName = (form.elements.namedItem("fullName") as HTMLInputElement)?.value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value.trim();
    const phone = (form.elements.namedItem("phone") as HTMLInputElement)?.value.trim();
    const accepted = (form.elements.namedItem("accepted") as HTMLInputElement)?.checked;

    if (!fullName) errs.fullName = "נדרש שם מלא";
    if (!email) errs.email = "נדרש אימייל";
    else if (!isValidEmail(email)) errs.email = "כתובת אימייל לא תקינה";
    if (!phone) errs.phone = "נדרש מספר טלפון";
    else if (!isValidPhone(phone)) errs.phone = "מספר טלפון לא תקין";
    if (!accepted) errs.accepted = "יש לסמן אישור יצירת קשר";

    return errs;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const errs = validate(form);

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setSubmitting(true);

    const data = new FormData(form);
    await action(data);
    setSubmitting(false);
  }

  const inputClass =
    "mt-2 h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]";
  const errorClass = "mt-1 text-sm font-semibold text-red-400";

  return (
    <form ref={formRef} className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
      {mailFailed && (
        <p className="rounded-2xl border border-amber-200/30 bg-amber-200/15 p-3 text-sm font-bold leading-6 text-amber-50">
          הפנייה נשמרה במערכת. מייל האישור לא יצא כי הגדרות SMTP עדיין לא מלאות.
        </p>
      )}

      <div>
        <label className="block">
          <span className="font-bold text-slate-200">שם מלא</span>
          <input
            className={inputClass}
            name="fullName"
            onChange={() => errors.fullName && setErrors(p => ({ ...p, fullName: undefined }))}
            type="text"
          />
        </label>
        {errors.fullName && <p className={errorClass}>{errors.fullName}</p>}
      </div>

      <div>
        <label className="block">
          <span className="font-bold text-slate-200">אימייל</span>
          <input
            className={inputClass}
            dir="ltr"
            name="email"
            onChange={() => errors.email && setErrors(p => ({ ...p, email: undefined }))}
            type="email"
          />
        </label>
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>

      <div>
        <label className="block">
          <span className="font-bold text-slate-200">טלפון</span>
          <input
            className={inputClass}
            dir="ltr"
            name="phone"
            onChange={() => errors.phone && setErrors(p => ({ ...p, phone: undefined }))}
            placeholder="0501234567"
            type="tel"
          />
        </label>
        {errors.phone && <p className={errorClass}>{errors.phone}</p>}
      </div>

      <div>
        <label className="block">
          <span className="font-bold text-slate-200">מה חשוב לך במערכת?</span>
          <textarea
            className="mt-2 min-h-32 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
            name="message"
            placeholder="לדוגמה: הגרלה, שמירת אנשי קשר, WhatsApp Official, קבלות או אוטומציות."
          />
        </label>
      </div>

      <div>
        <label className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-6 text-slate-300">
          <input
            className="mt-1"
            name="accepted"
            onChange={() => errors.accepted && setErrors(p => ({ ...p, accepted: undefined }))}
            type="checkbox"
          />
          <span>אני מאשר יצירת קשר ושמירת הפרטים לצורך טיפול בפנייה.</span>
        </label>
        {errors.accepted && <p className={errorClass}>{errors.accepted}</p>}
      </div>

      <button
        className="h-12 w-full rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-sm font-black text-white shadow-[0_0_35px_rgba(34,211,238,0.20)] transition hover:-translate-y-0.5 disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "שולח..." : "שליחת פרטים"}
      </button>
    </form>
  );
}
