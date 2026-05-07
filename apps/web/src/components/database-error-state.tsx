import Link from "next/link";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";

export function DatabaseErrorState({
  title = "המערכת לא מצליחה להתחבר למסד הנתונים",
  description = "הנתונים לא זמינים כרגע. בדקו ש-DATABASE_URL מוגדר בסביבה המקומית וב-Railway, וש-Prisma נוצר מול הסכמה הנכונה.",
  retryHref = "/dashboard"
}: {
  title?: string;
  description?: string;
  retryHref?: string;
}) {
  return (
    <section
      className="mx-auto max-w-3xl rounded-[32px] border border-red-100 bg-white p-6 text-right shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8"
      dir="rtl"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-red-50 text-red-600 ring-1 ring-red-100">
          <Database className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            תקלה זמנית בנתונים
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-normal text-slate-950 md:text-3xl">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-600 md:text-base">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white shadow-[0_16px_36px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800"
              href={retryHref}
            >
              <RefreshCw className="h-4 w-4" />
              נסה לרענן
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-800 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
              href="/"
            >
              חזרה לעמוד הבית
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
