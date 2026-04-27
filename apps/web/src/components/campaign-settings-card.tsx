"use client";

import { useEffect, useState, useTransition } from "react";
import type { Campaign, DrawWeightMode } from "@lottery/core/domain";
import { Badge, Button, Card, CardDescription, CardTitle, Input } from "@lottery/ui";

const weightOptions: { value: DrawWeightMode; label: string; description: string }[] = [
  {
    value: "ONE_PER_PARTICIPANT",
    label: "כניסה אחת לכל משתתף",
    description: "מתאים להגלה פשוטה בלי משקל להפניות."
  },
  {
    value: "STORED_TICKETS",
    label: "לפי כרטיסים",
    description: "כל כרטיס שנצבר משפיע על סיכויי הזכייה."
  },
  {
    value: "REFERRALS_HALVED",
    label: "חצי מכמות ההפניות",
    description: "הסיכוי מחושב לפי floor(referrals / 2)."
  }
];

export function CampaignSettingsCard({
  campaign,
  onCampaignUpdated
}: {
  campaign: Campaign;
  onCampaignUpdated: (campaign: Campaign) => void;
}) {
  const [drawDate, setDrawDate] = useState(
    campaign.drawDate ? campaign.drawDate.slice(0, 10) : ""
  );
  const [drawWeightMode, setDrawWeightMode] = useState<DrawWeightMode>(campaign.drawWeightMode);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDrawDate(campaign.drawDate ? campaign.drawDate.slice(0, 10) : "");
    setDrawWeightMode(campaign.drawWeightMode);
  }, [campaign.drawDate, campaign.drawWeightMode]);

  async function saveSettings(): Promise<void> {
    const response = await fetch(`/api/campaigns/${campaign.id}/settings`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        drawDate: drawDate ? new Date(`${drawDate}T18:00:00.000Z`).toISOString() : null,
        drawWeightMode
      })
    });
    const data = (await response.json()) as {
      campaign: Campaign;
      savedAt: string;
    };

    startTransition(() => {
      onCampaignUpdated(data.campaign);
      setSavedMessage(`נשמר ב-${new Date(data.savedAt).toLocaleTimeString("he-IL")}`);
    });
  }

  return (
    <Card className="space-y-5" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-right">
          <CardTitle>מתי ההגרלה?</CardTitle>
          <CardDescription className="mt-2">
            בחרי תאריך ומשקל זכייה. במסלול הפניות אפשר לקבוע אם ההגרלה רצה לפי כרטיסים
            או לפי חצי מכמות ההפניות.
          </CardDescription>
        </div>
        {savedMessage ? <Badge tone="success">{savedMessage}</Badge> : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <label className="space-y-2 text-right text-sm font-medium text-stone-700">
          תאריך ההגרלה
          <Input
            onChange={(event) => setDrawDate(event.target.value)}
            type="date"
            value={drawDate}
          />
        </label>

        <label className="space-y-2 text-right text-sm font-medium text-stone-700">
          איך לבחור זוכה?
          <select
            className="h-11 w-full rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
            onChange={(event) => setDrawWeightMode(event.target.value as DrawWeightMode)}
            value={drawWeightMode}
          >
            {weightOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {weightOptions.map((option) => (
          <div
            key={option.value}
            className={`rounded-[24px] border p-4 text-right ${
              drawWeightMode === option.value
                ? "border-orange-300 bg-orange-50"
                : "border-stone-200 bg-stone-50"
            }`}
          >
            <p className="text-sm font-semibold text-stone-900">{option.label}</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">{option.description}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-start">
        <Button disabled={isPending} onClick={() => void saveSettings()}>
          {isPending ? "שומר..." : "שמור הגדרות הגרלה"}
        </Button>
      </div>
    </Card>
  );
}
