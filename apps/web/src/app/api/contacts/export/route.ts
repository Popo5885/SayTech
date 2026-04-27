import { NextResponse } from "next/server";
import { getPrimaryStore } from "../../../../lib/demo-store";

function formatPhoneForContact(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return digits;
  }

  return `+${digits}`;
}

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export async function GET() {
  const store = await getPrimaryStore();

  if (!store) {
    return NextResponse.json({ error: "אין עדיין Workspace פעיל לייצוא אנשי קשר." }, { status: 404 });
  }

  const registeredParticipants = store.participants.filter(
    (participant) => participant.onboardingState === "REGISTERED"
  );
  const vcards = registeredParticipants
    .map((participant) => {
      const displayName = escapeVCard(participant.name?.trim() || participant.phone);
      const phone = formatPhoneForContact(participant.phone);

      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${displayName}`,
        `ORG:${escapeVCard(store.campaign.contactTagName || store.workspace.name)}`,
        `TEL;TYPE=CELL:${phone}`,
        `NOTE:${escapeVCard(`Magic Flow - ${store.campaign.name}`)}`,
        "END:VCARD"
      ].join("\r\n");
    })
    .join("\r\n");

  return new NextResponse(`${vcards}\r\n`, {
    headers: {
      "Content-Disposition": `attachment; filename="${store.campaign.slug}-contacts.vcf"`,
      "Content-Type": "text/vcard; charset=utf-8"
    }
  });
}
