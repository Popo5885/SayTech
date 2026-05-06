#!/usr/bin/env node
// On every deploy, promote the configured admin email(s) to SUPER_ADMIN so the
// owner can never get locked out of system management. Idempotent — safe to run
// repeatedly.
//
// Looks at:
//   SUPERADMIN_EMAILS  (comma-separated list)
//   SUPERADMIN_EMAIL   (single email — used by setup-superadmin.mjs)
//   plus a hardcoded fallback so the project owner is always reachable.
//
// Skips silently when DATABASE_URL is missing (CI / build phase).
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.warn("[ensure-admins] skipped — DATABASE_URL is not set");
  process.exit(0);
}

let PrismaClient;
try {
  ({ PrismaClient } = await import("@prisma/client"));
} catch (error) {
  console.warn("[ensure-admins] skipped — @prisma/client not installed:", error?.message ?? error);
  process.exit(0);
}

const FALLBACK_EMAILS = ["aknvpupuch@gmail.com"];

const fromList = (process.env.SUPERADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const fromSingle = (process.env.SUPERADMIN_EMAIL ?? "").trim().toLowerCase();

const allEmails = Array.from(
  new Set([...fromList, ...(fromSingle ? [fromSingle] : []), ...FALLBACK_EMAILS])
);

if (allEmails.length === 0) {
  console.log("[ensure-admins] nothing to do — no admin emails configured");
  process.exit(0);
}

const prisma = new PrismaClient();

try {
  for (const email of allEmails) {
    const existing = await prisma.user.findUnique({ where: { email } });

    if (!existing) {
      console.log(`[ensure-admins] ${email} — user not found yet (will promote after first sign-in)`);
      continue;
    }

    if (existing.globalRole === "SUPER_ADMIN" && existing.accountStatus === "active") {
      console.log(`[ensure-admins] ${email} — already SUPER_ADMIN`);
      continue;
    }

    await prisma.user.update({
      where: { email },
      data: {
        globalRole: "SUPER_ADMIN",
        accountStatus: "active",
        approvedAt: existing.approvedAt ?? new Date()
      }
    });

    console.log(`[ensure-admins] promoted ${email} to SUPER_ADMIN`);
  }
} catch (error) {
  // Don't block the deploy on this — log and continue so the server still boots.
  console.error("[ensure-admins] non-fatal error:", error?.message ?? error);
} finally {
  await prisma.$disconnect().catch(() => {});
}
