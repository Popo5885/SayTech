"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  HelpCircle,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap
} from "lucide-react";

const guides = [
  {
    id: "start",
    title: "יוצאים לדרך",
    subtitle: "הגדרת הגרלה ראשונה בלי פעולות טכניות",
    icon: Sparkles,
    color: "from-emerald-300/30 to-cyan-300/10",
    minutes: "3 דקות",
    steps: [
      "בודקים שהחשבון אושר ושמופיע סטטוס חיבור מוכן.",
      "מעדכנים שם עסק, שם הגרלה ומילת פתיחה פשוטה.",
      "מעתיקים את קישור ההצטרפות ומפרסמים אותו ללקוחות.",
      "נכנסים למסך הודעות ומוודאים שהנוסח נשמע טבעי בעברית."
    ]
  },
  {
    id: "messages",
    title: "הבוט החכם",
    subtitle: "עריכת הודעות, משתנים ותצוגה מקדימה",
    icon: MessageCircle,
    color: "from-blue-300/30 to-violet-300/10",
    minutes: "5 דקות",
    steps: [
      "פותחים את מסך הודעות ובוחרים את השלב שרוצים לערוך.",
      "משתמשים במשתנים כמו {{name}} ו-{{link}} רק כשצריך התאמה אישית.",
      "מעלים תמונה או וידאו במקום להדביק קישורים ידניים.",
      "בודקים בסימולטור איך ההודעה תיראה למשתתף ב-WhatsApp."
    ]
  },
  {
    id: "flash",
    title: "מבצעי בזק",
    subtitle: "קמפיין קצר שמחזיר את הקהל לפעולה",
    icon: Zap,
    color: "from-orange-300/30 to-rose-300/10",
    minutes: "4 דקות",
    steps: [
      "מוודאים שהתוסף פעיל בחשבון דרך צוות הניהול.",
      "כותבים הודעה קצרה עם פעולה אחת ברורה.",
      "המערכת שולחת בהדרגה ובתור עדיפויות כדי לא לפגוע בשירות.",
      "בסיום מקבלים סיכום ביצועים ומחליטים על הצעד הבא."
    ]
  },
  {
    id: "draw",
    title: "ניהול וזכייה",
    subtitle: "משתתפים, אנשי קשר והגרלה שקופה",
    icon: Trophy,
    color: "from-violet-300/30 to-fuchsia-300/10",
    minutes: "6 דקות",
    steps: [
      "בודקים שיש משתתפים אמיתיים שסיימו הרשמה.",
      "מורידים אנשי קשר או מסנכרנים ל-Google Contacts.",
      "מבצעים הגרלה רק כשיש מספיק משתתפים בקמפיין.",
      "שומרים את דוח הביקורת שנוצר אוטומטית אחרי בחירת הזוכה."
    ]
  }
];

const faqs = [
  {
    question: "האם אני צריך לסרוק QR?",
    answer: "לא בחשבון רגיל. Magic Flow עובדת במודל Zero-Touch: צוות הניהול מקצה מספר מהמאגר, והלקוח רואה בדשבורד סטטוס מוכן לעבודה."
  },
  {
    question: "האם הטלפון האישי שלי חייב להיות דלוק?",
    answer: "לא. התשתית פועלת בענן. אחרי שהמספר מוכן, הבוט ממשיך לעבוד גם כשהטלפון האישי שלך לא לידך."
  },
  {
    question: "איך המערכת יודעת לאיזו הגרלה המשתתף הגיע?",
    answer: "לכל קמפיין יש מילת פתיחה וקישור הצטרפות משלו. כשהמשתתף שולח הודעה, המערכת מנתבת אותו לקמפיין הנכון."
  },
  {
    question: "מה קורה אם אין משתתפים?",
    answer: "המערכת מציגה מצב ריק נקי: אין מספרים מומצאים, אין שמות דמו ואין טבלאות שנועדו רק למלא מקום."
  },
  {
    question: "איך שומרים אנשי קשר ל-WhatsApp?",
    answer: "כל מספר נשמר בפורמט בינלאומי תקני, למשל +972501234567. אפשר להוריד קובץ vCard או לסנכרן ל-Google Contacts."
  }
];

const glossary = [
  ["חיבור", "המספר הרשמי או מספר הצוות שממנו הבוט שולח ומקבל הודעות."],
  ["הודעות", "התסריט שהמשתתף מקבל ב-WhatsApp, כולל פתיחה, שמירת איש קשר וקישור אישי."],
  ["הגרלה", "בחירת זוכה מתוך משתתפים אמיתיים בלבד, עם תיעוד פעולה מסודר."],
  ["קישור הצטרפות", "הקישור שהעסק מפרסם כדי להתחיל שיחה עם הבוט."],
  ["משתנים", "מילים כמו {{name}} שמוחלפות אוטומטית בפרטים של המשתתף."]
];

