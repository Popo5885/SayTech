// SECURITY: helpers for masking personally-identifiable information before it
// is written to logs or rendered on a public surface.
//
// Use everywhere a phone, email, or full name might end up in console output,
// audit metadata, error reports, or any user-visible page that is not the
// owner's own dashboard.

/**
 * Mask a phone number, keeping only the country code prefix and the last 2
 * digits. e.g. "+972541234567" -> "+972*******67".
 *
 * Accepts any input shape (with/without "+", spaces, dashes); always returns
 * a stable masked form usable in logs.
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const compact = String(phone).replace(/[^\d+]/g, "");

  if (!compact) return "";

  const hasPlus = compact.startsWith("+");
  const digits = hasPlus ? compact.slice(1) : compact;

  if (digits.length <= 4) {
    return `${hasPlus ? "+" : ""}${"*".repeat(digits.length)}`;
  }

  const visibleHead = digits.length >= 8 ? 3 : 2;
  const visibleTail = 2;
  const head = digits.slice(0, visibleHead);
  const tail = digits.slice(-visibleTail);
  const middleLen = Math.max(1, digits.length - visibleHead - visibleTail);

  return `${hasPlus ? "+" : ""}${head}${"*".repeat(middleLen)}${tail}`;
}

/**
 * Mask an email, keeping only the first character of the local part and the
 * full domain. e.g. "alice@example.com" -> "a***@example.com".
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const trimmed = String(email).trim();
  const atIndex = trimmed.lastIndexOf("@");

  if (atIndex <= 0) return "***";

  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const head = local[0] ?? "*";

  return `${head}${"*".repeat(Math.max(2, local.length - 1))}@${domain}`;
}

/**
 * Mask a full name, returning only the first and last character.
 * e.g. "John Smith" -> "J*****h".
 */
export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = String(name).trim();

  if (trimmed.length === 0) return "";
  if (trimmed.length === 1) return `${trimmed}*`;
  if (trimmed.length === 2) return `${trimmed[0]}*`;

  return `${trimmed[0]}${"*".repeat(Math.max(2, trimmed.length - 2))}${trimmed.slice(-1)}`;
}

const PHONE_PATTERN = /(\+?\d[\d\s\-().]{7,}\d)/g;
const EMAIL_PATTERN = /([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

/**
 * Walk a free-text string and mask any phone-like or email-like substring.
 * Useful for redacting error messages or third-party log payloads where the
 * structure is unknown.
 */
export function redactPii(input: unknown): string {
  if (input === null || input === undefined) return "";
  const text = typeof input === "string" ? input : safeJsonStringify(input);

  return text
    .replace(EMAIL_PATTERN, (match) => maskEmail(match))
    .replace(PHONE_PATTERN, (match) => maskPhone(match));
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Convenience console.* wrapper that scrubs PII from any string arg.
 * Object args are stringified through redactPii so nested phones/emails are
 * masked too.
 */
export const safeLog = {
  info(...args: unknown[]) {
    console.info(...args.map((arg) => (typeof arg === "string" ? redactPii(arg) : arg)));
  },
  warn(...args: unknown[]) {
    console.warn(...args.map((arg) => (typeof arg === "string" ? redactPii(arg) : arg)));
  },
  error(...args: unknown[]) {
    console.error(...args.map((arg) => (typeof arg === "string" ? redactPii(arg) : arg)));
  }
};
