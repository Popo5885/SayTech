"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const adminNavItems = [
  { href: "#auth-settings", label: "כניסות" },
  { href: "#smtp-settings", label: "מיילים" },
  { href: "#customers", label: "לקוחות" },
  { href: "#connections", label: "WhatsApp" },
  { href: "#automations", label: "אוטומציות" },
  { href: "#billing", label: "תשלומים" }
] as const;

export function AdminMobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative lg:hidden">
      <button
        aria-expanded={open}
        aria-label={open ? "סגירת תפריט ניהול" : "פתיחת תפריט ניהול"}
        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open ? (
        <div className="absolute left-0 top-14 z-50 w-[min(82vw,320px)] rounded-[24px] border border-slate-200 bg-white p-3 text-slate-950 shadow-2xl">
          <nav className="grid gap-1">
            {adminNavItems.map((item) => (
              <a
                className="rounded-2xl px-4 py-3 text-sm font-black transition hover:bg-emerald-50 hover:text-emerald-800"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
