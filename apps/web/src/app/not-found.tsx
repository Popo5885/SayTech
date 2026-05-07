import Link from "next/link";
import { Home, LayoutDashboard, SearchX, Sparkles } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main className="stitch-page flex min-h-screen items-center justify-center px-5 py-10 text-slate-950" dir="rtl">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          <SearchX className="h-8 w-8" />
        </div>
        <p className="mt-6 text-sm font-black text-blue-700">404</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-slate-950">
          העמוד הזה לא נמצא
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base font-semibold leading-8 text-slate-600">
          כנראה שהקישור השתנה, נמחק או הוקלד לא נכון. אפשר לחזור למקום בטוח ולהמשיך לעבוד.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className="stitch-button bg-slate-950 text-white" href="/">
            <Home className="h-4 w-4" />
            עמוד הבית
          </Link>
          <Link className="stitch-button border border-slate-200 bg-white text-slate-950" href="/dashboard">
            <LayoutDashboard className="h-4 w-4" />
            דשבורד
          </Link>
          <Link className="stitch-button border border-slate-200 bg-white text-slate-950" href="/login">
            <Sparkles className="h-4 w-4" />
            כניסה
          </Link>
        </div>
      </section>
    </main>
  );
}
