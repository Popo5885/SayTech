"use client";

import Link from "next/link";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Download,
  Link2,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  UserCircle2,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@lottery/ui";
import type { RaffleDashboardData } from "../lib/raffle-dashboard-types";

const numberFormatter = new Intl.NumberFormat("he-IL");

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.46,
      ease: "easeOut",
      staggerChildren: 0.07
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1 }
};

type ExportFilter = "all" | "saved";

export function RaffleDashboard({ data }: { data: RaffleDashboardData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function shareRaffleLink() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: data.campaign.name,
          url: data.shareUrl
        });
      } else {
        await navigator.clipboard.writeText(data.shareUrl);
      }

      setNotice("הקישור מוכן לשיתוף");
    } catch {
      setNotice("לא ניתן לשתף כרגע. אפשר להעתיק את הקישור מהדפדפן.");
    }
  }

  function markEndIntent() {
    setNotice("סיום הגרלה דורש אישור במסך ההגרלה כדי למנוע פעולה בטעות.");
  }

  return (
    <motion.main
      animate="show"
      className="mx-auto max-w-5xl pb-28 text-right md:pb-10"
      dir="rtl"
      initial="hidden"
      variants={sectionVariants}
    >
      <motion.section
        className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(30,41,59,0.08)]"
        variants={itemVariants}
      >
        <div className="relative isolate px-5 py-6 sm:px-7">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_0%,rgba(124,58,237,0.16),transparent_34%),radial-gradient(circle_at_15%_12%,rgba(14,165,233,0.14),transparent_30%)]" />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                דשבורד הגרלה חי
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-normal text-slate-950 sm:text-4xl">
                {data.campaign.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-slate-500">
                תצוגת KPI מהירה ונוחה למובייל, עם נתונים אמיתיים בלבד מתוך ההגרלה.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/76 px-4 py-3 shadow-sm backdrop-blur">
              <p className="text-xs font-black text-slate-400">קישור הצטרפות</p>
              <p className="mt-1 max-w-[240px] truncate text-left text-sm font-bold text-slate-700" dir="ltr">
                {data.shareUrl}
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {notice ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800"
          initial={{ opacity: 0, y: -8 }}
        >
          {notice}
        </motion.div>
      ) : null}

      {!data.hasData ? (
        <EmptyRaffleState shareUrl={data.shareUrl} />
      ) : (
        <>
          <motion.section
            className="mt-5 grid gap-4"
            variants={sectionVariants}
          >
            <KpiCard
              accent="violet"
              label="סה״כ נכנסו להגרלה"
              value={data.totals.entered}
            />
            <KpiCard
              accent="purple"
              label="סה״כ כרטיסים"
              value={data.totals.tickets}
            />
            <div className="grid grid-cols-2 gap-4">
              <SmallKpiCard
                accent="pink"
                label="סה״כ שיתפו"
                value={data.totals.shared}
              />
              <SmallKpiCard
                accent="emerald"
                label="סה״כ שמרו"
                value={data.totals.saved}
              />
            </div>
          </motion.section>

          <StatsSection
            title="פעילות אחרונה"
            items={[
              ["נרשמים חדשים ב-24 שעות", data.recent.newSignups24h],
              ["פעילות ב-24 שעות", data.recent.activity24h],
              ["פעילות בשעה האחרונה", data.recent.activityLastHour]
            ]}
          />

          <StatsSection
            title="סטטוס אנשי קשר"
            columns="two"
            items={[
              ["היו שמורים בחשבון", data.contacts.savedInAccount],
              ["אנשי קשר חדשים", data.contacts.newContacts]
            ]}
          />
        </>
      )}

      <motion.section
        className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4"
        variants={sectionVariants}
      >
        <ActionButton
          icon={<Trophy className="h-5 w-5" />}
          label="סיום הגרלה"
          onClick={markEndIntent}
          tone="warning"
        />
        <motion.div variants={itemVariants} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Link
            className="flex min-h-[58px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-blue-600 to-violet-600 px-3 text-center text-sm font-black text-white shadow-[0_16px_36px_rgba(79,70,229,0.24)]"
            href="/dashboard/analytics"
          >
            <ClipboardList className="h-5 w-5" />
            צפייה ברשימה המלאה
          </Link>
        </motion.div>
        <ActionButton
          icon={<Link2 className="h-5 w-5" />}
          label="שתף קישור"
          onClick={() => void shareRaffleLink()}
          tone="outline"
        />
        <ActionButton
          icon={<Download className="h-5 w-5" />}
          label="הורדת אנשי קשר"
          onClick={() => setModalOpen(true)}
          tone="success"
        />
      </motion.section>

      <ContactDownloadModal
        data={data}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </motion.main>
  );
}

