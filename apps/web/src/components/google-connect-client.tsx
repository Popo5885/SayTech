"use client";

import { useState } from "react";
import { CheckCircle2, Link2, Loader2, RefreshCw, Unlink } from "lucide-react";

export function GoogleConnectClient({
  isConnected,
  tokenExpiry,
  workspaceId,
}: {
  isConnected: boolean;
  tokenExpiry: string | null;
  workspaceId: string;
}) {
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notified, setNotified] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  async function notifyN8n() {
    setNotifyLoading(true);
    setNotifyError(null);
    try {
      const res = await fetch("/api/n8n/google-connected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setNotifyError(json.error ?? "שגיאה בשליחה ל-n8n.");
        return;
      }
      setNotified(true);
      window.setTimeout(() => setNotified(false), 3000);
    } catch {
      setNotifyError("תקלת רשת. נסה שנית.");
    } finally {
      setNotifyLoading(false);
    }
  }

  const connectUrl = `/api/google/connect?workspace_id=${encodeURIComponent(workspaceId)}`;

  return (
    <div className="flex flex-col gap-3">
      {isConnected ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-black text-emerald-800">Google Contacts מחובר</p>
              {tokenExpiry ? (
                <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                  תוקף גישה:{" "}
                  {new Date(tokenExpiry).toLocaleDateString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
              href={connectUrl}
            >
              <RefreshCw className="h-4 w-4" />
              חבר מחדש / שנה חשבון
            </a>

            <button
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(139,92,246,0.24)] transition hover:bg-violet-700 disabled:opacity-60"
              disabled={notifyLoading}
              onClick={notifyN8n}
              type="button"
            >
              {notifyLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : notified ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {notified ? "n8n עודכן!" : "עדכן n8n"}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            לחץ על הכפתור כדי לחבר את חשבון Google שלך. לאחר החיבור, כל משתתף שיאשר שמר את
            איש הקשר יתווסף אוטומטית ל-Google Contacts שלך.
          </p>
          <a
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-[0_12px_28px_rgba(99,102,241,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(99,102,241,0.32)]"
            href={connectUrl}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#fff"
                opacity="0.9"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#fff"
                opacity="0.9"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#fff"
                opacity="0.9"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#fff"
                opacity="0.9"
              />
            </svg>
            חבר חשבון Google
          </a>
        </div>
      )}

      {notifyError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          {notifyError}
        </div>
      ) : null}
    </div>
  );
}
