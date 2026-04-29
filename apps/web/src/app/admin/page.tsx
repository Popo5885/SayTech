import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@lottery/db";
import { auth } from "../../auth";
import { ownerEmail, sendSystemEmail } from "../../lib/email";
import { createVerificationCode, hashVerificationCode } from "../../lib/password";
import { normalizeIsraeliPhone } from "../../lib/phone";
import { provisionWorkspaceForUser } from "../../lib/provisioning";

const db = prisma as any;

export const runtime = "nodejs";

const statusLabels: Record<string, string> = {
  pending: "ממתין",
  active: "פעיל",
  suspended: "מושהה",
  rejected: "נדחה"
};

async function requireAdminUser() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!session || email !== ownerEmail().toLowerCase()) {
    redirect("/dashboard");
  }

  return session.user as any;
}

async function sendAccountSetupEmail(user: any) {
  const code = createVerificationCode();

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      codeHash: hashVerificationCode(code),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    }
  });

  const baseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";

  await sendSystemEmail({
    to: user.email,
    subject: "הוגדר לך חשבון Magic Flow",
    unsubscribeUrl: `${baseUrl}/unsubscribe/${user.unsubscribeToken}`,
    html: `<h1>החשבון שלך מוכן</h1><p>צוות Magic Flow פתח עבורך חשבון. כדי לבחור סיסמה ולהתחיל לעבוד, השתמש בקוד הבא:</p><p style="font-size:28px;font-weight:900;letter-spacing:4px" dir="ltr">${code}</p><p><a href="${baseUrl}/reset-password?email=${encodeURIComponent(user.email)}">בחירת סיסמה וכניסה למערכת</a></p><p>הקוד תקף ל-30 דקות.</p>`
  });
}

async function approveUserAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "active", approvedAt: new Date(), rejectedAt: null, suspendedAt: null }
  });

  await provisionWorkspaceForUser(user.id);
  await sendSystemEmail({
    to: user.email,
    subject: "החשבון שלך אושר",
    unsubscribeUrl: `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${user.unsubscribeToken}`,
    html: `<h1>חדשות טובות</h1><p>צוות Magic Flow אישר את החשבון שלך. אפשר להיכנס למערכת ולהתחיל לעבוד.</p><p><a href="${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/login">כניסה למערכת</a></p>`
  });
  revalidatePath("/admin");
}

async function rejectUserAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "rejected", rejectedAt: new Date() }
  });

  await sendSystemEmail({
    to: user.email,
    subject: "עדכון לגבי בקשת ההרשמה",
    unsubscribeUrl: `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${user.unsubscribeToken}`,
    html: `<h1>בקשת ההרשמה לא אושרה כרגע</h1><p>אפשר לפנות לצוות Magic Flow לפרטים נוספים.</p>`
  });
  revalidatePath("/admin");
}

async function createCustomerAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const activateNow = formData.get("activateNow") === "1";

  if (!fullName || !email) {
    redirect("/admin");
  }

  const user = await db.user.upsert({
    where: { email },
    update: {
      fullName,
      name: fullName,
      phone: phone || null,
      accountStatus: activateNow ? "active" : "pending",
      approvedAt: activateNow ? new Date() : null,
      rejectedAt: null,
      suspendedAt: null
    },
    create: {
      email,
      fullName,
      name: fullName,
      phone: phone || null,
      accountStatus: activateNow ? "active" : "pending",
      approvedAt: activateNow ? new Date() : null
    }
  });

  if (activateNow) {
    await provisionWorkspaceForUser(user.id);
  }

  await sendAccountSetupEmail(user);
  await db.adminAuditLog.create({
    data: {
      actorUserId: (await auth())?.user?.id,
      action: activateNow ? "ADMIN_CREATED_ACTIVE_CUSTOMER" : "ADMIN_CREATED_PENDING_CUSTOMER",
      targetType: "User",
      targetId: user.id,
      metadata: { email }
    }
  });
  revalidatePath("/admin");
}

async function suspendUserAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "suspended", suspendedAt: new Date() }
  });

  await db.workspace.updateMany({
    where: { ownerEmail: user.email },
    data: { accountStatus: "suspended" }
  });
  await db.adminAuditLog.create({
    data: { actorUserId: (await auth())?.user?.id, action: "CUSTOMER_SUSPENDED", targetType: "User", targetId: user.id }
  });
  revalidatePath("/admin");
}

