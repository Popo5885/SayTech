import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ContactRound,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
  Zap
} from "lucide-react";

const contactPhone = "054-246-6340";

const features = [
  {
    title: "הגרלה ויראלית בלי כאב ראש",
    description: "המשתתף נכנס דרך WhatsApp, מקבל קישור אישי, והמערכת מזהה מי הביא את מי בלי שאלות מיותרות.",
    icon: UsersRound
  },
  {
    title: "דשבורד חי, לא דמו",
    description: "רשומים, הפניות, הודעות וזוכים נמשכים מהשרת ומה-Worker. אם אין נתון אמיתי, מוצג 0.",
    icon: BarChart3
  },
  {
    title: "שמירת אנשי קשר וגוגל",
    description: "סנכרון ל-Google Contacts, יצוא vCard, ושליחת אנשי קשר בפורמט שמתאים ל-WhatsApp.",
    icon: ContactRound
  },
  {
    title: "שליטה מלאה למנהל",
    description: "אישורי משתמשים, שיוך מספרים, מגבלות שליחה, צוותים והרשאות מתוך SuperAdmin פשוט.",
    icon: ShieldCheck
  }
];

const processSteps = [
  "מחברים WhatsApp ב-QR, קוד התאמה או Cloud API",
  "עורכים את זרימת ההודעות בעורך No-Code",
  "משתפים קישור הצטרפות והמערכת מודדת הכל",
  "מבצעים הגרלה משוקללת עם Audit מלא"
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070a12] text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute right-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-cyan-400/20 blur-[110px]" />
        <div className="absolute bottom-[-14rem] left-[-10rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/25 blur-[120px]" />
        <div className="absolute left-1/2 top-36 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[90px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 shadow-[0_0_35px_rgba(34,211,238,0.24)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">Magic Flow</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a className="transition hover:text-white" href="#features">יכולות</a>
          <a className="transition hover:text-white" href="#dashboard">דשבורד</a>
          <a className="transition hover:text-white" href="#pricing">מחיר</a>
          <a className="transition hover:text-white" href={`tel:${contactPhone.replaceAll("-", "")}`}>
            {contactPhone}
          </a>
        </nav>
        <Link
          className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
          href="/dashboard"
        >
          כניסה למערכת
        </Link>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1fr_0.95fr] lg:px-8">
        <div className="space-y-8 text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            SaaS להגרלות WhatsApp שעובד בזמן אמת
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              הגרלות WhatsApp שנראות מקצועי,
              <span className="block bg-gradient-to-l from-cyan-200 via-emerald-200 to-violet-300 bg-clip-text text-transparent">
                ומרגישות פשוטות.
              </span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              Magic Flow הופכת קמפיין הגרלה למכונת הפניות: קישור אישי, זיהוי מפנה,
              שמירת אנשי קשר, דשבורד חי והגרלה שקופה עם Audit.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-l from-cyan-300 to-violet-500 px-6 text-base font-bold text-slate-950 shadow-[0_18px_70px_rgba(34,211,238,0.22)] transition hover:-translate-y-0.5"
              href="/dashboard"
            >
              לראות את הדשבורד
              <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
            </Link>
            <a
              className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 text-base font-bold text-white backdrop-blur transition hover:bg-white/15"
              href="https://wa.me/972542466340"
              rel="noreferrer"
              target="_blank"
            >
              דבר איתי ב-WhatsApp
              <MessageCircle className="h-5 w-5" />
            </a>
          </div>

          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              ["1:3", "מספר אחד עד 3 לקוחות"],
              ["0", "נתוני דמו במסכים"],
              ["1,000 ₪", "מסלול פרימיום"]
            ].map(([value, label]) => (
              <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                <p className="font-[var(--font-heading)] text-2xl font-bold text-white">{value}</p>
                <p className="mt-1 text-sm text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="dashboard" className="relative">
          <div className="absolute inset-0 translate-y-8 rounded-[2.5rem] bg-cyan-300/10 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/12 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1424] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-300" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-slate-400">dashboard.magic-flow.co.il</span>
              </div>

              <div className="rounded-3xl bg-gradient-to-l from-emerald-400 to-cyan-400 p-5 text-slate-950">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-950" />
                  WhatsApp מחובר ופעיל
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white/35 p-3">
                    <p className="text-xs font-semibold opacity-70">רשומים</p>
                    <p className="text-2xl font-black">Live</p>
                  </div>
                  <div className="rounded-2xl bg-white/35 p-3">
                    <p className="text-xs font-semibold opacity-70">הודעות</p>
                    <p className="text-2xl font-black">DB</p>
                  </div>
                  <div className="rounded-2xl bg-white/35 p-3">
                    <p className="text-xs font-semibold opacity-70">הפניות</p>
                    <p className="text-2xl font-black">Audit</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div key={feature.title} className="rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                      <Icon className="h-5 w-5 text-cyan-200" />
                      <p className="mt-3 font-bold text-white">{feature.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-10 text-right">
          <p className="text-sm font-bold text-cyan-200">מה מקבלים</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">מערכת אחת לכל המסע</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {processSteps.map((step, index) => (
            <div
              key={step}
              className="group rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-200/40"
            >
              <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-white/20 to-white/5 font-[var(--font-heading)] font-black">
                {index + 1}
              </div>
              <p className="text-lg font-bold leading-7">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto max-w-5xl px-5 py-20 text-center lg:px-8">
        <div className="rounded-[2.5rem] border border-cyan-200/20 bg-gradient-to-br from-white/[0.12] to-white/[0.04] p-8 shadow-2xl backdrop-blur-xl md:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100">
            <Trophy className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-black md:text-5xl">מסלול פרימיום מלא</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            דף תדמית, דשבורד, עורך Flow, WhatsApp, Google Contacts, צוותים, הרשאות והגרלות שקופות.
          </p>
          <div className="my-8 font-[var(--font-heading)] text-6xl font-black">1,000 ₪</div>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-slate-300">
            {["RTL מלא", "נתונים אמיתיים בלבד", "Google Contacts", "WhatsApp Cloud Ready"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-sm text-slate-400">
        Magic Flow 2026 · ליצירת קשר: {contactPhone}
      </footer>
    </main>
  );
}
