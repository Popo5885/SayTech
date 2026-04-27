import Link from "next/link";
import type { Campaign } from "@lottery/core";
import { Badge, Card, CardDescription, CardTitle } from "@lottery/ui";

export function CampaignOverview({ campaign }: { campaign: Campaign }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="space-y-6">
        <div className="flex items-center gap-3">
          <CardTitle>Campaign Modes</CardTitle>
          <Badge tone="success">Referral + Trigger Join</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Mode A</p>
            <h3 className="mt-3 text-lg font-semibold text-stone-900">Bring a Friend</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Each participant gets a unique link and can ask the bot for their own stats, tickets,
              and current top-10 summary directly from WhatsApp.
            </p>
          </div>
          <div className="rounded-[28px] border border-stone-200 bg-stone-50 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Mode B</p>
            <h3 className="mt-3 text-lg font-semibold text-stone-900">Simple Join</h3>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Anyone who sends the trigger word joins instantly. The current default trigger is{" "}
              <span className="font-semibold">{campaign.triggerWord}</span>.
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-5">
        <CardTitle>Participant Self-Service</CardTitle>
        <CardDescription>
          Supported status commands are configurable per campaign. Right now the active aliases are:
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
            Public landing page:{" "}
            <Link className="font-semibold text-orange-700" href={`/join/${campaign.slug}`}>
              /join/{campaign.slug}
            </Link>
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
          href={`/join/${campaign.slug}`}
        >
          Open Public Campaign Page
        </Link>
      </Card>
    </div>
  );
}
