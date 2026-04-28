"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  Zap
} from "lucide-react";

const categories = [
  {
    title: "יוצאים לדרך",
    description: "שם העסק, שם ההגרלה וקישור הצטרפות מוכן לפרסום.",
    icon: Sparkles,
    tone: "from-emerald-400/24 to-cyan-400/12",
    steps: [
      "פותחים את לוח הניהול",
      "בודקים שהמספר מוכן",
      "מעדכנים שם הגרלה ומילת פתיחה",
      "מעתיקים את קישור ההצטרפות"
    ]
  },
  {
    title: "הבוט החכם",
    description: "עריכת הודעות, משתנים אישיים וסימולטור שמראה מה המשתתף יקבל.",
    icon: MessageCircle,
    tone: "from-blue-400/24 to-violet-400/12",
    steps: [
      "נכנסים למסך הודעות",
      "בוחרים שלב בשיחה",
      "מוסיפים משתנה כמו {{name}}",
      "בודקים בסימולטור ושומרים"
    ]
  },
  {
    title: "מבצעי בזק",
    description: "קמפיין קצר של 60 דקות שמיועד להגדיל תנועה ומכירות בזמן אמת.",
    icon: Zap,
    tone: "from-orange-400/28 to-rose-400/12",
    steps: [
      "בודקים שהתוסף פעיל",
      "כותבים הודעה קצרה וברורה",
      "המערכת שולחת בהדרגה ובצורה בטוחה",
      "בסיום מתקבל דוח ביצועים"
    ]
  },
  {
    title: "ניהול וזכייה",
    description: "משתתפים, אנשי קשר, Google Contacts והגרלה עם תיעוד מסודר.",
    icon: Trophy,
    tone: "from-violet-400/24 to-fuchsia-400/12",
    steps: [
      "בודקים מי סיים הרשמה",
      "מורידים אנשי קשר או מסנכרנים לגוגל",
      "מבצעים הגרלה רק כשיש משתתפים אמיתיים",
      "שומרים דוח ביקורת אוטומטי"
    ]
  }
];

const faqs = [
  {
    question: "האם צריך לסרוק QR?",
    answer: "לא. Magic Flow עובדת במודל Zero-Touch. צוות הניהול מקצה מספר מהמאגר, והלקוח רואה מספר מוכן בדשבורד."
  },
  {
    question: "האם הטלפון שלי חייב להיות דלוק?",
    answer: "לא. התשתית פועלת בענן. לאחר שהמספר מוכן, הבוט ממשיך לעבוד גם כשהטלפון האישי כבוי."
  },
  {
    question: "איך המערכת מזהה לאיזו הגרלה המשתתף הגיע?",
    answer: "כל קמפיין מקבל מילת פתיחה ייחודית. ה-Worker מזהה את המילה ומנתב את המשתתף לקמפיין הנכון."
  },
  {
    question: "איך עובדת משימת הסטטוס?",
    answer: "הבוט מבקש צילום מסך של שיתוף. רק לאחר שההוכחה מתקבלת, המשתתף מתקדם ומקבל כרטיס."
  },
  {
    question: "מה קורה אם אין נתונים?",
    answer: "המערכת מציגה מצב ריק נקי: אין משתתפים, אין זוכה ואין מספר מוכן. לא מוצגים מספרים או שמות דמו."
  }
];

const quickStart = [
  "המספר מוקצה אוטומטית לאחר אישור החשבון",
  "הודעות הבוט נערכות בעברית פשוטה",
  "קישור ההצטרפות מוכן לפרסום מתוך הדשבורד",
  "הגרלה מתבצעת רק על משתתפים אמיתיים"
];

