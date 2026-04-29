import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ContactRound,
  Crown,
  LockKeyhole,
  MessageCircle,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Wand2,
  Zap
} from "lucide-react";
import { prisma } from "@lottery/db";

const phone = "054-246-6340";
const db = prisma as any;

async function getLandingContent() {
  try {
    const settings = await db.siteSetting.findMany({
      where: {
        key: {
          in: ["landing_title", "landing_subtitle", "landing_price"]
        }
      }
    });
    const map = new Map(settings.map((setting: any) => [setting.key, setting.value]));

    return {
      title: map.get("landing_title") as string | undefined,
      subtitle: map.get("landing_subtitle") as string | undefined,
      price: map.get("landing_price") as string | undefined
    };
  } catch {
    return {};
  }
}

const flowCards = [
  {
    title: "חיבור",
    description: "מספר WhatsApp מוקצה מהמאגר ומוצג ללקוח כסטטוס ברור, בלי מסכים טכניים מיותרים.",
    icon: Zap
  },
  {
    title: "הודעות",
    description: "עורך בעברית לבניית תסריט השיחה, משתנים חכמים, מדיה ותצוגה מקדימה לפני הפעלה.",
    icon: MessageCircle
  },
  {
    title: "הגרלה",
    description: "ניהול משתתפים אמיתיים בלבד, בחירת זוכה שקופה ותיעוד מסודר של כל פעולה.",
    icon: Trophy
  }
];

const capabilityCards = [
  {
    title: "קישור הצטרפות חכם",
    description: "המשתתף מגיע ישירות ל-WhatsApp עם הודעת פתיחה מוכנה וזיהוי מפנה מובנה.",
    icon: MousePointer2
  },
  {
    title: "אנשי קשר שעובדים",
    description: "מספרים נשמרים בפורמט בינלאומי, עם יצוא vCard וסנכרון Google Contacts.",
    icon: ContactRound
  },
  {
    title: "בקרה לפני כניסה",
    description: "כל לקוח חדש עובר בדיקה של צוות Magic Flow לפני פתיחת סביבת העבודה.",
    icon: ShieldCheck
  },
  {
    title: "אמת בזמן אמת",
    description: "אין מספרים מומצאים, אין טבלאות דמו, ואין נתונים שלא הגיעו מהמערכת.",
    icon: CheckCircle2
  }
];

const controlCards = [
  {
    title: "ניהול לקוחות",
    description: "אישור, השהיה, פתיחת לקוח, כניסה לממשק לקוח וניהול סביבת עבודה ממקום אחד.",
    icon: Crown
  },
  {
    title: "אוטומציות ומיילים",
    description: "יצירת ניוזלטרים, עדכונים מתוזמנים, הודעות לאחר הצטרפות ותבניות מייל מסודרות.",
    icon: BarChart3
  },
  {
    title: "אבטחה והרשאות",
    description: "גישה למנהל בלבד, הצפנת טוקנים, הפרדת Workspaces ותיעוד פעולות ניהול.",
    icon: LockKeyhole
  }
];

const steps = [
  "נרשמים ומשלימים פרטים",
  "צוות Magic Flow מאשר את החשבון",
  "המערכת מקצה חיבור WhatsApp",
  "עורכים הודעות וקישור הצטרפות",
  "מריצים הגרלה עם נתונים אמיתיים"
];

