import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@lottery/db";
import { auth } from "../../auth";
import { ownerEmail, sendSystemEmail } from "../../lib/email";
import { hashPassword } from "../../lib/password";
import { provisionWorkspaceForUser } from "../../lib/provisioning";

const db = prisma as any;

export const runtime = "nodejs";

async function approveUserAction(formData: FormData) {
  "use server";

  const userId = String(formData.get("userId") ?? "");
  const user = await db.user.update({
    where: { id: userId },
    data: { accountStatus: "active", approvedAt: new Date(), rejectedAt: null }
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

async function convertLeadAction(formData: FormData) {
  "use server";

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
      passwordHash: hashPassword(Math.random().toString(36).slice(2, 14)),
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

  await sendSystemEmail({
    to: user.email,
    subject: approve ? "נפתח ואושר לך חשבון Magic Flow" : "נפתחה בקשת חשבון Magic Flow",
    unsubscribeUrl: `${process.env.PUBLIC_BASE_URL ?? "http://localhost:3000"}/unsubscribe/${user.unsubscribeToken}`,
    html: approve
      ? `<h1>החשבון שלך מוכן</h1><p>צוות Magic Flow הפעיל את החשבון. אפשר להיכנס למערכת. אם אין לך סיסמה, השתמש באיפוס סיסמה.</p>`
      : `<h1>פתחנו לך בקשת חשבון</h1><p>החשבון ממתין לבדיקה של צוות Magic Flow.</p>`
  });
  revalidatePath("/admin");
}

async function closeLeadAction(formData: FormData) {
  "use server";

  const leadId = String(formData.get("leadId") ?? "");
  await db.contactLead.update({
    where: { id: leadId },
    data: { status: "closed", closedAt: new Date() }
  });
  revalidatePath("/admin");
}

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const sessionEmail = session.user?.email?.toLowerCase();
  const adminEmail = ownerEmail().toLowerCase();

  if ((session.user as any).globalRole !== "SUPER_ADMIN" || sessionEmail !== adminEmail) {
    redirect("/dashboard");
  }

  const [pendingUsers, leads, activeCount] = await Promise.all([
    db.user.findMany({ where: { accountStatus: "pending" }, orderBy: { createdAt: "desc" } }),
    db.contactLead.findMany({ where: { status: "open" }, orderBy: { createdAt: "desc" } }),
    db.user.count({ where: { accountStatus: "active" } })
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[32px] bg-slate-950 p-8 text-white">
          <p className="text-sm font-bold text-cyan-200">מערכת ניהול</p>
          <h1 className="mt-3 text-4xl font-black">ניהול Magic Flow</h1>
          <p className="mt-3 text-slate-300">אישור לקוחות, טיפול בלידים וניהול הפעולות החשובות במקום אחד.</p>
          <p className="mt-5 text-sm text-slate-400">מייל מנהל: <span dir="ltr">{ownerEmail()}</span></p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
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
        </section>

        <section className="rounded-[32px] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">משתמשים ממתינים</h2>
          <div className="mt-5 space-y-3">
            {pendingUsers.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">אין משתמשים שממתינים כרגע.</p>
            ) : (
              pendingUsers.map((user: any) => (
                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto]" key={user.id}>
                  <div>
                    <p className="font-black text-slate-950">{user.fullName ?? user.name ?? user.email}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{user.email}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{user.phone ?? ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={approveUserAction}>
                      <input name="userId" type="hidden" value={user.id} />
                      <button className="h-11 rounded-2xl bg-emerald-600 px-5 font-black text-white" type="submit">אשר</button>
                    </form>
                    <form action={rejectUserAction}>
                      <input name="userId" type="hidden" value={user.id} />
                      <button className="h-11 rounded-2xl border border-red-200 px-5 font-black text-red-700" type="submit">דחה</button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">לידים מצור קשר</h2>
          <div className="mt-5 space-y-3">
            {leads.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-slate-500">אין לידים פתוחים כרגע.</p>
            ) : (
              leads.map((lead: any) => (
                <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_auto]" key={lead.id}>
                  <div>
                    <p className="font-black text-slate-950">{lead.fullName}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{lead.email}</p>
                    <p className="text-sm text-slate-500" dir="ltr">{lead.phone ?? ""}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{lead.message ?? ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={convertLeadAction}>
                      <input name="leadId" type="hidden" value={lead.id} />
                      <button className="h-11 rounded-2xl bg-blue-600 px-4 font-black text-white" type="submit">המר לממתין</button>
                    </form>
                    <form action={convertLeadAction}>
                      <input name="leadId" type="hidden" value={lead.id} />
                      <input name="approve" type="hidden" value="1" />
                      <button className="h-11 rounded-2xl bg-emerald-600 px-4 font-black text-white" type="submit">המר ואשר</button>
                    </form>
                    <form action={closeLeadAction}>
                      <input name="leadId" type="hidden" value={lead.id} />
                      <button className="h-11 rounded-2xl border border-slate-200 px-4 font-black text-slate-600" type="submit">סגור</button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
