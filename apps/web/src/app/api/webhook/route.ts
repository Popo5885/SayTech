import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  CampaignRepository,
  ParticipantRepository,
  decryptSecret,
  renderTemplate,
  type Campaign,
  type CampaignMessageTemplate,
  type MessageTemplateKey,
  type Participant
} from "@lottery/core";
import { prisma } from "@lottery/db";
import { saveContactBotEntry } from "../../../lib/contact-bot";
import { clientIp, rateLimit, rateLimitResponse } from "../../../lib/rate-limit";

export const runtime = "nodejs";

const db = prisma as any;
const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
const campaignRepository = new CampaignRepository(baseUrl);
const participantRepository = new ParticipantRepository(baseUrl);
const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

type ContactCardPayload = {
  displayName: string;
  phone: string;
  organization?: string | null;
};

function verifyToken(): string {
  return process.env.WHATSAPP_VERIFY_TOKEN ?? process.env.META_WHATSAPP_VERIFY_TOKEN ?? "";
}

function appSecret(): string {
  return process.env.WHATSAPP_APP_SECRET ?? process.env.META_APP_SECRET ?? "";
}

function isValidSignature(request: Request, rawBody: string): boolean {
  const secret = appSecret();

  if (!secret) {
    // SECURITY: refuse unsigned webhooks in production. In dev/test allow only
    // when explicitly opted in via WHATSAPP_ALLOW_UNSIGNED=1.
    if (process.env.NODE_ENV === "production") {
      console.error("[webhook] Rejecting request: WHATSAPP_APP_SECRET is not configured.");
      return false;
    }
    return process.env.WHATSAPP_ALLOW_UNSIGNED === "1";
  }

  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    signatureBuffer.length === expectedBuffer.length &&
    timingSafeEqual(signatureBuffer, expectedBuffer)
  );
}

function accessToken(connection: any): string | null {
  if (connection?.officialAccessTokenEncrypted) {
    return decryptSecret(connection.officialAccessTokenEncrypted);
  }

  return process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.META_WHATSAPP_ACCESS_TOKEN ?? null;
}

function graphVersion(): string {
  return process.env.META_GRAPH_API_VERSION ?? "v20.0";
}

function messageText(message: any): string {
  return (
    message?.text?.body ??
    message?.button?.text ??
    message?.interactive?.button_reply?.title ??
    message?.interactive?.list_reply?.title ??
    ""
  );
}

function normalizeContactPhone(phone: string): string {
  const compact = phone.replace(/[^\d+]/g, "");

  if (!compact) {
    return "";
  }

  if (compact.startsWith("+")) {
    return compact;
  }

  if (compact.startsWith("972")) {
    return `+${compact}`;
  }

  if (compact.startsWith("0")) {
    return `+972${compact.slice(1)}`;
  }

  return `+${compact}`;
}

function escapeVcard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildVcf(cards: ContactCardPayload[]): string {
  return `${cards
    .map((card) =>
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escapeVcard(card.displayName)}`,
        card.organization ? `ORG:${escapeVcard(card.organization)}` : null,
        `TEL;TYPE=CELL:${normalizeContactPhone(card.phone)}`,
        "END:VCARD"
      ]
        .filter(Boolean)
        .join("\r\n")
    )
    .join("\r\n")}\r\n`;
}

function interactiveReplyId(message: any): string | null {
  return message?.interactive?.button_reply?.id ?? message?.interactive?.list_reply?.id ?? null;
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const SKIP_EMAIL_MATCHERS = ["דלג", "לדלג", "skip", "אין מייל", "אין"];

function template(campaign: Campaign, key: MessageTemplateKey): CampaignMessageTemplate | null {
  return campaign.templates.find((item) => item.key === key && item.isEnabled !== false) ?? null;
}

function render(campaign: Campaign, participant: Participant, key: MessageTemplateKey): string | null {
  const selected = template(campaign, key);

  if (!selected) {
    return null;
  }

  return renderTemplate(selected.value, {
    name: participant.name,
    tickets: participant.tickets,
    link: participant.referralLink,
    referrals: participant.referralsCount,
    rank: 0,
    top10: "",
    contact_phone: participant.phone,
    campaign_name: campaign.name,
    ref: participant.referralToken,
    email: participant.email ?? "",
    group_invite_link: campaign.groupInviteLink ?? ""
  });
}

async function sendCloudText(connection: any, to: string, body: string): Promise<void> {
  const token = accessToken(connection);
  const phoneNumberId =
    connection?.officialPhoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;

  if (!token || !phoneNumberId || !body) {
    return;
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/[^\d]/g, ""),
      type: "text",
      text: {
        preview_url: true,
        body
      }
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Cloud API response failed: ${payload.slice(0, 500)}`);
  }
}

