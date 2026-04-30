import { prisma } from "@lottery/db";
import { getGoogleOAuthSettings } from "./google-settings";

const db = prisma as any;

export const AUTH_SETTING_KEYS = {
  googleLoginEnabled: "auth_google_login_enabled",
  whatsappLoginEnabled: "auth_whatsapp_login_enabled",
  whatsappManualCodeEnabled: "auth_whatsapp_manual_code_enabled"
} as const;

function parseBoolean(value: string | null | undefined): boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on", "enabled"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off", "disabled"].includes(normalized)) {
    return false;
  }

  return null;
}

export async function isGoogleOAuthConfigured(): Promise<boolean> {
  return (await getGoogleOAuthSettings()).configured;
}

export function isEnvWhatsAppSenderConfigured(): boolean {
  return Boolean(
    (process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.META_WHATSAPP_ACCESS_TOKEN) &&
      process.env.WHATSAPP_PHONE_NUMBER_ID
  );
}

export async function hasOfficialWhatsAppSender(): Promise<boolean> {
  if (isEnvWhatsAppSenderConfigured()) {
    return true;
  }

  try {
    const envAccessToken = process.env.WHATSAPP_ACCESS_TOKEN ?? process.env.META_WHATSAPP_ACCESS_TOKEN;
    const connection = await db.whatsAppConnection.findFirst({
      where: {
        provider: "official_business",
        officialPhoneNumberId: {
          not: null
        },
        ...(envAccessToken
          ? {}
          : {
              officialAccessTokenEncrypted: {
                not: null
              }
            })
      },
      select: {
        id: true
      }
    });

    return Boolean(connection);
  } catch (error) {
    console.error("[auth-settings:wa-sender-db-unreachable]", error);
    return false;
  }
}

async function getSettingsMap(): Promise<Map<string, string>> {
  const keys = Object.values(AUTH_SETTING_KEYS);

  try {
    const settings = await db.siteSetting.findMany({
      where: {
        key: {
          in: keys
        }
      }
    });

    return new Map<string, string>(
      settings.map((setting: any) => [String(setting.key), String(setting.value)])
    );
  } catch (error) {
    // If the database is unreachable or the schema hasn't been pushed yet
    // (common right after a fresh Railway deploy) we MUST NOT throw — every
    // login/register render would crash with a cryptic Next.js digest error.
    // Fall back to env-only configuration instead.
    console.error("[auth-settings:db-unreachable]", error);
    return new Map<string, string>();
  }
}

export async function setAuthFeatureSetting(
  key: (typeof AUTH_SETTING_KEYS)[keyof typeof AUTH_SETTING_KEYS],
  enabled: boolean,
  updatedByUserId?: string | null
) {
  return db.siteSetting.upsert({
    where: { key },
    update: {
      value: enabled ? "true" : "false",
      updatedByUserId: updatedByUserId ?? null
    },
    create: {
      key,
      value: enabled ? "true" : "false",
      updatedByUserId: updatedByUserId ?? null
    }
  });
}

export async function getAuthFeatureSettings() {
  const settings = await getSettingsMap();
  const googleEnabledSetting =
    parseBoolean(settings.get(AUTH_SETTING_KEYS.googleLoginEnabled)) ??
    parseBoolean(process.env.AUTH_GOOGLE_LOGIN_ENABLED) ??
    false;
  const whatsappEnabledSetting =
    parseBoolean(settings.get(AUTH_SETTING_KEYS.whatsappLoginEnabled)) ??
    parseBoolean(process.env.AUTH_WHATSAPP_LOGIN_ENABLED) ??
    false;
  const manualCodeEnabled =
    parseBoolean(settings.get(AUTH_SETTING_KEYS.whatsappManualCodeEnabled)) ??
    parseBoolean(process.env.AUTH_WHATSAPP_MANUAL_CODE_ENABLED) ??
    true;
  const googleConfigured = await isGoogleOAuthConfigured();
  const whatsappSenderConfigured = await hasOfficialWhatsAppSender();

  return {
    googleConfigured,
    googleLoginAdminEnabled: googleEnabledSetting,
    googleLoginEnabled: googleConfigured && googleEnabledSetting,
    whatsappLoginEnabled: whatsappEnabledSetting,
    whatsappManualCodeEnabled: manualCodeEnabled,
    whatsappSenderConfigured
  };
}

export async function isGoogleLoginEnabled(): Promise<boolean> {
  return (await getAuthFeatureSettings()).googleLoginEnabled;
}

export async function isWhatsAppLoginEnabled(): Promise<boolean> {
  return (await getAuthFeatureSettings()).whatsappLoginEnabled;
}
