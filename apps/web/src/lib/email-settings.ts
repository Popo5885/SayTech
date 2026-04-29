import { decryptSecret, encryptSecret } from "@lottery/core";
import { prisma } from "@lottery/db";

const db = prisma as any;

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
};

export const SMTP_SETTING_KEYS = {
  host: "smtp_host",
  port: "smtp_port",
  user: "smtp_user",
  from: "smtp_from",
  passEncrypted: "smtp_pass_encrypted",
  secure: "smtp_secure"
} as const;

type SmtpSettingInput = {
  host: string;
  port: number;
  user: string;
  from: string;
  pass?: string;
  secure: boolean;
};

function parseBoolean(value: string | null | undefined, fallback: boolean): boolean {
  if (value === undefined || value === null || value.trim() === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
}

async function getSettingsMap(): Promise<Map<string, string>> {
  const settings = await db.siteSetting.findMany({
    where: {
      key: {
        in: Object.values(SMTP_SETTING_KEYS)
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
    console.error("[smtp-settings:decrypt-failed]", error);
    return "";
  }
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const settings = await getSettingsMap();
  const host = process.env.SMTP_HOST ?? settings.get(SMTP_SETTING_KEYS.host) ?? "smtp.gmail.com";
  const user = process.env.SMTP_USER ?? settings.get(SMTP_SETTING_KEYS.user) ?? "magicflow11284@gmail.com";
  const storedPass = decryptStoredSecret(settings.get(SMTP_SETTING_KEYS.passEncrypted));
  const pass = process.env.SMTP_PASS ?? storedPass;
  const from = process.env.SMTP_FROM ?? settings.get(SMTP_SETTING_KEYS.from) ?? user;
  const port = Number(process.env.SMTP_PORT ?? settings.get(SMTP_SETTING_KEYS.port) ?? 465);
  const secure = parseBoolean(process.env.SMTP_SECURE ?? settings.get(SMTP_SETTING_KEYS.secure), true);

  if (!host || !user || !pass || !from || !Number.isFinite(port)) {
    return null;
  }

  return {
    host,
    port,
    user,
    pass,
    from,
    secure
  };
}

export async function getSmtpAdminSettings() {
  const settings = await getSettingsMap();
  const host = process.env.SMTP_HOST ?? settings.get(SMTP_SETTING_KEYS.host) ?? "smtp.gmail.com";
  const user = process.env.SMTP_USER ?? settings.get(SMTP_SETTING_KEYS.user) ?? "magicflow11284@gmail.com";
  const from = process.env.SMTP_FROM ?? settings.get(SMTP_SETTING_KEYS.from) ?? user;
  const port = Number(process.env.SMTP_PORT ?? settings.get(SMTP_SETTING_KEYS.port) ?? 465);
  const secure = parseBoolean(process.env.SMTP_SECURE ?? settings.get(SMTP_SETTING_KEYS.secure), true);
  const passConfigured = Boolean(process.env.SMTP_PASS || settings.get(SMTP_SETTING_KEYS.passEncrypted));
  const missing: string[] = [];

  if (!host) {
    missing.push("SMTP_HOST");
  }

  if (!user) {
    missing.push("SMTP_USER");
  }

  if (!passConfigured) {
    missing.push("SMTP_PASS");
  }

  if (!from) {
    missing.push("SMTP_FROM");
  }

  if (!Number.isFinite(port)) {
    missing.push("SMTP_PORT");
  }

  return {
    configured: missing.length === 0,
    host,
    user,
    from,
    port: Number.isFinite(port) ? port : 465,
    secure,
    passConfigured,
    missing,
    source: {
      host: process.env.SMTP_HOST ? "env" : settings.get(SMTP_SETTING_KEYS.host) ? "admin" : "default",
      user: process.env.SMTP_USER ? "env" : settings.get(SMTP_SETTING_KEYS.user) ? "admin" : "default",
      from: process.env.SMTP_FROM ? "env" : settings.get(SMTP_SETTING_KEYS.from) ? "admin" : "default",
      port: process.env.SMTP_PORT ? "env" : settings.get(SMTP_SETTING_KEYS.port) ? "admin" : "default",
      pass: process.env.SMTP_PASS ? "env" : settings.get(SMTP_SETTING_KEYS.passEncrypted) ? "admin" : "missing"
    }
  };
}

export async function saveSmtpSettings(input: SmtpSettingInput, updatedByUserId?: string | null) {
  const entries = [
    [SMTP_SETTING_KEYS.host, input.host],
    [SMTP_SETTING_KEYS.port, String(input.port || 465)],
    [SMTP_SETTING_KEYS.user, input.user],
    [SMTP_SETTING_KEYS.from, input.from],
    [SMTP_SETTING_KEYS.secure, input.secure ? "true" : "false"]
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

  if (input.pass?.trim()) {
    await db.siteSetting.upsert({
      where: { key: SMTP_SETTING_KEYS.passEncrypted },
      update: {
        value: encryptSecret(input.pass.trim()),
        updatedByUserId: updatedByUserId ?? null
      },
      create: {
        key: SMTP_SETTING_KEYS.passEncrypted,
        value: encryptSecret(input.pass.trim()),
        updatedByUserId: updatedByUserId ?? null
      }
    });
  }
}