async function activateUserAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "active", approvedAt: new Date(), suspendedAt: null, rejectedAt: null }
  });

  await db.workspace.updateMany({
    where: { ownerEmail: user.email },
    data: { accountStatus: "active" }
  });
  await provisionWorkspaceForUser(user.id);
  revalidatePath("/admin");
}

async function convertLeadAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const leadId = String(formData.get("leadId") ?? "");
  const approve = formData.get("approve") === "1";
  const lead = await db.contactLead.findUnique({ where: { id: leadId } });

  if (!lead) {
    return;
  }

  const user = await db.user.upsert({
    where: { email: lead.email.toLowerCase() },
    update: {
      fullName: lead.fullName,
      name: lead.fullName,
      phone: lead.phone,
      accountStatus: approve ? "active" : "pending",
      approvedAt: approve ? new Date() : null
    },
    create: {
      email: lead.email.toLowerCase(),
      fullName: lead.fullName,
      name: lead.fullName,
      phone: lead.phone,
      accountStatus: approve ? "active" : "pending",
      approvedAt: approve ? new Date() : null
    }
  });

  if (approve) {
    await provisionWorkspaceForUser(user.id);
  }

  await db.contactLead.update({
    where: { id: leadId },
    data: { status: "converted", convertedUserId: user.id }
  });
  await sendAccountSetupEmail(user);
  revalidatePath("/admin");
}

async function closeLeadAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const leadId = String(formData.get("leadId") ?? "");
  await db.contactLead.update({
    where: { id: leadId },
    data: { status: "closed", closedAt: new Date() }
  });
  revalidatePath("/admin");
}

async function viewWorkspaceAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });

  if (!workspace) {
    redirect("/admin");
  }

  (await cookies()).set("admin_workspace_id", workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4
  });
  await db.adminAuditLog.create({
    data: {
      actorUserId: (await auth())?.user?.id,
      action: "ADMIN_VIEW_WORKSPACE",
      targetType: "Workspace",
      targetId: workspaceId
    }
  });
  redirect("/dashboard");
}

