import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { auth } from "../../../../auth";

const db = prisma as any;

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id ? String((session.user as any).id) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const workspaceId = String(body?.workspaceId ?? "").trim();

  if (!workspaceId) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  // Zero-trust: verify the user is actually a member of the requested workspace
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });

  if (!membership) {
    // Return 404 to avoid leaking whether the workspace exists
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set("active_workspace_id", workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return NextResponse.json({ ok: true, workspaceId, role: membership.role });
}

export async function DELETE() {
  const session = await auth();
  const userId = session?.user?.id ? String((session.user as any).id) : null;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.delete("active_workspace_id");

  return NextResponse.json({ ok: true });
}
