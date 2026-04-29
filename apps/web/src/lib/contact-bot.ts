import { google } from "googleapis";
import { decryptSecret, renderTemplate } from "@lottery/core";
import { prisma } from "@lottery/db";
import { normalizeIsraeliPhone } from "./phone";

const db = prisma as any;

export const CONTACT_BOT_BASE_QUOTA = 600;
export const CONTACT_BOT_MONTHLY_PRICE_CENTS = 5000;
export const CONTACT_BOT_EXTRA_PACK_SIZE = 100;
export const CONTACT_BOT_EXTRA_PACK_PRICE_CENTS = 500;
const DEFAULT_GOOGLE_CLIENT_ID =
  "455116448878-mlsaq4mflpdm8fpkisnak26tjhmtduf3.apps.googleusercontent.com";

export type ContactBotStatus =
  | "saved_system"
  | "synced_google"
  | "duplicate"
  | "quota_exceeded"
  | "pending_google";

export type ContactBotSaveResult = {
  status: ContactBotStatus;
  displayName: string;
  phone: string;
  quotaUsed: number;
  quotaLimit: number;
  quotaRemaining: number;
  googleConnected: boolean;
};

export function normalizeContactPhone(phone: string): string {
  const israeliPhone = normalizeIsraeliPhone(phone);

  if (israeliPhone) {
    return israeliPhone;
  }

  const compact = phone.replace(/[^\d+]/g, "");

  if (!compact) {
    return "";
  }

  return compact.startsWith("+") ? compact : `+${compact}`;
}

export function buildContactDisplayName(input: {
  template?: string | null;
  name?: string | null;
  phone: string;
  campaignName?: string | null;
}): string {
  const name = input.name?.trim() || input.phone;

  return renderTemplate(input.template || "{{name}}+בוט", {
    name,
    tickets: 0,
    link: "",
    referrals: 0,
    rank: 0,
    top10: "",
    contact_phone: normalizeContactPhone(input.phone),
    campaign_name: input.campaignName ?? "",
    ref: ""
  });
}

