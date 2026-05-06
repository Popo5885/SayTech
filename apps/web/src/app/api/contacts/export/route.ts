import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { auth } from "../../../../auth";
import { buildVcf } from "../../../../lib/contact-bot";
import { getPrimaryStore } from "../../../../lib/live-store";
import { rateLimitByIpAndUser } from "../../../../lib/rate-limit";

const db = prisma as any;

export async function GET(request: Request) {
  // SECURITY: require an authenticated session before exporting PII.
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const tooMany = rateLimitByIpAndUser({
    request,
    userId,
    scope: "contacts-export",
    ipLimit: 5,
    userLimit: 10,
    windowMs: 60_000
  });
  if (tooMany) return tooMany;

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
