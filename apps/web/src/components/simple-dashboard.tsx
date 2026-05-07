"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageSquareText, Radio, Trophy } from "lucide-react";
import type {
  Campaign,
  CampaignLiveState,
  ConnectionSnapshot,
  DashboardStats,
  Participant
} from "@lottery/core/domain";
import { Card, CardTitle } from "@lottery/ui";
import { getSocket } from "../lib/socket";

async function fetchLiveState(campaignId: string): Promise<CampaignLiveState | null> {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/live`, { cache: "no-store" });
    return response.ok ? ((await response.json()) as CampaignLiveState) : null;
  } catch {
    return null;
  }
}

async function fetchConnectionSnapshot(connectionId: string): Promise<ConnectionSnapshot | null> {
  try {
    const response = await fetch(`/api/connections/${connectionId}/status`, { cache: "no-store" });
    return response.ok ? ((await response.json()) as ConnectionSnapshot) : null;
  } catch {
    return null;
  }
}

function statusLabel(snapshot: ConnectionSnapshot): string {
  if (!snapshot.workerOnline) {
    return "עדיין לא חובר WhatsApp";
  }

  if (snapshot.status === "connected") {
    return "מחובר לתשתית WhatsApp Official";
  }

  if (snapshot.status === "qr_ready" || snapshot.status === "connecting") {
    return "המספר בהכנה";
  }

  if (snapshot.status === "error") {
    return "דורש בדיקה";
  }

  return "מנותק";
}

function phoneLabel(phone: string | null): string {
  return phone ? (phone.startsWith("+") ? phone : `+${phone}`) : "המספר בהכנה";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

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
  const [, setParticipants] = useState(initialParticipants);
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

  const connectionIsLive =
    connectionSnapshot.workerOnline !== false && connectionSnapshot.status === "connected";
  const latestMessage = stats.latestOutboundMessage;
  const joinPath = useMemo(() => `/join/${campaign.slug}`, [campaign.slug]);

  return (
    <div className="space-y-6 animate-[fadeUp_0.55s_ease-out]" dir="rtl">
      <section className="rounded-[32px] border border-slate-200 bg-white/82 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)] backdrop-blur">
        <p className="text-sm font-black text-emerald-700">דשבורד יומי</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
          {campaign.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          שלוש פעולות בלבד: חיבור, הודעות והגרלה.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <DashboardActionCard
          actionHref="/dashboard/connections"
          actionText="פרטי חיבור"
          dataTour="connection-status"
          icon={<Radio className="h-5 w-5" />}
          title="חיבור"
        >
          <div className="flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                connectionIsLive ? "animate-pulse bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span className="text-sm font-black text-slate-700">{statusLabel(connectionSnapshot)}</span>
          </div>
          <p className="mt-6 text-2xl font-black text-slate-950" dir="ltr">
            {phoneLabel(connectionSnapshot.phoneNumber)}
          </p>
        </DashboardActionCard>

        <DashboardActionCard
          actionHref="/dashboard/messages"
          actionText="עריכת הודעות"
          dataTour="messages-nav"
          icon={<MessageSquareText className="h-5 w-5" />}
          title="הודעות"
        >
          {latestMessage?.body ? (
            <div className="space-y-3">
              <p className="text-xs font-black text-slate-400">הודעה אחרונה שנשלחה</p>
              <p className="line-clamp-3 text-base font-bold leading-7 text-slate-900">
                {latestMessage.body}
              </p>
              <p className="text-xs font-semibold text-slate-400">
                {formatDate(latestMessage.createdAt)}
              </p>
            </div>
          ) : (
            <p className="text-sm leading-7 text-slate-500">עדיין לא נשלחה הודעה.</p>
          )}
        </DashboardActionCard>

        <DashboardActionCard
          actionHref={`/dashboard/raffle/${campaignId}`}
          actionText="דשבורד הגרלה"
          dataTour="analytics-nav"
          icon={<Trophy className="h-5 w-5" />}
          title="הגרלה"
        >
          <p className="text-6xl font-black tracking-tight text-slate-950">
            {stats.totalParticipants}
          </p>
          <p className="mt-2 text-sm font-bold text-slate-500">משתתפים נוכחיים</p>
        </DashboardActionCard>
      </section>

      {stats.totalParticipants === 0 ? (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-6 text-center shadow-[0_14px_55px_rgba(15,23,42,0.04)] backdrop-blur">
          <p className="text-base font-bold text-slate-700">
            עדיין אין משתתפים בקמפיין. הלינק שלך מוכן להפצה.
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-400" dir="ltr">
            {joinPath}
          </p>
        </section>
      ) : null}
    </div>
  );
}

function DashboardActionCard({
  actionHref,
  actionText,
  children,
  dataTour,
  icon,
  title
}: {
  actionHref: string;
  actionText: string;
  children: React.ReactNode;
  dataTour?: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Card className="border-beam-card flex min-h-[290px] flex-col justify-between border-white/70 bg-white/82 shadow-[0_18px_70px_rgba(15,23,42,0.07)] backdrop-blur" data-tour={dataTour}>
      <div>
        <div className="mb-7 flex items-center justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            {icon}
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
        </div>
        <div className="text-sm leading-6 text-slate-600">{children}</div>
      </div>

      <Link
        className="mt-7 inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
        href={actionHref}
      >
        {actionText}
        <ArrowLeft className="mr-2 h-4 w-4" />
      </Link>
    </Card>
  );
}
