/**
 * Affiliate & Points Service
 *
 * Rules:
 *  - 20 points are credited ONLY when a verified payment webhook fires.
 *  - 100 points = 100 NIS discount (1 pt = 1 NIS).
 *  - Balance is maintained as a snapshot in AffiliatePointsBalance.
 *  - All events are immutably recorded in AffiliatePointsLedger.
 */

import { prisma } from "@lottery/db";

const db = prisma as any;

export const POINTS_PER_PAYMENT = 20;
export const POINTS_PER_NIS_DISCOUNT = 100; // 100 pts = 100 NIS

/** Credit 20 points for a verified payment. Idempotent on billingRecordId. */
export async function creditPaymentPoints(
  workspaceId: string,
  billingRecordId: string
): Promise<{ newBalance: number }> {
  // Idempotency: only credit once per billing record
  const existing = await db.affiliatePointsLedger.findFirst({
    where: { workspaceId, billingRecordId }
  });

  if (existing) {
    const balance = await getBalance(workspaceId);
    return { newBalance: balance };
  }

  return db.$transaction(async (tx: any) => {
    await tx.affiliatePointsLedger.create({
      data: {
        workspaceId,
        deltaPoints: POINTS_PER_PAYMENT,
        source: "payment_webhook",
        billingRecordId,
        note: `+${POINTS_PER_PAYMENT} נקודות על תשלום אומת`
      }
    });

    const updated = await tx.affiliatePointsBalance.upsert({
      where: { workspaceId },
      update: { totalPoints: { increment: POINTS_PER_PAYMENT } },
      create: { workspaceId, totalPoints: POINTS_PER_PAYMENT }
    });

    return { newBalance: updated.totalPoints as number };
  });
}

/** Get current points balance for a workspace (0 if no record yet). */
export async function getBalance(workspaceId: string): Promise<number> {
  const rec = await db.affiliatePointsBalance.findUnique({
    where: { workspaceId }
  });
  return (rec?.totalPoints as number | undefined) ?? 0;
}

/** Get ledger history for display. */
export async function getLedger(workspaceId: string, limit = 50) {
  return db.affiliatePointsLedger.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

/**
 * Redeem points for a discount.
 * Returns the created redemption with discountAgorot (Israeli cents).
 * Throws if insufficient balance or points not a multiple of 100.
 */
export async function redeemPoints(
  workspaceId: string,
  pointsToRedeem: number
): Promise<{ redemptionId: string; discountNis: number; newBalance: number }> {
  if (pointsToRedeem <= 0 || pointsToRedeem % POINTS_PER_NIS_DISCOUNT !== 0) {
    throw new Error(`חייבים לממש בכפולות של ${POINTS_PER_NIS_DISCOUNT} נקודות`);
  }

  return db.$transaction(async (tx: any) => {
    const balance = await tx.affiliatePointsBalance.findUnique({
      where: { workspaceId }
    });
    const current: number = balance?.totalPoints ?? 0;

    if (current < pointsToRedeem) {
      throw new Error(`יתרה לא מספיקה (${current} נקודות זמינות)`);
    }

    const discountNis = pointsToRedeem; // 1 pt = 1 NIS
    const discountAgorot = discountNis * 100;

    const redemption = await tx.affiliateRedemption.create({
      data: {
        workspaceId,
        pointsRedeemed: pointsToRedeem,
        discountAgorot,
        status: "pending"
      }
    });

    // Debit the ledger
    await tx.affiliatePointsLedger.create({
      data: {
        workspaceId,
        deltaPoints: -pointsToRedeem,
        source: "redemption",
        note: `מימוש ${pointsToRedeem} נקודות ← הנחה של ${discountNis} ₪`
      }
    });

    const updated = await tx.affiliatePointsBalance.update({
      where: { workspaceId },
      data: { totalPoints: { decrement: pointsToRedeem } }
    });

    return {
      redemptionId: redemption.id as string,
      discountNis,
      newBalance: updated.totalPoints as number
    };
  });
}