export default async function LandingPage() {
  const landingContent = await getLandingContent();
  const landingTitle = landingContent.title || "הגרלות WhatsApp שמרגישות כמו מערכת פרימיום";
  const landingSubtitle =
    landingContent.subtitle ||
    "Magic Flow מרכזת חיבור WhatsApp, הודעות, משתתפים, אנשי קשר והגרלה שקופה בלוח עבודה עברי וברור. בלי עומס, בלי נתוני דמו ובלי כאב ראש טכני.";
  const landingPrice = landingContent.price || "999 ₪";
  const pricingTiers = [
    {
      name: "Starter",
      price: "499 ₪",
      badge: "להתחלה מסודרת",
      features: ["קמפיין אחד", "עד 500 משתתפים", "WhatsApp Official", "עורך הודעות", "מרכז הדרכה"]
    },
    {
      name: "Pro",
      price: landingPrice,
      badge: "המסלול המרכזי",
      featured: true,
      features: ["עד 3 קמפיינים", "עד 2,500 משתתפים", "אוטומציות", "Google Contacts", "הנחה על מבצעי בזק"]
    },
    {
      name: "Enterprise",
      price: "דברו איתנו",
      badge: "לצוותים וצמיחה",
      features: ["קמפיינים ללא הגבלה", "ניהול מתקדם", "חיבורים מרובים", "דוחות ותיעוד", "ליווי צוות Magic Flow"]
    }
  ];

  return (
    <main className="premium-landing relative min-h-screen overflow-hidden bg-[#070914] text-white" dir="rtl">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb-drift absolute right-[-12rem] top-[-10rem] h-[36rem] w-[36rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="orb-drift-slow absolute bottom-[-14rem] left-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-500/24 blur-[130px]" />
        <div className="orb-drift-reverse absolute left-1/2 top-36 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
        <div className="noise-layer" />
        <div className="particle-field">
          {Array.from({ length: 22 }).map((_, index) => (
            <span
              key={index}
              style={{
                "--x": `${(index * 43) % 100}%`,
                "--y": `${(index * 61) % 100}%`,
                "--d": `${8 + index * 0.22}s`
              } as any}
            />
          ))}
        </div>
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="logo-pulse flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 shadow-[0_0_35px_rgba(34,211,238,0.24)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-xl font-black tracking-tight">Magic Flow</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-300 md:flex">
          <a className="transition hover:text-white" href="#flow">איך זה עובד</a>
          <a className="transition hover:text-white" href="#capabilities">יכולות</a>
          <a className="transition hover:text-white" href="#pricing">מחיר</a>
          <Link className="transition hover:text-white" href="/help">הדרכות</Link>
          <a className="transition hover:text-white" dir="ltr" href={`tel:${phone.replaceAll("-", "")}`}>{phone}</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link className="hidden rounded-2xl border border-white/15 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 sm:inline-flex" href="/login">
            התחברות
          </Link>
          <Link className="magnetic-cta rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:-translate-y-0.5" href="/register">
            הרשמה
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1fr_0.92fr] lg:px-8">
        <div className="reveal-up space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            ממשק עברי לניהול הגרלות WhatsApp
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight md:text-7xl">
              <span className="animated-gradient-text">
                {landingTitle}
              </span>
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              {landingSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link className="shimmer-action magnetic-cta group inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-l from-cyan-300 to-violet-500 px-6 text-base font-black text-slate-950 shadow-[0_18px_70px_rgba(34,211,238,0.22)] transition hover:-translate-y-0.5" href="/register">
              התחלת הרשמה
              <ArrowLeft className="h-5 w-5 transition group-hover:-translate-x-1" />
            </Link>
            <Link className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 text-base font-bold text-white backdrop-blur transition hover:bg-white/15" href="/contact">
              דברו עם הצוות
              <MessageCircle className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="reveal-up-delay relative">
          <div className="absolute inset-0 translate-y-8 rounded-[2.5rem] bg-cyan-300/10 blur-3xl" />
          <div className="tilt-card relative rounded-[2rem] border border-white/12 bg-slate-950/75 p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0d1424] p-4">
              <div className="rounded-3xl bg-gradient-to-l from-emerald-400 to-cyan-400 p-5 text-slate-950">
                <div className="flex items-center gap-2 text-sm font-black">
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-950" />
                  לוח עבודה יומיומי
                </div>
                <div className="mt-5 grid gap-3">
                  {flowCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div className="group rounded-2xl bg-white/35 p-4 transition hover:bg-white/50" key={card.title}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-cyan-200 shadow-lg">
                            <Icon className="h-5 w-5" />
                          </span>
                          <p className="text-base font-black">{card.title}</p>
                        </div>
                        <p className="mt-3 text-sm font-bold leading-6 opacity-75">{card.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.05] p-4">
                <p className="text-sm font-black text-cyan-100">מצב ריק מקצועי</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  כשאין נתונים, המערכת מציגה הודעה ברורה בלבד: עדיין אין משתתפים בקמפיין. הלינק מוכן להפצה.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 lg:px-8" id="flow">
        <div className="mb-10">
          <p className="text-sm font-black text-cyan-200">שלושת אזורי העבודה</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">כל פעולה במקום אחד, בלי רעש מסביב</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {flowCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="tilt-card border-beam-card rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur transition hover:-translate-y-1 hover:border-cyan-200/40" key={card.title}>
                <Icon className="h-8 w-8 text-cyan-200" />
                <h3 className="mt-6 text-2xl font-black">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 lg:px-8" id="capabilities">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-black text-emerald-200">יכולות שמייצרות תוצאה</p>
            <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
              חוויית לקוח ברורה, ותשתית ניהול שעובדת מאחורי הקלעים
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              המערכת נבנתה לבעלי עסקים שלא רוצים להתעסק בטכנולוגיה. הלקוח רואה פעולות ברורות; צוות הניהול מקבל שליטה מלאה.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {capabilityCards.map((feature) => {
              const Icon = feature.icon;
              return (
                <article className="glass-lift rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur" key={feature.title}>
                  <Icon className="h-7 w-7 text-cyan-200" />
                  <h3 className="mt-5 text-xl font-black">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur md:p-10">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black text-violet-200">תהליך עבודה</p>
              <h2 className="mt-3 text-3xl font-black md:text-5xl">מסלול קצר מההרשמה עד ההגרלה</h2>
            </div>
            <Wand2 className="h-10 w-10 text-cyan-200" />
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

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mb-10">
          <p className="text-sm font-black text-cyan-200">לצוות הניהול</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">שליטה רחבה בלי לסבך את הלקוח</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {controlCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="glass-lift rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur" key={card.title}>
                <Icon className="h-7 w-7 text-emerald-200" />
                <h3 className="mt-5 text-xl font-black">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{card.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-20 lg:px-8" id="pricing">
        <div className="mb-10 text-center">
          <p className="text-sm font-black text-cyan-200">מחירון פרימיום</p>
          <h2 className="mt-3 text-3xl font-black md:text-5xl">בחרו מסלול שמתאים לקצב הצמיחה</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            כל המסלולים נשענים על אותו עיקרון: ממשק עברי, נתונים אמיתיים, וניהול WhatsApp מסודר.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <article
              className={`tilt-card group ${tier.featured ? "border-beam-card scale-[1.02] border-cyan-200/40" : "border-white/10"} rounded-[2.25rem] border bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl transition duration-300 hover:-translate-y-2`}
              key={tier.name}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
                  {tier.featured ? <Zap className="h-6 w-6" /> : <Trophy className="h-6 w-6" />}
                </div>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">
                  {tier.badge}
                </span>
              </div>
              <h3 className="mt-6 text-3xl font-black">{tier.name}</h3>
              <div className="mt-4 text-5xl font-black">{tier.price}</div>
              <p className="mt-2 text-sm font-semibold text-slate-400">לחודש, כולל סביבת עבודה בעברית ותמיכה של צוות Magic Flow.</p>
              <ul className="mt-7 space-y-3 text-right">
                {tier.features.map((feature) => (
                  <li className="flex items-start gap-3 text-sm font-bold leading-6 text-slate-200" key={feature}>
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link className="shimmer-action magnetic-cta mt-8 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 font-black text-slate-950 transition hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(34,211,238,0.25)]" href="/contact">
                דברו עם הצוות
                <MousePointer2 className="h-5 w-5" />
              </Link>
            </article>
          ))}
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
