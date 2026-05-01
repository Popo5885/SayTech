import { notFound } from "next/navigation";
import { renderTemplate } from "@lottery/core/templates";
import { Badge, Card, CardDescription, CardTitle } from "@lottery/ui";
import { getPublicCampaign } from "../../../lib/live-store";

export const dynamic = "force-dynamic";

function buildWhatsAppLink(
  whatsappPhone: string | null,
  campaignName: string,
  referralToken: string | undefined,
  joinPrefillTemplate: string | null
): string | null {
  if (!whatsappPhone) {
    return null;
  }

  const phone = whatsappPhone.replace(/[^\d]/g, "");

  if (!phone) {
    return null;
  }

  const defaultBody = referralToken
    ? "היי, אשמח להצטרף ל{{campaign_name}}. הגעתי דרך {{ref}}."
    : "היי, אשמח להצטרף ל{{campaign_name}}.";

  let body = renderTemplate(joinPrefillTemplate?.trim() || defaultBody, {
    name: "",
    tickets: 0,
    link: "",
    referrals: 0,
    rank: 0,
    top10: "",
    contact_phone: whatsappPhone,
    campaign_name: campaignName,
    ref: referralToken ?? "",
    email: "",
    group_invite_link: ""
  }).trim();

  if (referralToken && !body.includes(referralToken)) {
    body = `${body} ref=${referralToken}`.trim();
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
}

export default async function PublicCampaignPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;

  try {
    const data = await getPublicCampaign(slug);
    const joinPrefillTemplate =
      data.campaign.templates.find((template) => template.key === "JOIN_WHATSAPP_PROMPT")?.value ??
      null;
    const whatsappLink = buildWhatsAppLink(
      data.whatsappPhone,
      data.campaign.name,
      ref,
      joinPrefillTemplate
    );

    return (
      <main
        className="min-h-screen bg-[linear-gradient(180deg,_#fff9ef_0%,_#fff_55%,_#f8fafc_100%)] px-4 py-10"
        dir="rtl"
      >
        <div className="mx-auto max-w-5xl space-y-6">
          <Card className="overflow-hidden border-orange-200 bg-gradient-to-br from-white via-orange-50 to-amber-50">
            <Badge tone="warning">עמוד הצטרפות</Badge>
            <CardTitle className="mt-4 text-4xl">{data.campaign.name}</CardTitle>
            <CardDescription className="mt-4 max-w-2xl text-base leading-7">
              מצטרפים להגרלה דרך WhatsApp. המערכת תשמור את ההצטרפות ותיצור קישור אישי לשיתוף.
            </CardDescription>
            {ref ? (
              <div className="mt-5 rounded-2xl border border-orange-200 bg-white/80 px-4 py-3 text-sm text-stone-700">
                קוד ההפניה שלך: <span className="font-semibold">{ref}</span>
              </div>
            ) : null}
            {whatsappLink ? (
              <a
                className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)]"
                href={whatsappLink}
                rel="noreferrer"
                target="_blank"
              >
                להצטרפות דרך WhatsApp
              </a>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white/80 px-4 py-3 text-sm text-stone-600">
                עדיין לא חובר WhatsApp להגרלה הזו.
              </div>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr]">
            <Card className="space-y-3">
              <p className="text-xs font-semibold text-stone-500">משתתפים</p>
              <p className="text-5xl font-semibold text-stone-950">{data.totalParticipants}</p>
              <p className="text-sm leading-6 text-stone-600">
                מוצגים רק משתתפים שנשמרו באמת במערכת. מספרי טלפון נשארים פרטיים.
              </p>
            </Card>

            <Card className="space-y-4">
              <CardTitle>המובילים כרגע</CardTitle>
              {data.leaderboard.length > 0 ? (
                data.leaderboard.map((entry) => (
                  <div
                    key={entry.participantId}
                    className="grid grid-cols-[54px_1fr_auto] items-center gap-4 rounded-3xl border border-stone-200 bg-stone-50 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-stone-500">#{entry.rank}</span>
                    <span className="text-sm font-medium text-stone-900">{entry.anonymizedName}</span>
                    <span className="text-sm text-stone-600">{entry.referralsCount} הפניות</span>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
                  עדיין אין משתתפים
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
