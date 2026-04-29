import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const ENGLISH_PASSWORD_PATTERN = /^[a-zA-Z0-9]+$/;

export function isEnglishPassword(password: string): boolean {
  return password.length >= 8 && ENGLISH_PASSWORD_PATTERN.test(password);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) {
    return false;
  }

  const [method, salt, hash] = storedHash.split(":");

  if (method !== "scrypt" || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}
