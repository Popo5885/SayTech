import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ExternalLink, Globe, UserCircle2, XCircle } from "lucide-react";
import { prisma } from "@lottery/db";
import { auth } from "../../../auth";
import { DatabaseErrorState } from "../../../components/database-error-state";
import { GoogleConnectClient } from "../../../components/google-connect-client";
import { isDatabaseUnavailableError } from "../../../lib/safe-db";
import { getGoogleOAuthSettings } from "../../../lib/google-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const db = prisma as any;

function isSuperAdmin(session: any): boolean {
  const adminEmail = (process.env.SUPERADMIN_EMAIL ?? "aknvpupuch@gmail.com").toLowerCase();
  return session?.user?.globalRole === "SUPER_ADMIN" || session?.user?.email?.toLowerCase() === adminEmail;
}

async function getWorkspaceGoogleStatus(userId: string, superAdmin: boolean) {
  let workspaceId: string | null = null;

  if (superAdmin) {
    const { cookies } = await import("next/headers");
    workspaceId = (await cookies()).get("admin_workspace_id")?.value ?? null;
  }

  if (!workspaceId) {
    const membership = await db.workspaceMember.findFirst({
      where: { userId, role: { in: ["OWNER", "ADMIN", "AGENCY_MANAGER"] } },
      orderBy: { createdAt: "asc" },
      select: { workspaceId: true },
    });
    workspaceId = membership?.workspaceId ?? null;
  }

  if (!workspaceId) return null;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      googleSubject: true,
      googleTokenExpiry: true,
      ownerEmail: true,
    },
  });

  return workspace;
}

export default async function GoogleConnectPage({
  searchParams,
}: {
  searchParams?: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = (session?.user as any)?.id ? String((session?.user as any).id) : null;

  if (!userId) redirect("/login");

  const superAdmin = isSuperAdmin(session);

  let workspace: Awaited<ReturnType<typeof getWorkspaceGoogleStatus>> = null;
  let googleConfigured = false;

  try {
    [workspace, { configured: googleConfigured }] = await Promise.all([
      getWorkspaceGoogleStatus(userId, superAdmin),
      getGoogleOAuthSettings(),
    ]);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseErrorState retryHref="/dashboard/google-connect" />;
    }
    return (
      <DatabaseErrorState
        description="אירעה שגיאה בטעינת פרטי חיבור Google."
        retryHref="/dashboard"
        title="שגיאה בטעינת הדף"
      />
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-right" dir="rtl">
        <p className="font-black text-slate-500">לא נמצא Workspace פעיל לחשבון זה.</p>
        <Link className="mt-4 inline-block font-black text-violet-600" href="/dashboard">
          חזרה לדשבורד
        </Link>
      </div>
    );
  }

  const isConnected = Boolean(workspace.googleSubject);
  const tokenExpiry = workspace.googleTokenExpiry ? new Date(workspace.googleTokenExpiry) : null;
  const tokenExpired = tokenExpiry ? tokenExpiry < new Date() : false;

  return (
    <div className="mx-auto max-w-2xl pb-20 text-right" dir="rtl">
      {/* Back link */}
      <Link
        className="mb-6 inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-900"
        href="/dashboard/contacts"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה לאנשי קשר
      </Link>

      {/* Status banner */}
      {params?.connected === "1" ? (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          חשבון Google חובר בהצלחה! אנשי הקשר יישמרו אוטומטית.
        </div>
      ) : null}
      {params?.error ? (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-black text-red-800">
          <XCircle className="h-5 w-5 shrink-0" />
          {params.error === "not-configured"
            ? "Google OAuth לא מוגדר. פנה למנהל המערכת."
            : "אירעה שגיאה בחיבור. נסה שנית."}
        </div>
      ) : null}

      {/* Header card */}
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(30,41,59,0.08)]">
        <div className="relative isolate px-6 py-6">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_0%,rgba(124,58,237,0.12),transparent_40%)]" />
          <div className="flex items-start gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ background: "linear-gradient(135deg, #4648d4, #8127cf)" }}
            >
              <Globe className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-950">חיבור חשבון Google</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {workspace.name} · שמירת אנשי קשר אוטומטית ב-Google Contacts
              </p>
            </div>
          </div>

          {/* Status chip */}
          <div className="mt-5">
            {isConnected && !tokenExpired ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                מחובר ל-Google Contacts
              </div>
            ) : isConnected && tokenExpired ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-700">
                <XCircle className="h-4 w-4" />
                הגישה פגה — יש לחבר מחדש
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-black text-slate-500">
                <UserCircle2 className="h-4 w-4" />
                לא מחובר
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-5">
          {!googleConfigured ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-semibold leading-7 text-amber-800">
              Google OAuth לא מוגדר עדיין. <br />
              <Link className="font-black text-amber-900 underline" href="/admin#auth-settings">
                הגדר ב-Admin → Auth Settings
              </Link>
            </div>
          ) : (
            <GoogleConnectClient
              isConnected={isConnected && !tokenExpired}
              tokenExpiry={tokenExpiry?.toISOString() ?? null}
              workspaceId={workspace.id}
            />
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <InfoCard
          description="כל משתתף שיאשר שמר את איש הקשר יתווסף אוטומטית לספר הטלפונים שלך."
          title="שמירה אוטומטית"
        />
        <InfoCard
          description="המערכת בודקת כפילויות לפי מספר טלפון לפני כל שמירה."
          title="ללא כפילויות"
        />
        <InfoCard
          description="השם נשמר בפורמט: [שם] בוט. ללא שם: משתתף בוט."
          title="פורמט שם"
        />
        <InfoCard
          description="הטוקן מתרענן אוטומטית. אם יפוג יש לחבר מחדש."
          title="חידוש אוטומטי"
        />
      </div>

      {/* n8n info */}
      <div className="mt-5 rounded-[24px] border border-violet-100 bg-violet-50 px-5 py-4">
        <p className="text-sm font-black text-violet-800">הגדרת n8n</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-violet-700">
          לאחר חיבור Google, ה-Workspace ID נשלח ל-n8n דרך ה-Webhook{" "}
          <code className="rounded bg-violet-100 px-1 py-0.5 text-xs">/api/n8n/google-connected</code>.
          <br />
          n8n ישתמש בפרטים אלו לשמירת כל איש קשר חדש ב-Google Contacts.
        </p>
        <a
          className="mt-3 inline-flex items-center gap-1 text-xs font-black text-violet-700 transition hover:text-violet-900"
          href="/api/n8n/google-connected"
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Webhook: /api/n8n/google-connected
        </a>
      </div>
    </div>
  );
}

function InfoCard({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-500">{description}</p>
    </div>
  );
}
