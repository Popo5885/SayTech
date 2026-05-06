"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { RefreshCw, Smartphone } from "lucide-react";

type QrState =
  | { phase: "loading" }
  | { phase: "ready"; token: string; qrDataUrl: string; expiresAt: number }
  | { phase: "signing-in" }
  | { phase: "expired" }
  | { phase: "error" };

const POLL_INTERVAL_MS = 2500;

export function QrLoginPanel() {
  const [state, setState] = useState<QrState>({ phase: "loading" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function initSession() {
    setState({ phase: "loading" });

    try {
      const res = await fetch("/api/auth/qr-session", { method: "POST" });
      const data = await res.json();

      if (!data.token) throw new Error("no token");

      const QRCode = (await import("qrcode")).default;
      const qrDataUrl = await QRCode.toDataURL(data.qrUrl, {
        width: 240,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" }
      });

      setState({
        phase: "ready",
        token: data.token,
        qrDataUrl,
        expiresAt: new Date(data.expiresAt).getTime()
      });
    } catch {
      setState({ phase: "error" });
    }
  }

  useEffect(() => {
    initSession();
  }, []);

  useEffect(() => {
    if (state.phase !== "ready") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }

    const { token, expiresAt } = state;

    pollRef.current = setInterval(async () => {
      if (Date.now() > expiresAt) {
        setState({ phase: "expired" });
        return;
      }

      try {
        const res = await fetch(`/api/auth/qr-session?token=${token}`);
        const data = await res.json();

        if (data.status === "authenticated") {
          if (pollRef.current) clearInterval(pollRef.current);
          setState({ phase: "signing-in" });
          await signIn("credentials", { qrToken: token, callbackUrl: "/dashboard" });
        } else if (data.status === "expired" || data.status === "invalid") {
          setState({ phase: "expired" });
        }
      } catch {
        // ignore transient polling errors
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [state]);

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <div className="flex items-center gap-2">
        <Smartphone className="h-5 w-5 text-cyan-300" />
        <p className="font-black text-white">כניסה עם סריקת QR</p>
      </div>
      <p className="mt-1 text-sm text-slate-300">
        סרוק עם המצלמה של הטלפון והתחבר — ללא הקלדה.
      </p>

      <div className="mt-4 flex flex-col items-center gap-4">
        {state.phase === "loading" && (
          <div className="flex h-[240px] w-[240px] items-center justify-center rounded-2xl bg-white">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
          </div>
        )}

        {state.phase === "ready" && (
          <>
            <img
              alt="QR Code לכניסה"
              className="h-[240px] w-[240px] rounded-2xl"
              src={state.qrDataUrl}
            />
            <p className="text-center text-xs text-slate-400">
              פתח את המצלמה בטלפון וסרוק את הקוד. הקוד תקף ל-3 דקות.
            </p>
          </>
        )}

        {state.phase === "signing-in" && (
          <div className="flex h-[240px] w-[240px] flex-col items-center justify-center gap-3 rounded-2xl bg-emerald-500/20">
            <svg
              className="h-12 w-12 text-emerald-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm font-black text-emerald-300">מחבר...</p>
          </div>
        )}

        {(state.phase === "expired" || state.phase === "error") && (
          <div className="flex h-[240px] w-[240px] flex-col items-center justify-center gap-3 rounded-2xl bg-white/5">
            <p className="text-sm font-semibold text-slate-300">
              {state.phase === "expired" ? "הקוד פג תוקף" : "שגיאה בטעינה"}
            </p>
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
              onClick={initSession}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              קוד חדש
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
