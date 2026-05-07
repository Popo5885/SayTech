"use client";

import Link from "next/link";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Home, RefreshCw, Sparkles } from "lucide-react";

export default function ErrorBoundary({
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
    <main className="stitch-page flex min-h-screen items-center justify-center px-5 py-10 text-slate-950" dir="rtl">
      <motion.section
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        <motion.div
          animate={{ rotate: [0, -5, 5, 0], y: [0, -4, 0] }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-amber-100 text-amber-700"
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.2 }}
        >
          <AlertTriangle className="h-7 w-7" />
        </motion.div>
        <p className="mt-6 text-sm font-black text-blue-700">Magic Flow</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950">
          משהו נעצר באמצע הזרימה
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-8 text-slate-600">
          העמוד נתקל בשגיאה זמנית. אפשר לנסות שוב, לחזור לדשבורד או לפתוח את האתר הציבורי.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button className="stitch-button bg-slate-950 text-white" onClick={() => reset()} type="button">
            <RefreshCw className="h-4 w-4" />
            נסה שוב
          </button>
          <Link className="stitch-button border border-slate-200 bg-white text-slate-950" href="/dashboard">
            <Home className="h-4 w-4" />
            לדשבורד
          </Link>
          <Link className="stitch-button border border-slate-200 bg-white text-slate-950" href="/">
            <Sparkles className="h-4 w-4" />
            לעמוד הבית
          </Link>
        </div>

        {error?.digest ? (
          <p className="mt-6 text-xs font-bold text-slate-400">
            קוד אבחון: <span dir="ltr">{error.digest}</span>
          </p>
        ) : null}
      </motion.section>
    </main>
  );
}