export function AcademyHelp() {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCategories = useMemo(
    () =>
      normalizedQuery
        ? categories.filter((category) =>
            [category.title, category.description, ...category.steps]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery)
          )
        : categories,
    [normalizedQuery]
  );

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <header className="aurora-surface rounded-[40px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_110px_rgba(0,0,0,0.35)] backdrop-blur md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link className="font-black text-white" href="/">
              Magic Flow
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-cyan-100">
              <BookOpen className="h-4 w-4" />
              Academy בעברית
            </div>
          </div>

          <div className="mt-14 max-w-3xl">
            <p className="text-sm font-black text-emerald-200">מרכז הדרכה מקצועי</p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
              כל אחד יכול להפעיל את Magic Flow
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-200">
              מדריכים קצרים, ויזואליים וברורים. בלי מושגים מיותרים, בלי פעולות טכניות ובלי עומס.
              המטרה היא לעזור לבעל עסק להתחיל לעבוד מהר ובביטחון.
            </p>
          </div>

          <div className="mt-9 grid gap-4 lg:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/95 px-4 text-slate-950 shadow-lg">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                className="h-14 flex-1 bg-transparent text-right outline-none"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="חיפוש מדריך, למשל: מבצע בזק"
                value={query}
              />
            </label>
            <Link
              className="inline-flex h-14 items-center justify-center rounded-3xl bg-emerald-400 px-6 text-sm font-black text-slate-950 transition hover:bg-emerald-300"
              href="/dashboard"
            >
              חזרה לדשבורד
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickStart.map((item, index) => (
            <motion.div
              className="rounded-[28px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur"
              initial={{ opacity: 0, y: 18 }}
              key={item}
              transition={{ delay: index * 0.08 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, y: 0 }}
            >
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              <p className="mt-4 text-sm font-bold leading-6 text-slate-100">{item}</p>
            </motion.div>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          {visibleCategories.map((category, index) => {
            const Icon = category.icon;

            return (
              <motion.article
                className="group rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur"
                initial={{ opacity: 0, y: 24 }}
                key={category.title}
                transition={{ delay: index * 0.08 }}
                viewport={{ once: true }}
                whileHover={{ rotateX: 1.5, rotateY: -1.5, y: -6 }}
                whileInView={{ opacity: 1, y: 0 }}
              >
                <div className={`rounded-[28px] bg-gradient-to-br ${category.tone} p-5`}>
                  <Icon className="h-7 w-7 text-white" />
                  <h2 className="mt-5 text-2xl font-black">{category.title}</h2>
                  <p className="mt-2 leading-7 text-slate-200">{category.description}</p>
                </div>
                <div className="mt-5 space-y-3">
                  {category.steps.map((step, stepIndex) => (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4" key={step}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">
                        {stepIndex + 1}
                      </span>
                      <span className="font-semibold leading-6 text-slate-100">{step}</span>
                    </div>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[34px] border border-emerald-300/20 bg-emerald-300/10 p-6 backdrop-blur">
            <ShieldCheck className="h-8 w-8 text-emerald-200" />
            <h2 className="mt-5 text-2xl font-black">אבטחה ושקט תפעולי</h2>
            <p className="mt-3 leading-8 text-emerald-50">
              לקוח רגיל רואה רק את מה שהוא צריך: סטטוס, הודעות, קישור, אנשי קשר והגרלה.
              QR, טוקנים, ניהול מספרים וכלי Pool זמינים רק לצוות הניהול.
            </p>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
            <div className="flex items-center gap-2 text-cyan-100">
              <HelpCircle className="h-5 w-5" />
              <h2 className="text-2xl font-black text-white">שאלות נפוצות</h2>
            </div>
            <div className="mt-5 divide-y divide-white/10">
              {faqs.map((faq) => (
                <details className="group py-4" key={faq.question}>
                  <summary className="cursor-pointer list-none text-lg font-black text-white">
                    {faq.question}
                  </summary>
                  <p className="mt-3 leading-8 text-slate-300">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[34px] border border-white/10 bg-white/[0.06] p-6 text-center backdrop-blur md:p-10">
          <h2 className="text-3xl font-black">צריך עזרה נקודתית?</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-8 text-slate-300">
            מרכז ההדרכה בנוי כדי לפתור את רוב השאלות לבד. אם צריך ליווי, צוות Magic Flow זמין דרך טופס יצירת קשר.
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
    </main>
  );
}
