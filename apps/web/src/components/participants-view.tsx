"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Download,
  Search,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@lottery/ui";

type Participant = {
  id: string;
  name: string | null;
  phone: string;
  tickets: number;
  referralsCount: number;
  referrerName: string | null;
  referrerPhone: string | null;
  contactSavedConfirmed: boolean;
  createdAt: string;
  referralLink: string;
};

type ParticipantsData = {
  campaign: { id: string; name: string; slug: string; isActive: boolean };
  participants: Participant[];
};

type FilterMode = "all" | "saved" | "unsaved";

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ParticipantsView({
  campaignId,
  data,
}: {
  campaignId: string;
  data: ParticipantsData;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = data.participants;

    if (filter === "saved") list = list.filter((p) => p.contactSavedConfirmed);
    if (filter === "unsaved") list = list.filter((p) => !p.contactSavedConfirmed);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name ?? "").toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          (p.referrerName ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [data.participants, filter, search]);

  const savedCount = data.participants.filter((p) => p.contactSavedConfirmed).length;
  const unsavedCount = data.participants.length - savedCount;

  async function copyLink(link: string, id: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  }

  function exportCsv(exportFilter: FilterMode) {
    const param = exportFilter === "saved" ? "saved" : exportFilter === "unsaved" ? "unsaved" : "all";
    window.location.href = `/api/campaigns/${campaignId}/participants-export?filter=${param}`;
  }

  return (
    <div className="mx-auto max-w-5xl pb-20 text-right" dir="rtl">
      {/* Header */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
        initial={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.4 }}
      >
        <Link
          className="mb-4 inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-900"
          href={`/dashboard/raffle/${campaignId}`}
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לדשבורד ההגרלה
        </Link>

        <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(30,41,59,0.08)]">
          <div className="relative isolate px-6 py-6">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_0%,rgba(124,58,237,0.12),transparent_40%)]" />
            <h1 className="text-3xl font-black text-slate-950">רשימת משתתפים</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">{data.campaign.name}</p>

            {/* Summary chips */}
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                <Users className="h-3.5 w-3.5" />
                {data.participants.length} משתתפים סה״כ
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {savedCount} שמרו איש קשר
              </div>
              {unsavedCount > 0 ? (
                <div className="flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  <XCircle className="h-3.5 w-3.5" />
                  {unsavedCount} לא שמרו
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-9 pl-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)]"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, טלפון..."
            type="search"
            value={search}
          />
        </div>

        {/* Filter tabs */}
        <div className="flex rounded-2xl bg-slate-100 p-1">
          {(["all", "saved", "unsaved"] as FilterMode[]).map((mode) => (
            <button
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all",
                filter === mode ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
              key={mode}
              onClick={() => setFilter(mode)}
              type="button"
            >
              {mode === "all" && <Users className="h-3.5 w-3.5" />}
              {mode === "saved" && <UserCheck className="h-3.5 w-3.5" />}
              {mode === "unsaved" && <UserX className="h-3.5 w-3.5" />}
              {mode === "all" ? "כולם" : mode === "saved" ? "שמרו" : "לא שמרו"}
            </button>
          ))}
        </div>

        {/* Export button */}
        <button
          className="flex h-11 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(139,92,246,0.24)] transition hover:-translate-y-0.5 hover:bg-violet-700"
          onClick={() => exportCsv(filter)}
          type="button"
        >
          <Download className="h-4 w-4" />
          ייצוא CSV
        </button>
      </motion.div>

      {/* Table */}
      {filtered.length === 0 ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center"
          initial={{ opacity: 0 }}
        >
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-4 text-base font-black text-slate-500">לא נמצאו משתתפים</p>
          <p className="mt-2 text-sm text-slate-400">
            {search ? "נסה לשנות את מונח החיפוש" : "עדיין אין משתתפים בקבוצה זו"}
          </p>
        </motion.div>
      ) : (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_48px_rgba(30,41,59,0.07)]"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.38, delay: 0.12 }}
        >
          {/* Mobile cards */}
          <div className="block sm:hidden">
            <AnimatePresence mode="popLayout">
              {filtered.map((p, i) => (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className={cn("border-b border-slate-100 px-5 py-4 last:border-0")}
                  exit={{ opacity: 0, x: -20 }}
                  initial={{ opacity: 0, x: -20 }}
                  key={p.id}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">{p.name ?? "—"}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500" dir="ltr">
                        {p.phone}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black",
                        p.contactSavedConfirmed
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      )}
                    >
                      {p.contactSavedConfirmed ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {p.contactSavedConfirmed ? "שמר" : "לא שמר"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>🎟 {p.tickets} כרטיסים</span>
                    <span>👥 {p.referralsCount} הפניות</span>
                    {p.referrerName ? <span>מופנה ע״י: {p.referrerName}</span> : null}
                    <span>{dateFormatter.format(new Date(p.createdAt))}</span>
                  </div>
                  <button
                    className={cn(
                      "mt-2 text-[11px] font-black transition",
                      copied === p.id ? "text-emerald-600" : "text-violet-600 hover:text-violet-800"
                    )}
                    onClick={() => void copyLink(p.referralLink, p.id)}
                    type="button"
                  >
                    {copied === p.id ? "✓ הועתק" : "העתק קישור אישי"}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-right">
                  {["שם מלא", "טלפון", "כרטיסים", "הפניות", "מי הפנה", "שמר קשר", "תאריך הרשמה", "קישור"].map(
                    (h) => (
                      <th className="px-4 py-3 text-xs font-black text-slate-500" key={h}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filtered.map((p, i) => (
                    <motion.tr
                      animate={{ opacity: 1 }}
                      className="border-b border-slate-100 transition hover:bg-violet-50/30 last:border-0"
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0 }}
                      key={p.id}
                      transition={{ delay: Math.min(i * 0.02, 0.25) }}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">{p.name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono text-slate-600" dir="ltr">
                        {p.phone}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-violet-700">{p.tickets}</td>
                      <td className="px-4 py-3 text-center font-black text-slate-700">{p.referralsCount}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {p.referrerName ? (
                          <span>
                            {p.referrerName}
                            <span className="block text-[10px] text-slate-400" dir="ltr">
                              {p.referrerPhone}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black",
                            p.contactSavedConfirmed
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          )}
                        >
                          {p.contactSavedConfirmed ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {p.contactSavedConfirmed ? "כן" : "לא"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {dateFormatter.format(new Date(p.createdAt))}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className={cn(
                            "text-[11px] font-black transition",
                            copied === p.id
                              ? "text-emerald-600"
                              : "text-violet-600 hover:text-violet-800"
                          )}
                          onClick={() => void copyLink(p.referralLink, p.id)}
                          type="button"
                        >
                          {copied === p.id ? "✓ הועתק" : "העתק"}
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
            <p className="text-xs font-black text-slate-400">
              מציג {filtered.length} מתוך {data.participants.length} משתתפים
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
