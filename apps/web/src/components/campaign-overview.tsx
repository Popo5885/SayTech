import Link from "next/link";
import type { Campaign } from "@lottery/core";
import { Badge, Card, CardDescription, CardTitle } from "@lottery/ui";

export function CampaignOverview({ campaign }: { campaign: Campaign }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="space-y-6">
        <div className="flex items-center gap-3">
          <CardTitle>איך אנשים מצטרפים?</CardTitle>
          <Badge tone="success">קישור אישי + מילת פתיחה</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <p className="text-xs font-bold text-stone-500">אפשרות 1</p>
            <h3 className="mt-3 text-lg font-semibold text-stone-900">מביאים חברים</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              כל משתתף מקבל קישור אישי. כשהוא משתף אותו, המערכת יודעת מי הביא את מי
              ומעדכנת את הכרטיסים באופן אוטומטי.
            </p>
          </div>
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <p className="text-xs font-bold text-stone-500">אפשרות 2</p>
            <h3 className="mt-3 text-lg font-semibold text-stone-900">הצטרפות פשוטה</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              מי ששולח את מילת הפתיחה מצטרף לתהליך. מילת הפתיחה הנוכחית היא{" "}
              <span className="font-semibold">{campaign.triggerWord}</span>.
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <CardTitle>פקודות שהמשתתף יכול לשלוח</CardTitle>
        <CardDescription>
          אלה המילים שהמשתתף יכול לשלוח ב-WhatsApp כדי לבדוק כמה כרטיסים יש לו.
        </CardDescription>
        <div className="flex flex-wrap gap-2">
          {campaign.statusCommandAliases.map((command) => (
            <Badge key={command} tone="neutral">
              {command}
            </Badge>
          ))}
        </div>
        <div className="rounded-[28px] border border-orange-200 bg-orange-50/70 p-5">
          <p className="text-sm leading-6 text-stone-700">
            עמוד ההצטרפות של ההגרלה:{" "}
            <Link className="font-semibold text-orange-700" href={`/join/${campaign.slug}`}>
              /join/{campaign.slug}
            </Link>
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          href={`/join/${campaign.slug}`}
        >
          פתיחת עמוד ההצטרפות
        </Link>
      </Card>
    </div>
  );
}
