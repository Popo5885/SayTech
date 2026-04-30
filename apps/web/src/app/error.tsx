"use client";

// Global error boundary. Shown for any uncaught error in a server or client
// component under app/. Replaces the default "A server error occurred. ERROR
// <digest>" Next.js page with a friendly Hebrew message and the support phone.

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalErrorBoundary({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui:error-boundary]", error);
  }, [error]);

  return (
    <main
      className="aurora-surface relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070914] px-4 py-10 text-white"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-rose-400/20 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/24 blur-[130px]" />
      </div>

      <section className="relative z-10 w-full max-w-xl rounded-[34px] border border-white/10 bg-white/[0.07] p-8 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-sm font-black tracking-wide text-cyan-200">Magic Flow</p>
        <h1 className="mt-4 text-3xl font-black md:text-4xl">העמוד נתקל בתקלה זמנית</h1>
        <p className="mt-4 text-base leading-7 text-slate-200">
          ניסינו לטעון את העמוד אבל משהו קצר לרגע. אפשר לנסות שוב, או לחזור לעמוד הבית. אם זה ממשיך, צוות Magic Flow כאן בשבילך.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            className="h-12 rounded-2xl bg-cyan-300 px-6 text-sm font-black text-slate-950 shadow-[0_14px_35px_rgba(34,211,238,0.28)] transition hover:-translate-y-0.5"
            onClick={() => reset()}
            type="button"
          >
            נסה שוב
          </button>
          <Link
            className="h-12 rounded-2xl border border-white/15 bg-white/5 px-6 text-sm font-black leading-[3rem] text-white transition hover:-translate-y-0.5 hover:bg-white/10"
            href="/"
          >
            חזרה לעמוד הבית
          </Link>
          <a
            className="h-12 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 px-6 text-sm font-black leading-[3rem] text-emerald-100 transition hover:-translate-y-0.5"
            href="tel:0542466340"
          >
            חיוג מהיר לתמיכה: 054-246-6340
          </a>
        </div>

        {error?.digest ? (
          <p className="mt-6 text-xs font-semibold text-slate-400">
            קוד אבחון: <span dir="ltr">{error.digest}</span>
          </p>
        ) : null}
      </section>
    </main>
  );
}
