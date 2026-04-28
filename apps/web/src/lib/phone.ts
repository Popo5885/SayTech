export function normalizeIsraeliPhone(input: string | null | undefined): string | null {
  const raw = input?.trim();

  if (!raw) {
    return null;
  }

  const cleaned = raw.replace(/[^\d+]/g, "");

  if (!cleaned) {
    return null;
  }

  if (cleaned.startsWith("+972")) {
    return `+972${cleaned.slice(4).replace(/^0+/, "")}`;
  }

  if (cleaned.startsWith("972")) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("0") && cleaned.length >= 9) {
    return `+972${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.length >= 9) {
    return `+${cleaned}`;
  }

  return null;
}

export function formatPhoneForDisplay(phone: string | null | undefined): string {
  return normalizeIsraeliPhone(phone) ?? "עדיין לא הוגדר מספר";
}
