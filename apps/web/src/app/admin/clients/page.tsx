import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  PlusCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { prisma } from "@lottery/db";
import { auth } from "../../../auth";
import { ownerEmail, sendSystemEmail } from "../../../lib/email";
import { buildWelcomeEmail } from "../../../lib/email-templates";
import { createVerificationCode, hashPassword, hashVerificationCode, isEnglishPassword } from "../../../lib/password";
import { provisionWorkspaceForUser } from "../../../lib/provisioning";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const db = prisma as any;

const BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

async function requireAdminUser() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const adminEmail = ownerEmail().toLowerCase();

  if (!session || email !== adminEmail) {
    redirect("/dashboard");
  }

  return session.user as any;
}

// ─── Server Actions ───────────────────────────────────────────────────────────

async function createClientAction(formData: FormData) {
  "use server";

  await requireAdminUser();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const activateNow = formData.get("activateNow") === "1";
  const sendEmail = formData.get("sendEmail") === "1";

  if (!fullName || !email) redirect("/admin/clients?error=missing#create");

  const user = await db.user.upsert({
    where: { email },
    update: {
      fullName,
      name: fullName,
      phone,
      accountStatus: activateNow ? "active" : "pending",
      approvedAt: activateNow ? new Date() : null,
      rejectedAt: null,
      suspendedAt: null,
    },
    create: {
      email,
      fullName,
      name: fullName,
      phone,
      accountStatus: activateNow ? "active" : "pending",
      approvedAt: activateNow ? new Date() : null,
    },
  });

  if (activateNow) {
    await provisionWorkspaceForUser(user.id);
  }

  if (sendEmail) {
    const code = createVerificationCode();
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        codeHash: hashVerificationCode(code),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const html = buildWelcomeEmail({
      recipientName: fullName,
      recipientEmail: user.email,
      setupCode: code,
      setupUrl: `${BASE_URL}/reset-password?email=${encodeURIComponent(user.email)}`,
      unsubscribeUrl: user.unsubscribeToken
        ? `${BASE_URL}/unsubscribe/${user.unsubscribeToken}`
        : `${BASE_URL}/unsubscribe`,
    });

    await sendSystemEmail({
      to: user.email,
      subject: `ברוך הבא ל-SayTech — הגדרת סיסמה לחשבונך`,
      html,
    });
  }

  await db.adminAuditLog.create({
    data: {
      actorUserId: (await auth())?.user?.id,
      action: activateNow ? "ADMIN_CREATED_ACTIVE_CLIENT" : "ADMIN_CREATED_PENDING_CLIENT",
      targetType: "User",
      targetId: user.id,
      metadata: { email, sendEmail },
    },
  });

  revalidatePath("/admin/clients");
  redirect(`/admin/clients?saved=created#clients`);
}

async function activateClientAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");

  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "active", approvedAt: new Date(), suspendedAt: null, rejectedAt: null },
  });

  await provisionWorkspaceForUser(user.id);
  await db.workspace.updateMany({ where: { ownerEmail: user.email }, data: { accountStatus: "active" } });

  revalidatePath("/admin/clients");
  redirect("/admin/clients?saved=activated#clients");
}

async function suspendClientAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const adminE = ownerEmail().toLowerCase();
  const target = await db.user.findUnique({ where: { id: userId }, select: { email: true } });

  if (target?.email?.toLowerCase() === adminE) redirect("/admin/clients?error=protected#clients");

  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "suspended", suspendedAt: new Date() },
  });
  await db.workspace.updateMany({ where: { ownerEmail: user.email }, data: { accountStatus: "suspended" } });

  revalidatePath("/admin/clients");
  redirect("/admin/clients?saved=suspended#clients");
}

async function setClientPasswordAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!userId || !isEnglishPassword(password)) redirect("/admin/clients?error=password#clients");

  await db.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(password) } });
  await db.adminAuditLog.create({
    data: {
      actorUserId: admin.id,
      action: "ADMIN_CHANGED_CLIENT_PASSWORD",
      targetType: "User",
      targetId: userId,
    },
  });

  revalidatePath("/admin/clients");
  redirect("/admin/clients?saved=password#clients");
}

