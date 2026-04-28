import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ContactRound,
  MessageCircle,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wand2,
  Zap
} from "lucide-react";

const phone = "054-246-6340";

const heroHighlights = [
  {
    title: "עברית מלאה",
    description: "מסכים קצרים, פעולות מדויקות ושפה שמתאימה לבעלי עסקים.",
    icon: Wand2
  },
  {
    title: "אפס נתוני דמו",
    description: "המערכת מציגה רק מה שקיים באמת במסד הנתונים ובחיבור הפעיל.",
    icon: CheckCircle2
  },
  {
    title: "כניסה מבוקרת",
    description: "לקוחות חדשים עוברים בדיקה קצרה לפני פתיחת סביבת העבודה.",
    icon: ShieldCheck
  },
  {
    title: "טלפונים תקניים",
    description: "מספרים נשמרים בפורמט בינלאומי כדי לעבוד נכון ב-WhatsApp.",
    icon: ContactRound
  }
];

const featureCards = [
  {
    title: "קישור הצטרפות חכם",
    description: "כל קמפיין מקבל לינק מוכן להפצה, עם טקסט פתיחה שמוביל את המשתתף ישירות לשיחה.",
    icon: Sparkles
  },
  {
    title: "עורך הודעות פשוט",
    description: "כותבים את הודעות הבוט, מוסיפים משתנים כמו שם וקישור אישי, ושומרים בלי קוד.",
    icon: MessageCircle
  },
  {
    title: "שמירת אנשי קשר",
    description: "אפשר לייצא vCard, לסנכרן Google Contacts ולשמור מספרים בפורמט שמתאים לטלפון.",
    icon: ContactRound
  },
  {
    title: "הגרלה שקופה",
    description: "בחירת זוכה מתבצעת רק על בסיס משתתפים אמיתיים, עם תיעוד מסודר במערכת.",
    icon: Trophy
  }
];

const steps = [
  "נרשמים וממתינים להפעלת החשבון",
  "המערכת מקצה מספר מוכן מהמאגר",
  "מגדירים הודעות וקישור הצטרפות",
  "נותנים למערכת לנהל משתתפים והפניות",
  "מבצעים הגרלה שקופה בלחיצה"
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070914] text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-[-14rem] left-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/24 blur-[130px]" />
        <div className="absolute left-1/2 top-36 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 shadow-[0_0_35px_rgba(34,211,238,0.24)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-xl font-black tracking-tight">Magic Flow</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex">
          <a className="transition hover:text-white" href="#features">יכולות</a>
          <a className="transition hover:text-white" href="#how">איך זה עובד</a>
          <a className="transition hover:text-white" href="#pricing">מחיר</a>
          <Link className="transition hover:text-white" href="/help">הדרכות</Link>
          <a className="transition hover:text-white" dir="ltr" href={`tel:${phone.replaceAll("-", "")}`}>{phone}</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link className="hidden rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 sm:inline-flex" href="/login">
            התחברות
          </Link>
          <Link className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5" href="/register">
            הרשמה
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1fr_0.92fr] lg:px-8">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            מערכת עברית לניהול הגרלות WhatsApp
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              הגרלה ויראלית ב-WhatsApp,
              <span className="block bg-gradient-to-l from-cyan-200 via-emerald-200 to-violet-300 bg-clip-text text-transparent">
                בלי כאב ראש.
              </span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              Magic Flow עוזרת לבעלי עסקים ליצור הגרלה, לאסוף משתתפים, לזהות מפנים,
              לשמור אנשי קשר ולבצע הגרלה שקופה. הכל בעברית, פשוט ונקי.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="group inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-l from-cyan-300 to-violet-500 px-6 text-base font-black text-slate-950 shadow-[0_18px_70px_rgba(34,211,238,0.22)] transition hover:-translate-y-0.5" href="/register">
              התחלת הרשמה
              <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
            </Link>
            <Link className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 text-base font-bold text-white backdrop-blur transition hover:bg-white/15" href="/contact">
              צור קשר
              <MessageCircle className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 translate-y-8 rounded-[2.5rem] bg-cyan-300/10 blur-3xl" />
          <div className="relative rounded-[2rem] border border-white/12 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1424] p-4">
              <div className="rounded-3xl bg-gradient-to-l from-emerald-400 to-cyan-400 p-5 text-slate-950">
                <div className="flex items-center gap-2 text-sm font-black">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-950" />
                  מה קורה אחרי אישור?
                </div>
                <div className="mt-5 grid gap-3">
                  {[
                    ["מספר מוכן", "המערכת מקצה לך מספר מהמאגר."],
                    ["הודעות", "עורכים את תסריט הבוט בעברית פשוטה."],
                    ["הגרלה", "בוחרים זוכה רק כשיש משתתפים אמיתיים."]
                  ].map(([title, description]) => (
                    <div className="rounded-2xl bg-white/35 p-3" key={title}>
                      <p className="text-sm font-black">{title}</p>
                      <p className="mt-1 text-sm font-bold opacity-75">{description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {heroHighlights.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-4" key={feature.title}>
                      <Icon className="h-5 w-5 text-cyan-200" />
                      <p className="mt-3 font-black text-white">{feature.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{feature.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 lg:px-8" id="features">
        <div className="mb-10">
          <p className="text-sm font-black text-cyan-200">מה מקבלים</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">כל מה שצריך כדי להריץ הגרלה</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <article className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-200/40" key={feature.title}>
                <Icon className="h-7 w-7 text-cyan-200" />
                <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 lg:px-8" id="how">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur md:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-emerald-200">תהליך פשוט</p>
              <h2 className="mt-3 text-3xl font-black md:text-5xl">לא צריך להבין בטכנולוגיה</h2>
            </div>
            <BookOpen className="h-10 w-10 text-cyan-200" />
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {steps.map((step, index) => (
              <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5" key={step}>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-950">
                  {index + 1}
                </div>
                <p className="mt-5 text-base font-black leading-7">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-5 py-20 text-center lg:px-8" id="pricing">
        <div className="rounded-[2.5rem] border border-cyan-200/20 bg-gradient-to-br from-white/[0.12] to-white/[0.04] p-8 shadow-2xl backdrop-blur-xl md:p-12">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-100">
            <Trophy className="h-7 w-7" />
          </div>
          <h2 className="text-3xl font-black md:text-5xl">מסלול פרימיום מלא</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            כולל עמוד בית, דשבורד, עורך הודעות, חיבורי WhatsApp, אנשי קשר, הדרכות וניהול בסיסי.
          </p>
          <div className="my-8 text-6xl font-black">1,000 ₪</div>
          <Link className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-7 font-black text-slate-950 transition hover:-translate-y-0.5" href="/contact">
            דברו עם הצוות
            <MousePointer2 className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-8 text-center text-sm text-slate-400">
        <p>צוות Magic Flow — שירותי אוטומציה לעסקים</p>
        <p className="mt-2">© 2026 כל הזכויות שמורות · ליצירת קשר: <span dir="ltr">{phone}</span></p>
        <div className="mt-4 flex justify-center gap-4">
          <Link href="/terms">תנאי שימוש</Link>
          <Link href="/privacy">מדיניות פרטיות</Link>
          <Link href="/accessibility">נגישות</Link>
        </div>
      </footer>
    </main>
  );
}
