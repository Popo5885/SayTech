import { prisma } from "@lottery/db";
import { ContactsSyncCard } from "../../../components/contacts-sync-card";
import { DatabaseErrorState } from "../../../components/database-error-state";
import { EmptyWorkspaceState } from "../../../components/empty-workspace-state";
import {
  buildVcf,
  CONTACT_BOT_EXTRA_PACK_PRICE_CENTS,
  CONTACT_BOT_EXTRA_PACK_SIZE
} from "../../../lib/contact-bot";
import { ownerEmail, sendSystemEmail } from "../../../lib/email";
import { getContactsOverview, getPrimaryStore } from "../../../lib/live-store";
import { safeDbRead } from "../../../lib/safe-db";

const db = prisma as any;

async function requestQuotaUpgradeAction(formData: FormData) {
  "use server";

  const store = await getPrimaryStore();

  if (!store) {
    return;
  }

  const packs = Math.max(1, Number(formData.get("packs") ?? 1));
  const requestedContacts = packs * CONTACT_BOT_EXTRA_PACK_SIZE;
  const estimatedPriceCents = packs * CONTACT_BOT_EXTRA_PACK_PRICE_CENTS;

  await db.contactBotUpgradeRequest.create({
    data: {
      workspaceId: store.workspace.id,
      requestedPacks: packs,
      requestedContacts,
      estimatedPriceCents,
      note: `בקשת שדרוג מכסה עבור ${store.workspace.name}`
    }
  });

  await db.contactLead.create({
    data: {
      fullName: store.workspace.ownerName ?? store.workspace.name,
      email: store.workspace.ownerEmail ?? ownerEmail(),
      phone: store.workspace.phoneNumber ?? null,
      message: `בקשת שדרוג מכסה: ${requestedContacts} אנשי קשר נוספים (${estimatedPriceCents / 100} ₪).`,
      acceptedTermsAt: new Date(),
      acceptedPrivacyAt: new Date()
    }
  });

  await sendSystemEmail({
    to: ownerEmail(),
    subject: "בקשת שדרוג מכסת אנשי קשר",
    html: `<h1>בקשת שדרוג חדשה</h1><p>${store.workspace.name} ביקש להוסיף ${requestedContacts} אנשי קשר.</p><p>עלות משוערת: ${estimatedPriceCents / 100} ₪.</p>`
  });
}

async function sendVcfToEmailAction() {
  "use server";

  const store = await getPrimaryStore();

  if (!store?.workspace.ownerEmail) {
    return;
  }

  const entries = await db.contactSyncLedger.findMany({
    where: { workspaceId: store.workspace.id },
    orderBy: { updatedAt: "desc" }
  });
  const vcf = buildVcf(
    entries.map((entry: any) => ({
      displayName: entry.displayName,
      phone: entry.phone,
      note: "Magic Flow Contact Bot"
    }))
  );

  await sendSystemEmail({
    to: store.workspace.ownerEmail,
    subject: "קובץ אנשי הקשר שלך מ-Magic Flow",
    html: "<h1>קובץ אנשי הקשר מצורף</h1><p>מצורף קובץ VCF עם אנשי הקשר שנשמרו במערכת.</p>",
    attachments: [
      {
        filename: `${store.workspace.slug}-contacts.vcf`,
        content: vcf,
        contentType: "text/vcard; charset=UTF-8"
      }
    ]
  });
}

export default async function DashboardContactsPage() {
  const result = await safeDbRead("dashboard:contacts", async () => {
    const store = await getPrimaryStore();

    if (!store) {
      return null;
    }

    return await getContactsOverview();
  });

  if (!result.ok) {
    return <DatabaseErrorState retryHref="/dashboard/contacts" />;
  }

  if (!result.data) {
    return (
      <EmptyWorkspaceState
        title="אין עדיין אנשי קשר"
        description="לאחר אישור החשבון והפעלת הבוט, אנשי הקשר יופיעו כאן וניתן יהיה להוריד קובץ VCF."
      />
    );
  }

  return (
    <ContactsSyncCard
      {...result.data}
      requestQuotaUpgradeAction={requestQuotaUpgradeAction}
      sendVcfToEmailAction={sendVcfToEmailAction}
    />
  );
}