async function createConnectionAction(formData: FormData) {
  "use server";

  await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const label = String(formData.get("label") ?? "חיבור WhatsApp").trim();
  const phoneNumber = normalizeIsraeliPhone(String(formData.get("phoneNumber") ?? "").trim());
  const provider = String(formData.get("provider") ?? "official_business");
  const maxTenants = Math.max(1, Number(formData.get("maxTenants") ?? 3));

  if (!workspaceId) {
    redirect("/admin");
  }

  await db.whatsAppConnection.create({
    data: {
      workspaceId,
      provider,
      label,
      phoneNumber,
      status: phoneNumber ? "connected" : "idle",
      maxTenants,
      sessionKey: `admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    }
  });
  revalidatePath("/admin");
}

async function createAutomationAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "") || null;
  const triggerKind = String(formData.get("triggerKind") ?? "fixed_time");
  const name = String(formData.get("name") ?? "אוטומציה חדשה").trim();
  const message = String(formData.get("message") ?? "").trim();
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");
  const delayMinutesRaw = String(formData.get("delayMinutes") ?? "");

  if (!message) {
    redirect("/admin");
  }

  await db.automationRule.create({
    data: {
      workspaceId,
      name,
      triggerKind,
      message,
      scheduledAt: triggerKind === "fixed_time" && scheduledAtRaw ? new Date(scheduledAtRaw) : null,
      delayMinutes: triggerKind === "delay_after_join" && delayMinutesRaw ? Number(delayMinutesRaw) : null,
      createdByUserId: admin.id
    }
  });
  revalidatePath("/admin");
}

async function createNewsletterDraftAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = String(formData.get("audience") ?? "active_users");

  if (!subject || !body) {
    redirect("/admin");
  }

  await db.emailBroadcast.create({
    data: { subject, body, audience, status: "draft", createdById: admin.id }
  });
  revalidatePath("/admin");
}

async function createBillingAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const workspaceId = String(formData.get("workspaceId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0);
  const status = String(formData.get("status") ?? "draft");

  if (!workspaceId || !label || !amount) {
    redirect("/admin");
  }

  await db.billingRecord.create({
    data: {
      workspaceId,
      label,
      amountCents: Math.round(amount * 100),
      status,
      receiptNumber: status === "paid" ? `MF-${Date.now()}` : null,
      paidAt: status === "paid" ? new Date() : null,
      createdByUserId: admin.id
    }
  });
  revalidatePath("/admin");
}

async function saveSiteContentAction(formData: FormData) {
  "use server";

  const admin = await requireAdminUser();
  const entries = ["landing_title", "landing_subtitle", "landing_price"].map((key) => ({
    key,
    value: String(formData.get(key) ?? "").trim(),
    updatedByUserId: admin.id
  }));

  await Promise.all(
    entries
      .filter((entry) => entry.value)
      .map((entry) =>
        db.siteSetting.upsert({
          where: { key: entry.key },
          update: { value: entry.value, updatedByUserId: entry.updatedByUserId },
          create: entry
        })
      )
  );
  revalidatePath("/admin");
  revalidatePath("/");
}

function Field({
  children,
  label
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function inputClass() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500";
}

function selectClass() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500";
}

function textAreaClass() {
  return "min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500";
}

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const sessionEmail = session.user?.email?.toLowerCase();
  const adminEmail = ownerEmail().toLowerCase();

  if (sessionEmail !== adminEmail) {
    redirect("/dashboard");
  }

  const [
    pendingUsers,
    leads,
    activeCount,
    customers,
    workspaces,
    connections,
    automationRules,
    broadcasts,
    billingRecords,
    siteSettings
  ] = await Promise.all([
    db.user.findMany({ where: { accountStatus: "pending" }, orderBy: { createdAt: "desc" } }),
    db.contactLead.findMany({ where: { status: "open" }, orderBy: { createdAt: "desc" } }),
    db.user.count({ where: { accountStatus: "active" } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.workspace.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    db.whatsAppConnection.findMany({ orderBy: { updatedAt: "desc" }, take: 50 }),
    db.automationRule.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { workspace: true } }),
    db.emailBroadcast.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    db.billingRecord.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { workspace: true } }),
    db.siteSetting.findMany()
  ]);
  const workspaceByEmail = new Map<string, any>(
    workspaces
      .filter((workspace: any) => workspace.ownerEmail)
      .map((workspace: any) => [workspace.ownerEmail, workspace] as [string, any])
  );
  const siteContent = new Map<string, string>(
    siteSettings.map((setting: any) => [setting.key, String(setting.value)] as [string, string])
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[32px] bg-slate-950 p-8 text-white">
          <p className="text-sm font-bold text-cyan-200">מערכת ניהול</p>
          <h1 className="mt-3 text-4xl font-black">ניהול Magic Flow</h1>
          <p className="mt-3 text-slate-300">לקוחות, חיבורים, אוטומציות, ניוזלטרים, קבלות ותוכן האתר במקום אחד.</p>
          <p className="mt-5 text-sm text-slate-400">מייל מנהל: <span dir="ltr">{ownerEmail()}</span></p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">ממתינים לאישור</p>
            <p className="mt-3 text-4xl font-black">{pendingUsers.length}</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">לידים פתוחים</p>
            <p className="mt-3 text-4xl font-black">{leads.length}</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">לקוחות פעילים</p>
            <p className="mt-3 text-4xl font-black">{activeCount}</p>
          </div>
          <div className="rounded-[28px] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-slate-500">חיבורי WhatsApp</p>
            <p className="mt-3 text-4xl font-black">{connections.length}</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">יצירת לקוח מהירה</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">פותח משתמש, שולח מייל בחירת סיסמה, ובבחירה שלך גם מפעיל סביבת עבודה מיד.</p>
            <form action={createCustomerAction} className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="שם מלא">
                <input className={inputClass()} name="fullName" required />
              </Field>
              <Field label="אימייל">
                <input className={inputClass()} dir="ltr" name="email" required type="email" />
              </Field>
              <Field label="טלפון">
                <input className={inputClass()} dir="ltr" name="phone" />
              </Field>
              <label className="mt-8 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900">
                <input name="activateNow" type="checkbox" value="1" />
                להפעיל מיד בלי המתנה לאישור
              </label>
              <button className="h-12 rounded-2xl bg-slate-950 px-5 font-black text-white md:col-span-2" type="submit">
                צור לקוח ושלח מייל
              </button>
            </form>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">לקוחות</h2>
            <div className="mt-5 max-h-[430px] space-y-3 overflow-auto pr-1">
              {customers.map((user: any) => {
                const workspace = workspaceByEmail.get(user.email);

                return (
                  <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto]" key={user.id}>
                    <div>
                      <p className="font-black text-slate-950">{user.fullName ?? user.name ?? user.email}</p>
                      <p className="text-sm text-slate-500" dir="ltr">{user.email}</p>
                      <p className="text-sm text-slate-500">סטטוס: {statusLabels[user.accountStatus] ?? user.accountStatus}</p>
                      {workspace ? <p className="text-sm text-slate-500">סביבה: {workspace.name}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {workspace ? (
                        <form action={viewWorkspaceAction}>
                          <input name="workspaceId" type="hidden" value={workspace.id} />
                          <button className="h-10 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white" type="submit">כניסה לממשק</button>
                        </form>
                      ) : null}
                      {user.accountStatus === "active" ? (
                        <form action={suspendUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="h-10 rounded-2xl border border-amber-200 px-4 text-sm font-black text-amber-700" type="submit">השהה</button>
                        </form>
                      ) : (
                        <form action={activateUserAction}>
                          <input name="userId" type="hidden" value={user.id} />
                          <button className="h-10 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white" type="submit">הפעל</button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">אוטומציות</h2>
            <form action={createAutomationAction} className="mt-4 space-y-3">
              <Field label="לקוח">
                <select className={selectClass()} name="workspaceId">
                  <option value="">כללי</option>
                  {workspaces.map((workspace: any) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                </select>
              </Field>
              <Field label="שם אוטומציה">
                <input className={inputClass()} name="name" placeholder="עדכון ערב לפני ההגרלה" />
              </Field>
              <Field label="סוג">
                <select className={selectClass()} name="triggerKind">
                  <option value="fixed_time">שליחה בשעה מסוימת</option>
                  <option value="delay_after_join">שליחה X דקות אחרי הצטרפות</option>
                </select>
              </Field>
              <Field label="תאריך ושעה">
                <input className={inputClass()} name="scheduledAt" type="datetime-local" />
              </Field>
              <Field label="דקות אחרי הצטרפות">
                <input className={inputClass()} min="1" name="delayMinutes" type="number" />
              </Field>
              <Field label="הודעה">
                <textarea className={textAreaClass()} name="message" required />
              </Field>
              <button className="h-11 w-full rounded-2xl bg-slate-950 font-black text-white" type="submit">שמור אוטומציה</button>
            </form>
            <div className="mt-4 space-y-2">
              {automationRules.map((rule: any) => (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600" key={rule.id}>{rule.name} · {rule.workspace?.name ?? "כללי"}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">ניוזלטר</h2>
            <form action={createNewsletterDraftAction} className="mt-4 space-y-3">
              <Field label="קהל יעד">
                <select className={selectClass()} name="audience">
                  <option value="active_users">לקוחות פעילים</option>
                  <option value="all_users">כל המשתמשים</option>
                  <option value="leads">לידים</option>
                </select>
              </Field>
              <Field label="נושא">
                <input className={inputClass()} name="subject" required />
              </Field>
              <Field label="תוכן">
                <textarea className={textAreaClass()} name="body" required />
              </Field>
              <button className="h-11 w-full rounded-2xl bg-blue-600 font-black text-white" type="submit">שמור טיוטת ניוזלטר</button>
            </form>
            <div className="mt-4 space-y-2">
              {broadcasts.map((broadcast: any) => (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600" key={broadcast.id}>{broadcast.subject} · {broadcast.status}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">עריכת אתר</h2>
            <form action={saveSiteContentAction} className="mt-4 space-y-3">
              <Field label="כותרת ראשית">
                <input className={inputClass()} defaultValue={siteContent.get("landing_title") ?? ""} name="landing_title" />
              </Field>
              <Field label="טקסט משנה">
                <textarea className={textAreaClass()} defaultValue={siteContent.get("landing_subtitle") ?? ""} name="landing_subtitle" />
              </Field>
              <Field label="מחיר">
                <input className={inputClass()} defaultValue={siteContent.get("landing_price") ?? ""} name="landing_price" />
              </Field>
              <button className="h-11 w-full rounded-2xl bg-violet-600 font-black text-white" type="submit">שמור תוכן אתר</button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">חיבורי WhatsApp</h2>
            <form action={createConnectionAction} className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="Workspace בעל החיבור">
                <select className={selectClass()} name="workspaceId" required>
                  {workspaces.map((workspace: any) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                </select>
              </Field>
              <Field label="שם החיבור">
                <input className={inputClass()} name="label" placeholder="מספר ראשי" />
              </Field>
              <Field label="מספר">
                <input className={inputClass()} dir="ltr" name="phoneNumber" placeholder="+972..." />
              </Field>
              <Field label="סוג">
                <select className={selectClass()} name="provider">
                  <option value="official_business">WhatsApp Business Cloud · רשמי</option>
                  <option value="unofficial_qr">WhatsApp Web · כלי צוות בלבד</option>
                </select>
              </Field>
              <Field label="מקסימום לקוחות">
                <input className={inputClass()} defaultValue="3" min="1" name="maxTenants" type="number" />
              </Field>
              <button className="h-11 self-end rounded-2xl bg-emerald-600 px-5 font-black text-white" type="submit">הוסף חיבור</button>
            </form>
            <div className="mt-5 space-y-2">
              {connections.map((connection: any) => (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600" key={connection.id}>
                  {connection.label} · {connection.status} · <span dir="ltr">{connection.phoneNumber ?? "אין מספר"}</span> · {connection.currentTenants}/{connection.maxTenants}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">קבלות ותשלומים</h2>
            <form action={createBillingAction} className="mt-5 grid gap-3 md:grid-cols-2">
              <Field label="לקוח">
                <select className={selectClass()} name="workspaceId" required>
                  {workspaces.map((workspace: any) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
                </select>
              </Field>
              <Field label="תיאור">
                <input className={inputClass()} name="label" placeholder="מבצע בזק / מסלול חודשי" required />
              </Field>
              <Field label="סכום בש״ח">
                <input className={inputClass()} min="1" name="amount" required type="number" />
              </Field>
              <Field label="סטטוס">
                <select className={selectClass()} name="status">
                  <option value="draft">טיוטה</option>
                  <option value="paid">שולם</option>
                  <option value="open">פתוח</option>
                </select>
              </Field>
              <button className="h-11 rounded-2xl bg-slate-950 px-5 font-black text-white md:col-span-2" type="submit">צור רשומת תשלום</button>
            </form>
            <div className="mt-5 space-y-2">
              {billingRecords.map((record: any) => (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600" key={record.id}>
                  {record.workspace?.name} · {record.label} · ₪{(record.amountCents / 100).toLocaleString("he-IL")} · {record.status}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">משתמשים ממתינים</h2>
            <div className="mt-5 space-y-3">
              {pendingUsers.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">אין משתמשים שממתינים כרגע.</p>
              ) : pendingUsers.map((user: any) => (
                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto]" key={user.id}>
                  <div>
                    <p className="font-black text-slate-950">{user.fullName ?? user.name ?? user.email}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{user.email}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{user.phone ?? ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={approveUserAction}><input name="userId" type="hidden" value={user.id} /><button className="h-11 rounded-2xl bg-emerald-600 px-5 font-black text-white" type="submit">אשר</button></form>
                    <form action={rejectUserAction}><input name="userId" type="hidden" value={user.id} /><button className="h-11 rounded-2xl border border-red-200 px-5 font-black text-red-700" type="submit">דחה</button></form>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">לידים מצור קשר</h2>
            <div className="mt-5 space-y-3">
              {leads.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">אין לידים פתוחים כרגע.</p>
              ) : leads.map((lead: any) => (
                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto]" key={lead.id}>
                  <div>
                    <p className="font-black text-slate-950">{lead.fullName}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{lead.email}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{lead.phone ?? ""}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{lead.message ?? ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={convertLeadAction}><input name="leadId" type="hidden" value={lead.id} /><button className="h-11 rounded-2xl bg-blue-600 px-4 font-black text-white" type="submit">המר לממתין</button></form>
                    <form action={convertLeadAction}><input name="leadId" type="hidden" value={lead.id} /><input name="approve" type="hidden" value="1" /><button className="h-11 rounded-2xl bg-emerald-600 px-4 font-black text-white" type="submit">המר ואשר</button></form>
                    <form action={closeLeadAction}><input name="leadId" type="hidden" value={lead.id} /><button className="h-11 rounded-2xl border border-slate-200 px-4 font-black text-slate-600" type="submit">סגור</button></form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