export function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildVcf(entries: Array<{ displayName: string; phone: string; note?: string | null }>) {
  return `${entries
    .map((entry) =>
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escapeVCard(entry.displayName)}`,
        `TEL;TYPE=CELL:${normalizeContactPhone(entry.phone)}`,
        `NOTE:${escapeVCard(entry.note || "Magic Flow Contact Bot")}`,
        "END:VCARD"
      ].join("\r\n")
    )
    .join("\r\n")}\r\n`;
}

export async function getContactBotQuota(workspaceId: string) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      contactBotBaseQuota: true,
      contactBotExtraQuota: true,
      contactBotUsedQuota: true,
      contactBotMonthlyPriceCents: true
    }
  });

  const baseQuota = workspace?.contactBotBaseQuota ?? CONTACT_BOT_BASE_QUOTA;
  const extraQuota = workspace?.contactBotExtraQuota ?? 0;
  const usedQuota =
    workspace?.contactBotUsedQuota ??
    (await db.contactSyncLedger.count({ where: { workspaceId, quotaCounted: true } }));
  const quotaLimit = baseQuota + extraQuota;

  return {
    baseQuota,
    extraQuota,
    usedQuota,
    quotaLimit,
    quotaRemaining: Math.max(quotaLimit - usedQuota, 0),
    monthlyPriceCents: workspace?.contactBotMonthlyPriceCents ?? CONTACT_BOT_MONTHLY_PRICE_CENTS
  };
}

function googleAuthForWorkspace(workspace: any) {
  if (!workspace.googleAccessTokenEncrypted) {
    return null;
  }

  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientSecret) {
    return null;
  }

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID ?? DEFAULT_GOOGLE_CLIENT_ID,
    clientSecret,
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback/google"
  );
  auth.setCredentials({
    access_token: decryptSecret(workspace.googleAccessTokenEncrypted),
    refresh_token: workspace.googleRefreshTokenEncrypted
      ? decryptSecret(workspace.googleRefreshTokenEncrypted)
      : undefined,
    expiry_date: workspace.googleTokenExpiry?.getTime()
  });

  return google.people({ version: "v1", auth });
}

function phoneSearchTerms(phone: string) {
  const normalized = normalizeContactPhone(phone);
  const withoutPlus = normalized.replace(/^\+/, "");

  return Array.from(new Set([phone, normalized, withoutPlus])).filter(Boolean);
}

async function findGoogleContact(people: ReturnType<typeof google.people>, phone: string) {
  const normalized = normalizeContactPhone(phone);

  for (const query of phoneSearchTerms(phone)) {
    const response = await people.people.searchContacts({
      query,
      pageSize: 10,
      readMask: "names,phoneNumbers,metadata"
    });
    const match = response.data.results
      ?.map((result) => result.person)
      .find((person) =>
        person?.phoneNumbers?.some(
          (phoneNumber) => normalizeContactPhone(phoneNumber.value ?? "") === normalized
        )
      );

    if (match?.resourceName) {
      return match;
    }
  }

  return null;
}

async function createGoogleContact(
  people: ReturnType<typeof google.people>,
  input: { displayName: string; rawName?: string | null; phone: string; campaignId?: string | null }
) {
  const created = await people.people.createContact({
    personFields: "names,phoneNumbers,metadata",
    requestBody: {
      names: [
        {
          displayName: input.displayName,
          givenName: input.rawName?.trim() || input.displayName
        }
      ],
      phoneNumbers: [{ value: normalizeContactPhone(input.phone) }],
      userDefined: input.campaignId ? [{ key: "campaignId", value: input.campaignId }] : []
    }
  });

  return created.data.resourceName ?? null;
}

async function upsertLedger(input: {
  workspaceId: string;
  phone: string;
  displayName: string;
  status: ContactBotStatus;
  quotaCounted: boolean;
  googlePersonResourceName?: string | null;
  lastCampaignId?: string | null;
  syncedAt?: Date | null;
}) {
  return db.contactSyncLedger.upsert({
    where: {
      workspaceId_phone: {
        workspaceId: input.workspaceId,
        phone: input.phone
      }
    },
    update: {
      displayName: input.displayName,
      status: input.status,
      quotaCounted: input.quotaCounted,
      googlePersonResourceName: input.googlePersonResourceName ?? null,
      lastCampaignId: input.lastCampaignId ?? null,
      syncedAt: input.syncedAt ?? null,
      lastCheckedAt: new Date()
    },
    create: {
      workspaceId: input.workspaceId,
      phone: input.phone,
      displayName: input.displayName,
      status: input.status,
      quotaCounted: input.quotaCounted,
      googlePersonResourceName: input.googlePersonResourceName ?? null,
      lastCampaignId: input.lastCampaignId ?? null,
      syncedAt: input.syncedAt ?? null,
      lastCheckedAt: new Date()
    }
  });
}

export async function saveContactBotEntry(input: {
  workspaceId: string;
  campaignId?: string | null;
  name?: string | null;
  phone: string;
}): Promise<ContactBotSaveResult> {
  const phone = normalizeContactPhone(input.phone);

  if (!phone) {
    throw new Error("Missing contact phone.");
  }

  const workspace = await db.workspace.findUnique({
    where: { id: input.workspaceId }
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  const displayName = buildContactDisplayName({
    template: workspace.googleContactTemplate,
    name: input.name,
    phone
  });
  const quotaBefore = await getContactBotQuota(input.workspaceId);
  const existing = await db.contactSyncLedger.findUnique({
    where: {
      workspaceId_phone: {
        workspaceId: input.workspaceId,
        phone
      }
    }
  });

  if (existing) {
    await upsertLedger({
      workspaceId: input.workspaceId,
      phone,
      displayName: existing.displayName || displayName,
      status: existing.status === "quota_exceeded" ? "quota_exceeded" : "duplicate",
      quotaCounted: Boolean(existing.quotaCounted),
      googlePersonResourceName: existing.googlePersonResourceName,
      lastCampaignId: input.campaignId ?? existing.lastCampaignId,
      syncedAt: existing.syncedAt
    });

    const quota = await getContactBotQuota(input.workspaceId);
    return {
      status: existing.status === "quota_exceeded" ? "quota_exceeded" : "duplicate",
      displayName: existing.displayName || displayName,
      phone,
      quotaUsed: quota.usedQuota,
      quotaLimit: quota.quotaLimit,
      quotaRemaining: quota.quotaRemaining,
      googleConnected: Boolean(workspace.googleAccessTokenEncrypted)
    };
  }

  if (quotaBefore.quotaRemaining <= 0) {
    await upsertLedger({
      workspaceId: input.workspaceId,
      phone,
      displayName,
      status: "quota_exceeded",
      quotaCounted: false,
      lastCampaignId: input.campaignId ?? null,
      syncedAt: null
    });

    return {
      status: "quota_exceeded",
      displayName,
      phone,
      quotaUsed: quotaBefore.usedQuota,
      quotaLimit: quotaBefore.quotaLimit,
      quotaRemaining: quotaBefore.quotaRemaining,
      googleConnected: Boolean(workspace.googleAccessTokenEncrypted)
    };
  }

  const people = googleAuthForWorkspace(workspace);
  let status: ContactBotStatus = "saved_system";
  let googlePersonResourceName: string | null = null;
  let syncedAt: Date | null = null;
  let quotaCounted = true;

  if (people) {
    try {
      const existingGoogleContact = await findGoogleContact(people, phone);

      if (existingGoogleContact?.resourceName) {
        status = "duplicate";
        googlePersonResourceName = existingGoogleContact.resourceName;
        quotaCounted = false;
      } else {
        googlePersonResourceName = await createGoogleContact(people, {
          displayName,
          rawName: input.name,
          phone,
          campaignId: input.campaignId ?? null
        });
        status = "synced_google";
        syncedAt = new Date();
      }
    } catch (error) {
      console.error("[contact-bot:google-sync-failed]", error);
      status = "pending_google";
    }
  }

  await upsertLedger({
    workspaceId: input.workspaceId,
    phone,
    displayName,
    status,
    quotaCounted,
    googlePersonResourceName,
    lastCampaignId: input.campaignId ?? null,
    syncedAt
  });

  if (quotaCounted) {
    await db.workspace.update({
      where: { id: input.workspaceId },
      data: {
        contactBotUsedQuota: {
          increment: 1
        }
      }
    });
  }

  const quota = await getContactBotQuota(input.workspaceId);

  return {
    status,
    displayName,
    phone,
    quotaUsed: quota.usedQuota,
    quotaLimit: quota.quotaLimit,
    quotaRemaining: quota.quotaRemaining,
    googleConnected: Boolean(workspace.googleAccessTokenEncrypted)
  };
}
