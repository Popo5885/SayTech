"use client";

import { useMemo, useState } from "react";
import { Clock3, DatabaseZap, LockKeyhole, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import type { DashboardStats, WinnerDraw } from "@lottery/core";
import { Badge, Button, Card, CardDescription, CardTitle } from "@lottery/ui";

function maskPhone(phone: string): string {
  const normalized = phone.startsWith("+") ? phone : `+${phone}`;

  if (normalized.length <= 8) {
    return normalized;
  }

  return `${normalized.slice(0, 7)}****${normalized.slice(-2)}`;
}

function progress(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(5, Math.round((value / max) * 100));
}

export function AnalyticsPanel({
  campaignId,
  initialStats
}: {
  campaignId: string;
  initialStats: DashboardStats;
}) {
  const [stats, setStats] = useState(initialStats);
  const [latestWinner, setLatestWinner] = useState<WinnerDraw | null>(initialStats.latestWinner);
  const [winnerMessage, setWinnerMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const maxTickets = useMemo(
    () => Math.max(...stats.leaderboard.map((entry) => entry.tickets), 0),
    [stats.leaderboard]
  );

  async function drawWinner(): Promise<void> {
    setBusy(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/draw-winner`, {
        method: "POST"
      });
      const data = (await response.json()) as {
        stats: DashboardStats;
        winner: WinnerDraw | null;
        winnerMessage: string | null;
      };

      setStats(data.stats);
      setLatestWinner(data.winner);
      setWinnerMessage(data.winnerMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "רשומים פעילים",
            value: stats.totalParticipants,
            caption: "מחושב ממשתתפים שסיימו הרשמה בלבד.",
            icon: UsersRound
          },
          {
            label: "הפניות שאושרו",
            value: stats.totalReferralEvents,
            caption: "נספר מתוך קשרי הפניה שנשמרו במסד הנתונים.",
            icon: DatabaseZap
          },
          {
            label: "הודעות שנשלחו",
            value: stats.totalMessagesSent,
            caption: "נתון שמגיע מפעולות השליחה של הבוט.",
            icon: ShieldCheck
          }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="relative overflow-hidden">
              <span className="absolute left-5 top-5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              <Icon className="h-6 w-6 text-emerald-600" />
              <p className="mt-4 text-sm font-bold text-slate-500">{item.label}</p>
              <CardTitle className="mt-2 text-5xl">{item.value}</CardTitle>
              <CardDescription className="mt-3">{item.caption}</CardDescription>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-right">
              <CardTitle>טבלת מובילים בזמן אמת</CardTitle>
              <CardDescription className="mt-2">
                עשרת המשתתפים המובילים לפי כרטיסים והפניות שנשמרו במערכת.
              </CardDescription>
            </div>
            <Badge tone="warning">עשרת המובילים</Badge>
          </div>

          <div className="space-y-3">
            {stats.leaderboard.slice(0, 10).length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                עדיין אין משתתפים רשומים להצגה.
              </div>
            ) : (
              stats.leaderboard.slice(0, 10).map((entry) => (
                <div
                  key={entry.participantId}
                  className="rounded-[28px] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid items-center gap-3 md:grid-cols-[64px_1fr_auto]">
                    <div className="text-sm font-black text-slate-400">#{entry.rank}</div>
                    <div className="text-right">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-slate-950">{entry.anonymizedName}</p>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          קישור פעיל
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-blue-500 to-cyan-400"
                          style={{ width: `${progress(entry.tickets, maxTickets)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-600">
                      {entry.tickets} כרטיסים · {entry.referralsCount} הפניות
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-5 border-violet-200 bg-[linear-gradient(180deg,#ffffff,#fbf8ff)]">
          <div className="flex items-start justify-between gap-4">
            <div className="text-right">
              <CardTitle>מנוע הגרלה מאובטח</CardTitle>
              <CardDescription className="mt-2">
                המנוע בוחר זוכה בשיטת שקלול לפי כרטיסים, ובכל לחיצה נוצרת רשומת Audit במסד הנתונים.
              </CardDescription>
            </div>
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">
              <LockKeyhole className="h-7 w-7" />
            </div>
          </div>

          <div className="rounded-[28px] border border-violet-200 bg-white p-5 text-sm leading-7 text-slate-600">
            <p className="font-bold text-slate-950">שקיפות האלגוריתם</p>
            <p className="mt-2">
              כל כרטיס הוא משקל בהגרלה. משתתף עם יותר כרטיסים מקבל סיכוי גבוה יותר, אך
              הזכייה נרשמת כפעולה רשמית עם חותמת זמן.
            </p>
          </div>

          <Button className="w-full" disabled={busy} onClick={() => void drawWinner()}>
            {busy ? "מבצע הגרלה..." : "בצע הגרלה עכשיו"}
          </Button>

          {latestWinner ? (
            <div className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-5 text-right">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">
                  זוכה אחרון
                </p>
                <Trophy className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xl font-black text-slate-950">{latestWinner.participantName}</p>
              <p className="mt-1 text-sm text-slate-600">{maskPhone(latestWinner.participantPhone)}</p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500">
                <Clock3 className="h-4 w-4" />
                {new Date(latestWinner.createdAt).toLocaleString("he-IL")}
              </p>
              {winnerMessage ? (
                <div className="mt-4 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-800">
                  {winnerMessage}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              עדיין לא הוגרל זוכה. ברגע שתפעיל הגרלה אמיתית, התוצאה תופיע כאן.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