function KpiCard({
  accent,
  label,
  value
}: {
  accent: "violet" | "purple";
  label: string;
  value: number;
}) {
  return (
    <motion.div
      className={cn(
        "rounded-[30px] border bg-white px-5 py-7 text-center shadow-[0_18px_56px_rgba(30,41,59,0.08)]",
        accent === "violet"
          ? "border-violet-100 bg-violet-50/45"
          : "border-fuchsia-100 bg-fuchsia-50/38"
      )}
      variants={itemVariants}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <p className="text-6xl font-black tracking-normal text-violet-700">
        {numberFormatter.format(value)}
      </p>
      <p className="mt-3 text-base font-black text-slate-600">{label}</p>
    </motion.div>
  );
}

function SmallKpiCard({
  accent,
  label,
  value
}: {
  accent: "pink" | "emerald";
  label: string;
  value: number;
}) {
  return (
    <motion.div
      className={cn(
        "rounded-[28px] border px-4 py-6 text-center shadow-[0_16px_44px_rgba(30,41,59,0.07)]",
        accent === "pink"
          ? "border-pink-100 bg-pink-50/62 text-pink-700"
          : "border-emerald-100 bg-emerald-50/68 text-emerald-700"
      )}
      variants={itemVariants}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <p className="text-4xl font-black tracking-normal">{numberFormatter.format(value)}</p>
      <p className="mt-3 text-sm font-black text-slate-600">{label}</p>
    </motion.div>
  );
}

