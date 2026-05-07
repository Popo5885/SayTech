"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  CheckCircle2,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  MousePointer2,
  QrCode,
  Sparkles,
  Wand2
} from "lucide-react";
import type { SiteContentMap } from "../lib/site-content";

const featureIcons = [MessageCircle, BadgeCheck, LayoutDashboard];

function WhatsAppScene() {
  const bubbles = [
    { text: "היי, אשמח להצטרף להגרלה", side: "user" },
    { text: "*ברוך הבא!* איך קוראים לך?", side: "bot" },
    { text: "דנה כהן", side: "user" },
    { text: "מעולה דנה. זה הקישור האישי שלך:\nmagic.flow/j/DANA2026", side: "bot" },
    { text: "נשמר באנשי הקשר", side: "user" },
    { text: "קיבלת עוד 2 כרטיסים אחרי הפניה מאומתת.", side: "bot" }
  ];

  return (
    <div aria-hidden className="chat-scene">
      <div className="chat-phone">
        <div className="chat-phone-top">
          <span>09:41</span>
          <span className="chat-phone-notch" />
          <span>5G</span>
        </div>
        <div className="chat-header">
          <span className="chat-avatar">MF</span>
          <div>
            <p>Magic Flow Bot</p>
            <small>מחובר עכשיו</small>
          </div>
        </div>
        <div className="chat-thread">
          {bubbles.map((bubble, index) => (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className={`scene-bubble ${bubble.side === "user" ? "scene-bubble-user" : "scene-bubble-bot"}`}
              initial={{ opacity: 0, y: 12 }}
              key={`${bubble.text}-${index}`}
              transition={{ delay: 0.25 + index * 0.12, type: "spring", stiffness: 120 }}
            >
              {bubble.text}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SiteLanding({ content }: { content: SiteContentMap }) {
  const reduceMotion = useReducedMotion();
  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0 : 0.1
      }
    }
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 18 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 18 } }
  };

  const features = [
    {
      title: content.feature_1_title,
      body: content.feature_1_body
    },
    {
      title: content.feature_2_title,
      body: content.feature_2_body
    },
    {
      title: content.feature_3_title,
      body: content.feature_3_body
    }
  ];

  return (
    <main className="stitch-page min-h-screen text-slate-950" dir="rtl">
      <section className="relative isolate min-h-[92vh] overflow-hidden px-5 pb-12 pt-5 sm:px-8">
        <WhatsAppScene />
        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between rounded-lg border border-slate-200/80 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
          <Link className="flex items-center gap-3" href="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-lg font-black tracking-normal">{content.brand_name}</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <a className="transition hover:text-slate-950" href="#features">יכולות</a>
            <a className="transition hover:text-slate-950" href="#security">אבטחה</a>
            <a className="transition hover:text-slate-950" href="#pricing">מחיר</a>
            <Link className="transition hover:text-slate-950" href="/privacy">פרטיות</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link className="hidden rounded-lg px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100 sm:inline-flex" href="/login">
              {content.secondary_cta}
            </Link>
            <Link className="stitch-button bg-slate-950 text-white" href="/register">
              {content.primary_cta}
            </Link>
          </div>
        </header>

        <motion.div
          animate="show"
          className="relative z-10 mx-auto flex min-h-[calc(92vh-78px)] max-w-7xl flex-col justify-end pb-10 pt-24"
          initial="hidden"
          variants={container}
        >
          <motion.p
            className="mb-5 inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800 shadow-sm"
            variants={item}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {content.hero_badge}
          </motion.p>
          <motion.h1
            className="max-w-5xl text-5xl font-black leading-[1.04] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl"
            variants={item}
          >
            {content.hero_title}
          </motion.h1>
          <motion.p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-slate-600 sm:text-xl" variants={item}>
            {content.hero_subtitle}
          </motion.p>
          <motion.div className="mt-8 flex flex-wrap gap-3" variants={item}>
            <Link className="stitch-button bg-slate-950 text-white shadow-[0_18px_55px_rgba(15,23,42,0.18)]" href="/register">
              {content.primary_cta}
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Link className="stitch-button border border-slate-200 bg-white text-slate-950" href="/login">
              {content.secondary_cta}
              <QrCode className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section className="border-y border-slate-200 bg-white px-5 py-5 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 text-sm font-black text-slate-700 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            אין נתוני דמו במערכת
          </div>
          <div className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-blue-600" />
            סיסמה באנגלית בלבד ו-8 תווים לפחות
          </div>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-orange-600" />
            כניסה מהירה בסריקת QR
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-black text-blue-700">מערכת מודולרית</p>
            <h2 className="mt-3 text-4xl font-black tracking-normal text-slate-950 sm:text-5xl">
              כל מודול נמכר ומופעל בנפרד, בלי לערבב תשתיות.
            </h2>
          </div>
          <motion.div
            className="mt-10 grid gap-4 md:grid-cols-3"
            initial="hidden"
            variants={container}
            viewport={{ once: true, margin: "-80px" }}
            whileInView="show"
          >
            {features.map((feature, index) => {
              const Icon = featureIcons[index] ?? Bot;

              return (
                <motion.article className="stitch-card group" key={feature.title} variants={item}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white transition group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-7 text-2xl font-black tracking-normal">{feature.title}</h3>
                  <p className="mt-3 text-base font-semibold leading-8 text-slate-600">{feature.body}</p>
                </motion.article>
              );
            })}
          </motion.div>
        </div>
      </section>

      <section className="bg-slate-950 px-5 py-20 text-white sm:px-8" id="security">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black text-emerald-300">Zero-Fake Logic</p>
            <h2 className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">{content.security_title}</h2>
            <p className="mt-5 text-lg font-semibold leading-8 text-slate-300">{content.security_body}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["V רק אחרי 200 OK", "הכפתור הירוק לא מופעל מלחיצה, אלא מאישור שרת."],
              ["QR Login", "סריקה מהנייד יוצרת session קצר ומאומת."],
              ["Routing 1:3", "חיבור WhatsApp אחד יכול לשרת עד שלושה Workspaces."],
              ["Legal Suite", "תנאים, פרטיות, Cookies ונגישות זמינים מהאתר."]
            ].map(([title, body]) => (
              <div className="rounded-lg border border-white/12 bg-white/[0.06] p-5" key={title}>
                <p className="font-black">{title}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8" id="pricing">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-black text-orange-700">מחיר ותוכן בשליטה שלך</p>
            <h2 className="mt-3 text-4xl font-black tracking-normal text-slate-950 sm:text-5xl">
              כמו וורדפרס, מתוך הדשבורד.
            </h2>
            <p className="mt-5 text-lg font-semibold leading-8 text-slate-600">
              עריכת דף התדמית נמצאת ב-`/dashboard/site-editor`, עם שמירה לבסיס הנתונים והופעה מיידית באתר הציבורי.
            </p>
          </div>
          <div className="stitch-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-500">מסלול מוצג באתר</p>
                <p className="mt-2 text-5xl font-black tracking-normal">{content.price_label}</p>
              </div>
              <Wand2 className="h-12 w-12 text-blue-600" />
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["טקסטים", "מחירים", "כפתורי CTA"].map((itemText) => (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-700" key={itemText}>
                  {itemText}
                </div>
              ))}
            </div>
            <Link className="stitch-button mt-8 bg-slate-950 text-white" href="/dashboard/site-editor">
              עריכת האתר
              <MousePointer2 className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center text-sm font-semibold text-slate-500">
        <p>{content.brand_name} - מערכת SaaS עברית ל-WhatsApp, הגרלות וניהול לקוחות.</p>
        <div className="mt-4 flex justify-center gap-5">
          <Link href="/terms">תנאי שימוש</Link>
          <Link href="/privacy">מדיניות פרטיות</Link>
          <Link href="/accessibility">נגישות</Link>
        </div>
      </footer>
    </main>
  );
}
