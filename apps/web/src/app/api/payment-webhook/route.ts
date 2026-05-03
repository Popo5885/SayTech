/**
 * Payment Webhook
 *
 * Receives a verified payment event and:
 *   1. Marks the BillingRecord as paid (paidAt = now).
 *   2. Credits 20 affiliate points to the workspace.
 *
 * Security:
 *   - Validates X-Payment-Signature (HMAC-SHA256 over raw body, key = PAYMENT_WEBHOOK_SECRET).
 *   - Idempotent: re-delivering the same billingRecordId is safe.
 *
 * Expected payload (JSON):
 *   { billingRecordId: string, workspaceId: string, amountCents: number, receiptNumber?: string }
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { creditPaymentPoints, POINTS_PER_PAYMENT } from "../../../lib/affiliate-points";

const db = prisma as any;

function verifySignature(body: string, header: string | null): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    // If no secret configured, skip verification (dev / optional integration).
    console.warn("[payment-webhook] PAYMENT_WEBHOOK_SECRET not set — skipping HMAC check");
    return true;
  }
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-payment-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { billingRecordId?: string; workspaceId?: string; amountCents?: number; receiptNumber?: string };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { billingRecordId, workspaceId, amountCents, receiptNumber } = payload;

  if (!billingRecordId || !workspaceId) {
    return NextResponse.json({ error: "billingRecordId and workspaceId are required" }, { status: 400 });
  }

  // 1 — Verify the billing record belongs to the workspace
  const billing = await db.billingRecord.findFirst({
    where: { id: billingRecordId, workspaceId }
  });

  if (!billing) {
    return NextResponse.json({ error: "Billing record not found" }, { status: 404 });
  }

  // 2 — Mark as paid (idempotent — no-op if already paid)
  if (!billing.paidAt) {
    await db.billingRecord.update({
      where: { id: billingRecordId },
      data: {
        status: "paid",
        paidAt: new Date(),
        receiptNumber: receiptNumber ?? billing.receiptNumber
      }
    });
  }

  // 3 — Credit 20 affiliate points (idempotent on billingRecordId)
  const { newBalance } = await creditPaymentPoints(workspaceId, billingRecordId);

  console.log(
    `[payment-webhook] workspace=${workspaceId} billing=${billingRecordId} ` +
    `amount=${amountCents} pts=+${POINTS_PER_PAYMENT} balance=${newBalance}`
  );

  return NextResponse.json({
    ok: true,
    pointsCredited: POINTS_PER_PAYMENT,
    newBalance
  });
}
