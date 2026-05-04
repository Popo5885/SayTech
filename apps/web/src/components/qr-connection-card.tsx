"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  Link2,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi
} from "lucide-react";
import { Badge, Button, Card, CardTitle, Input, cn } from "@lottery/ui";
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
    return "עדיין לא חובר WhatsApp";
  }

  if (snapshot.status === "connected") {
    return "מחובר ופעיל";
  }

  if (snapshot.status === "qr_ready") {
    return "קוד QR מוכן";
  }

  if (snapshot.status === "connecting") {
    return "מתחבר";
  }

  if (snapshot.status === "error") {
    return "צריך לבדוק חיבור";
  }

  return "ממתין לחיבור";
}

function phoneLabel(phone: string | null): string {
  if (!phone) {
    return "עדיין אין מספר מחובר";
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

  const pollInterval =
    snapshot.workerOnline && snapshot.status !== "connected" ? 2000 : 5000;

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
    }, pollInterval);


    const socket = getSocket();

    if (socket) {
      socket.connect();

      const handler = (payload: ConnectionSnapshot) => {
        if (payload.connectionId === snapshot.connectionId) {
          startTransition(() =>
            setSnapshot((current) => ({
              ...current,
              ...payload,
              workerOnline: payload.workerOnline ?? current.workerOnline ?? true
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.connectionId, pollInterval]);

  const validQr = Boolean(snapshot.qrCode?.startsWith("data:"));
  const showQr = Boolean(snapshot.workerOnline && validQr);
  const showLoading =
    Boolean(snapshot.workerOnline) && snapshot.status !== "connected" && !validQr;
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
        throw new Error(data.error ?? "לא התקבל קוד התאמה משירות החיבור.");
      }

      setPairingCode(data.pairingCode);
      setActionMessage("קוד התאמה הופק. פתחו WhatsApp והזינו את הקוד במסך חיבור מכשירים.");
    } catch (error) {
      setActionMessage(
        error instanceof Error
          ? error.message
          : "לא הצלחנו לבקש קוד התאמה. בדקו שהחיבור פעיל."
      );
    } finally {
      setIsRequesting(false);
    }
  }

  async function refreshConnection(): Promise<void> {
    setIsRequesting(true);
    setActionMessage(null);

    try {
      const nextSnapshot = await fetchConnectionSnapshot(snapshot.connectionId);

      if (!nextSnapshot) {
        throw new Error("לא הצלחנו לקרוא את סטטוס החיבור. בדוק שהשרת וה-Worker פעילים.");
      }

      startTransition(() => setSnapshot(nextSnapshot));
      setActionMessage("סטטוס החיבור נבדק מחדש. אם ה-Worker פעיל ומפיק QR, הוא יופיע כאן אוטומטית.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "לא הצלחנו לרענן את סטטוס החיבור.");
    } finally {
      setIsRequesting(false);
    }
  }

  function copyClientLink(): void {
    void navigator.clipboard?.writeText(clientLink);
    setActionMessage("קישור ללקוח הועתק.");
  }

  return (
    <Card className="grid gap-8 overflow-hidden lg:grid-cols-[1.05fr_380px]" dir="rtl">
      <div className="space-y-5 p-1">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>חיבור</CardTitle>
          <Badge tone={toneForSnapshot(snapshot)}>{statusLabel(snapshot)}</Badge>
          <Badge tone="neutral">
            {snapshot.provider === "official_business" ? "חיבור רשמי" : "QR או קוד התאמה"}
          </Badge>
        </div>

        <p className="max-w-2xl text-base leading-7 text-stone-600">
          כאן מחברים את מספר ה-WhatsApp שממנו הבוט ישלח ויקבל הודעות. הקוד מוצג רק כשהמערכת מקבלת אותו בצורה אמיתית.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { id: "qr" as const, label: "סריקת QR", icon: QrCode },
            { id: "pairing" as const, label: "קוד התאמה", icon: Smartphone },
            { id: "official" as const, label: "WhatsApp רשמי", icon: ShieldCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                className={cn(
                  "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                )}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 rounded-[28px] border border-stone-200 bg-stone-50 p-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold text-stone-500">סטטוס</p>
            <p className="mt-1 text-sm font-semibold text-stone-950">{statusLabel(snapshot)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500">מספר מחובר</p>
            <p className="mt-1 text-sm font-semibold text-stone-950" dir="ltr">
              {phoneLabel(snapshot.phoneNumber)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-500">שירות החיבור</p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-stone-950">
              <Wifi className="h-4 w-4 text-emerald-600" />
              {snapshot.workerOnline ? "זמין" : "לא זמין כרגע"}
            </p>
          </div>
        </div>

        {activeTab === "pairing" ? (
          <div className="space-y-4 rounded-[28px] border border-stone-200 bg-white p-5">
            <div>
              <p className="text-sm font-semibold text-stone-950">קוד התאמה</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">
                מתאים במיוחד כשפותחים את המערכת מהטלפון ולא ניתן לסרוק QR מהמסך.
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
                  חיבור רשמי לעסקים. כשפרטי Meta מוגדרים, המערכת תעבוד דרך Cloud API במקום סריקת QR.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white/80 p-4 text-sm text-stone-700">
              אם החיבור הרשמי לא מוגדר עדיין, המסך יציג מצב לא פעיל ולא ידמה חיבור.
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
          <p className="text-xs font-semibold text-stone-500">קוד חיבור</p>
          {snapshot.workerOnline ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              פעיל
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-stone-300 bg-white p-6">
          {showQr ? (
            <img
              alt="סריקת WhatsApp QR"
              className="h-64 w-64 rounded-lg border border-stone-200 shadow-md"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                startTransition(() =>
                  setSnapshot((s) => ({ ...s, qrCode: null }))
                );
              }}
              src={snapshot.qrCode ?? undefined}
            />
          ) : snapshot.status === "connected" ? (
            <div className="space-y-2 text-center">
              <p className="text-base font-medium text-stone-800">המכשיר מחובר</p>
              <p className="text-sm text-stone-500">אין צורך לסרוק קוד חדש כרגע.</p>
            </div>
          ) : showLoading ? (
            <div className="space-y-3 text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-stone-500" />
              <p className="text-base font-medium text-stone-800">טוען קוד QR אמיתי...</p>
              <p className="text-sm text-stone-500">ברגע שהמערכת תקבל קוד, הוא יופיע כאן.</p>
            </div>
          ) : (
            <div className="space-y-2 text-center">
              <p className="text-base font-medium text-stone-800">עדיין לא חובר WhatsApp</p>
              <p className="text-sm text-stone-500">פנו לצוות Magic Flow להפעלה או להקצאת מספר.</p>
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
            בדוק שוב
          </Button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            onClick={copyClientLink}
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