export function AcademyHelp() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleGuides = useMemo(() => {
    if (!normalizedQuery) {
      return guides;
    }

    return guides.filter((guide) =>
      [guide.title, guide.subtitle, guide.minutes, ...guide.steps].join(" ").toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white" dir="rtl">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-6 rounded-[30px] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <Link className="font-black text-white" href="/">
              Magic Flow
            </Link>
            <p className="mt-2 text-sm leading-6 text-slate-300">מרכז הדרכה בעברית לעבודה פשוטה, יומית וברורה.</p>
            <nav className="mt-6 space-y-2">
              {guides.map((guide) => (
                <a
                  className="flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10"
                  href={`#${guide.id}`}
                  key={guide.id}
                >
                  {guide.title}
                  <ChevronLeft className="h-4 w-4 text-slate-400" />
                </a>
              ))}
              <a className="block rounded-2xl px-3 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10" href="#faq">
                שאלות נפוצות
              </a>
            </nav>
          </div>
        </aside>

        <div className="space-y-6">
          <header className="aurora-surface rounded-[40px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_110px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-cyan-100">
                <BookOpen className="h-4 w-4" />
                Magic Flow Academy
              </div>
              <Link className="text-sm font-black text-cyan-100 hover:text-white" href="/dashboard">
                חזרה ללוח העבודה
              </Link>
            </div>

            <div className="mt-14 max-w-3xl">
              <p className="text-sm font-black text-emerald-200">הדרכה קצרה, ויזואלית וברורה</p>
              <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
                להבין את המערכת בלי להיות טכני.
              </h1>
              <p className="mt-5 text-lg leading-8 text-slate-200">
                כל מדריך בנוי לפי פעולה אמיתית: חיבור, הודעות, קישור הצטרפות, אנשי קשר והגרלה.
                בלי עומס, בלי מילים מיותרות ובלי נתוני דמו.
              </p>
            </div>

            <label className="mt-9 flex items-center gap-3 rounded-3xl border border-white/10 bg-white/95 px-4 text-slate-950 shadow-lg">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                className="h-14 flex-1 bg-transparent text-right outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="חיפוש מדריך, למשל: אנשי קשר, הגרלה, הודעות"
                value={query}
              />
            </label>
          </header>

          <section className="grid gap-4 md:grid-cols-4">
            {["מספר מוכן", "הודעות בעברית", "קישור להפצה", "הגרלה שקופה"].map((item, index) => (
              <motion.div
                className="rounded-[28px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur"
                initial={{ opacity: 0, y: 18 }}
                key={item}
                transition={{ delay: index * 0.07 }}
                viewport={{ once: true }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                <p className="mt-4 text-sm font-black leading-6 text-slate-100">{item}</p>
              </motion.div>
            ))}
          </section>

          <section className="grid gap-5">
            {visibleGuides.map((guide, index) => {
              const Icon = guide.icon;

              return (
                <motion.article
                  className="rounded-[34px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-6"
                  id={guide.id}
                  initial={{ opacity: 0, y: 24 }}
                  key={guide.id}
                  transition={{ delay: index * 0.08 }}
                  viewport={{ once: true }}
                  whileInView={{ opacity: 1, y: 0 }}
                >
                  <div className={`rounded-[28px] bg-gradient-to-br ${guide.color} p-5`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Icon className="h-7 w-7 text-white" />
                        <h2 className="mt-5 text-2xl font-black">{guide.title}</h2>
                        <p className="mt-2 leading-7 text-slate-200">{guide.subtitle}</p>
                      </div>
                      <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950">{guide.minutes}</span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {guide.steps.map((step, stepIndex) => (
                      <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4" key={step}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">
                          {stepIndex + 1}
                        </span>
                        <span className="font-semibold leading-7 text-slate-100">{step}</span>
                      </div>
                    ))}
                  </div>
                </motion.article>
              );
            })}
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[34px] border border-emerald-300/20 bg-emerald-300/10 p-6 backdrop-blur-xl">
              <ShieldCheck className="h-8 w-8 text-emerald-200" />
              <h2 className="mt-5 text-2xl font-black">עיקרון העבודה</h2>
              <p className="mt-3 leading-8 text-emerald-50">
                לקוח רגיל רואה רק פעולות עבודה: חיבור, הודעות, הגרלה, אנשי קשר והגדרות.
                כלי Pool, QR, טוקנים והרשאות נשארים לצוות הניהול בלבד.
              </p>
            </div>

            <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-100">
                <Sparkles className="h-5 w-5" />
                <h2 className="text-2xl font-black text-white">מילון קצר</h2>
              </div>
              <div className="mt-5 grid gap-3">
                {glossary.map(([term, description]) => (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4" key={term}>
                    <p className="font-black text-white">{term}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl" id="faq">
            <div className="flex items-center gap-2 text-cyan-100">
              <HelpCircle className="h-5 w-5" />
              <h2 className="text-2xl font-black text-white">שאלות נפוצות</h2>
            </div>
            <div className="mt-5 divide-y divide-white/10">
              {faqs.map((faq) => (
                <details className="group py-4" key={faq.question}>
                  <summary className="cursor-pointer list-none text-lg font-black text-white">{faq.question}</summary>
                  <p className="mt-3 leading-8 text-slate-300">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 text-center backdrop-blur-xl md:p-10">
            <h2 className="text-3xl font-black">עדיין צריך עזרה?</h2>
            <p className="mx-auto mt-3 max-w-2xl leading-8 text-slate-300">
              אפשר לפנות לצוות Magic Flow עם שאלה קצרה. נחזור אליך עם תשובה מסודרת וברורה.
            </p>
            <Link
              className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-white px-6 text-sm font-black text-slate-950 transition hover:bg-slate-100"
              href="/contact"
            >
              יצירת קשר
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
