"use client";

import { useState } from "react";
import { Eye, Link2, Minus, Pause, Plus, RefreshCw, X } from "lucide-react";

const toggles = [
  { className: "a11y-contrast", label: "ניגודיות גבוהה", icon: Eye },
  { className: "a11y-grayscale", label: "גווני אפור", icon: Eye },
  { className: "a11y-links", label: "הדגש קישורים", icon: Link2 },
  { className: "a11y-reduced-motion", label: "עצור אנימציות", icon: Pause }
] as const;

function toggleClass(className: string) {
  document.documentElement.classList.toggle(className);
}

function setFontScale(direction: "up" | "down") {
  const root = document.documentElement;
  const current = Number(root.dataset.fontScale ?? 0);
  const next = direction === "up" ? Math.min(current + 1, 2) : Math.max(current - 1, -1);
  root.dataset.fontScale = String(next);
  root.classList.toggle("a11y-font-large", next > 0);
  root.classList.toggle("a11y-font-xlarge", next > 1);
}

function resetAccessibility() {
  document.documentElement.classList.remove(
    "a11y-contrast",
    "a11y-grayscale",
    "a11y-links",
    "a11y-reduced-motion",
    "a11y-font-large",
    "a11y-font-xlarge"
  );
  delete document.documentElement.dataset.fontScale;
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 left-5 z-[200]" dir="rtl">
      {open ? (
        <div className="mb-3 w-[320px] max-w-[calc(100vw-2.5rem)] rounded-[28px] border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">הגדרות נגישות</h2>
            <button
              aria-label="סגירת תפריט נגישות"
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="rounded-2xl border border-slate-200 px-3 py-3 font-bold" onClick={() => setFontScale("up")} type="button">
              <Plus className="mx-auto mb-1 h-5 w-5" />
              הגדל טקסט
            </button>
            <button className="rounded-2xl border border-slate-200 px-3 py-3 font-bold" onClick={() => setFontScale("down")} type="button">
              <Minus className="mx-auto mb-1 h-5 w-5" />
              הקטן טקסט
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {toggles.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-right font-semibold hover:bg-slate-50"
                  key={item.className}
                  onClick={() => toggleClass(item.className)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <Icon className="h-5 w-5 text-blue-600" />
                </button>
              );
            })}
          </div>

          <button
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white"
            onClick={resetAccessibility}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            איפוס נגישות
          </button>
        </div>
      ) : null}

      <button
        aria-label="פתיחת תפריט נגישות"
        className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-slate-950 text-xl font-black text-white shadow-2xl"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        נ
      </button>
    </div>
  );
}
