"use client";

import type { DashboardStats, Participant } from "@lottery/core/domain";
import { Badge, Card, CardDescription, CardTitle } from "@lottery/ui";

function formatPhone(phone: string): string {
  return phone.startsWith("+") ? phone : `+${phone}`;
}

export function ParticipantsLiveTable({
  participants,
  stats
}: {
  participants: Participant[];
  stats: DashboardStats;
}) {
  const rows = [...participants].sort((left, right) => {
    if (right.referralsCount !== left.referralsCount) {
      return right.referralsCount - left.referralsCount;
    }

    return left.joinedAt.localeCompare(right.joinedAt);
  });

  return (
    <Card className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-right">
          <CardTitle>מי המשתתפים?</CardTitle>
          <CardDescription className="mt-2">
            טבלה חיה של כל מי שנכנס לבוט, כולל הפניות, כרטיסים, ומי מוביל כרגע.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">{stats.totalParticipants} משתתפים</Badge>
          <Badge tone="warning">{stats.totalMessagesSent} הודעות</Badge>
          <Badge tone="neutral">{stats.totalReferralEvents} הפניות</Badge>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[24px] border border-stone-200">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1.2fr_1.1fr_0.7fr_0.7fr] gap-4 bg-stone-100 px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
            <span>משתתף</span>
            <span>טלפון</span>
            <span>הפניות</span>
            <span>כרטיסים</span>
          </div>
          <div className="divide-y divide-stone-200 bg-white">
            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-stone-500">
                עדיין אין משתתפים פעילים.
              </div>
            ) : (
              rows.map((participant) => (
                <div
                  key={participant.id}
                  className="grid grid-cols-[1.2fr_1.1fr_0.7fr_0.7fr] gap-4 px-4 py-4 text-right text-sm text-stone-700"
                >
                  <div>
                    <p className="font-semibold text-stone-900">{participant.name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {new Date(participant.joinedAt).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                  <span>{formatPhone(participant.phone)}</span>
                  <span>{participant.referralsCount}</span>
                  <span>{participant.tickets}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
