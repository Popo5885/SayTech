/**
 * n8n Webhook: Google Connected
 *
 * The dashboard calls this after a workspace successfully links Google OAuth.
 * n8n stores the workspace_id and uses it to know which Google account to use
 * when saving contacts for that workspace.
 */
import { NextResponse } from "next/server";
import { prisma } from "@lottery/db";
import { auth } from "../../../../auth";

const db = prisma as any;

function isSuperAdmin(session: any): boolean {
  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
  return session?.user?.globalRole === "SUPER_ADMIN" || session?.user?.email?.toLowerCase() === adminEmail;
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;

  if (!userId) {
    return NextResponse.json({ error: "לא מחובר." }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין." }, { status: 400 });
  }

  const { workspace_id, campaign_id } = body ?? {};

  if (!workspace_id) {
    return NextResponse.json({ error: "workspace_id חסר." }, { status: 422 });
  }

  // Verify user has access to this workspace
  if (!isSuperAdmin(session)) {
    const membership = await db.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: workspace_id,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "אין הרשאה לפעולה זו." }, { status: 403 });
    }
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspace_id },
    select: { id: true, name: true, googleSubject: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace לא נמצא." }, { status: 404 });
  }

  // Notify n8n about the Google connection
  const n8nGoogleWebhookUrl = process.env.N8N_GOOGLE_CONNECTED_WEBHOOK_URL;
  if (n8nGoogleWebhookUrl) {
    try {
      await fetch(n8nGoogleWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id,
          workspace_name: workspace.name,
          campaign_id: campaign_id ?? null,
          google_subject: workspace.googleSubject,
          connected_at: new Date().toISOString(),
        }),
      });
    } catch {
      // best-effort
    }
  }

  return NextResponse.json({
    ok: true,
    message: "n8n עודכן בחיבור Google בהצלחה.",
    workspace_id,
    google_connected: Boolean(workspace.googleSubject),
  });
}