async function assignConnectionAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const connectionId = String(formData.get("connectionId") ?? "");

  if (!workspaceId || !connectionId) redirect("/admin/clients?error=missing#clients");

  await db.workspaceConnectionAssignment.upsert({
    where: { workspaceId_connectionId: { workspaceId, connectionId } },
    update: { status: "active", releasedAt: null },
    create: { workspaceId, connectionId, status: "active" },
  });

  revalidatePath("/admin/clients");
  redirect("/admin/clients?saved=connection#clients");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  await requireAdminUser();

  const [users, connections] = await Promise.all([
    db.user.findMany({
      where: { globalRole: "USER" },
      orderBy: { createdAt: "desc" },
      include: {
        memberships: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                accountStatus: true,
                whatsappStatus: true,
                googleSubject: true,
                campaigns: {
                  select: { id: true, name: true, isActive: true, slug: true },
                  take: 3,
                },
                connectionAssignments: {
                  where: { status: "active" },
                  include: { connection: { select: { id: true, label: true, phoneNumber: true, status: true } } },
                  take: 1,
                },
              },
            },
          },
        },
      },
    }),
    db.whatsAppConnection.findMany({
      select: {
        id: true,
        label: true,
        phoneNumber: true,
        status: true,
        provider: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const statusLabel: Record<string, string> = {
    pending: "ממתין",
    active: "פעיל",
    suspended: "מושהה",
    rejected: "נדחה",
  };

  const statusColor: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    suspended: "border-red-200 bg-red-50 text-red-700",
    rejected: "border-slate-200 bg-slate-50 text-slate-500",
  };

  return (
    <div className="mx-auto max-w-5xl pb-24 text-right" dir="rtl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          className="flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-slate-900"
          href="/admin"
        >
          <ArrowRight className="h-4 w-4" />
          ממשק Admin
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-black text-slate-800">ניהול לקוחות</span>
      </div>

      {/* Success / error banners */}
      {params?.saved ? (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {params.saved === "created" && "הלקוח נוצר בהצלחה ונשלח אליו מייל קוד הגדרה."}
          {params.saved === "activated" && "הלקוח הופעל ו-Workspace נוצר."}
          {params.saved === "suspended" && "הלקוח הושהה."}
          {params.saved === "password" && "הסיסמה עודכנה."}
          {params.saved === "connection" && "החיבור שויך בהצלחה."}
        </div>
      ) : null}

      {params?.error ? (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-black text-red-800">
          <XCircle className="h-5 w-5 shrink-0" />
          {params.error === "missing" && "חסרים פרטים נדרשים."}
          {params.error === "password" && "הסיסמה חייבת להיות באנגלית ומספרים, לפחות 8 תווים."}
          {params.error === "protected" && "לא ניתן לשנות את חשבון המנהל הראשי."}
        </div>
      ) : null}

      {/* Create new client form */}
      <section className="mb-8 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_16px_48px_rgba(30,41,59,0.07)]" id="create">
        <div className="relative isolate px-6 py-5">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_0%,rgba(124,58,237,0.10),transparent_40%)]" />
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">הוספת לקוח חדש</h2>
              <p className="text-sm font-semibold text-slate-500">צור חשבון ושלח קוד הגדרת סיסמה</p>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 px-6 py-5">
          <form action={createClientAction} className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-black text-slate-700">שם מלא *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)]"
                name="fullName"
                placeholder="ישראל ישראלי"
                required
                type="text"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-slate-700">אימייל *</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)]"
                dir="ltr"
                name="email"
                placeholder="client@example.com"
                required
                type="email"
              />
            </label>
            <label className="block">
              <span className="text-sm font-black text-slate-700">טלפון</span>
              <input
                className="mt-1.5 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:shadow-[0_0_0_4px_rgba(139,92,246,0.1)]"
                dir="ltr"
                name="phone"
                placeholder="05X-XXXXXXX"
                type="tel"
              />
            </label>
            <div className="flex flex-col gap-3 pt-1">
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <input
                  className="h-4 w-4 rounded accent-violet-600"
                  defaultChecked
                  name="activateNow"
                  type="checkbox"
                  value="1"
                />
                הפעל חשבון מיידית + צור Workspace
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <input
                  className="h-4 w-4 rounded accent-violet-600"
                  defaultChecked
                  name="sendEmail"
                  type="checkbox"
                  value="1"
                />
                שלח מייל קוד הגדרת סיסמה
              </label>
            </div>
            <div className="sm:col-span-2">
              <button
                className="flex h-12 items-center gap-2 rounded-2xl bg-violet-600 px-6 text-sm font-black text-white shadow-[0_10px_24px_rgba(139,92,246,0.24)] transition hover:-translate-y-0.5 hover:bg-violet-700"
                type="submit"
              >
                <PlusCircle className="h-4 w-4" />
                יצירת לקוח
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Clients list */}
      <section id="clients">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-950">לקוחות קיימים</h2>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
            {users.length} לקוחות
          </span>
        </div>

        {users.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 font-black text-slate-500">אין לקוחות עדיין</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {users.map((user: any) => {
              const workspace = user.memberships?.[0]?.workspace ?? null;
              const assignment = workspace?.connectionAssignments?.[0] ?? null;

              return (
                <div
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(30,41,59,0.06)]"
                  key={user.id}
                >
                  {/* Client header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 text-sm font-black">
                        {(user.fullName ?? user.name ?? user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{user.fullName ?? user.name ?? "—"}</p>
                        <p className="text-xs font-semibold text-slate-500" dir="ltr">{user.email}</p>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-black ${statusColor[user.accountStatus] ?? statusColor.pending}`}
                    >
                      {statusLabel[user.accountStatus] ?? user.accountStatus}
                    </span>
                  </div>

                  {/* Workspace info */}
                  {workspace ? (
                    <div className="border-t border-slate-100 px-5 py-3">
                      <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
                        Workspace
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <Settings className="h-3.5 w-3.5 text-slate-400" />
                          {workspace.name}
                        </div>
                        {workspace.googleSubject ? (
                          <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                            <Globe className="h-3 w-3" />
                            Google מחובר
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-black text-slate-500">
                            <Globe className="h-3 w-3" />
                            Google לא מחובר
                          </div>
                        )}
                        {assignment ? (
                          <div className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700">
                            <ShieldCheck className="h-3 w-3" />
                            {assignment.connection.label ?? assignment.connection.phoneNumber ?? "WhatsApp מחובר"}
                          </div>
                        ) : null}
                      </div>

                      {/* Campaigns */}
                      {workspace.campaigns?.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {workspace.campaigns.map((campaign: any) => (
                            <Link
                              className="flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-0.5 text-[11px] font-black text-violet-700 transition hover:bg-violet-100"
                              href={`/dashboard/raffle/${campaign.id}`}
                              key={campaign.id}
                            >
                              {campaign.isActive ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              ) : (
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                              )}
                              {campaign.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}

                      {/* Connection assignment */}
                      {!assignment && connections.length > 0 ? (
                        <form action={assignConnectionAction} className="mt-3 flex items-center gap-2">
                          <input name="workspaceId" type="hidden" value={workspace.id} />
                          <select
                            className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 outline-none"
                            name="connectionId"
                          >
                            <option value="">— בחר חיבור WhatsApp —</option>
                            {connections.map((conn: any) => (
                              <option key={conn.id} value={conn.id}>
                                {conn.label ?? conn.phoneNumber ?? conn.id} ({conn.status})
                              </option>
                            ))}
                          </select>
                          <button
                            className="flex h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-black text-white transition hover:bg-blue-700"
                            type="submit"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            שייך
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
                    {user.accountStatus !== "active" ? (
                      <form action={activateClientAction}>
                        <input name="userId" type="hidden" value={user.id} />
                        <button
                          className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                          type="submit"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          הפעלה
                        </button>
                      </form>
                    ) : null}

                    {user.accountStatus !== "suspended" ? (
                      <form action={suspendClientAction}>
                        <input name="userId" type="hidden" value={user.id} />
                        <button
                          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 transition hover:bg-red-100"
                          type="submit"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          השהיה
                        </button>
                      </form>
                    ) : (
                      <form action={activateClientAction}>
                        <input name="userId" type="hidden" value={user.id} />
                        <button
                          className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
                          type="submit"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          שחרור
                        </button>
                      </form>
                    )}

                    {/* Change password */}
                    <details className="group">
                      <summary className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 transition hover:bg-slate-100 list-none">
                        <Settings className="h-3.5 w-3.5" />
                        שנה סיסמה
                      </summary>
                      <form action={setClientPasswordAction} className="mt-2 flex items-center gap-2">
                        <input name="userId" type="hidden" value={user.id} />
                        <input
                          className="h-9 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none"
                          dir="ltr"
                          name="password"
                          placeholder="סיסמה חדשה (אנגלית+מספרים)"
                          type="text"
                        />
                        <button
                          className="flex h-9 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-xs font-black text-white transition hover:bg-slate-900"
                          type="submit"
                        >
                          שמור
                        </button>
                      </form>
                    </details>

                    {workspace ? (
                      <Link
                        className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 transition hover:bg-violet-100"
                        href={`/dashboard/raffle/${workspace.campaigns?.[0]?.id ?? ""}`}
                      >
                        <Settings className="h-3.5 w-3.5" />
                        דשבורד
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* WhatsApp Connections overview */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-black text-slate-950">חיבורי WhatsApp</h2>
        {connections.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
            <p className="font-black text-slate-400">אין חיבורי WhatsApp</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {connections.map((conn: any) => (
              <div
                className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm"
                key={conn.id}
              >
                <div>
                  <p className="text-sm font-black text-slate-900">{conn.label ?? "—"}</p>
                  <p className="text-xs font-semibold text-slate-500" dir="ltr">
                    {conn.phoneNumber ?? "לא מחובר"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    conn.status === "connected"
                      ? "bg-emerald-50 text-emerald-700"
                      : conn.status === "connecting" || conn.status === "qr_ready"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-50 text-slate-500"
                  }`}
                >
                  {conn.status}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <Link
            className="text-sm font-black text-violet-600 transition hover:text-violet-800"
            href="/dashboard/connections"
          >
            ניהול חיבורים ←
          </Link>
        </div>
      </section>
    </div>
  );
}