function StatsSection({
  columns = "three",
  items,
  title
}: {
  columns?: "two" | "three";
  items: Array<[string, number]>;
  title: string;
}) {
  return (
    <motion.section className="mt-8" variants={sectionVariants}>
      <h2 className="px-1 text-xl font-black tracking-normal text-slate-400">{title}</h2>
      <div
        className={cn(
          "mt-4 grid gap-3",
          columns === "two" ? "grid-cols-2" : "grid-cols-3"
        )}
      >
        {items.map(([label, value]) => (
          <motion.div
            className="min-h-[116px] rounded-[24px] border border-slate-200 bg-white px-3 py-5 text-center shadow-[0_12px_34px_rgba(30,41,59,0.07)]"
            key={label}
            variants={itemVariants}
            whileHover={{ y: -2 }}
          >
            <p className="text-3xl font-black tracking-normal text-slate-800">
              {numberFormatter.format(value)}
            </p>
            <p className="mt-2 text-xs font-black leading-5 text-slate-500 sm:text-sm">{label}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone: "warning" | "outline" | "success";
}) {
  return (
    <motion.button
      className={cn(
        "flex min-h-[58px] items-center justify-center gap-2 rounded-2xl px-3 text-center text-sm font-black shadow-[0_14px_30px_rgba(30,41,59,0.1)] transition",
        tone === "warning" &&
          "bg-gradient-to-l from-orange-500 to-amber-400 text-white shadow-orange-500/20",
        tone === "outline" &&
          "border border-slate-200 bg-white text-violet-700 shadow-slate-200/70",
        tone === "success" &&
          "bg-emerald-600 text-white shadow-emerald-600/18"
      )}
      onClick={onClick}
      type="button"
      variants={itemVariants}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function EmptyRaffleState({ shareUrl }: { shareUrl: string }) {
  return (
    <motion.section
      className="mt-5 rounded-[32px] border border-dashed border-slate-300 bg-white px-5 py-10 text-center shadow-[0_18px_56px_rgba(30,41,59,0.06)]"
      variants={itemVariants}
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[28px] bg-blue-50 text-blue-700">
        <BarChart3 className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-normal text-slate-950">
        אין נתונים להצגה עדיין
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-500">
        לא מוצגים נתוני דמו. ברגע שמשתתפים אמיתיים יצטרפו להגרלה, הכרטיסים והפעילות יופיעו כאן.
      </p>
      <div className="mx-auto mt-5 max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-600" dir="ltr">
        {shareUrl}
      </div>
      <Link
        className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
        href="/dashboard/campaigns"
      >
        הגדרת ההגרלה
        <ChevronLeft className="h-4 w-4" />
      </Link>
    </motion.section>
  );
}

function ContactDownloadModal({
  data,
  onClose,
  open
}: {
  data: RaffleDashboardData;
  onClose: () => void;
  open: boolean;
}) {
  const [filter, setFilter] = useState<ExportFilter>("all");
  const [downloadState, setDownloadState] = useState<"idle" | "preparing" | "ready">("idle");

  const contactCount = useMemo(
    () => (filter === "saved" ? data.contacts.savedFilterCount : data.contacts.downloadable),
    [data.contacts.downloadable, data.contacts.savedFilterCount, filter]
  );

  const syncedCount = data.totals.saved;
  const syncTotal = Math.max(data.contacts.downloadable, 1);
  const syncPct = Math.min(100, Math.round((syncedCount / syncTotal) * 100));

  function prepareDownload() {
    setDownloadState("preparing");
    window.setTimeout(() => setDownloadState("ready"), 650);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className="max-h-[92vh] w-full max-w-[600px] overflow-y-auto rounded-t-[32px] bg-[#f7f9fb] text-right shadow-[0px_-12px_32px_rgba(0,0,0,0.12)]"
            dir="rtl"
            exit={{ opacity: 0, y: 40 }}
            initial={{ opacity: 0, y: 60 }}
            onClick={(e) => e.stopPropagation()}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
          >
            {/* Handle */}
            <div className="flex justify-center pb-2 pt-4">
              <div className="h-1.5 w-12 rounded-full bg-slate-300/70" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-6 pb-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  הורדת אנשי קשר
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  בחר את פורמט הייצוא ואת קבוצת היעד
                </p>
              </div>
              <button
                aria-label="סגירת חלון"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 active:scale-90"
                onClick={onClose}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Segment Control */}
            <div className="px-6 pb-6">
              <div className="flex rounded-2xl bg-slate-200/70 p-1">
                <button
                  className={cn(
                    "flex-1 rounded-xl py-3 text-sm font-semibold transition-all",
                    filter === "all"
                      ? "bg-[#6063ee] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                  onClick={() => setFilter("all")}
                  type="button"
                >
                  כל אנשי הקשר
                </button>
                <button
                  className={cn(
                    "flex-1 rounded-xl py-3 text-sm font-semibold transition-all",
                    filter === "saved"
                      ? "bg-[#6063ee] text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                  onClick={() => setFilter("saved")}
                  type="button"
                >
                  שמורים בלבד
                </button>
              </div>
            </div>

            {/* Option Cards */}
            <div className="flex flex-col gap-3 px-6 pb-10">
              {/* Download All */}
              <button
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-right transition hover:bg-slate-50 active:scale-[0.99]"
                onClick={prepareDownload}
                type="button"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">הורד את הכל</div>
                    <div className="mt-0.5 text-sm text-slate-500">
                      ייצוא מהיר של {numberFormatter.format(contactCount)} איש קשר כקובץ CSV או VCF
                    </div>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 shrink-0 text-slate-300" />
              </button>

              {/* Custom Download */}
              <button
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-5 py-4 text-right transition hover:bg-slate-50 active:scale-[0.99]"
                type="button"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">הורדה מותאמת אישית</div>
                    <div className="mt-0.5 text-sm text-slate-500">סינון לפי תאריך, תגיות או סטטוס</div>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 shrink-0 text-slate-300" />
              </button>

              {/* Premium Google Auto-Sync — gradient border */}
              <div
                className="relative rounded-2xl p-px"
                style={{ background: "linear-gradient(135deg, #4648d4, #8127cf)" }}
              >
                <div className="relative overflow-hidden rounded-[calc(1rem-1px)] bg-white p-5">
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(70,72,212,0.05) 0%, rgba(129,39,207,0.05) 100%)"
                    }}
                  />
                  <div className="relative flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md"
                        style={{ background: "linear-gradient(135deg, #4648d4, #8127cf)" }}
                      >
                        <UserCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">שמירה אוטומטית לגוגל</span>
                          <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                            פרימיום V47
                          </span>
                        </div>
                        <div className="mt-0.5 text-sm text-slate-500">סנכרון רציף של אנשי קשר חדשים</div>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-indigo-600">
                          <RefreshCw className="h-4 w-4" />
                          <span className="text-xs font-semibold">סנכרון בתהליך...</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <span className="text-lg font-bold">{numberFormatter.format(syncedCount)}</span>
                          <span className="text-xs text-slate-400">
                            מתוך {numberFormatter.format(data.contacts.downloadable)}
                          </span>
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        </div>
                      </div>
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${syncPct}%`,
                            background: "linear-gradient(to left, #4648d4, #8127cf)"
                          }}
                        />
                      </div>
                    </div>

                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
                      type="button"
                    >
                      {downloadState === "preparing" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : downloadState === "ready" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      {downloadState === "ready" ? "הסנכרון מוכן" : "סנכרון אנשי קשר"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-8">
              <button
                className="w-full py-3 text-sm font-medium text-slate-400 transition hover:text-slate-600"
                onClick={onClose}
                type="button"
              >
                ביטול וחזרה לרשימה
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
