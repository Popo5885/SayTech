import { decryptSecret, encryptSecret } from "@lottery/core";
import { prisma } from "@lottery/db";

const db = prisma as any;

export const DEFAULT_GOOGLE_CLIENT_ID =
  "455116448878-mlsaq4mflpdm8fpkisnak26tjhmtduf3.apps.googleusercontent.com";

export const GOOGLE_SETTING_KEYS = {
  clientId: "google_client_id",
  clientSecretEncrypted: "google_client_secret_encrypted",
  redirectUri: "google_redirect_uri"
} as const;

type GoogleOAuthSettingInput = {
  clientId: string;
  clientSecret?: string;
  redirectUri?: string;
};

async function getSettingsMap(): Promise<Map<string, string>> {
  const settings = await db.siteSetting.findMany({
    where: {
      key: {
        in: Object.values(GOOGLE_SETTING_KEYS)
      }
    }
  });

  return new Map<string, string>(
    settings.map((setting: any) => [String(setting.key), String(setting.value)])
  );
}

function decryptStoredSecret(value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  try {
    return decryptSecret(value);
  } catch (error) {
    console.error("[google-settings:decrypt-failed]", error);
    return "";
  }
}

export async function getGoogleOAuthSettings() {
  const settings = await getSettingsMap();
  const clientId = process.env.GOOGLE_CLIENT_ID ?? settings.get(GOOGLE_SETTING_KEYS.clientId) ?? DEFAULT_GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ??
    decryptStoredSecret(settings.get(GOOGLE_SETTING_KEYS.clientSecretEncrypted));
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    settings.get(GOOGLE_SETTING_KEYS.redirectUri) ??
    `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/auth/callback/google`;

  return {
    configured: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    redirectUri
  };
}

export async function getGoogleOAuthAdminSettings() {
  const settings = await getSettingsMap();
  const runtime = await getGoogleOAuthSettings();
  const secretConfigured = Boolean(
    process.env.GOOGLE_CLIENT_SECRET ||
      settings.get(GOOGLE_SETTING_KEYS.clientSecretEncrypted)
  );
  const missing: string[] = [];

  if (!runtime.clientId) {
    missing.push("GOOGLE_CLIENT_ID");
  }

  if (!secretConfigured) {
    missing.push("GOOGLE_CLIENT_SECRET");
  }

  return {
    ...runtime,
    secretConfigured,
    missing,
    source: {
      clientId: process.env.GOOGLE_CLIENT_ID
        ? "env"
        : settings.get(GOOGLE_SETTING_KEYS.clientId)
          ? "admin"
          : "default",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
        ? "env"
        : settings.get(GOOGLE_SETTING_KEYS.clientSecretEncrypted)
          ? "admin"
          : "missing",
      redirectUri: process.env.GOOGLE_REDIRECT_URI
        ? "env"
        : settings.get(GOOGLE_SETTING_KEYS.redirectUri)
          ? "admin"
          : "default"
    }
  };
}

export async function saveGoogleOAuthSettings(
  input: GoogleOAuthSettingInput,
  updatedByUserId?: string | null
) {
  const entries = [
    [GOOGLE_SETTING_KEYS.clientId, input.clientId || DEFAULT_GOOGLE_CLIENT_ID],
    [GOOGLE_SETTING_KEYS.redirectUri, input.redirectUri ?? ""]
  ] as const;

  await Promise.all(
    entries.map(([key, value]) =>
      db.siteSetting.upsert({
        where: { key },
        update: {
          value,
          updatedByUserId: updatedByUserId ?? null
        },
        create: {
          key,
          value,
          updatedByUserId: updatedByUserId ?? null
        }
      })
    )
  );

  if (input.clientSecret?.trim()) {
    await db.siteSetting.upsert({
      where: { key: GOOGLE_SETTING_KEYS.clientSecretEncrypted },
      update: {
        value: encryptSecret(input.clientSecret.trim()),
        updatedByUserId: updatedByUserId ?? null
      },
      create: {
        key: GOOGLE_SETTING_KEYS.clientSecretEncrypted,
        value: encryptSecret(input.clientSecret.trim()),
        updatedByUserId: updatedByUserId ?? null
      }
    });
  }
}
