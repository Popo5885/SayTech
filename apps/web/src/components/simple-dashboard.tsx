"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ContactRound,
  Gift,
  Link2,
  MessageCircle,
  MessageSquareText,
  Radio,
  Settings,
  ShieldCheck,
  Trophy,
  UsersRound,
  Zap
} from "lucide-react";
import type {
  Campaign,
  CampaignLiveState,
  ConnectionSnapshot,
  DashboardStats,
  Participant
} from "@lottery/core/domain";
import { Badge, Card, CardDescription, CardTitle } from "@lottery/ui";
import { getSocket } from "../lib/socket";

async function fetchLiveState(campaignId: string): Promise<CampaignLiveState | null> {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/live`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CampaignLiveState;
  } catch {
    return null;
  }
}

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

function statusLabel(snapshot: ConnectionSnapshot): string {
  if (!snapshot.workerOnline) {
    return "שירות החיבור לא פעיל";
  }

  if (snapshot.status === "connected") {
    return "מחובר ופעיל";
  }

  if (snapshot.status === "qr_ready") {
    return "ממתין לסריקת QR";
  }

  if (snapshot.status === "error") {
    return "שגיאת חיבור";
  }

  return "מכין חיבור";
}

function statusTone(snapshot: ConnectionSnapshot) {
  if (!snapshot.workerOnline || snapshot.status === "error" || snapshot.status === "disconnected") {
    return "danger" as const;
  }

  if (snapshot.status === "connected") {
    return "success" as const;
  }

  return "warning" as const;
}

function formatPhone(phone: string | null): string {
  return phone ?? "עדיין לא זוהה מספר";
}

function percent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.max(4, Math.round((value / total) * 100));
}

const navCards = [
  {
    href: "/dashboard/messages",
    title: "עורך Magic Flow",
    description: "עריכת הודעות, משתנים, מדיה ותפריטים",
    icon: MessageSquareText,
    tone: "bg-amber-100 text-amber-700"
  },
  {
    href: "/dashboard/analytics",
    title: "טבלת מובילים",
    description: "דירוג חי לפי הפניות וכרטיסים",
    icon: Trophy,
    tone: "bg-blue-100 text-blue-700"
  },
  {
    href: "/dashboard/contacts",
    title: "אנשי קשר",
    description: "Google Contacts ויצוא vCard",
    icon: ContactRound,
    tone: "bg-emerald-100 text-emerald-700"
  },
  {
    href: "/dashboard/analytics",
    title: "ביצוע הגרלה",
    description: "בחירה משוקללת עם Audit",
    icon: Gift,
    tone: "bg-violet-100 text-violet-700"
  },
  {
    href: "/dashboard/connections",
    title: "הגדרות חיבור",
    description: "QR, Pairing Code ו-Cloud API",
    icon: Settings,
    tone: "bg-slate-100 text-slate-700"
  },
  {
    href: "/dashboard/campaigns",
    title: "אישורי מנהל",
    description: "לקוחות, צוותים ומגבלות קמפיין",
    icon: ShieldCheck,
    tone: "bg-rose-100 text-rose-700"
  }
] as const;

export function SimpleDashboard({
  campaignId,
  initialCampaign,
  initialConnectionSnapshot,
  initialParticipants,
  initialStats
}: {
  campaignId: string;
  initialCampaign: Campaign;
  initialConnectionSnapshot: ConnectionSnapshot;
  initialParticipants: Participant[];
  initialStats: DashboardStats;
}) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [participants, setParticipants] = useState(initialParticipants);
  const [stats, setStats] = useState(initialStats);
  const [connectionSnapshot, setConnectionSnapshot] = useState(initialConnectionSnapshot);

  useEffect(() => {
    const timer = setInterval(() => {
      void fetchLiveState(campaignId).then((nextState) => {
        if (nextState) {
          startTransition(() => {
            setCampaign(nextState.campaign);
            setParticipants(nextState.participants);
            setStats(nextState.stats);
          });
        }
      });

      void fetchConnectionSnapshot(initialConnectionSnapshot.connectionId).then((nextSnapshot) => {
        if (nextSnapshot) {
          startTransition(() => setConnectionSnapshot(nextSnapshot));
        }
      });
    }, 6000);

    const socket = getSocket();

    if (socket) {
      socket.connect();

      const onSnapshot = (payload: ConnectionSnapshot) => {
        if (payload.connectionId === initialConnectionSnapshot.connectionId) {
          startTransition(() =>
            setConnectionSnapshot((current) => ({
              ...payload,
              workerOnline: payload.workerOnline ?? current.workerOnline ?? true
            }))
          );
        }
      };

      const onLiveState = (payload: CampaignLiveState) => {
        if (payload.campaign.id === campaignId) {
          startTransition(() => {
            setCampaign(payload.campaign);
            setParticipants(payload.participants);
            setStats(payload.stats);
          });
        }
      };

      socket.on("connection:snapshot", onSnapshot);
      socket.on("campaign:live_state", onLiveState);

      return () => {
        socket.off("connection:snapshot", onSnapshot);
        socket.off("campaign:live_state", onLiveState);
        clearInterval(timer);
      };
    }

    return () => clearInterval(timer);
  }, [campaignId, initialConnectionSnapshot.connectionId]);

  const registeredParticipants = useMemo(
    () => participants.filter((participant) => participant.onboardingState === "REGISTERED"),
    [participants]
  );
  const pendingParticipants = Math.max(participants.length - registeredParticipants.length, 0);
  const maxTickets = Math.max(...stats.leaderboard.map((entry) => entry.tickets), 0);
  const connectionIsLive =
    connectionSnapshot.workerOnline !== false && connectionSnapshot.status === "connected";

  return (
    <div className="space-y-6" dir="rtl">
      <section className="overflow-hidden rounded-[34px] bg-gradient-to-l from-emerald-500 to-teal-500 p-5 text-white shadow-[0_24px_70px_rgba(16,185,129,0.22)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span
                className={`h-3 w-3 rounded-full ${
                  connectionIsLive ? "animate-pulse bg-white" : "bg-white/50"
                }`}
              />
              {statusLabel(connectionSnapshot)}
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight">{campaign.name}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
              זהו חלון העבודה הראשי. כל מספר שמופיע כאן מגיע ממסד הנתונים או מה-Worker בזמן אמת.
            </p>
          </div>
          <Badge tone={statusTone(connectionSnapshot)}>{statusLabel(connectionSnapshot)}</Badge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            { label: "מספר מחובר", value: formatPhone(connectionSnapshot.phoneNumber), icon: Radio },
            { label: "הודעות שנשלחו", value: String(stats.totalMessagesSent), icon: MessageCircle },
            { label: "רשומים פעילים", value: String(stats.totalParticipants), icon: UsersRound },
            { label: "הפניות מאושרות", value: String(stats.totalReferralEvents), icon: Link2 }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-3xl bg-white/18 p-4 ring-1 ring-white/20 backdrop-blur">
                <Icon className="h-5 w-5 text-white" />
                <p className="mt-3 text-xs font-semibold text-emerald-50">{item.label}</p>
                <p className="mt-1 truncate text-2xl font-black">{item.value}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden">
          <span className="absolute left-5 top-5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          <p className="text-sm font-bold text-slate-500">רשומים פעילים</p>
          <CardTitle className="mt-4 text-5xl">{stats.totalParticipants}</CardTitle>
          <CardDescription className="mt-3">
            מחושב רק ממשתתפים שסיימו הרשמה בפועל.
          </CardDescription>
        </Card>
        <Card className="relative overflow-hidden">
          <span className="absolute left-5 top-5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          <p className="text-sm font-bold text-slate-500">הפניות שאושרו</p>
          <CardTitle className="mt-4 text-5xl">{stats.totalReferralEvents}</CardTitle>
          <CardDescription className="mt-3">
            נספר מתוך משתתפים רשומים והפניות שנקלטו במסד הנתונים.
          </CardDescription>
        </Card>
        <Card className="relative overflow-hidden">
          <span className="absolute left-5 top-5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
          <p className="text-sm font-bold text-slate-500">הודעות שנשלחו</p>
          <CardTitle className="mt-4 text-5xl">{stats.totalMessagesSent}</CardTitle>
          <CardDescription className="mt-3">
            הנתון מגיע מפעולות השליחה של הבוט, לא מטקסט קבוע.
          </CardDescription>
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-950">ניווט מהיר</h3>
          <span className="text-sm font-semibold text-slate-500">{pendingParticipants} ממתינים בתהליך</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {navCards.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                className="group rounded-[28px] border border-slate-200 bg-white p-5 text-right shadow-[0_12px_38px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_55px_rgba(15,23,42,0.09)]"
                href={item.href}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-lg font-black text-slate-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
                  פתיחה
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>טבלת מובילים חיה</CardTitle>
              <CardDescription className="mt-2">
                Top 10 אנונימי לפי כרטיסים והפניות אמיתיות.
              </CardDescription>
            </div>
            <BarChart3 className="h-6 w-6 text-blue-500" />
          </div>

          <div className="space-y-3">
            {stats.leaderboard.slice(0, 10).length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                עדיין אין משתתפים רשומים.
              </div>
            ) : (
              stats.leaderboard.slice(0, 10).map((entry) => (
                <div
                  key={entry.participantId}
                  className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[56px_1fr_auto]"
                >
                  <span className="font-black text-slate-400">#{entry.rank}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">{entry.anonymizedName}</p>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        קישור פעיל
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-blue-500 to-cyan-400"
                        style={{ width: `${percent(entry.tickets, maxTickets)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-600">
                    {entry.tickets} כרטיסים · {entry.referralsCount} הפניות
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-5 border-violet-200 bg-[linear-gradient(180deg,#ffffff,#faf7ff)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>כספת ההגרלה</CardTitle>
              <CardDescription className="mt-2">
                ההגרלה מתבצעת במסך הנתונים, בשקלול לפי כרטיסים, ונרשמת כרשומת Audit.
              </CardDescription>
            </div>
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
              <Zap className="h-6 w-6" />
            </div>
          </div>

          <div className="rounded-[28px] border border-violet-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-500">
              זוכה אחרון
            </p>
            {stats.latestWinner ? (
              <div className="mt-3 space-y-1">
                <p className="text-xl font-black text-slate-950">{stats.latestWinner.participantName}</p>
                <p className="text-sm text-slate-500">{stats.latestWinner.participantPhone}</p>
                <p className="text-sm text-slate-500">
                  {new Date(stats.latestWinner.createdAt).toLocaleString("he-IL")}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                עדיין לא בוצעה הגרלה אמיתית בקמפיין הזה.
              </p>
            )}
          </div>

          <Link
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700"
            href="/dashboard/analytics"
          >
            למסך ההגרלה וה-Audit
          </Link>
        </Card>
      </section>
    </div>
  );
}
