"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Link2, LogOut, MessageSquareText, ShieldCheck, Trophy } from "lucide-react";
import { cn } from "@lottery/ui";
import { GuidedTourButton } from "./guided-tour-button";

const navItems = [
  { href: "/dashboard/connections", label: "חיבור", icon: Link2, tour: "connection-nav" },
  { href: "/dashboard/messages", label: "הודעות", icon: MessageSquareText, tour: "messages-nav" },
  { href: "/dashboard/analytics", label: "הגרלה", icon: Trophy, tour: "analytics-nav" }
] as const;

export function DashboardShell({
  children,
  isSuperAdmin = false
}: {
  children: React.ReactNode;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const visibleNavItems = isSuperAdmin
    ? [
        ...navItems,
        { href: "/admin", label: "ניהול", icon: ShieldCheck, tour: "admin-nav" }
      ]
    : navItems;

  return (
    <div className="min-h-screen bg-[#f7f8fb]" dir="rtl">
      <div className="mx-auto flex min-h-screen max-w-[1280px] gap-6 px-4 py-5 md:px-6 xl:px-10">
        <aside className="hidden w-[252px] shrink-0 flex-col rounded-[30px] border border-slate-200 bg-white/88 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.07)] backdrop-blur lg:flex">
          <Link className="flex items-center gap-3 rounded-3xl bg-slate-950 p-4 text-white" href="/dashboard">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-400 text-slate-950">
              <MessageSquareText className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight">Magic Flow</span>
              <span className="block text-xs text-slate-300">חיבור · הודעות · הגרלה</span>
            </span>
          </Link>

          <nav className="mt-7 space-y-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-tour={item.tour}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition",
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

          <button
            className="mt-auto flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 transition hover:bg-white hover:text-slate-950"
            onClick={() => void signOut({ callbackUrl: "/" })}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            יציאה
          </button>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-white/88 px-5 py-4 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur">
            <p className="text-sm font-black text-emerald-700">Magic Flow</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              לוח עבודה
            </h1>
            <nav className={cn("mt-4 grid gap-2 lg:hidden", isSuperAdmin ? "grid-cols-4" : "grid-cols-3")}>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    className={cn(
                      "inline-flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-black transition",
                      active
                        ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                        : "bg-slate-50 text-slate-700"
                    )}
                    data-tour={item.tour}
                    href={item.href}
                    key={item.href}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700 lg:hidden"
              onClick={() => void signOut({ callbackUrl: "/" })}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              יציאה
            </button>
          </div>

          <GuidedTourButton autoStart showButton={false} />
          {children}
        </main>
      </div>
    </div>
  );
}
