import { decryptSecret } from "@lottery/core";
import { prisma } from "@lottery/db";

const db = prisma as any;

export function normalizeWhatsAppRecipient(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

async function resolveWhatsAppSender(input: {
  accessToken?: string | null;
  phoneNumberId?: string | null;
}) {
  const envAccessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.META_WHATSAPP_ACCESS_TOKEN;
  const accessToken = input.accessToken ?? envAccessToken;
  const phoneNumberId = input.phoneNumberId ?? process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (accessToken && phoneNumberId) {
    return { accessToken, phoneNumberId };
  }

  const connection = await db.whatsAppConnection.findFirst({
    where: {
      provider: "official_business",
      officialPhoneNumberId: {
        not: null
      },
      OR: [
        {
          officialAccessTokenEncrypted: {
            not: null
          }
        },
        ...(envAccessToken ? [{ officialPhoneNumberId: { not: null } }] : [])
      ]
    },
    orderBy: {
      updatedAt: "desc"
    }
  });

  if (!connection?.officialPhoneNumberId) {
    return null;
  }

  let resolvedToken: string | null | undefined = envAccessToken;

  if (connection.officialAccessTokenEncrypted) {
    try {
      resolvedToken = decryptSecret(connection.officialAccessTokenEncrypted);
    } catch (error) {
      console.error("[whatsapp:sender-token-decrypt-failed]", error);
      return null;
    }
  }

  if (!resolvedToken) {
    return null;
  }

  return {
    accessToken: resolvedToken,
    phoneNumberId: connection.officialPhoneNumberId
  };
}

export async function sendWhatsAppText(input: {
  to: string;
  body: string;
  accessToken?: string | null;
  phoneNumberId?: string | null;
}) {
  const sender = await resolveWhatsAppSender(input);

  if (!sender) {
    return false;
  }

  const response = await fetch(
    `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? "v20.0"}/${sender.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sender.accessToken}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizeWhatsAppRecipient(input.to),
        type: "text",
        text: {
          preview_url: false,
          body: input.body
        }
      })
    }
  );

  if (!response.ok) {
    console.error("[whatsapp:send-failed]", await response.text());
    return false;
  }

  return true;
}
