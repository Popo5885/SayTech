import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { buildVcf } from "../../../../lib/contact-bot";
import { getPrimaryStore } from "../../../../lib/live-store";

const db = prisma as any;

export async function GET() {
  const store = await getPrimaryStore();

  if (!store) {
    return NextResponse.json(
      { error: "אין עדיין סביבת עבודה פעילה לייצוא אנשי קשר." },
      {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      }
    );
  }

  const entries = await db.contactSyncLedger.findMany({
    where: { workspaceId: store.workspace.id },
    orderBy: { updatedAt: "desc" }
  });
  const vcards = buildVcf(
    entries.map((entry: any) => ({
      displayName: entry.displayName,
      phone: entry.phone,
      note: `Magic Flow - ${store.campaign.name}`
    }))
  );

  return new NextResponse(vcards, {
    headers: {
      "Content-Disposition": `attachment; filename="${store.workspace.slug}-contacts.vcf"`,
      "Content-Type": "text/vcard; charset=utf-8"
    }
  });
}
