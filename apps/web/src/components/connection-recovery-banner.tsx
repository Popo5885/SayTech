"use client";

import { useEffect, useRef, useState } from "react";

type BannerState = "online" | "offline" | "reconnecting";

function checkServerConnectivity(): Promise<boolean> {
  return fetch("/api/health", { method: "HEAD", cache: "no-store" })
    .then((r) => r.ok)
    .catch(() => false);
}

export function ConnectionRecoveryBanner() {
  const [bannerState, setBannerState] = useState<BannerState>("online");
  const [attempts, setAttempts] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  function startReconnectLoop() {
    clearTimers();
    setAttempts(0);
    setBannerState("reconnecting");

    let attempt = 0;

    const tryReconnect = async () => {
      attempt++;
      setAttempts(attempt);

      const ok = await checkServerConnectivity();

      if (ok) {
        clearTimers();
        setBannerState("online");
      }
    };

    void tryReconnect();
    intervalRef.current = setInterval(() => void tryReconnect(), 5000);
  }

  useEffect(() => {
    let initialCheckDone = false;

    const handleOffline = () => startReconnectLoop();

    const handleOnline = async () => {
      if (!initialCheckDone) {
        return;
      }
      const ok = await checkServerConnectivity();
      if (ok) {
        clearTimers();
        setBannerState("online");
      } else {
        startReconnectLoop();
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline as EventListener);

    const initialCheck = async () => {
      if (!navigator.onLine) {
        startReconnectLoop();
      } else {
        const ok = await checkServerConnectivity();
        if (!ok) {
          startReconnectLoop();
        } else {
          setBannerState("online");
        }
      }
      initialCheckDone = true;
    };

    void initialCheck();

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline as EventListener);
      clearTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bannerState === "online") {
    return null;
  }

  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
      dir="rtl"
      role="alert"
    >
      <div className="mx-4 max-w-md rounded-[32px] border border-red-400/30 bg-slate-900 p-8 text-center shadow-2xl">
        <div className="flex items-center justify-center">
          <span className="relative flex h-5 w-5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-5 w-5 rounded-full bg-red-500" />
          </span>
        </div>
        <p className="mt-5 text-lg font-black leading-8 text-white">
          אין חיבור לשרת, מנסה להתחבר מחדש...
        </p>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          המערכת תחזור לפעילות בעוד מספר שניות
        </p>
        {attempts > 0 ? (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-slate-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            ניסיון חיבור {attempts}
          </p>
        ) : null}
      </div>
    </div>
  );
}
