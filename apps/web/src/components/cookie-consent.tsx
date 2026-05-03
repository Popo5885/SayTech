"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

// Cookie consent banner with a preferences modal.
//
// Behaviour:
// - Hidden when the user has already saved a choice (consent stored in
//   localStorage under CONSENT_STORAGE_KEY).
// - "Accept all" stores marketing=true and dispatches `consentchange` so
//   downstream scripts (Facebook Pixel, analytics) can boot.
// - "Manage preferences" opens a modal with a toggle for marketing/analytics
//   and a "Save settings" button.
// - Other components subscribe to the `consentchange` window event to enable
//   themselves only after explicit consent.

export type ConsentValue = {
  marketing: boolean;
  necessary: true; // always granted; informational
  decidedAt: string;
};

export const CONSENT_STORAGE_KEY = "magicflow:cookie-consent:v1";
export const CONSENT_EVENT = "consentchange";

export function readConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentValue;
    if (typeof parsed.marketing !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent<ConsentValue>(CONSENT_EVENT, { detail: value }));
}

export function CookieConsent() {
  // `null` means "haven't decided what to render yet" — important to avoid
  // flashing the banner on hydrated pages where consent already exists.
  const [stored, setStored] = useState<ConsentValue | null | undefined>(undefined);
  const [showPreferences, setShowPreferences] = useState(false);
  const [marketingPref, setMarketingPref] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    setStored(existing);
    setMarketingPref(existing?.marketing ?? false);
  }, []);

  const isOpen = stored === null;
  const palette = useMemo(
    () => ({
      banner:
        "fixed inset-x-0 bottom-0 z-[1000] mx-auto flex max-w-5xl flex-col gap-4 rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:flex-row sm:items-center sm:justify-between",
      modalBackdrop:
        "fixed inset-0 z-[1100] flex items-end justify-center bg-slate-900/60 p-4 sm:items-center",
      modalCard:
        "w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
    }),
    []
  );

  if (stored === undefined) return null; // still loading on the client

  function acceptAll() {
    const value: ConsentValue = {
      marketing: true,
      necessary: true,
      decidedAt: new Date().toISOString()
    };
    writeConsent(value);
    setStored(value);
  }

  function savePreferences() {
    const value: ConsentValue = {
      marketing: marketingPref,
      necessary: true,
      decidedAt: new Date().toISOString()
    };
    writeConsent(value);
    setStored(value);
    setShowPreferences(false);
  }

  return (
    <>
      {isOpen && !showPreferences ? (
        <div
          aria-live="polite"
          className={palette.banner}
          dir="rtl"
          role="region"
          aria-label="הסכמה לשימוש בעוגיות"
        >
          <div className="text-sm leading-relaxed text-slate-700">
            אנו משתמשים בעוגיות כדי לאפשר את פעולת האתר ולשפר את חווית השימוש. עוגיות שיווק
            ואנליטיקה ייטענו רק לאחר הסכמתך. למידע נוסף ראה את{" "}
            <Link href="/privacy" className="font-bold text-blue-600 underline">
              מדיניות הפרטיות
            </Link>
            .
          </div>
          <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row">
            <button
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => setShowPreferences(true)}
              type="button"
            >
              ניהול העדפות
            </button>
            <button
              className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              onClick={acceptAll}
              type="button"
            >
              מאשר הכל
            </button>
          </div>
        </div>
      ) : null}

      {showPreferences ? (
        <div className={palette.modalBackdrop} dir="rtl" role="dialog" aria-modal="true">
          <div className={palette.modalCard}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">ניהול העדפות עוגיות</h2>
              <button
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setShowPreferences(false)}
                type="button"
                aria-label="סגירת חלון העדפות"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">חיוניות (תמיד פעילות)</h3>
                    <p className="mt-1 text-slate-600">
                      עוגיות שדרושות לאימות ולפעולה הבסיסית של האתר. לא ניתן לכבות.
                    </p>
                  </div>
                  <span
                    aria-label="עוגיות חיוניות תמיד דולקות"
                    className="inline-flex h-6 w-11 items-center rounded-full bg-blue-600 px-1"
                  >
                    <span className="block h-4 w-4 translate-x-5 rounded-full bg-white" />
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">קוקיז שיווק ואנליטיקה</h3>
                    <p className="mt-1 text-slate-600">
                      מאפשרים מדידת תנועה, רימרקטינג ופיקסל פייסבוק. ניתנים לשליטה מלאה.
                    </p>
                  </div>
                  <button
                    aria-pressed={marketingPref}
                    aria-label="הפעלה או כיבוי של עוגיות שיווק ואנליטיקה"
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                      marketingPref ? "bg-blue-600" : "bg-slate-300"
                    }`}
                    onClick={() => setMarketingPref((value) => !value)}
                    type="button"
                  >
                    <span
                      className={`block h-4 w-4 transform rounded-full bg-white transition ${
                        marketingPref ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => setShowPreferences(false)}
                type="button"
              >
                ביטול
              </button>
              <button
                className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                onClick={savePreferences}
                type="button"
              >
                שמור הגדרות
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
