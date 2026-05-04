import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { auth } from "../../../../auth";
import { hashPassword, isEnglishPassword } from "../../../../lib/password";

export const runtime = "nodejs";

const PRIMARY_SUPER_ADMIN = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
const db = prisma as any;

async function requireSuperAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!session || email !== PRIMARY_SUPER_ADMIN) {
    return null;
  }

  return session.user as any;
}

export async function GET() {
  const actor = await requireSuperAdmin();

  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await db.user.findMany({
    where: { globalRole: { in: ["SUB_ADMIN", "SUPER_ADMIN"] } },
    select: { id: true, email: true, fullName: true, name: true, globalRole: true, createdAt: true },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ members });
}

export async function POST(request: NextRequest) {
  const actor = await requireSuperAdmin();

  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const fullName = String(body.fullName ?? "").trim();
  const password = String(body.password ?? "");

  if (!email || !fullName || !isEnglishPassword(password)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (email === PRIMARY_SUPER_ADMIN) {
    return NextResponse.json({ error: "Cannot modify primary super-admin" }, { status: 403 });
  }

  const user = await db.user.upsert({
    where: { email },
    update: {
      fullName,
      name: fullName,
      passwordHash: hashPassword(password),
      globalRole: "SUB_ADMIN",
      accountStatus: "active",
      approvedAt: new Date()
    },
    create: {
      email,
      fullName,
      name: fullName,
      passwordHash: hashPassword(password),
      globalRole: "SUB_ADMIN",
      accountStatus: "active",
      approvedAt: new Date()
    }
  });

  await db.adminAuditLog.create({
    data: {
      actorUserId: actor.id,
      action: "SUB_ADMIN_CREATED_API",
      targetType: "User",
      targetId: user.id,
      metadata: { email }
    }
  });

  return NextResponse.json({ id: user.id, email: user.email, globalRole: user.globalRole });
}

export async function DELETE(request: NextRequest) {
  const actor = await requireSuperAdmin();

  if (!actor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.email.toLowerCase() === PRIMARY_SUPER_ADMIN) {
    return NextResponse.json({ error: "Cannot modify primary super-admin" }, { status: 403 });
  }

  if (user.globalRole === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Cannot demote a SUPER_ADMIN" }, { status: 403 });
  }

  await db.user.update({
    where: { id: userId },
    data: { globalRole: "USER" }
  });

  await db.adminAuditLog.create({
    data: {
      actorUserId: actor.id,
      action: "SUB_ADMIN_DEMOTED_API",
      targetType: "User",
      targetId: userId,
      metadata: { email: user.email }
    }
  });

  return NextResponse.json({ ok: true });
}