async function getWorkspaceContactCards(workspaceId: string): Promise<ContactCardPayload[]> {
  const cards = await db.workspaceContactCard.findMany({
    where: {
      workspaceId,
      isEnabled: true
    },
    orderBy: [
      {
        sortOrder: "asc"
      },
      {
        createdAt: "asc"
      }
    ]
  });

  return cards.map((card: any) => ({
    displayName: card.displayName,
    phone: card.phone,
    organization: card.organization ?? null
  }));
}

async function uploadCloudVcf(
  connection: any,
  cards: ContactCardPayload[]
): Promise<{ id: string; filename: string } | null> {
  const token = accessToken(connection);
  const phoneNumberId =
    connection?.officialPhoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;

  if (!token || !phoneNumberId) {
    return null;
  }

  const filename = `magic-flow-contacts-${Date.now()}.vcf`;
  const formData = new FormData();
  formData.set("messaging_product", "whatsapp");
  formData.set("file", new Blob([buildVcf(cards)], { type: "text/vcard" }), filename);

  const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;

  if (!response.ok || !payload?.id) {
    console.error("[webhook:vcf-upload-failed]", payload);
    return null;
  }

  return { id: payload.id, filename };
}

async function sendCloudContactCards(connection: any, to: string, workspaceId: string): Promise<boolean> {
  const token = accessToken(connection);
  const phoneNumberId =
    connection?.officialPhoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID ?? null;
  const cards = await getWorkspaceContactCards(workspaceId);

  if (!token || !phoneNumberId || cards.length === 0) {
    return false;
  }

  const shouldSendVcf = cards.length > 2;
  const document = shouldSendVcf ? await uploadCloudVcf(connection, cards) : null;
  const body = shouldSendVcf
    ? document
      ? {
          messaging_product: "whatsapp",
          to: to.replace(/[^\d]/g, ""),
          type: "document",
          document: {
            ...document,
            caption: "מצורף קובץ אנשי קשר לשמירה מהירה בטלפון."
          }
        }
      : null
    : {
        messaging_product: "whatsapp",
        to: to.replace(/[^\d]/g, ""),
        type: "contacts",
        contacts: cards.map((card) => ({
          name: {
            formatted_name: card.displayName,
            first_name: card.displayName
          },
          org: card.organization
            ? {
                company: card.organization
              }
            : undefined,
          phones: [
            {
              phone: normalizeContactPhone(card.phone),
              type: "CELL"
            }
          ]
        }))
      };

  if (!body) {
    return false;
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Cloud API contact send failed: ${payload.slice(0, 500)}`);
  }

  return true;
}

async function processMessage(connection: any, rawMessage: any): Promise<void> {
  const body = messageText(rawMessage);
  const from = rawMessage.from ? `+${String(rawMessage.from).replace(/[^\d]/g, "")}` : "";

  if (!from) {
    return;
  }

  const campaign = await campaignRepository.findActiveByConnectionAndMessage(connection.id, body);

  if (!campaign) {
    return;
  }

  await db.messageLog.create({
    data: {
      workspaceId: campaign.workspaceId,
      campaignId: campaign.id,
      connectionId: connection.id,
      direction: "INBOUND",
      status: "received",
      providerMessageId: rawMessage.id ?? null,
      body
    }
  });

  const { participant, isNew } = await participantRepository.createIfMissing({
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
    phone: from,
    chatAddress: rawMessage.from ?? from,
    name: null
  });

  const outbound: string[] = [];
  let shouldSendContactCard = false;
  let current = participant;
  const replyId = interactiveReplyId(rawMessage);
  const normalizedBody = body.trim().toLowerCase();

  if (isNew) {
    const welcome = render(campaign, current, "WELCOME");
    if (welcome) outbound.push(welcome);
  } else if (current.onboardingState === "AWAITING_NAME" && body.trim()) {
    current = await participantRepository.captureName(current.id, body);

    // If the campaign collects emails and the template is enabled, ask for it.
    const emailTemplateEnabled = campaign.templates.some(
      (t: CampaignMessageTemplate) => t.key === "EMAIL_PROMPT" && t.isEnabled !== false
    );

    if ((campaign as any).collectEmail && emailTemplateEnabled) {
      current = await participantRepository.markAwaitingEmail(current.id);
      const emailPrompt = render(campaign, current, "EMAIL_PROMPT");
      if (emailPrompt) outbound.push(emailPrompt);
    } else {
      current = await participantRepository.markAwaitingContactSave(current.id);
      const prompt = render(campaign, current, "SAVE_CONTACT_PROMPT");
      if (prompt) outbound.push(prompt);
      shouldSendContactCard = Boolean(prompt);
    }
  } else if (current.onboardingState === "AWAITING_EMAIL") {
    const isSkip =
      replyId === "skip_email" || SKIP_EMAIL_MATCHERS.some((m) => normalizedBody === m);

    if (isSkip) {
      // User chose to skip email — proceed to contact-save step.
      current = await participantRepository.markAwaitingContactSave(current.id);
      const prompt = render(campaign, current, "SAVE_CONTACT_PROMPT");
      if (prompt) outbound.push(prompt);
      shouldSendContactCard = Boolean(prompt);
    } else if (looksLikeEmail(body)) {
      current = await participantRepository.captureEmail(current.id, body);
      current = await participantRepository.markAwaitingContactSave(current.id);
      const prompt = render(campaign, current, "SAVE_CONTACT_PROMPT");
      if (prompt) outbound.push(prompt);
      shouldSendContactCard = Boolean(prompt);
    } else {
      // Invalid input — re-send the email prompt.
      const emailPrompt = render(campaign, current, "EMAIL_PROMPT");
      if (emailPrompt) outbound.push(emailPrompt);
    }
  } else if (
    current.onboardingState === "AWAITING_CONTACT_SAVED" &&
    (replyId === "saved_contact_yes" || ["saved", "yes", "כן", "שמרתי"].includes(normalizedBody))
  ) {
    const registration = await participantRepository.completeRegistration({
      campaignId: campaign.id,
      participantId: current.id
    });
    current = registration.participant;
    const savedContact = await saveContactBotEntry({
      workspaceId: campaign.workspaceId,
      campaignId: campaign.id,
      name: current.name,
      phone: current.phone
    });
    if (savedContact.status === "quota_exceeded") {
      outbound.push("שמנו את הפרטים במערכת, אבל מכסת אנשי הקשר מלאה. בעל העסק יקבל התראה ויוכל לשדרג את המכסה.");
    }
    const link = render(campaign, current, "LINK");
    const menu = render(campaign, current, "MAIN_MENU");
    if (link) outbound.push(link);
    if (menu) outbound.push(menu);
  } else {
    const menu = render(campaign, current, "MAIN_MENU");
    if (menu) outbound.push(menu);
  }

  for (const text of outbound) {
    await sendCloudText(connection, rawMessage.from, text);
    await db.messageLog.create({
      data: {
        workspaceId: campaign.workspaceId,
        campaignId: campaign.id,
        connectionId: connection.id,
        participantId: current.id,
        direction: "OUTBOUND",
        status: "sent",
        body: text,
        sentAt: new Date()
      }
    });
  }

  if (shouldSendContactCard) {
    const sentContactCard = await sendCloudContactCards(connection, rawMessage.from, campaign.workspaceId);

    if (sentContactCard) {
      await db.messageLog.create({
        data: {
          workspaceId: campaign.workspaceId,
          campaignId: campaign.id,
          connectionId: connection.id,
          participantId: current.id,
          direction: "OUTBOUND",
          status: "sent",
          body: "Contact card / VCF sent",
          sentAt: new Date()
        }
      });
    }
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === verifyToken() && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid verification token." }, { status: 403, headers: jsonHeaders });
}

export async function POST(request: Request) {
  // SECURITY: rate-limit by source IP. 120 requests / minute is well above
  // legitimate Meta webhook fan-out yet stops floods from a misconfigured peer.
  const limit = rateLimit({ key: `webhook:${clientIp(request)}`, limit: 120, windowMs: 60_000 });
  const tooMany = rateLimitResponse(limit);
  if (tooMany) return tooMany;

  const rawBody = await request.text();

  if (!isValidSignature(request, rawBody)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401, headers: jsonHeaders });
  }

  let payload: any;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400, headers: jsonHeaders });
  }

  const changes = payload?.entry?.flatMap((entry: any) => entry?.changes ?? []) ?? [];

  for (const change of changes) {
    const phoneNumberId = change?.value?.metadata?.phone_number_id ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
    const connection = await db.whatsAppConnection.findFirst({
      where: {
        provider: "official_business",
        OR: [
          { officialPhoneNumberId: phoneNumberId },
          ...(process.env.WHATSAPP_PHONE_NUMBER_ID === phoneNumberId ? [{ officialPhoneNumberId: null }] : [])
        ]
      },
      orderBy: { updatedAt: "desc" }
    });

    if (!connection) {
      continue;
    }

    for (const message of change?.value?.messages ?? []) {
      await processMessage(connection, message);
    }
  }

  return NextResponse.json({ ok: true }, { headers: jsonHeaders });
}
