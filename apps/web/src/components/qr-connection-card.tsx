"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  BatteryCharging,
  Building2,
  Link2,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi
} from "lucide-react";
import { Badge, Button, Card, CardDescription, CardTitle, Input, cn } from "@lottery/ui";
import type { ConnectionSnapshot } from "@lottery/core";
import { getSocket } from "../lib/socket";

type ConnectionTab = "qr" | "pairing" | "official";

async function fetchConnectionSnapshot(connectionId: string): Promise<ConnectionSnapshot | null> {
  try {
    const response = await fetch(`/api/connections/${connectionId}/status`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ConnectionSnapshot;
  } catch {
    return null;
  }
}

function toneForSnapshot(snapshot: ConnectionSnapshot) {
  if (!snapshot.workerOnline) {
    return "danger" as const;
  }

  if (snapshot.status === "connected") {
    return "success" as const;
  }

  if (snapshot.status === "qr_ready" || snapshot.status === "connecting") {
    return "warning" as const;
  }

  if (snapshot.status === "error") {
    return "danger" as const;
  }

  return "neutral" as const;
}

function statusLabel(snapshot: ConnectionSnapshot): string {
  if (!snapshot.workerOnline) {
    return "שירות הוואטסאפ לא פעיל";
  }

  if (snapshot.status === "connected") {
    return "הטלפון מחובר";
  }

  if (snapshot.status === "qr_ready") {
    return "הקוד מוכן לסריקה";
  }

  if (snapshot.status === "connecting") {
    return "פותח חיבור חדש";
  }

  if (snapshot.status === "error") {
    return "יש תקלה בחיבור";
  }

  return "ממתין לקוד חדש";
}

function normalizePhoneForDisplay(phone: string | null): string {
  if (!phone) {
    return "עדיין לא חובר מספר";
  }

  return phone.startsWith("+") ? phone : `+${phone.replace(/^\+/, "")}`;
}

export function QrConnectionCard({
  initialSnapshot
}: {
  initialSnapshot: ConnectionSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeTab, setActiveTab] = useState<ConnectionTab>("qr");
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    void fetchConnectionSnapshot(snapshot.connectionId).then((nextSnapshot) => {
      if (nextSnapshot) {
        startTransition(() => setSnapshot(nextSnapshot));
      }
    });

    const timer = setInterval(() => {
      void fetchConnectionSnapshot(snapshot.connectionId).then((nextSnapshot) => {
        if (nextSnapshot) {
          startTransition(() => setSnapshot(nextSnapshot));
        }
      });
    }, 5000);

    const socket = getSocket();

    if (socket) {
      socket.connect();

      const handler = (payload: ConnectionSnapshot) => {
        if (payload.connectionId === snapshot.connectionId) {
          startTransition(() =>
            setSnapshot((current) => ({
              ...payload,
              workerOnline: current.workerOnline ?? true
            }))
          );
        }
      };

      socket.on("connection:snapshot", handler);

      return () => {
        socket.off("connection:snapshot", handler);
        clearInterval(timer);
      };
    }

    return () => clearInterval(timer);
  }, [snapshot.connectionId]);

  const showQr = Boolean(snapshot.workerOnline && snapshot.qrCode);
  const showLoading =
    Boolean(snapshot.workerOnline) && snapshot.status !== "connected" && !snapshot.qrCode;
  const clientLink = useMemo(
    () =>
      typeof window === "undefined"
        ? `/connect/${snapshot.sessionKey}`
        : `${window.location.origin}/connect/${snapshot.sessionKey}`,
    [snapshot.sessionKey]
  );

  async function requestPairingCode(): Promise<void> {
    setIsRequesting(true);
    setActionMessage(null);
    setPairingCode(null);

    try {
      const response = await fetch(`/api/connections/${snapshot.connectionId}/pairing-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: pairingPhone })
      });
      const data = (await response.json()) as { pairingCode?: string; error?: string };

      if (!response.ok || !data.pairingCode) {
        throw new Error(data.error ?? "לא התקבל קוד התאמה מה-Worker.");
      }

      setPairingCode(data.pairingCode);
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "לא הצלחנו לבקש קוד התאמה. בדקו שה-Worker פעיל."
      );
    } finally {
      setIsRequesting(false);
    }
  }

  async function refreshConnection(): Promise<void> {
    setIsRequesting(true);
    setActionMessage(null);

    try {
      const response = await fetch(`/api/connections/${snapshot.connectionId}/connect`, {
        method: "POST"
      });
      const data = (await response.json()) as Partial<ConnectionSnapshot> & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "החיבור מתבצע רק דרך ה-Worker החי.");
      }

      startTransition(() => setSnapshot((current) => ({ ...current, ...data })));
      setActionMessage("נשלחה בקשה ל-Worker להפיק קוד חדש.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "לא הצלחנו לרענן חיבור.");
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <Card className="grid gap-8 overflow-hidden lg:grid-cols-[1.1fr_380px]" dir="rtl">
      <div className="space-y-5 p-1">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>חיבור WhatsApp</CardTitle>
          <Badge tone={toneForSnapshot(snapshot)}>{statusLabel(snapshot)}</Badge>
          <Badge tone="neutral">
            {snapshot.provider === "official_business" ? "Business Cloud" : "QR / Pairing"}
          </Badge>
        </div>

        <CardDescription className="max-w-2xl text-base leading-7">
          המסך הזה מציג רק מצב אמיתי מה-Worker או מה-Cloud API. אין כאן יצירת QR בצד הדפדפן,
          אין קוד ישן, ואין סטטוס ירוק אם החיבור לא חי.
        </CardDescription>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <Wifi className="h-4 w-4" />
              מצב שירות
            </div>
            <p className="mt-3 text-sm text-stone-600">
              {snapshot.workerOnline ? "פעיל ומאזין לסוקטים" : "כבוי כרגע"}
            </p>
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <BatteryCharging className="h-4 w-4" />
              סוללה
            </div>
            <p className="mt-3 text-sm text-stone-600">
              {snapshot.workerOnline && snapshot.batteryLevel !== null
                ? `${snapshot.batteryLevel}%`
                : "לא זמין עדיין"}
            </p>
          </div>

          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
              <Smartphone className="h-4 w-4" />
              מספר מחובר
            </div>
            <p className="mt-3 text-sm text-stone-600">
              {normalizePhoneForDisplay(snapshot.phoneNumber)}
            </p>
          </div>
        </div>

        <div className="grid gap-2 rounded-[24px] border border-stone-200 bg-stone-50 p-2 sm:grid-cols-3">
          {[
            { id: "qr" as const, label: "סריקת QR", icon: QrCode },
            { id: "pairing" as const, label: "קוד התאמה", icon: Smartphone },
            { id: "official" as const, label: "Business Cloud", icon: Building2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                  selected
                    ? "bg-white text-stone-950 shadow-sm"
                    : "text-stone-500 hover:bg-white/70 hover:text-stone-800"
                )}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "qr" ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
            אם הקוד פג תוקף, בקשו מה-Worker להפיק קוד חדש. הקוד עצמו יופיע רק כשה-Worker
            ישלח תמונת QR אמיתית דרך הסוקט.
          </div>
        ) : null}

        {activeTab === "pairing" ? (
          <div className="space-y-4 rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <div className="text-right">
              <p className="text-sm font-semibold text-stone-900">קוד התאמה למובייל</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                מתאים ללקוח שמנסה להתחבר מהטלפון ולא יכול לסרוק את המסך של עצמו.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                dir="ltr"
                onChange={(event) => setPairingPhone(event.target.value)}
                placeholder="+972501234567"
                value={pairingPhone}
              />
              <Button disabled={isRequesting || !pairingPhone.trim()} onClick={() => void requestPairingCode()}>
                {isRequesting ? "מבקש..." : "הפק קוד"}
              </Button>
            </div>
            {pairingCode ? (
              <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 text-center">
                <p className="text-sm font-medium text-emerald-800">הקוד שלך</p>
                <p className="mt-2 font-mono text-3xl font-black tracking-[0.2em] text-emerald-950">
                  {pairingCode}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab === "official" ? (
          <div className="space-y-4 rounded-[28px] border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3 text-right">
              <ShieldCheck className="mt-1 h-5 w-5 text-emerald-700" />
              <div>
                <p className="text-sm font-semibold text-emerald-950">WhatsApp Business Cloud</p>
                <p className="mt-1 text-sm leading-6 text-emerald-900">
                  החיבור הרשמי נשמר בשרת עם Token מוצפן, Phone Number ID, WABA ID ו-webhook
                  verification. אם הפרטים לא מוגדרים, המערכת תציג מצב לא פעיל במקום לשלוח דמה.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Provider
                </p>
                <p className="mt-2 text-sm font-semibold text-stone-950">
                  {snapshot.provider === "official_business" ? "Business Cloud" : "לא פעיל בחיבור הזה"}
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Webhook
                </p>
                <p className="mt-2 text-sm font-semibold text-stone-950">
                  מוגדר דרך משתני סביבה ומסד נתונים
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {actionMessage ? (
          <div className="rounded-[22px] border border-stone-200 bg-stone-50 p-4 text-right text-sm text-stone-700">
            {actionMessage}
          </div>
        ) : null}
      </div>

      <div
        className="rounded-[32px] border border-stone-200 bg-gradient-to-br from-stone-50 via-white to-emerald-50 p-6"
        data-qr-source="worker-image"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.24em] text-stone-500">Live connection</p>
          {snapshot.workerOnline ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-stone-300 bg-white p-6">
          {showQr ? (
            <img
              alt="סריקת WhatsApp QR"
              className="h-64 w-64 rounded-lg border border-stone-200 shadow-md"
              src={snapshot.qrCode ?? undefined}
            />
          ) : snapshot.status === "connected" ? (
            <div className="space-y-2 text-center">
              <p className="text-base font-medium text-stone-800">המכשיר כבר מחובר</p>
              <p className="text-sm text-stone-500">אין צורך לסרוק קוד חדש כרגע.</p>
            </div>
          ) : showLoading ? (
            <div className="space-y-3 text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-stone-500" />
              <p className="text-base font-medium text-stone-800">טוען קוד QR אמיתי...</p>
              <p className="text-sm text-stone-500">ברגע שה-Worker ישלח QR, הוא יופיע כאן.</p>
            </div>
          ) : (
            <div className="space-y-2 text-center">
              <p className="text-base font-medium text-stone-800">ה-Worker לא זמין כרגע</p>
              <p className="text-sm text-stone-500">כשהשירות יחזור, QR חדש יופיע אוטומטית.</p>
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-3">
          <Button
            disabled={isRequesting || !snapshot.workerOnline}
            onClick={() => void refreshConnection()}
            type="button"
            variant="secondary"
          >
            <RefreshCw className="ml-2 h-4 w-4" />
            רענן קוד דרך ה-Worker
          </Button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            onClick={() => {
              void navigator.clipboard?.writeText(clientLink);
              setActionMessage("קישור ללקוח הועתק. כשהעמוד החיצוני יופעל, הוא יציג רק את חלון החיבור.");
            }}
            type="button"
          >
            <Link2 className="h-4 w-4" />
            לינק ללקוח
          </button>
        </div>
      </div>
    </Card>
  );
}
