"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ContactRound,
  LayoutDashboard,
  Link2,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Trophy,
  Users
} from "lucide-react";
import { Badge, cn } from "@lottery/ui";

const navItems = [
  { href: "/dashboard", label: "סקירה", icon: LayoutDashboard },
  { href: "/dashboard/connections", label: "חיבור WhatsApp", icon: Link2 },
  { href: "/dashboard/messages", label: "עורך Magic Flow", icon: MessageSquareText },
  { href: "/dashboard/analytics", label: "נתונים והגרלה", icon: Trophy },
  { href: "/dashboard/contacts", label: "אנשי קשר", icon: ContactRound },
  { href: "/dashboard/campaigns", label: "הגדרות קמפיין", icon: Settings }
] as const;

const quickBadges = [
  { label: "נתונים חיים", icon: BarChart3 },
  { label: "אישור מנהל", icon: ShieldCheck },
  { label: "צוותים", icon: Users }
] as const;

export function DashboardShell({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f6f8fb]" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-[1500px] gap-6 px-4 py-5 md:px-6 xl:px-10">
        <aside className="hidden w-[286px] shrink-0 flex-col rounded-[34px] border border-slate-200 bg-white p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] lg:flex">
          <Link className="flex items-center gap-3 rounded-3xl bg-slate-950 p-4 text-white" href="/dashboard">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-400 text-slate-950">
              <MessageSquareText className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight">Magic Flow</span>
              <span className="block text-xs text-slate-300">ניהול הגרלות WhatsApp</span>
            </span>
          </Link>

          <nav className="mt-7 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    active
                      ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
              עקרון המערכת
            </p>
            <p className="text-sm leading-6 text-slate-600">
              המסכים מציגים רק מידע שמגיע ממסד הנתונים ומה-Worker. אין ספירות מומצאות ואין QR מזויף.
            </p>
            <div className="flex flex-wrap gap-2">
              {quickBadges.map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[30px] border border-slate-200 bg-white px-5 py-4 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                סביבת עבודה
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                לוח הניהול של Magic Flow
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="success">Live-ready</Badge>
              <Link
                className="inline-flex h-10 items-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                href="/"
              >
                דף תדמית
              </Link>
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
