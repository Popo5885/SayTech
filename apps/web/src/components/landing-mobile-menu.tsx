"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const phone = "054-246-6340";

export function LandingMobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-label={open ? "סגירת תפריט" : "פתיחת תפריט"}
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="absolute inset-x-4 top-20 z-50 rounded-[24px] border border-white/12 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
          <nav className="grid gap-2 text-sm font-black text-slate-100">
            <a className="rounded-2xl px-4 py-3 hover:bg-white/10" href="#flow" onClick={() => setOpen(false)}>
              איך זה עובד
            </a>
            <a className="rounded-2xl px-4 py-3 hover:bg-white/10" href="#capabilities" onClick={() => setOpen(false)}>
              יכולות
            </a>
            <a className="rounded-2xl px-4 py-3 hover:bg-white/10" href="#pricing" onClick={() => setOpen(false)}>
              מחירון
            </a>
            <Link className="rounded-2xl px-4 py-3 hover:bg-white/10" href="/help" onClick={() => setOpen(false)}>
              הדרכות
            </Link>
            <a className="rounded-2xl px-4 py-3 text-cyan-100 hover:bg-white/10" dir="ltr" href={`tel:${phone.replaceAll("-", "")}`}>
              {phone}
            </a>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link className="rounded-2xl border border-white/15 px-4 py-3 text-center" href="/login" onClick={() => setOpen(false)}>
                התחברות
              </Link>
              <Link className="rounded-2xl bg-white px-4 py-3 text-center text-slate-950" href="/register" onClick={() => setOpen(false)}>
                הרשמה
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
