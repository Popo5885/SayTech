import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const DEFAULT_SECRET = "development-only-secret-change-me";

function getKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function resolveEncryptionSecret(): string {
  const secret = process.env.WORKSPACE_TOKEN_ENCRYPTION_KEY;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("WORKSPACE_TOKEN_ENCRYPTION_KEY is required in production.");
  }

  return secret ?? DEFAULT_SECRET;
}

export function encryptSecret(value: string): string {
  const key = getKey(resolveEncryptionSecret());
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(value: string): string {
  const payload = Buffer.from(value, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const key = getKey(resolveEncryptionSecret());
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
